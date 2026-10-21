import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
    ActionIcon, Badge, Group, SegmentedControl, Stack, Text, Title, UnstyledButton, VisuallyHidden
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconArrowsDiagonal } from '@tabler/icons-react';
import { Stage } from 'equilibria-react';
import type { PanelRole, Room, StageMode, StagePanel } from 'equilibria-react';
import { STEP_PARAM } from 'equilibria-engine-js';
import type {
    KineticGraph, ParamBlockedEvent, ParamChangedEvent, ParamInfo
} from 'equilibria-engine-js';
import type { StudyContent } from './lessons/content';
import { SUPPLY_AND_DEMAND } from './lessons/supplyAndDemand';
import { NarrationStrip } from './NarrationStrip';
import { NarrationCard } from './NarrationCard';
import { QuestionRow } from './QuestionRow';
import { TryRow } from './TryRow';
import { LessonCard, LessonResume } from './LessonCard';
import { LessonCover } from './LessonCover';
import { PictureSheet } from './PictureSheet';
import { StageSheet } from './StageSheet';
import {
    AT_START, askAt, paramsAt, paramsBetween, revealedPanels, slideAt, trackReducer, tryAt
} from './track/track';
import type { LessonQuestion, TrackState } from './track/track';
import { attemptReducer, frozenParams, isFrozen, isResolved, resetsOnRetry } from './quiz/attempt';
import type { Attempt } from './quiz/attempt';
import { candidatesOf, gradeChoice, validateChoice, validateQuestion } from './quiz/grade';
import { answerPosition, drawsAnswer, drawsAnswerWhenRight, parkApparatus } from './quiz/apparatus';
import { Dock, LESSON_TAB } from './dock/Dock';
import { Explore } from './dock/Explore';
import { Maths } from './dock/Maths';
import { Scenarios } from './dock/Scenarios';
import type { Instrument, InstrumentProps } from './dock/types';
import { REST, calcPrecision, formatValue, narrate, undoParams } from './narration/narrate';
import { phraseRefusal } from './narration/phrasebook';
import type { NarratedCalc, NarratedParam, NarrationLine, Snapshot } from './narration/narrate';
import classes from './StudyScreen.module.css';

/**
 * The study screen: one diagram, several panels, one of them driving, a line
 * underneath saying what the last thing the student did actually did, and
 * beside it either the lesson or the instruments — never both.
 *
 * The division of labour P7 asks for is visible in what this file contains and
 * what it does not. `Stage` measures the box, arranges the panels and turns a
 * click into a param change — none of which is about economics. Everything
 * here *is* about economics: which panel a student should be looking at, what
 * each one is called, and which number is worth putting on its chip.
 *
 * The chip's value is not computed here either. It is a calc the diagram
 * declares, so the number beside a panel and the number the panel draws are the
 * same number by construction, and a delta is a calc over `prev` — the same
 * snapshot the ghosts are drawn from. A screen that did its own arithmetic
 * would eventually disagree with the diagram next to it.
 *
 * The narration's "before" comes from the same place, for the same reason:
 * `getSnapshot()` is what `prev` resolves to, so the sentence and the ghost are
 * describing one event rather than two.
 */

/** Live calc values, refreshed by the engine's `kg:param_changed`. */
type Readout = Record<string, number>;

/**
 * What the screen works out from its lesson, once per lesson.
 *
 * `steps` is the same array the config hands the engine, which is what keeps
 * one ordered list rather than two — `kg.steps()` would return it too, and is
 * there for a host rendering a config it did not write. This screen was handed
 * it, and needs it before the engine has mounted: the stage has to know at its
 * first render that only one panel has arrived, or three appear and then two
 * vanish.
 *
 * `narrated` is each narrated calc by name: what a number on this screen is
 * called, in what unit, to how many places. A panel's caption looks its
 * headline up here rather than carrying a label of its own, and the maths
 * instrument looks up its decimals here too. The narration reads the same list, so
 * a caption, a chip, a clause and a formula's result print one quantity one way.
 */
function prepare(content: StudyContent) {
    const narrated: Record<string, NarratedCalc> = {};
    content.narratedCalcs.forEach(calc => { narrated[calc.name] = calc });
    return {
        steps: content.lesson,
        panelKeys: content.panels.map(p => p.key),
        narrated
    };
}

/**
 * The question apparatus, stood down.
 *
 * All three are presentation params, so writing them moves nothing a student
 * did and narrates nothing — which is what lets a question arm and disarm
 * without the diagram drawing the ghost of a curve nobody touched.
 */
const QUESTION_OFF = [
    { name: 'asking', value: 0 },
    { name: 'submitted', value: 0 },
    { name: 'revealed', value: 0 }
];

/**
 * What the side column holds: the lesson, or the instruments.
 *
 * Either, not both. With both on screen a student could apply a scenario to
 * curves the lesson had not drawn yet, or drag a slider through a step whose
 * words describe a market they had just moved away from — and a lesson that
 * builds a diagram one idea at a time has no use for a full set of controls
 * beside it. So while a lesson runs, the only controls are the ones a step
 * hands the student: its question, or what it offers to try. The instruments
 * are for when there is no lesson running, and get the whole diagram.
 *
 * Beside the stage the two are tabs on one card — Lesson, Explore, Scenarios,
 * Maths — and which tab is open is this and the open instrument together.
 * Pressing an instrument's tab puts the lesson away, and the Lesson tab brings
 * it back, with all that either does to the diagram.
 */
type Pane = 'lesson' | 'explore';

/** The params a student moves, by name and value: presentation ones left out. */
function marketOf(params: { name: string; value: number; presentation?: boolean }[]): Record<string, number> {
    const out: Record<string, number> = {};
    params.forEach(p => { if (!p.presentation) out[p.name] = p.value });
    return out;
}

const entries = (values: Record<string, number>) =>
    Object.keys(values).map(name => ({ name, value: values[name] }));

/**
 * The white between a sheet's edge and the furthest thing its panel draws.
 *
 * Every panel sits on a sheet: a card a shade lighter than the page, holding
 * the panel, its axes and its caption, so each diagram reads as one object and
 * the gaps between them as gaps. It also puts every label the engine draws on
 * white, which is the colour their backgrounds are — on the bare page they
 * showed as white boxes.
 */
const SHEET_PAD = 12;

/** A caption across the top of a sheet: one line, name at one end and number at the other. */
const HEADER_PX = 28;

/**
 * How far in from the sheet's sides that line starts and ends: a little more
 * than the padding, which put the name hard against the card's rounded corner.
 */
const HEADER_INSET = SHEET_PAD + 4;

/**
 * Where each panel's caption goes, and how much room it takes there.
 *
 * Across the top of the sheet for the panels that are read — the focal one and
 * the grid's — because the band under them is where their tick labels and axis
 * titles are drawn, and a caption there was printed across `0`, `Q*` and `10`.
 * At the top of a rail panel's sheet too, in two lines so a long name is not
 * clipped to its first letter by the number beside it. Beside a strip panel,
 * because a strip is short and wide and a caption over it would take most of
 * its height.
 *
 * Beside a strip the caption is up to three lines — name, number, chip — where
 * the rail's is two. Captions name their number now, to the cent, and the
 * widest number line with its chip is "TR $196.00 ▲ $160.00", 159px measured;
 * a column that held it would be 180px, and at 1280×800 that took a strip panel
 * from 126px square to 105px, because the strip is short enough there for its
 * slot's width to be what bounds it. A line of height costs nothing like that.
 *
 * Above a shelf panel, the strip's three lines with nothing beside them. A
 * shelf is the strip on a stage too narrow for a column beside each glyph — at
 * 1024×768 with the navbar open the stage is 356px across, a strip slot 168px,
 * and the column took all of it, leaving a sheet 30px tall with a caption
 * spilling off its top. The three lines are 63px tall with the chip under the
 * number, measured; the room is that and the sheet's padding, and the stage
 * finds the height for it under a focal panel that could not use it.
 *
 * Each side also keeps the sheet's padding, so the room is the sheet: the stage
 * keeps exactly this much clear, on top of the room the engine's own axes need,
 * and a sheet drawn to box and room holds everything its panel draws. This is
 * the one place a caption's size, and a sheet's, is decided.
 */
const CHROME_ROOM: Record<PanelRole, Room> = {
    focal: { top: SHEET_PAD + HEADER_PX, right: SHEET_PAD, bottom: SHEET_PAD, left: SHEET_PAD },
    grid: { top: SHEET_PAD + HEADER_PX, right: SHEET_PAD, bottom: SHEET_PAD, left: SHEET_PAD },
    rail: { top: SHEET_PAD + 48, right: SHEET_PAD, bottom: SHEET_PAD, left: SHEET_PAD },
    strip: { top: SHEET_PAD, right: 140 + SHEET_PAD, bottom: SHEET_PAD, left: SHEET_PAD },
    shelf: { top: SHEET_PAD + 64, right: SHEET_PAD, bottom: SHEET_PAD, left: SHEET_PAD }
};

/**
 * How far a panel's sheet reaches past its box, on each side.
 *
 * Top to bottom it hugs: the room the stage kept is the sheet's padding, its
 * caption and the axes' furniture, and nothing else. Across, it fills the share
 * of the stage its panel was given, so the sheets' edges line up with each
 * other and with the stage's rather than with whatever width a square came
 * out — the focal sheet as wide as the focal column, every rail sheet as wide
 * as the rail, every shelf sheet an even share of the stage's width. A strip's
 * share is already no wider than its panel and room.
 */
function sheetOf(panel: StagePanel): Room {
    const { box, slot, room } = panel;
    return {
        top: room.top,
        right: slot.x + slot.width - (box.x + box.width),
        bottom: room.bottom,
        left: box.x - slot.x
    };
}

/** An absolutely placed element reaching `sheet` past its panel's box: the sheet's own rect. */
const reach = (sheet: Room): CSSProperties =>
    ({ top: -sheet.top, right: -sheet.right, bottom: -sheet.bottom, left: -sheet.left });

/**
 * The narrowest grid panel whose one-line caption keeps the panel's name.
 *
 * A grid caption is one line, and its number and chip never give way, so in a
 * narrow panel the name is squeezed until it is an ellipsis and nothing else —
 * "C… · CS $40.50 ▼ $9.50" in a 173px panel. Below this the name is left out
 * instead, which reads cleanly: the label says what the number is, the drawing
 * says which panel it is, and the caption's accessible name ("Show Consumer
 * surplus") still says it in words.
 *
 * The widest number line is 159px at the caption's size, the separator and its
 * gaps 25px more, and a name is not worth showing in under about 35px.
 */
const NAMED_GRID_PX = 220;

/**
 * Each role's caption box, in the sheet, sized from the room that holds it.
 *
 * A caption across the top of a sheet runs from one side of it to the other,
 * a padding in, and the rail's two lines and the shelf's three sit in the same
 * place — the whole width, since the number and chip need it; only the name's
 * line leaves the corner to the promote icon. The strip's column is beside the
 * box, as wide as the room the stage kept for it, so the caption and the room
 * are one number.
 */
function captionBox(panel: StagePanel, sheet: Room): CSSProperties {
    switch (panel.role) {
        case 'strip':
            return { width: CHROME_ROOM.strip.right - SHEET_PAD };
        case 'rail':
        case 'shelf':
            return {
                top: -sheet.top + SHEET_PAD, left: -sheet.left + SHEET_PAD,
                right: -sheet.right + SHEET_PAD, height: CHROME_ROOM[panel.role].top - SHEET_PAD
            };
        default:
            return {
                top: -sheet.top + SHEET_PAD, left: -sheet.left + HEADER_INSET,
                right: -sheet.right + HEADER_INSET, height: HEADER_PX
            };
    }
}

/**
 * The sheet a panel sits on, under the diagram.
 *
 * Drawn in the stage's backdrop rather than with the chrome, because the chrome
 * floats over the diagram and a white card there would cover it. The diagram's
 * own background is transparent, so it shows through onto this.
 */
const sheetBehind = (panel: StagePanel) => (
    <div className={classes.sheet} style={reach(sheetOf(panel))} />
);

export interface StudyScreenProps {
    /**
     * The lesson on screen. Fixed for the life of the screen: a different
     * lesson is a different screen, which is how `App` mounts it, rather than
     * this one rebuilding its engine and its track under the student.
     */
    content?: StudyContent;
}

export function StudyScreen({ content = SUPPLY_AND_DEMAND }: StudyScreenProps) {
    const {
        diagram, panels, narratedCalcs, explainedCalcs, paramMeanings, paramWords, explorePrompts,
        scenarios, questionApparatus, directionWords
    } = content;
    const { steps, panelKeys, narrated } = useMemo(() => prepare(content), [content]);

    const [focused, setFocused] = useState<string>(panels[0].key);
    const [mode, setMode] = useState<StageMode>('focus');
    const [readout, setReadout] = useState<Readout>({});
    const [line, setLine] = useState<NarrationLine>(REST);

    // The lesson and the instruments, tabs on a card beside the stage, until
    // there is not room for a column there; below that the lesson goes under
    // the stage and the instruments into a bottom sheet. Measured once, here, because the screen
    // is what owns the decision — a dock that measured the viewport itself
    // would be a second answer to the same question.
    const stacked = useMediaQuery('(max-width: 899px)') ?? false;

    /**
     * Which the side column holds. A lesson opens on its first page, so the
     * screen starts with the lesson; the student leaves it from the card, and
     * Finish at the last step does the same.
     */
    const [pane, setPane] = useState<Pane>('lesson');

    // Which instrument is open, and whether it was opened *at* something. Both
    // live here rather than in the dock because "why?" — which is under the
    // stage, not in the dock — has to be able to set them.
    const [instrument, setInstrument] = useState('explore');
    const [focus, setFocus] = useState<{ calc?: string } | undefined>(undefined);
    const [sheetOpen, setSheetOpen] = useState(false);

    /**
     * Where the lesson has got to.
     *
     * One number, because what is revealed *is* `params.step` — the engine
     * compiled the reveals into `show` predicates over it, and a second record
     * of the same fact is the kind of thing that ends up disagreeing with the
     * diagram it describes. What the step says is derived from it too: the
     * lesson card shows the step's words for as long as the student is at that
     * step, whatever they do to the diagram in the meantime.
     */
    const [track, setTrack] = useState<TrackState>(AT_START);

    /**
     * The last move the diagram would not make (P12).
     *
     * Held beside the narration line rather than folded into it, because it is
     * not part of the chain: nothing moved, so there is nothing to narrate. It
     * stands until the student moves something that *does* move.
     */
    const [refusal, setRefusal] = useState<string | null>(null);

    /**
     * The question on screen, if any (P11).
     *
     * Not persisted across navigation, deliberately: `track.resolved` is what
     * survives, so a question the student comes back to is asked again and the
     * track stays unblocked. Keeping the attempt would mean showing a recorded
     * verdict beside a curve that has since moved, and attempt data is the first
     * thing in this app that genuinely needs a progress model — which does not
     * exist yet, and is not this plan's to build.
     */
    const [attempt, setAttempt] = useState<Attempt | null>(null);

    /**
     * The params the current question offers, for the change handler: the one
     * it is about, and any others the student may choose instead (P14).
     *
     * All of them, because moving the wrong curve is an answer too — a wrong
     * one. Listening only to the asked param left a student who reached for
     * supply on a demand question at `prompt`, and then told them they had not
     * moved anything.
     *
     * A ref rather than a read of `attempt`, so that `onParamChanged` — which a
     * drag calls sixty times a second — keeps one identity for the life of the
     * screen instead of being rebuilt every time the question's phase moves.
     */
    const asked = useRef<string[]>([]);

    /**
     * What the engine held, so a remount can be undone.
     *
     * `Stage` keeps its engine through everything it owns — a promotion, a
     * reveal, the box changing size or shape, the question row arriving and
     * leaving are all a relayout of the same engine. What still remounts it is
     * a new config or new options, which this screen never hands it (a
     * different lesson is a different screen), or a retry after a failed
     * mount. A remounted engine starts from the config: `params.step` back to
     * 0, every reveal undone, the student's own drag discarded, and the track
     * underneath still reading "8 / 9". Nothing announces it, so what a student
     * would see is the lesson evaporating.
     *
     * Until the stage stopped rebuilding for a change of shape, that was every
     * resize that moved the proportions by a hundredth, and this was written
     * for it. It is a rarer road now, and still a road.
     *
     * The position and the question are the app's and are restored from state.
     * The param *values* are not — they live in the engine, which has just been
     * thrown away — so the last ones it reported are kept here. Refs rather than
     * state throughout, so `onReady` keeps one identity: it is called from an
     * effect keyed on its own identity, and a changing one would re-run it.
     */
    const lastParams = useRef<Record<string, number>>({});
    const trackAt = useRef<TrackState>(AT_START);
    const asking = useRef<Attempt | null>(null);
    const paneAt = useRef<Pane>(pane);
    trackAt.current = track;
    asking.current = attempt;
    paneAt.current = pane;

    /**
     * The lesson's diagram, as the student left it for the instruments.
     *
     * The instruments get the whole diagram to do what they like with, so
     * coming back to the lesson has to put back the market the step was talking
     * about: its words describe that one, not wherever exploring left the
     * curves. Two states, because a step is a move as well as a market —
     * `before` is what the ghosts and the narration measure from, `after` is where
     * the curves are — and putting back only the second would lose the ghost
     * the step's words point at.
     */
    const held = useRef<{ before: Record<string, number>; after: Record<string, number> } | null>(null);

    /**
     * The other params' question apparatus, as the question being asked left it.
     *
     * A diagram with two askable params draws a "where it started" line for
     * each, and a question about one of them has to say where the other one
     * started too — see `armQuestion`. Kept beside `asking` because a remount
     * forgets it just as thoroughly.
     */
    const parked = useRef<{ name: string; value: number }[]>([]);

    /**
     * True only while a write that is not the student's is in flight: a lesson
     * step, a remount's restore, a retry putting a curve back.
     *
     * Those writes go through the same `engine.update` a drag does, and raise
     * the same events, so this is how the handlers tell whose move it was. A
     * refusal raised by one is the screen's own bookkeeping and is not put in
     * front of the student. The engine's update is synchronous, so a flag held
     * across the call is enough.
     */
    const applyingStep = useRef(false);

    // The engine, and the state to narrate against — refs rather than state
    // because a drag writes to them sixty times a second and none of those
    // writes is a render this component owes anyone.
    const engineRef = useRef<KineticGraph | null>(null);
    const latest = useRef<ParamChangedEvent | null>(null);
    const dragging = useRef(false);
    const before = useRef<Snapshot | null>(null);

    // Memoised because `useEquilibria` remounts when the config's identity
    // changes, and rebuilding the diagram on every keystroke elsewhere in the
    // app would undo everything P7 does to avoid a remount.
    const config = useMemo(() => diagram, [diagram]);

    // The lesson's pictures, fetched while the student reads the cover, so a
    // picture step opens on its picture rather than on an empty sheet that
    // fills in. Both frames of one that moves: Pause swaps to the still.
    const pictures = content.pictures;
    useEffect(() => {
        Object.keys(pictures || {}).forEach(key => {
            [pictures![key].src, pictures![key].still].forEach(src => {
                if (src) new Image().src = src;
            });
        });
    }, [pictures]);

    /**
     * The params the narration is allowed to talk about, and the precision it prints
     * them at — from the engine, which is the only thing that knows either.
     *
     * Presentation params are dropped here and nowhere else. They are how the
     * stage promotes a panel, so a strip that narrated them would announce
     * `stageFocus 0.0 → 1.0` when a student clicked a thumbnail, and an undo
     * built on them would drag the focal panel back along with the price.
     */
    const [narratedParams, setNarratedParams] = useState<NarratedParam[]>([]);
    const isNarrated = useCallback(
        (name: string) => narratedParams.some(p => p.name === name),
        [narratedParams]
    );

    /**
     * The colour of each param's curve, for the controls that move it: the
     * same values "What changed" marks a cause in, resolved once above, so a
     * slider, its line and the clause about the line cannot disagree.
     */
    const curveColors = useMemo(() => {
        const colors: Record<string, string> = {};
        narratedParams.forEach(p => { if (p.color) colors[p.name] = p.color; });
        return colors;
    }, [narratedParams]);

    /**
     * Every param with its live value, for the dock's controls.
     *
     * Kept as state and refreshed from `getParams()` rather than patched from
     * the event, because a slider reads its own position from here: patching
     * would make this a second record of a value the engine already holds, and
     * the two would drift the first time a restriction refused a move.
     */
    const [dockParams, setDockParams] = useState<ParamInfo[]>([]);
    const refreshParams = useCallback(() => {
        const engine = engineRef.current;
        if (engine) setDockParams(engine.getParams());
    }, []);

    /** The chain as it stands now, against the snapshot the ghosts also use. */
    const retell = useCallback((live: boolean) => {
        const event = latest.current;
        if (!event) return;
        before.current = engineRef.current?.getSnapshot() ?? null;
        setLine(narrate({
            before: before.current,
            after: { params: event.params, calcs: event.calcs },
            affected: event.affected,
            params: narratedParams,
            calcs: narratedCalcs,
            live
        }));
    }, [narratedParams, narratedCalcs]);

    const onParamChanged = useCallback((data: unknown) => {
        const event = data as ParamChangedEvent;
        setReadout(event.calcs as Readout);
        refreshParams();
        lastParams.current = { ...event.params };

        // A promotion, a mode toggle and a panel resolving its own density all
        // arrive here as param changes. None of them is something the student
        // did to the market, and narrating one would both say something false
        // and throw away the chain describing what they actually did — the
        // event carries no `affected` for a presentation change, so the middle
        // clause would quietly vanish from a sentence that was already correct.
        if (!isNarrated(event.name)) return;

        // A move that landed retires the last refusal, even a lesson's — the
        // diagram is no longer refusing anything and the sentence would be
        // describing a boundary the student is no longer at.
        setRefusal(null);

        // Moving any param the question offers is what turns a prompt into an
        // attempt. The reducer returns the same object once it has, so a drag's
        // sixty changes a second cost one state update between them.
        if (asked.current.indexOf(event.name) > -1) {
            setAttempt(current => attemptReducer(current, { type: 'move' }));
        }

        latest.current = event;
        retell(dragging.current);
    }, [isNarrated, retell, refreshParams]);

    /**
     * Narrate on commit, not on change.
     *
     * A drag fires ~60 param changes a second; a line rewritten at that rate is
     * unreadable, and "20.0 → 20.1" is a frame rather than a mechanism. The
     * engine already brackets a drag for its own snapshot, and this is the same
     * boundary — so what the narration calls one interaction and what the diagram
     * draws a ghost for are the same interaction by construction.
     */
    /**
     * A move the diagram would not make (P12).
     *
     * The same two filters the chain uses, for the same two reasons. A lesson
     * step or a remount restore writing a param is not the student, so it must
     * not put a sentence in the narration; and a presentation param being clamped is
     * the stage's own bookkeeping — a rail panel's focus fraction pinned at 1 is
     * not news anyone should read.
     *
     * The engine has already coalesced this: a curve held against the top of its
     * range announces itself once rather than once per pointer move, so nothing
     * here has to debounce.
     */
    const onParamBlocked = useCallback((data: unknown) => {
        const event = data as ParamBlockedEvent;
        if (applyingStep.current) return;
        if (!isNarrated(event.name)) return;

        const declared = narratedParams.filter(p => p.name === event.name)[0];
        setRefusal(phraseRefusal(event, v => formatValue(v, declared ? declared.precision : 1)));
    }, [isNarrated, narratedParams]);

    const onCurveDragged = useCallback((data: unknown) => {
        const isDragging = !!(data as { dragging: boolean }).dragging;
        if (isDragging === dragging.current) return;
        dragging.current = isDragging;
        retell(isDragging);
    }, [retell]);

    /**
     * A fresh engine, which may be a *re*fresh one.
     *
     * The event only fires once something has changed, so the chips would sit
     * blank until the student moved something; this is the reading at rest.
     *
     * And it is also where a remount is repaired. `Stage` lays the same
     * engine out again for everything it owns, a resize included, so this no
     * longer runs for one; but a new config or a retry after a failed mount
     * hands it an engine that has never heard of the lesson — at step 0, with
     * the market back at its authored values and any question stood down.
     * Restoring is not optional politeness: without it, a remount is
     * indistinguishable from the whole lesson being thrown away, and the track
     * underneath goes on claiming a position the diagram is not at.
     *
     * Order matters, and it is the order every other boundary in this file
     * uses: put the state back, *then* snapshot. A restore that snapshotted
     * first would draw a ghost for every param it restored — the diagram
     * showing a movement nobody made, which is the failure P9 shipped and P10
     * inherited.
     *
     * The snapshot costs the student's last move: its ghost, its deltas and its
     * sentence. The new engine never saw that move, and the `prev` it would be
     * drawn from went with the old one. That used to be the price of resizing
     * the window, which is why the stage stopped rebuilding for it (NOTES.md,
     * issue 19); it is the price of a remount only now.
     */
    const onReady = useCallback((engine: KineticGraph) => {
        engineRef.current = engine;
        setReadout(engine.getCalcs() as Readout);
        // The engine says what a param is called and to how many places; the
        // lesson says what its rise and fall mean, where it has words for them,
        // and which colour its curve is drawn in — by name, since only the
        // engine knows the value a name stands for.
        const colors = engine.getColors();
        setNarratedParams(engine.getParams()
            .filter(p => !p.presentation)
            .map(p => {
                const words = paramWords ? paramWords[p.name] : undefined,
                    color = words && words.curve ? colors[words.curve] : undefined;
                // A typo here leaves the marker grey, which looks like nothing
                // went wrong — so it is said, where the author will see it.
                if (words && words.curve && !color && import.meta.env.DEV) {
                    console.warn(`paramWords.${p.name}.curve names "${words.curve}", ` +
                        'which is not a colour this diagram has.');
                }
                return {
                    name: p.name, label: p.label, precision: p.precision,
                    ...(words ? { rise: words.rise, fall: words.fall } : {}),
                    ...(color ? { color } : {})
                };
            }));
        setDockParams(engine.getParams());

        // The instruments draw the diagram as the track's end does, whatever
        // step the lesson was left at.
        const previous = lastParams.current,
            position = paneAt.current === 'explore' ? steps.length : trackAt.current.position,
            question = asking.current,
            apparatus = question ? questionApparatus[question.question.param] : undefined;

        // Presentation params are not restored: `stageFocus`, `stageMode` and
        // the revealed count are the stage's own and it re-applies them itself.
        // Writing a stale copy back would be a second answer to a question the
        // stage has already answered.
        const restoring = engine.getParams()
            .filter(p => !p.presentation && previous[p.name] !== undefined
                && previous[p.name] !== p.value)
            .map(p => ({ name: p.name, value: previous[p.name] }));

        if (position > 0) restoring.unshift({ name: STEP_PARAM, value: position });
        if (question) {
            const start = question.starts[question.question.param],
                info = engine.getParams().filter(p => p.name === question.question.param)[0];
            restoring.push(
                { name: 'asking', value: 1 },
                { name: 'submitted', value: isFrozen(question) ? 1 : 0 },
                { name: 'revealed', value: question.phase === 'reveal'
                    || (question.phase === 'verdict' && !!question.grade?.correct
                        && drawsAnswerWhenRight(question.question, questionApparatus)) ? 1 : 0 }
            );
            if (apparatus) {
                restoring.push(
                    { name: apparatus.start, value: start },
                    { name: apparatus.answer, value: answerPosition(question.question, start, info) }
                );
            }
            restoring.push(...parked.current);
        }

        if (restoring.length === 0) return;

        applyingStep.current = true;
        try {
            engine.update({ params: restoring });
            engine.snapshot();
        } finally {
            applyingStep.current = false;
        }

        // Read the calcs *after* the snapshot, not from the events the restore
        // raised. Those were computed against a `prev` still holding the
        // authored baseline, so every delta chip came back reading the whole
        // distance from the config — a panel announcing "+11.0" for a resize.
        setReadout(engine.getCalcs() as Readout);

        // The chain described a movement against a snapshot this engine never
        // took. It comes back the moment the student touches anything.
        latest.current = null;
        setLine(REST);
        // And a rebuilt engine has refused nothing yet: its `blocked` bookkeeping
        // went with the old one, so a refusal left on screen would be the only
        // party still remembering a boundary.
        setRefusal(null);
    }, [questionApparatus, steps, paramWords]);

    /**
     * Put the params back where the snapshot found them.
     *
     * Nothing else has to happen: the engine does not take a new snapshot for a
     * host update, so afterwards the params equal `prev`, every ghost hides
     * itself, and the next `kg:param_changed` narrates as rest. The narration stands
     * down because the diagram did, not because it was told to.
     */
    const onUndo = useCallback(() => {
        const params = undoParams(line, before.current);
        if (params.length > 0) engineRef.current?.update({ params });
    }, [line]);

    /**
     * A host control's gesture, told to both parties that need to know.
     *
     * The engine's `beginGesture`/`endGesture` coalesce a scrub into one
     * snapshot, so the ghosts are drawn against where the drag started. That
     * half the engine offers. The other half it cannot: `kg:curve_dragged` is
     * raised only by dragging *inside* the diagram, so as far as the narration
     * is concerned a slider scrub is sixty separate settled interactions —
     * a chain rewritten every frame, and a live region that announces each one.
     *
     * P8 solved the strobe for the diagram's own drags and could not have solved
     * it here, because the wire it needs did not exist yet. This is that wire:
     * both parties learn about the gesture from the same two calls, so they
     * cannot disagree about when it started.
     */
    const beginGesture = useCallback(() => {
        if (dragging.current) return;
        dragging.current = true;
        engineRef.current?.beginGesture();
        retell(true);
    }, [retell]);

    const endGesture = useCallback(() => {
        if (!dragging.current) return;
        dragging.current = false;
        engineRef.current?.endGesture();
        retell(false);
    }, [retell]);

    // A scrub that ends outside the control — the pointer released over the
    // stage, or off the window entirely — never fires the slider's own
    // `onChangeEnd`, and a gesture left open holds the narration in its live form
    // indefinitely. Cheap insurance, and it costs nothing when already closed.
    useEffect(() => {
        const close = () => endGesture();
        window.addEventListener('pointerup', close);
        window.addEventListener('pointercancel', close);
        return () => {
            window.removeEventListener('pointerup', close);
            window.removeEventListener('pointercancel', close);
        };
    }, [endGesture]);

    /**
     * Which params are refusing to move because they have been answered: every
     * one the question offered, the wrong curves included (P14).
     *
     * `draggable` freezes the *diagram's* drag and says nothing about a host
     * control — and P11's slider is not a fallback but the equal answer path,
     * so a committed answer that a dock slider could still edit is not frozen
     * at all. This is the one place every host param write goes through, which
     * makes it the one place the freeze has to hold.
     *
     * Keyed on the names rather than on the attempt, so that `updateParams` —
     * and with it the dock's whole context — keeps its identity through the
     * phase changes that do not change what is frozen.
     *
     * Lesson navigation writes through `engine.update` directly and is
     * deliberately not guarded: moving the track is not a student's answer.
     */
    const frozenKey = frozenParams(attempt).join('\n');
    const frozen = useMemo(() => (frozenKey ? frozenKey.split('\n') : []), [frozenKey]);

    const updateParams = useCallback((next: { name: string; value: number }[]) => {
        const allowed = next.filter(p => frozen.indexOf(p.name) < 0);
        if (allowed.length > 0) engineRef.current?.update({ params: allowed });
    }, [frozen]);

    /**
     * Move the lesson, and tell the engine in the right order.
     *
     * Two things happen and the order of both is load-bearing.
     *
     * `snapshot()` first, when the move establishes params or goes backwards: it
     * marks where the diagram is *now* as the state its ghosts and the sentence
     * under it should both call "before". A lesson step is invisible to the
     * engine — it arrives as ordinary param updates — and P9 shipped exactly
     * this bug for scenarios: the diagram moved, every ghost appeared, and the
     * strip read "drag a curve to see what it changes".
     *
     * Going back re-bases it for the opposite reason. Scrubbing back un-draws
     * and deliberately leaves the values alone, so without a snapshot the ghost
     * and the delta chip go on describing a shift the lesson has scrubbed away
     * from — a panel reading "+3.0" three steps after anything moved. A forward
     * move that only reveals does *not* re-base, because the ghost of the step
     * before it is usually the thing the new step is talking about.
     *
     * Then one `update`, with the step param first so the reveal lands before
     * the values move — a curve arriving and then shifting, rather than arriving
     * already shifted. It is one call rather than several because a multi-param
     * update is applied and validated one param at a time and rolls back
     * silently, so keeping the ordering in one place is the most a host can do
     * about it until the engine offers a batched update. The study diagram
     * declares no restrictions, so nothing here can trip today; that is luck,
     * not design.
     */
    const applyStep = useCallback((
        params: { name: string; value: number }[], position: number, rebase: boolean
    ) => {
        const engine = engineRef.current;
        if (!engine) return;

        applyingStep.current = true;
        try {
            if (params.length > 0 || rebase) engine.snapshot();
            engine.update({ params: [{ name: STEP_PARAM, value: position }, ...params] });
        } finally {
            applyingStep.current = false;
        }
    }, []);

    /**
     * Put a question on screen, or take the last one off (P11).
     *
     * The order is the whole of it, and it is the reverse of what reads
     * naturally. `snapshot()` comes *after* the step's own `set`, not before,
     * because the "before" a question needs is where the question starts — not
     * where the lesson was a step ago. Without that the narration reports the
     * student's first drag against the wrong baseline and the delta chips
     * describe a move the question itself made.
     *
     * The start is then written into a param rather than left to `prev`. `prev`
     * is per *gesture*, so a second attempt would slide the drawn "before"
     * forward while the grade went on being measured from the question's own
     * starting line — one number drawn, a different one marked.
     */
    const armQuestion = useCallback((question: LessonQuestion | null, index: number) => {
        const engine = engineRef.current;
        if (!engine) return;

        if (!question) {
            if (attempt) {
                engine.update({ params: QUESTION_OFF });
                setAttempt(null);
            }
            parked.current = [];
            return;
        }

        const values = engine.getParams(),
            info = values.filter(p => p.name === question.param)[0],
            start = info ? info.value : 0,
            apparatus = questionApparatus[question.param];

        // Where the question found every curve it offers, not only the right
        // one: the grade measures a wrong curve from here too, and "Try again"
        // puts one back here (P14).
        const starts: Record<string, number> = {};
        candidatesOf(question).forEach(name => {
            const candidate = values.filter(p => p.name === name)[0];
            if (candidate) starts[name] = candidate.value;
        });
        starts[question.param] = start;

        // Every other askable param's apparatus, parked where its curve is now:
        // the market as the question found it. Left alone, it would sit wherever
        // the last question about that param put it. See `parkApparatus`.
        parked.current = parkApparatus(question.param, questionApparatus, values);

        // A question nobody can answer is indistinguishable, from the student's
        // side, from not being able to do economics — so it fails loudly here
        // rather than quietly on screen. Dev only: in a build this would be
        // shouting at a student about their teacher's typo.
        const problems = validateQuestion(question, info, start).concat(validateChoice(question, values));
        if (problems.length > 0 && import.meta.env.DEV) {
            problems.forEach(p => console.error(`Question at step ${index + 1} ${p}`));
        }

        engine.snapshot();
        engine.update({
            params: [
                { name: 'asking', value: 1 },
                { name: 'submitted', value: 0 },
                { name: 'revealed', value: 0 },
                ...(apparatus ? [
                    { name: apparatus.start, value: start },
                    // The target, the illustration, or parked on the start when
                    // there is neither: nothing draws it then, and a stale
                    // answer from a previous question would. `revealed` is what
                    // keeps any of them off the screen until there is an answer.
                    { name: apparatus.answer, value: answerPosition(question, start, info) }
                ] : []),
                ...parked.current
            ]
        });

        asked.current = candidatesOf(question);
        setAttempt(attemptReducer(null, {
            type: 'ask', questionId: String(index), question: question, starts: starts
        }));
        // The snapshot above re-based `prev`, so the chain is describing a move
        // the diagram no longer remembers. Recomputed rather than blanked, for
        // the same reason scrubbing back recomputes: it reads the engine, which
        // now agrees with itself, and comes back as rest.
        retell(false);
    }, [attempt, retell, questionApparatus]);

    const goTo = useCallback((position: number) => {
        const next = trackReducer(track, { type: 'goTo', position }, steps);
        if (next === track) return;

        // Before the step's own `set`, which would otherwise read as the student
        // answering the question they are about to be asked.
        asked.current = [];

        const backwards = next.position < track.position;
        applyStep(paramsBetween(steps, track.position, next.position), next.position, backwards);

        // The step param is presentation, so its own change is not narrated and
        // the chain would otherwise still be describing the move we just
        // re-based away from. Recomputed rather than blanked: it reads the
        // engine, which now agrees with itself, and comes back as rest.
        if (backwards) retell(false);

        setTrack(next);
        armQuestion(askAt(steps, next.position), next.position - 1);
    }, [track, steps, applyStep, retell, armQuestion]);

    /**
     * Take the answer.
     *
     * The committed values are read back from the engine rather than from
     * anything this screen has been keeping, because the engine is what applied
     * the rounding and the bounds — a value the app thinks it set and the value
     * the param holds are not always the same number. Every param the question
     * offered is read, because the answer is where all of them are (P14).
     */
    const onCommit = useCallback(() => {
        const engine = engineRef.current;
        if (!engine || !attempt) return;

        const values = engine.getParams(),
            info = values.filter(p => p.name === attempt.question.param)[0];
        if (!info) return;

        const marked = gradeChoice(attempt.question, attempt.starts, values),
            next = attemptReducer(attempt, { type: 'commit', value: info.value, grade: marked });
        if (next === attempt) return;
        setAttempt(next);

        engine.update({
            params: [
                { name: 'submitted', value: 1 },
                // A right answer gets the exact position too: their curve is
                // within tolerance of it, and seeing where "close enough" sat is
                // the difference between being told yes and being shown why. A
                // target only — see `drawsAnswerWhenRight`.
                ...(marked.correct && drawsAnswerWhenRight(attempt.question, questionApparatus)
                    ? [{ name: 'revealed', value: 1 }] : [])
            ]
        });

        if (isResolved(next)) {
            setTrack(current => trackReducer(
                current, { type: 'resolve', index: Number(attempt.questionId) }, steps
            ));
        }
    }, [attempt, steps, questionApparatus]);

    /**
     * Back to answering, with any curve that should not have moved put back.
     *
     * The putting back is `resetsOnRetry`'s decision and the reasons are there
     * (P14). What is here is that it is the app's move and not the student's,
     * written the way a lesson step or a remount restore writes one: under the
     * step flag, so the arbitration does not read it as theirs, and then
     * snapshotted — put the state back, *then* snapshot — so no ghost marks a
     * movement they did not make and the narration comes back at rest. The calcs
     * are read again after the snapshot, as `onReady` reads them, because the
     * events the write raised were computed against the `prev` before it.
     *
     * With nothing to put back — always, for a question that offers no choice —
     * this is P11's retry exactly.
     */
    const onRetry = useCallback(() => {
        const engine = engineRef.current;
        const back = resetsOnRetry(attempt);
        setAttempt(current => attemptReducer(current, { type: 'retry' }));
        if (!engine) return;

        const thaw = [{ name: 'submitted', value: 0 }, { name: 'revealed', value: 0 }];
        if (back.length === 0) {
            engine.update({ params: thaw });
            return;
        }

        applyingStep.current = true;
        try {
            engine.update({ params: thaw.concat(back) });
            engine.snapshot();
        } finally {
            applyingStep.current = false;
        }
        setReadout(engine.getCalcs() as Readout);
        retell(false);
    }, [attempt, retell]);

    /**
     * Show the answer, which is also a way past the question.
     *
     * Not a concession. Unlimited retries with the answer withheld measure
     * persistence rather than recall, which is the better thing to measure —
     * but only if nobody can be stuck, so asking to be shown has to finish the
     * question. What it costs is the record: `first` says what they answered
     * before they asked.
     *
     * For a question with no target, what is drawn is its illustration, where
     * it has one (P14) — the right curve, shifted the right way, by an amount
     * the grade never read.
     */
    const onReveal = useCallback(() => {
        if (!attempt) return;
        const next = attemptReducer(attempt, { type: 'reveal' });
        if (next === attempt) return;

        setAttempt(next);
        if (drawsAnswer(attempt.question, questionApparatus)) {
            engineRef.current?.update({ params: [{ name: 'revealed', value: 1 }] });
        }
        setTrack(current => trackReducer(
            current, { type: 'resolve', index: Number(attempt.questionId) }, steps
        ));
    }, [attempt, steps, questionApparatus]);

    /**
     * Put the params back where this step established them.
     *
     * The escape hatch scrubbing back requires. Going back un-draws and
     * deliberately leaves the student's own values alone — their work is never
     * destroyed by navigation — so restoring the state the author described has
     * to be something they ask for. It is every `set` up to here, not the last
     * one written: the state at step 4 is what steps 1 to 4 between them said.
     */
    const resetToStep = useCallback(() => {
        const authored = paramsAt(steps, track.position);
        const params = Object.keys(authored).map(name => ({ name, value: authored[name] }));
        if (params.length === 0) return;

        applyingStep.current = true;
        try {
            engineRef.current?.snapshot();
            engineRef.current?.update({ params });
        } finally {
            applyingStep.current = false;
        }
    }, [steps, track.position]);

    /**
     * Put the lesson away and hand the student the instruments.
     *
     * The instruments get the whole diagram: the step param at the track's end,
     * so every curve and every panel is there to be moved. A scenario applied to
     * curves the lesson had not drawn yet moved nothing anyone could see, and
     * the strip under the empty axes went on announcing new prices. A question
     * is stood down, since nobody is answering it now; coming back asks it
     * again, as moving back to it does.
     *
     * Then a snapshot, after the move rather than before it: the lesson's last
     * move belongs to the lesson, and exploring starts at rest, with no ghost
     * and nothing in "What changed". `held` keeps what the snapshot is about to
     * forget, so the lesson can have it back.
     */
    const leaveLesson = useCallback(() => {
        const engine = engineRef.current;
        if (!engine) return;
        endGesture();

        const market = marketOf(engine.getParams()),
            snap = engine.getSnapshot(),
            measuredFrom: Record<string, number> = {};
        Object.keys(market).forEach(name => {
            measuredFrom[name] = snap && name in snap.params ? snap.params[name] : market[name];
        });
        held.current = {
            before: measuredFrom,
            // A question is put back where it started, not where the student
            // had got to with it: it is asked again from there.
            after: { ...market, ...(attempt ? attempt.starts : {}) }
        };

        asked.current = [];
        parked.current = [];
        applyingStep.current = true;
        try {
            engine.update({
                params: [{ name: STEP_PARAM, value: steps.length }, ...(attempt ? QUESTION_OFF : [])]
            });
            engine.snapshot();
        } finally {
            applyingStep.current = false;
        }

        setAttempt(null);
        setReadout(engine.getCalcs() as Readout);
        latest.current = null;
        setLine(REST);
        setRefusal(null);
        setPane('explore');
    }, [attempt, steps, endGesture]);

    /**
     * Back to the lesson, where the student left it.
     *
     * The order is the one every restore in this file uses, run twice: the step
     * and the market its move was measured from, then a snapshot, then the
     * market as the student left it. So the ghost the step left is drawn again
     * and "What changed" says again what the step did — the screen as it was, rather
     * than a step whose words point at a ghost that is not there.
     *
     * A question is asked afresh, from where it started, as arriving at it is.
     */
    const resumeLesson = useCallback(() => {
        const engine = engineRef.current;
        if (!engine) return;
        endGesture();

        const authored = paramsAt(steps, track.position),
            kept = held.current || { before: authored, after: authored };
        held.current = null;
        latest.current = null;
        setLine(REST);
        setRefusal(null);
        setPane('lesson');

        applyingStep.current = true;
        try {
            engine.update({
                params: [{ name: STEP_PARAM, value: track.position }, ...entries(kept.before)]
            });
            engine.snapshot();
            // Raised as ordinary changes, so the narration reports the step's move
            // again from the snapshot just taken.
            const after = entries(kept.after);
            if (after.length > 0) engine.update({ params: after });
        } finally {
            applyingStep.current = false;
        }
        setReadout(engine.getCalcs() as Readout);

        armQuestion(askAt(steps, track.position), track.position - 1);
    }, [steps, track.position, armQuestion, endGesture]);

    /**
     * Which panels are on the stage: what the lesson has brought in, or all of
     * them while the instruments are out.
     *
     * The same rule the engine applies to the objects inside them, because it
     * has to be: the stage arranges these and the diagram draws them, and a
     * panel the stage made room for but the diagram is hiding is an empty square
     * with a name over it.
     */
    const shown = pane === 'explore' ? steps.length : track.position;
    const revealed = useMemo(
        () => revealedPanels(steps, shown, panelKeys),
        [steps, panelKeys, shown]
    );

    // Deliberately not called for undo, which is the mirror case: undo restores
    // the params to what `prev` already holds, so leaving the snapshot alone is
    // what lets the ghosts hide themselves and the narration read rest.
    const snapshot = useCallback(() => {
        engineRef.current?.snapshot();
    }, []);

    /**
     * Bring a panel to the front, from the rail or from the grid.
     *
     * From the grid it also leaves the grid. The grid ignores which panel is
     * focal, so a promotion that stayed in it changed nothing a student could
     * see — a caption that looked clickable and did nothing. Asking for one
     * panel is asking to look at that panel.
     */
    const promote = useCallback((key: string) => {
        setFocused(key);
        setMode('focus');
    }, []);

    const chrome = useCallback((panel: StagePanel) => {
        const declared = panels.filter(p => p.key === panel.key)[0];
        if (!declared) return null;

        // The caption says what its number *is*. "Market $13.0" left a student
        // to guess that the figure was the clearing price and not, say, the
        // revenue — and on the revenue panel, that "$91.0" was revenue and not
        // a price. The label is the one the narration uses for the same calc.
        const metric = narrated[declared.headline],
            label = metric ? metric.label : declared.headline,
            unit = metric && metric.unit ? metric.unit : '',
            places = calcPrecision(metric);

        const level = readout[declared.headline],
            delta = readout[declared.delta];

        // Shown only once something has moved *as printed*. At rest a chip that
        // says "▲ $0.00" is noise pretending to be news, and a threshold of its
        // own would be a second rule for "changed" beside the narration's.
        const change = typeof delta === 'number' ? formatValue(Math.abs(delta), places) : null,
            moved = change !== null && Number(change) !== 0,
            rose = typeof delta === 'number' && delta > 0;

        const named = panel.role !== 'grid' || panel.box.width >= NAMED_GRID_PX
            || typeof level !== 'number';

        const body = (
            <>
                {named ? (
                    <Text component="span" className={classes.panelName}>{declared.name}</Text>
                ) : null}
                {typeof level === 'number' ? (
                    <>
                        {/* At the other end of the sheet's top from the name,
                          * or under it in a column. Either way the space
                          * separates them; a dot between them is not needed. */}
                        <Group gap={6} wrap="nowrap" className={classes.values}>
                            <Text component="span" className={classes.headline}>
                                {label} {unit}{formatValue(level, places)}
                            </Text>
                            {/* A direction and an amount, in the panel's own
                              * unit, and no verdict. Red for a fall said a lower
                              * price was bad news, which depends entirely on
                              * which side of the market you are on — and the
                              * diagram is about both sides at once. The arrow
                              * carries the direction; the colour stays out of it.
                              *
                              * The glyph is for the eye. A screen reader is
                              * given the word instead of "black up-pointing
                              * triangle". */}
                            {moved ? (
                                <>
                                    <Badge
                                        size="sm"
                                        variant="light"
                                        color="gray"
                                        className={classes.change}
                                        aria-hidden="true"
                                    >
                                        {rose ? '▲' : '▼'} {unit}{change}
                                    </Badge>
                                    <VisuallyHidden>{rose ? 'up' : 'down'} {unit}{change}</VisuallyHidden>
                                </>
                            ) : null}
                        </Group>
                    </>
                ) : null}
            </>
        );

        // Sized to exactly the room the stage kept for it, so the two numbers
        // are one number: chrome that outgrew its room would land on the very
        // tick labels the room is there to keep it off.
        const sheet = sheetOf(panel),
            style = captionBox(panel, sheet);

        // In the grid the stage lays nothing across the panel, so a drag
        // reaches the diagram — and the caption is how the panel is promoted.
        // It is the whole of the sheet's top, which is outside the plot.
        if (panel.promote) {
            return (
                <UnstyledButton
                    className={classes[panel.role]}
                    style={style}
                    onClick={panel.promote}
                    aria-label={`Show ${declared.name}`}
                >
                    {body}
                    <IconArrowsDiagonal size={16} stroke={1.75} className={classes.icon} aria-hidden="true" />
                </UnstyledButton>
            );
        }

        // A rail, strip or shelf panel is inside the stage's own promote
        // button, which covers only the glyph. The tile reaches the rest of the
        // sheet, so the whole card is the click target, and it is what lights
        // up on a hover or a keyboard focus — a ring around the glyph alone sat
        // inside the card, around nothing in particular.
        if (!panel.focused) {
            return (
                <>
                    <div className={classes.tile} style={reach(sheet)} />
                    <div className={classes[panel.role]} style={style}>{body}</div>
                    <IconArrowsDiagonal
                        size={16}
                        stroke={1.75}
                        className={classes.cornerIcon}
                        style={{ top: -sheet.top + SHEET_PAD - 2, right: -sheet.right + SHEET_PAD - 2 }}
                        aria-hidden="true"
                    />
                </>
            );
        }

        return <div className={classes[panel.role]} style={style}>{body}</div>;
    }, [readout, panels, narrated]);

    /**
     * The instruments, and what they are all handed.
     *
     * All three need a little more than the shared contract, and every extra is
     * content rather than capability — what each param stands for, the
     * scenario list, and what the lesson calls each number: its symbol, its
     * words, its unit and its decimals, which are the app's one answer for
     * each. Bound here so the contract itself stays the narrow thing every
     * instrument gets.
     */
    const instruments: Instrument[] = useMemo(() => [
        {
            id: 'explore',
            label: 'Explore',
            Component: (props: InstrumentProps) => (
                <Explore {...props} words={paramWords} prompts={explorePrompts} colors={curveColors} />
            )
        },
        {
            id: 'scenarios',
            label: 'Scenarios',
            Component: (props: InstrumentProps) => <Scenarios {...props} scenarios={scenarios} />
        },
        {
            id: 'maths',
            label: 'Maths',
            Component: (props: InstrumentProps) => (
                <Maths
                    {...props}
                    narrated={narrated}
                    paramMeanings={paramMeanings}
                    prevCalcs={before.current ? before.current.calcs : null}
                />
            )
        }
    ], [paramWords, explorePrompts, curveColors, scenarios, narrated, paramMeanings]);

    const dockContext = useMemo(() => ({
        params: dockParams,
        calcs: readout,
        calcExpressions: explainedCalcs,
        updateParams,
        beginGesture,
        endGesture,
        snapshot
    }), [dockParams, readout, explainedCalcs, updateParams, beginGesture, endGesture, snapshot]);

    /**
     * "Why?" — the narration names a calc, and this is where it goes.
     *
     * P8 built the affordance and deliberately did not wire it: a control that
     * opens nothing is worse than no control, so the narration hides it until
     * something can receive the calc. This is that something.
     */
    const onWhy = useCallback((calc: string) => {
        setFocus({ calc });
        setInstrument('maths');
        if (stacked) setSheetOpen(true);
    }, [stacked]);

    /**
     * The lesson card, with the step's controls in it: the question at a step
     * that asks one, or the sliders a "see what happens" step offers.
     *
     * The params the question offers are passed in the order it offers them —
     * the author's `among`, the same whichever is asked, so the first slider is
     * not the answer. No prompt: the step's words, above it on the card, are
     * the prompt.
     *
     * "Reset the diagram to this step" is withheld while an answer is frozen:
     * it writes through `engine.update` directly, so offering it there would be
     * a control that moves a curve the diagram is refusing to let the student
     * move.
     */
    const tries = tryAt(steps, track.position);
    const lesson = (where: 'beside' | 'below') => (
        <LessonCard
            className={where === 'beside' ? undefined : classes.lessonBelow}
            tabbed={where === 'beside'}
            steps={steps}
            state={track}
            goals={content.goals}
            onGoTo={goTo}
            onReset={frozen.length > 0 || sheet ? undefined : resetToStep}
            onLeave={leaveLesson}
        >
            {attempt ? (
                <QuestionRow
                    attempt={attempt}
                    params={candidatesOf(attempt.question)
                        .map(name => dockParams.filter(p => p.name === name)[0])
                        .filter((p): p is ParamInfo => !!p)}
                    directionWords={directionWords ? directionWords[attempt.question.param] : undefined}
                    colors={curveColors}
                    onChange={(name, value) => updateParams([{ name, value }])}
                    onGestureStart={beginGesture}
                    onGestureEnd={endGesture}
                    onCommit={onCommit}
                    onRetry={onRetry}
                    onReveal={onReveal}
                    onContinue={() => goTo(track.position + 1)}
                />
            ) : tries.length > 0 ? (
                <TryRow
                    controls={tries}
                    params={dockParams}
                    colors={curveColors}
                    onChange={(name, value) => updateParams([{ name, value }])}
                    onGestureStart={beginGesture}
                    onGestureEnd={endGesture}
                />
            ) : null}
        </LessonCard>
    );

    /**
     * The lesson put away, under the stage on a phone: where it was left, and
     * the way back. Beside the stage the Lesson tab is both.
     */
    const resume = (
        <LessonResume
            className={classes.resumeBelow}
            steps={steps}
            state={track}
            onResume={resumeLesson}
        />
    );

    const exploring = pane === 'explore';

    /**
     * What covers the stage, if anything: the lesson's cover before the first
     * step, or the picture a step shows.
     *
     * Never while exploring, where the diagram is the whole point. The stage
     * stays mounted under it, made inert so that neither the keyboard nor the
     * pointer can reach a diagram nobody can see — its promote buttons included
     * — and kept at its size, so the step after finds the engine as it left it.
     * Unmounted rather than hidden when it goes, so a picture that moves stops.
     */
    const slide = exploring ? null : slideAt(steps, track.position, !!content.cover);
    const pictureOf = (key: string | undefined) =>
        key && content.pictures ? content.pictures[key] : undefined;
    const pictured = slide && slide.kind === 'picture' ? pictureOf(slide.picture) : undefined;
    const sheet = slide && slide.kind === 'cover' && content.cover ? (
        <StageSheet label="About this lesson" eyebrow={`${content.label} · ${steps.length} steps`}>
            <LessonCover cover={content.cover} picture={pictureOf(content.cover.picture)} steps={steps} />
        </StageSheet>
    ) : pictured ? (
        <PictureSheet key={pictured.src} picture={pictured} />
    ) : null;

    /**
     * A tab pressed beside the stage. Between two instruments it changes only
     * which is open. Into the lesson's or out of it, it is the lesson taken up
     * again or put away — the same moves as Resume and Finish, so the diagram
     * the lesson gets back is the one it left.
     */
    const openTab = useCallback((id: string) => {
        if (id === LESSON_TAB) {
            if (exploring) resumeLesson();
            return;
        }
        if (!exploring) leaveLesson();
        setInstrument(id);
    }, [exploring, resumeLesson, leaveLesson]);

    /**
     * What the student's last move did, said in one of two places.
     *
     * Beside the stage it is "What changed", the bottom third of the side
     * column, under the tabs whichever is open, and the same card under all of
     * them. Where there is no column it is the strip under the stage: one line,
     * which is what a phone has room for. Never both, and they announce the
     * same sentence.
     *
     * Before the lesson has begun nothing is drawn, so nothing can change, and
     * both say what they are waiting for rather than advise a drag. Both hold
     * their place whatever they say: a card that came and went would re-divide
     * the column, and a strip that did would resize the diagram.
     *
     * "Why?" opens the Maths instrument, and while a lesson runs there is none
     * to open, so neither form offers it then.
     */
    const notStarted = !exploring && track.position === 0 && steps.length > 0;
    // Under a sheet there is no diagram to have changed, so both forms rest —
    // a step's own `set` would otherwise be narrated over a picture of
    // something else — and say what they are waiting for.
    const pictureStep = !!sheet && !notStarted;
    const narration = {
        line: sheet ? REST : line,
        refusal: sheet ? null : refusal,
        onUndo,
        onWhy: exploring ? onWhy : undefined
    };

    // Two columns, and the side one is the screen's whole height: the title is
    // the diagram's, so it heads the stage's column rather than running over
    // the lesson as well, and the side column gets the height it took — two
    // thirds of it for the tabs' card, one for "What changed", whatever either
    // holds. The row is the whole of how the side column affects the stage's
    // size: it takes its fixed width, the stage's own `ResizeObserver`
    // notices, and the arrangement re-runs. Nobody passes a width to anybody.
    // What keeps the stage *still* while a student moves through the lesson or
    // switches tabs is that the column's width depends on none of them — and
    // the stage's height on nothing in it.
    return (
        <div className={classes.screen}>
            <div className={classes.stageColumn}>
                {/* The arrangement toggle is the stage's, so it sits in the
                  * stage column's top right corner, on the title's line. Over
                  * the stage itself it would land on the top-right panel's
                  * caption — its number, or its promote icon — whichever panel
                  * that is. The intro goes under both, the column's whole
                  * width: beside the toggle too, it wrapped onto a second line
                  * that came out of the stage's height. */}
                <Stack gap={0} mb="sm">
                    <Group justify="space-between" wrap="nowrap">
                        <Title order={2} size="h4">{content.title}</Title>
                        <Group gap="xs" wrap="nowrap">
                            {/* Disabled under a sheet, where there is nothing to
                              * arrange — and not hidden, so the title's line
                              * keeps its height and the stage its size. */}
                            <SegmentedControl
                                size="xs"
                                disabled={!!sheet}
                                value={mode}
                                onChange={value => setMode(value as StageMode)}
                                data={[{ label: 'Focus', value: 'focus' }, { label: 'Grid', value: 'grid' }]}
                                aria-label="Panel arrangement"
                            />
                            {/* Where the dock is a sheet it has no permanent edge
                              * to grab, so it needs a door. On a wide screen the
                              * dock is simply there and this would be a button
                              * that opens what is already open — and while a
                              * lesson runs there are no instruments to open. */}
                            {stacked && exploring ? (
                                <ActionIcon
                                    variant="default"
                                    size="lg"
                                    aria-label="Open instruments"
                                    onClick={() => setSheetOpen(true)}
                                >
                                    &#9776;
                                </ActionIcon>
                            ) : null}
                        </Group>
                    </Group>
                    <Text c="dimmed" size="sm">{content.intro}</Text>
                </Stack>

                <div className={classes.stageBox}>
                    <div className={classes.stageLayer} inert={!!sheet}>
                        <Stage
                            config={config}
                            focused={focused}
                            revealed={revealed}
                            mode={mode}
                            onPromote={promote}
                            renderChrome={chrome}
                            renderBackdrop={sheetBehind}
                            chromeRoom={CHROME_ROOM}
                            promoteLabel={key => {
                                const declared = panels.filter(p => p.key === key)[0];
                                return `Show ${declared ? declared.name : key}`;
                            }}
                            onParamChanged={onParamChanged}
                            onParamBlocked={onParamBlocked}
                            onCurveDragged={onCurveDragged}
                            onReady={onReady}
                            onError={error => console.error('Equilibria failed to mount:', error)}
                        />
                    </div>
                    {sheet}
                </div>

                {/* Under the diagram, never moving, where there is no column
                  * beside it for "What changed". */}
                {stacked ? (
                    <NarrationStrip
                        {...narration}
                        restHint={notStarted
                            ? 'Press Start lesson when you\'re ready.'
                            : pictureStep ? 'The diagram is back at the next step.' : undefined}
                    />
                ) : null}

                {/* Where there is no room for a column beside the stage, the
                  * lesson goes under it, at a fixed height so that moving from
                  * a short step to a long one does not resize the diagram. */}
                {stacked ? (exploring ? resume : lesson('below')) : null}
            </div>

            {!stacked ? (
                <div className={classes.side}>
                    {/* The lesson is handed over whichever tab is open: the
                      * dock mounts only the open one, so while an instrument
                      * is open the lesson's card is not on the screen. */}
                    <Dock
                        className={classes.dockBeside}
                        instruments={instruments}
                        open={exploring ? instrument : LESSON_TAB}
                        onOpenChange={openTab}
                        context={dockContext}
                        focus={focus}
                        lesson={lesson('beside')}
                    />
                    <NarrationCard
                        {...narration}
                        className={classes.narrationBeside}
                        restHint={notStarted
                            ? 'Start the lesson, and what each step changes will show here.'
                            : pictureStep
                                ? 'This step is a picture, so nothing on the diagram changes. ' +
                                    'The diagram is back at the next step.'
                                : exploring
                                ? 'Drag a curve, move a slider or try a scenario to see what it changes.'
                                : undefined}
                    />
                </div>
            ) : null}

            {stacked && exploring ? (
                <Dock
                    instruments={instruments}
                    open={instrument}
                    onOpenChange={setInstrument}
                    context={dockContext}
                    focus={focus}
                    sheet
                    sheetOpen={sheetOpen}
                    onSheetClose={() => setSheetOpen(false)}
                />
            ) : null}
        </div>
    );
}

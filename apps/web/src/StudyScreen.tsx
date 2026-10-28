import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Badge, Group, Text, UnstyledButton, VisuallyHidden } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconArrowsDiagonal } from '@tabler/icons-react';
import { STAGE_PAD, Stage } from 'equilibria-react';
import type { PanelRole, Room, StageMode, StagePanel } from 'equilibria-react';
import { STEP_PARAM } from 'equilibria-engine-js';
import type {
    KineticGraph, ParamBlockedEvent, ParamChangedEvent, ParamInfo
} from 'equilibria-engine-js';
import type { Aside, StudyContent, StudyModel } from './lessons/content';
import { SUPPLY_AND_DEMAND } from './lessons/supplyAndDemand';
import { STORY_NOTE, dateWords } from './news';
import type { Story } from './news';
import { StoryCard } from './StoryCard';
import { NarrationStrip } from './NarrationStrip';
import { NarrationCard } from './NarrationCard';
import { QuestionRow } from './QuestionRow';
import { TryRow } from './TryRow';
import { LessonCard } from './LessonCard';
import { AsidePanel } from './AsidePanel';
import { LessonCover } from './LessonCover';
import { LessonRecap } from './LessonRecap';
import type { RecapCase } from './LessonRecap';
import { PictureSheet } from './PictureSheet';
import { StageSheet } from './StageSheet';
import { TitleLine } from './TitleLine';
import type { TitleTopic } from './TitleLine';
import {
    AT_START, askAt, asideAt, focusBetween, paramsAt, paramsBetween, revealedPanels, slideAt, trackReducer,
    tryAt
} from './track/track';
import type { LessonQuestion, LessonStep, Outcome, TrackState } from './track/track';
import { attemptReducer, frozenParams, isFrozen, isResolved, resetsOnRetry } from './quiz/attempt';
import type { Attempt } from './quiz/attempt';
import { candidatesOf, gradeChoice, validateChoice, validateQuestion } from './quiz/grade';
import { answerPosition, drawsAnswer, drawsAnswerWhenRight, parkApparatus } from './quiz/apparatus';
import { Dock } from './dock/Dock';
import { Explore } from './dock/Explore';
import { Maths } from './dock/Maths';
import { Scenarios } from './dock/Scenarios';
import type { Instrument, InstrumentProps } from './dock/types';
import { REST, calcPrecision, formatValue, narrate, undoParams } from './narration/narrate';
import { phraseRefusal } from './narration/phrasebook';
import type { NarratedCalc, NarratedParam, NarrationLine, Snapshot } from './narration/narrate';
import { AT_THE_START, useAddressFollows, writeLink } from './links';
import type { Link, Place } from './links';
import { downloadPicture, linkHref, pictureName, usePrintFit } from './share';
import type { ShareActions } from './ShareMenu';
import { QrSheet } from './QrSheet';
import { PrintedView } from './PrintedView';
import classes from './StudyScreen.module.css';

/**
 * The study screen: one diagram, several panels, one of them driving, a line
 * underneath saying what the last thing the student did actually did, and
 * beside it the lesson, the instruments or a story — never two. Which is the
 * page's: a lesson's page has the lesson, a model's page in the playground has
 * the instruments, and a story's page has what the story moves, with the story
 * itself on the stage as a report (docs/design.md, "Pages to come").
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
 * What the screen works out from its lesson and its model, once per page.
 *
 * `steps` is the same array the screen puts in the config it hands the engine
 * (`config`, below), which is what keeps one ordered list rather than two —
 * `kg.steps()` would return it too, and is there for a host rendering a config
 * it did not write. This screen was handed it, and needs it before the engine
 * has mounted: the stage has to know at its first render that only one panel
 * has arrived, or three appear and then two vanish.
 *
 * `narrated` is each narrated calc by name: what a number on this screen is
 * called, in what unit, to how many places. A panel's caption looks its
 * headline up here rather than carrying a label of its own, and the maths
 * instrument looks up its decimals here too. The narration reads the same list, so
 * a caption, a chip, a clause and a formula's result print one quantity one way.
 */
function prepare(lesson: StudyContent | null, model: StudyModel) {
    const narrated: Record<string, NarratedCalc> = {};
    model.narratedCalcs.forEach(calc => { narrated[calc.name] = calc });
    return {
        // The playground has no steps, so everything is revealed from the
        // start: a student who has come to play has nothing to be brought to.
        steps: lesson ? lesson.lesson : [],
        panelKeys: model.panels.map(p => p.key),
        narrated
    };
}

/**
 * The recap's cases: every question before the recap step, in the words the
 * chain uses for its cause and in its curve's colour, with how it went.
 *
 * The clause is the param's rise or fall as the question asks it — a question
 * whose answer is demand moving up is about "Demand for A$ increases" — and
 * falls back to the param's label, as the chain does, where the lesson gives
 * no words.
 */
function recapCases(
    steps: StudyContent['lesson'], position: number, track: TrackState, params: NarratedParam[]
): RecapCase[] {
    const cases: RecapCase[] = [];
    steps.slice(0, Math.max(0, position - 1)).forEach(function (step, i) {
        if (!step.ask) return;
        const param = params.filter(p => p.name === step.ask!.param)[0];
        const words = param ? (step.ask.direction === 'up' ? param.rise : param.fall) : undefined;
        cases.push({
            title: step.title || '',
            clause: words || (param ? param.label : step.ask.param),
            color: param ? param.color : undefined,
            explain: step.ask.explain,
            outcome: track.outcomes[i]
        });
    });
    return cases;
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

/** The params a student moves, by name and value: presentation ones left out. */
function marketOf(params: { name: string; value: number; presentation?: boolean }[]): Record<string, number> {
    const out: Record<string, number> = {};
    params.forEach(p => { if (!p.presentation) out[p.name] = p.value });
    return out;
}

/**
 * The instruments' tabs, which a link may open at: the ids `instruments` gives
 * them. The first is open when the playground opens, so a link leaves it out.
 */
const TABS = ['explore', 'scenarios', 'maths'];

/**
 * The step the playground is at, and a story: past the end of every lesson.
 *
 * A model's own expressions can read the step a lesson has reached — the café
 * draws Z before its choices and again once the lesson is over, and the Air
 * Jordans model a quantity once its step has come — so a model with no lesson
 * still needs the param they read. The playground has nothing to build up: it
 * is the model as a student who had seen every step would find it, which is
 * what the instruments drew when they were put at a lesson's end. The engine
 * declares the param only for a config with steps, so the playground declares
 * it, at a step no lesson reaches. A story is told on the model whole, so it
 * is at the same step.
 */
const PLAYGROUND_STEP = { name: STEP_PARAM, value: 9999, min: 0, max: 9999, round: 1, presentation: true };

/**
 * What a lesson's history entry remembers that its link never carries: which
 * questions were answered, and how. So Back to a lesson finds the recap with
 * its questions on it, while a link handed round still opens each question
 * unanswered. Plain data, since a history entry keeps a copy.
 */
export interface Answered {
    lesson: string;
    resolved: TrackState['resolved'];
    outcomes: TrackState['outcomes'];
}

/**
 * Where a screen opened at a link starts: the tab or the step, the market,
 * the arrangement and the panel at the front. A lesson has no tab and a
 * playground no step, so each reads only its own.
 *
 * **A link never carries an answer**, so the track starts with nothing
 * answered, whoever sent it, and stops where it always does: at the first
 * question. A link to a step past one opens at that question, as the lesson
 * puts it. The link's params went with the step it named: they are the
 * market after the question, which can be its answer, and a link must not
 * pass answers round a class. A question's own curves are never taken from a
 * link either — they are where the step puts them, which is where it is marked
 * from — so a link cannot start one at its answer.
 *
 * Back to a lesson is not a link: its history entry remembers what was
 * answered (`answered`), and the track starts from that, so it is not stopped
 * at a question already answered and opens where the student left it.
 *
 * A step beyond the lesson's end is its end, with its params: the lesson has
 * lost steps since the link was made, and no question stands between.
 *
 * The market is what the lesson puts at that step with the link's params over
 * it — in the playground, the model's own with them over it. Names the model
 * no longer has are left in, and the engine leaves them out: only it knows
 * what its params are (`onReady`).
 */
function arrival(
    link: Link, steps: LessonStep[], panelKeys: string[], asideKeys: string[], playing: boolean,
    answered: Answered | undefined, first: string
) {
    const tab = playing && link.tab && TABS.indexOf(link.tab) > -1 ? link.tab : null,
        from: TrackState = answered ? { position: 0, resolved: answered.resolved, outcomes: answered.outcomes } : AT_START,
        track = trackReducer(from, { type: 'goTo', position: link.step }, steps),
        stopped = track.position < Math.min(link.step, steps.length),
        question = askAt(steps, track.position),
        answering = question ? candidatesOf(question) : [],
        market = paramsAt(steps, track.position);
    if (!stopped) {
        Object.keys(link.params).forEach(name => {
            if (answering.indexOf(name) < 0) market[name] = link.params[name];
        });
    }
    const known = link.focus && (panelKeys.indexOf(link.focus) > -1 || asideKeys.indexOf(link.focus) > -1),
        front = focusBetween(steps, 0, track.position) || first;
    return { tab, track, market, mode: link.arrange, focused: known ? link.focus as string : front };
}

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

/** A caption across the top of a sheet: one line, the name over the plot's centre and the number at the right. */
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
 * The key a story's report is a panel of the stage under. No model's panel may
 * have it, or the stage would be handed one key for two panels.
 */
const STORY_PANEL = 'story';

/**
 * The shortest glyph a report's own words are read in: a headline's two lines
 * and a line of its sentence. Under it, as on a phone's strip, the caption
 * carries the headline instead.
 */
const REPORT_GLYPH_PX = 96;

/**
 * Each role's caption box, in the sheet, sized from the room that holds it.
 *
 * A caption across the top of a sheet runs from one side of it to the other,
 * a padding in, and the rail's two lines and the shelf's three sit in the same
 * place — the whole width, since the number and chip need it; only the name's
 * line leaves the corner to the promote icon. The plot is not in the middle of
 * that width, with the y axis's numbers and title on its left, so a caption
 * across the top is also told where the plot's centre is, from its own left
 * edge, for the name to be centred over it. The strip's column is beside the
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
                right: -sheet.right + HEADER_INSET, height: HEADER_PX,
                '--plot-centre': `${sheet.left - HEADER_INSET + panel.box.width / 2}px`
            } as CSSProperties;
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

/**
 * Where a panel the screen draws itself puts what it shows, against its box:
 * the sheet, less its padding and its caption's room. Where an engine panel
 * draws its plot and its axes — the room the stage kept for the axes is the
 * sheet's, so a report gets it too.
 */
function asideBody(panel: StagePanel): CSSProperties {
    const sheet = sheetOf(panel), room = CHROME_ROOM[panel.role];
    return {
        top: -sheet.top + room.top,
        right: -sheet.right + room.right,
        bottom: -sheet.bottom + room.bottom,
        left: -sheet.left + room.left
    };
}

export interface StudyScreenProps {
    /**
     * The lesson on screen. Fixed for the life of the screen: a different
     * lesson is a different screen, which is how `App` mounts it, rather than
     * this one rebuilding its engine and its track under the student.
     */
    content?: StudyContent;
    /**
     * A model to give the student in the playground, in place of a lesson:
     * the screen is then that model's page, with every panel on the stage and
     * the instruments beside it, and `content` is not read. Fixed for the
     * life of the screen, as a lesson is.
     */
    playground?: StudyModel;
    /**
     * A story to tell, in place of a lesson: the screen is then the story's
     * page, its model whole on the stage with the story at the front as a
     * report, and what it moves beside it. Fixed for the life of the screen,
     * as a lesson is, and `content` is not read.
     */
    story?: Story;
    /** The topic the lesson is listed under, named over its title. */
    topic?: TitleTopic | null;
    /**
     * The view to open at, from the address. Read once, when the screen
     * mounts; without it the page opens at its start.
     */
    link?: Link;
    /** What the lesson's history entry remembers was answered; see `Answered`. Read once. */
    answered?: Answered;
    /**
     * The address for this view, each time it settles somewhere new: the
     * screen's half of the address following the view. The shell owns the
     * address, so it is the one that writes it.
     */
    onLinkChange?: (address: string) => void;
    /** What has been answered, each time a question is, for the shell to keep with the lesson's entry. */
    onAnswer?: (answered: Answered) => void;
    /**
     * The way into the playground — a lesson's Finish, or a story's "Open in
     * the Playground": the playground's address at the model and the market
     * this page leaves it, and this view's, for the shell to open the first
     * and leave this page's entry at the second.
     */
    onFinish?: (address: string, from: string | null) => void;
}

export function StudyScreen({
    content = SUPPLY_AND_DEMAND, playground, story, topic, link, answered, onLinkChange, onAnswer, onFinish
}: StudyScreenProps) {
    // The lesson, on a lesson's page; none in the playground, where the model
    // is the page, or on a story's, where the story is.
    const lesson = playground || story ? null : content;
    const model = playground || (story ? story.model : content.model);

    // The reports beside the diagram: a lesson's, which its steps bring in and
    // which are made up and say so, or the story, which is the page's whole
    // time and real, with its numbers in its words and the model's on the
    // diagram, which its note says.
    const asides = useMemo((): Record<string, Aside> | undefined => (lesson ? lesson.asides : story ? {
        [STORY_PANEL]: { name: 'News report', headline: story.headline, body: story.body, note: STORY_NOTE }
    } : undefined), [lesson, story]);
    const {
        diagram, panels, narratedCalcs, explainedCalcs, paramMeanings, paramWords, explorePrompts,
        scenarios, questionApparatus, directionWords
    } = model;
    const { steps, panelKeys, narrated } = useMemo(() => prepare(lesson, model), [lesson, model]);
    const place: Place = useMemo(() => (lesson ? { kind: 'lesson', id: lesson.id }
        : story ? { kind: 'news', id: story.id } : { kind: 'playground', id: model.id }), [lesson, story, model]);

    /**
     * Whether there is no lesson: the model is on the stage whole, from the
     * start, and Reset puts back the market the page opened with — the
     * playground's, and a story's.
     */
    const exploring = !lesson;

    /**
     * Whether the instruments are beside the stage: the playground's. The
     * lesson and the instruments are never on one page — with both on screen
     * a student could apply a scenario to curves the lesson had not drawn
     * yet, or drag a slider through a step whose words describe a market they
     * had just moved away from, and a lesson that builds a diagram one idea at
     * a time has no use for a full set of controls beside it. So beside a
     * lesson the only controls are the ones a step hands the student: its
     * question, or what it offers to try. A story's page has the model whole,
     * as the playground does, but beside it is the story's move, and there is
     * no Maths for "Why?" to open.
     */
    const instrumented = !!playground;

    /** The panel the page puts at the front: a story's report, or the model's first. */
    const ownFront = story ? STORY_PANEL : panels[0].key;

    // Where a link opens, worked out once: everything below that a link
    // decides starts from it.
    const [opening] = useState(() => link
        ? arrival(link, steps, panelKeys, Object.keys(asides || {}), instrumented, answered, ownFront) : null);

    const [focused, setFocused] = useState<string>(opening ? opening.focused : ownFront);
    const [mode, setMode] = useState<StageMode>(opening ? opening.mode : 'focus');
    const [readout, setReadout] = useState<Readout>({});
    const [line, setLine] = useState<NarrationLine>(REST);

    // The lesson or the instruments, a card beside the stage, until there is
    // not room for a column there; below that either goes under the stage.
    // Measured once, here, because the screen is what owns the decision — a
    // dock that measured the viewport itself would be a second answer to the
    // same question.
    const stacked = useMediaQuery('(max-width: 899px)') ?? false;

    // Which instrument is open, and whether it was opened *at* something. Both
    // live here rather than in the dock because "why?" — which is under the
    // stage, not in the dock — has to be able to set them.
    const [instrument, setInstrument] = useState(opening && opening.tab ? opening.tab : TABS[0]);
    const [focus, setFocus] = useState<{ calc?: string } | undefined>(undefined);

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
    const [track, setTrack] = useState<TrackState>(opening ? opening.track : AT_START);

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
     *
     * A screen opened at a link is restored the same way, from the market the
     * link names: the first engine is a remount of a view it never saw.
     */
    const lastParams = useRef<Record<string, number>>(opening ? opening.market : {});
    const trackAt = useRef<TrackState>(AT_START);
    const asking = useRef<Attempt | null>(null);
    trackAt.current = track;
    asking.current = attempt;

    /**
     * What the first engine still has to do once it is ready: ask the step's
     * question a link opened at, or note the market the playground opened
     * with, which is the one a link names or the model's own. Once: a later
     * remount is repaired from state like any other.
     */
    const arriving = useRef(true);
    const arm = useRef<((question: LessonQuestion | null, index: number) => void) | null>(null);

    /**
     * The two markets Reset puts back besides a step's.
     *
     * `declared` is the diagram's own, as the engine read it — the market under
     * every step that sets nothing — taken in `onReady` before anything is
     * restored, which a remount makes the config's values again. `opened` is
     * the market the playground opened with: the model's own, or the one a
     * link or a lesson's Finish handed it. State rather than refs, since Reset
     * is greyed or not by what they hold.
     */
    const [declared, setDeclared] = useState<Record<string, number>>({});
    const [opened, setOpened] = useState<Record<string, number>>({});

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

    // The model's diagram with the lesson's steps in it, which the engine
    // reveals and sets by; in the playground, with no steps and past every
    // lesson's end. Memoised because `useEquilibria` remounts when the
    // config's identity changes, and rebuilding the diagram on every keystroke
    // elsewhere in the app would undo everything P7 does to avoid a remount.
    const config = useMemo(() => {
        if (lesson) return { ...diagram, steps };
        const params = (diagram.params || []) as { name: string }[];
        return params.some(p => p.name === STEP_PARAM) ? diagram : { ...diagram, params: [...params, PLAYGROUND_STEP] };
    }, [lesson, diagram, steps]);

    // The lesson's pictures, fetched while the student reads the cover, so a
    // picture step opens on its picture rather than on an empty sheet that
    // fills in. Both frames of one that moves: Pause swaps to the still.
    const pictures = lesson ? lesson.pictures : undefined;
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
     * A curve held against the end of its range is refused too, and the
     * phrasebook has nothing to say about it: the curve stopping is the news.
     * Whatever was on screen stays there.
     */
    const onParamBlocked = useCallback((data: unknown) => {
        const event = data as ParamBlockedEvent;
        if (applyingStep.current) return;
        if (!isNarrated(event.name)) return;

        const said = phraseRefusal(event);
        if (said !== null) setRefusal(said);
    }, [isNarrated]);

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
        setDeclared(marketOf(engine.getParams()));
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

        const previous = lastParams.current,
            position = trackAt.current.position,
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

        if (restoring.length > 0) {
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
            setDockParams(engine.getParams());

            // The chain described a movement against a snapshot this engine never
            // took. It comes back the moment the student touches anything.
            latest.current = null;
            setLine(REST);
            // And a rebuilt engine has refused nothing yet: its `blocked` bookkeeping
            // went with the old one, so a refusal left on screen would be the only
            // party still remembering a boundary.
            setRefusal(null);
        }

        // Opened at a link, the question is asked as arriving at it asks it:
        // after the market is back and snapshotted, so it starts where the
        // step puts it and nothing has been answered.
        if (arriving.current) {
            arriving.current = false;
            if (exploring) setOpened(marketOf(engine.getParams()));
            else if (arm.current) arm.current(askAt(steps, position), position - 1);
        }
    }, [questionApparatus, steps, paramWords, exploring]);

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
     *
     * It is an arrival, so what the step brings in is animated in where its
     * config asks: this, and not a restore of the same step, is the student
     * moving through the lesson.
     */
    const applyStep = useCallback((
        params: { name: string; value: number }[], position: number, rebase: boolean
    ) => {
        const engine = engineRef.current;
        if (!engine) return;

        applyingStep.current = true;
        try {
            if (params.length > 0 || rebase) engine.snapshot();
            engine.update({ params: [{ name: STEP_PARAM, value: position }, ...params] }, { arrive: true });
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
    arm.current = armQuestion;

    const goTo = useCallback((position: number) => {
        const next = trackReducer(track, { type: 'goTo', position }, steps);
        if (next === track) return;

        // Before the step's own `set`, which would otherwise read as the student
        // answering the question they are about to be asked.
        asked.current = [];

        const backwards = next.position < track.position,
            established = paramsBetween(steps, track.position, next.position);
        applyStep(established, next.position, backwards);

        // The step param is presentation, so its own change is not narrated and
        // the chain would otherwise still be describing the move we just
        // re-based away from. Recomputed rather than blanked: it reads the
        // engine, which now agrees with itself, and comes back as rest.
        //
        // Forward too, whenever the step established params and so re-based.
        // A step whose params were already where it puts them raises no change
        // to narrate, and the chain stayed on the step before's move — which
        // the snapshot had just forgotten, about a point the new step may have
        // put away. Where the params did move, this retells what their own
        // events already told.
        if (backwards || established.length > 0) retell(false);

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

        // Resolved means right, here: "shown" is resolved by the reveal below.
        // The number of commits is the number of goes, the first included.
        if (isResolved(next)) {
            const outcome: Outcome = next.attempts <= 1
                ? { how: 'first' } : { how: 'retry', goes: next.attempts };
            setTrack(current => trackReducer(
                current, { type: 'resolve', index: Number(attempt.questionId), outcome }, steps
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
            current, { type: 'resolve', index: Number(attempt.questionId), outcome: { how: 'shown' } }, steps
        ));
    }, [attempt, steps, questionApparatus]);

    /**
     * What Reset would move, and to where: the params not yet back where the
     * open tab or step began.
     *
     * During the lesson that is the step's own market — the diagram's, with
     * every `set` up to here over it, so the state at step 4 is what steps 1
     * to 4 between them said, and a curve no step sets goes back to where the
     * diagram drew it. It is the escape hatch scrubbing back requires: going
     * back un-draws and deliberately leaves the student's own values alone, so
     * restoring the state the author described has to be something they ask
     * for. A question's curves go back to where the question found them, which
     * is where its grade is measured from and its "where it started" line is
     * drawn; and a curve whose answer is in is left alone, because Reset does
     * not forget an answer.
     *
     * In the playground it is the market the page opened with.
     */
    const resetTo = useMemo(() => {
        const target: Record<string, number> = exploring ? opened : {
            ...declared, ...paramsAt(steps, track.position), ...(attempt ? attempt.starts : {})
        };
        return dockParams
            .filter(p => !p.presentation && p.name in target && frozen.indexOf(p.name) < 0
                && Math.abs(p.value - target[p.name]) > 1e-9)
            .map(p => ({ name: p.name, value: target[p.name] }));
    }, [exploring, opened, declared, steps, track.position, attempt, dockParams, frozen]);

    /**
     * Reset: a move like any other.
     *
     * The snapshot comes first, as a scenario's does, so the move is measured
     * from where the student had the diagram: "What changed" reports it and
     * Undo brings their curves back. That is why it never asks "Are you sure?".
     * It moves the market and nothing else — not the lesson's place, not an
     * answer, not which panel is in front.
     */
    const onReset = useCallback(() => {
        if (resetTo.length === 0) return;
        endGesture();
        engineRef.current?.snapshot();
        updateParams(resetTo);
    }, [resetTo, endGesture, updateParams]);

    /**
     * Which panels are on the stage: what the lesson has brought in, or, in
     * the playground, which has no steps, all of them.
     *
     * The same rule the engine applies to the objects inside them, because it
     * has to be: the stage arranges these and the diagram draws them, and a
     * panel the stage made room for but the diagram is hiding is an empty square
     * with a name over it.
     */
    const revealed = useMemo(
        () => revealedPanels(steps, track.position, panelKeys),
        [steps, panelKeys, track.position]
    );

    /**
     * The report beside the diagram at this step, if it has one: a panel of
     * the stage's for as long as the step is on screen, drawn by this screen
     * rather than by the engine.
     */
    const aside = story ? STORY_PANEL : asideAt(steps, track.position);
    const hostPanels = useMemo(() => (aside ? [aside] : []), [aside]);

    // A report promoted and then left behind leaves nothing at the front, and
    // the stage would put the first panel there for now and the report back
    // the next time one arrived. The diagram is what the next step is about.
    useEffect(() => {
        if (asides && asides[focused] && focused !== aside) setFocused(panels[0].key);
    }, [aside, focused, asides, panels]);

    // A step that brings a panel to the front does it each time the lesson
    // passes it going forward, by Next or by a jump along the track. Anything
    // else leaves the focus where the student last put it, and a panel that
    // has not arrived yet cannot be at the front: the stage puts the first
    // that has there instead.
    const passedFrom = useRef(track.position);
    useEffect(() => {
        const front = focusBetween(steps, passedFrom.current, track.position);
        passedFrom.current = track.position;
        if (front) setFocused(front);
    }, [steps, track.position]);

    /**
     * This view, as a link: what the address says while the screen is here.
     *
     * The step, or in the playground the tab; each param the student can move
     * that is not where the page puts it — at the step, the diagram's own with
     * every step's `set` up to here over it, as Reset has it; in the
     * playground, the model's own; the arrangement; and the panel at the
     * front, where it is on the stage and not the one the lesson would put
     * there.
     *
     * Never a question's own curves: where the student has them is their
     * answer, given or on its way, and a question a link opens at is asked as
     * the lesson puts it. And never the answers: the track's record of them is
     * not in a link at all.
     *
     * A phone writes what a laptop does, so one link opens on either: its
     * instruments are under the stage rather than beside it, at the same tab.
     *
     * Taken from the params as they were when the view last settled, which
     * is the boundary the narration already keeps: a drag is one move, part
     * of the view once it is let go, and not sixty a second while it is held.
     *
     * Null until the engine has said what its params are, since a link
     * written before then would leave out every param the student moved.
     */
    const settledParams = useRef(dockParams);
    if (line.kind !== 'live') settledParams.current = dockParams;
    const settled = settledParams.current;

    const view = useMemo(() => {
        if (settled.length === 0) return null;
        const tab = instrumented && instrument !== TABS[0] ? instrument : null,
            position = track.position,
            question = askAt(steps, position),
            answering = question ? candidatesOf(question) : [],
            lessonPuts: Record<string, number> = { ...declared, ...paramsAt(steps, position) },
            front = focusBetween(steps, 0, position) || ownFront,
            params: Record<string, number> = {},
            moved: { info: ParamInfo; from: number }[] = [];
        settled.forEach(p => {
            if (!p.presentation && answering.indexOf(p.name) < 0 && p.name in lessonPuts
                && Math.abs(p.value - lessonPuts[p.name]) > 1e-9) {
                params[p.name] = p.value;
                moved.push({ info: p, from: lessonPuts[p.name] });
            }
        });
        const shownAtFront = revealed.indexOf(focused) > -1 || focused === aside;
        const link: Link = {
            step: position, tab, arrange: mode, focus: shownAtFront && focused !== front ? focused : null, params
        };
        return { link, moved, atFront: shownAtFront ? focused : revealed[0] };
    }, [settled, instrumented, instrument, track.position, steps, declared, ownFront, revealed, focused, aside, mode]);

    const here = useMemo(() => (view ? writeLink(place, view.link) : null), [view, place]);

    // Replaced rather than pushed, by the shell, so Back still goes to the
    // last page rather than the last drag.
    useAddressFollows(here, onLinkChange);

    // The answers, for the lesson's history entry: when one is given, and
    // once at the start, so the entry and the track agree from the first.
    useEffect(() => {
        if (lesson && onAnswer) onAnswer({ lesson: lesson.id, resolved: track.resolved, outcomes: track.outcomes });
    }, [lesson, onAnswer, track.resolved, track.outcomes]);

    /**
     * Finish: the lesson done, and its market the student's in the
     * playground.
     *
     * The market goes in the playground's address, in the words a link uses —
     * each param off where the model puts it — so it opens there as a link
     * would, and Reset there puts back this market rather than the model's.
     * The shell pushes it, so Back returns to the recap.
     */
    const finish = useCallback(() => {
        const engine = engineRef.current;
        if (!engine || !onFinish) return;
        endGesture();
        const params: Record<string, number> = {};
        engine.getParams().forEach(p => {
            if (!p.presentation && p.name in declared && Math.abs(p.value - declared[p.name]) > 1e-9) {
                params[p.name] = p.value;
            }
        });
        onFinish(writeLink({ kind: 'playground', id: model.id }, { ...AT_THE_START, params }), here);
    }, [onFinish, endGesture, declared, model.id, here]);

    // Deliberately not called for undo, which is the mirror case: undo restores
    // the params to what `prev` already holds, so leaving the snapshot alone is
    // what lets the ghosts hide themselves and the narration read rest.
    const snapshot = useCallback(() => {
        engineRef.current?.snapshot();
    }, []);

    /**
     * A story's move, made as a scenario makes one: the snapshot first, so
     * the move is measured from where the student had the diagram, then every
     * param it names in one update. "What changed" then tells the chain, and
     * Undo takes it back. Greyed once the market is where the move puts it,
     * since a press would change nothing.
     */
    const move = story ? story.move : null;
    const canMove = !!move && Object.keys(move).some(name => {
        const param = dockParams.filter(p => p.name === name)[0];
        return !!param && Math.abs(param.value - move[name]) > 1e-9;
    });
    const makeMove = useCallback(() => {
        if (!move) return;
        endGesture();
        snapshot();
        updateParams(Object.keys(move).map(name => ({ name, value: move[name] })));
    }, [move, endGesture, snapshot, updateParams]);

    /**
     * The Playground at the market the story's move makes: the model's own
     * with the move over it, in the words a link uses, so it opens there as a
     * link would and Reset there puts back this market. The same address
     * whether or not the student has pressed the move, since it is the news's
     * market and not their view; pushed by the shell, as Finish is.
     */
    const movedMarket = useMemo(() => (move
        ? writeLink({ kind: 'playground', id: model.id }, { ...AT_THE_START, params: move }) : null), [move, model.id]);
    const openPlayground = useCallback(() => {
        if (!movedMarket || !onFinish) return;
        endGesture();
        onFinish(movedMarket, here);
    }, [movedMarket, onFinish, endGesture, here]);

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

    const report = useCallback((panel: StagePanel) => {
        const told = asides ? asides[panel.key] : undefined;
        if (!told) return null;
        const picture = told.picture && pictures ? pictures[told.picture] : undefined,
            source = story && panel.key === STORY_PANEL ? story.source : undefined;
        return <AsidePanel aside={told} picture={picture} source={source} panel={panel} style={asideBody(panel)} />;
    }, [asides, pictures, story]);

    const chrome = useCallback((panel: StagePanel) => {
        const declared = panels.filter(p => p.key === panel.key)[0];
        // A report beside the diagram is captioned by its name alone: it has
        // no number to headline, and what it says is in the panel itself.
        const report = declared ? undefined : (asides || {})[panel.key];
        if (!declared && !report) return null;
        const name = declared ? declared.name : report!.name;

        // The caption says what its number *is*. "Market $13.0" left a student
        // to guess that the figure was the clearing price and not, say, the
        // revenue — and on the revenue panel, that "$91.0" was revenue and not
        // a price. The label is the one the narration uses for the same calc.
        const metric = declared ? narrated[declared.headline] : undefined,
            label = metric ? metric.label : declared ? declared.headline : '',
            unit = metric && metric.unit ? metric.unit : '',
            places = calcPrecision(metric);

        // A calc that is not a number has nothing to headline: the cost of a
        // move between two points that are one point is 0/0, and a caption
        // reading "NaN" would say the diagram had broken rather than that
        // nothing has moved.
        const finite = (value: unknown) => typeof value === 'number' && isFinite(value) ? value : undefined;
        const level = declared ? finite(readout[declared.headline]) : undefined,
            delta = declared ? finite(readout[declared.delta]) : undefined;

        // Shown only once something has moved *as printed*. At rest a chip that
        // says "▲ $0.00" is noise pretending to be news, and a threshold of its
        // own would be a second rule for "changed" beside the narration's.
        const change = typeof delta === 'number' ? formatValue(Math.abs(delta), places) : null,
            moved = change !== null && Number(change) !== 0,
            rose = typeof delta === 'number' && delta > 0;

        // A label that is the panel's name is said once. The labels are words
        // now, so "Consumer surplus" would otherwise head its own number:
        // "Consumer surplus  Consumer surplus $40.50". The name stays, even in
        // a narrow grid panel where it is squeezed, since it is the only thing
        // left saying what the number is.
        const isName = !!label && label.toLowerCase() === name.toLowerCase();

        const named = isName || panel.role !== 'grid' || panel.box.width >= NAMED_GRID_PX
            || typeof level !== 'number';

        const body = (
            <>
                {/* Its own box in a caption across the top, the room the
                  * number leaves, for the name to be centred over the plot in;
                  * nothing of its own anywhere else. */}
                {named ? (
                    <span className={classes.nameBox}>
                        <Text component="span" className={classes.panelName}>{name}</Text>
                    </span>
                ) : null}
                {/* On a phone a panel beside the diagram is its caption, more
                  * or less — its glyph a few pixels tall, too short for the
                  * report's own words — so a report says its headline there,
                  * where a chart would say its number. */}
                {report && !panel.focused && panel.role !== 'grid' && panel.box.height < REPORT_GLYPH_PX ? (
                    <Text component="span" className={classes.reportLine}>{report.headline}</Text>
                ) : null}
                {typeof level === 'number' ? (
                    <>
                        {/* At the right end of the sheet's top, past the name,
                          * or under it in a column. Either way the space
                          * separates them; a dot between them is not needed. */}
                        <Group gap={6} wrap="nowrap" className={classes.values}>
                            <Text component="span" className={classes.headline}>
                                {isName ? '' : label + ' '}{unit}{formatValue(level, places)}
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
                    aria-label={`Show ${name}`}
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
    }, [readout, panels, narrated, asides]);

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
    }, []);

    /**
     * The lesson card, with the step's controls in it: the question at a step
     * that asks one, or the sliders a "see what happens" step offers.
     *
     * The params the question offers are passed in the order it offers them —
     * the author's `among`, the same whichever is asked, so the first slider is
     * not the answer. No prompt: the step's words, above it on the card, are
     * the prompt.
     */
    const tries = tryAt(steps, track.position);
    const lessonCard = (where: 'beside' | 'below') => (
        <LessonCard
            className={where === 'beside' ? classes.lessonBeside : classes.lessonBelow}
            headed={where === 'beside'}
            steps={steps}
            state={track}
            goals={lesson ? lesson.goals : []}
            onGoTo={goTo}
            onFinish={finish}
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
     * A story's card, beside the stage or, on a phone, under it, in the
     * lesson card's place and at its height.
     */
    const storyCard = (where: 'beside' | 'below') => story && movedMarket ? (
        <StoryCard
            className={where === 'beside' ? classes.lessonBeside : classes.lessonBelow}
            reasoning={story.reasoning}
            canMove={canMove}
            onMove={makeMove}
            playground={linkHref(movedMarket)}
            onOpenPlayground={openPlayground}
        />
    ) : null;

    /**
     * The instruments, beside the stage or, on a phone, under it in the
     * lesson's place: there is no lesson in the playground to hold it.
     */
    const dock = (where: 'beside' | 'below') => (
        <Dock
            className={where === 'beside' ? classes.dockBeside : classes.dockBelow}
            instruments={instruments}
            open={instrument}
            onOpenChange={setInstrument}
            context={dockContext}
            focus={focus}
        />
    );

    /**
     * What covers the stage, if anything: the lesson's cover before the first
     * step, the picture a step shows, or the recap.
     *
     * Never in the playground, where the diagram is the whole point. The stage
     * stays mounted under it, made inert so that neither the keyboard nor the
     * pointer can reach a diagram nobody can see — its promote buttons included
     * — and kept at its size, so the step after finds the engine as it left it.
     * Unmounted rather than hidden when it goes, so a picture that moves stops.
     */
    const cover = lesson ? lesson.cover : undefined;
    const slide = slideAt(steps, track.position, !!cover);
    const pictureOf = (key: string | undefined) => key && pictures ? pictures[key] : undefined;
    const pictured = slide && slide.kind === 'picture' ? pictureOf(slide.picture) : undefined;
    const sheet = slide && slide.kind === 'cover' && lesson && cover ? (
        <StageSheet label="About this lesson" eyebrow={`${lesson.label} · ${steps.length} steps`}>
            <LessonCover cover={cover} picture={pictureOf(cover.picture)} steps={steps} />
        </StageSheet>
    ) : pictured ? (
        <PictureSheet key={pictured.src} picture={pictured} />
    ) : slide && slide.kind === 'recap' ? (
        <StageSheet label="How you went" eyebrow="How you went">
            <LessonRecap
                cases={recapCases(steps, track.position, track, narratedParams)}
                takeaway={slide.takeaway}
            />
        </StageSheet>
    ) : null;

    /**
     * Share's QR code, over the stage while it is up, for what Share's link
     * is. Done or Esc puts it away. A stage sheet
     * like a cover, but Share's rather than the lesson's: the diagram under
     * it is still the view, so "What changed" goes on saying what it said,
     * and the picture is drawn from under it.
     */
    const [qrUp, setQrUp] = useState(false);
    useEffect(() => {
        if (!qrUp) return;
        const away = (event: KeyboardEvent) => { if (event.key === 'Escape') setQrUp(false); };
        window.addEventListener('keydown', away);
        return () => window.removeEventListener('keydown', away);
    }, [qrUp]);

    /**
     * The view's link, for the printed page, and Share's: a lesson's start,
     * since a lesson has a start worth more than any view of it, and in the
     * playground this view, since a market has none, and a teacher who set
     * one up to show a class wants that one.
     */
    const viewLink = useMemo(() => linkHref(here || writeLink(place)), [here, place]);
    // A story's is the story, as a lesson's is the lesson: what happened is
    // worth more than any view of it.
    const shareLink = useMemo(() => (lesson || story ? linkHref(writeLink(place)) : viewLink),
        [lesson, story, place, viewLink]);

    const covering = qrUp ? (
        <QrSheet
            href={shareLink}
            opens={lesson ? 'Opens the lesson at its start' : story ? 'Opens the story' : 'Opens this view'}
            onClose={() => setQrUp(false)}
        />
    ) : sheet;

    /**
     * The view in words, for the printed page and the picture's name: where
     * in the lesson, which panel is in front, and each param the student
     * moved, from where the page puts it to where they put it, printed as
     * the chain prints a number. In the playground the open tab is left out:
     * it is not part of the diagram that is printed.
     */
    const inWords = useMemo(() => {
        const position = view ? view.link.step : 0,
            title = position > 0 ? steps[position - 1].title : undefined,
            nameOf = (key: string) => {
                const declared = panels.filter(p => p.key === key)[0];
                return declared ? declared.name : asides && asides[key] ? asides[key].name : key;
            },
            onStage = revealed.length + hostPanels.length;
        return {
            where: story ? `In the news, ${dateWords(story.date, 'long')}`
                : exploring ? 'In the Playground'
                    : position === 0 ? 'The start of the lesson'
                        : `Step ${position} of ${steps.length}${title ? `: ${title}` : ''}`,
            short: position > 0 ? `step ${position}` : null,
            arrangement: mode === 'grid' ? 'Every panel side by side, in a grid'
                : view && onStage > 1 ? `${nameOf(view.atFront)} at the front` : null,
            moved: view ? view.moved.map(m => `${m.info.label} ${formatValue(m.from, m.info.precision)} → ` +
                formatValue(m.info.value, m.info.precision)) : []
        };
    }, [view, story, exploring, steps, panels, asides, revealed, hostPanels, mode]);

    /**
     * The picture and the page, which are both of the diagram: neither is
     * offered while one of the lesson's sheets hides it. Printing from the
     * browser's own menu fits the stage to the paper as Print does
     * (`usePrintFit`).
     */
    const stageBox = useRef<HTMLDivElement>(null);
    const stageLayer = useRef<HTMLDivElement>(null);
    usePrintFit(stageBox);
    const hidden = !!sheet;
    const title = lesson ? lesson.title : story ? story.headline : model.name;
    const share: ShareActions = useMemo(() => ({
        link: shareLink,
        title,
        onShowQr: () => setQrUp(true),
        onDownload: hidden ? undefined
            : () => downloadPicture(stageLayer.current!, pictureName(lesson ? lesson.label : title, inWords.short)),
        onPrint: hidden ? undefined : () => window.print()
    }), [shareLink, title, lesson, hidden, inWords.short]);

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
     * "Why?" opens the Maths instrument, and beside a lesson there is none
     * to open, so neither form offers it there.
     */
    const notStarted = !exploring && track.position === 0 && steps.length > 0;
    // Under a sheet there is no diagram to have changed, so both forms rest —
    // a step's own `set` would otherwise be narrated over a picture of
    // something else — and say what they are waiting for.
    const under = sheet && !notStarted && slide ? slide.kind : null;
    const narration = {
        line: sheet ? REST : line,
        refusal: sheet ? null : refusal,
        onUndo,
        onWhy: instrumented ? onWhy : undefined
    };

    // Two columns, and the side one is the screen's whole height: the title is
    // the diagram's, so it heads the stage's column rather than running over
    // the lesson as well, and the side column gets the height it took — two
    // thirds of it for the tabs' card, one for "What changed", whatever either
    // holds. The row is the whole of how the side column affects the stage's
    // size: it takes the width the window gives it, the stage's own
    // `ResizeObserver` notices, and the arrangement re-runs. Nobody passes a
    // width to anybody. What keeps the stage *still* while a student moves
    // through the lesson or switches tabs is that the column's width depends on
    // none of them — and the stage's height on nothing in it.
    return (
        <div className={classes.screen}>
            <div className={classes.stageColumn}>
                {/* The stage's tools sit in the stage column's top right
                  * corner, on the title's line. Over the stage itself they
                  * would land on the top-right panel's caption — its number,
                  * or its promote icon — whichever panel that is. Inset by the
                  * stage's margin, so the title lines up with the sheets
                  * below. */}
                <div className={classes.titleBlock} style={{ '--stage-pad': STAGE_PAD } as CSSProperties}>
                    <TitleLine
                        title={title}
                        topic={topic}
                        date={story ? dateWords(story.date, 'long') : undefined}
                        mode={mode}
                        onModeChange={setMode}
                        covered={!!covering}
                        canReset={resetTo.length > 0}
                        onReset={onReset}
                        stacked={stacked}
                        share={share}
                    />
                </div>

                {/* On paper only: the view in words, and a code back to it. */}
                <PrintedView
                    where={inWords.where}
                    arrangement={inWords.arrangement}
                    moved={inWords.moved}
                    href={viewLink}
                />

                <div ref={stageBox} className={classes.stageBox}>
                    <div ref={stageLayer} className={classes.stageLayer} inert={!!covering}>
                        <Stage
                            config={config}
                            focused={focused}
                            revealed={revealed}
                            mode={mode}
                            onPromote={promote}
                            renderChrome={chrome}
                            hostPanels={hostPanels}
                            renderPanel={report}
                            renderBackdrop={sheetBehind}
                            chromeRoom={CHROME_ROOM}
                            promoteLabel={key => {
                                const declared = panels.filter(p => p.key === key)[0];
                                const told = asides ? asides[key] : undefined;
                                return declared ? `Show ${declared.name}`
                                    : told ? `Show the ${told.name.charAt(0).toLowerCase()}${told.name.slice(1)}`
                                        : `Show ${key}`;
                            }}
                            onParamChanged={onParamChanged}
                            onParamBlocked={onParamBlocked}
                            onCurveDragged={onCurveDragged}
                            onReady={onReady}
                            onError={error => console.error('Equilibria failed to mount:', error)}
                        />
                    </div>
                    {covering}
                </div>

                {/* Under the diagram, never moving, where there is no column
                  * beside it for "What changed". */}
                {stacked ? (
                    <NarrationStrip
                        {...narration}
                        restHint={notStarted
                            ? 'Press Start lesson when you\'re ready.'
                            : under === 'picture' ? 'The diagram is back at the next step.'
                                : under === 'recap' ? 'Finish, and this market is yours in the Playground.'
                                    : story ? 'Press Show it on the diagram, below.' : undefined}
                    />
                ) : null}

                {/* Where there is no room for a column beside the stage, the
                  * lesson or the instruments go under it, at a fixed height so
                  * that moving from a short step to a long one, or from one
                  * tab to another, does not resize the diagram. */}
                {stacked ? (lesson ? lessonCard('below') : story ? storyCard('below') : dock('below')) : null}
            </div>

            {!stacked ? (
                <div className={classes.side}>
                    {lesson ? lessonCard('beside') : story ? storyCard('beside') : dock('beside')}
                    <NarrationCard
                        {...narration}
                        className={classes.narrationBeside}
                        restHint={notStarted
                            ? 'Start the lesson, and what each step changes will show here.'
                            : under === 'picture'
                                ? 'This step is a picture, so nothing on the diagram changes. ' +
                                    'The diagram is back at the next step.'
                                : under === 'recap'
                                    ? 'This step looks back, so nothing on the diagram changes. ' +
                                        'Finish, and this market is yours in the Playground.'
                                    : story
                                        ? 'Press Show it on the diagram to see what this news changes, or drag a ' +
                                            'curve yourself.'
                                        : exploring
                                            ? 'Drag a curve, move a slider or try a scenario to see what it changes.'
                                            : undefined}
                    />
                </div>
            ) : null}
        </div>
    );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActionIcon, Badge, Group, SegmentedControl, Stack, Text, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Stage } from 'equilibria-react';
import type { StageMode, StagePanel } from 'equilibria-react';
import { STEP_PARAM } from 'equilibria-engine-js';
import type {
    KineticGraph, ParamBlockedEvent, ParamChangedEvent, ParamInfo
} from 'equilibria-engine-js';
import {
    studyDiagram, EXPLAINED_CALCS, LESSON, NARRATED_CALCS, PANELS, QUESTION_APPARATUS, SCENARIOS
} from './studyDiagram';
import { NarrationStrip } from './NarrationStrip';
import { QuestionRow } from './QuestionRow';
import { Track } from './Track';
import {
    AT_START, askAt, paramsAt, paramsBetween, revealedPanels, sayAt, trackReducer
} from './track/track';
import type { LessonQuestion, LessonStep, TrackState } from './track/track';
import { attemptReducer, isFrozen, isResolved } from './quiz/attempt';
import type { Attempt } from './quiz/attempt';
import { grade, validateQuestion } from './quiz/grade';
import { Dock } from './dock/Dock';
import { Explore } from './dock/Explore';
import { Maths } from './dock/Maths';
import { Scenarios } from './dock/Scenarios';
import type { Instrument, InstrumentProps } from './dock/types';
import { formatValue, narrate, undoParams, CALC_PRECISION } from './narration/narrate';
import { phraseRefusal } from './narration/phrasebook';
import type { NarratedParam, NarrationLine, Snapshot } from './narration/narrate';
import classes from './StudyScreen.module.css';

/**
 * The study screen: one diagram, several panels, one of them driving, and a
 * line underneath saying what the last thing the student did actually did.
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
 * The strip's "before" comes from the same place, for the same reason:
 * `getSnapshot()` is what `prev` resolves to, so the sentence and the ghost are
 * describing one event rather than two.
 */

/** Live calc values, refreshed by the engine's `kg:param_changed`. */
type Readout = Record<string, number>;

const REST: NarrationLine = { kind: 'rest', causes: [], mechanism: null, effects: [], whyTarget: null };

/**
 * The lesson, and the panels it can bring in.
 *
 * `LESSON` is the same array the config hands the engine, which is what keeps
 * one ordered list rather than two — `kg.steps()` would return it too, and is
 * there for a host rendering a config it did not write. This screen wrote it,
 * and needs it before the engine has mounted: the stage has to know at its first
 * render that only one panel has arrived, or three appear and then two vanish.
 */
const STEPS = LESSON as LessonStep[];
const PANEL_KEYS = PANELS.map(p => p.key) as string[];

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

/** Whether this question has a correct *position* the diagram can draw. */
function drawableAnswer(question: LessonQuestion): boolean {
    return question.target !== undefined && !!QUESTION_APPARATUS[question.param];
}

export function StudyScreen() {
    const [focused, setFocused] = useState<string>(PANELS[0].key);
    const [mode, setMode] = useState<StageMode>('focus');
    const [readout, setReadout] = useState<Readout>({});
    const [line, setLine] = useState<NarrationLine>(REST);

    // Which instrument is open, and whether it was opened *at* something. Both
    // live here rather than in the dock because "why?" — which is under the
    // stage, not in the dock — has to be able to set them.
    // The dock is a column beside the stage until there is not room for both,
    // and a bottom sheet below that. Measured once, here, because the screen is
    // what owns the decision — a dock that measured the viewport itself would be
    // a second answer to the same question.
    const narrow = useMediaQuery('(max-width: 1100px)') ?? false;

    const [instrument, setInstrument] = useState('explore');
    const [focus, setFocus] = useState<{ calc?: string } | undefined>(undefined);
    const [sheetOpen, setSheetOpen] = useState(false);

    /**
     * Where the lesson has got to, and what it last said.
     *
     * One number, because what is revealed *is* `params.step` — the engine
     * compiled the reveals into `show` predicates over it, and a second record
     * of the same fact is the kind of thing that ends up disagreeing with the
     * diagram it describes.
     *
     * `saying` is separate because it is not derived: a step's sentence stands
     * until the student does something, and what they did is not a position.
     */
    const [track, setTrack] = useState<TrackState>(AT_START);
    const [saying, setSaying] = useState<string | null>(null);

    /**
     * The last move the diagram would not make (P12).
     *
     * Held beside `saying` rather than folded into the narration line, because
     * it is not part of the chain: nothing moved, so there is nothing to narrate.
     * It stands until the student moves something that *does* move, which is the
     * same rule that retires a lesson's sentence.
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
     * The param the current question is about, for the change handler.
     *
     * A ref rather than a read of `attempt`, so that `onParamChanged` — which a
     * drag calls sixty times a second — keeps one identity for the life of the
     * screen instead of being rebuilt every time the question's phase moves.
     */
    const asked = useRef<string | null>(null);

    /**
     * What the engine held, so a remount can be undone.
     *
     * `Stage` rebuilds its config — and so remounts the engine — when the box's
     * quantised aspect ratio changes, which is any resize big enough to matter
     * and includes the question row arriving and leaving. A rebuilt engine
     * starts from the config: `params.step` back to 0, every reveal undone, the
     * student's own drag discarded, and the track underneath still reading
     * "8 / 9". Nothing announces it, so what a student sees is the lesson
     * evaporating when they resize their window.
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
    trackAt.current = track;
    asking.current = attempt;

    /**
     * True only while a step's own param update is in flight.
     *
     * A step that sets params fires `kg:param_changed` for the very params the
     * strip narrates, so the plain rule — any narrated change clears the step's
     * sentence — would clear it in the same tick it was set. The engine's update
     * is synchronous, so a flag held across the call is enough, and it is the
     * whole of what "the student's own action wins" needs in order to be able to
     * tell whose action it was.
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
    const config = useMemo(() => studyDiagram, []);

    /**
     * The params the strip is allowed to talk about, and the precision it prints
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
            calcs: NARRATED_CALCS,
            live
        }));
    }, [narratedParams]);

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

        // The arbitration, in one line and in the only place that knows both
        // sides: the student moved something themselves, so the lesson's
        // sentence gives way to what they just did.
        if (!applyingStep.current) setSaying(null);

        // Moving the asked param is what turns a prompt into an attempt. The
        // reducer returns the same object once it has, so a drag's sixty
        // changes a second cost one state update between them.
        if (asked.current === event.name) {
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
     * boundary — so what the strip calls one interaction and what the diagram
     * draws a ghost for are the same interaction by construction.
     */
    /**
     * A move the diagram would not make (P12).
     *
     * The same two filters the chain uses, for the same two reasons. A lesson
     * step or a remount restore writing a param is not the student, so it must
     * not put a sentence on the strip; and a presentation param being clamped is
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
        setSaying(null);
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
     * And it is also where a remount is repaired. `Stage` rebuilds the engine
     * whenever the box's quantised shape changes, so this runs again with an
     * engine that has never heard of the lesson — at step 0, with the market
     * back at its authored values and any question stood down. Restoring is not
     * optional politeness: without it, a resize is indistinguishable from the
     * whole lesson being thrown away, and the track underneath goes on claiming
     * a position the diagram is not at.
     *
     * Order matters, and it is the order every other boundary in this file
     * uses: put the state back, *then* snapshot. A restore that snapshotted
     * first would draw a ghost for every param it restored — the diagram
     * showing a movement nobody made, which is the failure P9 shipped and P10
     * inherited.
     */
    const onReady = useCallback((engine: KineticGraph) => {
        engineRef.current = engine;
        setReadout(engine.getCalcs() as Readout);
        setNarratedParams(engine.getParams()
            .filter(p => !p.presentation)
            .map(p => ({ name: p.name, label: p.label, precision: p.precision })));
        setDockParams(engine.getParams());

        const previous = lastParams.current,
            position = trackAt.current.position,
            question = asking.current,
            apparatus = question ? QUESTION_APPARATUS[question.question.param] : undefined;

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
            restoring.push(
                { name: 'asking', value: 1 },
                { name: 'submitted', value: isFrozen(question) ? 1 : 0 },
                { name: 'revealed', value: question.phase === 'reveal'
                    || (question.phase === 'verdict' && !!question.grade?.correct
                        && drawableAnswer(question.question)) ? 1 : 0 }
            );
            if (apparatus) {
                restoring.push(
                    { name: apparatus.start, value: question.startValue },
                    { name: apparatus.answer, value: question.question.target ?? question.startValue }
                );
            }
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
    }, []);

    /**
     * Put the params back where the snapshot found them.
     *
     * Nothing else has to happen: the engine does not take a new snapshot for a
     * host update, so afterwards the params equal `prev`, every ghost hides
     * itself, and the next `kg:param_changed` narrates as rest. The strip stands
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
     * strip is concerned a slider scrub is sixty separate settled interactions —
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
    // `onChangeEnd`, and a gesture left open holds the strip in its live form
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
     * Which param, if any, is refusing to move because it has been answered.
     *
     * `draggable` freezes the *diagram's* drag and says nothing about a host
     * control — and P11's slider is not a fallback but the equal answer path,
     * so a committed answer that a dock slider could still edit is not frozen
     * at all. This is the one place every host param write goes through, which
     * makes it the one place the freeze has to hold.
     *
     * Lesson navigation writes through `engine.update` directly and is
     * deliberately not guarded: moving the track is not a student's answer.
     */
    const frozenParam = attempt && isFrozen(attempt) ? attempt.question.param : null;

    const updateParams = useCallback((next: { name: string; value: number }[]) => {
        const allowed = frozenParam ? next.filter(p => p.name !== frozenParam) : next;
        if (allowed.length > 0) engineRef.current?.update({ params: allowed });
    }, [frozenParam]);

    /**
     * Move the lesson, and tell the engine in the right order.
     *
     * Three things happen and the order of all three is load-bearing.
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
     * The sentence last, after the events the update raised have already been
     * handled, so it is not cleared by the change that caused it.
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
     * where the lesson was a step ago. Without that the strip narrates the
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
            return;
        }

        const info = engine.getParams().filter(p => p.name === question.param)[0],
            start = info ? info.value : 0,
            apparatus = QUESTION_APPARATUS[question.param];

        // A question nobody can answer is indistinguishable, from the student's
        // side, from not being able to do economics — so it fails loudly here
        // rather than quietly on screen. Dev only: in a build this would be
        // shouting at a student about their teacher's typo.
        const problems = validateQuestion(question, info, start);
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
                    // Parked on the start when there is no target: nothing draws
                    // it, and a stale answer from a previous question would.
                    { name: apparatus.answer, value: question.target ?? start }
                ] : [])
            ]
        });

        asked.current = question.param;
        setAttempt(attemptReducer(null, {
            type: 'ask', questionId: String(index), question: question, startValue: start
        }));
        // The snapshot above re-based `prev`, so the chain is describing a move
        // the diagram no longer remembers. Recomputed rather than blanked, for
        // the same reason scrubbing back recomputes: it reads the engine, which
        // now agrees with itself, and comes back as rest.
        retell(false);
    }, [attempt, retell]);

    const goTo = useCallback((position: number) => {
        const next = trackReducer(track, { type: 'goTo', position }, STEPS);
        if (next === track) return;

        // Before the step's own `set`, which would otherwise read as the student
        // answering the question they are about to be asked.
        asked.current = null;

        const backwards = next.position < track.position;
        applyStep(paramsBetween(STEPS, track.position, next.position), next.position, backwards);

        // The step param is presentation, so its own change is not narrated and
        // the chain would otherwise still be describing the move we just
        // re-based away from. Recomputed rather than blanked: it reads the
        // engine, which now agrees with itself, and comes back as rest.
        if (backwards) retell(false);

        setTrack(next);

        // A question's prompt goes to the question row, not to the strip. P10's
        // rule is that the student's own action wins the strip, so a prompt left
        // there would vanish the instant they moved something to answer it.
        const question = askAt(STEPS, next.position);
        setSaying(question ? null : sayAt(STEPS, next.position));
        armQuestion(question, next.position - 1);
    }, [track, applyStep, retell, armQuestion]);

    /**
     * Take the answer.
     *
     * The committed value is read back from the engine rather than from
     * anything this screen has been keeping, because the engine is what applied
     * the rounding and the bounds — a value the app thinks it set and the value
     * the param holds are not always the same number.
     */
    const onCommit = useCallback(() => {
        const engine = engineRef.current;
        if (!engine || !attempt) return;

        const info = engine.getParams().filter(p => p.name === attempt.question.param)[0];
        if (!info) return;

        const marked = grade(attempt.question, attempt.startValue, info.value, info),
            next = attemptReducer(attempt, { type: 'commit', value: info.value, grade: marked });
        if (next === attempt) return;
        setAttempt(next);

        engine.update({
            params: [
                { name: 'submitted', value: 1 },
                // A right answer gets the exact position too: their curve is
                // within tolerance of it, and seeing where "close enough" sat is
                // the difference between being told yes and being shown why.
                ...(marked.correct && drawableAnswer(attempt.question)
                    ? [{ name: 'revealed', value: 1 }] : [])
            ]
        });

        if (isResolved(next)) {
            setTrack(current => trackReducer(
                current, { type: 'resolve', index: Number(attempt.questionId) }, STEPS
            ));
        }
    }, [attempt]);

    const onRetry = useCallback(() => {
        setAttempt(current => attemptReducer(current, { type: 'retry' }));
        engineRef.current?.update({
            params: [{ name: 'submitted', value: 0 }, { name: 'revealed', value: 0 }]
        });
    }, []);

    /**
     * Show the answer, which is also a way past the question.
     *
     * Not a concession. Unlimited retries with the answer withheld measure
     * persistence rather than recall, which is the better thing to measure —
     * but only if nobody can be stuck, so asking to be shown has to finish the
     * question. What it costs is the record: `first` says what they answered
     * before they asked.
     */
    const onReveal = useCallback(() => {
        if (!attempt) return;
        const next = attemptReducer(attempt, { type: 'reveal' });
        if (next === attempt) return;

        setAttempt(next);
        if (drawableAnswer(attempt.question)) {
            engineRef.current?.update({ params: [{ name: 'revealed', value: 1 }] });
        }
        setTrack(current => trackReducer(
            current, { type: 'resolve', index: Number(attempt.questionId) }, STEPS
        ));
    }, [attempt]);

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
        const authored = paramsAt(STEPS, track.position);
        const params = Object.keys(authored).map(name => ({ name, value: authored[name] }));
        if (params.length === 0) return;

        applyingStep.current = true;
        try {
            engineRef.current?.snapshot();
            engineRef.current?.update({ params });
        } finally {
            applyingStep.current = false;
        }
        setSaying(sayAt(STEPS, track.position));
    }, [track.position]);

    /**
     * Which panels the lesson has brought in.
     *
     * The same rule the engine applies to the objects inside them, because it
     * has to be: the stage arranges these and the diagram draws them, and a
     * panel the stage made room for but the diagram is hiding is an empty square
     * with a name over it.
     */
    const revealed = useMemo(
        () => revealedPanels(STEPS, track.position, PANEL_KEYS),
        [track.position]
    );

    // Deliberately not called for undo, which is the mirror case: undo restores
    // the params to what `prev` already holds, so leaving the snapshot alone is
    // what lets the ghosts hide themselves and the strip read rest.
    const snapshot = useCallback(() => {
        engineRef.current?.snapshot();
    }, []);

    const chrome = useCallback((panel: StagePanel) => {
        const declared = PANELS.filter(p => p.key === panel.key)[0];
        if (!declared) return null;

        const level = readout[declared.headline],
            delta = readout[declared.delta];

        return (
            <div className={panel.focused ? classes.focalChrome : classes.railChrome}>
                <Text component="span" className={classes.panelName}>{declared.name}</Text>
                {typeof level === 'number' ? (
                    <Group gap={6} wrap="nowrap" className={classes.values}>
                        <Text component="span" className={classes.headline}>
                            {declared.unit}{formatValue(level, CALC_PRECISION)}
                        </Text>
                        {/* Shown only once something has moved. At rest a chip
                          * that says "+0.0" is noise pretending to be news. */}
                        {typeof delta === 'number' && Math.abs(delta) >= 0.05 ? (
                            <Badge
                                size="sm"
                                variant="light"
                                color={delta > 0 ? 'teal' : 'red'}
                            >
                                {delta > 0 ? '+' : '−'}{formatValue(Math.abs(delta), CALC_PRECISION)}
                            </Badge>
                        ) : null}
                    </Group>
                ) : null}
            </div>
        );
    }, [readout]);

    /**
     * The instruments, and what they are all handed.
     *
     * Scenarios and Maths need a little more than the shared contract, and both
     * extras are content rather than capability — the scenario list, and the
     * app's one answer for how many decimals a calc is worth. Bound here so the
     * contract itself stays the narrow thing every instrument gets.
     */
    const instruments: Instrument[] = useMemo(() => [
        { id: 'explore', label: 'Explore', Component: Explore },
        {
            id: 'scenarios',
            label: 'Scenarios',
            Component: (props: InstrumentProps) => <Scenarios {...props} scenarios={SCENARIOS} />
        },
        {
            id: 'maths',
            label: 'Maths',
            Component: (props: InstrumentProps) => (
                <Maths
                    {...props}
                    precision={CALC_PRECISION}
                    prevCalcs={before.current ? before.current.calcs : null}
                />
            )
        }
    ], []);

    const dockContext = useMemo(() => ({
        params: dockParams,
        calcs: readout,
        calcExpressions: EXPLAINED_CALCS,
        updateParams,
        beginGesture,
        endGesture,
        snapshot
    }), [dockParams, readout, updateParams, beginGesture, endGesture, snapshot]);

    /**
     * "Why?" — the strip names a calc, and this is where it goes.
     *
     * P8 built the affordance and deliberately did not wire it: a control that
     * opens nothing is worse than no control, so `NarrationStrip` hides it until
     * something can receive the calc. This is that something.
     */
    const onWhy = useCallback((calc: string) => {
        setFocus({ calc });
        setInstrument('maths');
        if (narrow) setSheetOpen(true);
    }, [narrow]);

    return (
        <Stack gap="sm" className={classes.screen}>
            <Group justify="space-between" align="flex-end" wrap="nowrap">
                <div>
                    <Title order={2} size="h4">A market, and what it does to everything else</Title>
                    <Text c="dimmed" size="sm">
                        Step through the lesson below, or drag a curve at any point. The
                        panels are the same market seen three ways, and they arrive as the
                        lesson reaches them.
                    </Text>
                </div>
                <Group gap="xs" wrap="nowrap">
                    <SegmentedControl
                        size="xs"
                        value={mode}
                        onChange={value => setMode(value as StageMode)}
                        data={[{ label: 'Focus', value: 'focus' }, { label: 'Grid', value: 'grid' }]}
                        aria-label="Panel arrangement"
                    />
                    {/* Where the dock is a sheet it has no permanent edge to
                      * grab, so it needs a door. On a wide screen the dock is
                      * simply there and this would be a button that opens what
                      * is already open. */}
                    {narrow ? (
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

            {/* Stage and dock are siblings in a row, which is the whole of how
              * the dock affects the stage's size: it takes space, the stage's
              * own `ResizeObserver` notices, and the arrangement re-runs. Nobody
              * passes a width to anybody. What keeps the stage *still* while a
              * student switches instruments is that the dock's width does not
              * depend on what is open. */}
            <div className={classes.stageRow}>
            <div className={classes.stageBox}>
                <Stage
                    config={config}
                    focused={focused}
                    revealed={revealed}
                    mode={mode}
                    onPromote={setFocused}
                    renderChrome={chrome}
                    promoteLabel={key => {
                        const declared = PANELS.filter(p => p.key === key)[0];
                        return `Show ${declared ? declared.name : key}`;
                    }}
                    onParamChanged={onParamChanged}
                    onParamBlocked={onParamBlocked}
                    onCurveDragged={onCurveDragged}
                    onReady={onReady}
                    onError={error => console.error('Equilibria failed to mount:', error)}
                />
            </div>

            {!narrow ? (
                <Dock
                    instruments={instruments}
                    open={instrument}
                    onOpenChange={setInstrument}
                    context={dockContext}
                    focus={focus}
                />
            ) : null}
            </div>

            {/* Under the stage, spanning it, never moving — one home for words
              * that change. `onWhy` opens the maths instrument on the calc the
              * chain ended with; until P9 there was nothing to open, and the
              * strip hid the control rather than offer a dead one. */}
            {/* The default hint tells a student to drag a curve, which at the
              * start of a build-up is advice about a curve that has not been
              * drawn yet. What to do next is different before the lesson has
              * begun, so the strip is told which one applies. */}
            <NarrationStrip
                line={line}
                authored={saying}
                refusal={refusal}
                restHint={track.position === 0 && STEPS.length > 0
                    ? 'Step forward to begin the lesson.'
                    : undefined}
                onUndo={onUndo}
                onWhy={onWhy}
            />

            {/* Between the strip and the track, and only while a step is asking.
              * It is the one row on this screen that is not always there, which
              * is the price of not making the strip grow: a verdict is two
              * clauses and up to three controls, and the strip is one line that
              * sits directly under a stage measuring its own box. */}
            {attempt ? (
                <QuestionRow
                    prompt={sayAt(STEPS, track.position)}
                    attempt={attempt}
                    param={dockParams.filter(p => p.name === attempt.question.param)[0]}
                    onChange={value => updateParams([{ name: attempt.question.param, value }])}
                    onGestureStart={beginGesture}
                    onGestureEnd={endGesture}
                    onCommit={onCommit}
                    onRetry={onRetry}
                    onReveal={onReveal}
                    onContinue={() => goTo(track.position + 1)}
                />
            ) : null}

            {/* Under the strip, spanning the same width. Free exploration is
              * this track at its last position — everything revealed, the
              * scrubber still there — rather than a mode beside it.
              *
              * "Reset to this step" is withheld while an answer is frozen: it
              * writes through `engine.update` directly, so offering it there
              * would be a control that moves a curve the diagram is refusing to
              * let the student move. */}
            <Track
                steps={STEPS}
                state={track}
                onGoTo={goTo}
                onReset={frozenParam ? undefined : resetToStep}
            />

            {narrow ? (
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
        </Stack>
    );
}

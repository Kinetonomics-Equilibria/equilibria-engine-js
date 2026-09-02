import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActionIcon, Badge, Group, SegmentedControl, Stack, Text, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Stage } from 'equilibria-react';
import type { StageMode, StagePanel } from 'equilibria-react';
import { STEP_PARAM } from 'equilibria-engine-js';
import type { KineticGraph, ParamChangedEvent, ParamInfo } from 'equilibria-engine-js';
import { studyDiagram, EXPLAINED_CALCS, LESSON, NARRATED_CALCS, PANELS, SCENARIOS } from './studyDiagram';
import { NarrationStrip } from './NarrationStrip';
import { Track } from './Track';
import {
    AT_START, paramsAt, paramsBetween, revealedPanels, sayAt, trackReducer
} from './track/track';
import type { LessonStep, TrackState } from './track/track';
import { Dock } from './dock/Dock';
import { Explore } from './dock/Explore';
import { Maths } from './dock/Maths';
import { Scenarios } from './dock/Scenarios';
import type { Instrument, InstrumentProps } from './dock/types';
import { formatValue, narrate, undoParams, CALC_PRECISION } from './narration/narrate';
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

        // A promotion, a mode toggle and a panel resolving its own density all
        // arrive here as param changes. None of them is something the student
        // did to the market, and narrating one would both say something false
        // and throw away the chain describing what they actually did — the
        // event carries no `affected` for a presentation change, so the middle
        // clause would quietly vanish from a sentence that was already correct.
        if (!isNarrated(event.name)) return;

        // The arbitration, in one line and in the only place that knows both
        // sides: the student moved something themselves, so the lesson's
        // sentence gives way to what they just did.
        if (!applyingStep.current) setSaying(null);

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
    const onCurveDragged = useCallback((data: unknown) => {
        const isDragging = !!(data as { dragging: boolean }).dragging;
        if (isDragging === dragging.current) return;
        dragging.current = isDragging;
        retell(isDragging);
    }, [retell]);

    // The event only fires once something has changed, so the chips would sit
    // blank until the student moved something. This is the reading at rest.
    const onReady = useCallback((engine: KineticGraph) => {
        engineRef.current = engine;
        setReadout(engine.getCalcs() as Readout);
        setNarratedParams(engine.getParams()
            .filter(p => !p.presentation)
            .map(p => ({ name: p.name, label: p.label, precision: p.precision })));
        setDockParams(engine.getParams());
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

    const updateParams = useCallback((next: { name: string; value: number }[]) => {
        if (next.length > 0) engineRef.current?.update({ params: next });
    }, []);

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

    const goTo = useCallback((position: number) => {
        const next = trackReducer(track, { type: 'goTo', position }, STEPS);
        if (next === track) return;

        const backwards = next.position < track.position;
        applyStep(paramsBetween(STEPS, track.position, next.position), next.position, backwards);

        // The step param is presentation, so its own change is not narrated and
        // the chain would otherwise still be describing the move we just
        // re-based away from. Recomputed rather than blanked: it reads the
        // engine, which now agrees with itself, and comes back as rest.
        if (backwards) retell(false);

        setTrack(next);
        setSaying(sayAt(STEPS, next.position));
    }, [track, applyStep, retell]);

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
                restHint={track.position === 0 && STEPS.length > 0
                    ? 'Step forward to begin the lesson.'
                    : undefined}
                onUndo={onUndo}
                onWhy={onWhy}
            />

            {/* Under the strip, spanning the same width. Free exploration is
              * this track at its last position — everything revealed, the
              * scrubber still there — rather than a mode beside it. */}
            <Track steps={STEPS} state={track} onGoTo={goTo} onReset={resetToStep} />

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

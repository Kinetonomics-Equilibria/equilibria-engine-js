import { useCallback, useMemo, useRef, useState } from 'react';
import { Badge, Group, SegmentedControl, Stack, Text, Title } from '@mantine/core';
import { Stage } from 'equilibria-react';
import type { StageMode, StagePanel } from 'equilibria-react';
import type { KineticGraph, ParamChangedEvent } from 'equilibria-engine-js';
import { studyDiagram, NARRATED_CALCS, PANELS } from './studyDiagram';
import { NarrationStrip } from './NarrationStrip';
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

export function StudyScreen() {
    const [focused, setFocused] = useState<string>(PANELS[0].key);
    const [mode, setMode] = useState<StageMode>('focus');
    const [readout, setReadout] = useState<Readout>({});
    const [line, setLine] = useState<NarrationLine>(REST);

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

        // A promotion, a mode toggle and a panel resolving its own density all
        // arrive here as param changes. None of them is something the student
        // did to the market, and narrating one would both say something false
        // and throw away the chain describing what they actually did — the
        // event carries no `affected` for a presentation change, so the middle
        // clause would quietly vanish from a sentence that was already correct.
        if (!isNarrated(event.name)) return;

        latest.current = event;
        retell(dragging.current);
    }, [isNarrated, retell]);

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

    return (
        <Stack gap="sm" className={classes.screen}>
            <Group justify="space-between" align="flex-end" wrap="nowrap">
                <div>
                    <Title order={2} size="h4">A market, and what it does to everything else</Title>
                    <Text c="dimmed" size="sm">
                        Drag the demand curve. The panels on the right are the same market
                        seen three ways — click one to bring it forward.
                    </Text>
                </div>
                <SegmentedControl
                    size="xs"
                    value={mode}
                    onChange={value => setMode(value as StageMode)}
                    data={[{ label: 'Focus', value: 'focus' }, { label: 'Grid', value: 'grid' }]}
                    aria-label="Panel arrangement"
                />
            </Group>

            {/* The stage measures the element it renders, so it needs a height
              * to measure. `flex: 1` on a column that has one is what gives it
              * one; a stage sized by its own content would be measuring its own
              * output. */}
            <div className={classes.stageBox}>
                <Stage
                    config={config}
                    focused={focused}
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

            {/* Under the stage, spanning it, never moving — one home for words
              * that change. No `onWhy`: the affordance's destination is the
              * maths instrument (P9), and a "why?" that opens nothing is worse
              * than none. */}
            <NarrationStrip line={line} onUndo={onUndo} />
        </Stack>
    );
}

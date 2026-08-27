import { useCallback, useMemo, useState } from 'react';
import { Badge, Group, SegmentedControl, Stack, Text, Title } from '@mantine/core';
import { Stage } from 'equilibria-react';
import type { StageMode, StagePanel } from 'equilibria-react';
import { studyDiagram, PANELS } from './studyDiagram';
import classes from './StudyScreen.module.css';

/**
 * The study screen: one diagram, several panels, one of them driving.
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
 */

/** Live calc values, refreshed by the engine's `kg:param_changed`. */
type Readout = Record<string, number>;

const format = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

export function StudyScreen() {
    const [focused, setFocused] = useState<string>(PANELS[0].key);
    const [mode, setMode] = useState<StageMode>('focus');
    const [readout, setReadout] = useState<Readout>({});

    // Memoised because `useEquilibria` remounts when the config's identity
    // changes, and rebuilding the diagram on every keystroke elsewhere in the
    // app would undo everything P7 does to avoid a remount.
    const config = useMemo(() => studyDiagram, []);

    const onParamChanged = useCallback((data: unknown) => {
        setReadout((data as { calcs: Readout }).calcs);
    }, []);

    // The event only fires once something has changed, so the chips would sit
    // blank until the student moved something. This is the reading at rest.
    const onReady = useCallback((engine: { getCalcs: () => Readout }) => {
        setReadout(engine.getCalcs());
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
                    <Group gap={6} wrap="nowrap">
                        <Text component="span" className={classes.headline}>
                            {declared.unit}{format(level)}
                        </Text>
                        {/* Shown only once something has moved. At rest a chip
                          * that says "+0.0" is noise pretending to be news. */}
                        {typeof delta === 'number' && Math.abs(delta) >= 0.05 ? (
                            <Badge
                                size="sm"
                                variant="light"
                                color={delta > 0 ? 'teal' : 'red'}
                            >
                                {delta > 0 ? '+' : '−'}{format(Math.abs(delta))}
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
                    onReady={onReady}
                    onError={error => console.error('Equilibria failed to mount:', error)}
                />
            </div>
        </Stack>
    );
}

import { Slider, Stack, Switch, Text } from '@mantine/core';
import type { ParamInfo } from 'equilibria-engine-js';
import type { InstrumentProps } from './types';
import classes from './Explore.module.css';

/**
 * A control for every param the student is allowed to move.
 *
 * Nothing here decides how a param should be displayed. `label`, `min`, `max`,
 * `round` and `precision` all come from the engine, because the diagram is
 * already showing the same numbers and two answers to "how many decimals is
 * this worth" is one too many.
 *
 * Presentation params are filtered out for the same reason the narration strip
 * ignores them: which panel is focal is something the *screen* does, and a
 * slider for it in among the economics would invite a student to think it was
 * part of the model.
 */

function label(p: ParamInfo) {
    return p.label || p.name;
}

function Control({ param, onChange, onCommitStart, onCommitEnd }: {
    param: ParamInfo;
    onChange(value: number): void;
    onCommitStart(): void;
    onCommitEnd(): void;
}) {
    if (param.isBoolean) {
        // A boolean reaches the app as 0 or 1 with numeric bounds — `min: 0,
        // max: 100` in the engine's own coercion — so without `isBoolean` this
        // would be a hundred-step slider for a thing with two states. There is
        // no gesture to bracket: a switch commits once.
        return (
            <Switch
                label={label(param)}
                checked={param.value >= 0.5}
                onChange={event => onChange(event.currentTarget.checked ? 1 : 0)}
            />
        );
    }

    return (
        <div>
            <div className={classes.head}>
                <Text component="span" size="sm">{label(param)}</Text>
                <Text component="span" size="sm" className={classes.value}>
                    {param.value.toFixed(param.precision)}
                </Text>
            </div>
            <Slider
                value={param.value}
                min={param.min}
                max={param.max}
                step={param.round}
                precision={param.precision}
                label={value => value.toFixed(param.precision)}
                onChange={onChange}
                // The two halves of a scrub. `onChangeEnd` fires once when the
                // student lets go; there is no matching "start", so the first
                // move opens the gesture and the screen closes it. Without this
                // pair the engine snapshots every frame — leaving each ghost
                // drawn against the previous frame rather than against where the
                // drag began — and the narration strip, which learns about
                // dragging only from `kg:curve_dragged`, rewrites its chain and
                // announces it sixty times a second.
                onMouseDown={onCommitStart}
                onTouchStart={onCommitStart}
                onKeyDown={onCommitStart}
                onChangeEnd={onCommitEnd}
                // `thumbLabel`, not `aria-label`: the element carrying
                // `role="slider"` is the thumb, and a label on the root leaves
                // the control itself nameless to a screen reader.
                thumbLabel={label(param)}
                thumbValueText={value => value.toFixed(param.precision)}
            />
        </div>
    );
}

export function Explore({ params, updateParams, beginGesture, endGesture }: InstrumentProps) {
    const shown = params.filter(p => !p.presentation);

    if (shown.length === 0) {
        return <Text size="sm" c="dimmed">This diagram has nothing to move.</Text>;
    }

    return (
        <Stack gap="md">
            {shown.map(p => (
                <Control
                    key={p.name}
                    param={p}
                    onChange={value => updateParams([{ name: p.name, value }])}
                    onCommitStart={beginGesture}
                    onCommitEnd={endGesture}
                />
            ))}
        </Stack>
    );
}

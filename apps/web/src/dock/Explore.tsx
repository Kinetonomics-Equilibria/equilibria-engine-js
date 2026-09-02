import { Stack, Switch, Text } from '@mantine/core';
import type { ParamInfo } from 'equilibria-engine-js';
import { ParamSlider } from '../ParamSlider';
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
            {/* The two halves of a scrub, and their *ordering*, live in
              * `ParamSlider`: `beginGesture` has to run before the value moves
              * or the engine snapshots the state it was supposed to remember.
              * This instrument shipped with them the wrong way round for the
              * keyboard, which is exactly the kind of thing one place can be
              * right about and two cannot. */}
            <ParamSlider
                param={param}
                label={label(param)}
                onChange={onChange}
                beginGesture={onCommitStart}
                endGesture={onCommitEnd}
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

import { useId } from 'react';
import { Text, UnstyledButton } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import type { InstrumentProps } from './types';
import classes from './Scenarios.module.css';

/**
 * Named param sets, applied in one go.
 *
 * The interesting decision is that applying one is *instant*. An animation of
 * two curves moving at once is pretty and teaches less than a sentence naming
 * what shifted — and the sentence already exists, in "What changed", generated
 * from the same change. So a scenario is a jump, and the narration explains it.
 *
 * Applying is a single `updateParams` call rather than one per param, which
 * matters for a reason the engine does not advertise: restrictions are
 * validated per param, so a scenario whose destination is legal can still be
 * refused halfway through if an intermediate state is not — and the rollback is
 * silent. One call at least keeps the ordering in one place, where it can be
 * reasoned about. The study diagram declares no restrictions, so nothing here
 * can trip today; a diagram that declares them will need the batched update the
 * engine still owes.
 */

export interface Scenario {
    id: string;
    label: string;
    description?: string;
    params: Record<string, number>;
}

export interface ScenariosProps extends InstrumentProps {
    scenarios: Scenario[];
}

/**
 * One scenario: its name, and the reasoning that makes it a scenario, on one
 * surface that is the whole button.
 *
 * Named by its name alone, so it is "Iron ore prices soar, button" to a screen
 * reader, with the reasoning read after as its description — the same order the
 * eye takes.
 */
function Row({ scenario, unknown, onApply }: { scenario: Scenario; unknown: string[]; onApply(): void }) {
    const describedId = useId();
    const broken = unknown.length > 0;
    const described = broken || !!scenario.description;

    return (
        <UnstyledButton
            className={classes.row}
            disabled={broken}
            aria-label={scenario.label}
            aria-describedby={described ? describedId : undefined}
            onClick={onApply}
        >
            <span className={classes.text}>
                <Text component="span" size="sm" className={classes.label}>{scenario.label}</Text>
                {/* A scenario naming a param the diagram does not have is an
                  * authoring mistake that would otherwise apply silently and
                  * half-work. Named here rather than thrown, because a broken
                  * scenario should not take the screen down with it. */}
                {broken ? (
                    <Text component="span" size="xs" c="red" id={describedId}>
                        Unknown {unknown.length === 1 ? 'param' : 'params'}: {unknown.join(', ')}
                    </Text>
                ) : scenario.description ? (
                    <Text component="span" size="xs" className={classes.description} id={describedId}>
                        {scenario.description}
                    </Text>
                ) : null}
            </span>
            <IconArrowRight size={16} stroke={1.75} className={classes.go} aria-hidden="true" />
        </UnstyledButton>
    );
}

export function Scenarios({ scenarios, params, updateParams, snapshot }: ScenariosProps) {
    const known = new Set(params.map(p => p.name));

    if (scenarios.length === 0) {
        return <Text size="sm" c="dimmed">This diagram declares no scenarios.</Text>;
    }

    return (
        <div className={classes.list}>
            {scenarios.map(s => (
                <Row
                    key={s.id}
                    scenario={s}
                    unknown={Object.keys(s.params).filter(name => !known.has(name))}
                    onApply={() => {
                        // Before the change, not after: this marks where the
                        // diagram is *now* as the state its ghosts and the
                        // sentence beside it should both call "before". A
                        // scenario is invisible to the engine — it arrives as
                        // ordinary param updates — so nothing else declares the
                        // boundary.
                        snapshot();
                        updateParams(Object.keys(s.params).map(name => ({ name, value: s.params[name] })));
                    }}
                />
            ))}
        </div>
    );
}

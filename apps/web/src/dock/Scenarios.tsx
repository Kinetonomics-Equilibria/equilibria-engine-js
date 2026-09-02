import { Button, Stack, Text } from '@mantine/core';
import type { InstrumentProps } from './types';

/**
 * Named param sets, applied in one go.
 *
 * The interesting decision is that applying one is *instant*. An animation of
 * two curves moving at once is pretty and teaches less than a sentence naming
 * what shifted — and the sentence already exists, under the stage, generated
 * from the same change. So a scenario is a jump, and the narration strip
 * explains it.
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

export function Scenarios({ scenarios, params, updateParams, snapshot }: ScenariosProps) {
    const known = new Set(params.map(p => p.name));

    if (scenarios.length === 0) {
        return <Text size="sm" c="dimmed">This diagram declares no scenarios.</Text>;
    }

    return (
        <Stack gap="sm">
            {scenarios.map(s => {
                // A scenario naming a param the diagram does not have is an
                // authoring mistake that would otherwise apply silently and
                // half-work. Named here rather than thrown, because a broken
                // scenario should not take the screen down with it.
                const unknown = Object.keys(s.params).filter(name => !known.has(name));

                return (
                    <div key={s.id}>
                        <Button
                            variant="default"
                            size="sm"
                            fullWidth
                            disabled={unknown.length > 0}
                            onClick={() => {
                                // Before the change, not after: this marks where
                                // the diagram is *now* as the state its ghosts
                                // and the sentence under it should both call
                                // "before". A scenario is invisible to the
                                // engine — it arrives as ordinary param updates
                                // — so nothing else declares the boundary.
                                snapshot();
                                updateParams(
                                    Object.keys(s.params).map(name => ({ name, value: s.params[name] }))
                                );
                            }}
                        >
                            {s.label}
                        </Button>
                        {s.description && unknown.length === 0 ? (
                            <Text size="xs" c="dimmed" mt={4}>{s.description}</Text>
                        ) : null}
                        {unknown.length > 0 ? (
                            <Text size="xs" c="red" mt={4}>
                                Unknown {unknown.length === 1 ? 'param' : 'params'}: {unknown.join(', ')}
                            </Text>
                        ) : null}
                    </div>
                );
            })}
        </Stack>
    );
}

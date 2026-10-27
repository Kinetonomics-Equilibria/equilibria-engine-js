import { useId } from 'react';
import type { MouseEvent, ReactNode } from 'react';
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

export interface ActionRowProps {
    label: string;
    /** Why, under the name: a scenario's reasoning. */
    description?: string;
    /** Params it names that the diagram does not have; the row is disabled and says so. */
    unknown?: string[];
    /** Nothing a press would change, so it is greyed: not hidden, so nothing under it moves. */
    disabled?: boolean;
    /**
     * Where a press goes, for a row that opens a page: a real address, so it
     * can be opened in a tab of its own, while a plain press stays in the app.
     */
    href?: string;
    /** A glyph before the name, for a row that is a place: the one the rail draws for it. */
    icon?: ReactNode;
    onPress(): void;
}

/**
 * The action row: a name, the reasoning that makes it worth pressing under
 * it, and an arrow, on one surface that is the whole button — a scenario, a
 * story's move, a way to another page.
 *
 * Named by its name alone, so it is "Iron ore prices soar, button" to a screen
 * reader, with the reasoning read after as its description — the same order the
 * eye takes.
 */
export function ActionRow({ label, description, unknown = [], disabled, href, icon, onPress }: ActionRowProps) {
    const describedId = useId();
    const broken = unknown.length > 0;
    const described = broken || !!description;

    const words = (
        <>
            {icon ? <span className={classes.icon} aria-hidden="true">{icon}</span> : null}
            <span className={classes.text}>
                <Text component="span" size="sm" className={classes.label}>{label}</Text>
                {/* A scenario naming a param the diagram does not have is an
                  * authoring mistake that would otherwise apply silently and
                  * half-work. Named here rather than thrown, because a broken
                  * scenario should not take the screen down with it. */}
                {broken ? (
                    <Text component="span" size="xs" c="red" id={describedId}>
                        Unknown {unknown.length === 1 ? 'param' : 'params'}: {unknown.join(', ')}
                    </Text>
                ) : description ? (
                    <Text component="span" size="xs" className={classes.description} id={describedId}>
                        {description}
                    </Text>
                ) : null}
            </span>
        </>
    );
    const arrow = <IconArrowRight size={16} stroke={1.75} className={classes.go} aria-hidden="true" />;

    if (href) {
        return (
            <UnstyledButton
                component="a"
                href={href}
                className={classes.row}
                aria-label={label}
                aria-describedby={described ? describedId : undefined}
                onClick={(event: MouseEvent<HTMLAnchorElement>) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                    event.preventDefault();
                    onPress();
                }}
            >
                {words}
                {arrow}
            </UnstyledButton>
        );
    }

    return (
        <UnstyledButton
            className={classes.row}
            disabled={broken || disabled}
            aria-label={label}
            aria-describedby={described ? describedId : undefined}
            onClick={onPress}
        >
            {words}
            {arrow}
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
                <ActionRow
                    key={s.id}
                    label={s.label}
                    description={s.description}
                    unknown={Object.keys(s.params).filter(name => !known.has(name))}
                    onPress={() => {
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

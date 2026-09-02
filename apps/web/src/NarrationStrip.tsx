import { Anchor, Button, Group, Text } from '@mantine/core';
import type { NarrationLine } from './narration/narrate';
import { toSentence } from './narration/narrate';
import classes from './NarrationStrip.module.css';

/**
 * One generated line under the stage, always in the same place.
 *
 * The answer to "what did I just do, and what does it mean?" — which is the
 * question the whole product exists to serve. It is fixed in place because
 * dynamic values and changing explanations need *one* home: words that appear
 * sometimes on the chart, sometimes in a sidebar and sometimes in a toast cost
 * a student the attention they should be spending reading them.
 *
 * Nothing here decides what to say. `narrate()` produces the chain and this
 * renders it, which is why the phrasing can be argued about, translated or
 * reviewed by someone who teaches economics without touching a component.
 */

export interface NarrationStripProps {
    line: NarrationLine;

    /**
     * A sentence the lesson wrote, shown instead of the generated chain (P10).
     *
     * The arbitration is not here. This component renders what it is handed, and
     * the rule — the student's own action always wins, and a step's sentence
     * persists until they act — lives in the screen, which is the only thing
     * that knows both what the author said and what the student just did.
     */
    authored?: string | null;

    /**
     * What the strip says when nothing has moved yet.
     *
     * Passed rather than fixed because "what to do next" is not always "drag a
     * curve": at the start of a build-up there is no curve to drag. Undefined
     * takes the default, so a host with nothing to add says nothing.
     */
    restHint?: string;

    /**
     * Put the diagram back where it was before this interaction.
     *
     * The control appears only when there is something to undo. Undo is scoped
     * to params, deliberately and visibly: it moves the numbers back and does
     * not restore which panel was focal, a lesson step, or a quiz attempt.
     */
    onUndo?: () => void;

    /**
     * Open the maths explainer on the calc named in `line.whyTarget` (P9).
     *
     * Optional, and the control is absent without it — a "why?" that goes
     * nowhere is worse than no "why?" at all. The strip's job is to name the
     * calc; the explainer that receives it is the instrument dock's.
     */
    onWhy?: (calc: string) => void;
}

/** `a 20.0 → 24.0`, or just `a 22.4` while the drag is still in flight. */
function Reading({ label, unit, from, to, direction }: NarrationLine['causes'][number]) {
    return (
        <span className={classes.reading}>
            <span className={classes.label}>{label}</span>
            {from !== undefined ? (
                <>
                    <span className={classes.was}>{unit}{from}</span>
                    <span className={classes.arrow} data-direction={direction}>→</span>
                </>
            ) : null}
            <span className={classes.now}>{unit}{to}</span>
        </span>
    );
}

export function NarrationStrip({
    line,
    authored,
    restHint = 'Drag a curve to see what it changes.',
    onUndo,
    onWhy
}: NarrationStripProps) {

    const settled = line.kind === 'settled';
    const chain = toSentence(line);

    /**
     * Both, for a screen reader, where the eye gets only one.
     *
     * A sighted student reads the author's sentence and *watches* the diagram
     * move; there is nothing to watch if you cannot see it, so the numbers are
     * the only account of what the step did. Replacing the chain on screen and
     * appending it here is not an inconsistency — it is the same information
     * reaching two senses that need different amounts of it.
     */
    const sentence = authored
        ? (chain ? authored + ' ' + chain : authored)
        : chain;

    return (
        <div className={classes.strip} data-kind={line.kind} data-authored={authored ? 'true' : undefined}>
            {/* Read as elements the chain is a dozen fragments and a student
              * hears rubble, so the chips are hidden from assistive technology
              * and the same content is announced once, as one sentence, from the
              * live region below. Both are always in the DOM and in the same
              * place, so neither is a second source of truth. */}
            <div className={classes.chain} aria-hidden="true">
                {/* A step's sentence displaces the chain rather than joining it.
                  * The strip is one line and must not grow — it sits above the
                  * stage's own measured box — and the chain comes back the
                  * moment the student touches anything, which is the whole rule. */}
                {authored ? (
                    <Text component="span" size="sm" className={classes.authored}>{authored}</Text>
                ) : line.kind === 'rest' ? (
                    <Text component="span" size="sm" c="dimmed">{restHint}</Text>
                ) : (
                    <>
                        {line.causes.map(c => <Reading key={c.name} {...c} />)}
                        {line.mechanism ? (
                            <span className={classes.mechanism}>{line.mechanism}</span>
                        ) : null}
                        {line.effects.map(c => <Reading key={c.name} {...c} />)}
                    </>
                )}
            </div>

            <Group gap="xs" wrap="nowrap" className={classes.controls}>
                {settled && onWhy && line.whyTarget ? (
                    <Anchor
                        component="button"
                        type="button"
                        size="sm"
                        onClick={() => onWhy(line.whyTarget!)}
                    >
                        why?
                    </Anchor>
                ) : null}
                {settled && onUndo ? (
                    <Button size="compact-xs" variant="default" onClick={onUndo}>undo</Button>
                ) : null}
            </Group>

            {/* Polite, atomic, and only ever written on a settled interaction —
              * a live region fed during a drag reads a hundred fragments at a
              * student who asked for one. */}
            <p className={classes.announcement} role="status" aria-live="polite" aria-atomic="true">
                {sentence}
            </p>
        </div>
    );
}

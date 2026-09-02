import { useEffect, useRef } from 'react';
import { Badge, Button, Group, Text } from '@mantine/core';
import type { ParamInfo } from 'equilibria-engine-js';
import { ParamSlider } from './ParamSlider';
import type { Attempt } from './quiz/attempt';
import { isFrozen, isResolved } from './quiz/attempt';
import { verdictFor } from './quiz/verdict';
import classes from './QuestionRow.module.css';

/**
 * The question, under the strip: prompt, answer, verdict.
 *
 * It is a row of its own rather than part of the narration strip, and that is a
 * correction to the plan rather than a preference. P10's arbitration rule is
 * that the student's own action always wins the strip — so the instant they
 * drag to answer, the strip clears the step's sentence and the question
 * disappears from the screen while they are answering it. The prompt lives
 * here; the strip goes on doing its job, which during an attempt is narrating
 * the attempt.
 *
 * Nothing here grades anything. It renders an attempt and reports what the
 * student wants to do, for the same reason `NarrationStrip` renders a line and
 * decides nothing: the marking is a pure function that should be arguable
 * without a browser.
 */

export interface QuestionRowProps {
    /** The step's own sentence. One prompt per step, written one way. */
    prompt: string | null;
    attempt: Attempt;

    /** The asked param as the engine declares it — bounds, step, precision. */
    param: ParamInfo | undefined;

    /** Move the param. The same call the dock's sliders make. */
    onChange(value: number): void;
    onGestureStart(): void;
    onGestureEnd(): void;

    onCommit(): void;
    onRetry(): void;
    onReveal(): void;

    /**
     * Move the lesson on, once the question is finished.
     *
     * The track's forward arrow does the same thing, and that repetition is
     * deliberate rather than an oversight. Committing an answer takes the
     * control the student was using out of the tab order, and a row that
     * offered nothing in its place would drop focus to the top of the document
     * — so there has to be something here to receive it, and "what happens
     * next" is the honest thing for it to be.
     */
    onContinue(): void;
}

export function QuestionRow({
    prompt, attempt, param, onChange, onGestureStart, onGestureEnd,
    onCommit, onRetry, onReveal, onContinue
}: QuestionRowProps) {

    const frozen = isFrozen(attempt);
    const verdict = attempt.grade && param && attempt.committedValue !== undefined
        ? verdictFor(attempt.question, attempt.grade, attempt.committedValue, param)
        : null;

    /**
     * Where focus goes when the answer is taken.
     *
     * Not stolen mid-attempt — nothing here touches focus until the student
     * commits. But *at* the commit the control they were standing on stops
     * working and leaves the tab order, and focus falls to the document body:
     * a student answering by keyboard is put back at the top of the page for
     * having answered. So it moves one step, to the first control that replaced
     * it, and no further.
     */
    const controls = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (attempt.phase !== 'verdict' && attempt.phase !== 'reveal') return;
        const row = controls.current;
        if (!row || row.contains(document.activeElement)) return;
        (row.querySelector('button') as HTMLButtonElement | null)?.focus();
    }, [attempt.phase]);

    return (
        <section
            className={classes.row}
            // A group rather than a region: it is a set of controls that belong
            // together, and it comes and goes with the step rather than being a
            // landmark of the page.
            role="group"
            aria-label="Question"
            data-phase={attempt.phase}
        >
            <Text component="p" size="sm" className={classes.prompt}>
                {prompt || 'Move the diagram to answer, then check.'}
            </Text>

            <div className={classes.answer}>
                {param ? (
                    <div className={classes.control}>
                        {/* Arrow keys adjust and Enter commits, so a whole
                          * answer can be given without leaving the control. It
                          * is not a lesser path: it writes the very param the
                          * drag writes, so the two answers are the same answer
                          * by construction rather than by agreement. */}
                        <ParamSlider
                            param={param}
                            label="Your answer"
                            disabled={frozen}
                            onChange={onChange}
                            beginGesture={onGestureStart}
                            endGesture={onGestureEnd}
                            onEnter={onCommit}
                        />
                        <Text component="span" size="sm" className={classes.value}>
                            {param.value.toFixed(param.precision)}
                        </Text>
                    </div>
                ) : (
                    <Text size="sm" c="dimmed" className={classes.control}>
                        This question is about a value the diagram does not offer.
                    </Text>
                )}

                {!frozen ? (
                    <Button size="compact-sm" onClick={onCommit}>Check</Button>
                ) : null}
            </div>

            {/* Always in the DOM, so the announcement lands in a region the
              * screen reader was already watching, and so the row does not
              * change height at the moment the student is reading it.
              *
              * `aria-atomic` because a verdict is one thought in two clauses:
              * read a clause at a time it becomes "Right direction. Not far
              * enough", with a pause in the middle that reads as two verdicts. */}
            <div className={classes.verdict} role="status" aria-live="polite" aria-atomic="true">
                {verdict ? (
                    <Group gap="xs" wrap="wrap" align="baseline">
                        <Badge
                            size="sm"
                            variant="light"
                            color={verdict.tone === 'right' ? 'teal'
                                : verdict.tone === 'partly' ? 'yellow' : 'gray'}
                        >
                            {verdict.headline}
                        </Badge>
                        <Text component="span" size="sm">{verdict.direction}</Text>
                        {verdict.magnitude ? (
                            <Text component="span" size="sm">{verdict.magnitude}</Text>
                        ) : null}

                        <Group gap="xs" wrap="nowrap" ref={controls}>
                            {attempt.phase === 'verdict' && !attempt.grade!.correct ? (
                                <>
                                    <Button size="compact-xs" variant="default" onClick={onRetry}>
                                        Try again
                                    </Button>
                                    {/* Unlimited retries measure persistence
                                      * rather than recall, which is the better
                                      * thing to measure — but only if nobody
                                      * can be stuck. */}
                                    <Button size="compact-xs" variant="subtle" onClick={onReveal}>
                                        Show me
                                    </Button>
                                </>
                            ) : null}
                            {isResolved(attempt) ? (
                                <Button size="compact-xs" onClick={onContinue}>Continue</Button>
                            ) : null}
                        </Group>
                    </Group>
                ) : null}
            </div>
        </section>
    );
}

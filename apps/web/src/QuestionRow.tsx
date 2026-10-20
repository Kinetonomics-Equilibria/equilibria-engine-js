import { useEffect, useRef } from 'react';
import { Badge, Button, Group, Text } from '@mantine/core';
import type { ParamInfo } from 'equilibria-engine-js';
import { ParamControl } from './ParamControl';
import type { Attempt } from './quiz/attempt';
import { isFrozen, isResolved } from './quiz/attempt';
import { candidatesOf } from './quiz/grade';
import { verdictFor } from './quiz/verdict';
import type { DirectionWords } from './quiz/verdict';
import classes from './QuestionRow.module.css';

/**
 * The question, on the lesson card: answer, verdict, and why.
 *
 * Under the step's own words, which are the prompt — the card shows them for
 * every step, and a question is a step. It used to be a row of its own under
 * the stage, because the prompt could not live in the narration strip: the
 * student's own action wins the strip, so the question would have vanished the
 * moment they moved something to answer it. The card has no such rule, so the
 * question sits with the rest of the lesson, and the stage no longer changes
 * shape when one arrives.
 *
 * Nothing here grades anything. It renders an attempt and reports what the
 * student wants to do, for the same reason `NarrationStrip` renders a line and
 * decides nothing: the marking is a pure function that should be arguable
 * without a browser.
 */

export interface QuestionRowProps {
    /**
     * The question, in words, when nothing above already says it.
     *
     * On the lesson card the step's own words are the prompt and are shown
     * above this, so the card passes nothing. One prompt per step, written once.
     */
    prompt?: string | null;
    attempt: Attempt;

    /**
     * The params the question offers, as the engine declares them — bounds,
     * step, precision, label — in the question's own order (P14).
     *
     * One, for a question that names its curve; several, for one that asks
     * which curve moves. The asked param is among them, and nothing here says
     * which: the order is the author's and the same for every question offering
     * the same choice.
     */
    params: ParamInfo[];

    /**
     * Which way a rise and a fall in the asked param read, when "up" and "down"
     * would not describe what the student did — a curve dragged sideways.
     */
    directionWords?: DirectionWords;

    /** The colour of each param's curve, where the lesson names one. As Explore's. */
    colors?: Record<string, string>;

    /** Move a param. The same call the dock's sliders make. */
    onChange(name: string, value: number): void;
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
    prompt, attempt, params, directionWords, colors = {}, onChange, onGestureStart, onGestureEnd,
    onCommit, onRetry, onReveal, onContinue
}: QuestionRowProps) {

    const frozen = isFrozen(attempt);
    const asked = params.filter(p => p.name === attempt.question.param)[0];
    const choice = candidatesOf(attempt.question).length > 1;
    const verdict = attempt.grade && asked && attempt.committedValue !== undefined
        ? verdictFor(attempt.question, attempt.grade, attempt.committedValue, asked, directionWords, params)
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
     *
     * It is scrolled to by hand. The verdict can take the card past its
     * height, and Chrome's `focus()` scrolls nothing for a button a pixel past
     * the edge of the card's body, which leaves its ring, drawn outside it, cut
     * off there. `scrollIntoView` scrolls, and keeps the margin the CSS asks for.
     */
    const controls = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (attempt.phase !== 'verdict' && attempt.phase !== 'reveal') return;
        const row = controls.current;
        if (!row || row.contains(document.activeElement)) return;
        const first = row.querySelector('button') as HTMLButtonElement | null;
        if (!first) return;
        first.focus({ preventScroll: true });
        // Optional because jsdom has no layout to scroll.
        first.scrollIntoView?.({ block: 'nearest' });
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
            {prompt ? (
                <Text component="p" size="sm" className={classes.prompt}>{prompt}</Text>
            ) : null}

            <div className={classes.answer}>
                {/* The control the Explore instrument and a step's try-it hand
                  * out, so answering is moving something the student has moved
                  * before.
                  *
                  * A choice of curve names each slider by its curve, and draws
                  * it in the curve's colour: the name is what a screen reader
                  * hears, and the colour is how a sighted student matches the
                  * slider to the line. One slider is the student's answer, and
                  * is called that.
                  *
                  * Arrow keys adjust and Enter commits, so a whole answer can
                  * be given without leaving the control. It is not a lesser
                  * path: it writes the very param the drag writes, so the two
                  * answers are the same answer by construction rather than by
                  * agreement — and with a choice of curve, choosing a slider is
                  * choosing the curve, as grabbing one is. */}
                {asked ? params.map(param => (
                    <ParamControl
                        key={param.name}
                        param={param}
                        label={choice ? param.label : 'Your answer'}
                        disabled={frozen}
                        color={colors[param.name]}
                        onChange={value => onChange(param.name, value)}
                        beginGesture={onGestureStart}
                        endGesture={onGestureEnd}
                        onEnter={onCommit}
                    />
                )) : (
                    <Text size="sm" c="dimmed">
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
                    <div className={classes.verdictBody}>
                        <Badge
                            size="sm"
                            variant="light"
                            color={verdict.tone === 'right' ? 'teal'
                                : verdict.tone === 'partly' ? 'yellow' : 'gray'}
                        >
                            {verdict.headline}
                        </Badge>
                        {/* Which curve, then which way, then how far: the order
                          * the reasoning goes in, as one paragraph. */}
                        <Text component="p" size="sm" className={classes.sentences}>
                            {[verdict.curve, verdict.direction, verdict.magnitude]
                                .filter(Boolean).join(' ')}
                        </Text>

                        {/* The economics, once the question is finished and not
                          * before: after a wrong answer it would be the answer
                          * to the retry. */}
                        {isResolved(attempt) && attempt.question.explain ? (
                            <div className={classes.explain}>
                                <span className={classes.explainLabel}>Why</span>
                                <Text component="p" size="sm" className={classes.explainText}>
                                    {attempt.question.explain}
                                </Text>
                            </div>
                        ) : null}

                        <Group gap="xs" wrap="nowrap" ref={controls}>
                            {attempt.phase === 'verdict' && !attempt.grade!.correct ? (
                                <>
                                    <Button size="compact-sm" variant="default" onClick={onRetry}>
                                        Try again
                                    </Button>
                                    {/* Unlimited retries measure persistence
                                      * rather than recall, which is the better
                                      * thing to measure — but only if nobody
                                      * can be stuck. */}
                                    <Button size="compact-sm" variant="subtle" onClick={onReveal}>
                                        Show me
                                    </Button>
                                </>
                            ) : null}
                            {isResolved(attempt) ? (
                                <Button size="compact-sm" onClick={onContinue}>Continue</Button>
                            ) : null}
                        </Group>
                    </div>
                ) : null}
            </div>
        </section>
    );
}

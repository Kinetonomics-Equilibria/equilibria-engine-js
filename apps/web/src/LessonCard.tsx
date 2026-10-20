import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { ActionIcon, Anchor, Button, Text, Title } from '@mantine/core';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { isBlocked, maxPosition, paramsAt, partAt, partsOf, stepKinds } from './track/track';
import type { LessonStep, TrackState } from './track/track';
import classes from './LessonCard.module.css';

/**
 * The lesson, as something to read: where the student is, what this step says,
 * and the way on.
 *
 * It sits beside the diagram, at the top of the dock's column, because that is
 * where there is room to say something properly. The lesson used to speak
 * through the strip under the stage, which is one line that must never grow: a
 * strip that grew would shrink the diagram under the student's pointer. So
 * every step had to fit in about 110 characters, came out clipped, and gave way
 * to anything the student did, a curve hitting the end of its range included.
 * The column's width is fixed and its height is its own, so here a step can
 * take two short paragraphs and a key term without moving the diagram at all,
 * and nothing the student does takes it off the screen.
 *
 * The lesson is chunked twice. Each step is one idea, and the steps are grouped
 * into a few named parts, so fourteen steps read as three short runs. The
 * progress bar draws the parts as groups and the label above it names the one
 * the student is in; the count beside Next is within that part.
 *
 * Every marker is a real `<button>`, so focus order, Enter, Space and the role
 * come free. Back and Next are the way through; the markers are for jumping, a
 * second way to the same places, which is why they can afford to be small.
 *
 * Nothing here decides where the lesson goes. It renders a position and reports
 * where the student wants to go; the screen owns the move, because the move is
 * where the snapshot and the param update have to happen in the right order.
 */

export interface LessonCardProps {
    steps: LessonStep[];
    state: TrackState;

    /** What the lesson is for, shown before the first step. */
    goals: string[];

    /** Where the student wants to go. Clamping and blocking are the reducer's. */
    onGoTo(position: number): void;

    /**
     * Put the params back where this step established them.
     *
     * The escape hatch the scrub-back rule requires: going back un-draws and
     * deliberately leaves the student's own values alone, so restoring the
     * authored state has to be something they choose. Absent when no step up to
     * here set anything.
     */
    onReset?(): void;

    /** The question, at a step that asks one: rendered under the step's words. */
    children?: ReactNode;

    /** Where the card sits and how tall it may be: the screen's call, not the card's. */
    className?: string;

    /**
     * Whether the step's words are folded away, leaving where the student is
     * and the way on.
     *
     * Controlled, because the screen unfolds it when the student moves along:
     * the next step has new words to read. The toggle is absent without
     * `onFold`, and so is the folding.
     */
    folded?: boolean;
    onFold?(folded: boolean): void;
}

/** A step's words, a paragraph per blank line. */
function paragraphs(say: string): string[] {
    return say.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
}

/**
 * What a marker is called: the step's number and its title.
 *
 * The title rather than its words, which are two paragraphs now and would be a
 * long thing to hear on every marker a screen reader passes.
 */
function markerName(step: LessonStep, position: number, total: number): string {
    const title = step.title || (step.ask ? 'A question' : '');
    return title ? `Step ${position} of ${total}: ${title}` : `Step ${position} of ${total}`;
}

export function LessonCard({
    steps, state, goals, onGoTo, onReset, children, className, folded = false, onFold
}: LessonCardProps) {

    const body = useRef<HTMLDivElement>(null);
    const bodyId = useId();

    // A new step starts at its top. The body scrolls when a question and its
    // verdict outgrow it, and the next step's heading should not open scrolled
    // out of sight because the last one was long.
    useEffect(() => {
        if (body.current) body.current.scrollTop = 0;
    }, [state.position]);

    if (steps.length === 0) return null;

    const parts = partsOf(steps);
    const here = partAt(parts, state.position);
    const furthest = maxPosition(state, steps);
    const blocked = isBlocked(state, steps);
    const resettable = Object.keys(paramsAt(steps, state.position)).length > 0;
    const step = state.position > 0 ? steps[state.position - 1] : null;
    const atEnd = state.position >= steps.length;

    const marker = (position: number) => {
        const s = steps[position - 1];
        const reachable = position <= furthest;
        const name = markerName(s, position, steps.length);
        // The lock is drawn, so it is said too: a screen reader otherwise hears
        // a step it can press, and that then lands somewhere else.
        const label = reachable ? name : `${name} (locked until the question before it is answered)`;
        return (
            <button
                key={position}
                type="button"
                className={classes.marker}
                // `aria-current="step"` rather than a `disabled` or `aria-pressed`
                // dance: this is a position in a sequence, and that is the
                // attribute that says so.
                aria-current={position === state.position ? 'step' : undefined}
                aria-label={label}
                title={label}
                data-step={position}
                data-kinds={stepKinds(s).join(' ')}
                data-reached={position <= state.position ? 'true' : 'false'}
                data-reachable={reachable ? 'true' : 'false'}
                onClick={() => onGoTo(position)}
            />
        );
    };

    return (
        <section className={className ? `${classes.card} ${className}` : classes.card} aria-label="Lesson">
            <div className={classes.head}>
                <div className={classes.label}>
                    <Text size="xs" className={classes.part}>
                        {here
                            ? (here.part.title
                                ? `Part ${here.index + 1} of ${parts.length} · ${here.part.title}`
                                : `Part ${here.index + 1} of ${parts.length}`)
                            : 'Before you start'}
                    </Text>
                    {onFold ? (
                        <ActionIcon
                            variant="subtle"
                            size="sm"
                            className={classes.fold}
                            aria-label={folded ? 'Show this step' : 'Hide this step'}
                            aria-expanded={!folded}
                            aria-controls={bodyId}
                            onClick={() => onFold(!folded)}
                        >
                            {folded
                                ? <IconChevronDown size={16} stroke={1.75} />
                                : <IconChevronUp size={16} stroke={1.75} />}
                        </ActionIcon>
                    ) : null}
                </div>

                {/* One group per part, each as wide as its share of the steps,
                  * so every marker is the same width and the gaps between the
                  * groups are what draw the parts. */}
                <div className={classes.progress} role="group" aria-label="Lesson steps">
                    {parts.map(part => (
                        <div
                            key={part.first}
                            className={classes.group}
                            style={{ flexGrow: part.last - part.first + 1 }}
                        >
                            {Array.from({ length: part.last - part.first + 1 },
                                (_, i) => marker(part.first + i))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Hidden rather than unmounted when folded, so a question in it
              * keeps its place and its focus handling, and unfolds as it was. */}
            <div className={classes.body} ref={body} id={bodyId} hidden={folded && !!onFold}>
                {/* Polite and atomic: a step's heading and its words are one
                  * thing to hear, and they change only when the student moves
                  * along, which they asked for. On a sighted screen the step
                  * changes under the button they pressed; this is the same news
                  * for someone who cannot see it change. */}
                <div className={classes.words} aria-live="polite" aria-atomic="true">
                    {step ? (
                        <>
                            {step.title ? (
                                <Title order={3} className={classes.title}>{step.title}</Title>
                            ) : null}
                            {step.say ? paragraphs(step.say).map((p, i) => (
                                <p key={i} className={classes.para}>{p}</p>
                            )) : null}
                            {step.term ? (
                                <div className={classes.term}>
                                    <span className={classes.termLabel}>Key term</span>
                                    <span className={classes.termWord}>{step.term.word}</span>
                                    <span className={classes.termMeaning}>{step.term.meaning}</span>
                                </div>
                            ) : null}
                        </>
                    ) : (
                        <>
                            <Title order={3} className={classes.title}>In this lesson</Title>
                            <ul className={classes.goals}>
                                {goals.map(goal => <li key={goal}>{goal}</li>)}
                            </ul>
                        </>
                    )}
                </div>

                {children}

                {/* Only where a step actually established something. Offered
                  * everywhere it would read as "start again", which it is not. */}
                {onReset && resettable ? (
                    <Anchor component="button" type="button" size="xs" className={classes.reset} onClick={onReset}>
                        Reset the diagram to this step
                    </Anchor>
                ) : null}
            </div>

            <div className={classes.foot}>
                {/* Why Next is greyed out, said beside it. The question is just
                  * above, so this only has to say what unlocks the way on. */}
                {blocked ? (
                    <Text size="xs" className={classes.blocked}>
                        Answer the question to unlock the next step.
                    </Text>
                ) : null}
                <div className={classes.nav}>
                    <Button
                        variant="default"
                        size="xs"
                        onClick={() => onGoTo(state.position - 1)}
                        disabled={state.position === 0}
                    >
                        Back
                    </Button>
                    {here ? (
                        <Text component="span" size="xs" className={classes.count}>
                            {state.position - here.part.first + 1} of {here.part.last - here.part.first + 1}
                        </Text>
                    ) : <span className={classes.count} />}
                    <Button
                        size="xs"
                        onClick={() => onGoTo(state.position + 1)}
                        disabled={atEnd || state.position >= furthest}
                    >
                        {state.position === 0 ? 'Start lesson' : 'Next'}
                    </Button>
                </div>
            </div>
        </section>
    );
}

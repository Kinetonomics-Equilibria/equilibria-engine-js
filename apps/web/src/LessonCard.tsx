import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { ActionIcon, Anchor, Button, Text, Title } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { isBlocked, maxPosition, paramsAt, partAt, partsOf, stepKinds } from './track/track';
import type { LessonStep, TrackState } from './track/track';
import classes from './LessonCard.module.css';

/**
 * The lesson, as something to read: where the student is, what this step says,
 * and the way on.
 *
 * It sits beside the diagram, as the first of the side column's tabs — Lesson,
 * Explore, Scenarios, Maths — because that is where there is room to say
 * something properly. The lesson and the instruments never share the screen:
 * while the lesson's tab is open no instrument is mounted, and the only
 * controls are the ones a step hands the student — a question's, or a "see
 * what happens" step's. The instruments come back when the student opens one
 * of their tabs or finishes the lesson. The lesson used to speak
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

    /**
     * The step's controls, under its words: the question, at a step that asks
     * one, or what a "see what happens" step hands the student to move.
     */
    children?: ReactNode;

    /** Where the card sits and how tall it may be: the screen's call, not the card's. */
    className?: string;

    /**
     * Shown under the side column's tabs rather than as a card of its own.
     *
     * The tabs' card is its paper, so it has none, and it fills the tab. And it
     * has no close: the instruments' tabs beside its own are the way out, and
     * an × beside them would be a second door to the same room.
     */
    tabbed?: boolean;

    /**
     * Put the lesson away and hand the student the instruments.
     *
     * Offered in the card's head at every step, unless the card is `tabbed`,
     * and as Finish in place of Next at the last one. The screen owns what
     * leaving does to the diagram; the card only asks. Absent, the card offers
     * neither.
     */
    onLeave?(): void;
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
    steps, state, goals, onGoTo, onReset, children, className, onLeave, tabbed = false
}: LessonCardProps) {

    const body = useRef<HTMLDivElement>(null);

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

    // The last step's way on is out of the lesson, unless it is a question
    // still waiting for its answer.
    const unanswered = !!step && !!step.ask && state.resolved.indexOf(state.position - 1) < 0;
    const finish = atEnd && !!onLeave;

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
        <section
            className={[tabbed ? classes.tabbed : classes.card, className].filter(Boolean).join(' ')}
            aria-label="Lesson"
        >
            <div className={classes.head}>
                <div className={classes.label}>
                    <Text size="xs" className={classes.part}>
                        {here
                            ? (here.part.title
                                ? `Part ${here.index + 1} of ${parts.length} · ${here.part.title}`
                                : `Part ${here.index + 1} of ${parts.length}`)
                            : 'Before you start'}
                    </Text>
                    {/* A close in the corner rather than words: the part's name
                      * is most of the line, and "Leave lesson" beside it put
                      * the name on two. The words are its name and its
                      * tooltip, and the lesson keeps the student's place. */}
                    {onLeave && !tabbed ? (
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            className={classes.leave}
                            aria-label={state.position === 0 ? 'Skip lesson' : 'Leave lesson'}
                            title={state.position === 0
                                ? 'Skip the lesson and explore on your own'
                                : 'Leave the lesson and explore on your own. It keeps your place.'}
                            onClick={onLeave}
                        >
                            <IconX size={16} stroke={1.75} />
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

            <div className={classes.body} ref={body}>
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
                        onClick={() => (finish ? onLeave!() : onGoTo(state.position + 1))}
                        disabled={finish ? unanswered : atEnd || state.position >= furthest}
                    >
                        {state.position === 0 ? 'Start lesson' : finish ? 'Finish' : 'Next'}
                    </Button>
                </div>
            </div>
        </section>
    );
}

export interface LessonResumeProps {
    steps: LessonStep[];
    state: TrackState;

    /** Back into the lesson, where the student left it. */
    onResume(): void;

    className?: string;
}

/**
 * The lesson, put away: where the student left it, and the way back.
 *
 * Shown under the stage on a phone while no lesson is running, in the card's
 * place: one line and a button, so the diagram gets the height back. Beside the
 * stage the Lesson tab does this job.
 */
export function LessonResume({ steps, state, onResume, className }: LessonResumeProps) {
    if (steps.length === 0) return null;

    const step = state.position > 0 ? steps[state.position - 1] : null;
    const atEnd = state.position >= steps.length;

    const where = state.position === 0 ? 'Not started'
        : atEnd ? 'Finished'
            : step && step.title ? `Step ${state.position} of ${steps.length}: ${step.title}`
                : `Step ${state.position} of ${steps.length}`;

    return (
        <section className={className ? `${classes.card} ${className}` : classes.card} aria-label="Lesson">
            <div className={classes.resume}>
                <div className={classes.resumeText}>
                    <Text size="xs" className={classes.part}>Lesson</Text>
                    <Text size="sm" className={classes.where}>{where}</Text>
                </div>
                <Button size="xs" variant={state.position === 0 ? 'filled' : 'light'} onClick={onResume}>
                    {state.position === 0 ? 'Start lesson' : atEnd ? 'Review' : 'Resume'}
                </Button>
            </div>
        </section>
    );
}

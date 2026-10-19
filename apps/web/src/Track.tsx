import { useEffect, useRef } from 'react';
import { Button, Text } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import {
    isBlocked, maxPosition, paramsAt, stepKinds
} from './track/track';
import type { LessonStep, StepKind, TrackState } from './track/track';
import classes from './Track.module.css';

/**
 * The lesson's one row: where we are, and every step in order.
 *
 * The ordering is real information — a step that brings a panel in is not the
 * same event as one that asks a question — so the markers are typed rather than
 * identical dots, and the track is a line rather than a "next" button. A student
 * who wants to know how they got here should be able to see it without being
 * told, and drag back to it without losing what they have since done.
 *
 * Everything is a real `<button>`. Enter, Space, focus order and the accessible
 * role come with it and none of them has to be re-implemented here, which is
 * most of what "keyboard operable" costs when it is not free.
 *
 * The component decides nothing about the lesson. It renders a position and
 * reports where the student wants to go; the screen owns the transition, because
 * the transition is where the snapshot and the param update have to happen in
 * the right order.
 */

export interface TrackProps {
    steps: LessonStep[];
    state: TrackState;

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
}

/**
 * The glyph a marker wears when a step does several things at once.
 *
 * A question outranks everything because it is the only kind that stops the
 * track; a move outranks a reveal because it is the one the student has to
 * watch for; a sentence is what is left when a step does nothing to the diagram.
 */
const PRECEDENCE: StepKind[] = ['ask', 'set', 'reveal', 'say'];

const GLYPH: { [k in StepKind]: string } = {
    reveal: '+',
    set: '→',
    say: '·',
    ask: '?'
};

const DESCRIPTION: { [k in StepKind]: string } = {
    reveal: 'adds to the diagram',
    set: 'moves the diagram',
    say: 'says something',
    ask: 'asks a question'
};

/** A step that does none of the four: a pause the author left in on purpose. */
const IDLE = { glyph: '○', description: 'does nothing' };

/** The one glyph a step's marker wears, and the words for that glyph. */
function face(step: LessonStep): { glyph: string; description: string } {
    const kinds = stepKinds(step);
    const primary = PRECEDENCE.filter(k => kinds.indexOf(k) > -1)[0];
    return primary ? { glyph: GLYPH[primary], description: DESCRIPTION[primary] } : IDLE;
}

function markerLabel(step: LessonStep, n: number): string {
    const kinds = stepKinds(step);
    const what = kinds.length > 0 ? kinds.map(k => DESCRIPTION[k]).join(', ') : IDLE.description;
    // The sentence first when there is one: it is what the step is *about*, and
    // a screen reader announcing "step 4, moves the diagram" has said the least
    // useful half of what the author wrote.
    return step.say ? `Step ${n}: ${step.say}` : `Step ${n}, ${what}`;
}

/** The marker strip's padding, which a marker scrolled into view should clear. */
const INSET = 4;

export function Track({ steps, state, onGoTo, onReset }: TrackProps) {

    const row = useRef<HTMLDivElement>(null);

    // Keep the current marker in view when the row is narrower than the lesson,
    // with one marker either side of it: the step just taken and the one ahead,
    // which past a question is the lock that says why › is greyed out. The row
    // scrolls sideways rather than wrapping (its height is fixed), and a student
    // pressing › on a narrow stage would otherwise watch the filled marker walk
    // off the end of the row — the one thing it is there to say, said out of
    // sight. The row's own `scrollLeft` rather than `scrollIntoView`, which
    // would also scroll the page to bring the row up.
    useEffect(() => {
        const markers = row.current;
        const current = markers && markers.querySelector<HTMLElement>('[aria-current="step"]');
        if (!markers || !current) return;
        const before = (current.previousElementSibling || current).getBoundingClientRect();
        const after = (current.nextElementSibling || current).getBoundingClientRect();
        const box = markers.getBoundingClientRect();
        if (before.left < box.left + INSET) markers.scrollLeft -= box.left + INSET - before.left;
        else if (after.right > box.right - INSET) markers.scrollLeft += after.right - (box.right - INSET);
    }, [state.position]);

    if (steps.length === 0) return null;

    const furthest = maxPosition(state, steps);
    const blocked = isBlocked(state, steps);
    const resettable = Object.keys(paramsAt(steps, state.position)).length > 0;
    const here = state.position > 0 ? face(steps[state.position - 1]) : null;

    const marker = (position: number, kinds: StepKind[], label: string, glyph: string) => {
        const reachable = position <= furthest;
        // The lock is drawn, so it is said too: a screen reader otherwise hears
        // a step it can press, and that then lands somewhere else.
        const name = reachable ? label : `${label} (locked until the question before it is answered)`;
        return (
            <button
                key={position}
                type="button"
                className={position === 0 ? `${classes.marker} ${classes.start}` : classes.marker}
                // `aria-current="step"` rather than a `disabled` or `aria-pressed`
                // dance: this is a position in a sequence, and that is the attribute
                // that says so.
                aria-current={position === state.position ? 'step' : undefined}
                aria-label={name}
                title={name}
                data-kinds={kinds.join(' ')}
                data-reached={position <= state.position ? 'true' : 'false'}
                data-reachable={reachable ? 'true' : 'false'}
                onClick={() => onGoTo(position)}
            >
                {/* A step past an unanswered question wears a lock in place of
                  * its glyph. Its own glyph at low opacity read as a greyed-out
                  * "next" button — something broken — when what it is is
                  * something waiting, and the reason it is waiting (the "?"
                  * before it) is right there in the row. */}
                {reachable
                    ? <span aria-hidden="true">{glyph}</span>
                    : <IconLock aria-hidden="true" size={12} stroke={2} />}
            </button>
        );
    };

    return (
        <div className={classes.track} role="group" aria-label="Lesson steps">
            {/* Back, the steps, forward, and where we are: one control read left
              * to right, and kept together. They sat a page-width apart while
              * the markers took every spare pixel between them. */}
            <Button
                size="compact-xs"
                variant="default"
                className={classes.step}
                onClick={() => onGoTo(state.position - 1)}
                disabled={state.position === 0}
                aria-label="Previous step"
            >
                &#8249;
            </Button>

            <div className={classes.markers} ref={row}>
                {/* The start is a position like any other, and it needs a
                  * control: a build-up you cannot return to the beginning of is
                  * a one-way animation with extra steps. It says "Start" in
                  * words because the dot it used to wear is the universal mark
                  * for "you are here", which it only is once. */}
                {marker(0, [], 'Start, before the first step', 'Start')}
                {steps.map((step, i) =>
                    marker(i + 1, stepKinds(step), markerLabel(step, i + 1), face(step).glyph))}
            </div>

            <Button
                size="compact-xs"
                variant="default"
                className={classes.step}
                onClick={() => onGoTo(state.position + 1)}
                disabled={state.position >= furthest}
                aria-label="Next step"
            >
                &#8250;
            </Button>

            {/* Where we are, and what the step here does, in words beside the
              * glyph that means it. The glyphs were explained only in tooltips,
              * which a student has to know to hover for; stepping through the
              * lesson now teaches them one at a time, against the marker that
              * has just filled in. Only the step's leading kind, the one its
              * glyph shows: every step with a sentence "says something", and
              * the sentence is already on screen. */}
            <Text component="span" size="xs" className={classes.position}>
                <span className={classes.count}>{state.position} / {steps.length}</span>
                {here ? (
                    <span className={classes.kind}>
                        <span aria-hidden="true" className={classes.kindGlyph}>{here.glyph}</span>
                        {here.description}
                    </span>
                ) : null}
            </Text>

            {/* What is about *this* step rather than about moving: pushed to the
              * far end, clear of the group before it. */}
            <div className={classes.end}>
                {/* Only where a step actually established something. Offering it
                  * everywhere would make it read as "start again", which it is not. */}
                {onReset && resettable ? (
                    <Button size="compact-xs" variant="subtle" onClick={onReset}>
                        reset to this step
                    </Button>
                ) : null}

                {/* P11 renders the question itself. This says why the track will not
                  * move, which is the part the track owns and the part a student
                  * pressing a dead forward button would otherwise have to guess. */}
                {blocked ? (
                    <Text component="span" size="xs" c="dimmed" className={classes.blocked}>
                        Answer to continue.
                    </Text>
                ) : null}
            </div>
        </div>
    );
}

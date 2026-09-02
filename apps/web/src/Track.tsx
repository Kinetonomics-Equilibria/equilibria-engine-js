import { Button, Text } from '@mantine/core';
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

function markerLabel(step: LessonStep, n: number): string {
    const kinds = stepKinds(step);
    const what = kinds.length > 0 ? kinds.map(k => DESCRIPTION[k]).join(', ') : 'does nothing';
    // The sentence first when there is one: it is what the step is *about*, and
    // a screen reader announcing "step 4, moves the diagram" has said the least
    // useful half of what the author wrote.
    return step.say ? `Step ${n}: ${step.say}` : `Step ${n}, ${what}`;
}

export function Track({ steps, state, onGoTo, onReset }: TrackProps) {

    if (steps.length === 0) return null;

    const furthest = maxPosition(state, steps);
    const blocked = isBlocked(state, steps);
    const resettable = Object.keys(paramsAt(steps, state.position)).length > 0;

    const marker = (position: number, kinds: StepKind[], label: string, glyph: string) => (
        <button
            key={position}
            type="button"
            className={classes.marker}
            // `aria-current="step"` rather than a `disabled` or `aria-pressed`
            // dance: this is a position in a sequence, and that is the attribute
            // that says so.
            aria-current={position === state.position ? 'step' : undefined}
            aria-label={label}
            title={label}
            data-kinds={kinds.join(' ')}
            data-reached={position <= state.position ? 'true' : 'false'}
            data-reachable={position <= furthest ? 'true' : 'false'}
            onClick={() => onGoTo(position)}
        >
            <span aria-hidden="true">{glyph}</span>
        </button>
    );

    return (
        <div className={classes.track} role="group" aria-label="Lesson steps">
            <Button
                size="compact-xs"
                variant="default"
                onClick={() => onGoTo(state.position - 1)}
                disabled={state.position === 0}
                aria-label="Previous step"
            >
                &#8249;
            </Button>

            <div className={classes.markers}>
                {/* The start is a position like any other, and it needs a
                  * control: a build-up you cannot return to the beginning of is
                  * a one-way animation with extra steps. */}
                {marker(0, [], 'Start, before the first step', '●')}
                {steps.map((step, i) => {
                    const kinds = stepKinds(step);
                    const primary = PRECEDENCE.filter(k => kinds.indexOf(k) > -1)[0];
                    return marker(i + 1, kinds, markerLabel(step, i + 1), primary ? GLYPH[primary] : '○');
                })}
            </div>

            <Button
                size="compact-xs"
                variant="default"
                onClick={() => onGoTo(state.position + 1)}
                disabled={state.position >= furthest}
                aria-label="Next step"
            >
                &#8250;
            </Button>

            <Text component="span" size="xs" c="dimmed" className={classes.position}>
                {state.position} / {steps.length}
            </Text>

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
    );
}

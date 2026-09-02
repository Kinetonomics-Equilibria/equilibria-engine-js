import { describe, it, expect } from 'vitest';
import {
    AT_START, trackReducer, maxPosition, isBlocked, stepKinds,
    paramsAt, paramsBetween, sayAt, revealedPanels
} from '../track/track';
import type { LessonStep, TrackState } from '../track/track';

/**
 * The track as arithmetic, with no DOM and no engine.
 *
 * Everything interesting about a timeline is a claim about a number and a list:
 * where the position may go, what a move should apply, and — the decision this
 * plan turns on — what going back does and does not undo. All of that is
 * checkable without rendering anything, which is where it should be checked,
 * because a scrub-back bug found in a browser is a scrub-back bug found late.
 */

const STEPS: LessonStep[] = [
    { reveal: ['demand'], say: 'Demand slopes down.' },
    { reveal: ['supply'] },
    { reveal: ['surplus'], say: 'The same market, shaded.' },
    { set: { a: 26 }, say: 'Incomes rise.' },
    { set: { a: 24, c: 6 } }
];

const at = (position: number, resolved: number[] = []): TrackState => ({ position, resolved });

describe('where the position may go', () => {

    it('starts before the first step, with nothing revealed', () => {
        expect(AT_START.position).toBe(0);
    });

    it('advances and goes back one step at a time', () => {
        const one = trackReducer(AT_START, { type: 'next' }, STEPS);
        expect(one.position).toBe(1);
        expect(trackReducer(one, { type: 'back' }, STEPS).position).toBe(0);
    });

    it('stops at both ends rather than running off them', () => {
        expect(trackReducer(AT_START, { type: 'back' }, STEPS).position).toBe(0);
        expect(trackReducer(at(5), { type: 'next' }, STEPS).position).toBe(5);
    });

    it('jumps straight to a position', () => {
        expect(trackReducer(AT_START, { type: 'goTo', position: 3 }, STEPS).position).toBe(3);
    });

    // The identity matters: the screen re-renders on every param change, and a
    // reducer that returned a new object for a no-op move would make every
    // memo downstream of it useless.
    it('returns the same state when nothing moves', () => {
        const state = at(2);
        expect(trackReducer(state, { type: 'goTo', position: 2 }, STEPS)).toBe(state);
    });
});

/**
 * The decision the plan turns on.
 *
 * Reveals reverse because the compiled predicate is `>=`; param changes do not,
 * because a student who has dragged the curve since step 2 should not have their
 * work thrown away by navigating.
 */
describe('what going back undoes', () => {

    it('un-reveals only what was revealed at or after the position', () => {
        const panels = ['market', 'surplus'];

        // `market` is named by no step, so it is there from the start.
        expect(revealedPanels(STEPS, 0, panels)).toEqual(['market']);
        expect(revealedPanels(STEPS, 2, panels)).toEqual(['market']);
        expect(revealedPanels(STEPS, 3, panels)).toEqual(['market', 'surplus']);
        expect(revealedPanels(STEPS, 2, panels)).toEqual(['market']);
    });

    it('applies nothing when the move is backwards', () => {
        expect(paramsBetween(STEPS, 5, 2)).toEqual([]);
        expect(paramsBetween(STEPS, 4, 3)).toEqual([]);
    });

    it('applies every set the move passed through, later steps winning', () => {
        expect(paramsBetween(STEPS, 0, 4)).toEqual([{ name: 'a', value: 26 }]);
        expect(paramsBetween(STEPS, 3, 5).sort((x, y) => x.name.localeCompare(y.name)))
            .toEqual([{ name: 'a', value: 24 }, { name: 'c', value: 6 }]);
    });

    // "Reset to this step" is the escape hatch the asymmetry above requires, and
    // it means every set up to here — not the last one the author happened to
    // write, which is what a stored "authored params" record would have given.
    it('resets to the accumulation of every set up to a position', () => {
        expect(paramsAt(STEPS, 0)).toEqual({});
        expect(paramsAt(STEPS, 4)).toEqual({ a: 26 });
        expect(paramsAt(STEPS, 5)).toEqual({ a: 24, c: 6 });
    });
});

describe('a question stops the track', () => {

    const QUIZ: LessonStep[] = [
        { reveal: ['demand'] },
        { ask: { prompt: 'What happens to the price?' } },
        { reveal: ['supply'] }
    ];

    // Arrived at, so the question is on screen; not passed, until it is answered.
    it('lets the student reach the question and no further', () => {
        expect(maxPosition(at(0), QUIZ)).toBe(2);
        expect(trackReducer(at(1), { type: 'next' }, QUIZ).position).toBe(2);
        expect(trackReducer(at(2), { type: 'next' }, QUIZ).position).toBe(2);
        expect(trackReducer(at(2), { type: 'goTo', position: 3 }, QUIZ).position).toBe(2);
    });

    it('reports that it is stopped, so something can say why', () => {
        expect(isBlocked(at(2), QUIZ)).toBe(true);
        expect(isBlocked(at(1), QUIZ)).toBe(false);
        expect(isBlocked(at(2, [1]), QUIZ)).toBe(false);
    });

    it('never blocks going back', () => {
        expect(trackReducer(at(2), { type: 'back' }, QUIZ).position).toBe(1);
    });

    it('releases the track once the question is answered', () => {
        const answered = trackReducer(at(2), { type: 'resolve', index: 1 }, QUIZ);
        expect(answered.resolved).toEqual([1]);
        expect(trackReducer(answered, { type: 'next' }, QUIZ).position).toBe(3);
    });

    it('does not record an answer twice', () => {
        const once = trackReducer(at(2), { type: 'resolve', index: 1 }, QUIZ);
        expect(trackReducer(once, { type: 'resolve', index: 1 }, QUIZ)).toBe(once);
    });

    // A track with no questions never stops, which is what makes free
    // exploration the same mechanism at its last position rather than a mode.
    it('runs to the end when no step asks anything', () => {
        expect(maxPosition(AT_START, STEPS)).toBe(STEPS.length);
        expect(isBlocked(at(STEPS.length), STEPS)).toBe(false);
    });
});

describe('jumping and stepping agree', () => {

    /**
     * The property that makes the scrubber trustworthy: dragging to the end and
     * pressing forward five times have to leave the same diagram. They would not
     * if either reveals or params were accumulated as the student moved rather
     * than derived from where they now are.
     */
    it('reaches the same state whether jumped to or stepped through', () => {
        const panels = ['market', 'surplus'];

        let stepped = AT_START;
        for (let i = 0; i < STEPS.length; i++) stepped = trackReducer(stepped, { type: 'next' }, STEPS);
        const jumped = trackReducer(AT_START, { type: 'goTo', position: STEPS.length }, STEPS);

        expect(jumped).toEqual(stepped);
        expect(revealedPanels(STEPS, jumped.position, panels))
            .toEqual(revealedPanels(STEPS, stepped.position, panels));
        expect(paramsAt(STEPS, jumped.position)).toEqual(paramsAt(STEPS, stepped.position));
    });

    it('reveals everything at the end', () => {
        expect(revealedPanels(STEPS, STEPS.length, ['market', 'surplus', 'revenue']))
            .toEqual(['market', 'surplus', 'revenue']);
    });
});

describe('what a step is', () => {

    it('reports the kinds a step combines, in reading order', () => {
        expect(stepKinds(STEPS[0])).toEqual(['reveal', 'say']);
        expect(stepKinds(STEPS[1])).toEqual(['reveal']);
        expect(stepKinds(STEPS[4])).toEqual(['set']);
        expect(stepKinds({ ask: { prompt: '?' } })).toEqual(['ask']);
        expect(stepKinds({})).toEqual([]);
    });

    it('reports an empty reveal or set as no claim at all', () => {
        expect(stepKinds({ reveal: [], set: {} })).toEqual([]);
    });

    it('gives the sentence for the step just applied, and none before the first', () => {
        expect(sayAt(STEPS, 0)).toBeNull();
        expect(sayAt(STEPS, 1)).toBe('Demand slopes down.');
        expect(sayAt(STEPS, 2)).toBeNull();
    });
});

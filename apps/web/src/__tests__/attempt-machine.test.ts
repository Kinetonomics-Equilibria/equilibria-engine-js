import { describe, it, expect } from 'vitest';
import type { ParamInfo } from 'equilibria-engine-js';
import { attemptReducer, isFrozen, isResolved } from '../quiz/attempt';
import type { Attempt } from '../quiz/attempt';
import { grade } from '../quiz/grade';
import type { Question } from '../quiz/grade';

/**
 * The four states, and the transitions that are not allowed.
 *
 * The interesting content of a state machine is what it refuses. Three refusals
 * here carry real weight: the answer cannot be revealed before it has been
 * asked for, a committed answer cannot be quietly edited, and a retry cannot
 * erase what was answered first.
 */

const A: ParamInfo = {
    name: 'a', label: 'a', value: 20, min: 12, max: 28,
    round: 0.1, precision: 1, presentation: false, isBoolean: false
};

const QUESTION: Question = { param: 'a', direction: 'up', target: 26, tolerance: 1 };

const ask = () => attemptReducer(null, {
    type: 'ask', questionId: '7', question: QUESTION, startValue: 20
})!;

const commit = (state: Attempt | null, value: number) => attemptReducer(state, {
    type: 'commit', value: value, grade: grade(QUESTION, state!.startValue, value, A)
});

describe('the four states', () => {

    it('starts at the prompt with the start recorded and nothing answered', () => {
        const state = ask();
        expect(state.phase).toBe('prompt');
        expect(state.startValue).toBe(20);
        expect(state.attempts).toBe(0);
        expect(state.committedValue).toBeUndefined();
    });

    it('moves to attempt when the student moves the param', () => {
        expect(attemptReducer(ask(), { type: 'move' })!.phase).toBe('attempt');
    });

    it('reaches verdict from either prompt or attempt', () => {
        expect(commit(ask(), 26)!.phase).toBe('verdict');
        expect(commit(attemptReducer(ask(), { type: 'move' }), 26)!.phase).toBe('verdict');
    });

    it('records the answer and the grade on commit', () => {
        const state = commit(ask(), 23)!;
        expect(state.committedValue).toBe(23);
        expect(state.grade!.directionCorrect).toBe(true);
        expect(state.grade!.magnitudeCorrect).toBe(false);
        expect(state.attempts).toBe(1);
    });
});

/**
 * The start is snapshotted when the question is *asked*.
 *
 * A student who drags, goes off to look at another panel, comes back and
 * commits still has their answer measured from the question's own starting
 * line — which is a different number from "wherever they last were", and the
 * plan names taking the wrong one as a real risk.
 */
describe('what the answer is measured from', () => {

    it('keeps the start across everything that happens afterwards', () => {
        let state = ask();
        state = attemptReducer(state, { type: 'move' })!;
        state = commit(state, 23)!;
        state = attemptReducer(state, { type: 'retry' })!;
        state = commit(state, 26)!;
        expect(state.startValue).toBe(20);
        expect(state.grade!.movedBy).toBeCloseTo(6);
    });
});

describe('committing freezes the param, and retrying thaws it', () => {

    it('freezes at verdict and stays frozen through the reveal', () => {
        expect(isFrozen(ask())).toBe(false);
        expect(isFrozen(attemptReducer(ask(), { type: 'move' }))).toBe(false);

        const verdict = commit(ask(), 23)!;
        expect(isFrozen(verdict)).toBe(true);
        expect(isFrozen(attemptReducer(verdict, { type: 'reveal' }))).toBe(true);
    });

    it('ignores a move that arrives while frozen rather than clearing the verdict', () => {
        const verdict = commit(ask(), 23)!;
        expect(attemptReducer(verdict, { type: 'move' })).toBe(verdict);
    });

    it('returns to attempt on retry, and not to prompt', () => {
        const again = attemptReducer(commit(ask(), 23), { type: 'retry' })!;
        expect(again.phase).toBe('attempt');
        expect(again.grade).toBeUndefined();
        expect(isFrozen(again)).toBe(false);
    });

    /** "Got it eventually" and "got it first time" are different facts. */
    it('keeps the first answer through a retry that gets it right', () => {
        let state = commit(ask(), 23)!;
        state = attemptReducer(state, { type: 'retry' })!;
        state = commit(state, 26)!;

        expect(state.attempts).toBe(2);
        expect(state.first!.value).toBe(23);
        expect(state.first!.grade.correct).toBe(false);
        expect(state.grade!.correct).toBe(true);
    });
});

/**
 * The design turns on there being nothing on screen to aim at, so the answer
 * cannot be reachable before an answer has been given.
 */
describe('the reveal is reachable from verdict only', () => {

    it('refuses to reveal from the prompt or mid-attempt', () => {
        const prompt = ask();
        expect(attemptReducer(prompt, { type: 'reveal' })).toBe(prompt);

        const attempt = attemptReducer(prompt, { type: 'move' })!;
        expect(attemptReducer(attempt, { type: 'reveal' })).toBe(attempt);
    });

    it('reveals from a verdict', () => {
        expect(attemptReducer(commit(ask(), 23), { type: 'reveal' })!.phase).toBe('reveal');
    });

    it('refuses to retry once the answer has been shown', () => {
        const revealed = attemptReducer(commit(ask(), 23), { type: 'reveal' })!;
        expect(attemptReducer(revealed, { type: 'retry' })).toBe(revealed);
    });
});

/**
 * Two ways past a question, and asking to be shown is not a concession: with
 * the answer withheld and retries unlimited, a student who cannot get it would
 * otherwise be stuck in a lesson forever.
 */
describe('when the track may move on', () => {

    it('is not resolved while the question is unanswered', () => {
        expect(isResolved(null)).toBe(false);
        expect(isResolved(ask())).toBe(false);
        expect(isResolved(attemptReducer(ask(), { type: 'move' }))).toBe(false);
    });

    it('is not resolved by a wrong answer', () => {
        expect(isResolved(commit(ask(), 23))).toBe(false);
    });

    it('is resolved by a right one', () => {
        expect(isResolved(commit(ask(), 26))).toBe(true);
    });

    it('is resolved by asking to be shown', () => {
        expect(isResolved(attemptReducer(commit(ask(), 23), { type: 'reveal' }))).toBe(true);
    });
});

/**
 * Leaving the question discards the attempt, deliberately.
 *
 * `TrackState.resolved` is what survives navigation, so a question the student
 * comes back to is asked again and the track stays unblocked. Persisting the
 * attempt itself would mean showing a recorded verdict beside a curve that has
 * since moved, and attempt persistence is the first thing in this app that
 * genuinely needs a progress model — which does not exist yet.
 */
describe('leaving the question', () => {

    it('discards the attempt', () => {
        expect(attemptReducer(commit(ask(), 26), { type: 'dismiss' })).toBeNull();
    });

    it('starts clean when a new question arrives', () => {
        const second = attemptReducer(commit(ask(), 23), {
            type: 'ask', questionId: '9', question: QUESTION, startValue: 22
        })!;
        expect(second.phase).toBe('prompt');
        expect(second.attempts).toBe(0);
        expect(second.first).toBeUndefined();
        expect(second.startValue).toBe(22);
    });

    it('does nothing with an action when no question is on screen', () => {
        expect(attemptReducer(null, { type: 'move' })).toBeNull();
        expect(attemptReducer(null, { type: 'reveal' })).toBeNull();
    });
});

import { describe, it, expect } from 'vitest';
import type { ParamInfo } from 'equilibria-engine-js';
import { grade, nearestAchievable, validateQuestion } from '../quiz/grade';
import type { Question } from '../quiz/grade';
import { verdictFor } from '../quiz/verdict';

/**
 * Marking, as arithmetic.
 *
 * This is the part of the product that tells a student they are wrong, so it is
 * tested where being wrong is cheapest: two numbers in, a structured judgement
 * out, no browser and no engine. Every expected value below is hand-checkable
 * from the question beside it, which is the habit NOTES.md asks for — a suite
 * that asserts a grade came back cannot tell a right grade from a wrong one.
 */

/** The study diagram's demand intercept: 12 to 28 in tenths. */
const A: ParamInfo = {
    name: 'a', label: 'a', value: 20, min: 12, max: 28,
    round: 0.1, precision: 1, presentation: false, isBoolean: false
};

const UP: Question = { param: 'a', direction: 'up' };

describe('direction, which is the question that needs no tolerance', () => {

    it('marks a shift the asked way correct', () => {
        const g = grade(UP, 20, 24, A);
        expect(g.moved).toBe(true);
        expect(g.directionCorrect).toBe(true);
        expect(g.correct).toBe(true);
        expect(g.movedBy).toBeCloseTo(4);
    });

    it('marks a shift the other way wrong', () => {
        const g = grade(UP, 20, 16, A);
        expect(g.moved).toBe(true);
        expect(g.directionCorrect).toBe(false);
        expect(g.correct).toBe(false);
    });

    it('reads "down" the other way round', () => {
        const down: Question = { param: 'a', direction: 'down' };
        expect(grade(down, 20, 16, A).directionCorrect).toBe(true);
        expect(grade(down, 20, 24, A).directionCorrect).toBe(false);
    });

    /**
     * Its own case, because it needs its own sentence.
     *
     * "You went the wrong way" is false of a student who went nowhere, and the
     * two mistakes are different: one is an error about economics and the other
     * is not having answered.
     */
    it('separates not moving from moving wrongly', () => {
        const g = grade(UP, 20, 20, A);
        expect(g.moved).toBe(false);
        expect(g.directionCorrect).toBe(false);
        expect(verdictFor(UP, g, 20, A).direction).toContain('did not move');
        expect(verdictFor(UP, grade(UP, 20, 16, A), 16, A).direction).toContain('Wrong direction');
    });

    /**
     * Not `!== 0`. The param moves in tenths, so a "move" of 1e-15 is a claim
     * about floating point, and one of a whole step is a real answer.
     */
    it('treats less than half a step as not having moved', () => {
        expect(grade(UP, 20, 20.04, A).moved).toBe(false);
        expect(grade(UP, 20, 20.1, A).moved).toBe(true);
    });
});

describe('magnitude, which is the question that brings the traps', () => {

    const toTarget: Question = { param: 'a', direction: 'up', target: 26, tolerance: 1 };

    it('marks inside the tolerance correct', () => {
        const g = grade(toTarget, 20, 25.5, A);
        expect(g.magnitudeCorrect).toBe(true);
        expect(g.correct).toBe(true);
    });

    it('marks outside it wrong, while keeping the direction right', () => {
        const g = grade(toTarget, 20, 23, A);
        expect(g.directionCorrect).toBe(true);
        expect(g.magnitudeCorrect).toBe(false);
        expect(g.correct).toBe(false);
        // The sentence this whole split exists to make possible.
        expect(verdictFor(toTarget, g, 23, A).direction).toContain('Right direction');
        expect(verdictFor(toTarget, g, 23, A).magnitude).toContain('Not far enough');
    });

    it('says "too far" on the other side of the same target', () => {
        const g = grade(toTarget, 20, 27.5, A);
        expect(g.magnitudeCorrect).toBe(false);
        expect(verdictFor(toTarget, g, 27.5, A).magnitude).toContain('Too far');
    });

    // Exactly `tolerance` away is inside. Left to floating point it would be
    // decided by the last bit of `Math.round(255 / 0.1) * 0.1`.
    it('counts the boundary as inside, on both sides', () => {
        expect(grade(toTarget, 20, 25, A).magnitudeCorrect).toBe(true);
        expect(grade(toTarget, 20, 27, A).magnitudeCorrect).toBe(true);
        expect(grade(toTarget, 20, 24.9, A).magnitudeCorrect).toBe(false);
        expect(grade(toTarget, 20, 27.1, A).magnitudeCorrect).toBe(false);
    });

    it('reports the two halves independently', () => {
        // Wrong way, and by an amount that happens to be within tolerance of
        // nothing: both halves have to be able to disagree.
        const g = grade(toTarget, 20, 14, A);
        expect(g.directionCorrect).toBe(false);
        expect(g.magnitudeCorrect).toBe(false);

        const rightWayShort = grade(toTarget, 20, 22, A);
        expect(rightWayShort.directionCorrect).toBe(true);
        expect(rightWayShort.magnitudeCorrect).toBe(false);
    });

    it('asks no magnitude question when the author set no target', () => {
        const g = grade(UP, 20, 24, A);
        expect(g.magnitudeCorrect).toBeUndefined();
        expect(verdictFor(UP, g, 24, A).magnitude).toBeUndefined();
        expect(g.correct).toBe(true);
    });
});

/**
 * The failure this feature must never ship: a question nobody can answer.
 *
 * It is indistinguishable, from the student's side, from not being able to do
 * economics. The plan's rule was "tolerance must be at least the `round`
 * interval", which is wrong in both directions — the real question is whether
 * any *achievable* value is within tolerance of the target.
 */
describe('a question that cannot be answered is an authoring bug', () => {

    it('knows what the student can actually set the param to', () => {
        expect(nearestAchievable(A, 24.03)).toBeCloseTo(24);
        expect(nearestAchievable(A, 24.07)).toBeCloseTo(24.1);
        // Clamped before rounding, so the ends are exactly min and max.
        expect(nearestAchievable(A, 40)).toBe(28);
        expect(nearestAchievable(A, 0)).toBe(12);
    });

    it('accepts a target on the grid with no tolerance at all', () => {
        // The plan's rule would have rejected this, and it is perfectly hittable.
        expect(validateQuestion({ param: 'a', direction: 'up', target: 24, tolerance: 0 }, A))
            .toEqual([]);
    });

    it('rejects a tolerance too tight for the rounding interval', () => {
        const problems = validateQuestion(
            { param: 'a', direction: 'up', target: 24.05, tolerance: 0.01 }, A
        );
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain('unhittable');
        expect(problems[0]).toContain('steps of 0.1');
    });

    // The case the plan's rule waves through: tolerance is a whole unit, ten
    // times the rounding interval, and the target is off the end of the slider.
    it('rejects a target outside the param\'s range', () => {
        const problems = validateQuestion(
            { param: 'a', direction: 'up', target: 34, tolerance: 1 }, A
        );
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain('unhittable');
    });

    it('rejects a question about a param the diagram does not have', () => {
        expect(validateQuestion({ param: 'zz', direction: 'up' }, undefined)[0])
            .toContain('does not declare');
    });

    it('rejects a question about how the diagram is shown', () => {
        const presentation = { ...A, name: 'step', presentation: true };
        expect(validateQuestion({ param: 'step', direction: 'up' }, presentation)[0])
            .toContain('presentation param');
    });

    /**
     * These two need the starting value, so they are checkable only once the
     * question is on screen — which is why `validateQuestion` takes it as an
     * optional argument rather than assuming a moment.
     */
    it('rejects a target that contradicts the direction it asks for', () => {
        const problems = validateQuestion(
            { param: 'a', direction: 'up', target: 16, tolerance: 1 }, A, 20
        );
        expect(problems[0]).toContain('contradicts itself');
    });

    it('rejects a question that starts on its own answer', () => {
        const problems = validateQuestion(
            { param: 'a', direction: 'up', target: 20, tolerance: 1 }, A, 20
        );
        expect(problems[0]).toContain('starts on its own answer');
    });

    it('rejects a direction question that starts pinned against the wall', () => {
        expect(validateQuestion({ param: 'a', direction: 'up' }, A, 28)[0])
            .toContain('cannot go up');
        expect(validateQuestion({ param: 'a', direction: 'down' }, A, 12)[0])
            .toContain('cannot go down');
        expect(validateQuestion({ param: 'a', direction: 'up' }, A, 20)).toEqual([]);
    });
});

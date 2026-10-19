import { describe, it, expect } from 'vitest';
import type { ParamInfo } from 'equilibria-engine-js';
import {
    candidatesOf, grade, gradeChoice, nearestAchievable, validateChoice, validateQuestion
} from '../quiz/grade';
import type { Question } from '../quiz/grade';
import { inSentence, verdictFor } from '../quiz/verdict';
import { answerPosition, drawsAnswer, drawsAnswerWhenRight } from '../quiz/apparatus';

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

/**
 * Which curve moves (P14) — the half of the question the prompt used to give away.
 *
 * The slides ask which curve moves before they ask which way, so a question can
 * name the right param among several, and the student is marked on the choice
 * as well as the direction. The params are the A$ lesson's: both curves at 50,
 * in steps of 2, read sideways.
 */
describe('which curve moves, which the prompt no longer says', () => {

    const DEMAND: ParamInfo = {
        name: 'demand', label: 'Demand for A$', value: 50, min: 30, max: 70,
        round: 2, precision: 0, presentation: false, isBoolean: false
    };
    const SUPPLY: ParamInfo = { ...DEMAND, name: 'supply', label: 'Supply of A$' };

    /** Both curves, where the student left them. */
    const at = (demand: number, supply: number) =>
        [{ ...DEMAND, value: demand }, { ...SUPPLY, value: supply }];

    const START = { demand: 50, supply: 50 };
    const RBA: Question = { param: 'demand', direction: 'up', among: ['demand', 'supply'] };
    const SIDEWAYS = { up: 'right', down: 'left' };

    /** What the question row would print for this answer. */
    const said = (demand: number, supply: number) => verdictFor(
        RBA, gradeChoice(RBA, START, at(demand, supply)), demand,
        { ...DEMAND, value: demand }, SIDEWAYS, at(demand, supply)
    );

    it('marks the right curve moved the right way correct', () => {
        const g = gradeChoice(RBA, START, at(60, 50));
        expect(g.correct).toBe(true);
        expect(g.othersMoved).toEqual([]);
        expect(g.movedBy).toBe(10);
        expect(said(60, 50).direction).toBe('Right direction — you moved demand for A$ right.');
    });

    /**
     * The case that used to be told "You did not move it", which was false. The
     * student moved a curve — the wrong one — and that is a mistake about
     * economics with its own sentence.
     */
    it('marks moving the other curve as its own mistake, not as standing still', () => {
        const g = gradeChoice(RBA, START, at(50, 60));
        expect(g.moved).toBe(false);
        expect(g.othersMoved).toEqual(['supply']);
        expect(g.correct).toBe(false);

        const v = said(50, 60);
        expect(v.curve).toBe('This one works through demand for A$ — supply of A$ should stay where it was.');
        // The whole verdict: a sentence about the direction of a curve they never
        // touched would either say nothing or give the direction away.
        expect(v.direction).toBeUndefined();
        expect(v.headline).toBe('Not yet');
    });

    it('marks moving both as wrong, with both halves said', () => {
        const g = gradeChoice(RBA, START, at(60, 60));
        expect(g.directionCorrect).toBe(true);
        expect(g.othersMoved).toEqual(['supply']);
        expect(g.correct).toBe(false);

        const v = said(60, 60);
        expect(v.curve).toContain('supply of A$ should stay where it was');
        expect(v.direction).toBe('Right direction — you moved demand for A$ right.');
        // "Almost" means direction right and magnitude not. This is a different
        // market: with both curves out the rate has hardly moved.
        expect(v.tone).toBe('wrong');
    });

    it('names the curve when the direction is wrong, since the prompt no longer does', () => {
        expect(said(40, 50).direction)
            .toBe('Wrong direction — you moved demand for A$ left, and it should go right.');
    });

    it('names the choice when nothing moved, rather than an "it" with nothing to refer to', () => {
        expect(gradeChoice(RBA, START, at(50, 50)).othersMoved).toEqual([]);
        expect(said(50, 50).direction).toBe('You moved neither demand for A$ nor supply of A$. ' +
            'The answer is a shift, so one of them has to go somewhere.');
    });

    it('measures the other curve by its own step, as the asked one is measured', () => {
        // Half of 2 is 1: under it is floating point, at it is a move.
        expect(gradeChoice(RBA, START, at(60, 50.9)).othersMoved).toEqual([]);
        expect(gradeChoice(RBA, START, at(60, 51)).othersMoved).toEqual(['supply']);
    });

    it('says several wrong curves in one sentence', () => {
        const THIRD: ParamInfo = { ...DEMAND, name: 'rates', label: 'RBA cash rate' };
        const three: Question = { ...RBA, among: ['demand', 'supply', 'rates'] };
        const moved = [{ ...DEMAND }, { ...SUPPLY, value: 60 }, { ...THIRD, value: 56 }];
        const g = gradeChoice(three, { ...START, rates: 50 }, moved);

        expect(g.othersMoved).toEqual(['supply', 'rates']);
        expect(verdictFor(three, g, 50, DEMAND, SIDEWAYS, moved).curve).toBe(
            'This one works through demand for A$ — supply of A$ and RBA cash rate should stay ' +
            'where they were.'
        );
        expect(verdictFor(three, gradeChoice(three, { ...START, rates: 50 }, at(50, 50).concat(THIRD)),
            50, DEMAND, SIDEWAYS, moved).direction)
            .toContain('You moved none of demand for A$, supply of A$ or RBA cash rate.');
    });

    /**
     * The first lesson, unchanged. Its question offers no choice, so it grades as
     * it always has — and supply, which a student can move from the dock while
     * answering, is not a candidate and is not counted.
     */
    it('grades a question that offers no choice exactly as grade() does', () => {
        const withSupply = (a: number) => [{ ...A, value: a }, { ...A, name: 'c', value: 8 }];
        expect(gradeChoice(UP, { a: 20 }, withSupply(24))).toEqual({ ...grade(UP, 20, 24, A), othersMoved: [] });
        expect(gradeChoice(UP, { a: 20 }, withSupply(16))).toEqual({ ...grade(UP, 20, 16, A), othersMoved: [] });
        expect(verdictFor(UP, gradeChoice(UP, { a: 20 }, withSupply(20)), 20, A).direction)
            .toBe('You did not move it. The answer is a shift, so it has to go somewhere.');
    });

    it('offers the params in the order the author wrote, whichever is asked', () => {
        expect(candidatesOf(RBA)).toEqual(['demand', 'supply']);
        expect(candidatesOf({ ...RBA, param: 'supply' })).toEqual(['demand', 'supply']);
        expect(candidatesOf(UP)).toEqual(['a']);
        // Left out by mistake: still answerable, and `validateChoice` says so.
        expect(candidatesOf({ ...RBA, among: ['supply', 'supply'] })).toEqual(['supply', 'demand']);
    });

    it('lowers a label inside a sentence only where it is an ordinary word', () => {
        expect(inSentence('Demand for A$')).toBe('demand for A$');
        expect(inSentence('RBA cash rate')).toBe('RBA cash rate');
        expect(inSentence('A$ traded')).toBe('A$ traded');
        expect(inSentence('a')).toBe('a');
    });

    describe('a choice nobody could answer is an authoring bug too', () => {

        it('accepts the A$ lesson\'s choice', () => {
            expect(validateChoice(RBA, at(50, 50))).toEqual([]);
        });

        it('rejects a choice that leaves out the param it asks about', () => {
            const problems = validateChoice({ ...RBA, among: ['supply'] }, at(50, 50));
            expect(problems).toHaveLength(1);
            expect(problems[0]).toContain('leaves out "demand", the one it asks about');
        });

        it('rejects a choice the diagram cannot offer', () => {
            expect(validateChoice({ ...RBA, among: ['demand', 'imports'] }, at(50, 50))[0])
                .toContain('does not declare');
            expect(validateChoice({ ...RBA, among: ['demand', 'step'] },
                at(50, 50).concat({ ...DEMAND, name: 'step', presentation: true }))[0])
                .toContain('presentation param');
            expect(validateChoice({ ...RBA, among: ['demand', 'supply', 'demand'] }, at(50, 50))[0])
                .toContain('twice');
        });

        it('asks nothing of a question that offers no choice', () => {
            expect(validateChoice(UP, [A])).toEqual([]);
        });
    });
});

/**
 * An illustration (P14): what "Show me" draws for a question that has no
 * correct position, only a correct way.
 *
 * Drawn and never marked. The number is made up for the picture — the A$
 * lesson's 10 is "a shift a student can see" — and the moment it reached the
 * grade it would be a target nobody had chosen.
 */
describe('an illustration, which is drawn and never marked', () => {

    const DEMAND: ParamInfo = {
        name: 'demand', label: 'Demand for A$', value: 50, min: 30, max: 70,
        round: 2, precision: 0, presentation: false, isBoolean: false
    };
    const at = (demand: number) => [{ ...DEMAND, value: demand }];
    const PLAIN: Question = { param: 'demand', direction: 'up' };
    const SHOWN: Question = { ...PLAIN, illustrate: 10 };
    const APPARATUS = { demand: { start: 'startDemand', answer: 'answerDemand' } };

    it('does not change the grade, by any amount', () => {
        [40, 44, 50, 56, 60, 70].forEach(v => {
            expect(gradeChoice(SHOWN, { demand: 50 }, at(v))).toEqual(gradeChoice(PLAIN, { demand: 50 }, at(v)));
            expect(gradeChoice({ ...SHOWN, illustrate: 2 }, { demand: 50 }, at(v)))
                .toEqual(gradeChoice(PLAIN, { demand: 50 }, at(v)));
        });
    });

    it('is drawn from where the question started, the way it asks', () => {
        expect(answerPosition(SHOWN, 50, DEMAND)).toBe(60);
        expect(answerPosition({ ...SHOWN, direction: 'down' }, 50, DEMAND)).toBe(40);
        // A target is drawn where it is, and a question with neither is drawn
        // on its start — which a diagram gating on `answer != start` hides.
        expect(answerPosition({ ...UP, target: 26 }, 20, A)).toBe(26);
        expect(answerPosition(PLAIN, 50, DEMAND)).toBe(50);
    });

    /**
     * Beside a right answer the target is drawn, so the student sees where
     * "close enough" sat. An illustration there would be a D₁ ten along from a
     * student who correctly moved demand four — "not far enough", drawn under
     * the word "Correct".
     */
    it('is drawn by "Show me" and not beside a right answer', () => {
        expect(drawsAnswer(SHOWN, APPARATUS)).toBe(true);
        expect(drawsAnswerWhenRight(SHOWN, APPARATUS)).toBe(false);
        expect(drawsAnswer(PLAIN, APPARATUS)).toBe(false);
        // The first lesson's target, both ways, as before.
        const target: Question = { ...UP, target: 26, tolerance: 1 };
        expect(drawsAnswer(target, { a: { start: 'startA', answer: 'answerA' } })).toBe(true);
        expect(drawsAnswerWhenRight(target, { a: { start: 'startA', answer: 'answerA' } })).toBe(true);
    });

    it('rejects an illustration that would not be drawn as written', () => {
        expect(validateQuestion(SHOWN, DEMAND, 50)).toEqual([]);
        expect(validateQuestion({ ...SHOWN, target: 60 }, DEMAND, 50)[0])
            .toContain('both a target and an illustration');
        expect(validateQuestion({ ...SHOWN, illustrate: -10 }, DEMAND, 50)[0]).toContain('must be positive');
        // Off the end of the range, and off the grid: each would draw a
        // different shift from the one the author described.
        expect(validateQuestion({ ...SHOWN, illustrate: 30 }, DEMAND, 50)[0])
            .toContain('"Show me" would draw it at 70');
        expect(validateQuestion({ ...SHOWN, illustrate: 5 }, DEMAND, 50)[0])
            .toContain('illustrates a shift to 55, which demand cannot be set to');
    });
});

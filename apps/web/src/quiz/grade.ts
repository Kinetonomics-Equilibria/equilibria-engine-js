import type { ParamInfo } from 'equilibria-engine-js';

/**
 * Marking a question that is answered by moving the diagram.
 *
 * Pure, and deliberately: this is the one part of the product that tells a
 * student they are wrong, and it should be checkable without a browser, an
 * engine or a component. It takes two numbers and a question and returns what
 * is true about them; what to *say* about that is `verdict.ts`, and where to
 * draw it is the screen's.
 *
 * **The app grades, and the engine does not know a question exists.** Fork 3,
 * settled by measurement rather than by preference: a predicate that fails to
 * parse comes back from `Model.evaluate` as its own source text, which is a
 * non-empty string, which is truthy — so a mistyped verdict marks every wrong
 * answer correct, with no warning anywhere (`docs/plans/P0-findings.md` §4).
 * A grader that fails as a pass is worse than no grader.
 */

/**
 * Which way the param must go.
 *
 * Defined on the **param's value**, not on the screen: `up` means the number
 * rises. For a curve dragged by its intercept the two coincide, and for a
 * demand shift "up" and "right" are the same event described two ways — which
 * convention the student is taught is the author's business, and the prompt is
 * where they say it.
 */
export type Direction = 'up' | 'down';

/**
 * A question, as the author writes it inside a step's `ask`.
 *
 * The schema declares only the *target*. Everything about attempts, hints,
 * scoring and what the student is told lives in the app, because the engine has
 * nowhere to keep any of it and should not grow one.
 */
export interface Question {
    /** The param the student moves to answer. */
    param: string;

    /** Which way it must go. Required: direction is the first-class question. */
    direction: Direction;

    /**
     * Where it should land. Optional, and the second question.
     *
     * Direction needs no tolerance and no units and is what is actually being
     * taught. Magnitude only makes sense once direction is secure, and it is the
     * half that brings the rounding trap with it.
     */
    target?: number;

    /** How close counts, in the param's own units. Defaults to half a step. */
    tolerance?: number;
}

export interface Grade {
    /** False when the student committed without moving anything. */
    moved: boolean;
    directionCorrect: boolean;
    /** Undefined when the question asked no magnitude. */
    magnitudeCorrect?: boolean;
    /** Both halves, where both were asked. */
    correct: boolean;

    /** How far they moved, signed. */
    movedBy: number;
    /** How far they should have, signed. Undefined without a target. */
    shouldHaveMovedBy?: number;
    /** Where they stopped relative to the target, signed. */
    missBy?: number;
}

/**
 * Floating-point slack, not pedagogical slack.
 *
 * A committed value comes off the rounding grid as `Math.round(v / r) * r`, so
 * `24` can arrive as `24.000000000000004`. Without this, a boundary case — the
 * student exactly `tolerance` away — is decided by the last bit of a double.
 */
const EPSILON = 1e-9;

/** The tolerance a question with a target but no stated tolerance gets. */
function toleranceOf(question: Question, param: ParamInfo): number {
    return question.tolerance === undefined ? param.round / 2 : question.tolerance;
}

/**
 * The nearest value the student could actually set the param to.
 *
 * `Param.update` clamps to `[min, max]` *before* rounding
 * (`packages/engine/src/ts/model/param.ts:153-163`), so the two ends are
 * exactly `min` and `max` whatever the grid says, and everything between them
 * is a multiple of `round`.
 */
export function nearestAchievable(param: ParamInfo, value: number): number {
    if (value <= param.min) return param.min;
    if (value >= param.max) return param.max;
    return Math.round(value / param.round) * param.round;
}

/**
 * What is true about the answer. Direction and magnitude, separately.
 *
 * Separately because "right direction, not far enough" is a useful thing to be
 * told and a single boolean cannot say it. `correct` exists for the track,
 * which only needs to know whether to unblock.
 */
export function grade(
    question: Question, start: number, committed: number, param: ParamInfo
): Grade {
    const movedBy = committed - start;

    // Not `!== 0`. The param lives on a rounding grid, so exact equality is a
    // claim about floating point rather than about the student; half a step is
    // the smallest move they could have made and still be said to have moved.
    const moved = Math.abs(movedBy) >= param.round / 2 - EPSILON;
    const directionCorrect = moved && (movedBy > 0) === (question.direction === 'up');

    const magnitudeCorrect = question.target === undefined
        ? undefined
        : Math.abs(committed - question.target) <= toleranceOf(question, param) + EPSILON;

    return {
        moved: moved,
        directionCorrect: directionCorrect,
        magnitudeCorrect: magnitudeCorrect,
        correct: directionCorrect && magnitudeCorrect !== false,
        movedBy: movedBy,
        shouldHaveMovedBy: question.target === undefined ? undefined : question.target - start,
        missBy: question.target === undefined ? undefined : committed - question.target
    };
}

/**
 * Everything wrong with the question itself, in the author's words.
 *
 * A question nobody can answer is the worst failure this feature has, because
 * it is indistinguishable from a student who cannot do economics. So it is
 * checked, and it is checked where the answer is knowable: `min`, `max` and
 * `round` come from the engine, and `start` is only known once the question is
 * on screen — which is why this takes it as an argument rather than assuming a
 * moment.
 *
 * The plan's rule was "tolerance must be at least the param's `round`
 * interval". That is wrong in both directions: a target sitting on the grid is
 * hittable with no tolerance at all, and a target outside `[min, max]` passes
 * the rule and is still unreachable. The exact question is whether *some
 * achievable value* is within tolerance, which is what is asked here.
 */
export function validateQuestion(
    question: Question, param: ParamInfo | undefined, start?: number
): string[] {
    if (!param) {
        return [`asks about "${question.param}", which this diagram does not declare.`];
    }

    const problems: string[] = [];
    const round = (v: number) => v.toFixed(param.precision);

    if (param.presentation) {
        problems.push(
            `asks about "${param.name}", which is a presentation param — it says how the ` +
            `diagram is shown, not what it shows, so moving it is not an answer to anything.`
        );
    }

    if (question.tolerance !== undefined && question.tolerance < 0) {
        problems.push(`has a negative tolerance (${question.tolerance}).`);
    }

    if (question.target !== undefined) {
        const tolerance = toleranceOf(question, param),
            nearest = nearestAchievable(param, question.target),
            miss = Math.abs(nearest - question.target);

        if (miss > tolerance + EPSILON) {
            problems.push(
                `has an unhittable target: ${param.name} can be set to ${round(nearest)} at the ` +
                `nearest, which is ${round(miss)} from the target of ${round(question.target)} and ` +
                `the tolerance is ${round(tolerance)}. It moves in steps of ${param.round} ` +
                `between ${round(param.min)} and ${round(param.max)}.`
            );
        }

        if (start !== undefined) {
            const wanted = question.target - start;
            if (Math.abs(wanted) < param.round / 2) {
                problems.push(
                    `starts on its own answer: ${param.name} is already ${round(start)}, so there ` +
                    `is nothing to move.`
                );
            } else if ((wanted > 0) !== (question.direction === 'up')) {
                problems.push(
                    `contradicts itself: it asks for "${question.direction}" but its target of ` +
                    `${round(question.target)} is ${wanted > 0 ? 'above' : 'below'} the starting ` +
                    `value of ${round(start)}.`
                );
            }
        }
    } else if (start !== undefined) {
        // No target, so the only way to be unanswerable is to be pinned against
        // the end the question asks the student to move towards.
        const wall = question.direction === 'up' ? param.max : param.min;
        if (Math.abs(start - wall) < param.round / 2) {
            problems.push(
                `cannot be answered: ${param.name} starts at ${round(start)}, which is its ` +
                `${question.direction === 'up' ? 'maximum' : 'minimum'}, so it cannot go ` +
                `${question.direction}.`
            );
        }
    }

    return problems;
}

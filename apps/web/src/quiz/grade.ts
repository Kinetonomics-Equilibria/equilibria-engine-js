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

    /**
     * The params the student chooses between (P14). Optional: without it the
     * only candidate is `param`, and the question is P11's.
     *
     * The slides ask which curve moves before they ask which way, and a prompt
     * that names the curve gives that half away. So the question names the
     * right one among several, and the student is marked on the choice as well
     * as the direction. Written in the order the sliders appear, which is the
     * same for every question that offers the same choice — an order that
     * followed `param` would put the answer first.
     */
    among?: string[];

    /**
     * How far "Show me" draws the answer, on a question with no target (P14).
     *
     * A direction-only question has a correct way and no correct position, so
     * there was nothing to draw. This is a position chosen for the picture: the
     * start moved this far the way the question asks. The grade never reads it,
     * which is the point — the number is made up, and it must not become a mark.
     */
    illustrate?: number;

    /**
     * Why the answer is what it is, in a sentence or two, for after the question.
     *
     * Shown once the question is finished, right or shown, and not before. A
     * verdict says what the student did; this says the economics, which is
     * what a right answer reached by luck is missing and what a student who
     * pressed "Show me" came for. Shown after a wrong answer it would give away
     * the retry. The grade never reads it.
     */
    explain?: string;
}

export interface Grade {
    /** False when the student committed without moving the asked param. */
    moved: boolean;
    directionCorrect: boolean;
    /** Undefined when the question asked no magnitude. */
    magnitudeCorrect?: boolean;
    /** Every half that was asked — and, from `gradeChoice`, no wrong curve moved. */
    correct: boolean;

    /** How far they moved, signed. */
    movedBy: number;
    /** How far they should have, signed. Undefined without a target. */
    shouldHaveMovedBy?: number;
    /** Where they stopped relative to the target, signed. */
    missBy?: number;

    /**
     * The other candidates the student moved: the wrong curve (P14).
     *
     * Set by `gradeChoice`, empty when they left the others alone. Absent from
     * `grade()`, which looks at one param and so cannot know.
     */
    othersMoved?: string[];
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
 * Whether a param has moved from where the question found it.
 *
 * Not `!== 0`. The param lives on a rounding grid, so exact equality is a claim
 * about floating point rather than about the student; half a step is the
 * smallest move they could have made and still be said to have moved. The same
 * rule for the asked param and for every other candidate, so "you moved the
 * wrong curve" and "you moved the right one" are measured one way.
 */
function hasMoved(start: number, value: number, param: ParamInfo): boolean {
    return Math.abs(value - start) >= param.round / 2 - EPSILON;
}

/**
 * The params a question lets the student move, in the order it offers them.
 *
 * `among` as written, once each — and with `param` added at the end when the
 * author left it out. That question is unanswerable as written, and
 * `validateChoice` says so; appending keeps it answerable meanwhile rather than
 * marking every student wrong for their teacher's slip.
 */
export function candidatesOf(question: Question): string[] {
    const named = (question.among || []).filter((name, i, all) => all.indexOf(name) === i);
    return named.indexOf(question.param) > -1 ? named : named.concat(question.param);
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
    const moved = hasMoved(start, committed, param);
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
 * The whole answer to a question that offers a choice of curve (P14).
 *
 * `grade()` for the param the question is about, unchanged, and then the half
 * that `grade()` cannot see: whether any other candidate moved from where the
 * question found it. A student who reaches for supply when the question is
 * about demand has not "not moved it" — they moved the wrong curve, and that is
 * a mistake about economics with its own sentence.
 *
 * `params` are the engine's, at commit: the committed values are read off them,
 * for the reason `onCommit` reads them at all — the engine applied the rounding
 * and the bounds. A question with one candidate grades exactly as `grade()`,
 * with an empty `othersMoved` beside it.
 */
export function gradeChoice(
    question: Question, starts: Record<string, number>, params: ParamInfo[]
): Grade {
    const byName: Record<string, ParamInfo> = {};
    params.forEach(p => { byName[p.name] = p });

    const asked = byName[question.param];
    if (!asked) {
        throw new Error(`gradeChoice: "${question.param}" is not among the params it was given.`);
    }

    const marked = grade(question, starts[question.param], asked.value, asked);
    const othersMoved = candidatesOf(question).filter(name => {
        const other = byName[name];
        return name !== question.param && !!other && starts[name] !== undefined
            && hasMoved(starts[name], other.value, other);
    });

    return { ...marked, othersMoved: othersMoved, correct: marked.correct && othersMoved.length === 0 };
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

    // An illustration is drawn and never marked, so the ways it goes wrong are
    // all ways of drawing something other than what the author meant: hidden
    // behind a target, pointing the wrong way, or clamped short at the end of
    // the param's range — a picture of a smaller shift than the one described.
    if (question.illustrate !== undefined) {
        if (question.target !== undefined) {
            problems.push(
                `has both a target and an illustration. "Show me" draws the target, so the ` +
                `illustration of ${question.illustrate} would never be seen.`
            );
        } else if (!(question.illustrate > 0)) {
            problems.push(
                `illustrates a shift of ${question.illustrate}. It is a distance, and must be ` +
                `positive: the way it is drawn comes from the question's direction.`
            );
        } else if (start !== undefined) {
            const to = start + (question.direction === 'up' ? 1 : -1) * question.illustrate,
                drawn = nearestAchievable(param, to);
            if (Math.abs(drawn - to) > EPSILON) {
                problems.push(
                    `illustrates a shift to ${round(to)}, which ${param.name} cannot be set to, so ` +
                    `"Show me" would draw it at ${round(drawn)}. It moves in steps of ` +
                    `${param.round} between ${round(param.min)} and ${round(param.max)}.`
                );
            }
        }
    }

    return problems;
}

/**
 * Everything wrong with the choice a question offers (P14).
 *
 * Separate from `validateQuestion` because it is about several params where
 * that is about one. The new way to be unanswerable is the first check: a
 * choice that leaves out the param the question is about cannot be answered
 * right by anyone.
 */
export function validateChoice(question: Question, params: ParamInfo[]): string[] {
    if (!question.among) return [];

    const problems: string[] = [];
    const among = question.among;

    if (among.indexOf(question.param) < 0) {
        problems.push(
            `offers a choice of ${among.map(n => `"${n}"`).join(', ')} that leaves out ` +
            `"${question.param}", the one it asks about.`
        );
    }

    among.forEach((name, i) => {
        if (among.indexOf(name) !== i) {
            problems.push(`offers "${name}" twice.`);
            return;
        }
        const info = params.filter(p => p.name === name)[0];
        if (!info) {
            problems.push(`offers "${name}" as a choice, which this diagram does not declare.`);
        } else if (info.presentation) {
            problems.push(
                `offers "${name}" as a choice, which is a presentation param — moving it is not ` +
                `an answer to anything.`
            );
        }
    });

    return problems;
}

/**
 * The names a question is drawn with, in one place (P16).
 *
 * A question needs params of its own: three it shares with every other
 * question, and a start and an answer for each param it can be about. The
 * screen writes them by name and the diagram draws by them, so the two have
 * to use the same names — and four lessons wrote them out by hand, the same
 * way each time, which is how a fifth would come to write them another way.
 * `defineLesson` declares them from these, the chart kit draws with them, and
 * `StudyScreen` writes them with `questionState`.
 */

/**
 * The params every question shares: one is on screen, its answer is committed,
 * its answer is drawn.
 *
 * Every one is `presentation`, and that is load-bearing rather than tidy:
 * `prev.changed` counts non-presentation params that differ from the
 * snapshot, so arming a question with one that was not would draw the dashed
 * ghost of a curve nobody touched (P10's finding 4, in P11). It also keeps
 * them out of the narration and out of Explore, neither of which should offer
 * a student a slider for "has this been submitted".
 */
export const QUESTION_PARAMS = ['asking', 'submitted', 'revealed'] as const;

export type QuestionParam = typeof QUESTION_PARAMS[number];

/**
 * The writes that put a question in a state, in the order the names are
 * declared: `questionState({ asking: 1, submitted: 0 })`. Typed by the names,
 * so a write to a param no diagram declares fails to compile rather than
 * doing nothing.
 */
export function questionState(values: Partial<Record<QuestionParam, number>>): { name: string; value: number }[] {
    return QUESTION_PARAMS
        .filter(name => values[name] !== undefined)
        .map(name => ({ name, value: values[name]! }));
}

/** True while a question is on screen. */
export const WHILE_ASKING = 'params.asking';

/**
 * True except while a question is on screen: a ghost's `show`.
 *
 * `prev` is per gesture, so a ghost on a student's second attempt would slide
 * up to the start of that attempt while the answer is still marked from the
 * question's own start — two dashed curves claiming to be the same thing. The
 * question's start line is the "before" while it is asked, and the ghost
 * stands down.
 */
export const UNLESS_ASKING = 'not(params.asking)';

/**
 * True until an answer is committed: a drag's `draggable`.
 *
 * While `submitted` is set the curve refuses the drag and stops showing a
 * resize cursor, so a taken answer reads as taken rather than as a diagram
 * that has broken.
 */
export const UNTIL_SUBMITTED = 'not(params.submitted)';

/** True once a verdict has drawn the answer. */
export const ONCE_REVEALED = 'params.revealed';

const capitalised = (name: string) => name[0].toUpperCase() + name.slice(1);

/** Where a question about `param` found it: `startDemand`, `startA`. */
export const startOf = (param: string) => 'start' + capitalised(param);

/** Where a question about `param` would put it: `answerDemand`, `answerA`. */
export const answerOf = (param: string) => 'answer' + capitalised(param);

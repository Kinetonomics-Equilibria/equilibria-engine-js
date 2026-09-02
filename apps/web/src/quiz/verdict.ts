import type { ParamInfo } from 'equilibria-engine-js';
import type { Grade, Question } from './grade';

/**
 * What the student is told, as words.
 *
 * Separate from `grade.ts` for the reason `phrasebook.ts` is separate from
 * `narrate.ts`: what is *true* about an answer and what is *said* about it are
 * two different things, and only one of them should need an economics teacher's
 * review. This is the one place in the product that tells someone they are
 * wrong, so the copy here is worth arguing about.
 *
 * Two rules run through all of it.
 *
 * **Direction and magnitude are reported separately**, because "right way, not
 * far enough" is the most useful sentence this feature can produce and a single
 * verdict cannot say it.
 *
 * **No red crosses and no score.** The reveal draws the correct position beside
 * the student's answer, so the wrongness is legible as geometry — which is the
 * whole reason for assessing in the diagram rather than beside it.
 */

export interface Verdict {
    /** For the badge and the styling. `partly` is direction right, magnitude not. */
    tone: 'right' | 'partly' | 'wrong';
    /** The one-word summary beside the sentences. */
    headline: string;
    /** What the direction check found. Always present. */
    direction: string;
    /** What the magnitude check found, when the question asked one. */
    magnitude?: string;
}

const WORD: Record<Question['direction'], string> = { up: 'up', down: 'down' };

/**
 * Nothing here says "demand".
 *
 * The prompt sits directly above and names what to move; the param's own label
 * is `a`, which is the diagram's word for it and not a student's. "It" is
 * unambiguous where it is read and stays correct for any question the author
 * writes, which a hard-coded noun would not.
 */
export function verdictFor(
    question: Question, grade: Grade, committed: number, param: ParamInfo
): Verdict {
    const show = (value: number) => value.toFixed(param.precision);

    const direction = !grade.moved
        ? 'You did not move it. The answer is a shift, so it has to go somewhere.'
        : grade.directionCorrect
            ? `Right direction — you moved it ${WORD[question.direction]}.`
            : `Wrong direction — you moved it ${WORD[question.direction === 'up' ? 'down' : 'up']}, ` +
              `and it should go ${WORD[question.direction]}.`;

    let magnitude: string | undefined;
    if (grade.magnitudeCorrect !== undefined && question.target !== undefined) {
        if (grade.magnitudeCorrect) {
            magnitude = `And far enough: ${show(question.target)} is where it belongs.`;
        } else if (grade.directionCorrect) {
            // "Not far enough" is only sayable of a shift that went the right
            // way. Said of one that went the wrong way it is arithmetic rather
            // than teaching, so the wrong-direction case just states the answer
            // and lets the reveal do the work.
            magnitude = grade.missBy! < 0
                ? `Not far enough — you stopped at ${show(committed)}, ` +
                  `and it belongs at ${show(question.target)}.`
                : `Too far — you went to ${show(committed)}, ` +
                  `and it belongs at ${show(question.target)}.`;
        } else {
            magnitude = `It belongs at ${show(question.target)}.`;
        }
    }

    const tone: Verdict['tone'] = grade.correct
        ? 'right'
        : grade.directionCorrect ? 'partly' : 'wrong';

    return {
        tone: tone,
        headline: tone === 'right' ? 'Correct' : tone === 'partly' ? 'Almost' : 'Not yet',
        direction: direction,
        magnitude: magnitude
    };
}

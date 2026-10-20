import type { ParamInfo } from 'equilibria-engine-js';
import { candidatesOf } from './grade';
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
 * It is written for a fifteen-year-old who has just had a go. So it says what
 * they did before it says what is right ("You moved it left, but…"), it never
 * opens on a verdict word like "Wrong", and it uses contractions, because a
 * sentence that sounds like a person is easier to take than one that sounds
 * like a marking scheme. "Wrong direction — you moved…" was accurate, and read
 * as a buzzer.
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
    /**
     * For the badge and the styling. `partly` is direction right, magnitude
     * not — and nothing else: moving the wrong curve as well is `wrong`.
     */
    tone: 'right' | 'partly' | 'wrong';
    /** The one-word summary beside the sentences. */
    headline: string;
    /**
     * Which curve, when the student moved one the question was not about (P14).
     *
     * Said first, because it is the first thing wrong: which curve moves comes
     * before which way it goes, in the slides and in the reasoning.
     */
    curve?: string;
    /**
     * What the direction check found. Absent only when `curve` is the whole
     * story — the student moved another curve and left this one alone, and a
     * sentence about the direction of a curve they never touched would either
     * say nothing or give the direction away.
     */
    direction?: string;
    /** What the magnitude check found, when the question asked one. */
    magnitude?: string;
}

/** How a rise and a fall in the param read: which way the student moved it. */
export type DirectionWords = Record<Question['direction'], string>;

/**
 * The default reading, for a param that moves its curve up as it rises.
 *
 * Right for a curve dragged by its intercept, which is what this was written
 * against, and wrong for one dragged sideways — there the param rises as the
 * curve moves right, and "you moved it up" describes the model's bookkeeping
 * rather than the student's hand. A lesson says so per param, and the words
 * arrive here; the direction the grade checks is still the param's own.
 */
const WORD: DirectionWords = { up: 'up', down: 'down' };

/**
 * A param's label as it reads inside a sentence.
 *
 * "Demand for A$" names a slider and so starts with a capital; mid-sentence it
 * is "demand for A$". Only an ordinary capitalised word is lowered — "RBA" and
 * "A$" are names and stay as written. A heuristic, and its limit is stated in
 * P14: a label opening with a proper adjective ("Australian demand") would come
 * out wrong, and a lesson that needs one will need nouns of its own.
 */
export function inSentence(label: string): string {
    return /^[A-Z][a-z]/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label;
}

/** "a", "a and b", "a, b and c". */
function both(items: string[]): string {
    return items.length < 2
        ? items.join('')
        : items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}

/** "a or b", "a, b or c". */
function either(items: string[]): string {
    return items.length < 2
        ? items.join('')
        : items.slice(0, -1).join(', ') + ' or ' + items[items.length - 1];
}

/**
 * "It", for a question that offers no choice; the curve's name, for one that does.
 *
 * With one candidate the prompt sits directly above and names what to move —
 * the param's own label is often the diagram's word for it (`a`) and not a
 * student's — so "it" is unambiguous where it is read and stays correct for any
 * question the author writes.
 *
 * A question that offers a choice is the other case, on purpose: its prompt
 * does *not* name the curve, because naming it gives away half the question.
 * So "it" has nothing to refer to, and the verdict names the curve itself, by
 * the label the student's slider carries (P14). `candidates` are the params the
 * question offers, for their labels; a name without one is said as itself.
 */
export function verdictFor(
    question: Question, grade: Grade, committed: number, param: ParamInfo,
    words: DirectionWords = WORD, candidates: ParamInfo[] = []
): Verdict {
    const show = (value: number) => value.toFixed(param.precision);

    const offered = candidatesOf(question),
        choice = offered.length > 1,
        strayed = grade.othersMoved || [];
    const named = (name: string) => {
        const info = name === param.name ? param : candidates.filter(c => c.name === name)[0];
        return inSentence(info ? info.label : name);
    };
    const it = choice ? named(param.name) : 'it';

    const curve = strayed.length > 0
        ? `This change moves ${named(param.name)}, so ${both(strayed.map(named))} should stay ` +
          `where ${strayed.length > 1 ? 'they were' : 'it was'}.`
        : undefined;

    let direction: string | undefined;
    if (!grade.moved) {
        // Moved the wrong curve and not this one: the curve sentence says it all.
        if (strayed.length === 0) {
            direction = choice
                ? `You haven't moved ${either(offered.map(named))} yet. One of them shifts, so move ` +
                  `the one you think it is.`
                : 'You haven\'t moved it yet. This change shifts it one way or the other, so move ' +
                  'it, then check.';
        }
    } else if (grade.directionCorrect) {
        direction = `You moved ${it} ${words[question.direction]}, which is the right direction.`;
    } else {
        direction = `You moved ${it} ${words[question.direction === 'up' ? 'down' : 'up']}, ` +
            `but this change moves it ${words[question.direction]}.`;
    }

    // In a question with a choice, where the asked curve goes is said only
    // once the student has moved it. Before that, "it goes to 60" would
    // either name the curve the question is asking them to choose or follow a
    // sentence about a different curve, and mean that one.
    let magnitude: string | undefined;
    if (grade.magnitudeCorrect !== undefined && question.target !== undefined
        && (grade.moved || !choice)) {
        if (grade.magnitudeCorrect) {
            magnitude = `And by the right amount, to ${show(question.target)}.`;
        } else if (grade.directionCorrect) {
            // "Not far enough" is only sayable of a shift that went the right
            // way. Said of one that went the wrong way it is arithmetic rather
            // than teaching, so the wrong-direction case just states the answer
            // and lets the reveal do the work.
            magnitude = grade.missBy! < 0
                ? `Not quite far enough: you stopped at ${show(committed)}, ` +
                  `and it goes to ${show(question.target)}.`
                : `A bit too far: you went to ${show(committed)}, ` +
                  `and it only goes to ${show(question.target)}.`;
        } else {
            magnitude = `It goes to ${show(question.target)}.`;
        }
    }

    const tone: Verdict['tone'] = grade.correct
        ? 'right'
        : grade.directionCorrect && strayed.length === 0 ? 'partly' : 'wrong';

    return {
        tone: tone,
        headline: tone === 'right' ? 'Correct' : tone === 'partly' ? 'Almost' : 'Not yet',
        curve: curve,
        direction: direction,
        magnitude: magnitude
    };
}

import { candidatesOf } from './grade';
import type { Grade, Question } from './grade';

/**
 * The four states of answering, as a machine rather than as four booleans.
 *
 * Each state has different affordances and they are not a progression through
 * one dimension: whether the curve is draggable, whether a verdict is on
 * screen, whether the answer is drawn and whether the track may advance are
 * four separate answers, and the state is what keeps them in agreement.
 *
 * - **prompt** — the question is on screen, nothing has been touched.
 * - **attempt** — the student is moving it. Live values, no verdict, no hint.
 * - **verdict** — they committed. The param is frozen and marked.
 * - **reveal** — the correct position is drawn beside their answer.
 *
 * The plan also carried a `revealed: boolean` beside this machine. It is the
 * same fact twice (`phase === 'reveal'`), which is the plans README's finding 3
 * in miniature — a value already held, kept again, free to disagree.
 */
export type Phase = 'prompt' | 'attempt' | 'verdict' | 'reveal';

export interface Attempt {
    /** Which question this is an attempt at. The step's index, as a string. */
    questionId: string;
    question: Question;
    phase: Phase;

    /**
     * Where every candidate was when the question was *asked*: the param it is
     * about, and each of the others the student could move instead (P14).
     *
     * Snapshotted at prompt time and never again, which is the difference
     * between marking an answer and marking whatever the student last did. A
     * student who drags, goes exploring, comes back and commits still has their
     * answer measured from the question's own starting line — and a curve they
     * should have left alone is measured from where *it* was then.
     *
     * One record for all of them, the asked one included, rather than a start
     * for the asked param and another field for the rest: two homes for one
     * fact is how the plan's own `revealed` flag came to shadow `phase`.
     */
    starts: Record<string, number>;

    /** Where the asked param was when they committed. */
    committedValue?: number;
    grade?: Grade;

    /** How many times they have committed. */
    attempts: number;

    /**
     * The first answer, kept across retries.
     *
     * Retrying is allowed and teaches more than one shot, but "got it eventually"
     * and "got it first time" are different facts and only one of them survives
     * if the record is overwritten.
     */
    first?: { value: number; grade: Grade };
}

export type AttemptAction =
    /** A question has arrived. Everything about the previous one is gone. */
    | { type: 'ask'; questionId: string; question: Question; starts: Record<string, number> }
    /** The student moved the param. */
    | { type: 'move' }
    | { type: 'commit'; value: number; grade: Grade }
    | { type: 'retry' }
    | { type: 'reveal' }
    /** The question is no longer on screen. */
    | { type: 'dismiss' };

export function attemptReducer(state: Attempt | null, action: AttemptAction): Attempt | null {
    switch (action.type) {
        case 'ask':
            return {
                questionId: action.questionId,
                question: action.question,
                phase: 'prompt',
                starts: { ...action.starts },
                attempts: 0
            };

        case 'dismiss':
            return null;

        default:
            break;
    }

    if (!state) return state;

    switch (action.type) {
        // Only out of `prompt`. A move during `verdict` is not an attempt —
        // it should not be possible at all, since committing freezes the param,
        // and if one arrives anyway it must not silently take the verdict off
        // the screen.
        case 'move':
            return state.phase === 'prompt' ? { ...state, phase: 'attempt' } : state;

        case 'commit': {
            if (state.phase !== 'prompt' && state.phase !== 'attempt') return state;
            const answer = { value: action.value, grade: action.grade };
            return {
                ...state,
                phase: 'verdict',
                committedValue: action.value,
                grade: action.grade,
                attempts: state.attempts + 1,
                first: state.first || answer
            };
        }

        // Back to answering, with the verdict cleared and the count kept. Going
        // back to `attempt` rather than `prompt` is not cosmetic: the student
        // has already moved it, and `prompt` claims otherwise.
        case 'retry':
            if (state.phase !== 'verdict') return state;
            return { ...state, phase: 'attempt', committedValue: undefined, grade: undefined };

        // From `verdict` only. Being shown the answer before committing one is
        // not a reveal, it is the answer key — and the whole design turns on
        // there being nothing on screen to aim at.
        case 'reveal':
            return state.phase === 'verdict' ? { ...state, phase: 'reveal' } : state;

        default:
            return state;
    }
}

/**
 * Whether the track may move past this question.
 *
 * Two ways through, and the second is not a concession. Unlimited retries with
 * the answer withheld measures persistence rather than recall, which is the
 * better thing to measure — but only if nobody can be stuck, so asking to be
 * shown is a legitimate way to finish. What it costs the student is the record:
 * `first` says what they answered before they asked.
 */
export function isResolved(state: Attempt | null): boolean {
    if (!state) return false;
    if (state.phase === 'reveal') return true;
    return state.phase === 'verdict' && !!state.grade && state.grade.correct;
}

/** Whether the answer has been taken, so the params it is made of should refuse to move. */
export function isFrozen(state: Attempt | null): boolean {
    return !!state && (state.phase === 'verdict' || state.phase === 'reveal');
}

/**
 * The params that refuse to move once the answer is taken: every candidate.
 *
 * Not only the right one. An answer is the position of everything the student
 * could have moved, so a wrong curve left editable after the commit would let
 * the answer be changed under its own verdict — the half-freeze P11 found for
 * the dock, one param over.
 */
export function frozenParams(state: Attempt | null): string[] {
    return state && isFrozen(state) ? candidatesOf(state.question) : [];
}

/**
 * What "Try again" puts back: every curve the student moved that the question
 * was not about, at the value the question found it at (P14).
 *
 * The verdict has just told them that curve should have stayed where it was.
 * Left where they put it, the retry would be a question about a different
 * market — and a student who did exactly as told, and moved the right curve the
 * right way, would be marked wrong again unless they first put the other one
 * back to within half a step, which with a mouse is a single grid point.
 *
 * The curve the question *is* about stays where they left it, which is P11's
 * reason for retrying into `attempt` rather than `prompt`: they have already
 * moved it, and that part of the work is theirs. Nothing here gives the answer
 * away — the verdict has already named the curve, and which way it goes is
 * still for them to find.
 */
export function resetsOnRetry(state: Attempt | null): { name: string; value: number }[] {
    if (!state || state.phase !== 'verdict' || !state.grade) return [];
    return (state.grade.othersMoved || [])
        .filter(name => state.starts[name] !== undefined)
        .map(name => ({ name: name, value: state.starts[name] }));
}

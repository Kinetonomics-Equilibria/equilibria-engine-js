/**
 * The question apparatus belonging to the curves a question is *not* about.
 *
 * A diagram with one askable param has one start line and one answer line, and
 * a question arms both. A diagram with two — demand and supply, both asked
 * about — draws a pair for each, and arming a question about one leaves the
 * other pair wherever the last question about *that* param put it: a dashed
 * "start" at an old position, and, once a verdict sets `revealed`, a dotted
 * "answer" to a question nobody is asking.
 *
 * So the others are parked on their own curve's current position. The start
 * line then marks where that curve was when the question was asked — which is
 * what a student who reaches for the wrong curve needs to see — and the answer
 * line sits on its start, which a diagram gates on (`answer != start`) to draw
 * nothing.
 *
 * Pure, so it can be argued with without a screen: names in, param writes out.
 */

import type { ParamInfo } from 'equilibria-engine-js';
import { nearestAchievable } from './grade';
import type { Question } from './grade';

/** Per askable param, the presentation params that draw its question. */
export type QuestionApparatus = Record<string, { start: string; answer: string }>;

/**
 * Where the asked param's answer line goes, written when the question is armed.
 *
 * The target, where the question has one. Otherwise its illustration (P14): the
 * start moved `illustrate` the way the question asks, onto a value the param
 * can take. Otherwise the start itself, where a diagram that gates its answer
 * line on `answer != start` draws nothing — and where a stale answer from an
 * earlier question would otherwise be left to draw.
 *
 * Written at arming, like a target, and drawn only once `revealed` is set — so
 * there is still nothing on screen to aim at while the student answers.
 */
export function answerPosition(question: Question, start: number, param?: ParamInfo): number {
    if (question.target !== undefined) return question.target;
    if (question.illustrate === undefined) return start;
    const to = start + (question.direction === 'up' ? 1 : -1) * question.illustrate;
    return param ? nearestAchievable(param, to) : to;
}

/**
 * Whether "Show me" has a position to draw: a target, or an illustration.
 */
export function drawsAnswer(question: Question, apparatus: QuestionApparatus): boolean {
    return (question.target !== undefined || question.illustrate !== undefined)
        && !!apparatus[question.param];
}

/**
 * Whether a *right* answer is shown the exact position too — a target only.
 *
 * P11 draws the target beside a correct answer, because seeing where "close
 * enough" sat is the difference between being told yes and being shown why. An
 * illustration is not that: it is a distance made up for the picture, and
 * drawn beside a student who correctly moved demand by four it would be a D₁
 * ten along — a picture of "not far enough" under the word "Correct".
 */
export function drawsAnswerWhenRight(question: Question, apparatus: QuestionApparatus): boolean {
    return question.target !== undefined && !!apparatus[question.param];
}

export function parkApparatus(
    asked: string,
    apparatus: QuestionApparatus,
    values: { name: string; value: number }[]
): { name: string; value: number }[] {
    return Object.keys(apparatus)
        .filter(name => name !== asked)
        .reduce((out, name) => {
            const now = values.filter(p => p.name === name)[0];
            if (!now) return out;
            const other = apparatus[name];
            return out.concat(
                { name: other.start, value: now.value },
                { name: other.answer, value: now.value }
            );
        }, [] as { name: string; value: number }[]);
}

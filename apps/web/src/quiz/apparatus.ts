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

/** Per askable param, the presentation params that draw its question. */
export type QuestionApparatus = Record<string, { start: string; answer: string }>;

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

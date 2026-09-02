import type { AffectedObject, Movement, ParamBlockedEvent } from 'equilibria-engine-js';

/**
 * The middle clause: what moved, said in words.
 *
 * The engine reports `{ kind: 'shift', axis: 'y', sign: 1 }` and deliberately
 * stops there — phrasing, tense and translation are product copy, and belong
 * where they can be revised without touching a diagram. This module is that
 * place, and it is the only one: a second phrasebook somewhere else is how a
 * strip and a lesson end up describing the same movement with different verbs.
 *
 * **The phrases are literal geometry, on purpose.** A demand curve whose
 * intercept rises is sampled at fixed x values, so the engine reports it moving
 * *up*, and that is what this says. The textbook idiom is "shifts right", and
 * mapping one onto the other needs the curve's slope sign — up is rightward for
 * a downward-sloping curve and leftward for an upward-sloping one — which the
 * descriptor does not carry. Saying "shifts right" of a supply curve that
 * shifted up would teach an error, and the plan's rule is that wrong phrasing is
 * worse than none. So: literal until a descriptor carries the slope and someone
 * who teaches this has reviewed the mapping.
 */

/** Which way along an axis, as a word. `null` when there is no single direction. */
function along(axis: 'x' | 'y', sign: number): string | null {
    if (sign === 0) return null;
    if (axis === 'x') return sign > 0 ? 'right' : 'left';
    return sign > 0 ? 'up' : 'down';
}

/** "up", "to the right", "up and to the right" — the adverb half of the clause. */
function direction(movement: Movement): string | null {
    if (movement.axis === 'both') {
        // `sign` is 0 for `both` because there is no single direction to sign,
        // so the components are read off `dx`/`dy` instead. Both are non-zero
        // here by construction — that is what made the axis `both`.
        const horizontal = along('x', Math.sign(movement.dx)),
            vertical = along('y', Math.sign(movement.dy));
        if (!horizontal) return vertical;
        if (!vertical) return 'to the ' + horizontal;
        return vertical + ' and to the ' + horizontal;
    }

    const word = along(movement.axis, movement.sign);
    if (!word) return null;
    return movement.axis === 'x' ? 'to the ' + word : word;
}

/**
 * One movement as a verb phrase, or `null` when the descriptor does not say
 * enough to phrase without inventing.
 *
 * A rotation with no `steeper` is the case that matters: the engine reports one
 * when the chord it measured was vertical or degenerate, which is precisely when
 * "gets steeper" would be a guess.
 */
export function phraseMovement(movement: Movement): string | null {
    if (movement.kind === 'rotate') {
        if (movement.steeper === undefined) return null;
        return movement.steeper ? 'gets steeper' : 'gets flatter';
    }

    const where = direction(movement);
    if (!where) return null;

    // Curves shift, points move — the engine's own vocabulary, and economics'.
    return (movement.kind === 'shift' ? 'shifts ' : 'moves ') + where;
}

/**
 * The whole middle clause, from everything the engine says moved.
 *
 * Three decisions live here, all of them ones the plan left open.
 *
 * **Duplicates are one object.** A stage draws the same market in several
 * panels, so one demand curve is three view objects with one title, and the
 * engine reports all three. They are the same thing, so they are said once. When
 * two objects share a title and disagree about what they did, nothing is said
 * about that title at all — one of them is wrong and there is no way to tell
 * which.
 *
 * **A curve that shifted outranks a point that moved.** The chain already ends
 * with the numbers a point's coordinates *are*, so "equilibrium moves up and to
 * the right" is the third clause said twice. The mechanism is the curve; the
 * point is the consequence. Where nothing shifted — the student dragged a point
 * directly — the point is the mechanism, because then it is what they touched.
 *
 * **Two named objects at most.** Beyond that the clause stops being a mechanism
 * and becomes a list, and a list of four things moving explains nothing.
 */
export function phraseMechanism(affected: AffectedObject[]): string | null {
    if (!affected || affected.length === 0) return null;

    const byTitle = new Map<string, string | null>();
    const kinds = new Map<string, Movement['kind']>();

    affected.forEach(function (object) {
        const said = phraseMovement(object.movement);
        if (!byTitle.has(object.title)) {
            byTitle.set(object.title, said);
            kinds.set(object.title, object.movement.kind);
            return;
        }
        // Same title, different story: say nothing rather than pick a winner.
        if (byTitle.get(object.title) !== said) byTitle.set(object.title, null);
    });

    const named = [...byTitle.entries()].filter(([, said]) => said !== null);
    const moved = named.filter(([title]) => kinds.get(title) !== 'move');
    const chosen = moved.length > 0 ? moved : named;

    if (chosen.length === 0 || chosen.length > 2) return null;
    return chosen.map(([title, said]) => title + ' ' + said).join(' and ');
}

/**
 * A move the diagram would not make, said to the student who tried it (P12).
 *
 * Here rather than in the engine for the reason every other phrase is: the
 * engine reports `{ reason: 'bounds', limit: 'max', max: 28 }` and stops, and
 * what a student should read is copy.
 *
 * Three sentences, addressed to three different situations.
 *
 * **A rule the author wrote** hands back the author's own sentence, verbatim.
 * That is the whole reason `message` exists on a restriction: whoever wrote the
 * economics is the one who can say why it does not hold, and an app paraphrasing
 * them would be guessing at the mechanism.
 *
 * **A rule that is not a rule** — a restriction whose expression did not resolve,
 * so it refuses everything — is the one case where the student did nothing at
 * all. Telling them "that isn't allowed" would be a lie that lands as their
 * mistake, so the sentence says plainly whose fault it is. The engine warns the
 * author separately, in the console.
 *
 * **A param's own end** names the param and the number, because "it stopped" is
 * something the student can already see. What they cannot see is where. Phrased
 * so it reads with a bare symbol as well as with a phrase: a diagram's params
 * are often called `a` and `c`, and the strip's own chips call them that too.
 */
export function phraseRefusal(
    refusal: ParamBlockedEvent,
    format: (value: number) => string
): string {
    if (refusal.reason === 'restriction') {
        const broken = refusal.restrictions.filter(r => !r.unresolved);
        if (broken.length === 0) {
            return 'The diagram is not accepting changes — that is a fault in the diagram, ' +
                'not in what you did.';
        }
        const spoken = broken.filter(r => !!r.message);
        if (spoken.length > 0) return spoken.map(r => r.message).join(' ');
        return 'That would break one of this diagram\'s rules.';
    }

    return refusal.limit === 'max'
        ? `${refusal.label} will not go above ${format(refusal.max)}.`
        : `${refusal.label} will not go below ${format(refusal.min)}.`;
}

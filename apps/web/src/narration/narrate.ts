import type { AffectedObject } from 'equilibria-engine-js';
import { phraseMechanism } from './phrasebook';

/**
 * What the student just did, and what followed from it — as data.
 *
 * A chain rather than a sentence: `a 20.0 → 24.0` · `demand shifts up` ·
 * `P* $11.0 → $13.0`. A paragraph explains; a chain shows the mechanism, and the
 * mechanism is the thing being learned. It also degrades a clause at a time, so
 * a diagram whose movement cannot be phrased still narrates cause and effect.
 *
 * This module is pure and returns structure, never a string. The component
 * renders it, the tests assert on it, and a translation later replaces words
 * without re-parsing English.
 *
 * Every number in it is formatted from the engine's own `precision`, and every
 * value it reads is one the engine computed. Nothing here re-derives a quantity
 * the diagram already knows: that is how a readout ends up disagreeing with the
 * picture beside it.
 */

/** Params and calcs as they stood at one moment. Both come from the engine. */
export interface Snapshot {
    params: Record<string, number>;
    calcs: Record<string, unknown>;
}

/** A param worth narrating: the engine's `ParamInfo`, narrowed to what is used. */
export interface NarratedParam {
    name: string;
    label: string;
    precision: number;
}

/**
 * A calc worth narrating, named by the app.
 *
 * The engine's `calcs` hold far more than the numbers a student should read —
 * every named object publishes its own geometry there — so which ones are
 * *results* is an editorial decision about economics, the same decision that
 * puts a headline number on a panel, and it is made in the same place.
 */
export interface NarratedCalc {
    name: string;
    label: string;
    /** Prefixed to the value, so the strip and a panel's chip read alike. */
    unit?: string;
}

/**
 * Decimal places for a calc.
 *
 * Params carry a `precision` derived from their `round`; calcs carry nothing at
 * all, and the plan left the rule open. One decimal, for every calc, chosen
 * because it is what the panel chips already show — the requirement is not that
 * the number be maximally precise but that two places on the screen never print
 * the same quantity differently. Inheriting from the params a calc derives from
 * would mean parsing its expression, and would have no answer for a calc built
 * from params of different precision.
 */
export const CALC_PRECISION = 1;

/** One `label from → to` unit of the chain. */
export interface Clause {
    /**
     * The param or calc this reads, which is also how it is addressed.
     *
     * Called `name` rather than `key` because a clause is spread into JSX to
     * render it, and `key` is React's own: a field by that name is silently
     * swallowed as the element's key and never reaches the component, which is
     * a bug that only shows up as a value that mysteriously will not render.
     */
    name: string;
    label: string;
    unit: string;
    /** Formatted. Absent while a gesture is still in flight, or at rest. */
    from?: string;
    to: string;
    /** Only when `from` is present, and only when the two differ. */
    direction?: 'up' | 'down';
}

export interface NarrationLine {
    /**
     * `rest` — nothing has moved since the snapshot; there is no chain to draw.
     * `live` — a gesture is in flight: current values, no arrows, no announcement.
     * `settled` — the gesture is over and the chain is the whole event.
     */
    kind: 'rest' | 'live' | 'settled';

    /**
     * The params that moved. Plural where the plan wrote one: a scenario (P9)
     * sets several at once, and a chain that could only describe one would have
     * to be rebuilt the day scenarios land.
     */
    causes: Clause[];

    /** What moved in the diagram, or `null` when the engine could not say. */
    mechanism: string | null;

    /** Every narrated calc whose displayed value changed. */
    effects: Clause[];

    /**
     * The calc a "why?" affordance should open the maths explainer on (P9).
     *
     * The first effect rather than the last: the app declares its calcs in the
     * order it considers them important, so the first is the headline of the
     * clause. With one effect the two readings agree, which is the case the plan
     * had in view.
     */
    whyTarget: string | null;
}

export interface NarrateInput {
    /** The engine's snapshot — the same "before" the diagram's ghosts are drawn from. */
    before: Snapshot | null;
    after: Snapshot;
    /** `kg:param_changed`'s `affected`. Omit and the middle clause is omitted. */
    affected?: AffectedObject[];
    /** Which params to narrate, in order. Presentation params must not be here. */
    params: NarratedParam[];
    /** Which calcs to narrate, in order of importance. */
    calcs: NarratedCalc[];
    /** True while a drag or scrub is still in flight. */
    live?: boolean;
}

/**
 * A number as the diagram would print it.
 *
 * Exported because the panel chips format with it too. Two formatters is one
 * more than there can be: `$40.5` beside `$40.50` is the reader's problem to
 * resolve and they should never have to.
 */
export function formatValue(value: number, precision: number): string {
    const text = value.toFixed(precision);
    // `(-0.04).toFixed(1)` is "-0.0". A minus in front of a zero reads as a
    // direction that is not there.
    return /^-0(\.0*)?$/.test(text) ? text.slice(1) : text;
}

/** Finite numbers only: an unparseable calc comes back from the engine as its own source text. */
function numeric(value: unknown): number | null {
    return typeof value === 'number' && isFinite(value) ? value : null;
}

function clause(
    name: string, label: string, unit: string, precision: number,
    beforeValue: unknown, afterValue: unknown, arrows: boolean
): Clause | null {

    const to = numeric(afterValue);
    if (to === null) return null;

    const toText = formatValue(to, precision);
    if (!arrows) return { name, label, unit, to: toText };

    const from = numeric(beforeValue);
    if (from === null) return null;

    const fromText = formatValue(from, precision);
    // Changed as *displayed*, which is the only change a reader can see. A calc
    // that moved by a ten-thousandth renders "11.0 → 11.0", which claims an
    // event happened and then fails to show one.
    if (fromText === toText) return null;

    return { name, label, unit, from: fromText, to: toText, direction: to > from ? 'up' : 'down' };
}

const REST: NarrationLine = { kind: 'rest', causes: [], mechanism: null, effects: [], whyTarget: null };

export function narrate(input: NarrateInput): NarrationLine {
    const { before, after, params, calcs, affected, live } = input;

    // No snapshot means nothing has been moved yet — the engine only takes one
    // when an interaction starts, so its absence is the rest state itself.
    if (!before) return REST;

    const causes = params
        .map(p => clause(p.name, p.label, '', p.precision,
            before.params[p.name], after.params[p.name], true))
        .filter((c): c is Clause => c !== null);

    const effects = calcs
        .map(c => clause(c.name, c.label, c.unit || '', CALC_PRECISION,
            before.calcs[c.name], after.calcs[c.name], true))
        .filter((c): c is Clause => c !== null);

    // Undo returns the params to the snapshot, so this is also how the strip
    // goes quiet again afterwards rather than needing to be told to.
    if (causes.length === 0 && effects.length === 0) return REST;

    if (live) {
        // The same clauses, as readings. A drag fires ~60 changes a second, and
        // "20.0 → 20.1" is not a mechanism — it is a frame. What a student can
        // use mid-drag is the current number; the chain is for when they let go.
        const reading = (c: Clause): Clause => ({ name: c.name, label: c.label, unit: c.unit, to: c.to });

        return {
            kind: 'live',
            causes: causes.map(reading),
            mechanism: null,
            effects: effects.map(reading),
            whyTarget: null
        };
    }

    return {
        kind: 'settled',
        causes,
        mechanism: affected ? phraseMechanism(affected) : null,
        effects,
        whyTarget: effects.length > 0 ? effects[0].name : null
    };
}

/**
 * The chain as one utterance, for a screen reader.
 *
 * Announced instead of the chips, not alongside them: read as elements, the
 * chain is a dozen fragments — a label, a number, an arrow glyph, another
 * number — and a student hears rubble. One sentence per settled interaction is
 * the whole accessibility requirement, and it is the same information.
 */
export function toSentence(line: NarrationLine): string {
    if (line.kind !== 'settled') return '';

    const moved = (c: Clause) => `${c.label} from ${c.unit}${c.from} to ${c.unit}${c.to}`;
    const list = (clauses: Clause[]) => clauses.map(moved).join(', ');

    const parts: string[] = [];
    if (line.causes.length > 0) parts.push('You changed ' + list(line.causes));
    if (line.mechanism) parts.push(line.mechanism);
    if (line.effects.length > 0) parts.push(list(line.effects));

    return parts.length > 0 ? parts.join('; ') + '.' : '';
}

/**
 * The param updates that put the diagram back where the snapshot found it.
 *
 * Only the params that actually moved, and only ones the app narrates — which
 * excludes every presentation param, so an undo does not also drag a promoted
 * panel back to whichever one was focal when the student took hold of the curve.
 * Empty when there is nothing to undo, which is what the button reads to decide
 * whether to exist.
 */
export function undoParams(line: NarrationLine, before: Snapshot | null): { name: string; value: number }[] {
    if (!before || line.kind !== 'settled') return [];
    return line.causes
        .map(c => ({ name: c.name, value: before.params[c.name] }))
        .filter(p => typeof p.value === 'number' && isFinite(p.value));
}

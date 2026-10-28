import type { AffectedObject } from 'equilibria-engine-js';
import { phraseMovements } from './phrasebook';

/**
 * What the student just did, and what followed from it — as data.
 *
 * A chain rather than a sentence: `a 20.0 → 24.0` · `demand shifts up` ·
 * `P* $11.00 → $13.00`. A paragraph explains; a chain shows the mechanism, and
 * the mechanism is the thing being learned. It also degrades a clause at a time,
 * so a diagram whose movement cannot be phrased still narrates cause and effect.
 *
 * This module is pure and returns structure, never a string. The component
 * renders it, the tests assert on it, and a translation later replaces words
 * without re-parsing English.
 *
 * Every param in it is formatted from the engine's own `precision` and every
 * calc from `calcPrecision`, and every value it reads is one the engine computed. Nothing here re-derives a quantity
 * the diagram already knows: that is how a readout ends up disagreeing with the
 * picture beside it.
 */

/** Params and calcs as they stood at one moment. Both come from the engine. */
export interface Snapshot {
    params: Record<string, number>;
    calcs: Record<string, unknown>;
}

/**
 * What a rise and a fall in one quantity mean, in a student's words.
 *
 * "The A$ appreciates", not "A$1 = ▲". A chain of numbers shows *that*
 * something moved; these say what the movement is called, which is the thing
 * a student is asked to write. They are the lesson's own words — the steps that
 * teach appreciation are titled with the same phrases — so exploring and the
 * lesson describe one event one way.
 *
 * Present tense and sentence case, each a whole clause: "Demand for A$
 * increases". Optional throughout: a quantity with none is narrated by its
 * label, as it always was, so a lesson can add them one at a time.
 */
export interface Reading {
    rise?: string;
    fall?: string;
}

/** A param worth narrating: the engine's `ParamInfo`, narrowed to what is used. */
export interface NarratedParam extends Reading {
    name: string;
    label: string;
    precision: number;
    /**
     * The colour its curve is drawn in, as CSS: the engine's own value for the
     * one the lesson names (`ParamWords.curve`). Absent where it names none.
     */
    color?: string;
}

/**
 * A calc worth narrating, named by the app.
 *
 * The engine's `calcs` hold far more than the numbers a student should read —
 * every named object publishes its own geometry there — so which ones are
 * *results* is an editorial decision about economics, the same decision that
 * puts a headline number on a panel, and it is made in the same place.
 */
export interface NarratedCalc extends Reading {
    name: string;
    label: string;
    /** Prefixed to the value, so the strip and a panel's chip read alike. */
    unit?: string;
    /** Decimal places, where the calc's unit has a view of its own. See `calcPrecision`. */
    precision?: number;
    /**
     * The calc as a symbol in a formula, where its label is not one.
     *
     * The Maths instrument writes a calc the way its label reads, so `P*` is
     * typeset `P^*` — the letter the diagram's dropline carries. A label written
     * to sit in front of a number, like the exchange rate's "A$1 =", is no
     * symbol at all, and this is what the formula calls it instead: `e^*`, as
     * the diagram does. TeX, because the formula is.
     */
    tex?: string;
    /**
     * What the label stands for, in plain words: "Equilibrium price".
     *
     * The heading over the calc in the Maths instrument. The strip and the
     * captions never print it — they are one line each, and a student reading
     * them has the diagram's own letters beside them.
     */
    meaning?: string;
}

/**
 * Decimal places for a calc that does not say.
 *
 * Params carry a `precision` derived from their `round`; calcs carry nothing at
 * all, and the plan left the rule open. One decimal by default — the requirement
 * is not that the number be maximally precise but that two places on the screen
 * never print the same quantity differently. Inheriting from the params a calc
 * derives from would mean parsing its expression, and would have no answer for
 * a calc built from params of different precision.
 */
export const CALC_PRECISION = 1;

/**
 * Decimal places for a calc: its own, or the default.
 *
 * Per calc rather than one number for all of them, because a unit has a
 * convention the default does not know about. Money is read to the cent — a
 * price of "$13.0" is a number nobody writes — while a quantity of 9.0 is fine
 * as it is. The calc declares it once, beside its unit, and every place that
 * prints the calc asks here: the strip, the panel captions and their change
 * chips, and the maths instrument.
 */
export function calcPrecision(calc: NarratedCalc | undefined): number {
    return calc && calc.precision !== undefined ? calc.precision : CALC_PRECISION;
}

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
    /**
     * What the move means, where the lesson says: its `rise` or its `fall`.
     * Only with a `direction`, since a reading mid-drag has none to mean.
     */
    words?: string;
    /**
     * A cause's curve colour, where its param has one. Mid-gesture as well as
     * after: which curve a param moves does not depend on which way it went,
     * so a marker drawn in it does not change colour when the student lets go.
     */
    color?: string;
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

    /**
     * The same, one moved object at a time: "demand for A$ shifts to the
     * right", "supply of US$ shifts to the right". `mechanism` is these joined
     * into the one clause a line has room for; a card lists them.
     */
    movements: string[];

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
    name: string, label: string, unit: string, precision: number, reading: Reading,
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

    const direction = to > from ? 'up' : 'down';
    const words = direction === 'up' ? reading.rise : reading.fall;
    return {
        name, label, unit, from: fromText, to: toText, direction,
        ...(words ? { words } : {})
    };
}

/** Nothing has moved: no chain, nothing to undo, nothing to ask "why?" about. */
export const REST: NarrationLine = {
    kind: 'rest', causes: [], mechanism: null, movements: [], effects: [], whyTarget: null
};

export function narrate(input: NarrateInput): NarrationLine {
    const { before, after, params, calcs, affected, live } = input;

    // No snapshot means nothing has been moved yet — the engine only takes one
    // when an interaction starts, so its absence is the rest state itself.
    if (!before) return REST;

    const causes = params
        .map(p => {
            const c = clause(p.name, p.label, '', p.precision, p,
                before.params[p.name], after.params[p.name], true);
            return c && p.color ? { ...c, color: p.color } : c;
        })
        .filter((c): c is Clause => c !== null);

    const effects = calcs
        .map(c => clause(c.name, c.label, c.unit || '', calcPrecision(c), c,
            before.calcs[c.name], after.calcs[c.name], true))
        .filter((c): c is Clause => c !== null);

    // Undo returns the params to the snapshot, so this is also how the strip
    // goes quiet again afterwards rather than needing to be told to.
    if (causes.length === 0 && effects.length === 0) return REST;

    if (live) {
        // The same clauses, as readings. A drag fires ~60 changes a second, and
        // "20.0 → 20.1" is not a mechanism — it is a frame. What a student can
        // use mid-drag is the current number; the chain is for when they let go.
        const reading = (c: Clause): Clause => ({
            name: c.name, label: c.label, unit: c.unit, to: c.to,
            ...(c.color ? { color: c.color } : {})
        });

        return {
            kind: 'live',
            causes: causes.map(reading),
            mechanism: null,
            movements: [],
            effects: effects.map(reading),
            whyTarget: null
        };
    }

    const movements = affected ? phraseMovements(affected) : [];

    return {
        kind: 'settled',
        causes,
        mechanism: movements.length > 0 ? movements.join(' and ') : null,
        movements,
        effects,
        whyTarget: effects.length > 0 ? effects[0].name : null
    };
}

/**
 * The line, less what it says about numbers the stage is not drawing.
 *
 * A lesson brings its panels in a few at a time, and a calc that is a panel's
 * headline is that panel's number: "The USD depreciates" is the USD market's,
 * and before the lesson has drawn that market it is a clause about a picture
 * the student cannot see. The engine already leaves out the curves it is not
 * drawing (`whatMoved` narrates only what is shown); this does the same for
 * the numbers. "Why?" goes to the first effect left, as it went to the first.
 *
 * The same line, the same object, where nothing is left out, so a screen that
 * asks on every render hands its components nothing new.
 */
export function leaveOut(line: NarrationLine, calcs: string[]): NarrationLine {
    if (calcs.length === 0) return line;
    const effects = line.effects.filter(c => calcs.indexOf(c.name) < 0);
    if (effects.length === line.effects.length) return line;

    // As `narrate` has it: with neither a cause nor an effect, nothing moved.
    if (line.causes.length === 0 && effects.length === 0) return REST;
    return {
        ...line,
        effects,
        whyTarget: line.whyTarget !== null && effects.length > 0 ? effects[0].name : null
    };
}

/**
 * The colour the chain's curves are drawn in, where that is one colour: every
 * cause has one and they agree. `null` otherwise, and at rest.
 *
 * One answer for the causes and for the curves they moved, because a lesson
 * says of a param that every curve it moves is drawn in its colour — so where
 * the causes agree, so does everything under them. Where they do not, one
 * marker cannot be both, and either would tie a cause to the other's curve.
 */
export function curveColor(line: NarrationLine): string | null {
    const first = line.causes.length > 0 ? line.causes[0].color : undefined;
    return first && line.causes.every(c => c.color === first) ? first : null;
}

/**
 * Words written to open a sentence, set inside one: "the A$ appreciates".
 * An acronym keeps its capitals — "A$ …", "RBA …" — which is why this looks at
 * the second letter before touching the first.
 */
function midSentence(words: string): string {
    return /^[A-Z][a-z]/.test(words) ? words.charAt(0).toLowerCase() + words.slice(1) : words;
}

/**
 * The chain as one utterance, for a screen reader.
 *
 * Announced instead of the chips, not alongside them: read as elements, the
 * chain is a dozen fragments — a label, a number, an arrow glyph, another
 * number — and a student hears rubble. One sentence per settled interaction is
 * the whole accessibility requirement, and it is the same information.
 *
 * A clause with words is said as what it means — "the A$ appreciates from
 * US$0.65 to US$0.70" — and one without as what it is called, so a reader
 * hears what a sighted student reads. The causes are said one way or the other
 * as a set: "You changed" can only be followed by names.
 */
export function toSentence(line: NarrationLine): string {
    if (line.kind !== 'settled') return '';

    const span = (c: Clause) => `from ${c.unit}${c.from} to ${c.unit}${c.to}`;
    const named = (c: Clause) => `${c.label} ${span(c)}`;
    const meant = (c: Clause) => (c.words ? `${midSentence(c.words)} ${span(c)}` : named(c));

    const parts: string[] = [];
    if (line.causes.length > 0) {
        parts.push(line.causes.every(c => !!c.words)
            ? line.causes.map(meant).join(', ')
            : 'You changed ' + line.causes.map(named).join(', '));
    }
    if (line.mechanism) parts.push(line.mechanism);
    if (line.effects.length > 0) parts.push(line.effects.map(meant).join(', '));

    if (parts.length === 0) return '';
    const sentence = parts.join('; ') + '.';
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/**
 * What the live region says for one event: a refusal (P12), then the chain.
 *
 * Both, for a screen reader, where the eye may get only one. A sighted student
 * reads the refusal and can *see* where the curve stopped; there is nothing to
 * see if you cannot, so the numbers are still the account of what happened.
 * The strip and the card say the same sentence for the same event, which is
 * what lets either stand in for the other at any width.
 */
export function announcement(line: NarrationLine, refusal?: string | null): string {
    const chain = toSentence(line);
    return refusal ? (chain ? refusal + ' ' + chain : refusal) : chain;
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

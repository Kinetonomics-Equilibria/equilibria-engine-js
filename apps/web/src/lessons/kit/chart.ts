import { ONCE_REVEALED, UNLESS_ASKING, UNTIL_SUBMITTED, WHILE_ASKING, answerOf, startOf } from './question';

/**
 * The chart's house rules as functions (P16): a helper for each kind of thing
 * `docs/chart-design.md` describes, so that following a rule is what the
 * helper does by default, and breaking one has to be said.
 *
 * Every helper here is one that at least two lessons wrote for themselves. A
 * chart that needs something else writes a raw engine object beside the
 * kit's, as the café's curve does, and `chartRules.test.ts` holds both to the
 * same rules. What the helpers take is what the rules allow — a colour by
 * what it means, a symbol from the list — and nothing sets a type size or a
 * line weight, which the engine's defaults decide.
 */

/**
 * What a thing on a chart means, which is the colour it is drawn in: the
 * Colour section's table, a name per concept (`colors.demand`, never
 * `colors.blue`). A new one goes into the doc and `EconSchema` first.
 */
export const MEANINGS = ['demand', 'supply', 'equilibriumPrice', 'ppf', 'choice', 'price', 'combination'] as const;
export type Meaning = typeof MEANINGS[number];

export const colourOf = (meaning: Meaning) => `colors.${meaning}`;

/** The symbols a curve is labelled with, as the engine is given them (Symbols). */
export const CURVE_SYMBOLS = ['D', 'S', '\\text{PPC}'] as const;
export type CurveSymbol = typeof CURVE_SYMBOLS[number];

/** What a ghost adds to its curve's symbol, D₀, and what the answer to a question adds, D₁. */
export const GHOST_SUFFIX = '_0';
export const ANSWER_SUFFIX = '_1';

/** The symbols a dropline or a price line puts on an axis (Symbols). */
export const AXIS_SYMBOLS = ['P^*', 'Q^*', 'P', 'P_1', 'Q_d', 'Q_s', 'e^*', '1/e^*'] as const;
export type AxisSymbol = typeof AXIS_SYMBOLS[number];

/**
 * A rule an object breaks on purpose, and why: `CLAUDE.md`'s "say why in a
 * comment beside the config", in a form a test can read. `rule` is the
 * heading of the section of `docs/chart-design.md` it breaks, and the doc
 * lists the object under "Where today's charts differ".
 *
 * Allowed on any object, raw or the kit's. `defineLesson` takes it off before
 * the engine sees the config, and keeps it on the model as `brokenRules`.
 */
export interface BrokenRule {
    rule: string;
    why: string;
}

/** An expression for each param a shape is drawn from, by the param's name: `{ demand: 'params.demand' }`. */
export type Drawn = Record<string, string>;

const capitalised = (name: string) => name[0].toUpperCase() + name.slice(1);

const live = (params: string[]): Drawn =>
    params.reduce((out, name) => ({ ...out, [name]: `params.${name}` }), {} as Drawn);
const started = (params: string[]): Drawn =>
    params.reduce((out, name) => ({ ...out, [name]: `params.${startOf(name)}` }), {} as Drawn);
const answered = (params: string[]): Drawn =>
    params.reduce((out, name) => ({ ...out, [name]: `params.${answerOf(name)}` }), {} as Drawn);

/** True once a verdict has drawn the answer, and the answer moved one of `params` off where it started. */
const answerDiffers = (params: string[]) =>
    `${ONCE_REVEALED} and (${params.map(name => `params.${answerOf(name)} != params.${startOf(name)}`).join(' or ')})`;

const reason = (breaksRule?: BrokenRule) => breaksRule ? { breaksRule } : {};

// ---------------------------------------------------------------------------
// Axes

export interface AxisDefinition {
    title: string;
    min: number;
    max: number;
    /** Where this axis crosses the other one, where that is not 0: an exchange rate's. */
    intercept?: number;
    /** The same number of decimals on every tick. */
    tickPrecision?: number;
}

/**
 * An axis, titled in words with its unit, sentence case: "Price ($)",
 * "Thousands of pairs a year" (Axes).
 *
 * `$` is written as it is read. The engine typesets an axis title, and a bare
 * `$` would start maths, so the kit escapes it: a title is never written
 * `'Price (\\$)'` by hand again. Size an axis to the sliders, not to the
 * start: the furthest any curve can reach, and a little room past it.
 */
export function axis(title: string, min: number, max: number,
    options: { intercept?: number; tickPrecision?: number } = {}): AxisDefinition {
    return { title: title.replace(/\\?\$/g, '\\$'), min, max, ...options };
}

/** The price axis, from 0: "Price ($)". `$` on its own is Australian dollars. */
export const priceAxis = (max: number) => axis('Price ($)', 0, max);

// ---------------------------------------------------------------------------
// Curves

/** One way a curve is dragged. The kit freezes it once an answer is committed. */
export type CurveDrag = { horizontal: string } | { vertical: string } | Record<string, unknown>;

export interface CurveSpec {
    /** Its address: a lesson step reveals it by this, and it is unique in the model. */
    name: string;
    /**
     * What it is called in words, lower case, the same in every panel it is
     * drawn in: "demand", "supply of AUD". What "What changed" says it did.
     */
    title: string;
    /** What a screen reader calls it. Its title, as a heading says it, unless given. */
    srTitle?: string;
    meaning: Meaning;
    symbol: CurveSymbol;
    /** `Line` for one written as an intercept and a slope; `Curve` (the default) for a function. */
    type?: 'Line' | 'Curve';
    /** The params its shape is drawn from, which a question can be about. */
    moves: string[];
    /**
     * Its shape, from an expression for each param in `moves`: the def's
     * `fn`, `samplePoints` and the rest. Called with `params.demand` for the
     * curve now, and with `params.startDemand` and `params.answerDemand` for
     * the question's start and answer, so all three are one definition.
     */
    shape: (p: Drawn) => Record<string, unknown>;
    /**
     * Where its label sits along it, from the same params: `{ x }` on a
     * `Line`, `{ y }` on a curve written as Q = f(P). The author's to give,
     * as a calc, because only the author knows where the curve ends across
     * the sliders (Labels on the plot: at the right-hand end, and on the plot
     * at every position the sliders allow).
     */
    labelAt: (p: Drawn) => Record<string, unknown>;
    /** How a student drags it. Frozen once an answer is committed, unless a drag says otherwise. */
    drag?: CurveDrag[];
    /** Draw where it was, D₀, standing down while a question is on screen. */
    ghost?: boolean;
    /** Draw the start and the answer of a question about it. */
    asked?: boolean;
    breaksRule?: BrokenRule;
}

/**
 * A curve, now: solid, in its meaning's colour, labelled with its symbol
 * where the author says, and named for a screen reader. With `ghost`, the
 * engine draws where it was from this same def, dashed and labelled D₀ while
 * the curve stays D. With `asked`, it is followed by its question's lines
 * (`questionLines`).
 */
export function curve(spec: CurveSpec): object[] {
    const p = live(spec.moves);
    const now = {
        type: spec.type || 'Curve',
        def: {
            name: spec.name, title: spec.title,
            ...spec.shape(p),
            color: colourOf(spec.meaning),
            srTitle: spec.srTitle || capitalised(spec.title),
            label: { text: spec.symbol, ...spec.labelAt(p) },
            ...(spec.drag ? { drag: spec.drag.map(d => ({ draggable: UNTIL_SUBMITTED, ...d })) } : {}),
            ...(spec.ghost ? { ghost: { show: UNLESS_ASKING, label: GHOST_SUFFIX } } : {}),
            ...reason(spec.breaksRule)
        }
    };
    return [now, ...(spec.asked ? questionLines(spec) : [])];
}

/**
 * Where a question found a curve, and where its answer puts it.
 *
 * The start is drawn like a ghost, dashed and at 35%, while the question is
 * on screen: the one "before" drawn by hand, because it is set from params
 * when the question is asked, where a ghost is per gesture. The answer is
 * dotted at full strength, labelled with the curve's symbol and ₁, and drawn
 * only once a verdict shows it and only where it differs from the start:
 * nothing on screen to aim at while the student answers, and nothing drawn
 * on top of the start for a question about something else.
 *
 * Named for the first param in `moves`: `questionStartDemand`. For a raw
 * curve that cannot be the kit's, like the café's, on its own.
 */
export function questionLines(spec: Pick<CurveSpec, 'meaning' | 'symbol' | 'type' | 'moves' | 'shape' | 'labelAt'>): object[] {
    const type = spec.type || 'Curve', called = capitalised(spec.moves[0]), color = colourOf(spec.meaning);
    return [
        {
            type,
            def: {
                name: 'questionStart' + called, title: '',
                ...spec.shape(started(spec.moves)),
                color, lineStyle: 'dashed', strokeOpacity: 0.35,
                show: WHILE_ASKING
            }
        },
        {
            type,
            def: {
                name: 'questionAnswer' + called, title: '',
                ...spec.shape(answered(spec.moves)),
                color, lineStyle: 'dotted',
                label: { text: spec.symbol + ANSWER_SUFFIX, ...spec.labelAt(answered(spec.moves)) },
                show: answerDiffers(spec.moves)
            }
        }
    ];
}

// ---------------------------------------------------------------------------
// Points

/**
 * Where a market clears: the green point, read off both axes by its
 * droplines, and not lettered — its droplines name it (Points, Droplines).
 * With `ghost`, the engine draws where it cleared before and the arrow
 * between, and gives the ghost no droplines: two P*s would contradict.
 */
export function equilibrium(spec: {
    name: string;
    x: string;
    y: string;
    /** The quantity's symbol, then the price's: `['Q^*', 'P^*']`. */
    droplines: [AxisSymbol, AxisSymbol];
    srTitle?: string;
    ghost?: boolean;
    breaksRule?: BrokenRule;
}): object {
    return {
        type: 'Point',
        def: {
            name: spec.name, title: 'equilibrium',
            x: spec.x, y: spec.y,
            color: colourOf('equilibriumPrice'),
            droplines: { vertical: spec.droplines[0], horizontal: spec.droplines[1] },
            srTitle: spec.srTitle || 'Equilibrium',
            ...(spec.ghost ? { ghost: true } : {}),
            ...reason(spec.breaksRule)
        }
    };
}

/**
 * A price set or taken as given, across the plot: dotted, to read points
 * against, and labelled P on the price axis as a dropline is (Lines). In
 * `choice` where a seller sets it, and in `price` against supply, whose
 * orange `choice` would be.
 *
 * Two objects, `priceLine` and `priceSymbol`, which the step that brings the
 * price in reveals by name.
 */
export function priceLine(spec: { param: string; across: [number, number]; meaning: 'choice' | 'price' }): object[] {
    const at = `params.${spec.param}`, color = colourOf(spec.meaning);
    return [
        {
            type: 'Segment',
            def: {
                name: 'priceLine', title: '',
                a: [spec.across[0], at], b: [spec.across[1], at],
                color, lineStyle: 'dotted'
            }
        },
        {
            type: 'Label',
            def: { name: 'priceSymbol', title: '', x: 'AXIS', y: at, text: 'P', color }
        }
    ];
}

/**
 * The point a price picks on a curve: what buyers want, or sellers offer, at
 * it. Dragged up and down by the price, read off the axes at its quantity
 * and at P, and in the price's colour rather than the curve's, because the
 * price moves it along the curve and the curve is what moves for everything
 * else. Untitled, so "What changed" says what the price and the quantity did
 * rather than that a point moved.
 *
 * `at` is where it is across: the quantity on the curve at a price, from an
 * expression for the price and for each param of the curve it sits on —
 * one definition for the point, and for the question's start and answer.
 * `x` is where it is now, where a calc already says so: the quantity the
 * caption reads, which is `at` of the params now. Placed by the calc, the
 * point is drawn by the price alone, as its colour says; placed by `at`, it
 * would read as drawn by the curve's params too.
 *
 * With `asked`, preceded by where it was when a question was asked, drawn
 * as a ghost point is; and where the answer puts it once a verdict shows it,
 * read off the price axis at P₁: on the curve as the question found it, at
 * the price the answer moves it to, and never for a question about the
 * curve, whose answer leaves the price where it started.
 */
export function pricePoint(spec: {
    name: string;
    meaning: 'choice' | 'price';
    /** The param that moves it: the price. */
    price: string;
    /** The params of the curve it sits on. */
    on: string[];
    at: (p: Drawn) => string;
    x?: string;
    quantity: AxisSymbol;
    srTitle: string;
    show?: string;
    asked?: boolean;
}): object[] {
    const color = colourOf(spec.meaning), all = [spec.price, ...spec.on], called = capitalised(spec.price);
    const now = {
        type: 'Point',
        def: {
            name: spec.name, title: '',
            x: spec.x || spec.at(live(all)), y: `params.${spec.price}`,
            color,
            ...(spec.show ? { show: spec.show } : {}),
            droplines: { vertical: spec.quantity, horizontal: 'P' },
            drag: [{ vertical: spec.price, draggable: UNTIL_SUBMITTED }],
            srTitle: spec.srTitle,
            ghost: { show: UNLESS_ASKING }
        }
    };
    if (!spec.asked) return [now];
    return [
        {
            type: 'Point',
            def: {
                name: 'questionStart' + called, title: '',
                x: spec.at(started(all)), y: `params.${startOf(spec.price)}`,
                color, opacity: 0.35, strokeOpacity: 0.35,
                show: WHILE_ASKING
            }
        },
        {
            type: 'Point',
            def: {
                name: 'questionAnswer' + called, title: '',
                x: spec.at({ ...started(spec.on), ...answered([spec.price]) }), y: `params.${answerOf(spec.price)}`,
                color,
                droplines: { horizontal: 'P_1' },
                show: answerDiffers([spec.price])
            }
        },
        now
    ];
}

// ---------------------------------------------------------------------------
// Areas

/**
 * An area the lesson names: consumer surplus, revenue. In the colour of what
 * it belongs to, at the default 20% with no outline (Points and areas), and
 * named for a screen reader. `type` is the engine's: `Area` between two
 * functions, or `Rectangle` between two corners.
 */
export function namedArea(spec: {
    name: string;
    title?: string;
    meaning: Meaning;
    type?: 'Area' | 'Rectangle';
    shape: Record<string, unknown>;
    srTitle: string;
}): object {
    return {
        type: spec.type || 'Area',
        def: {
            name: spec.name,
            ...(spec.title !== undefined ? { title: spec.title } : {}),
            ...spec.shape,
            color: colourOf(spec.meaning),
            srTitle: spec.srTitle
        }
    };
}

/** A region that is context, like what a café can make under its PPC: 8%, untitled. */
export function contextArea(spec: {
    name: string;
    meaning: Meaning;
    shape: Record<string, unknown>;
    srTitle: string;
}): object {
    const area = namedArea({ ...spec, title: '' }) as { type: string; def: Record<string, unknown> };
    return { ...area, def: { ...area.def, opacity: 0.08 } };
}

// ---------------------------------------------------------------------------
// Annotations

/**
 * A line of a readout: a line or two about what is drawn, in the top-right
 * corner of the plot, right-aligned, plain text in the colour of what it is
 * about (Annotations).
 *
 * Hung from `corner` a fixed number of pixels apart, 24 a line, because the
 * text is a fixed size and the plot is not: spaced in the plot's units, two
 * lines that sat apart on a laptop ran into each other on a phone. `corner`
 * is the plot's top right in its units, where no curve reaches across the
 * lesson's ranges.
 */
export function readout(spec: {
    name: string;
    line: number;
    text: string;
    corner: [number, number];
    meaning: Meaning;
    show?: string;
}): object {
    return {
        type: 'Label',
        def: {
            name: spec.name, title: '', x: spec.corner[0], y: spec.corner[1], text: spec.text, plainText: true,
            align: 'right', xPixelOffset: -5, yPixelOffset: -(12 + 24 * spec.line),
            color: colourOf(spec.meaning),
            ...(spec.show ? { show: spec.show } : {})
        }
    };
}

/** A count with its unit in words, counted properly: "1 coffee", "2 coffees". */
export const counted = (n: string, word: string) =>
    `concat(string(${n}), ${n} == 1 ? " ${word}" : " ${word}s")`;

/** A number to a fixed number of decimals, as the caption prints it. */
export const fixed = (n: string, precision: number) =>
    `format(${n}, {notation: "fixed", precision: ${precision}})`;


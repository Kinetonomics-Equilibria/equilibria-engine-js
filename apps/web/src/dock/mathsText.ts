import { parse } from 'mathjs';
import { formatValue } from '../narration/narrate';
import type { NarratedCalc } from '../narration/narrate';

/**
 * Turning a calc into something a student can read.
 *
 * The whole reframe P9 rests on: `calcs` already hold their own formulas as
 * strings, so a maths explainer is that string typeset with today's numbers in
 * it — not a second body of content that someone writes per diagram and then
 * keeps in sync until they stop.
 *
 * What the engine stores is not directly presentable, though. `params.a` is how
 * an expression *addresses* a param, and mathjs `toTex` renders that address
 * literally, so a student reads `params.a` where `a` belongs. Everything here is
 * the gap between an address and a name.
 */

/** `params.a`, `calcs.Qe`, `prev.calcs.Pe` — the three scopes an author writes. */
const SCOPED = /\b(prev\.)?(params|calcs)\.([A-Za-z_][A-Za-z0-9_]*)/g;

/** One scoped reference, as `rewriteScopes` finds it. */
export interface Reference {
    scope: string;
    name: string;
    isPrev: boolean;
}

export type Rewriter = (isPrev: boolean, scope: string, name: string) => string;

/** Replace every scoped reference in an expression, leaving the rest alone. */
export function rewriteScopes(expression: string, fn: Rewriter): string {
    return expression.replace(SCOPED, (_m, prev, scope, name) => fn(!!prev, scope, name));
}

/** Every calc and param a calc's expression depends on, in order of appearance. */
export function referencesOf(expression: string): Reference[] {
    const out: Reference[] = [];
    rewriteScopes(expression, (isPrev, scope, name) => {
        const seen = out.some(r => r.scope === scope && r.name === name && r.isPrev === isPrev);
        if (!seen) out.push({ scope, name, isPrev });
        return '';
    });
    return out;
}

/**
 * A token that survives mathjs's parser and is recognisable afterwards.
 *
 * Every reference goes through the parser as one of these and comes out as
 * whatever the line wants in its place: a symbol on the formula line, a number
 * on the substituted one. Neither can go in as itself. `prev.calcs.Pe` has to
 * become a *name* to be parsed at all, and the obvious spelling — `Pe_before` —
 * comes back from `toTex` as `Pe\_before`, an escaped underscore rather than a
 * subscript. And a number is *normalised* by the parser: `24.0` is read as a
 * number and emitted as `24`, which would print a quantity one way here and
 * another way in the narration strip and the panel chips — the one thing every
 * number on this screen is arranged to avoid. So each goes through as an
 * opaque symbol, and `toTex`'s own `handler` writes it on the way out.
 */
const TOKEN = 'KGREF';

/**
 * The expression as TeX, with each reference written by `write`.
 *
 * `null` when mathjs cannot parse it, which is not by itself a defect — colors,
 * label text and forward references all live in the same map and all
 * legitimately fail — or when `write` has nothing to put somewhere.
 *
 * `parenthesis: 'auto'` because the default keeps the author's own brackets,
 * and an author writes `(a + c)/2` on one line to mean what the fraction bar
 * already says: `\frac{(a+c)}{2}` is a bracket a student has to read past.
 * Brackets the arithmetic needs — the `(a - P*)` in consumer surplus — stay.
 */
function typeset(
    expression: string,
    write: (ref: Reference) => string | null,
    implicit: 'hide' | 'show'
): string | null {
    const written: string[] = [];
    let missing = false;

    const tokenised = rewriteScopes(expression, (isPrev, scope, name) => {
        const tex = write({ scope, name, isPrev });
        if (tex === null) {
            missing = true;
            return name;
        }
        written.push(tex);
        return TOKEN + (written.length - 1);
    });

    if (missing) return null;

    // Spaced and braced, as mathjs writes its own symbols spaced. It glues an
    // operator to whatever follows, so `Q^*` after a product came out as
    // `\cdotQ^*` — one command TeX has never heard of. And a group, so a
    // power of a starred symbol is `{e^*}^{2}` rather than a double superscript.
    const handler = (node: { type: string; name?: string }) => {
        const name = node.type === 'SymbolNode' ? node.name || '' : '';
        return name.indexOf(TOKEN) === 0 ? ' {' + written[+name.slice(TOKEN.length)] + '}' : undefined;
    };

    try {
        return parse(tokenised).toTex({ parenthesis: 'auto', implicit, handler });
    } catch {
        return null;
    }
}

/** TeX's specials, escaped as text mode needs them: "US$" is `US\$`. */
function escapeText(text: string): string {
    return text.replace(/[\\$%&#_{}]/g, c => c === '\\' ? '\\textbackslash{}' : '\\' + c);
}

/** Words, set upright: `\text{CS}`. */
export function textTex(text: string): string {
    return '\\text{' + escapeText(text) + '}';
}

/** A label that is one letter, starred or not: `P*`, `Q*`, `a`. */
const SYMBOL = /^([A-Za-z])(\*?)$/;

/**
 * A name or a label, as a formula should write it.
 *
 * A symbol is typeset as one: `P*` is `P^*`, which is what the diagram's
 * droplines carry, and `a` stays an italic `a`. Anything longer is a word and
 * is set upright, because TeX reads `Pe` as the product of P and e — and sets
 * it in italics to match, which is exactly how the audit read it — and `demand`
 * as six variables multiplied together.
 */
export function nameTex(label: string): string {
    const symbol = SYMBOL.exec(label);
    if (symbol) return symbol[1] + (symbol[2] ? '^*' : '');
    return textTex(label);
}

/** How a formula writes a reference, by its scope (`params` or `calcs`) and name. */
export type Symbols = (scope: string, name: string) => string;

/** Each reference by its own name: what a calc gets with no lesson to name it. */
export const NAMES: Symbols = (_scope, name) => nameTex(name);

/**
 * A lesson's symbols: a calc by its `tex`, or by its label where the label is a
 * symbol, and a param by its name — which for a param is the letter the curves
 * are written in, and what the strip and the sliders call it.
 */
export function lessonSymbols(narrated: Record<string, NarratedCalc>): Symbols {
    return (scope, name) => {
        const calc = scope === 'calcs' ? narrated[name] : undefined;
        if (calc && calc.tex) return calc.tex;
        return nameTex(calc ? calc.label : name);
    };
}

/**
 * The expression with its addresses reduced to symbols: `\frac{a-c}{2}`.
 *
 * `symbols` is where the lesson comes in. A calc is written the way the
 * lesson labels it — `P^*`, not `Pe` — so a formula that uses one calc to
 * compute another reads in the diagram's own letters. A `prev` reference is
 * the same symbol, subscripted.
 */
export function toSymbolicTex(expression: string, symbols: Symbols = NAMES): string | null {
    return typeset(expression, ({ scope, name, isPrev }) => {
        const symbol = symbols(scope, name);
        return isPrev ? '{' + symbol + '}_{\\text{before}}' : symbol;
    }, 'hide');
}

/**
 * Decimal places for one reference, by its scope (`params` or `calcs`) and name.
 *
 * Per reference rather than one number for the line, because a line mixes
 * them: `0.5 * Qe * (a - Pe)` holds a quantity, a param and a price, and the
 * price is printed to the cent everywhere else on the screen.
 */
export type Places = (scope: string, name: string) => number;

/**
 * The same expression with today's numbers in place of the names.
 *
 * This is the line that does the teaching — the other two are its endpoints —
 * so it is the one that must not quietly render a hole. A reference with no
 * value returns `null` for the whole line rather than substituting `undefined`
 * into arithmetic that will then look authoritative.
 *
 * Implicit multiplication is shown, because `2a` with `a` substituted is
 * `2\cdot 24.0`, and hidden it would be `2~24.0` — a number that reads as 224.
 */
export function toSubstitutedTex(
    expression: string,
    values: Record<string, unknown>,
    params: Record<string, number>,
    prevCalcs: Record<string, unknown> | null,
    places: Places
): string | null {
    return typeset(expression, ({ scope, name, isPrev }) => {
        const source = isPrev ? prevCalcs : (scope === 'params' ? params : values);
        const value = source ? source[name] : undefined;
        if (typeof value !== 'number' || !isFinite(value)) return null;

        const shown = formatValue(value, places(scope, name));
        // Bracketed, or `a - -3` reads as a double negation rather than a
        // subtraction. Done here rather than before parsing so the parser
        // never sees a sign it might fold into the constant.
        return shown.charAt(0) === '-' ? '\\left(' + shown + '\\right)' : shown;
    }, 'show');
}

/**
 * The calc's value as the line's last step: `\text{\$}13.00`, `\text{US\$}0.65`.
 *
 * With the unit, and to the decimals, that the caption and the strip print it
 * at — they are given the same `NarratedCalc` — and typeset, because a result
 * in the page's sans-serif under two lines of maths reads as a different kind
 * of thing from the working above it, and it is the same kind of thing.
 */
export function toResultTex(value: number, places: number, unit = ''): string {
    return (unit ? textTex(unit) : '') + formatValue(value, places);
}

/**
 * A line reduced to what it says, for telling two lines apart: no spacing, and
 * no braces that only wrap another group. `typeset` braces every reference, so
 * `1/calcs.rate` comes out as `\frac{1}{ {e^*}}`, which says `\frac{1}{e^*}`.
 */
function squash(tex: string): string {
    let out = tex.replace(/\s+/g, ''), was: string;
    do {
        was = out;
        out = out.replace(/\{\{([^{}]*)\}\}/g, '{$1}').replace(/^\{([^{}]*)\}$/, '$1');
    } while (out !== was);
    return out;
}

/**
 * The lines as one derivation, aligned on their equals signs:
 *
 *     P* = (a + c)/2
 *        = (24.0 + 2.0)/2
 *        = $13.00
 *
 * Each line after the symbol is one `step`. A step that is missing is left
 * out, and so is one that says what the line before it said — the formula of
 * a calc written in terms of a single other calc, like `1/e*` for the price of
 * US$1, is the symbol it is being explained by.
 *
 * `aligned` sets its cells in display style, so a fraction is a fraction
 * rather than a pair of numbers stacked at the height of the text beside them.
 */
export function toWorkingTex(symbol: string, steps: (string | null)[]): string {
    const lines: string[] = [];
    let last = squash(symbol);

    steps.forEach(step => {
        if (step === null || squash(step) === last) return;
        lines.push(step);
        last = squash(step);
    });

    return '\\begin{aligned}' + symbol + ' &= ' + lines.join(' \\\\ &= ') + '\\end{aligned}';
}

/**
 * Can this calc be shown as maths at all?
 *
 * Parsing is not the test. `colors.demand` parses perfectly well — mathjs reads
 * it as a property access — and typesetting it produces confident nonsense. The
 * test that actually separates a formula from a color name is whether the thing
 * the engine computed from it is a number.
 */
export function isTypesettable(value: unknown): boolean {
    return typeof value === 'number' && isFinite(value);
}

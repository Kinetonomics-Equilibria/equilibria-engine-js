import { parse } from 'mathjs';

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

/**
 * A token that survives mathjs's parser and is recognisable afterwards.
 *
 * `prev.calcs.Pe` has to become a *name* to be parsed at all, and the obvious
 * spelling — `Pe_before` — comes back from `toTex` as `Pe\_before`, an escaped
 * underscore rather than a subscript. So it goes through as one identifier and
 * is turned into a subscript in the LaTeX afterwards.
 */
const BEFORE_SUFFIX = 'BEFORE';

/** Stands in for a value while the parser runs; see `toSubstitutedTex`. */
const PLACEHOLDER = 'KGVALUE';

export type Rewriter = (isPrev: boolean, scope: string, name: string) => string;

/** Replace every scoped reference in an expression, leaving the rest alone. */
export function rewriteScopes(expression: string, fn: Rewriter): string {
    return expression.replace(SCOPED, (_m, prev, scope, name) => fn(!!prev, scope, name));
}

/** Every calc and param a calc's expression depends on, in order of appearance. */
export function referencesOf(expression: string): { scope: string; name: string; isPrev: boolean }[] {
    const out: { scope: string; name: string; isPrev: boolean }[] = [];
    rewriteScopes(expression, (isPrev, scope, name) => {
        const seen = out.some(r => r.scope === scope && r.name === name && r.isPrev === isPrev);
        if (!seen) out.push({ scope, name, isPrev });
        return '';
    });
    return out;
}

/** `PeBEFORE` → `Pe_{\text{before}}`, after mathjs has finished with the string. */
function subscriptBefore(tex: string): string {
    return tex.replace(
        new RegExp('([A-Za-z][A-Za-z0-9]*)' + BEFORE_SUFFIX, 'g'),
        (_m, name) => name + '_{\\text{before}}'
    );
}

/**
 * The expression with its addresses reduced to names: `(a - c)/2`.
 *
 * Returns `null` when mathjs cannot parse it, which is not by itself a defect —
 * colors, label text and forward references all live in the same map and all
 * legitimately fail. The caller shows the raw string instead.
 */
export function toSymbolicTex(expression: string): string | null {
    const named = rewriteScopes(expression, (isPrev, _s, name) => isPrev ? name + BEFORE_SUFFIX : name);
    try {
        return subscriptBefore(parse(named).toTex());
    } catch {
        return null;
    }
}

/**
 * The same expression with today's numbers in place of the names.
 *
 * This is the line that does the teaching — the other two are its endpoints —
 * so it is the one that must not quietly render a hole. A reference with no
 * value returns `null` for the whole line rather than substituting `undefined`
 * into arithmetic that will then look authoritative.
 */
export function toSubstitutedTex(
    expression: string,
    values: Record<string, unknown>,
    params: Record<string, number>,
    prevCalcs: Record<string, unknown> | null,
    precision: number
): string | null {
    let missing = false;
    const shown: string[] = [];

    // Placeholders rather than the numbers themselves, because mathjs
    // *normalises* a constant it parses: `24.0` is read as a number and emitted
    // as `24`. That would print a quantity one way here and another way in the
    // narration strip and the panel chips, which is the one thing every number
    // on this screen is arranged to avoid. So each value goes through the parser
    // as an opaque symbol and the formatted string is put back afterwards.
    const substituted = rewriteScopes(expression, (isPrev, scope, name) => {
        const source = isPrev ? prevCalcs : (scope === 'params' ? params : values);
        const value = source ? source[name] : undefined;
        if (typeof value !== 'number' || !isFinite(value)) {
            missing = true;
            return name;
        }
        const token = PLACEHOLDER + shown.length;
        shown.push(value.toFixed(precision));
        return token;
    });

    if (missing) return null;

    let tex: string;
    try {
        tex = parse(substituted).toTex();
    } catch {
        return null;
    }

    return tex.replace(
        new RegExp(PLACEHOLDER + '(\\d+)', 'g'),
        (_m, index) => {
            const value = shown[+index];
            // Bracketed, or `a - -3` reads as a double negation rather than a
            // subtraction. Done here rather than before parsing so the parser
            // never sees a sign it might fold into the constant.
            return value.charAt(0) === '-' ? '\\left(' + value + '\\right)' : value;
        }
    );
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

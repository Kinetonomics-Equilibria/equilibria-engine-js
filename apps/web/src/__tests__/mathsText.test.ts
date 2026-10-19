import { describe, it, expect } from 'vitest';
import katex from 'katex';
import {
    isTypesettable, lessonSymbols, nameTex, referencesOf, rewriteScopes, toResultTex, toSubstitutedTex,
    toSymbolicTex, toWorkingTex
} from '../dock/mathsText';

/**
 * The gap between how an expression *addresses* a value and what a student
 * should read. `params.a` is an address; `a` is the name — and mathjs, left
 * alone, typesets the address.
 */

describe('rewriting scopes', () => {
    it('finds params, calcs and prev references', () => {
        expect(referencesOf('0.5 * calcs.Qe * (params.a - calcs.Pe)')).toEqual([
            { scope: 'calcs', name: 'Qe', isPrev: false },
            { scope: 'params', name: 'a', isPrev: false },
            { scope: 'calcs', name: 'Pe', isPrev: false }
        ]);
    });

    it('tells prev.calcs.Pe from calcs.Pe', () => {
        expect(referencesOf('calcs.Pe - prev.calcs.Pe')).toEqual([
            { scope: 'calcs', name: 'Pe', isPrev: false },
            { scope: 'calcs', name: 'Pe', isPrev: true }
        ]);
    });

    it('leaves everything that is not a scoped reference alone', () => {
        expect(rewriteScopes('2 * params.a + 1', (_p, _s, n) => n)).toBe('2 * a + 1');
    });
});

describe('symbolic form', () => {
    it('drops the scope so a student reads the name', () => {
        const tex = toSymbolicTex('(params.a - params.c)/2');
        expect(tex).toBeTruthy();
        expect(tex).not.toContain('params');
        expect(tex).toContain('a');
        expect(tex).toContain('c');
    });

    // `Pe_before` comes back from toTex as `Pe\_before` — an escaped underscore
    // rather than a subscript — so the name goes through whole and becomes a
    // subscript afterwards.
    it('renders a prev reference as a subscript, not an escaped underscore', () => {
        const tex = toSymbolicTex('calcs.Pe - prev.calcs.Pe');
        expect(tex).toContain('_{\\text{before}}');
        expect(tex).not.toContain('\\_');
    });

    it('returns null when mathjs cannot parse it at all', () => {
        expect(toSymbolicTex('^\\prime [[[')).toBeNull();
    });

    // mathjs keeps the author's brackets by default, and `(a + c)/2` is written
    // on one line to say what a fraction bar says on two.
    it('drops a bracket the fraction bar already makes', () => {
        expect(toSymbolicTex('(params.a + params.c)/2')).not.toContain('\\left(');
        expect(toSubstitutedTex('(params.a + params.c)/2', {}, { a: 24, c: 2 }, null, () => 1))
            .not.toContain('\\left(');
    });

    it('keeps a bracket the arithmetic needs', () => {
        expect(toSymbolicTex('0.5 * calcs.Qe * (params.a - calcs.Pe)')).toContain('\\left(');
    });

    // TeX reads `Pe` as P times e, in italics to match — which is how the audit
    // read it. A name that is not one letter is a word, and set upright.
    it('sets a name longer than a letter upright, rather than as a product', () => {
        const tex = toSymbolicTex('calcs.Pe * calcs.Qe')!;
        expect(tex).toContain('\\text{Pe}');
        expect(tex).toContain('\\text{Qe}');
        expect(toSymbolicTex('params.demand - params.supply')).toContain('\\text{demand}');
    });

    it('writes a calc in the symbols it is given', () => {
        const symbols = (scope: string, name: string) => scope === 'calcs' && name === 'Pe' ? 'P^*' : name;
        const tex = toSymbolicTex('0.5 * calcs.Qe * (params.a - calcs.Pe)', symbols)!;
        expect(tex).toContain('P^*');
        expect(tex).not.toContain('Pe');
    });

    // An operator is glued to what follows it, and `\cdotQ^*` is a command TeX
    // has never heard of. This is what the first draft of the symbols did.
    it('typesets a symbol after an operator, and a power of a starred one', () => {
        const star = () => 'Q^*';
        for (const expression of ['0.5 * calcs.Qe', 'calcs.Qe ^ 2', '2 calcs.Qe']) {
            const tex = toSymbolicTex(expression, star)!;
            expect(() => katex.renderToString(tex, { throwOnError: true }), tex).not.toThrow();
        }
    });
});

describe('the lesson\'s symbols', () => {
    // The diagram's dropline says P*, so the formula does too.
    it('reads a label that is a symbol as one', () => {
        expect(nameTex('P*')).toBe('P^*');
        expect(nameTex('Q*')).toBe('Q^*');
        expect(nameTex('a')).toBe('a');
    });

    it('sets any other label upright, escaped', () => {
        expect(nameTex('CS')).toBe('\\text{CS}');
        expect(nameTex('A$1 =')).toBe('\\text{A\\$1 =}');
    });

    // "A$1 =" is written to sit in front of a number. The rate's symbol is the
    // one its dropline carries.
    it('prefers a calc\'s own TeX to its label', () => {
        const symbols = lessonSymbols({
            rate: { name: 'rate', label: 'A$1 =', tex: 'e^*' },
            Pe: { name: 'Pe', label: 'P*' }
        });
        expect(symbols('calcs', 'rate')).toBe('e^*');
        expect(symbols('calcs', 'Pe')).toBe('P^*');
        expect(symbols('calcs', 'unnamed')).toBe('\\text{unnamed}');
        expect(symbols('params', 'a')).toBe('a');
    });
});

describe('substituted form', () => {
    const params = { a: 24, c: 2 };
    const calcs = { Qe: 11, Pe: 13 };

    /** One decimal for everything, which is what every line here is about. */
    const ONE = () => 1;

    it('puts today numbers where the names were', () => {
        const tex = toSubstitutedTex('(params.a - params.c)/2', calcs, params, null, ONE);
        expect(tex).toContain('24.0');
        expect(tex).toContain('2.0');
        expect(tex).not.toContain('params');
    });

    it('reads prev values from the snapshot, not from current calcs', () => {
        const tex = toSubstitutedTex('calcs.Pe - prev.calcs.Pe', calcs, params, { Pe: 11 }, ONE);
        expect(tex).toContain('13.0');
        expect(tex).toContain('11.0');
    });

    // Substituting `undefined` into arithmetic produces a line that looks
    // authoritative and is not. Better to show no substitution at all.
    it('refuses the whole line rather than substitute a missing value', () => {
        expect(toSubstitutedTex('calcs.Pe - prev.calcs.Pe', calcs, params, null, ONE)).toBeNull();
        expect(toSubstitutedTex('params.a * params.zzz', calcs, params, null, ONE)).toBeNull();
    });

    // `a - -3` parses as a double negation and renders as one.
    it('brackets a negative so it stays a subtraction', () => {
        const tex = toSubstitutedTex('params.a - params.c', calcs, { a: 5, c: -3 }, null, ONE);
        expect(tex).toBeTruthy();
        expect(tex).toContain('-3.0');
    });

    it('formats to the precision it is given', () => {
        expect(toSubstitutedTex('params.a', calcs, { a: 24 }, null, () => 0)).toContain('24');
        expect(toSubstitutedTex('params.a', calcs, { a: 24 }, null, () => 2)).toContain('24.00');
    });

    // A line mixes quantities, params and prices, and the price is printed to
    // the cent everywhere else on the screen. One number for the whole line
    // would print it one way here and another way in the caption beside it.
    it('formats each reference at its own precision', () => {
        const money = (scope: string, name: string) => scope === 'calcs' && name === 'Pe' ? 2 : 1;
        const tex = toSubstitutedTex('0.5 * calcs.Qe * (params.a - calcs.Pe)', calcs, params, null, money)!;

        expect(tex).toContain('11.0');
        expect(tex).not.toContain('11.00');
        expect(tex).toContain('24.0');
        expect(tex).toContain('13.00');
    });

    // Hidden, `2a` with a = 24 would be `2~24.0`, which reads as 224.
    it('shows an implicit multiplication once the letter is a number', () => {
        expect(toSubstitutedTex('2params.a', calcs, params, null, ONE)).toContain('\\cdot');
    });

    it('prints a prev reference at the precision of the calc it is the past of', () => {
        const money = (scope: string, name: string) => scope === 'calcs' && name === 'Pe' ? 2 : 1;
        const tex = toSubstitutedTex('calcs.Pe - prev.calcs.Pe', calcs, params, { Pe: 11 }, money)!;

        expect(tex).toContain('13.00');
        expect(tex).toContain('11.00');
    });
});

describe('the result', () => {
    // The same unit and decimals as the caption beside the diagram, typeset.
    it('carries the lesson\'s unit, as maths', () => {
        expect(toResultTex(13, 2, '$')).toBe('\\text{\\$}13.00');
        expect(toResultTex(0.65, 2, 'US$')).toBe('\\text{US\\$}0.65');
        expect(toResultTex(9, 1)).toBe('9.0');
    });

    it('prints no minus in front of a zero', () => {
        expect(toResultTex(-0.04, 1)).toBe('0.0');
    });
});

describe('the working', () => {
    it('is one derivation, aligned on its equals signs', () => {
        const tex = toWorkingTex('P^*', ['\\frac{a+c}{2}', '\\frac{24.0+2.0}{2}', '\\text{\\$}13.00']);
        expect(tex).toMatch(/^\\begin\{aligned\}P\^\* &= /);
        expect(tex.split('&=')).toHaveLength(4);
        expect(() => katex.renderToString(tex, { throwOnError: true, displayMode: true })).not.toThrow();
    });

    it('leaves out a line it does not have', () => {
        expect(toWorkingTex('Q^*', ['\\frac{a-c}{2}', null, '9.0']).split('&=')).toHaveLength(3);
    });

    // The price of US$1 is `1/calcs.rate`, and its symbol is that fraction: the
    // formula line would only say the symbol again.
    it('says a thing once when the formula is the symbol', () => {
        const symbols = lessonSymbols({ rate: { name: 'rate', label: 'A$1 =', tex: 'e^*' } });
        const formula = toSymbolicTex('1/calcs.rate', symbols);
        const tex = toWorkingTex('\\frac{1}{e^*}', [formula, '\\frac{1}{0.65}', '\\text{A\\$}1.54']);
        expect(tex.split('&=')).toHaveLength(3);
        expect(tex).toContain('0.65');
    });
});

describe('what can be shown as maths at all', () => {
    // The test is not whether it parses. `colors.demand` parses perfectly well —
    // mathjs reads it as a property access — and typesets into confident
    // nonsense. What separates a formula from a color name is the value.
    it('judges by the value, because a color name parses fine', () => {
        expect(toSymbolicTex('colors.demand')).not.toBeNull();
        expect(isTypesettable('#ff0000')).toBe(false);
        expect(isTypesettable(13)).toBe(true);
        expect(isTypesettable(undefined)).toBe(false);
        expect(isTypesettable(NaN)).toBe(false);
        expect(isTypesettable(Infinity)).toBe(false);
    });
});

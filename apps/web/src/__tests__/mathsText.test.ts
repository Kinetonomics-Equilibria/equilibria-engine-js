import { describe, it, expect } from 'vitest';
import {
    isTypesettable, referencesOf, rewriteScopes, toSubstitutedTex, toSymbolicTex
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
});

describe('substituted form', () => {
    const params = { a: 24, c: 2 };
    const calcs = { Qe: 11, Pe: 13 };

    it('puts today numbers where the names were', () => {
        const tex = toSubstitutedTex('(params.a - params.c)/2', calcs, params, null, 1);
        expect(tex).toContain('24.0');
        expect(tex).toContain('2.0');
        expect(tex).not.toContain('params');
    });

    it('reads prev values from the snapshot, not from current calcs', () => {
        const tex = toSubstitutedTex('calcs.Pe - prev.calcs.Pe', calcs, params, { Pe: 11 }, 1);
        expect(tex).toContain('13.0');
        expect(tex).toContain('11.0');
    });

    // Substituting `undefined` into arithmetic produces a line that looks
    // authoritative and is not. Better to show no substitution at all.
    it('refuses the whole line rather than substitute a missing value', () => {
        expect(toSubstitutedTex('calcs.Pe - prev.calcs.Pe', calcs, params, null, 1)).toBeNull();
        expect(toSubstitutedTex('params.a * params.zzz', calcs, params, null, 1)).toBeNull();
    });

    // `a - -3` parses as a double negation and renders as one.
    it('brackets a negative so it stays a subtraction', () => {
        const tex = toSubstitutedTex('params.a - params.c', calcs, { a: 5, c: -3 }, null, 1);
        expect(tex).toBeTruthy();
        expect(tex).toContain('-3.0');
    });

    it('formats to the precision it is given', () => {
        expect(toSubstitutedTex('params.a', calcs, { a: 24 }, null, 0)).toContain('24');
        expect(toSubstitutedTex('params.a', calcs, { a: 24 }, null, 2)).toContain('24.00');
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

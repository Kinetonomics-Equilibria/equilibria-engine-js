import { describe, it, expect } from 'vitest';
import { divideDefs, multiplyDefs, addDefs, subtractDefs } from '../ts/KGAuthor/parsers/parsingFunctions';

/**
 * These helpers build the expression strings every generated diagram is made
 * of, so a wrong simplification here does not throw — it produces a diagram
 * that draws the wrong thing. divideDefs() short-circuiting 0/0 to 0 is what
 * let a degenerate slope reach the renderer looking like a valid one.
 */

describe('divideDefs', () => {
    it('divides numeric literals', () => {
        expect(divideDefs(6, 2)).toBe(3);
        expect(divideDefs(-4, 2)).toBe(-2);
    });

    it('simplifies a zero numerator over a non-zero denominator', () => {
        expect(divideDefs(0, 5)).toBe(0);
        expect(divideDefs(0, 'params.x')).toBe(0);
    });

    it('does not simplify 0/0 to 0', () => {
        expect(divideDefs(0, 0)).toBeNaN();
    });

    it('treats a string zero denominator as zero too', () => {
        // reaches mathjs as "(0/0)" rather than being silently simplified
        expect(divideDefs(0, '0')).toBe('(0/0)');
    });

    it('simplifies division by 1', () => {
        expect(divideDefs('params.a', 1)).toBe('params.a');
    });

    it('builds an expression for symbolic operands', () => {
        expect(divideDefs('params.a', 'params.b')).toBe('(params.a/params.b)');
    });
});

describe('multiplyDefs', () => {
    it('multiplies numeric literals and simplifies identities', () => {
        expect(multiplyDefs(3, 4)).toBe(12);
        expect(multiplyDefs(1, 'params.a')).toBe('params.a');
        expect(multiplyDefs('params.a', 1)).toBe('params.a');
        expect(multiplyDefs(0, 'params.a')).toBe(0);
    });
});

describe('addDefs and subtractDefs', () => {
    it('simplify additive identities', () => {
        expect(addDefs(0, 'params.a')).toBe('params.a');
        expect(addDefs('params.a', 0)).toBe('params.a');
        expect(subtractDefs('params.a', 0)).toBe('params.a');
    });

    it('compute numeric literals', () => {
        expect(addDefs(2, 3)).toBe(5);
        expect(subtractDefs(20, 20)).toBe(0);
    });
});

describe('operator precedence in composed expressions', () => {
    /**
     * The bug: only strings containing `* / + -` were parenthesised, so a comparison
     * or a ternary — which bind *looser* than arithmetic, and so need it most — went
     * in bare. The composed string parsed cleanly and meant something else.
     *
     * This is how a `CustomLayout` panel positioned at
     * `params.focus == 0 ? 0.05 : 0.5` got a right edge of 0.05 rather than 0.45: the
     * `+ width` was swallowed by the ternary's false branch.
     */
    it('parenthesises a ternary before joining it to anything', () => {
        const composed = addDefs('params.focus == 0 ? 0.05 : 0.5', 0.4);

        expect(composed).toBe('((params.focus == 0 ? 0.05 : 0.5)+0.4)');
    });

    it('parenthesises a comparison', () => {
        expect(multiplyDefs('params.a > 3', 2)).toBe('((params.a > 3)*2)');
    });

    it('parenthesises an exponent, which binds tighter than the join', () => {
        expect(subtractDefs('params.a^2', 1)).toBe('((params.a^2)-1)');
    });

    it('leaves a bare name or number alone, so generated expressions stay readable', () => {
        expect(addDefs('params.a', 'params.b')).toBe('(params.a+params.b)');
        expect(divideDefs('x', 'y')).toBe('(x/y)');
        expect(divideDefs(0, '0')).toBe('(0/0)');
    });
});

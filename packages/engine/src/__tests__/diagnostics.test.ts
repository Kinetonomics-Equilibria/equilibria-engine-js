import { describe, it, expect, beforeAll } from 'vitest';
import { Model, containsUndefinedToken } from '../ts/model/model';
import { getUtilityFunction } from '../ts/KGAuthor/econ/micro/consumer_theory/two_good_utility/utilitySelector';
import { mountObjects, stubContainerLayout, captureWarnings } from './helpers';

/**
 * The engine's failure mode was silence: an expression that could not be
 * evaluated was returned as a raw string and flowed on into the diagram, and an
 * unrecognised utility function name became `undefined` and surfaced as a
 * TypeError from deep inside an unrelated object. These tests cover the
 * diagnostics that make both cases legible.
 */

beforeAll(() => stubContainerLayout());

function modelWith(calcs: Record<string, any>) {
    return new Model({ params: [], calcs, colors: {}, idioms: {} });
}

describe('unresolved calc reporting', () => {
    it('warns when a calc still carries an interpolated undefined', () => {
        const { warnings } = captureWarnings(() =>
            modelWith({ line: { fixedPoint: '((undefined)/(1 - 1))' } })
        );

        expect(warnings).toHaveLength(1);
        expect(warnings[0]).toContain('calcs.line.fixedPoint');
        expect(warnings[0]).toContain('((undefined)/(1 - 1))');
    });

    it('reports each unresolved calc only once', () => {
        const { result: model, warnings } = captureWarnings(() =>
            modelWith({ a: '(undefined + 1)' })
        );
        expect(warnings).toHaveLength(1);

        // re-evaluating must not re-report the same problem every frame
        const second = captureWarnings(() => model.update(true));
        expect(second.warnings).toHaveLength(0);
    });

    it('stays quiet for strings that legitimately do not evaluate', () => {
        const { warnings } = captureWarnings(() => modelWith({
            // a deliberate function of x, as EconContractCurve stores
            cc: '2.5*(x)/(2.5 + 0.5*(x))',
            // LaTeX label text
            label: '^\\prime',
            // a forward reference that resolves on a later pass
            first: 'calcs.second',
            second: '6'
        }));

        expect(warnings).toEqual([]);
    });

    it('stays quiet for a diagram that resolves cleanly', () => {
        const { result, warnings } = captureWarnings(() => mountObjects([{
            type: 'EconLinearEquilibrium',
            def: {
                demand: { yIntercept: 20, xIntercept: 20 },
                supply: { yIntercept: 2, slope: 1 },
                equilibrium: {}
            }
        }]));

        expect(result.error).toBeNull();
        expect(warnings).toEqual([]);
        result.destroy();
    });
});

describe('containsUndefinedToken', () => {
    it('matches the interpolated token but not lookalikes', () => {
        expect(containsUndefinedToken('((undefined)/(1 - 1))')).toBe(true);
        expect(containsUndefinedToken('undefined')).toBe(true);
        expect(containsUndefinedToken('params.undefinedIncome')).toBe(false);
        expect(containsUndefinedToken('2*x + 1')).toBe(false);
        expect(containsUndefinedToken(42)).toBe(false);
        expect(containsUndefinedToken(undefined)).toBe(false);
    });
});

describe('getUtilityFunction', () => {
    // Each functional form is documented in docs/schema/06-econ-objects.md under
    // the name its class is exported as; configs written against the original
    // KGJS vocabulary use the shorter name. Both must work.
    const equivalentNames: [string, string, any][] = [
        ['CobbDouglasFunction', 'CobbDouglas', { alpha: 0.5 }],
        ['LinearFunction', 'Substitutes', { coefficients: [1, 1] }],
        ['MinFunction', 'Complements', { coefficients: [1, 1] }],
        ['ConcaveFunction', 'Concave', { alpha: 0.5 }],
        ['QuasilinearFunction', 'Quasilinear', { alpha: 0.5 }],
        ['CESFunction', 'CES', { alpha: 0.5, r: 0.5 }]
    ];

    for (const [documentedName, shortName, def] of equivalentNames) {
        it(`accepts "${documentedName}" and "${shortName}"`, () => {
            const fromDocumented = getUtilityFunction({ type: documentedName, def: { ...def } });
            const fromShort = getUtilityFunction({ type: shortName, def: { ...def } });

            expect(fromDocumented).toBeDefined();
            expect(fromShort).toBeDefined();
            expect(fromDocumented.constructor).toBe(fromShort.constructor);
        });
    }

    it('names the problem when the type is unrecognised', () => {
        expect(() => getUtilityFunction({ type: 'NoSuchFunction', def: {} }))
            .toThrow(/Unknown utility function type "NoSuchFunction"/);
    });

    it('still returns undefined when no utility function was supplied', () => {
        expect(getUtilityFunction(undefined)).toBeUndefined();
    });
});

describe('consumer theory objects accept the documented names', () => {
    it('builds an indifference curve from CobbDouglasFunction', () => {
        const r = mountObjects([{
            type: 'EconIndifferenceCurve',
            def: { utilityFunction: { type: 'CobbDouglasFunction', def: { alpha: 0.5 } }, level: 5 }
        }]);

        expect(r.error).toBeNull();
        expect(r.shapeCount).toBeGreaterThan(0);
        r.destroy();
    });

    it('solves an optimal bundle from CobbDouglasFunction', () => {
        const r = mountObjects([{
            type: 'EconOptimalBundle',
            def: {
                name: 'ob',
                utilityFunction: { type: 'CobbDouglasFunction', def: { alpha: 0.5 } },
                budgetLine: { name: 'bl', p1: 2, p2: 1, m: 20 }
            }
        }]);

        expect(r.error).toBeNull();
        expect(r.calcs.ob.x).toBe(5);
        expect(r.calcs.ob.y).toBe(10);
        r.destroy();
    });

    it('surfaces an unknown functional form as a named error', () => {
        const r = mountObjects([{
            type: 'EconIndifferenceCurve',
            def: { utilityFunction: { type: 'CobbDouglassFunction', def: { alpha: 0.5 } }, level: 5 }
        }]);

        expect(r.error).toBeTruthy();
        expect(r.error.message).toContain('Unknown utility function type "CobbDouglassFunction"');
        r.destroy();
    });
});

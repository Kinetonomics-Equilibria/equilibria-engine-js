import { describe, it, expect, beforeAll } from 'vitest';
import { mountObjects, stubContainerLayout } from './helpers';

/**
 * Value-level coverage.
 *
 * The rest of the suite asserts that a diagram *renders* — element counts, the
 * absence of "NaN", stroke colors. None of that distinguishes a diagram that
 * solves the right system from one that solves the wrong one, which is how
 * EconLinearEquilibrium shipped reporting Q=0 instead of Q=9.
 *
 * These tests assert the numbers the model actually resolves to. Every expected
 * value here is hand-checkable from the config above it.
 */

beforeAll(() => stubContainerLayout());

describe('Line geometry', () => {
    // P = 20 - Q crosses the axes at (20, 0) and (0, 20).
    it('derives intercepts and inverse slope from slope + yIntercept', () => {
        const r = mountObjects([
            { type: 'Line', def: { name: 'd', yIntercept: 20, slope: -1 } }
        ]);

        expect(r.error).toBeNull();
        expect(r.calcs.d).toMatchObject({
            slope: -1,
            invSlope: -1,
            xIntercept: 20,
            yIntercept: 20
        });
        r.destroy();
    });

    // P = 20 - 2Q  =>  Q-intercept 10.
    it('derives the x-intercept from a steeper slope', () => {
        const r = mountObjects([
            { type: 'Line', def: { name: 'd', yIntercept: 20, slope: -2 } }
        ]);

        expect(r.error).toBeNull();
        expect(r.calcs.d).toMatchObject({ slope: -2, invSlope: -0.5, xIntercept: 10 });
        r.destroy();
    });

    it('derives slope and intercepts from two points', () => {
        // through (1,1) and (5,9): slope 2, yIntercept -1
        const r = mountObjects([
            { type: 'Line', def: { name: 'l', point: [1, 1], point2: [5, 9] } }
        ]);

        expect(r.error).toBeNull();
        expect(r.calcs.l.slope).toBe(2);
        expect(r.calcs.l.yIntercept).toBe(-1);
        expect(r.calcs.l.xIntercept).toBeCloseTo(0.5, 10);
        r.destroy();
    });
});

describe('EconLinearEquilibrium', () => {
    // Regression: EconLinearDemand defaulted `point: [0, yIntercept]` alongside
    // the author's slope. Line tests `point + yIntercept` before
    // `slope + yIntercept`, and the placeholder point *is* the y-intercept, so
    // the slope resolved to 0/0 and the explicit slope was discarded. The
    // demand curve became horizontal and the equilibrium came out as Q=0, P=2.
    it('honours an explicit slope on the demand curve', () => {
        const r = mountObjects([{
            type: 'EconLinearEquilibrium',
            def: {
                demand: { yIntercept: 20, slope: -1 },
                supply: { yIntercept: 2, slope: 1 },
                equilibrium: {}
            }
        }]);

        expect(r.error).toBeNull();
        expect(r.calcs.demand).toMatchObject({ slope: -1, xIntercept: 20, yIntercept: 20 });
        expect(r.calcs.equilibrium).toEqual({ Q: 9, P: 11 });
        r.destroy();
    });

    it('agrees between slope form and intercept form', () => {
        const slopeForm = mountObjects([{
            type: 'EconLinearEquilibrium',
            def: {
                demand: { yIntercept: 20, slope: -1 },
                supply: { yIntercept: 2, slope: 1 },
                equilibrium: {}
            }
        }]);
        const interceptForm = mountObjects([{
            type: 'EconLinearEquilibrium',
            def: {
                demand: { yIntercept: 20, xIntercept: 20 },
                supply: { yIntercept: 2, slope: 1 },
                equilibrium: {}
            }
        }]);

        expect(slopeForm.calcs.equilibrium).toEqual(interceptForm.calcs.equilibrium);
        slopeForm.destroy();
        interceptForm.destroy();
    });

    // A steeper demand curve must clear at a lower quantity and a higher price.
    // demand P = 20 - 2Q, supply P = 2 + Q  =>  Q = 6, P = 8
    it('tracks a change in the slope of demand', () => {
        const r = mountObjects([{
            type: 'EconLinearEquilibrium',
            def: {
                demand: { yIntercept: 20, slope: -2 },
                supply: { yIntercept: 2, slope: 1 },
                equilibrium: {}
            }
        }]);

        expect(r.error).toBeNull();
        expect(r.calcs.equilibrium).toEqual({ Q: 6, P: 8 });
        r.destroy();
    });

    // demand P = 20 - Q, supply P = 2 + Q  =>  20 - Q = 2 + Q  =>  Q = 9, P = 11
    it('solves the intersection of demand and supply', () => {
        const r = mountObjects([{
            type: 'EconLinearEquilibrium',
            def: {
                demand: { yIntercept: 20, xIntercept: 20 },
                supply: { yIntercept: 2, slope: 1 },
                equilibrium: {}
            }
        }]);

        expect(r.error).toBeNull();
        expect(r.calcs.equilibrium).toEqual({ Q: 9, P: 11 });
        r.destroy();
    });

    it('puts both curves through the equilibrium point', () => {
        const r = mountObjects([{
            type: 'EconLinearEquilibrium',
            def: {
                demand: { yIntercept: 20, xIntercept: 20 },
                supply: { yIntercept: 2, slope: 1 },
                equilibrium: {}
            }
        }]);

        // PQ is the point each curve reports at the equilibrium price
        expect(r.calcs.demand.PQ).toEqual({ x: 9, y: 11 });
        expect(r.calcs.supply.PQ).toEqual({ x: 9, y: 11 });
        r.destroy();
    });

    it('re-solves when a parameter changes', () => {
        const r = mountObjects([{
            type: 'EconLinearEquilibrium',
            def: {
                demand: { yIntercept: 'params.a', xIntercept: 'params.a' },
                supply: { yIntercept: 'params.c', slope: 1 },
                equilibrium: {}
            }
        }], {
            params: [
                { name: 'a', value: 20, min: 10, max: 30, round: 0.1 },
                { name: 'c', value: 2, min: 0, max: 8, round: 0.1 }
            ]
        });

        expect(r.error).toBeNull();
        expect(r.calcs.equilibrium).toEqual({ Q: 9, P: 11 });

        // demand P = 24 - Q, supply P = 4 + Q  =>  Q = 10, P = 14
        const model = (r.kg as any).view.model;
        model.updateParam('a', 24);
        model.updateParam('c', 4);

        expect(model.currentCalcValues.equilibrium).toEqual({ Q: 10, P: 14 });
        r.destroy();
    });
});

describe('the webapp market diagram', () => {
    // Mirrors apps/web/src/App.tsx. That diagram was hand-built from primitive
    // Line and Point objects with the algebra restated in `calcs`, because
    // EconLinearEquilibrium solved the wrong intersection. It now uses the
    // wrapper, so this pins the config the app actually ships.
    const config = {
        demand: { yIntercept: 'params.a', slope: -1, label: { text: 'D' } },
        supply: { yIntercept: 'params.c', slope: 1, label: { text: 'S' } },
        equilibrium: {}
    };
    const params = [
        { name: 'a', value: 20, min: 12, max: 28, round: 0.1 },
        { name: 'c', value: 2, min: 0, max: 8, round: 0.1 }
    ];

    it('solves the equilibrium from the curve parameters', () => {
        const r = mountObjects(
            [{ type: 'EconLinearEquilibrium', def: config }],
            { params, xAxis: { title: 'Q', min: 0, max: 20 }, yAxis: { title: 'P', min: 0, max: 20 } }
        );

        expect(r.error).toBeNull();
        // a = 20, c = 2  =>  Q* = (a-c)/2 = 9, P* = (a+c)/2 = 11
        expect(r.calcs.equilibrium).toEqual({ Q: 9, P: 11 });
        r.destroy();
    });

    it('re-solves as the curve parameters move', () => {
        const r = mountObjects(
            [{ type: 'EconLinearEquilibrium', def: config }],
            { params, xAxis: { title: 'Q', min: 0, max: 20 }, yAxis: { title: 'P', min: 0, max: 20 } }
        );
        const model = (r.kg as any).view.model;

        // Q* = (a-c)/2, P* = (a+c)/2 for demand P = a - Q against supply P = c + Q
        for (const [a, c] of [[28, 0], [12, 8], [24, 4]]) {
            model.updateParam('a', a);
            model.updateParam('c', c);
            expect(model.currentCalcValues.equilibrium).toEqual({
                Q: (a - c) / 2,
                P: (a + c) / 2
            });
        }
        r.destroy();
    });
});

describe('EconLinearDemand', () => {
    it('derives the x-intercept from slope form', () => {
        const r = mountObjects([
            { type: 'EconLinearDemand', def: { name: 'd', yIntercept: 20, slope: -2 } }
        ]);

        expect(r.error).toBeNull();
        expect(r.calcs.d).toMatchObject({ slope: -2, xIntercept: 10, yIntercept: 20 });
        r.destroy();
    });

    // With only a y-intercept there is no slope to derive, so the curve is
    // horizontal at that price — a perfectly elastic demand curve.
    it('treats a lone yIntercept as a horizontal curve', () => {
        const r = mountObjects([
            { type: 'EconLinearDemand', def: { name: 'd', yIntercept: 12 } }
        ]);

        expect(r.error).toBeNull();
        expect(r.calcs.d.slope).toBe(0);
        expect(r.calcs.d.yIntercept).toBe(12);
        r.destroy();
    });

    it('still renders when the def carries no geometry at all', () => {
        const r = mountObjects([
            { type: 'EconLinearDemand', def: { name: 'd' } }
        ]);

        expect(r.error).toBeNull();
        expect(r.shapeCount).toBeGreaterThan(0);
        r.destroy();
    });
});

describe('EconLinearMonopoly', () => {
    // demand P = 20 - Q  =>  MR = 20 - 2Q;  MC = 2 + Q
    // MR = MC  =>  20 - 2Q = 2 + Q  =>  Q = 6, P = 20 - 6 = 14
    // competitive: 20 - Q = 2 + Q  =>  Q = 9, P = 11
    it('solves MR = MC and reports the competitive benchmark', () => {
        const r = mountObjects([{
            type: 'EconLinearMonopoly',
            def: {
                demand: { yIntercept: 20, xIntercept: 20 },
                cost: { yIntercept: 2, slope: 1 }
            }
        }]);

        expect(r.error).toBeNull();
        expect(r.calcs.monopoly).toEqual({
            Q: 6,
            P: 14,
            competitiveQ: 9,
            competitiveP: 11
        });
        r.destroy();
    });

    it('restricts output below the competitive quantity', () => {
        const r = mountObjects([{
            type: 'EconLinearMonopoly',
            def: {
                demand: { yIntercept: 20, xIntercept: 20 },
                cost: { yIntercept: 2, slope: 1 }
            }
        }]);

        const m = r.calcs.monopoly;
        expect(m.Q).toBeLessThan(m.competitiveQ);
        expect(m.P).toBeGreaterThan(m.competitiveP);
        r.destroy();
    });
});

describe('EconBudgetLine', () => {
    // p1 = 2, p2 = 1, m = 20  =>  x-intercept m/p1 = 10, y-intercept m/p2 = 20
    it('derives intercepts and the price ratio from prices and income', () => {
        const r = mountObjects([
            { type: 'EconBudgetLine', def: { name: 'bl', p1: 2, p2: 1, m: 20 } }
        ]);

        expect(r.error).toBeNull();
        expect(r.calcs.bl).toMatchObject({
            xIntercept: 10,
            yIntercept: 20,
            priceRatio: 2,
            m: 20
        });
        r.destroy();
    });
});

describe('EconOptimalBundle', () => {
    // Cobb-Douglas alpha = 0.5, p1 = 2, p2 = 1, m = 20
    // x = alpha*m/p1 = 5, y = (1-alpha)*m/p2 = 10, U = sqrt(5*10), MRS = p1/p2 = 2
    it('solves the tangency between the indifference curve and the budget line', () => {
        const r = mountObjects([{
            type: 'EconOptimalBundle',
            def: {
                name: 'ob',
                utilityFunction: { type: 'CobbDouglas', def: { alpha: 0.5 } },
                budgetLine: { name: 'bl', p1: 2, p2: 1, m: 20 }
            }
        }]);

        expect(r.error).toBeNull();
        expect(r.calcs.ob.x).toBe(5);
        expect(r.calcs.ob.y).toBe(10);
        expect(r.calcs.ob.cost).toBe(20);
        // tangency condition: MRS equals the price ratio
        expect(r.calcs.ob.mrs).toBe(2);
        expect(r.calcs.ob.level).toBeCloseTo(Math.sqrt(50), 10);
        r.destroy();
    });

    it('exhausts the budget', () => {
        const r = mountObjects([{
            type: 'EconOptimalBundle',
            def: {
                name: 'ob',
                utilityFunction: { type: 'CobbDouglas', def: { alpha: 0.5 } },
                budgetLine: { name: 'bl', p1: 2, p2: 1, m: 20 }
            }
        }]);

        const { x, y } = r.calcs.ob;
        expect(2 * x + 1 * y).toBe(20);
        r.destroy();
    });
});

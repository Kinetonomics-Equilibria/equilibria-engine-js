import { describe, it, expect, beforeAll } from 'vitest';
import { evaluate } from 'mathjs';
import { KineticGraph } from '../ts/kg';
import { parse } from '../ts/KGAuthor/parsers/parsingFunctions';
import '../ts/KGAuthor/index'; // side-effect: registers all KGAuthor classes into the registry

// jsdom performs no layout, so clientWidth is 0 and every scale maps to NaN.
beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {
        get() { return 800; }, configurable: true
    });
    Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
        get() { return 400; }, configurable: true
    });
});

const AXES = {
    xAxis: { title: 'Q', min: 0, max: 20 },
    yAxis: { title: 'P', min: 0, max: 20 }
};

function parseObjects(objects: any[], calcs: any = {}) {
    const parsedData: any = {
        params: [], calcs, colors: {}, idioms: {}, clipPaths: [], markers: [],
        scales: [], layers: [[], [], [], []], divs: [], objects: []
    };

    return parse([{ type: 'OneGraph', def: { graph: { ...AXES, objects } } }] as any, parsedData);
}

// Solved values reach `calcs` as expression strings - "((20+((-1)*2))/(1-...))" -
// or as plain numbers when every input was a literal. Both have to be read as
// numbers to be asserted against; params resolve out of the supplied scope.
function value(calc: any, scope: any = {}) {
    return typeof calc === 'number' ? calc : evaluate(String(calc), scope);
}

// dragPath elements are transparent hit areas, not the drawn curve.
function drawnPaths(container: HTMLElement) {
    return Array.from(container.querySelectorAll('path'))
        .filter(p => !(p.getAttribute('class') || '').startsWith('dragPath'))
        .map(p => p.getAttribute('d'))
        .filter(d => d) as string[];
}

// Points are positioned by a translate() on their group, not by cx/cy.
function pointPositions(container: HTMLElement) {
    return Array.from(container.querySelectorAll('g'))
        .filter(g => g.querySelector(':scope > circle[class^="circle-"]'))
        .map(g => g.getAttribute('transform'));
}

function mount(objects: any[], config: any = {}) {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let error: any = null;
    const kg = new KineticGraph({
        schema: 'EconSchema',
        layout: { OneGraph: { graph: { ...AXES, objects } } },
        ...config
    });
    kg.on('error', (e: any) => { error = e; });
    kg.mount(container);

    return { kg, container, error };
}

describe('EconLinearEquilibrium', () => {

    // Regression: EconLinearDemand defaulted `point: [0, yIntercept]`, and the
    // Line constructor reaches its `point && yIntercept` branch before
    // `slope && yIntercept`. Since the defaulted point *was* the y-intercept,
    // both of that branch's formulas reduced to 0/0, the caller's explicit slope
    // was discarded, and lineIntersection() - whose own formula is correct - was
    // handed a degenerate line and answered Q=0, P=2 instead of Q=9, P=11.

    it('solves the intersection of demand and supply', () => {
        const { calcs } = parseObjects([{
            type: 'EconLinearEquilibrium',
            def: {
                demand: { yIntercept: 20, slope: -1 },
                supply: { yIntercept: 2, slope: 1 }
            }
        }]);

        expect(value(calcs.equilibrium.Q)).toBe(9);
        expect(value(calcs.equilibrium.P)).toBe(11);
    });

    it('keeps the demand curve the caller asked for', () => {
        const { calcs } = parseObjects([{
            type: 'EconLinearDemand',
            def: { yIntercept: 20, slope: -1 }
        }]);

        expect(value(calcs.demand.slope)).toBe(-1);
        expect(value(calcs.demand.yIntercept)).toBe(20);
        expect(value(calcs.demand.xIntercept)).toBe(20);
    });

    it('solves the intersection from params rather than literals', () => {
        const scope = { params: { a: 20, c: 2 } };
        const { calcs } = parseObjects([{
            type: 'EconLinearEquilibrium',
            def: {
                demand: { yIntercept: 'params.a', slope: -1 },
                supply: { yIntercept: 'params.c', slope: 1 }
            }
        }]);

        // Q* = (a - c)/2, P* = (a + c)/2
        expect(value(calcs.equilibrium.Q, scope)).toBe(9);
        expect(value(calcs.equilibrium.P, scope)).toBe(11);
    });

    it('draws the equilibrium point at the solved coordinates', () => {
        const equilibrium = mount([{
            type: 'EconLinearEquilibrium',
            def: {
                demand: { yIntercept: 20, slope: -1 },
                supply: { yIntercept: 2, slope: 1 },
                equilibrium: {}
            }
        }]);

        // Same axes, so a plain point at (9, 11) lands on the same pixel.
        const reference = mount([{ type: 'Point', def: { x: 9, y: 11 } }]);

        expect(equilibrium.error).toBeNull();
        expect(reference.error).toBeNull();
        const referencePosition = pointPositions(reference.container);
        expect(referencePosition).toHaveLength(1);
        expect(referencePosition[0]).toMatch(/^translate\(\d/);
        expect(pointPositions(equilibrium.container)).toContain(referencePosition[0]);

        equilibrium.kg.destroy();
        reference.kg.destroy();
    });

    it('draws the demand curve rather than a degenerate one', () => {
        const demand = mount([{ type: 'EconLinearDemand', def: { yIntercept: 20, slope: -1 } }]);
        // The same line as a primitive - the shape the econ object should draw.
        const reference = mount([{ type: 'Line', def: { yIntercept: 20, slope: -1 } }]);

        expect(demand.error).toBeNull();
        expect(reference.error).toBeNull();
        // Both graphs draw the same axes, so discount the paths an empty one has.
        const empty = mount([]);
        const chrome = drawnPaths(empty.container);
        const curvesOf = (c: HTMLElement) => drawnPaths(c).filter(d => !chrome.includes(d));

        const referencePath = curvesOf(reference.container);
        expect(referencePath).toHaveLength(1);
        // A degenerate line yields NaN coordinates, which d3 drops, so the path
        // comes out empty rather than as the segment the reference draws.
        expect(referencePath[0]).toContain('L');
        expect(curvesOf(demand.container)).toContain(referencePath[0]);

        demand.kg.destroy();
        reference.kg.destroy();
        empty.kg.destroy();
    });

});

describe('Line definition forms', () => {

    it('accepts slope with an x-intercept', () => {
        const { calcs } = parseObjects([{
            type: 'EconLinearDemand',
            def: { xIntercept: 20, slope: -1 }
        }]);

        expect(value(calcs.demand.slope)).toBe(-1);
        expect(value(calcs.demand.yIntercept)).toBe(20);
    });

    it('accepts both intercepts', () => {
        const { calcs } = parseObjects([{
            type: 'EconLinearDemand',
            def: { xIntercept: 20, yIntercept: 20 }
        }]);

        expect(value(calcs.demand.slope)).toBe(-1);
    });

    it('still reads a point plus a y-intercept as two points on the line', () => {
        const { calcs } = parseObjects([{
            type: 'Line',
            def: { name: 'l', point: [10, 10], yIntercept: 20 }
        }]);

        expect(value(calcs.l.slope)).toBe(-1);
        expect(value(calcs.l.xIntercept)).toBe(20);
    });

    it('ignores a point that is itself the y-intercept', () => {
        // It adds no constraint - the two-point formulas reduce to 0/0 - so the
        // slope the caller also supplied is what defines the line.
        const { calcs } = parseObjects([{
            type: 'Line',
            def: { name: 'l', point: [0, 20], yIntercept: 20, slope: -1 }
        }]);

        expect(value(calcs.l.slope)).toBe(-1);
        expect(value(calcs.l.xIntercept)).toBe(20);
    });

    it('still reads a point on the y-axis above the y-intercept as a vertical line', () => {
        const { calcs } = parseObjects([{
            type: 'Line',
            def: { name: 'l', point: [0, 5], yIntercept: 20 }
        }]);

        expect(value(calcs.l.invSlope)).toBe(0);
        expect(value(calcs.l.yIntercept)).toBe(20);
    });

});

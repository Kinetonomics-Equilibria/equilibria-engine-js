import { describe, it, expect, beforeAll } from 'vitest';
import { KineticGraph } from '../ts/kg';

// jsdom performs no layout, so clientWidth is 0 and every scale maps to NaN.
beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {
        get() { return 800; }, configurable: true
    });
    Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
        get() { return 400; }, configurable: true
    });
});

function mountGraph(objects: any[]) {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let error: any = null;
    const kg = new KineticGraph({
        schema: 'EconSchema',
        layout: {
            OneGraph: {
                graph: {
                    xAxis: { title: 'Q', min: 0, max: 20 },
                    yAxis: { title: 'P', min: 0, max: 20 },
                    objects
                }
            }
        }
    });
    // mount() reports failures via an 'error' event rather than throwing.
    kg.on('error', (e: any) => { error = e; });
    kg.mount(container);

    return { kg, container, error };
}

describe('EconLinearMonopoly', () => {
    // Regression: the monopoly outcome is solved from MR = MC, but EconLinearDemand
    // only builds a marginal revenue line when the def carries a `marginalRevenue`
    // key. Monopoly never supplied one, so every monopoly diagram threw
    // "Cannot read properties of undefined (reading 'xIntercept')".
    it('renders without an explicit marginalRevenue definition', () => {
        const { kg, container, error } = mountGraph([{
            type: 'EconLinearMonopoly',
            def: { demand: { yIntercept: 20, slope: -1 }, cost: { yIntercept: 2, slope: 1 } }
        }]);

        expect(error).toBeNull();
        expect(container.querySelectorAll('path,circle,rect,line').length).toBeGreaterThan(0);
        expect(container.innerHTML).not.toContain('NaN');
        kg.destroy();
    });

    it('renders the surplus, profit and deadweight-loss areas', () => {
        const { kg, container, error } = mountGraph([{
            type: 'EconLinearMonopoly',
            def: {
                demand: { yIntercept: 20, slope: -1 },
                cost: { yIntercept: 2, slope: 1 },
                showCS: true, showPS: true, showProfit: true, showDWL: true
            }
        }]);

        expect(error).toBeNull();
        expect(container.querySelectorAll('path,circle,rect,line').length).toBeGreaterThan(0);
        expect(container.innerHTML).not.toContain('NaN');
        kg.destroy();
    });

    it('still honours an author-supplied marginalRevenue definition', () => {
        const { kg, container, error } = mountGraph([{
            type: 'EconLinearMonopoly',
            def: {
                demand: { yIntercept: 20, slope: -1, marginalRevenue: { color: 'red' } },
                cost: { yIntercept: 2, slope: 1 }
            }
        }]);

        expect(error).toBeNull();
        expect(container.querySelectorAll('path,circle,rect,line').length).toBeGreaterThan(0);
        kg.destroy();
    });
});

describe('EconLinearDemand', () => {
    // The monopoly fix must not leak an MR line into standalone demand curves.
    it('does not draw a marginal revenue line on its own', () => {
        const { kg, container, error } = mountGraph([{
            type: 'EconLinearDemand',
            def: { yIntercept: 15, slope: -1 }
        }]);

        expect(error).toBeNull();
        expect(container.innerHTML).not.toContain('>MR<');
        kg.destroy();
    });
});

describe('semantic colors', () => {
    // Regression: setStrokeColor() assigned def.color and def.stroke
    // unconditionally, so calling it before setDefaults() left both as own
    // properties holding `undefined`. setDefaults() skips keys that are already
    // own properties, so the semantic color the econ objects set right
    // afterwards ('colors.demand', 'colors.supply') was silently discarded.
    // drawStroke() then wrote stroke=undefined and every econ curve rendered
    // with no stroke at all — geometrically correct but invisible.
    function strokesOf(container: HTMLElement) {
        return Array.from(container.querySelectorAll('path'))
            // dragPath elements are transparent hit areas, not the drawn curve
            .filter(p => !(p.getAttribute('class') || '').startsWith('dragPath'))
            .map(p => p.getAttribute('stroke'));
    }

    it('resolves colors.demand and colors.supply to real stroke colors', () => {
        const { kg, container, error } = mountGraph([{
            type: 'EconLinearEquilibrium',
            def: {
                demand: { yIntercept: 20, slope: -1 },
                supply: { yIntercept: 2, slope: 1 },
                equilibrium: {}
            }
        }]);

        expect(error).toBeNull();
        const strokes = strokesOf(container);
        // blue for demand, orange for supply, straight off d3.schemeCategory10
        expect(strokes).toContain('#1f77b4');
        expect(strokes).toContain('#ff7f0e');
        expect(strokes).not.toContain(null);
        kg.destroy();
    });

    it('still lets an explicit stroke override the semantic default', () => {
        const { kg, container, error } = mountGraph([{
            type: 'EconLinearDemand',
            def: { yIntercept: 15, slope: -1, stroke: 'red' }
        }]);

        expect(error).toBeNull();
        expect(strokesOf(container)).toContain('#d62728');
        kg.destroy();
    });
});

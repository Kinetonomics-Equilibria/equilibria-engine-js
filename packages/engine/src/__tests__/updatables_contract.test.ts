import { describe, it, expect, beforeAll } from 'vitest';
import { mountConfig, stubContainerLayout } from './helpers';

/**
 * Which drawn properties respond to a param change, and which are frozen.
 *
 * This exists because P4 was planned against a wrong reading of exactly this
 * question — `Curve` was believed to have emptied its updatables, and the axis
 * title was believed to be one. Neither was true, and both were only settled by
 * running the code. A list of what is live is worth pinning: it is what any
 * feature that wants to change the diagram at runtime has to build on, and it
 * is invisible from the outside until something silently fails to move.
 *
 * The stroke-width cases are regression guards on behaviour that already
 * worked. The `fontSize` case is the one that did not.
 */

beforeAll(() => stubContainerLayout(800, 400));

const graph = (objects: any[]) => ({
    xAxis: { title: 'Quantity', min: 0, max: 30 },
    yAxis: { title: 'Price', min: 0, max: 30 },
    objects
});

function mount(objects: any[], params: any[]) {
    return mountConfig({ schema: 'EconSchema', params, layout: { OneGraph: { graph: graph(objects) } } });
}

const param = (name: string, value: number, max = 40) => ({ name, value, min: 0, max, round: 1 });

/** The drawn curve paths, without the transparent hit areas that sit under them. */
function curvePaths(c: HTMLElement) {
    return Array.from(c.querySelectorAll('path'))
        .filter(p => (p.getAttribute('class') || '').startsWith('path-'));
}

/**
 * The div one Label draws into. Scoped to `div[class^="rootElement-"]` because
 * every ancestor's textContent contains the same text, and the outermost match
 * is the positioning container, which carries none of a label's styles.
 */
function labelDiv(c: HTMLElement, text: string): HTMLElement | undefined {
    return Array.from(c.querySelectorAll('div[class^="rootElement-"]'))
        .find(d => (d.textContent || '').indexOf(text) > -1) as HTMLElement | undefined;
}

describe('stroke width is updatable, and always was', () => {

    it('a curve redraws at a new stroke width', () => {
        // `Curve` calls setProperties(def, 'updatables', []) in both branches,
        // which reads as "this class has no updatables" and is why the plan
        // recorded stroke width as frozen. setProperties *appends* — the empty
        // array only makes sure the key exists — and ViewObject's own list,
        // strokeWidth included, is pushed by the super() call right after.
        const r = mount([{ Curve: { name: 'demand', fn: '20 - (x)', strokeWidth: 'params.w' } }],
            [param('w', 2, 10)]);

        expect(curvePaths(r.container).map(p => p.getAttribute('stroke-width'))).toEqual(['2']);
        r.kg.update({ params: [{ name: 'w', value: 6 }] });
        expect(curvePaths(r.container).map(p => p.getAttribute('stroke-width'))).toEqual(['6']);

        r.destroy();
    });

    it('a point redraws at a new stroke width', () => {
        const r = mount([{ Point: { name: 'e', coordinates: [10, 10], strokeWidth: 'params.w' } }],
            [param('w', 1, 10)]);

        const circle = r.container.querySelector('circle[class^="circle-"]') as HTMLElement;
        expect(circle.style.strokeWidth).toBe('1px');
        r.kg.update({ params: [{ name: 'w', value: 4 }] });
        expect(circle.style.strokeWidth).toBe('4px');

        r.destroy();
    });

    it('the density factor multiplies the width rather than replacing it', () => {
        const r = mount([{ Curve: { name: 'demand', fn: '20 - (x)', strokeWidth: 3, strokeScale: 'params.k' } }],
            [param('k', 1, 4)]);

        expect(curvePaths(r.container)[0].getAttribute('stroke-width')).toBe('3');
        r.kg.update({ params: [{ name: 'k', value: 2 }] });
        expect(curvePaths(r.container)[0].getAttribute('stroke-width')).toBe('6');

        r.destroy();
    });
});

describe('label font size is updatable, and was not', () => {

    it('an expression in fontSize resolves instead of reaching the DOM as text', () => {
        // The failure this replaces was silent and total: as a constant,
        // `fontSize` was kept as its own source string, written out as
        // `font-size: params.fpt`, discarded by the browser as an invalid
        // length, and the label rendered at whatever it inherited.
        const r = mount([{ Label: { name: 'note', text: 'hello', x: 5, y: 5, plainText: true, fontSize: 'params.f' } }],
            [param('f', 12)]);

        expect(labelDiv(r.container, 'hello')!.style.fontSize).toBe('12pt');
        r.destroy();
    });

    it('a label redraws at a new font size', () => {
        const r = mount([{ Label: { name: 'note', text: 'hello', x: 5, y: 5, plainText: true, fontSize: 'params.f' } }],
            [param('f', 12)]);

        r.kg.update({ params: [{ name: 'f', value: 24 }] });
        expect(labelDiv(r.container, 'hello')!.style.fontSize).toBe('24pt');

        r.destroy();
    });

    it('a plain number still works, and is still the default', () => {
        const r = mount([
            { Label: { name: 'sized', text: 'sized', x: 5, y: 5, plainText: true, fontSize: 18 } },
            { Label: { name: 'plain', text: 'plain', x: 5, y: 15, plainText: true } }
        ], []);

        expect(labelDiv(r.container, 'sized')!.style.fontSize).toBe('18pt');
        expect(labelDiv(r.container, 'plain')!.style.fontSize).toBe('10pt');

        r.destroy();
    });
});

describe('axis tick count is updatable', () => {

    it('responds to a param, and zero leaves the axis line with no ticks', () => {
        const r = mountConfig({
            schema: 'EconSchema',
            params: [param('t', 5, 10)],
            layout: {
                OneGraph: {
                    graph: {
                        xAxis: { title: 'Q', min: 0, max: 30, ticks: 'params.t' },
                        yAxis: { title: 'P', min: 0, max: 30, ticks: 'params.t' },
                        objects: []
                    }
                }
            }
        });

        const ticks = () => r.container.querySelectorAll('g.axis g.tick').length;
        const axisLines = () => r.container.querySelectorAll('g.axis path.domain').length;

        expect(ticks()).toBeGreaterThan(6);
        r.kg.update({ params: [{ name: 't', value: 2 }] });
        const fewer = ticks();
        expect(fewer).toBeLessThan(7);

        r.kg.update({ params: [{ name: 't', value: 0 }] });
        expect(ticks()).toBe(0);
        // The frame survives its furniture: this is what `indicator` relies on.
        expect(axisLines()).toBe(2);

        r.destroy();
    });
});

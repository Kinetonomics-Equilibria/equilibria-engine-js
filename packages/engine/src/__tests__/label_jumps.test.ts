import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { mountConfig, stubContainerLayout } from './helpers';

/**
 * A label that jumps fades in where it lands.
 *
 * A curve's label goes to its curve's other end while the equilibrium is at
 * the end it was at. Drawn there at once, it read as thrown across the chart.
 * A label going with its curve moves as far as the curve does, which in one
 * update is never a quarter of the plot, and simply moves.
 *
 * jsdom has no Web Animations, so `animate` is stood in for here, and records
 * which label was faded and how.
 */

beforeAll(() => stubContainerLayout());

let faded: { text: string, keyframes: any[] }[] = [];
let matchMedia: any;

beforeEach(() => {
    faded = [];
    (HTMLElement.prototype as any).animate = function (keyframes: any[]) {
        // As read: KaTeX writes the letter for a screen reader as well.
        const read = this.querySelector('.katex-html') || this;
        faded.push({ text: (read.textContent || '').trim(), keyframes });
        return {};
    };
    matchMedia = window.matchMedia;
});

afterEach(() => {
    delete (HTMLElement.prototype as any).animate;
    (window as any).matchMedia = matchMedia;
});

/** Supply, labelled at its upper end until `c` passes 5, and at its lower end after. */
const SUPPLY = {
    type: 'Line',
    def: {
        name: 'supply', yIntercept: 'params.c', slope: 1, color: 'colors.supply',
        label: { text: 'S', x: 'params.c > 5 ? 2 : 14' }
    }
};

function build() {
    return mountConfig({
        schema: 'EconSchema',
        params: [{ name: 'c', value: 2, min: 0, max: 8, round: 0.1 }],
        layout: { OneGraph: { graph: {
            xAxis: { title: 'Q', min: 0, max: 20 }, yAxis: { title: 'P', min: 0, max: 20 },
            objects: [SUPPLY]
        } } }
    });
}

const setC = (r: any, value: number) => r.kg.update({ params: [{ name: 'c', value }] });

describe('a label', () => {

    it('fades in at its curve\'s other end when it goes there', () => {
        const r = build();
        expect(r.error).toBe(null);
        expect(faded).toEqual([]);
        setC(r, 6);
        expect(faded.map(f => f.text)).toEqual(['S']);
        expect(faded[0].keyframes[0]).toEqual({ opacity: 0 });
        // And back.
        setC(r, 4);
        expect(faded.map(f => f.text)).toEqual(['S', 'S']);
        r.destroy();
    });

    it('simply moves as it goes with its curve, a step at a time or five', () => {
        const r = build();
        [2.5, 3, 3.5, 4, 1.5].forEach(c => setC(r, c));
        expect(faded).toEqual([]);
        r.destroy();
    });

    it('does not fade the first time it is drawn', () => {
        const r = build();
        expect(faded).toEqual([]);
        r.destroy();
    });

    it('is simply drawn where it lands for a student who has asked for less motion', () => {
        (window as any).matchMedia = (query: string) => ({ matches: query.indexOf('reduce') > -1 });
        const r = build();
        setC(r, 6);
        expect(faded).toEqual([]);
        r.destroy();
    });
});

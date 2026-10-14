import { describe, it, expect, beforeAll } from 'vitest';
import { mountConfig } from './helpers';

/**
 * A tick label gives way to a dropline's label on the same axis.
 *
 * Whether two labels collide is a question about boxes, and jsdom draws none:
 * `getBoundingClientRect` is all zeros and `clientWidth` is whatever a test says.
 * So this file gives every element the box the browser would, from the very
 * positions the engine wrote — a label div from its `left`/`top`, a tick label
 * from its axis's and its tick's `translate` and the offset d3 gives the text.
 * What is under test is the decision, not the typesetting; the browser suite
 * measures real glyphs (`tests/app.spec.ts`, "no text on the stage lands on
 * other text").
 */

const CONTAINER = { width: 800, height: 400 };
const LABEL_BOX = { width: 24, height: 20 };
const GLYPH = { width: 6, height: 12 };

const isLabel = (el: Element) => el.tagName === 'DIV' && /^rootElement-/.test(el.getAttribute('class') || '');

beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {
        get() { return isLabel(this) ? LABEL_BOX.width : CONTAINER.width; }, configurable: true
    });
    Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
        get() { return isLabel(this) ? LABEL_BOX.height : CONTAINER.height; }, configurable: true
    });

    Object.defineProperty(window.Element.prototype, 'getBoundingClientRect', {
        configurable: true,
        value: function (this: Element) {
            if (isLabel(this)) {
                const style = (this as HTMLElement).style;
                return box(parseFloat(style.left), parseFloat(style.top), LABEL_BOX.width, LABEL_BOX.height);
            }
            if (this.tagName.toLowerCase() === 'text') {
                let tx = 0, ty = 0;
                for (let n: Element | null = this; n && n.tagName.toLowerCase() !== 'svg'; n = n.parentElement) {
                    const m = /translate\(\s*([-\d.e]+)[ ,]+([-\d.e]+)\s*\)/.exec(n.getAttribute('transform') || '');
                    if (m) { tx += +m[1]; ty += +m[2]; }
                }
                const ax = +(this.getAttribute('x') || 0), ay = +(this.getAttribute('y') || 0);
                const width = GLYPH.width * (this.textContent || '').length;
                // d3 offsets a bottom axis's text down (`y`) and centres it; a
                // left axis's text left (`x`), right-aligned, centred vertically.
                return ax === 0
                    ? box(tx - width / 2, ty + ay, width, GLYPH.height)
                    : box(tx + ax - width, ty - GLYPH.height / 2, width, GLYPH.height);
            }
            return box(0, 0, 0, 0);
        }
    });
});

function box(left: number, top: number, width: number, height: number) {
    return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON() { return this; } };
}

function build(q: number, p: number, show: any = true) {
    return mountConfig({
        params: [
            { name: 'q', value: q, min: 0, max: 20, round: 0.1 },
            { name: 'p', value: p, min: 0, max: 20, round: 0.1 },
            { name: 'on', value: show ? 1 : 0, min: 0, max: 1, round: 1, presentation: true }
        ],
        layout: {
            OneGraph: {
                graph: {
                    xAxis: { title: 'Q', min: 0, max: 20 },
                    yAxis: { title: 'P', min: 0, max: 20 },
                    objects: [{
                        type: 'Point',
                        def: {
                            name: 'equilibrium', x: 'params.q', y: 'params.p', show: 'params.on',
                            droplines: { vertical: 'Q^*', horizontal: 'P^*' }
                        }
                    }]
                }
            }
        }
    });
}

/** The tick labels on screen, per axis, by the text they print. */
function ticks(r: any): { x: string[], y: string[] } {
    const axes = Array.from(r.container.querySelectorAll('g.axis')) as Element[];
    const shown = (axis: Element) => Array.from(axis.querySelectorAll('g.tick text'))
        .filter((t: any) => t.style.visibility !== 'hidden')
        .map((t: any) => t.textContent);
    // A bottom axis translates down by the plot's height; a left one does not.
    const horizontal = axes.filter(a => /translate\(0,\s*[1-9]/.test(a.getAttribute('transform') || ''));
    const vertical = axes.filter(a => horizontal.indexOf(a) === -1);
    return { x: shown(horizontal[0]), y: shown(vertical[0]) };
}

describe('a tick label under a dropline label', () => {

    it('is hidden when the dropline label lands on it, and only that one', () => {
        const r = build(10, 7.5);
        expect(r.error).toBe(null);

        const t = ticks(r);
        // `Q^*` is printed at 10 on the quantity axis: the 10 goes, its
        // neighbours stay, and the price axis is untouched.
        expect(t.x).toEqual(['0', '5', '15', '20']);
        expect(t.y).toEqual(['0', '5', '10', '15', '20']);
        r.destroy();
    });

    it('comes back when the label moves off it', () => {
        const r = build(10, 10);
        expect(ticks(r).x).not.toContain('10');
        expect(ticks(r).y).not.toContain('10');

        r.kg.update({ params: [{ name: 'q', value: 7.5 }, { name: 'p', value: 12.5 }] });

        expect(ticks(r).x).toEqual(['0', '5', '10', '15', '20']);
        expect(ticks(r).y).toEqual(['0', '5', '10', '15', '20']);
        r.destroy();
    });

    it('stays when the dropline label is not on screen', () => {
        // A lesson that has not revealed the equilibrium yet hides its labels
        // too; a tick has nothing to give way to.
        const r = build(10, 10, false);
        expect(ticks(r).x).toContain('10');
        expect(ticks(r).y).toContain('10');

        r.kg.update({ params: [{ name: 'on', value: 1 }] });
        expect(ticks(r).x).not.toContain('10');
        r.destroy();
    });
});

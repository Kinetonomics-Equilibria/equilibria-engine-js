import { describe, it, expect, beforeAll } from 'vitest';
import { mountConfig } from './helpers';

/**
 * A ghost's label keeps clear of the live object's label.
 *
 * Both are copied from one def and placed at one coordinate, on two curves that
 * a small move leaves a fraction of a unit apart — so a nudge printed `D₀` under
 * `D`. The live label stays where the author put it; the ghost's slides along its
 * own curve until it clears.
 *
 * jsdom does no layout, so label divs are given a fixed box here and the
 * container its usual 800×400. Positions are read back from the `left`/`top` the
 * engine wrote, through the label's own scales.
 */

const LABEL_BOX = { width: 24, height: 20 };

const isLabel = (el: Element) => el.tagName === 'DIV' && /^rootElement-/.test(el.getAttribute('class') || '');

beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {
        get() { return isLabel(this) ? LABEL_BOX.width : 800; }, configurable: true
    });
    Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
        get() { return isLabel(this) ? LABEL_BOX.height : 400; }, configurable: true
    });
});

function build() {
    return mountConfig({
        schema: 'EconSchema',
        params: [{ name: 'a', value: 20, min: 12, max: 28, round: 0.1 }],
        layout: {
            OneGraph: {
                graph: {
                    xAxis: { title: 'Q', min: 0, max: 20 },
                    yAxis: { title: 'P', min: 0, max: 20 },
                    objects: [{
                        type: 'Line',
                        def: {
                            name: 'demand', yIntercept: 'params.a', slope: -1,
                            label: { text: 'D', x: 4 }, ghost: { label: '_0' }
                        }
                    }]
                }
            }
        }
    });
}

function move(r: any, value: number) {
    r.kg.snapshot();
    r.kg.update({ params: [{ name: 'a', value }] });
}

/** A label's box in pixels, and its anchor read back in graph units. */
function drawn(r: any, text: string) {
    const label = (r.kg as any).view.viewObjects.find((o: any) => String(o.text) === text);
    const node = label.rootElement.node() as HTMLElement;
    const left = parseFloat(node.style.left), top = parseFloat(node.style.top);
    return {
        visible: node.style.display !== 'none',
        box: { left, top, right: left + LABEL_BOX.width, bottom: top + LABEL_BOX.height },
        x: label.xScale.scale.invert(left + LABEL_BOX.width / 2),
        y: label.yScale.scale.invert(top + LABEL_BOX.height / 2)
    };
}

const overlap = (a: any, b: any) =>
    Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);

describe("a ghost's label next to the live one", () => {

    it('slides along its own curve to clear the live label after a small move', () => {
        const r = build();
        expect(r.error).toBe(null);

        move(r, 20.5);
        const live = drawn(r, 'D'), ghost = drawn(r, 'D_0');

        // The live label has not moved from where the author put it.
        expect(live.x).toBeCloseTo(4, 6);
        expect(live.y).toBeCloseTo(16.5, 6);

        // The ghost's is on its own curve — P = 20 − Q, one snapshot back —
        // and nowhere on top of the live one.
        expect(ghost.visible).toBe(true);
        expect(ghost.y).toBeCloseTo(20 - ghost.x, 3);
        expect(overlap(ghost.box, live.box)).toBe(false);
        r.destroy();
    });

    it('moves no further than it has to', () => {
        // Down the line, not off to the far end of it: just past the live label.
        const r = build();
        move(r, 20.5);
        const ghost = drawn(r, 'D_0');
        expect(ghost.x).toBeGreaterThan(4);
        expect(ghost.x).toBeLessThan(8);
        r.destroy();
    });

    it('stays where the author put it when the two are already apart', () => {
        const r = build();
        move(r, 14);
        const ghost = drawn(r, 'D_0');
        expect(ghost.x).toBeCloseTo(4, 6);
        expect(ghost.y).toBeCloseTo(16, 6);
        r.destroy();
    });

    it('follows the live label back as the gap closes and opens again', () => {
        const r = build();
        move(r, 14);
        // A second gesture from 14: the ghost is now at a = 14, the live curve
        // a hair above it.
        move(r, 14.3);
        expect(overlap(drawn(r, 'D_0').box, drawn(r, 'D').box)).toBe(false);

        move(r, 20);
        expect(drawn(r, 'D_0').x).toBeCloseTo(4, 6);
        r.destroy();
    });
});

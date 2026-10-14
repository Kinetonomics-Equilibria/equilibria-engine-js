import { describe, it, expect, beforeAll } from 'vitest';
import { mountConfig, stubContainerLayout } from './helpers';

/**
 * A curve's label stays on the plot by sliding along the curve.
 *
 * An author places a curve label at a coordinate — supply's `S` at `x: 16` —
 * and the other coordinate is wherever the curve is there. Shift the curve and
 * that point can leave the plot: supply with an intercept above 4 is above the
 * top of a 0–20 axis at `x: 16`, so the label was hidden, and every input-cost
 * scenario on the study screen drew a supply curve nobody had named.
 *
 * jsdom does no layout, so these place the label's *anchor*: the stubbed
 * `clientWidth` makes every box larger than the panel, which `fits` treats as
 * no box at all. Whether the typeset box stays inside is the browser suite's to
 * say.
 */

beforeAll(() => stubContainerLayout());

const AXES = {
    xAxis: { title: 'Q', min: 0, max: 20 },
    yAxis: { title: 'P', min: 0, max: 20 }
};

function build(objects: any[], params: any[]) {
    return mountConfig({
        schema: 'EconSchema',
        params,
        layout: { OneGraph: { graph: { ...AXES, objects } } }
    });
}

const SUPPLY = {
    type: 'Line',
    def: {
        name: 'supply', yIntercept: 'params.c', slope: 1,
        color: 'colors.supply', label: { text: 'S', x: 16 }
    }
};

const C = (value: number) => ({ name: 'c', value, min: 0, max: 30, round: 0.1 });

/** The label's view object, and where it was drawn, read back through its own scales. */
function drawn(r: any, text: string) {
    const label = (r.kg as any).view.viewObjects.find((o: any) => String(o.text) === text);
    const node = label.rootElement.node() as HTMLElement;
    // Centred on its anchor, so the anchor is half the (stubbed) box in.
    return {
        visible: node.style.display !== 'none',
        x: label.xScale.scale.invert(parseFloat(node.style.left) + node.clientWidth / 2),
        y: label.yScale.scale.invert(parseFloat(node.style.top) + node.clientHeight / 2)
    };
}

describe('a curve label that would leave the plot', () => {

    it('stays where the author put it while that place is on the plot', () => {
        const r = build([SUPPLY], [C(2)]);
        expect(r.error).toBe(null);

        const s = drawn(r, 'S');
        expect(s.visible).toBe(true);
        expect(s.x).toBeCloseTo(16, 6);
        expect(s.y).toBeCloseTo(18, 6);
        r.destroy();
    });

    it('slides back along its curve to the edge, rather than disappearing', () => {
        // At x = 16 supply is at P = 22, above the top of the plot.
        const r = build([SUPPLY], [C(6)]);

        const s = drawn(r, 'S');
        expect(s.visible).toBe(true);
        // Still on the curve: P = 6 + Q.
        expect(s.y).toBeCloseTo(6 + s.x, 3);
        // At the last place the curve is on the plot, which is where it crosses
        // the top edge at Q = 14 — not somewhere arbitrary further back.
        expect(s.y).toBeLessThanOrEqual(20);
        expect(s.x).toBeCloseTo(14, 1);
        r.destroy();
    });

    it('follows the curve as it moves, and returns home when there is room again', () => {
        const r = build([SUPPLY], [C(2)]);

        r.kg.update({ params: [{ name: 'c', value: 8 }] });
        let s = drawn(r, 'S');
        expect(s.visible).toBe(true);
        expect(s.x).toBeCloseTo(12, 1);

        r.kg.update({ params: [{ name: 'c', value: 2 }] });
        s = drawn(r, 'S');
        expect(s.x).toBeCloseTo(16, 6);
        expect(s.y).toBeCloseTo(18, 6);
        r.destroy();
    });

    it('goes with its curve when none of the curve is on the plot', () => {
        // Intercept 25: the whole line is above a 0–20 plot, so there is nowhere
        // on it to put a label, and a label floating on its own names nothing.
        const r = build([SUPPLY], [C(25)]);
        expect(drawn(r, 'S').visible).toBe(false);
        r.destroy();
    });

    it('slides along a ghost too, which is bound one snapshot back', () => {
        const r = build([{
            type: 'Line',
            def: {
                name: 'demand', yIntercept: 'params.a', slope: -1,
                label: { text: 'D', x: 4 }, ghost: { label: '_0' }
            }
        }], [{ name: 'a', value: 26, min: 12, max: 30, round: 0.1 }]);

        // The ghost is placed from prev, which was seeded at a = 26: at x = 4
        // it would be at P = 22, so it slides to where it crosses P = 20.
        r.kg.snapshot();
        r.kg.update({ params: [{ name: 'a', value: 18 }] });

        const ghost = drawn(r, 'D_0');
        expect(ghost.visible).toBe(true);
        expect(ghost.y).toBeCloseTo(26 - ghost.x, 3);
        expect(ghost.x).toBeCloseTo(6, 1);

        const live = drawn(r, 'D');
        expect(live.x).toBeCloseTo(4, 6);
        expect(live.y).toBeCloseTo(14, 6);
        r.destroy();
    });
});

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { mountConfig, stubContainerLayout, captureWarnings } from './helpers';
import { KG_EVENTS } from '../ts/constants';

/**
 * `relayout` — a new shape for the canvas, and new places for its panels,
 * without a new engine.
 *
 * A canvas used to keep the aspect ratio it was built with, so a host whose box
 * changed proportions had to build the diagram again — and a new engine is a
 * new model, with no `prev`. The study screen paid for that every time a
 * student resized their window: the ghost of the curve they had just moved,
 * the delta beside each panel and the sentence under the stage all went, and
 * the diagram flashed while it was rebuilt.
 *
 * So the claims worth pinning are the ones a rebuild broke. The same canvas is
 * still there afterwards; the move the student made is still the move the
 * diagram remembers; and nothing about laying it out again is reported as
 * something the student did.
 */

const CANVAS_W = 800;

beforeAll(() => stubContainerLayout(CANVAS_W, 400));

/** A rect param, the way a host that places panels itself would declare one. */
const rect = (name: string, value: number) =>
    ({ name, value, min: 0, max: 1, round: 0.000001, presentation: true });

const A = { name: 'a', value: 20, min: 12, max: 28, round: 0.1 };

const DEMAND = {
    type: 'Line',
    def: { name: 'demand', yIntercept: 'params.a', slope: -1, ghost: true }
};

/** One panel whose rect is four presentation params, on a canvas twice as wide as it is tall. */
function stage(panel: any = {}) {
    return {
        schema: 'EconSchema',
        params: [A, rect('px', 0.1), rect('py', 0.1), rect('pw', 0.4), rect('ph', 0.8)],
        calcs: { shift: 'params.a - prev.params.a' },
        layout: {
            CustomLayout: {
                aspectRatio: 2,
                panels: [{
                    key: 'market',
                    x: 'params.px', y: 'params.py', width: 'params.pw', height: 'params.ph',
                    xAxis: { title: 'Q', min: 0, max: 20 },
                    yAxis: { title: 'P', min: 0, max: 20 },
                    objects: [DEMAND],
                    ...panel
                }]
            }
        }
    };
}

/** Every curve drawn, without the transparent hit areas — so a ghost counts once. */
function curves(r: any): string[] {
    return Array.from(r.container.querySelectorAll('path') as NodeListOf<SVGPathElement>)
        .filter(p => !(p.getAttribute('class') || '').startsWith('dragPath'))
        .map(p => p.getAttribute('d') as string)
        .filter(d => typeof d === 'string' && d.length > 60);
}

const scale = (r: any, name: string) => (r.kg as any).view.scales.find((s: any) => s.name === name);
const valueOf = (r: any, name: string) => r.kg.getParams().find((p: any) => p.name === name).value;

function move(r: any, value: number) {
    r.kg.snapshot();
    r.kg.update({ params: [{ name: 'a', value }] });
}

describe('a new shape', () => {

    it('redraws the same canvas at the new proportions', () => {
        const r = mountConfig(stage());
        expect(r.error).toBeNull();
        const svg = r.container.querySelector('svg')!;
        const before = curves(r);
        expect(svg.getAttribute('height')).toBe('400');

        r.kg.relayout({ aspectRatio: 1 });

        // The same element, so nothing was rebuilt — a rebuild empties the
        // container — and drawn square now.
        expect(r.container.querySelector('svg')).toBe(svg);
        expect(svg.getAttribute('height')).toBe(String(CANVAS_W));
        expect(scale(r, 'market_y').extent).toBe(CANVAS_W);
        // And what is in the panel followed it: the curve is twice as tall.
        expect(curves(r)).not.toEqual(before);
        r.destroy();
    });

    it('keeps its own shape when handed one that is not a shape', () => {
        const r = mountConfig(stage());
        const svg = r.container.querySelector('svg')!;

        [0, -1, NaN].forEach(ratio => {
            const { warnings } = captureWarnings(() => r.kg.relayout({ aspectRatio: ratio }));
            expect(warnings.join(' ')).toContain('is not a shape');
        });

        expect(svg.getAttribute('height')).toBe('400');
        r.destroy();
    });
});

describe('new places for the panels', () => {

    it('moves a panel whose rect is a presentation param', () => {
        const r = mountConfig(stage());
        const before = curves(r);

        r.kg.relayout({ params: [{ name: 'px', value: 0.45 }, { name: 'pw', value: 0.5 }] });

        expect(scale(r, 'market_x').rangeMin).toBeCloseTo(0.45, 6);
        expect(scale(r, 'market_x').rangeMax).toBeCloseTo(0.95, 6);
        expect(curves(r)).not.toEqual(before);
        r.destroy();
    });

    // A stage moving three panels writes twelve numbers. Through `update` that
    // was twelve redraws, eleven of them of a panel half-way to where it was
    // going.
    it('in one redraw, however many it writes', () => {
        const r = mountConfig(stage());
        const model = (r.kg as any).view.model;
        const redraws = vi.spyOn(model, 'update');

        r.kg.relayout({
            aspectRatio: 1.5,
            params: [
                { name: 'px', value: 0.2 }, { name: 'py', value: 0.2 },
                { name: 'pw', value: 0.3 }, { name: 'ph', value: 0.6 }
            ]
        });

        expect(redraws).toHaveBeenCalledTimes(1);
        redraws.mockRestore();
        r.destroy();
    });

    it('lets an auto panel take the level its new size calls for, in the same pass', () => {
        // 0.2 of 800 is 160px across: an indicator, with no ticks at all.
        const r = mountConfig(stage({ density: 'auto' }));
        r.kg.relayout({ params: [{ name: 'pw', value: 0.2 }, { name: 'ph', value: 0.4 }] });
        expect(r.container.querySelectorAll('g.axis g.tick')).toHaveLength(0);

        // 0.8 of 800 by 0.9 of 400, so 360px on its short side: compact, which
        // draws its ticks.
        r.kg.relayout({ params: [{ name: 'pw', value: 0.8 }, { name: 'ph', value: 0.9 }] });
        expect(r.container.querySelectorAll('g.axis g.tick').length).toBeGreaterThan(0);
        r.destroy();
    });

    it('says nothing about it, since the student did nothing', () => {
        const r = mountConfig(stage());
        const heard: unknown[] = [];
        r.kg.on(KG_EVENTS.PARAM_CHANGED, (e: unknown) => heard.push(e));

        r.kg.relayout({ aspectRatio: 1, params: [{ name: 'px', value: 0.3 }] });

        expect(heard).toEqual([]);
        r.destroy();
    });
});

/**
 * The reason this exists. Rebuilding the engine to change its shape also built
 * a new model, whose `prev` was wherever the config said — and a host that
 * restored the student's values onto it then had a choice of two wrong
 * answers: snapshot, and lose the move they had made, or not, and draw a ghost
 * of the config's own values as though the student had dragged it there.
 */
describe('what the diagram remembers', () => {

    it('keeps the last move: its ghost, its delta and its snapshot', () => {
        const r = mountConfig(stage());
        move(r, 14);
        const snapshot = r.kg.getSnapshot();
        expect(curves(r)).toHaveLength(2);
        expect(r.kg.getCalcs().shift).toBeCloseTo(-6, 6);

        r.kg.relayout({ aspectRatio: 1.5, params: [{ name: 'px', value: 0.3 }] });

        expect(curves(r)).toHaveLength(2);
        expect(r.kg.getCalcs().shift).toBeCloseTo(-6, 6);
        expect(r.kg.getSnapshot()!.seq).toBe(snapshot!.seq);
        expect(r.kg.getSnapshot()!.params.a).toBe(20);
        r.destroy();
    });

    it('raises no ghost over a diagram nobody has touched', () => {
        const r = mountConfig(stage());

        r.kg.relayout({ aspectRatio: 1, params: [{ name: 'px', value: 0.3 }] });

        expect(curves(r)).toHaveLength(1);
        expect(r.kg.getSnapshot()).toBeNull();
        r.destroy();
    });

    it('will not move state, and says what does', () => {
        const r = mountConfig(stage());
        const before = curves(r);

        const { warnings } = captureWarnings(() => r.kg.relayout({ params: [{ name: 'a', value: 14 }] }));

        expect(warnings.join(' ')).toContain('"a" is not a presentation param');
        expect(warnings.join(' ')).toContain('update({ params })');
        expect(valueOf(r, 'a')).toBe(20);
        expect(curves(r)).toEqual(before);
        r.destroy();
    });
});

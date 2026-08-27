import { describe, it, expect, beforeAll } from 'vitest';
import { mountConfig, stubContainerLayout } from './helpers';

/**
 * Geometry that can move.
 *
 * A panel's edges are a `Scale`'s `rangeMin`/`rangeMax`, and those used to be
 * *constants* — read once in the UpdateListener constructor and never again. This file
 * pins the two halves of making them updatables:
 *
 *   1. the range itself re-evaluates when a param changes, and
 *   2. everything drawn against that scale actually moves with it.
 *
 * The second half is the one that was missing and is easy to lose again. An object only
 * redraws when `hasChanged`, which tracks its *own* updatables — and a panel sliding
 * across the canvas changes nothing an object knows about itself. Before the
 * `scalesMoved()` check in `viewObject.update`, the axis moved and every curve inside it
 * stayed exactly where it had been drawn.
 *
 * This is what makes promotion — moving a panel from a rail onto a stage — a param
 * change rather than a remount.
 */

beforeAll(() => stubContainerLayout());

/** A panel whose left edge is one of two positions, chosen by `focus`. */
const movingPanel = (objects: any[] = []) => ({
    schema: 'EconSchema',
    params: [{ name: 'focus', value: 0, min: 0, max: 1, round: 1 }],
    layout: {
        CustomLayout: {
            aspectRatio: 2,
            panels: [{
                key: 'stage',
                x: 'params.focus == 0 ? 0.05 : 0.5',
                y: 0.1, width: 0.4, height: 0.8,
                xAxis: { title: 'x', min: 0, max: 10 },
                yAxis: { title: 'y', min: 0, max: 10 },
                objects
            }]
        }
    }
});

/** Mount, read the geometry, promote the panel, read it again. */
function beforeAndAfter(objects: any[], read: (el: HTMLElement) => string) {
    const r = mountConfig(movingPanel(objects));
    expect(r.error).toBeNull();

    const before = read(r.container);
    r.kg.update({ params: [{ name: 'focus', value: 1 }] });
    const after = read(r.container);

    const scales = (r.kg as any).view.scales;
    const stageX = scales.find((s: any) => s.name === 'stage_x');
    r.destroy();

    return { before, after, stageX };
}

const paths = (el: HTMLElement) => Array.from(el.querySelectorAll('path'))
    .map(p => p.getAttribute('d')).filter(Boolean).join('|');

const line = { type: 'Line', def: { yIntercept: 2, slope: 0.5, color: 'blue' } };

// --- the range itself ------------------------------------------------------------

describe('a range that is an expression', () => {
    it('re-evaluates when the param it names changes', () => {
        const r = mountConfig(movingPanel([line]));
        const stageX = () => (r.kg as any).view.scales.find((s: any) => s.name === 'stage_x');

        expect(stageX().rangeMin).toBe(0.05);
        r.kg.update({ params: [{ name: 'focus', value: 1 }] });
        expect(stageX().rangeMin).toBe(0.5);

        r.destroy();
    });

    /**
     * The failure this guards: as a constant, `rangeMin` was read through parseFloat,
     * so a composed expression stayed a string and `rangeMin * extent` was NaN — a
     * diagram drawn at no coordinates at all.
     */
    it('resolves to a number, never to the expression string', () => {
        const r = mountConfig(movingPanel([line]));
        (r.kg as any).view.scales.forEach((s: any) => {
            expect(typeof s.rangeMin, `${s.name} rangeMin`).toBe('number');
            expect(typeof s.rangeMax, `${s.name} rangeMax`).toBe('number');
            expect(isNaN(s.rangeMin)).toBe(false);
        });
        r.destroy();
    });

    it('leaves a plain numeric range exactly as authored', () => {
        const r = mountConfig({
            schema: 'EconSchema', params: [],
            layout: { OneGraph: { graph: { xAxis: { title: 'x', min: 0, max: 10 }, yAxis: { title: 'y', min: 0, max: 10 }, objects: [line] } } }
        });
        const xs = (r.kg as any).view.scales[2];
        expect(xs.rangeMin).toBe(0.15);
        expect(xs.rangeMax).toBe(0.89);
        r.destroy();
    });
});

// --- and everything drawn against it ---------------------------------------------

describe('what moves with the panel', () => {
    it('the axis', () => {
        const { before, after } = beforeAndAfter([], el =>
            Array.from(el.querySelectorAll('g.axis, g[class*="axis"]'))
                .map(g => g.getAttribute('transform')).join('|') || paths(el));

        expect(before).not.toBe('');
        expect(after).not.toBe(before);
    });

    it('a curve', () => {
        const { before, after } = beforeAndAfter(
            [{ type: 'Curve', def: { univariateFunction: { fn: '2 + 0.5*x' }, color: 'blue' } }],
            paths);

        expect(before).not.toBe('');
        expect(after).not.toBe(before);
    });

    it('a point', () => {
        const { before, after } = beforeAndAfter(
            [{ type: 'Point', def: { x: 5, y: 5, color: 'red' } }],
            el => Array.from(el.querySelectorAll('circle, path'))
                .map(e => e.getAttribute('cx') || e.getAttribute('d') || e.getAttribute('transform')).join('|'));

        expect(before).not.toBe('');
        expect(after).not.toBe(before);
    });

    /**
     * The case the plan called out as most likely to break: a clip path is drawn once
     * into `<defs>`, so if anything caches pixel geometry it is this. A stale clip
     * rectangle is the worst of the failure modes — the panel moves and its contents
     * are cut off by a mask still sitting where the panel used to be.
     */
    it('the clip path an area is drawn through', () => {
        const { before, after } = beforeAndAfter(
            [{
                type: 'Area',
                def: {
                    univariateFunction1: { fn: '2 + 0.5*x' },
                    univariateFunction2: { fn: '0' },
                    color: 'green'
                }
            }],
            el => {
                const defs = el.querySelector('defs');
                const clip = defs ? Array.from(defs.querySelectorAll('rect, path'))
                    .map(e => e.getAttribute('x') || e.getAttribute('d')).join('|') : '';
                return clip + '#' + paths(el);
            });

        expect(before).not.toBe('#');
        expect(after).not.toBe(before);
    });
});

// --- what must not change ---------------------------------------------------------

describe('the panel keeps its meaning while it moves', () => {
    it('the same graph coordinates land at different pixels, not different coordinates', () => {
        const r = mountConfig(movingPanel([{ type: 'Point', def: { x: 5, y: 5, color: 'red' } }]));
        const stageX = () => (r.kg as any).view.scales.find((s: any) => s.name === 'stage_x');

        const pixelsBefore = stageX().scale(5);
        const domainBefore = [stageX().domainMin, stageX().domainMax];

        r.kg.update({ params: [{ name: 'focus', value: 1 }] });

        expect(stageX().scale(5)).not.toBe(pixelsBefore);
        expect([stageX().domainMin, stageX().domainMax]).toEqual(domainBefore);

        r.destroy();
    });

    it('the panel keeps its width — the move is a translation', () => {
        const r = mountConfig(movingPanel([line]));
        const width = () => {
            const s = (r.kg as any).view.scales.find((x: any) => x.name === 'stage_x');
            return Math.round((s.rangeMax - s.rangeMin) * 1e6) / 1e6;
        };

        const before = width();
        r.kg.update({ params: [{ name: 'focus', value: 1 }] });

        expect(width()).toBe(before);
        r.destroy();
    });
});

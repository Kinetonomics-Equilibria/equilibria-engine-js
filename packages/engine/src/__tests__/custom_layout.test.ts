import { describe, it, expect, beforeAll } from 'vitest';
import { mountConfig, stubContainerLayout, captureWarnings } from './helpers';

/**
 * `CustomLayout` — the pass-through layout.
 *
 * Every other layout class is a hardcoded table of fractions; this one takes the table
 * from the host, which is what lets an app compute its own arrangement from a measured
 * viewport. The tests below assert on `parsedData.scales`, for the same reason
 * `layouts.test.ts` does: a layout's entire output is an aspect ratio and a rect per
 * panel, and a DOM snapshot of four panels would fail for unrelated reasons.
 *
 * The warnings are as much the subject as the geometry. A host can pass nonsense — a
 * panel off the canvas, a link to a key that does not exist — and the engine's job is to
 * name the panel rather than silently draw something wrong.
 */

beforeAll(() => stubContainerLayout());

interface Rect { x: number; y: number; width: number; height: number }

const round = (n: number) => Math.round(n * 1e6) / 1e6;

const axes = () => ({ xAxis: { title: 'x', min: 0, max: 10 }, yAxis: { title: 'y', min: 0, max: 10 }, objects: [] as any[] });

const config = (def: any, over: any = {}) => ({ schema: 'EconSchema', params: [], layout: { CustomLayout: def }, ...over });

/**
 * The parsed panels, by scale name. `parsedData.scales` opens with the two defaults
 * named `x` and `y` (view.ts), then a pair per panel in construction order; y is
 * inverted (`rangeMin = y + height`, `rangeMax = y`).
 */
function panels(cfg: any) {
    const { result, warnings } = captureWarnings(() => mountConfig(cfg));
    const parsed: any = (result.kg as any).view.parsedData;
    const scales = parsed.scales.slice(2);

    const rects: Rect[] = [];
    const names: string[] = [];
    for (let i = 0; i < scales.length; i += 2) {
        const xs = scales[i], ys = scales[i + 1];
        rects.push({
            x: round(xs.rangeMin),
            width: round(xs.rangeMax - xs.rangeMin),
            y: round(ys.rangeMax),
            height: round(ys.rangeMin - ys.rangeMax)
        });
        names.push(xs.name);
    }

    const html = result.container.innerHTML;
    result.destroy();
    return { aspectRatio: parsed.aspectRatio, rects, names, warnings, parsed, html };
}

const STAGE_AND_RAIL = {
    aspectRatio: 1.26,
    panels: [
        { key: 'market', x: 0.04, y: 0.03, width: 0.52, height: 0.9, ...axes() },
        { key: 'firm', x: 0.62, y: 0.03, width: 0.16, height: 0.28, ...axes() },
        { key: 'cost', x: 0.62, y: 0.35, width: 0.16, height: 0.28, ...axes() },
    ]
};

// --- geometry -------------------------------------------------------------------

describe('panels land where the host put them', () => {
    it('one graph per panel, at the given fractions', () => {
        const { rects } = panels(config(STAGE_AND_RAIL));

        expect(rects).toEqual([
            { x: 0.04, y: 0.03, width: 0.52, height: 0.9 },
            { x: 0.62, y: 0.03, width: 0.16, height: 0.28 },
            { x: 0.62, y: 0.35, width: 0.16, height: 0.28 },
        ]);
    });

    it('takes its aspect ratio from the def', () => {
        expect(panels(config(STAGE_AND_RAIL)).aspectRatio).toBe(1.26);
    });

    it('falls back to the base Layout aspect ratio of 2', () => {
        const { aspectRatio } = panels(config({ panels: [{ key: 'a', x: 0.1, y: 0.1, width: 0.8, height: 0.8, ...axes() }] }));
        expect(aspectRatio).toBe(2);
    });

    it('draws as many panels as it is given', () => {
        const many = { panels: [0, 1, 2, 3, 4, 5].map(i => ({ key: 'p' + i, x: 0.02 + i * 0.16, y: 0.1, width: 0.14, height: 0.8, ...axes() })) };
        expect(panels(config(many)).rects).toHaveLength(6);
    });

    it('renders something for each panel', () => {
        const { html } = panels(config(STAGE_AND_RAIL));
        // three panels, each with two axes
        expect((html.match(/class="axis/g) || []).length).toBeGreaterThanOrEqual(6);
    });
});

// --- the key is the handle --------------------------------------------------------

describe('panel keys', () => {
    it('names each panel\'s scales after its key', () => {
        const { names } = panels(config(STAGE_AND_RAIL));
        expect(names).toEqual(['market_x', 'firm_x', 'cost_x']);
    });

    it('falls back to a positional key when none is given', () => {
        const { names, warnings } = panels(config({ panels: [{ x: 0.1, y: 0.1, width: 0.3, height: 0.8, ...axes() }] }));
        expect(names).toEqual(['panel0_x']);
        expect(warnings).toEqual([]);
    });

    it('warns when two panels share a key, and says why it matters', () => {
        const { warnings } = panels(config({
            panels: [
                { key: 'same', x: 0.05, y: 0.1, width: 0.4, height: 0.8, ...axes() },
                { key: 'same', x: 0.55, y: 0.1, width: 0.4, height: 0.8, ...axes() },
            ]
        }));

        expect(warnings.some(w => w.includes('CustomLayout') && w.includes('"same"'))).toBe(true);
        // and the view says which lookup goes wrong as a result
        expect(warnings.some(w => w.includes('two scales are named'))).toBe(true);
    });
});

// --- nonsense the host can pass ----------------------------------------------------

describe('geometry the engine cannot honour', () => {
    it('warns by key when a panel runs off the canvas', () => {
        const { warnings } = panels(config({ panels: [{ key: 'wide', x: 0.6, y: 0.1, width: 0.7, height: 0.8, ...axes() }] }));

        expect(warnings).toHaveLength(1);
        expect(warnings[0]).toContain('"wide"');
        expect(warnings[0]).toContain('outside the canvas');
    });

    it('warns by key on a panel with no extent', () => {
        const { warnings } = panels(config({ panels: [{ key: 'flat', x: 0.1, y: 0.1, width: 0.5, height: 0, ...axes() }] }));

        expect(warnings).toHaveLength(1);
        expect(warnings[0]).toContain('"flat"');
    });

    it('warns and skips a panel missing part of its rect', () => {
        const { rects, warnings } = panels(config({
            panels: [
                { key: 'ok', x: 0.05, y: 0.1, width: 0.4, height: 0.8, ...axes() },
                { key: 'partial', x: 0.55, y: 0.1, ...axes() },
            ]
        }));

        expect(rects).toHaveLength(1);
        expect(warnings).toHaveLength(1);
        expect(warnings[0]).toContain('"partial"');
        expect(warnings[0]).toContain('width');
        expect(warnings[0]).toContain('height');
    });

    it('warns when there are no panels at all', () => {
        const { rects, warnings } = panels(config({ aspectRatio: 1.5 }));

        expect(rects).toEqual([]);
        expect(warnings).toHaveLength(1);
        expect(warnings[0]).toContain('panels');
    });

    /**
     * A position may legitimately be an expression, whose value is unknown until the
     * model exists. Warning about those would either reject valid configs or force an
     * evaluation the layout cannot do, so the bounds check stays silent on them.
     */
    it('does not guess at an expression it cannot evaluate yet', () => {
        const { warnings } = panels(config({
            params: [{ name: 'focus', value: 0, min: 0, max: 1, round: 1 }],
            panels: [{ key: 'movable', x: 'params.focus == 0 ? 0.05 : 0.5', y: 0.1, width: 0.4, height: 0.8, ...axes() }]
        }, { params: [{ name: 'focus', value: 0, min: 0, max: 1, round: 1 }] }));

        expect(warnings).toEqual([]);
    });
});

// --- linking -----------------------------------------------------------------------

describe('linkTo', () => {
    /** `addSecondGraph` only wires a def that already declares yScale2Name. */
    const crossGraphPanel = (key: string, over: any = {}) => ({
        key, x: 0.05, y: 0.1, width: 0.4, height: 0.8,
        xAxis: { title: 'x', min: 0, max: 10 }, yAxis: { title: 'y', min: 0, max: 10 },
        objects: [{ type: 'CrossGraphSegment', def: { a: [1, 1], b: [5, 5], yScale2Name: '' } }],
        ...over
    });

    function wiredScales(def: any) {
        const { result, warnings } = captureWarnings(() => mountConfig(config(def)));
        const parsed: any = (result.kg as any).view.parsedData;
        const seg = parsed.layers.flat().find((td: any) => td.def && td.def.hasOwnProperty('yScale2Name'));
        result.destroy();
        return { seg, warnings };
    }

    it('wires an object to the scales of the panel it links to', () => {
        const { seg, warnings } = wiredScales({
            panels: [
                crossGraphPanel('left', { linkTo: 'right' }),
                { key: 'right', x: 0.55, y: 0.1, width: 0.4, height: 0.8, ...axes() },
            ]
        });

        expect(seg.def.xScale2Name).toBe('right_x');
        expect(seg.def.yScale2Name).toBe('right_y');
        expect(warnings).toEqual([]);
    });

    it('a panel may link forwards to one declared after it, or backwards', () => {
        const { seg } = wiredScales({
            panels: [
                { key: 'first', x: 0.05, y: 0.1, width: 0.4, height: 0.8, ...axes() },
                crossGraphPanel('second', { x: 0.55, linkTo: 'first' }),
            ]
        });

        expect(seg.def.xScale2Name).toBe('first_x');
    });

    it('warns by key when linkTo names a panel that does not exist', () => {
        const { seg, warnings } = wiredScales({
            panels: [crossGraphPanel('left', { linkTo: 'nowhere' })]
        });

        expect(warnings.some(w => w.includes('"left"') && w.includes('"nowhere"'))).toBe(true);
        // the link was dropped, not silently pointed somewhere
        expect(seg.def.yScale2Name).toBe('');
    });

    it('warns rather than linking a panel to itself', () => {
        const { warnings } = wiredScales({
            panels: [crossGraphPanel('self', { linkTo: 'self' })]
        });

        expect(warnings.some(w => w.includes('itself'))).toBe(true);
    });

    it('leaves objects unwired when no link is declared', () => {
        const { seg, warnings } = wiredScales({
            panels: [
                crossGraphPanel('left'),
                { key: 'right', x: 0.55, y: 0.1, width: 0.4, height: 0.8, ...axes() },
            ]
        });

        expect(seg.def.yScale2Name).toBe('');
        // the layout is silent — it was asked for no link — but the object says it
        // cannot be drawn, rather than taking the whole diagram down with it
        expect(warnings.some(w => w.startsWith('CustomLayout:'))).toBe(false);
        // the view names the view-object type, which is what a CrossGraphSegment parses to
        expect(warnings.some(w => w.includes('second graph') && w.includes('not drawn'))).toBe(true);
    });

    /**
     * The behaviour this replaces: `xScale2` was null, the segment read `.scale` off it
     * while drawing, and mount() failed with an empty container — one mis-typed key
     * costing the whole diagram.
     */
    it('an unresolvable link costs one object, not the diagram', () => {
        const { result } = captureWarnings(() => mountConfig(config({
            panels: [
                crossGraphPanel('left', { linkTo: 'nowhere' }),
                { key: 'right', x: 0.55, y: 0.1, width: 0.4, height: 0.8, ...axes() },
            ]
        })));

        expect(result.error).toBeNull();
        expect(result.shapeCount).toBeGreaterThan(0);
        result.destroy();
    });
});

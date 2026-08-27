import { describe, it, expect, beforeAll } from 'vitest';
import { mountConfig, stubContainerLayout, captureWarnings } from './helpers';
import { KGAuthorClasses } from '../ts/KGAuthor/classRegistry';
import { Layout } from '../ts/KGAuthor/layouts/layout';
// classRegistry starts empty; importing the generated index is what populates it
// (KGAuthor/index.ts defines a lazy getter per exported class).
import '../ts/KGAuthor/index';

/**
 * The layout family's first test coverage.
 *
 * A layout class does exactly two things: set `aspectRatio`, and write a fractional
 * position onto each graph def. Those two things are the whole of its output, and they
 * land in `view.parsedData` — so that is what these tests assert on. A DOM snapshot of a
 * three-graph layout would be enormous and would fail for unrelated reasons, which is the
 * trap NOTES.md already warns about.
 *
 * Before this file, changing a fraction in `FourGraphs`, flipping
 * `TwoVerticalSquaresOneBigSquare`'s mirror or deleting an `addSecondGraph` call left the
 * whole suite green.
 */

beforeAll(() => stubContainerLayout());

interface Rect { x: number; y: number; width: number; height: number }

/** A graph def with no objects — enough to make any layout construct. */
const graph = () => ({ xAxis: { title: 'x', min: 0, max: 10 }, yAxis: { title: 'y', min: 0, max: 10 }, objects: [] as any[] });

/**
 * The ordered panel rects a layout produced.
 *
 * `parsedData.scales` is seeded with two defaults named `x` and `y` (view.ts:164-179)
 * before any layout pushes to it, so the first two entries are dropped. Each graph then
 * pushes its x scale followed by its y scale, in construction order. y is inverted:
 * `rangeMin = y + height`, `rangeMax = y` (positionedObject.ts:88-97).
 */
function rects(config: any): { aspectRatio: number; rects: Rect[]; warnings: string[] } {
    const { result, warnings } = captureWarnings(() => mountConfig(config));
    const parsed: any = (result.kg as any).view.parsedData;
    const scales = parsed.scales.slice(2);

    const out: Rect[] = [];
    for (let i = 0; i < scales.length; i += 2) {
        const xs = scales[i], ys = scales[i + 1];
        out.push({
            x: round(xs.rangeMin),
            width: round(xs.rangeMax - xs.rangeMin),
            y: round(ys.rangeMax),
            height: round(ys.rangeMin - ys.rangeMax)
        });
    }
    result.destroy();
    return { aspectRatio: parsed.aspectRatio, rects: out, warnings };
}

/** The fractions are authored to 3dp; float arithmetic on them is not. */
const round = (n: number) => Math.round(n * 1e6) / 1e6;

const layout = (name: string, def: any) => ({ schema: 'EconSchema', params: [], layout: { [name]: def } });

/** Every concrete layout, with the minimal def that makes it construct. */
const LAYOUTS: Record<string, any> = {
    OneGraph: { graph: graph() },
    OneWideGraph: { graph: graph() },
    TwoHorizontalGraphs: { leftGraph: graph(), rightGraph: graph() },
    GameMatrixPlusGraph: { graph: graph() },
    TwoVerticalGraphs: { topGraph: graph(), bottomGraph: graph() },
    TwoVerticalGraphsRoom200: { topGraph: graph(), bottomGraph: graph() },
    ThreeHorizontalGraphs: { leftGraph: graph(), middleGraph: graph(), rightGraph: graph() },
    FourGraphs: { topLeftGraph: graph(), bottomLeftGraph: graph(), topRightGraph: graph(), bottomRightGraph: graph() },
    SquarePlusTwoVerticalGraphs: { bigGraph: graph(), topGraph: graph(), bottomGraph: graph() },
    TwoVerticalSquaresOneBigSquare: { bigGraph: graph(), topGraph: graph(), bottomGraph: graph() },
    EdgeworthBox: { totalGood1: 10, totalGood2: 10, agentA: graph(), agentB: graph() },
    EdgeworthBoxSquare: { totalGood1: 10, totalGood2: 10, agentA: graph(), agentB: graph() },
    EdgeworthBoxPlusSidebar: { totalGood1: 10, totalGood2: 10, agentA: graph(), agentB: graph() },
    EdgeworthBoxPlusTwoGraphsPlusSidebar: { totalGood1: 10, totalGood2: 10, agentA: graph(), agentB: graph(), graph1: graph(), graph2: graph() },
    EdgeworthBoxAboveOneGraphPlusSidebar: { totalGood1: 10, totalGood2: 10, agentA: graph(), agentB: graph(), graph: graph() },
};

// --- 1. aspect ratio per class -------------------------------------------------

describe('aspect ratio', () => {
    const EXPECTED: Record<string, number> = {
        OneGraph: 1.22,                             // SquareLayout
        OneWideGraph: 2.44,                         // WideRectangleLayout
        TwoHorizontalGraphs: 2.5,
        GameMatrixPlusGraph: 2,                     // bare Layout, inherited
        TwoVerticalGraphs: 1.22,
        TwoVerticalGraphsRoom200: 1.3,
        ThreeHorizontalGraphs: 4,
        FourGraphs: 1.22,
        SquarePlusTwoVerticalGraphs: 2,             // bare Layout, inherited
        TwoVerticalSquaresOneBigSquare: 1.6,
        EdgeworthBox: 2,
        EdgeworthBoxSquare: 1.22,
        EdgeworthBoxPlusSidebar: 2,
        EdgeworthBoxPlusTwoGraphsPlusSidebar: 1.22,
        EdgeworthBoxAboveOneGraphPlusSidebar: 1.22,
    };

    Object.entries(EXPECTED).forEach(([name, expected]) => {
        it(`${name} is ${expected}`, () => {
            expect(rects(layout(name, LAYOUTS[name])).aspectRatio).toBe(expected);
        });
    });

    it('a top-level aspectRatio overrides the layout', () => {
        const r = mountConfig({ ...layout('OneGraph', { graph: graph() }), aspectRatio: 3 });
        expect((r.kg as any).view.aspectRatio).toBe(3);
        r.destroy();
    });
});

// --- 2. panel rects per class --------------------------------------------------

describe('panel rects', () => {
    const EXPECTED: Record<string, Rect[]> = {
        OneGraph: [{ x: 0.15, y: 0.025, width: 0.74, height: 0.9 }],
        OneWideGraph: [{ x: 0.15, y: 0.025, width: 0.74, height: 0.9 }],
        // 0.9 height on a 2.5 canvas — the `*Controls` keys no longer shrink this
        TwoHorizontalGraphs: [
            { x: 0.12, y: 0.1, width: 0.35, height: 0.9 },
            { x: 0.58, y: 0.1, width: 0.35, height: 0.9 },
        ],
        // full width, where the left 40% used to be reserved for a matrix nothing drew
        GameMatrixPlusGraph: [{ x: 0.15, y: 0.1, width: 0.74, height: 0.7 }],
        TwoVerticalGraphs: [
            { x: 0.15, y: 0.025, width: 0.8, height: 0.4 },
            { x: 0.15, y: 0.525, width: 0.8, height: 0.4 },
        ],
        TwoVerticalGraphsRoom200: [
            { x: 0.1, y: 0, width: 0.85, height: 0.4 },
            { x: 0.1, y: 0.62, width: 0.85, height: 0.38 },
        ],
        ThreeHorizontalGraphs: [
            { x: 0.05, y: 0.025, width: 0.25, height: 0.9 },
            { x: 0.35, y: 0.025, width: 0.25, height: 0.9 },
            { x: 0.65, y: 0.025, width: 0.25, height: 0.9 },
        ],
        FourGraphs: [
            { x: 0.05, y: 0.025, width: 0.4, height: 0.4 },
            { x: 0.05, y: 0.525, width: 0.4, height: 0.4 },
            { x: 0.55, y: 0.025, width: 0.4, height: 0.4 },
            { x: 0.55, y: 0.525, width: 0.4, height: 0.4 },
        ],
        // big graph on the LEFT
        SquarePlusTwoVerticalGraphs: [
            { x: 0.05, y: 0.025, width: 0.5, height: 0.9 },
            { x: 0.6, y: 0.025, width: 0.35, height: 0.4 },
            { x: 0.6, y: 0.525, width: 0.35, height: 0.4 },
        ],
        // the mirror image: big graph on the RIGHT, and a different aspect ratio
        TwoVerticalSquaresOneBigSquare: [
            { x: 0.43, y: 0.05, width: 0.555, height: 0.888 },
            { x: 0.1, y: 0.05, width: 0.25, height: 0.4 },
            { x: 0.1, y: 0.538, width: 0.25, height: 0.4 },
        ],
        // agentB is deliberately inverted — it is agentA's box read from the far corner
        EdgeworthBox: [
            { x: 0.15, y: 0.1, width: 0.738, height: 0.8 },
            { x: 0.888, y: 0.9, width: -0.738, height: -0.8 },
        ],
        EdgeworthBoxSquare: [
            { x: 0.15, y: 0.025, width: 0.74, height: 0.9 },
            { x: 0.89, y: 0.925, width: -0.74, height: -0.9 },
        ],
        EdgeworthBoxPlusSidebar: [
            { x: 0.15, y: 0.1, width: 0.738, height: 0.8 },
            { x: 0.888, y: 0.9, width: -0.738, height: -0.8 },
        ],
        // agentB is constructed first here; box height clamped to 0.62 so the
        // auxiliary band below it is real rather than negative
        EdgeworthBoxPlusTwoGraphsPlusSidebar: [
            { x: 0.888, y: 0.67, width: -0.738, height: -0.62 },
            { x: 0.15, y: 0.05, width: 0.738, height: 0.62 },
            { x: 0.1, y: 0.77, width: 0.35, height: 0.23 },
            { x: 0.6, y: 0.77, width: 0.35, height: 0.23 },
        ],
        EdgeworthBoxAboveOneGraphPlusSidebar: [
            { x: 0.888, y: 0.67, width: -0.738, height: -0.62 },
            { x: 0.15, y: 0.05, width: 0.738, height: 0.62 },
            { x: 0.15, y: 0.77, width: 0.738, height: 0.23 },
        ],
    };

    Object.entries(EXPECTED).forEach(([name, expected]) => {
        it(name, () => {
            expect(rects(layout(name, LAYOUTS[name])).rects).toEqual(expected);
        });
    });
});

// --- 3. nothing is drawn off the canvas ----------------------------------------

describe('every panel is inside the canvas', () => {
    Object.keys(LAYOUTS).forEach(name => {
        it(name, () => {
            rects(layout(name, LAYOUTS[name])).rects.forEach((r, i) => {
                // normalise: EdgeworthBox's agentB has deliberately negative extents
                const x0 = Math.min(r.x, r.x + r.width), x1 = Math.max(r.x, r.x + r.width);
                const y0 = Math.min(r.y, r.y + r.height), y1 = Math.max(r.y, r.y + r.height);

                expect(x0, `${name} panel ${i} left edge`).toBeGreaterThanOrEqual(0);
                expect(x1, `${name} panel ${i} right edge`).toBeLessThanOrEqual(1);
                expect(y0, `${name} panel ${i} top edge`).toBeGreaterThanOrEqual(0);
                expect(y1, `${name} panel ${i} bottom edge`).toBeLessThanOrEqual(1);
                expect(Math.abs(r.width), `${name} panel ${i} has width`).toBeGreaterThan(0);
                expect(Math.abs(r.height), `${name} panel ${i} has height`).toBeGreaterThan(0);
            });
        });
    });
});

// --- 4. the Edgeworth auxiliary band, at every goods ratio -----------------------

describe('Edgeworth auxiliary graphs stay on the canvas', () => {
    const CASES: Array<[string, number, number]> = [
        ['equal goods (the case that was broken)', 10, 10],
        ['wider than tall', 20, 10],
        ['taller than wide', 10, 20],
    ];

    ['EdgeworthBoxPlusTwoGraphsPlusSidebar', 'EdgeworthBoxAboveOneGraphPlusSidebar'].forEach(name => {
        CASES.forEach(([label, g1, g2]) => {
            it(`${name}: ${label}`, () => {
                const def = { ...LAYOUTS[name], totalGood1: g1, totalGood2: g2 };
                // the auxiliary graphs are everything after the two agent panels
                const aux = rects(layout(name, def)).rects.slice(2);

                expect(aux.length).toBeGreaterThan(0);
                aux.forEach(r => {
                    expect(r.height).toBeGreaterThan(0);          // was -0.05 with equal goods
                    expect(r.y + r.height).toBeLessThanOrEqual(1); // was 1.0 with y at 1.05
                });
            });
        });
    });
});

// --- 5, 6, 7. keys the engine cannot honour --------------------------------------

describe('unsupported def keys', () => {
    it('leftControls no longer changes TwoHorizontalGraphs geometry, and warns', () => {
        const without = rects(layout('TwoHorizontalGraphs', { leftGraph: graph(), rightGraph: graph() }));
        const with_ = rects(layout('TwoHorizontalGraphs', { leftGraph: graph(), rightGraph: graph(), leftControls: {} }));

        expect(with_.aspectRatio).toBe(without.aspectRatio);
        expect(with_.rects).toEqual(without.rects);

        expect(with_.warnings).toHaveLength(1);
        expect(with_.warnings[0]).toContain('leftControls');
        expect(with_.warnings[0]).toContain('TwoHorizontalGraphs');
        expect(without.warnings).toEqual([]);
    });

    it('the three ThreeHorizontalGraphs control keys warn individually and change nothing', () => {
        const without = rects(layout('ThreeHorizontalGraphs', LAYOUTS.ThreeHorizontalGraphs));
        const with_ = rects(layout('ThreeHorizontalGraphs', {
            leftGraph: graph(), middleGraph: graph(), rightGraph: graph(),
            leftControls: {}, middleControls: {}, rightControls: {},
        }));

        expect(with_.aspectRatio).toBe(without.aspectRatio);
        expect(with_.rects).toEqual(without.rects);
        expect(with_.warnings).toHaveLength(3);
    });

    it('game warns on GameMatrixPlusGraph', () => {
        const { warnings } = rects(layout('GameMatrixPlusGraph', { graph: graph(), game: {} }));
        expect(warnings).toHaveLength(1);
        expect(warnings[0]).toContain('"game"');
    });

    it('a top-level explanation warns instead of pushing a class that does not exist', () => {
        const { warnings } = captureWarnings(() => {
            const r = mountConfig({ ...layout('OneGraph', { graph: graph() }), explanation: { text: 'hi' } });
            r.destroy();
        });
        expect(warnings).toHaveLength(1);
        expect(warnings[0]).toContain('"explanation"');
        // and specifically NOT the old unknown-type message
        expect(warnings[0]).not.toContain('Unknown object type');
    });

    it('sidebar warns and changes nothing on EdgeworthBoxPlusSidebar', () => {
        const without = rects(layout('EdgeworthBoxPlusSidebar', LAYOUTS.EdgeworthBoxPlusSidebar));
        const with_ = rects(layout('EdgeworthBoxPlusSidebar', { ...LAYOUTS.EdgeworthBoxPlusSidebar, agentA: graph(), agentB: graph(), sidebar: {} }));

        expect(with_.rects).toEqual(without.rects);
        expect(with_.warnings).toHaveLength(1);
        expect(with_.warnings[0]).toContain('sidebar');
    });

    it('EdgeworthBoxPlusSidebar is an exact alias of EdgeworthBox', () => {
        const alias = rects(layout('EdgeworthBoxPlusSidebar', LAYOUTS.EdgeworthBoxPlusSidebar));
        const base = rects(layout('EdgeworthBox', LAYOUTS.EdgeworthBox));

        expect(alias.aspectRatio).toBe(base.aspectRatio);
        expect(alias.rects).toEqual(base.rects);
    });
});

// --- 8. cross-graph wiring --------------------------------------------------------

describe('cross-graph wiring', () => {
    /**
     * `TwoVerticalGraphs` and `TwoVerticalGraphsRoom200` are the only layouts that call
     * `addSecondGraph` on every sub-object, which is what lets an object on one graph
     * reference the other's scales. Nothing else distinguishes them from a generic stack,
     * so a refactor quietly dropping those two lines would be invisible without this.
     */
    function scale2Names(layoutName: string) {
        const g = graph();
        // addSecondGraph only wires a def that declares yScale2Name (authoringObject.ts:56-65)
        g.objects.push({ type: 'CrossGraphSegment', def: { a: [1, 1], b: [5, 5], yScale2Name: '' } });

        const config = layoutName === 'TwoVerticalGraphs'
            ? layout(layoutName, { topGraph: g, bottomGraph: graph() })
            : layout(layoutName, { topGraph: g, bottomGraph: graph() });

        const r = mountConfig(config);
        const parsed: any = (r.kg as any).view.parsedData;
        const seg = parsed.layers.flat().find((td: any) => td.def && td.def.hasOwnProperty('yScale2Name'));
        r.destroy();
        return seg ? { x: seg.def.xScale2Name, y: seg.def.yScale2Name } : null;
    }

    ['TwoVerticalGraphs', 'TwoVerticalGraphsRoom200'].forEach(name => {
        it(`${name} gives a CrossGraphSegment the other graph's scales`, () => {
            const names = scale2Names(name);
            expect(names).not.toBeNull();
            // the second graph's scales are named, not empty — the wiring reached the object
            expect(names!.x).toBeTruthy();
            expect(names!.y).toBeTruthy();
            expect(names!.x).not.toBe(names!.y);
        });
    });

    it('wires the object to the OTHER graph, not its own', () => {
        const g = graph();
        g.objects.push({ type: 'CrossGraphSegment', def: { a: [1, 1], b: [5, 5], yScale2Name: '' } });

        const r = mountConfig(layout('TwoVerticalGraphs', { topGraph: g, bottomGraph: graph() }));
        const parsed: any = (r.kg as any).view.parsedData;
        const seg = parsed.layers.flat().find((td: any) => td.def && td.def.hasOwnProperty('yScale2Name'));

        // scales[2..3] belong to the top graph (which owns the segment), [4..5] to the bottom
        const [topX, topY, bottomX, bottomY] = parsed.scales.slice(2).map((sc: any) => sc.name);
        r.destroy();

        expect(seg.def.xScale2Name).toBe(bottomX);
        expect(seg.def.yScale2Name).toBe(bottomY);
        expect(seg.def.xScale2Name).not.toBe(topX);
        expect(seg.def.yScale2Name).not.toBe(topY);
    });
});

// --- 9. the registered layout set is explicit --------------------------------------

describe('the registry', () => {
    /**
     * Adding or removing a layout must be a deliberate edit, and the same commit is
     * expected to update docs/schema/03-layouts.md.
     */
    it('exports exactly these layout classes', () => {
        const expected = [
            'CustomLayout',           // the pass-through: geometry comes from the host
            'EdgeworthBox',
            'EdgeworthBoxAboveOneGraphPlusSidebar',
            'EdgeworthBoxPlusSidebar',
            'EdgeworthBoxPlusTwoGraphsPlusSidebar',
            'EdgeworthBoxSquare',
            'FourGraphs',
            'GameMatrixPlusGraph',
            'Layout',                 // base, aspectRatio 2
            'OneGraph',
            'OneTree',
            'OneWideGraph',
            'SquareLayout',           // base, aspectRatio 1.22
            'SquarePlusTwoVerticalGraphs',
            'ThreeHorizontalGraphs',
            'TwoHorizontalGraphs',
            'TwoVerticalGraphs',
            'TwoVerticalGraphsRoom200',
            'TwoVerticalSquaresOneBigSquare',
            'WideRectangleLayout',    // base, aspectRatio 2.44
        ];

        // identify layouts by inheritance rather than by name — `Graph` is a positioned
        // object, and `EntryDeterrence` extends `Tree` despite living in econ/layouts/
        const actual = Object.keys(KGAuthorClasses)
            .filter(n => {
                const c = KGAuthorClasses[n];
                return typeof c === 'function' && (c === Layout || c.prototype instanceof Layout);
            })
            .sort();

        expect(actual).toEqual(expected);
    });

    it('EntryDeterrence is a Tree, not a Layout, despite living in econ/layouts/', () => {
        const c = KGAuthorClasses['EntryDeterrence'];
        expect(c).toBeTypeOf('function');
        expect(c.prototype instanceof Layout).toBe(false);
    });

    it('DivContainer is not a class anywhere', () => {
        expect(Object.keys(KGAuthorClasses)).not.toContain('DivContainer');
    });
});

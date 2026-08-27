import { describe, it, expect, beforeAll } from 'vitest';
import { mountConfig, stubContainerLayout, captureWarnings } from './helpers';
import { COMPACT_BELOW_PX, INDICATOR_BELOW_PX, levelForSize } from '../ts/KGAuthor/parsers/density';

/**
 * Density — how much detail a panel draws.
 *
 * Pixel snapshots would be worthless here: the claim is not "it looks like
 * this" but "the furniture is gone and the shape is not", so the assertions are
 * on rendered structure and on resolved property values.
 *
 * Two things are load bearing throughout and are asserted rather than assumed.
 * A level never *replaces* what an author wrote — `show` is conjoined, `ticks`
 * and stroke width are scaled — so density can only ever hide more, never
 * reveal. And a level is a param, so changing one is an update rather than a
 * remount: the same DOM elements survive it, which is what a promotion
 * animation needs.
 */

const CANVAS_W = 1000, CANVAS_H = 800;

beforeAll(() => stubContainerLayout(CANVAS_W, CANVAS_H));

const axes = (over: any = {}) => ({
    xAxis: { title: 'Quantity', min: 0, max: 30, ...(over.xAxis || {}) },
    yAxis: { title: 'Price', min: 0, max: 30, ...(over.yAxis || {}) }
});

const marketObjects = () => [
    {
        Curve: {
            name: 'demand', fn: '30 - (x)', color: 'colors.demand',
            label: { x: 8 }, srTitle: 'Demand curve', srDesc: 'Slopes down'
        }
    },
    { Point: { name: 'eq', coordinates: [15, 15], label: { text: 'E' }, droplines: { vertical: 'Q^*', horizontal: 'P^*' } } }
];

/** One panel filling most of the canvas, so `auto` would call it `full`. */
function onePanel(density?: string, over: any = {}) {
    const panel: any = { key: 'market', x: 0.1, y: 0.05, width: 0.8, height: 0.9, ...axes(over), objects: marketObjects() };
    if (density !== undefined) panel.density = density;
    return { schema: 'EconSchema', params: [], layout: { CustomLayout: { aspectRatio: 1.25, panels: [panel] } } };
}

function mount(config: any) {
    const { result, warnings } = captureWarnings(() => mountConfig(config));
    return { ...result, warnings };
}

// --- reading the rendered panel ---------------------------------------------

const view = (r: any) => (r.kg as any).view;

/** Every view object drawn against a panel's x scale. */
const objectsIn = (r: any, key: string) =>
    view(r).viewObjects.filter((o: any) => o.def && o.def.xScaleName === key + '_x');

const shownLabels = (r: any, key: string) =>
    objectsIn(r, key).filter((o: any) => o.constructor.name === 'Label' && o.show);

const labelTexts = (r: any, key: string) => shownLabels(r, key).map((o: any) => o.text);

const curves = (r: any, key: string) =>
    objectsIn(r, key).filter((o: any) => o.constructor.name === 'Curve');

const axisTicks = (r: any, key: string) =>
    objectsIn(r, key).filter((o: any) => o.constructor.name === 'Axis').map((o: any) => o.ticks);

const tickCount = (c: HTMLElement) => c.querySelectorAll('g.axis g.tick').length;
const axisLines = (c: HTMLElement) => c.querySelectorAll('g.axis path.domain').length;
const curvePaths = (c: HTMLElement) =>
    Array.from(c.querySelectorAll('path')).filter(p => (p.getAttribute('class') || '').startsWith('path-')).length;

/** Axis titles are the only labels stamped as furniture. */
const axisTitlesShown = (r: any, key: string) =>
    objectsIn(r, key).filter((o: any) => o.def.furniture === 'axisTitle' && o.show).length;

// --- the levels --------------------------------------------------------------

describe('nothing changes for a config that says nothing', () => {

    it('declares no density param', () => {
        const r = mount(onePanel());
        const params = view(r).parsedData.params.map((p: any) => p.name);
        expect(params).toEqual([]);
        expect(view(r).parsedData.densityPanels).toBeUndefined();
        r.destroy();
    });

    it('draws its axis titles, ticks and labels', () => {
        const r = mount(onePanel());
        expect(axisTitlesShown(r, 'market')).toBe(2);
        expect(tickCount(r.container)).toBeGreaterThan(6);
        r.destroy();
    });

    it('"full" is the same diagram, drawn through the compiler', () => {
        const plain = mount(onePanel());
        const full = mount(onePanel('full'));

        expect(tickCount(full.container)).toBe(tickCount(plain.container));
        expect(axisTitlesShown(full, 'market')).toBe(axisTitlesShown(plain, 'market'));
        expect(labelTexts(full, 'market').sort()).toEqual(labelTexts(plain, 'market').sort());

        plain.destroy();
        full.destroy();
    });
});

describe('compact drops the axis titles and thins the ticks', () => {

    it('hides both axis titles', () => {
        const r = mount(onePanel('compact'));
        expect(axisTitlesShown(r, 'market')).toBe(0);
        r.destroy();
    });

    it('keeps the curve and point labels', () => {
        const compact = mount(onePanel('compact'));
        const nonTitleLabels = shownLabels(compact, 'market')
            .filter((o: any) => o.def.furniture !== 'axisTitle').length;

        // demand's own label, the point's "E", and the two dropline axis labels
        expect(nonTitleLabels).toBe(4);
        compact.destroy();
    });

    it('draws fewer ticks, but still draws ticks', () => {
        const full = mount(onePanel('full'));
        const compact = mount(onePanel('compact'));

        expect(tickCount(compact.container)).toBeLessThan(tickCount(full.container));
        expect(tickCount(compact.container)).toBeGreaterThan(0);

        full.destroy();
        compact.destroy();
    });
});

describe('indicator keeps the shape and drops everything else', () => {

    it('renders no tick marks and no tick labels', () => {
        const r = mount(onePanel('indicator'));
        expect(tickCount(r.container)).toBe(0);
        r.destroy();
    });

    it('still draws both axis lines, so the shape has a frame', () => {
        const r = mount(onePanel('indicator'));
        expect(axisLines(r.container)).toBe(2);
        r.destroy();
    });

    it('hides every label, the axis titles included', () => {
        const r = mount(onePanel('indicator'));
        expect(shownLabels(r, 'market')).toHaveLength(0);
        r.destroy();
    });

    it('leaves the curve count untouched — the furniture goes, the shape does not', () => {
        const full = mount(onePanel('full'));
        const indicator = mount(onePanel('indicator'));

        expect(curvePaths(indicator.container)).toBe(curvePaths(full.container));

        full.destroy();
        indicator.destroy();
    });

    it('keeps the droplines, which are shape rather than furniture', () => {
        const r = mount(onePanel('indicator'));
        const droplines = objectsIn(r, 'market')
            .filter((o: any) => o.constructor.name === 'Segment' && o.show);
        expect(droplines.length).toBe(2);
        r.destroy();
    });

    it('thickens the strokes', () => {
        const full = mount(onePanel('full'));
        const indicator = mount(onePanel('indicator'));

        expect(curves(full, 'market')[0].drawnStrokeWidth()).toBe(2);
        expect(curves(indicator, 'market')[0].drawnStrokeWidth()).toBe(4);

        full.destroy();
        indicator.destroy();
    });
});

// --- composition, not replacement --------------------------------------------

describe('a level composes with the diagram rather than overruling it', () => {

    it('an author\'s hidden object stays hidden at every level', () => {
        ['full', 'compact', 'indicator'].forEach(function (level) {
            const panel: any = {
                key: 'market', x: 0.1, y: 0.05, width: 0.8, height: 0.9, density: level, ...axes(),
                objects: [{ Label: { name: 'note', text: 'secret', x: 5, y: 5, plainText: true, show: 'false' } }]
            };
            const r = mount({ schema: 'EconSchema', params: [], layout: { CustomLayout: { panels: [panel] } } });
            expect(labelTexts(r, 'market')).not.toContain('secret');
            r.destroy();
        });
    });

    it('an author\'s own show predicate still decides, inside the level', () => {
        const panel: any = {
            key: 'market', x: 0.1, y: 0.05, width: 0.8, height: 0.9, density: 'compact', ...axes(),
            objects: [{ Label: { name: 'note', text: 'toggled', x: 5, y: 5, plainText: true, show: 'params.on == 1' } }]
        };
        const r = mount({
            schema: 'EconSchema',
            params: [{ name: 'on', value: 0, min: 0, max: 1, round: 1 }],
            layout: { CustomLayout: { panels: [panel] } }
        });

        expect(labelTexts(r, 'market')).not.toContain('toggled');
        r.kg.update({ params: [{ name: 'on', value: 1 }] });
        expect(labelTexts(r, 'market')).toContain('toggled');

        r.destroy();
    });

    it('an author\'s tick count is halved, not replaced', () => {
        // Asserted on the resolved count rather than on rendered ticks: d3
        // treats the number as a hint and quantises the step to 1, 2 or 5 times
        // a power of ten, so 20 and 10 draw the same ticks over a 0-30 domain.
        // What density owes the author is that their 20 became 10 and not the
        // default's 5 became anything.
        const full = mount(onePanel('full', { xAxis: { ticks: 20 }, yAxis: { ticks: 20 } }));
        const compact = mount(onePanel('compact', { xAxis: { ticks: 20 }, yAxis: { ticks: 20 } }));
        const dflt = mount(onePanel('compact'));

        expect(axisTicks(full, 'market')).toEqual([20, 20]);
        expect(axisTicks(compact, 'market')).toEqual([10, 10]);
        expect(axisTicks(dflt, 'market')).toEqual([2.5, 2.5]);

        full.destroy();
        compact.destroy();
        dflt.destroy();
    });

    it('an author\'s stroke width is scaled, not replaced', () => {
        const r = mount(onePanel('indicator'));
        const thick: any = {
            key: 'market', x: 0.1, y: 0.05, width: 0.8, height: 0.9, density: 'indicator', ...axes(),
            objects: [{ Curve: { name: 'demand', fn: '30 - (x)', strokeWidth: 5 } }]
        };
        const r2 = mount({ schema: 'EconSchema', params: [], layout: { CustomLayout: { panels: [thick] } } });

        expect(curves(r, 'market')[0].drawnStrokeWidth()).toBe(4);
        expect(curves(r2, 'market')[0].drawnStrokeWidth()).toBe(10);

        r.destroy();
        r2.destroy();
    });
});

// --- the mixed-size problem ---------------------------------------------------

describe('two panels at different levels in one canvas', () => {

    const stageAndRail = {
        schema: 'EconSchema',
        params: [],
        layout: {
            CustomLayout: {
                aspectRatio: 1.26,
                panels: [
                    { key: 'stage', x: 0.05, y: 0.05, width: 0.55, height: 0.9, density: 'full', ...axes(), objects: marketObjects() },
                    { key: 'rail', x: 0.68, y: 0.05, width: 0.25, height: 0.3, density: 'indicator', ...axes(), objects: marketObjects() }
                ]
            }
        }
    };

    it('draw different stroke widths at the same instant', () => {
        const r = mount(stageAndRail);

        expect(curves(r, 'stage')[0].drawnStrokeWidth()).toBe(2);
        expect(curves(r, 'rail')[0].drawnStrokeWidth()).toBe(4);

        r.destroy();
    });

    it('the stage keeps its furniture while the rail loses its own', () => {
        const r = mount(stageAndRail);

        expect(axisTitlesShown(r, 'stage')).toBe(2);
        expect(shownLabels(r, 'stage').length).toBeGreaterThan(2);
        expect(shownLabels(r, 'rail')).toHaveLength(0);

        r.destroy();
    });

    it('a panel with no density declared is untouched by its neighbour\'s', () => {
        const mixed = JSON.parse(JSON.stringify(stageAndRail));
        delete mixed.layout.CustomLayout.panels[0].density;
        const r = mount(mixed);

        expect(axisTitlesShown(r, 'stage')).toBe(2);
        expect(curves(r, 'stage')[0].drawnStrokeWidth()).toBe(2);
        expect(shownLabels(r, 'rail')).toHaveLength(0);

        r.destroy();
    });
});

// --- the accessible description ------------------------------------------------

describe('screen-reader descriptions survive every level', () => {

    it('are identical at full and at indicator', () => {
        const read = (level: string) => {
            const r = mount(onePanel(level));
            const described = objectsIn(r, 'market')
                .filter((o: any) => o.srTitle != undefined)
                .map((o: any) => [o.constructor.name, o.srTitle, o.srDesc].join('|'))
                .sort();
            r.destroy();
            return described;
        };

        const full = read('full');
        expect(full.length).toBeGreaterThan(0);
        expect(read('indicator')).toEqual(full);
    });

    it('an indicator panel is still describable in the DOM', () => {
        const r = mount(onePanel('indicator'));
        const titles = Array.from(r.container.querySelectorAll('title')).map(t => t.textContent);
        expect(titles).toContain('Demand curve');
        r.destroy();
    });
});

// --- changing level at runtime ---------------------------------------------------

describe('setDensity', () => {

    it('changes the level without remounting', () => {
        const r = mount(onePanel('full'));
        const before = objectsIn(r, 'market').map((o: any) => o.id);

        r.kg.setDensity('market', 'indicator');

        expect(tickCount(r.container)).toBe(0);
        expect(shownLabels(r, 'market')).toHaveLength(0);
        // Same objects, redrawn — not a new view.
        expect(objectsIn(r, 'market').map((o: any) => o.id)).toEqual(before);

        r.destroy();
    });

    it('goes back up as well as down', () => {
        const r = mount(onePanel('indicator'));
        expect(axisTitlesShown(r, 'market')).toBe(0);

        r.kg.setDensity('market', 'full');
        expect(axisTitlesShown(r, 'market')).toBe(2);
        expect(tickCount(r.container)).toBeGreaterThan(6);

        r.destroy();
    });

    it('names the panels that can be set when given one that cannot', () => {
        const r = mount(onePanel('full'));
        const { warnings } = captureWarnings(() => r.kg.setDensity('firm', 'compact'));

        expect(warnings.join(' ')).toContain('no panel "firm"');
        expect(warnings.join(' ')).toContain('"market"');

        r.destroy();
    });

    it('rejects a level it does not have', () => {
        const r = mount(onePanel('full'));
        const { warnings } = captureWarnings(() => r.kg.setDensity('market', 'tiny' as any));

        expect(warnings.join(' ')).toContain('not a level');
        expect(axisTitlesShown(r, 'market')).toBe(2);

        r.destroy();
    });

    it('warns that an auto panel will be chosen again', () => {
        const r = mount(onePanel('auto'));
        const { warnings } = captureWarnings(() => r.kg.setDensity('market', 'indicator'));

        expect(warnings.join(' ')).toContain('auto');
        r.destroy();
    });
});

// --- auto ------------------------------------------------------------------------

describe('auto chooses from the panel\'s measured size', () => {

    it('maps a size to a level at the documented boundaries', () => {
        expect(levelForSize(INDICATOR_BELOW_PX - 1)).toBe('indicator');
        expect(levelForSize(INDICATOR_BELOW_PX)).toBe('compact');
        expect(levelForSize(COMPACT_BELOW_PX - 1)).toBe('compact');
        expect(levelForSize(COMPACT_BELOW_PX)).toBe('full');
    });

    it('draws a large panel at full detail', () => {
        // 0.8 x 1000 = 800 wide, 0.9 x 800 = 720 high.
        const r = mount(onePanel('auto'));
        expect(axisTitlesShown(r, 'market')).toBe(2);
        expect(tickCount(r.container)).toBeGreaterThan(6);
        r.destroy();
    });

    it('draws a rail-sized panel as an indicator, on the first frame', () => {
        const panel: any = {
            key: 'rail', x: 0.7, y: 0.05, width: 0.2, height: 0.2, density: 'auto', ...axes(), objects: marketObjects()
        };
        // 0.2 x 1000 = 200 wide, 0.2 x 640 = 128 high — the short side decides.
        const r = mount({ schema: 'EconSchema', params: [], layout: { CustomLayout: { aspectRatio: 1.25, panels: [panel] } } });

        expect(tickCount(r.container)).toBe(0);
        expect(shownLabels(r, 'rail')).toHaveLength(0);
        expect(curvePaths(r.container)).toBeGreaterThan(0);

        r.destroy();
    });

    it('follows a panel that is promoted by a param change', () => {
        // The panel's rect is an expression, so promoting it is a param update
        // (P3). Its level has to move with it, or a promotion animates a
        // full-size panel that is still drawn as a glyph.
        const panel: any = {
            key: 'firm',
            x: 'params.focus == 1 ? 0.05 : 0.7',
            y: 0.05,
            width: 'params.focus == 1 ? 0.8 : 0.2',
            height: 'params.focus == 1 ? 0.9 : 0.2',
            density: 'auto',
            ...axes(),
            objects: marketObjects()
        };
        const r = mount({
            schema: 'EconSchema',
            params: [{ name: 'focus', value: 0, min: 0, max: 1, round: 1 }],
            layout: { CustomLayout: { aspectRatio: 1.25, panels: [panel] } }
        });

        expect(tickCount(r.container)).toBe(0);

        r.kg.update({ params: [{ name: 'focus', value: 1 }] });

        expect(tickCount(r.container)).toBeGreaterThan(6);
        expect(axisTitlesShown(r, 'firm')).toBe(2);

        r.destroy();
    });
});

// --- what the engine says when it cannot do as it is told ------------------------

describe('diagnostics', () => {

    it('names an unrecognised level rather than guessing', () => {
        const r = mount(onePanel('small'));

        expect(r.warnings.join(' ')).toContain('"small"');
        expect(r.warnings.join(' ')).toContain('full, compact, indicator');
        // and it is drawn at full detail rather than not at all
        expect(axisTitlesShown(r, 'market')).toBe(2);

        r.destroy();
    });

    it('says why a density on an unnamed graph cannot be honoured', () => {
        const r = mount({
            schema: 'EconSchema',
            params: [],
            layout: { OneGraph: { graph: { ...axes(), density: 'indicator', objects: marketObjects() } } }
        });

        expect(r.warnings.join(' ')).toContain('no key');
        expect(tickCount(r.container)).toBeGreaterThan(6);

        r.destroy();
    });

    it('honours a density on a named graph in any layout', () => {
        const r = mount({
            schema: 'EconSchema',
            params: [],
            layout: { OneGraph: { graph: { name: 'market', ...axes(), density: 'indicator', objects: marketObjects() } } }
        });

        expect(r.warnings).toEqual([]);
        expect(tickCount(r.container)).toBe(0);

        r.destroy();
    });
});

import { describe, it, expect, beforeAll } from 'vitest';
import { mountConfig } from './helpers';

/**
 * What a student can drag carries a handle, at rest.
 *
 * The cursor was the only sign, and it shows only once the pointer is on the
 * curve's grip. So a curve that can be dragged now carries a thumb, the
 * sliders' own, with an arrow for each way it moves, and a point carries the
 * arrows round it. Nothing that cannot be dragged has one, and a drag frozen
 * by a committed answer loses it, as it loses the cursor.
 *
 * jsdom does no layout, so label divs are given a small box here and the
 * container its usual 800×400, as `label_yields.test.ts` does.
 */

const isLabel = (el: Element) => el.tagName === 'DIV' && /^rootElement-/.test(el.getAttribute('class') || '');

beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {
        get() { return isLabel(this) ? 24 : 800; }, configurable: true
    });
    Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
        get() { return isLabel(this) ? 20 : 400; }, configurable: true
    });
});

const LOCKED = { name: 'locked', value: 0, min: 0, max: 1, round: 1 };
const PARAMS = [
    { name: 'a', value: 20, min: 10, max: 28, round: 0.1 },
    { name: 'p', value: 8, min: 0, max: 20, round: 0.1 },
    LOCKED
];

const DEMAND = {
    type: 'Line',
    def: {
        name: 'demand', title: 'demand', yIntercept: 'params.a', slope: -1, color: 'colors.demand',
        drag: [{ horizontal: 'a', draggable: 'not(params.locked)' }],
        ghost: true
    }
};

const SUPPLY = {
    type: 'Line',
    def: { name: 'supply', title: 'supply', yIntercept: 2, slope: 1, color: 'colors.supply' }
};

const PRICE_POINT = {
    type: 'Point',
    def: {
        name: 'chosen', title: '', x: 'params.a - params.p', y: 'params.p', color: 'colors.choice',
        label: { text: 'A' },
        drag: [{ vertical: 'p' }]
    }
};

function build(objects: any[], panel: any = {}) {
    return mountConfig({
        schema: 'EconSchema',
        params: PARAMS,
        layout: {
            CustomLayout: {
                aspectRatio: 1.25,
                panels: [{
                    key: 'market', x: 0.1, y: 0.05, width: 0.8, height: 0.9,
                    xAxis: { title: 'Quantity', min: 0, max: 20 },
                    yAxis: { title: 'Price', min: 0, max: 20 },
                    objects, ...panel
                }]
            }
        }
    });
}

const view = (r: any) => (r.kg as any).view;
const named = (r: any, name: string) => view(r).viewObjects.filter((o: any) => o.name === name);
const live = (r: any, name: string) => named(r, name).find((o: any) => o.def.drag && o.def.drag.length > 0);

/** What a handle draws, while it shows: its thumb, and the way each arrow points. */
function handleOf(vo: any) {
    const g = vo.handleElement;
    if (!g || g.style('display') === 'none') return null;
    const arrows = g.selectAll('polygon.kg-handle-arrow').nodes().map((p: SVGPolygonElement) => {
        const [tip] = p.getAttribute('points')!.split(' ').map(xy => xy.split(',').map(Number));
        return Math.abs(tip[0]) > Math.abs(tip[1]) ? (tip[0] < 0 ? 'left' : 'right') : (tip[1] < 0 ? 'up' : 'down');
    });
    return { thumb: g.selectAll('circle.kg-handle-thumb').size() === 1, arrows };
}

/** Where a curve's handle is, in its panel's pixels. */
function placed(vo: any): [number, number] {
    const m = /translate\(([-\d.e]+) ([-\d.e]+)\)/.exec(vo.handleElement.attr('transform'))!;
    return [+m[1], +m[2]];
}

function setParam(r: any, name: string, value: number) {
    r.kg.update({ params: [{ name, value }] });
}

describe('a curve that can be dragged', () => {

    it('carries a thumb, with an arrow each way it moves', () => {
        const r = build([DEMAND]);
        expect(handleOf(live(r, 'demand'))).toEqual({ thumb: true, arrows: ['left', 'right'] });
        r.destroy();
    });

    it('has it on the curve, a quarter of the way along from its left-hand end', () => {
        const r = build([DEMAND]);
        const demand = live(r, 'demand');
        const [x, y] = placed(demand);
        const q = demand.xScale.scale.invert(x), p = demand.yScale.scale.invert(y);
        expect(p).toBeCloseTo(20 - q, 1);
        expect(q).toBeGreaterThan(3);
        expect(q).toBeLessThan(7);
        r.destroy();
    });

    it('loses it while the drag is frozen, and has it back after', () => {
        const r = build([DEMAND]);
        setParam(r, 'locked', 1);
        expect(handleOf(live(r, 'demand'))).toBeNull();
        setParam(r, 'locked', 0);
        expect(handleOf(live(r, 'demand'))).not.toBeNull();
        r.destroy();
    });

    it('takes it along when the curve moves', () => {
        const r = build([DEMAND]);
        const before = placed(live(r, 'demand'));
        setParam(r, 'a', 14);
        const after = placed(live(r, 'demand'));
        expect(after).not.toEqual(before);
        const demand = live(r, 'demand');
        expect(demand.yScale.scale.invert(after[1])).toBeCloseTo(14 - demand.xScale.scale.invert(after[0]), 1);
        r.destroy();
    });

    it('keeps it clear of a point on the curve', () => {
        // The point sits where the handle would go, a quarter of the way along.
        const point = { type: 'Point', def: { name: 'there', title: '', coordinates: [5, 15], color: 'colors.equilibriumPrice' } };
        const r = build([DEMAND, point]);
        const demand = live(r, 'demand');
        const [x, y] = placed(demand);
        const px = [demand.xScale.scale(5), demand.yScale.scale(15)];
        expect(Math.hypot(x - px[0], y - px[1])).toBeGreaterThan(18 + 7);
        r.destroy();
    });
});

describe('what cannot be dragged', () => {

    it('has no handle: a curve without a drag, and a ghost', () => {
        const r = build([DEMAND, SUPPLY]);
        r.kg.snapshot();
        setParam(r, 'a', 14);
        const curves = view(r).viewObjects.filter((o: any) => o.constructor.name === 'Curve');
        // Supply, demand's ghost and demand, of which only demand has a handle.
        expect(curves.length).toBe(3);
        expect(curves.filter((o: any) => o.handleElement)).toEqual([live(r, 'demand')]);
        r.destroy();
    });
});

describe('a point that can be dragged', () => {

    it('carries the arrows alone, the ways it moves', () => {
        const r = build([DEMAND, PRICE_POINT]);
        expect(handleOf(named(r, 'chosen')[0])).toEqual({ thumb: false, arrows: ['up', 'down'] });
        r.destroy();
    });

    it('has its label set out past them', () => {
        const free = { type: 'Point', def: { name: 'Z', title: 'Z', x: 10, y: 10, label: { text: 'Z' }, drag: [{ directions: 'xy', param: 'p', expression: 'drag.x' }] } };
        const still = { type: 'Point', def: { name: 'E', title: 'E', x: 10, y: 5, label: { text: 'E' } } };
        const r = build([free, still]);
        // Each label found by where the point it names is.
        const offset = (y: number) => view(r).viewObjects
            .find((o: any) => o.constructor.name === 'Label' && +o.x === 10 && +o.y === y).xPixelOffset;
        expect(offset(10)).toBeGreaterThanOrEqual(20);
        expect(offset(5)).toBe(8);
        r.destroy();
    });
});

describe('a panel too small to be read', () => {

    it('shows no handle', () => {
        const r = build([DEMAND, PRICE_POINT], { density: 'indicator' });
        expect(handleOf(live(r, 'demand'))).toBeNull();
        expect(handleOf(named(r, 'chosen')[0])).toBeNull();
        r.destroy();
    });
});

/**
 * The keyboard reaches what the mouse can drag.
 *
 * Whatever shows a handle is a slider: Tab reaches it, it is read as its name
 * and what it moves, and an arrow key moves it a step as a drag of its handle
 * would, each press a gesture of its own, as a slider's is.
 */
describe('from the keyboard', () => {

    const press = (vo: any, key: string, init: KeyboardEventInit = {}) =>
        vo.rootElement.node().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
    const param = (r: any, name: string) => r.kg.getParams().find((p: any) => p.name === name).value;
    const attrs = (vo: any) => {
        const node = vo.rootElement.node() as Element;
        return ['tabindex', 'role', 'aria-label', 'aria-valuenow', 'aria-valuetext', 'aria-orientation']
            .reduce((out, name) => ({ ...out, [name]: node.getAttribute(name) }), {});
    };

    it('reaches a curve that can be dragged, and reads it as a slider', () => {
        const r = build([DEMAND]);
        expect(attrs(live(r, 'demand'))).toEqual({
            'tabindex': '0', 'role': 'slider', 'aria-label': 'demand',
            'aria-valuenow': '20', 'aria-valuetext': '20.0', 'aria-orientation': 'horizontal'
        });
        r.destroy();
    });

    it('does not reach it while the drag is frozen', () => {
        const r = build([DEMAND]);
        setParam(r, 'locked', 1);
        expect(attrs(live(r, 'demand'))).toEqual({
            'tabindex': null, 'role': null, 'aria-label': null,
            'aria-valuenow': null, 'aria-valuetext': null, 'aria-orientation': null
        });
        press(live(r, 'demand'), 'ArrowRight');
        expect(param(r, 'a')).toBe(20);
        r.destroy();
    });

    it('moves it a fortieth of the axis a press, and five with Shift', () => {
        const r = build([DEMAND]);
        press(live(r, 'demand'), 'ArrowRight');
        expect(param(r, 'a')).toBeCloseTo(20.5);
        press(live(r, 'demand'), 'ArrowLeft', { shiftKey: true });
        expect(param(r, 'a')).toBeCloseTo(18);
        expect(live(r, 'demand').rootElement.node().getAttribute('aria-valuetext')).toBe('18.0');
        r.destroy();
    });

    it('takes up and down as more and less on a curve that moves sideways, as a slider does', () => {
        const r = build([DEMAND]);
        press(live(r, 'demand'), 'ArrowUp');
        expect(param(r, 'a')).toBeCloseTo(20.5);
        press(live(r, 'demand'), 'ArrowDown');
        press(live(r, 'demand'), 'ArrowDown');
        expect(param(r, 'a')).toBeCloseTo(19.5);
        r.destroy();
    });

    it('makes each press a gesture, so the ghost is one press behind', () => {
        const r = build([DEMAND]);
        const model = view(r).model;
        press(live(r, 'demand'), 'ArrowRight');
        expect(model.prevParamValues.a).toBe(20);
        press(live(r, 'demand'), 'ArrowRight');
        expect(model.prevParamValues.a).toBeCloseTo(20.5);
        expect(model.inGesture).toBe(false);
        r.destroy();
    });

    it('moves a param that snaps further than a step', () => {
        // A step of the axis is 0.5; the param moves in twos.
        const r = mountConfig({
            schema: 'EconSchema',
            params: [{ name: 'q', value: 10, min: 0, max: 20, round: 2 }],
            layout: { OneGraph: { graph: {
                xAxis: { title: 'Quantity', min: 0, max: 20 }, yAxis: { title: 'Price', min: 0, max: 20 },
                objects: [{ type: 'Point', def: { name: 'chosen', title: '', x: 'params.q', y: 5, drag: [{ horizontal: 'q' }] } }]
            } } }
        });
        press(named(r, 'chosen')[0], 'ArrowRight');
        expect(param(r, 'q')).toBe(12);
        r.destroy();
    });

    it('moves a point that goes anywhere only the way its arrow points, and says both its values', () => {
        const r = mountConfig({
            schema: 'EconSchema',
            params: [
                { name: 'pt', label: 'Toasties at Z', value: 10, min: 0, max: 20, round: 0.5 },
                { name: 'pc', label: 'Coffees at Z', value: 10, min: 0, max: 20, round: 0.5 }
            ],
            layout: { OneGraph: { graph: {
                xAxis: { title: 'Toasties', min: 0, max: 20 }, yAxis: { title: 'Coffees', min: 0, max: 20 },
                objects: [{ type: 'Point', def: {
                    name: 'Z', title: 'Z', x: 'params.pt', y: 'params.pc', srTitle: 'Point Z',
                    drag: [
                        { directions: 'xy', param: 'pt', expression: 'params.pt + drag.dx' },
                        { directions: 'xy', param: 'pc', expression: 'params.pc + drag.dy' }
                    ]
                } }]
            } } }
        });
        const z = named(r, 'Z')[0];
        press(z, 'ArrowUp');
        expect([param(r, 'pt'), param(r, 'pc')]).toEqual([10, 10.5]);
        expect(attrs(z)).toMatchObject({
            'aria-label': 'Point Z', 'aria-valuetext': 'Toasties at Z 10.0, Coffees at Z 10.5', 'aria-orientation': null
        });
        r.destroy();
    });

    it('leaves alone a key that is not an arrow', () => {
        const r = build([DEMAND]);
        const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
        live(r, 'demand').rootElement.node().dispatchEvent(event);
        expect(event.defaultPrevented).toBe(false);
        expect(param(r, 'a')).toBe(20);
        r.destroy();
    });
});

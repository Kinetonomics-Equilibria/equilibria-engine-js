import { describe, it, expect, beforeAll } from 'vitest';
import { Model } from '../ts/model/model';
import { Param } from '../ts/model/param';
import { SETTLE_MS } from '../ts/controller/interactionHandler';
import { KG_EVENTS } from '../ts/constants';
import { mountConfig, captureWarnings } from './helpers';

/**
 * A drag that follows the pointer, and rests where the lesson's numbers are.
 *
 * The shortages lesson's price moves in steps of 50c, a twelfth of its axis,
 * and its curves in steps of 100, an eighth of theirs, because every number a
 * step says is chosen to come out round. Dragged on that grid, a point sat
 * still under a moving pointer and then leapt 30px. So a param can say a
 * finer `dragRound`, which a drag moves it on, and once it is let go it
 * glides onto `round` in `SETTLE_MS`, inside the drag's own gesture.
 */

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const PRICE = { name: 'price', value: 3, min: 1.5, max: 4.5, round: 0.5, dragRound: 0.05, precision: 2 };

const market = (over: any = {}) => new Model({
    params: [{ ...PRICE }],
    calcs: { Qd: '300 - 100*(params.price - 3)', Qs: '300 + 100*(params.price - 3)' },
    colors: {}, idioms: {},
    ...over
});

describe('a param with a dragRound', () => {

    it('moves on it while dragged, and on round otherwise', () => {
        const param = new Param({ ...PRICE, label: '' });
        expect(param.landing(3.37, true)).toBe(3.35);
        expect(param.landing(3.37)).toBe(3.5);
        expect(param.landing(9, true)).toBe(4.5);
    });

    it('lands on the drag grid exactly, with no float dust', () => {
        // 0.05 × 67 is 3.3500000000000005 in floating point.
        const param = new Param({ ...PRICE, label: '' });
        for (let k = 30; k <= 90; k++) {
            const v = param.landing(k * 0.05 + 0.01, true);
            expect(v).toBe(parseFloat(v.toFixed(2)));
        }
    });

    it('is said to be unsettled only between two values it rests at', () => {
        const param = new Param({ ...PRICE, label: '' });
        param.update(3.37, true);
        expect(param.unsettled()).toBe(true);
        param.update(3.5);
        expect(param.unsettled()).toBe(false);
        // Without one, a drag snaps onto round, and there is nothing to settle.
        const plain = new Param({ name: 'p', label: '', value: 3, min: 0, max: 6, round: 0.5 });
        plain.update(3.37, true);
        expect([plain.value, plain.unsettled()]).toEqual([3.5, false]);
    });

    it('is ignored, with a warning, where it is no finer than round', () => {
        const { result, warnings } = captureWarnings(() => new Param({ ...PRICE, label: '', dragRound: 1 }));
        expect(result.dragRound).toBeNull();
        expect(warnings.join('\n')).toMatch(/not finer than its round/);
    });

    it('warns where round is not a whole number of it', () => {
        const { warnings } = captureWarnings(() => new Param({ ...PRICE, label: '', dragRound: 0.3 }));
        expect(warnings.join('\n')).toMatch(/not a whole number of dragRound/);
    });
});

describe('settling a drag', () => {

    it('glides onto the nearer value it rests at, on the drag grid all the way, then is done', async () => {
        const model = market();
        model.beginGesture();
        model.updateParam('price', 3.37, { dragging: true });
        const seen: number[] = [];
        model.onParamChange = change => { seen.push(change.value); };
        let done = 0;
        model.settle(['price'], SETTLE_MS, () => { done++; model.endGesture(); });

        // Nothing lands at once: it glides.
        expect([model.getParam('price').value, done]).toEqual([3.35, 0]);
        await wait(SETTLE_MS + 100);
        expect(model.getParam('price').value).toBe(3.5);
        expect(done).toBe(1);
        expect(model.inGesture).toBe(false);
        expect(seen.length).toBeGreaterThan(0);
        seen.forEach(v => expect(v).toBe(parseFloat(v.toFixed(2))));
        expect(seen[seen.length - 1]).toBe(3.5);
        // The calcs are the ones at rest, with no dust from the glide.
        expect(model.currentCalcValues['Qd']).toBe(250);
    });

    it('lands even where no frame is drawn, as in a tab that is not shown', async () => {
        const raf = globalThis.requestAnimationFrame;
        (globalThis as any).requestAnimationFrame = () => 0;
        try {
            const model = market();
            model.updateParam('price', 3.37, { dragging: true });
            let done = 0;
            model.settle(['price'], SETTLE_MS, () => { done++; });
            await wait(SETTLE_MS + 200);
            expect([model.getParam('price').value, done]).toEqual([3.5, 1]);
        } finally {
            (globalThis as any).requestAnimationFrame = raf;
        }
    });

    it('lands at once when it is given no time, as under reduced motion', () => {
        const model = market();
        model.updateParam('price', 3.2, { dragging: true });
        let done = 0;
        model.settle(['price'], 0, () => { done++; });
        expect([model.getParam('price').value, done]).toEqual([3, 1]);
    });

    it('is done at once with nothing to settle', () => {
        const model = market();
        let done = 0;
        model.settle(['price'], SETTLE_MS, () => { done++; });
        expect(done).toBe(1);
    });

    it('goes to the other side where a restriction refuses the nearer', () => {
        const model = market({ restrictions: [{ expression: 'params.price', max: '3.4' }] });
        model.updateParam('price', 3.35, { dragging: true });
        const { warnings } = captureWarnings(() => model.settle(['price'], 0, () => { }));
        expect(model.getParam('price').value).toBe(3);
        expect(warnings).toEqual([]);
    });

    it('lands before the next gesture opens, so that gesture snapshots where it rests', () => {
        const model = market();
        model.beginGesture();
        model.updateParam('price', 3.37, { dragging: true });
        let done = 0;
        model.settle(['price'], SETTLE_MS, () => { done++; model.endGesture(); });
        model.beginGesture();
        expect(done).toBe(1);
        expect(model.getParam('price').value).toBe(3.5);
        expect((model as any).evaluate('prev.params.price')).toBe(3.5);
        model.endGesture();
        expect(model.inGesture).toBe(false);
    });

    it('stops where a write it did not make left the param', async () => {
        const model = market();
        model.updateParam('price', 3.37, { dragging: true });
        let done = 0;
        model.settle(['price'], SETTLE_MS, () => { done++; });
        // Something else setting the price where it wants it.
        model.getParam('price').value = 2;
        await wait(SETTLE_MS + 100);
        expect([model.getParam('price').value, done]).toEqual([2, 1]);
    });

    it('lands before a host writes over it', () => {
        const r = mount();
        const model = modelOf(r);
        model.updateParam('price', 3.37, { dragging: true });
        let done = 0;
        model.settle(['price'], SETTLE_MS, () => { done++; });
        r.kg.update({ params: [{ name: 'price', value: 2 }] });
        expect([model.getParam('price').value, done]).toEqual([2, 1]);
        r.destroy();
    });
});

// ---------------------------------------------------------------------------
// Through a real drag of a point

const isLabel = (el: Element) => el.tagName === 'DIV' && /^rootElement-/.test(el.getAttribute('class') || '');

beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {
        get() { return isLabel(this) ? 24 : 800; }, configurable: true
    });
    Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
        get() { return isLabel(this) ? 20 : 400; }, configurable: true
    });
});

function mount(price: any = PRICE) {
    return mountConfig({
        schema: 'EconSchema',
        params: [{ ...price }],
        layout: { OneGraph: { graph: {
            xAxis: { title: 'Quantity', min: 0, max: 600 }, yAxis: { title: 'Price', min: 0, max: 6 },
            objects: [{ type: 'Point', def: {
                name: 'atDemand', title: '', x: '300 - 100*(params.price - 3)', y: 'params.price',
                color: 'colors.price', drag: [{ vertical: 'price' }]
            } }]
        } } }
    });
}

const modelOf = (r: any) => r.kg.view.model as Model;
const pointOf = (r: any) => r.kg.view.viewObjects.find((o: any) => o.name === 'atDemand');

/** d3's drag reads `view`, which jsdom will not take in the constructor. */
function mouse(type: string, clientY: number) {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: 100, clientY });
    Object.defineProperty(event, 'view', { value: window });
    return event;
}

/** Press the point, move the pointer `by` pixels down the screen, and let go. */
function drag(r: any, by: number, release = true) {
    const point = pointOf(r), node = point.rootElement.node() as Element;
    const y0 = point.yScale.scale(modelOf(r).getParam('price').value);
    node.dispatchEvent(mouse('mousedown', y0));
    window.dispatchEvent(mouse('mousemove', y0 + by / 2));
    window.dispatchEvent(mouse('mousemove', y0 + by));
    if (release) window.dispatchEvent(mouse('mouseup', y0 + by));
}

describe('dragging a point whose param has a dragRound', () => {

    it('follows the pointer between the values it rests at, and settles once let go', async () => {
        const r = mount();
        const model = modelOf(r), point = pointOf(r);
        const perDollar = Math.abs(point.yScale.scale(1) - point.yScale.scale(0));
        const announced: boolean[] = [];
        r.kg.on(KG_EVENTS.CURVE_DRAGGED, (e: any) => announced.push(e.dragging));

        // Up 37c: on round it would already have jumped to 3.50.
        drag(r, -0.37 * perDollar, false);
        expect(model.getParam('price').value).toBeCloseTo(3.35, 6);
        expect(model.inGesture).toBe(true);

        window.dispatchEvent(mouse('mouseup', point.yScale.scale(3.37)));
        // Let go, it is still on its way, and the drag has not ended.
        expect(model.inGesture).toBe(true);
        expect(announced).toEqual([true, true]);

        await wait(SETTLE_MS + 100);
        expect(model.getParam('price').value).toBe(3.5);
        expect(model.inGesture).toBe(false);
        expect(announced).toEqual([true, true, false]);
        // One move, from where it was before the drag.
        expect(r.kg.getSnapshot()!.params).toMatchObject({ price: 3 });
        r.destroy();
    });

    it('jumps as it always has without one', () => {
        const { dragRound, ...plain } = PRICE;
        const r = mount(plain);
        const point = pointOf(r);
        const perDollar = Math.abs(point.yScale.scale(1) - point.yScale.scale(0));
        drag(r, -0.37 * perDollar, false);
        expect(modelOf(r).getParam('price').value).toBe(3.5);
        window.dispatchEvent(mouse('mouseup', 0));
        expect(modelOf(r).inGesture).toBe(false);
        r.destroy();
    });

    it('lands before the next press moves it', () => {
        const r = mount();
        const point = pointOf(r);
        const perDollar = Math.abs(point.yScale.scale(1) - point.yScale.scale(0));
        drag(r, -0.37 * perDollar);
        expect(modelOf(r).getParam('price').value).toBeCloseTo(3.35, 6);
        // A key press a moment later moves it a whole step from where it rests.
        point.rootElement.node().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
        expect(modelOf(r).getParam('price').value).toBe(4);
        expect(modelOf(r).inGesture).toBe(false);
        r.destroy();
    });

    it('says nothing more once the engine is torn down', async () => {
        const r = mount();
        const point = pointOf(r);
        const perDollar = Math.abs(point.yScale.scale(1) - point.yScale.scale(0));
        drag(r, -0.37 * perDollar);
        const model = modelOf(r);
        r.destroy();
        await wait(SETTLE_MS + 100);
        expect(model.getParam('price').value).toBeCloseTo(3.35, 6);
    });
});

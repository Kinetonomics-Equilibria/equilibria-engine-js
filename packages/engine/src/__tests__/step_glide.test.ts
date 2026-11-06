import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { Model } from '../ts/model/model';
import { Param } from '../ts/model/param';
import { mountConfig, captureWarnings } from './helpers';

/**
 * A lesson step's move, played.
 *
 * The host puts the market where the step before left it, snapshots there,
 * and asks for the step's values with `update(…, { glide })`. The ghost holds
 * still at the snapshot while the curve moves away from it, as the step's
 * words say it does. A glide is the drag's settle with a target the host
 * names, and it shares the settle's slot: whatever moves next lands it.
 */

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const GLIDE = 120;

/**
 * Frames drawn when the test says, `ms` apart in all, so what a glide writes
 * at each is the same however busy the machine running the tests is.
 */
function clock() {
    const raf = globalThis.requestAnimationFrame, caf = globalThis.cancelAnimationFrame;
    let queue: (() => void)[] = [], t = 0;
    (globalThis as any).requestAnimationFrame = (f: () => void) => { queue.push(f); return queue.length; };
    (globalThis as any).cancelAnimationFrame = () => { };
    const now = vi.spyOn(performance, 'now').mockImplementation(() => t);
    return {
        play(ms: number, count: number) {
            for (let i = 0; i < count; i++) {
                t += ms / count;
                const due = queue;
                queue = [];
                due.forEach(f => f());
            }
        },
        restore() {
            (globalThis as any).requestAnimationFrame = raf;
            (globalThis as any).cancelAnimationFrame = caf;
            now.mockRestore();
        }
    };
}

const DEMAND = { name: 'demand', value: 200, min: 100, max: 300, round: 10 };
const PRICE = { name: 'price', value: 3, min: 1.5, max: 4.5, round: 0.5, dragRound: 0.05, precision: 2 };

const market = () => new Model({
    params: [{ ...DEMAND }, { ...PRICE }],
    calcs: { Qd: 'params.demand - 100*(params.price - 3)' },
    colors: {}, idioms: {}
});

describe('the grid a glide moves on', () => {

    it('is the drag grid where there is one, and a tenth of round otherwise', () => {
        expect(new Param({ ...PRICE, label: '' }).glideStep()).toBe(0.05);
        expect(new Param({ ...DEMAND, label: '' }).glideStep()).toBe(1);
        // 0.7 / 10 is 0.06999999999999999 in floating point.
        expect(new Param({ name: 'p', label: '', value: 0, min: 0, max: 7, round: 0.7 }).glideStep()).toBe(0.07);
    });

    it('is not a presentation param\'s, or a boolean\'s, which are put there at once', () => {
        expect(new Param({ ...DEMAND, label: '' }).glides()).toBe(true);
        expect(new Param({ ...DEMAND, label: '', presentation: true }).glides()).toBe(false);
        expect(new Param({ name: 'b', label: '', value: false } as any).glides()).toBe(false);
    });
});

describe('gliding a param to a value', () => {

    it('moves there over the time it is given, on its grid, and lands on the value exactly', () => {
        const frames = clock();
        try {
            const model = market();
            const seen: number[] = [];
            model.onParamChange = change => { if (change.name === 'demand') seen.push(change.value); };
            let done = 0;
            model.glide([{ name: 'demand', value: 250 }], GLIDE, () => { done++; });

            // Nothing moves at once.
            expect([model.getParam('demand').value, done]).toEqual([200, 0]);
            frames.play(GLIDE, 12);
            expect([model.getParam('demand').value, done]).toEqual([250, 1]);
            // More moves than round's five steps, every one of them whole.
            expect(seen.length).toBeGreaterThan(5);
            seen.forEach(v => expect(Number.isInteger(v)).toBe(true));
            expect(seen.filter(v => v % 10 !== 0).length).toBeGreaterThan(0);
            // Never past where it is going, and never back.
            seen.forEach((v, i) => expect(v).toBeGreaterThanOrEqual(i > 0 ? seen[i - 1] : 200));
            expect(seen[seen.length - 1]).toBe(250);
            expect(model.currentCalcValues['Qd']).toBe(250);
        } finally {
            frames.restore();
        }
    });

    it('eases out of where it starts and into where it lands', () => {
        const frames = clock();
        try {
            const model = market();
            model.glide([{ name: 'demand', value: 300 }], GLIDE, () => { });
            const at: number[] = [200];
            for (let i = 0; i < 10; i++) {
                frames.play(GLIDE / 10, 1);
                at.push(model.getParam('demand').value);
            }
            const first = at[1] - at[0], middle = at[6] - at[5], last = at[10] - at[9];
            expect(first).toBeLessThan(middle);
            expect(last).toBeLessThan(middle);
            expect(at[10]).toBe(300);
        } finally {
            frames.restore();
        }
    });

    it('moves a param with a drag grid on that', () => {
        const frames = clock();
        try {
            const model = market();
            const seen: number[] = [];
            model.onParamChange = change => { seen.push(change.value); };
            model.glide([{ name: 'price', value: 4 }], GLIDE, () => { });
            frames.play(GLIDE, 12);
            seen.forEach(v => expect(v).toBe(parseFloat(v.toFixed(2))));
            expect(seen.filter(v => v !== 3 && v !== 3.5 && v !== 4).length).toBeGreaterThan(0);
            expect(model.getParam('price').value).toBe(4);
        } finally {
            frames.restore();
        }
    });

    it('moves every param it is given together', () => {
        const frames = clock();
        try {
            const model = market();
            model.glide([{ name: 'demand', value: 300 }, { name: 'price', value: 4.5 }], GLIDE, () => { });
            frames.play(GLIDE / 2, 6);
            const demand = model.getParam('demand').value, price = model.getParam('price').value;
            expect(demand).toBeGreaterThan(200);
            expect(demand).toBeLessThan(300);
            expect(price).toBeGreaterThan(3);
            expect(price).toBeLessThan(4.5);
            frames.play(GLIDE / 2, 6);
            expect([model.getParam('demand').value, model.getParam('price').value]).toEqual([300, 4.5]);
        } finally {
            frames.restore();
        }
    });

    it('lands at once when it is given no time, as under reduced motion', () => {
        const model = market();
        let done = 0;
        model.glide([{ name: 'demand', value: 250 }], 0, () => { done++; });
        expect([model.getParam('demand').value, done]).toEqual([250, 1]);
    });

    it('is done at once with nothing to move, and says which name it does not have', () => {
        const model = market();
        let done = 0;
        const { warnings } = captureWarnings(() =>
            model.glide([{ name: 'demand', value: 200 }, { name: 'nothing', value: 4 }], GLIDE, () => { done++; }));
        expect(done).toBe(1);
        expect(warnings.join('\n')).toMatch(/"nothing" not found/);
    });

    it('lands on round, where the value it is given is between two', async () => {
        const model = market();
        model.glide([{ name: 'demand', value: 247 }], 0, () => { });
        expect(model.getParam('demand').value).toBe(250);
    });

    it('lands before the next gesture opens, so that gesture snapshots where the step put it', () => {
        const model = market();
        let done = 0;
        model.glide([{ name: 'demand', value: 250 }], GLIDE, () => { done++; });
        model.beginGesture();
        expect([model.getParam('demand').value, done]).toEqual([250, 1]);
        expect((model as any).evaluate('prev.params.demand')).toBe(250);
        model.endGesture();
    });

    it('lands a drag still settling before it sets off', () => {
        const model = market();
        model.updateParam('price', 3.37, { dragging: true });
        let settled = 0;
        model.settle(['price'], GLIDE, () => { settled++; });
        model.glide([{ name: 'demand', value: 250 }], GLIDE, () => { });
        expect([model.getParam('price').value, settled]).toEqual([3.5, 1]);
    });

    it('stops where a write it did not make left the param', async () => {
        const model = market();
        let done = 0;
        model.glide([{ name: 'demand', value: 300 }], GLIDE, () => { done++; });
        model.getParam('demand').value = 120;
        await wait(GLIDE + 100);
        expect([model.getParam('demand').value, done]).toEqual([120, 1]);
    });
});

// ---------------------------------------------------------------------------
// Through the engine's update, as a lesson step asks for it

const isLabel = (el: Element) => el.tagName === 'DIV' && /^rootElement-/.test(el.getAttribute('class') || '');

beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {
        get() { return isLabel(this) ? 24 : 800; }, configurable: true
    });
    Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
        get() { return isLabel(this) ? 20 : 400; }, configurable: true
    });
});

const matchMedia = window.matchMedia;
afterEach(() => { (window as any).matchMedia = matchMedia; });

/** The viewer has asked their device for less motion. */
function lessMotion() {
    (window as any).matchMedia = (query: string) => ({
        matches: /prefers-reduced-motion:\s*reduce/.test(query), media: query,
        addListener() { }, removeListener() { }, addEventListener() { }, removeEventListener() { }
    });
}

function mount() {
    return mountConfig({
        schema: 'EconSchema',
        params: [{ ...DEMAND }, { name: 'expanding', value: false }],
        steps: [{ reveal: ['atDemand'] }, {}],
        layout: { OneGraph: { graph: {
            xAxis: { title: 'Quantity', min: 0, max: 400 }, yAxis: { title: 'Price', min: 0, max: 6 },
            objects: [{ type: 'Point', def: {
                name: 'atDemand', title: '', x: 'params.demand', y: 3, color: 'colors.demand', arrive: true
            } }]
        } } }
    });
}

const modelOf = (r: any) => r.kg.view.model as Model;

describe('a step\'s update with a glide', () => {

    it('puts the step there at once, plays the move from the snapshot, and says when it has landed', async () => {
        const r = mount();
        const model = modelOf(r);
        r.kg.snapshot();
        let landed = 0;
        r.kg.update({
            params: [{ name: 'step', value: 1 }, { name: 'demand', value: 250 }, { name: 'expanding', value: 1 }]
        }, { arrive: true, glide: GLIDE, landed: () => { landed++; } });

        // What the step reveals, and a switch, are there as the move begins.
        expect(model.getParam('step').value).toBe(1);
        expect(model.getParam('expanding').value).toBe(1);
        expect([model.getParam('demand').value, landed]).toEqual([200, 0]);
        // Its frames are not arrivals.
        expect(model.arriving).toBe(false);

        await wait(GLIDE + 100);
        expect([model.getParam('demand').value, landed]).toEqual([250, 1]);
        // One move, from where the host snapshotted the market.
        expect(r.kg.getSnapshot()!.params).toMatchObject({ demand: 200 });
        r.destroy();
    });

    it('lands at once, and says so at once, under reduced motion', () => {
        lessMotion();
        const r = mount();
        let landed = 0;
        r.kg.update({ params: [{ name: 'demand', value: 250 }] }, { glide: GLIDE, landed: () => { landed++; } });
        expect([modelOf(r).getParam('demand').value, landed]).toEqual([250, 1]);
        r.destroy();
    });

    it('with no glide, moves everything at once as it always has', () => {
        const r = mount();
        let landed = 0;
        r.kg.update({ params: [{ name: 'demand', value: 250 }] }, { landed: () => { landed++; } });
        expect([modelOf(r).getParam('demand').value, landed]).toEqual([250, 1]);
        r.destroy();
    });

    it('lands before the host\'s next update, which goes in over it', () => {
        const r = mount();
        const landed: string[] = [];
        r.kg.update({ params: [{ name: 'demand', value: 300 }] }, { glide: GLIDE, landed: () => { landed.push('first'); } });
        r.kg.update({ params: [{ name: 'demand', value: 150 }] }, { glide: GLIDE, landed: () => { landed.push('second'); } });
        // The first is where it was going, and the second sets off from there.
        expect(landed).toEqual(['first']);
        expect(modelOf(r).getParam('demand').value).toBe(300);
        r.destroy();
    });

    it('says nothing more once the engine is torn down', async () => {
        const r = mount();
        const model = modelOf(r);
        let landed = 0;
        r.kg.update({ params: [{ name: 'demand', value: 300 }] }, { glide: GLIDE, landed: () => { landed++; } });
        r.destroy();
        await wait(GLIDE + 100);
        expect([model.getParam('demand').value, landed]).toEqual([200, 0]);
    });
});

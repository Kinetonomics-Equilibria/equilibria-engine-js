import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { mountConfig, stubContainerLayout } from './helpers';
import { DROP_DELAY_MS, DROP_MS } from '../ts/view/arrival';

/**
 * What a lesson step brings in arrives: a point pops, and its droplines are
 * drawn out from it to the axes.
 *
 * jsdom draws no frames worth looking at, so these read the attributes the
 * animation starts from and ends on. The claims worth holding are when it
 * plays — a step, and nothing else — and that it always ends where the
 * object belongs.
 */

beforeAll(() => stubContainerLayout());

const realMatchMedia = window.matchMedia;
afterEach(() => { window.matchMedia = realMatchMedia; });

/** One point, revealed at step 1, whose droplines are drawn at step 1 alone. */
function build(over: any = {}, params: any[] = []) {
    return mountConfig({
        schema: 'EconSchema',
        params,
        steps: [{ reveal: ['pair'] }, {}],
        layout: {
            OneGraph: {
                graph: {
                    xAxis: { title: 'Pairs', min: 0, max: 20 },
                    yAxis: { title: 'Price', min: 0, max: 20 },
                    objects: [{
                        type: 'Point',
                        def: {
                            name: 'pair', coordinates: [5, 10],
                            droplines: { vertical: '', horizontal: '', show: 'params.step == 1' },
                            arrive: true,
                            ...over
                        }
                    }]
                }
            }
        }
    });
}

const step = (r: any, n: number, arrive = true) =>
    r.kg.update({ params: [{ name: 'step', value: n }] }, { arrive });

/** The point's radius as drawn, and each dropline's ends as drawn. */
function drawn(r: any) {
    const objects = r.kg.view.viewObjects;
    const point = objects.find((o: any) => o.name === 'pair');
    const lines = objects
        .filter((o: any) => o.def && o.def.partOf === 'pair' && o.constructor.name === 'Segment')
        .map((o: any) => ['x1', 'y1', 'x2', 'y2'].map(a => +o.line.attr(a)));
    return { r: +point.circle.attr('r'), lines };
}

/** The same diagram at the same step, drawn with no arrival: where everything belongs. */
function settled(n: number, over: any = {}) {
    const r = build(over);
    step(r, n, false);
    const at = drawn(r);
    r.destroy();
    return at;
}

const played = () => new Promise(resolve => setTimeout(resolve, DROP_DELAY_MS + DROP_MS + 150));

describe('arriving at a step', () => {

    it('pops the point in and draws its droplines out from it, then leaves them where they belong', async () => {
        const r = build(), end = settled(1);
        step(r, 1);

        const start = drawn(r);
        expect(start.r).toBe(0);
        expect(start.lines).toHaveLength(2);
        // Each dropline starts as its point: its axis end on top of it.
        start.lines.forEach(([x1, y1, x2, y2]) => expect([x1, y1]).toEqual([x2, y2]));
        // And the point end is already where it belongs.
        start.lines.forEach((line, i) => expect(line.slice(2)).toEqual(end.lines[i].slice(2)));

        await played();
        expect(drawn(r)).toEqual(end);
        r.destroy();
    });

    // Going back a step to a point already on the chart brings its droplines
    // back, and only they are drawn out again.
    it('draws droplines out on their own when they come back without their point', () => {
        const r = build(), end = settled(1);
        step(r, 1, false);
        step(r, 2, false);
        step(r, 1);

        const now = drawn(r);
        expect(now.r).toBe(end.r);
        now.lines.forEach(([x1, y1, x2, y2]) => expect([x1, y1]).toEqual([x2, y2]));
        r.destroy();
    });

    // A panel relaid out while something arrives, as the market takes the
    // front: the redraw puts it where it belongs, and the animation must not
    // go on to drag it back. Read a frame or so after the redraw, while the
    // pop, or the drop, would still be playing; a slow timer only makes these
    // weaker, never wrong.
    describe('stays where it belongs once anything redraws it', () => {

        const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        it('mid-pop', async () => {
            const r = build(), end = settled(1);
            step(r, 1);
            await wait(60);
            r.kg.update({});
            await wait(60);
            expect(drawn(r).r).toBe(end.r);
            r.destroy();
        });

        it('mid-drop', async () => {
            const r = build(), end = settled(1);
            step(r, 1);
            await wait(DROP_DELAY_MS + 100);
            r.kg.update({});
            await wait(60);
            expect(drawn(r)).toEqual(end);
            r.destroy();
        });

    });

});

describe('not arriving', () => {

    // A link opening at step 3, or a remount putting the view back: the same
    // param moving, which only the host can tell from a step.
    it('draws in place when the update is not an arrival', () => {
        const r = build(), end = settled(1);
        step(r, 1, false);
        expect(drawn(r)).toEqual(end);
        r.destroy();
    });

    it('draws in place what is on the chart when it mounts', () => {
        const r = build({}, [{ name: 'step', value: 1, min: 0, max: 2, round: 1 }]);
        expect(drawn(r)).toEqual(settled(1));
        r.destroy();
    });

    it('draws in place an object that does not arrive', () => {
        const r = build({ arrive: false }), end = settled(1, { arrive: false });
        step(r, 1);
        expect(drawn(r)).toEqual(end);
        r.destroy();
    });

    it('draws in place for a viewer who has asked for less motion', () => {
        window.matchMedia = ((query: string) => ({
            matches: query.includes('prefers-reduced-motion'), media: query,
            addEventListener() { }, removeEventListener() { }
        })) as any;
        const r = build(), end = settled(1);
        step(r, 1);
        expect(drawn(r)).toEqual(end);
        r.destroy();
    });

});

import { describe, it, expect, beforeAll } from 'vitest';
import { describeMovement, noiseFor } from '../ts/view/movement';
import { mountObjects, stubContainerLayout } from './helpers';
import { KG_EVENTS } from '../ts/constants';

/**
 * "The demand curve shifted right" — the clause a readout cannot produce and an
 * explanation cannot do without.
 *
 * The engine's job stops at a structured descriptor; the app writes the English.
 * These tests are therefore about the descriptor, and specifically about the
 * cases where a plausible-looking answer is wrong: a rotation reported as a
 * shift, a shift reported in the wrong axis, and — the one that matters most —
 * rounding noise reported as movement, which is how an app ends up telling a
 * student something confidently false.
 */

beforeAll(() => stubContainerLayout());

const NOISE = noiseFor(0, 20); // 0.02 on a 0–20 axis

function line(yIntercept: number, slope: number) {
    return [0, 5, 10, 15, 20].map(x => ({ x, y: yIntercept + slope * x }));
}

describe('describeMovement', () => {

    it('says nothing when nothing moved', () => {
        expect(describeMovement(line(20, -1), line(20, -1), NOISE, NOISE)).toBeNull();
    });

    // The case the whole threshold exists for. Told "shifted right" by float
    // dust, an app says something false to a student, and says it confidently.
    it('says nothing for a change below the noise of the axis', () => {
        const nudged = line(20, -1).map(p => ({ x: p.x + 0.001, y: p.y + 0.001 }));
        expect(describeMovement(line(20, -1), nudged, NOISE, NOISE)).toBeNull();
    });

    it('scales the threshold to the axis, not to absolute units', () => {
        // The same 0.5 move is nothing on a 0–20,000 axis and plainly visible on 0–20.
        const before = [{ x: 100, y: 100 }], after = [{ x: 100.5, y: 100 }];
        const big = noiseFor(0, 20000);
        expect(describeMovement(before, after, big, big)).toBeNull();
        expect(describeMovement(before, after, NOISE, NOISE)).not.toBeNull();
    });

    it('reads a horizontal translation as a shift along x', () => {
        const shifted = line(20, -1).map(p => ({ x: p.x + 4, y: p.y }));
        const m = describeMovement(line(20, -1), shifted, NOISE, NOISE)!;

        expect(m.kind).toBe('shift');
        expect(m.axis).toBe('x');
        expect(m.sign).toBe(1);
        expect(m.dx).toBeCloseTo(4, 10);
        expect(m.dy).toBeCloseTo(0, 10);
    });

    it('reads a vertical translation as a shift along y, and signs it', () => {
        const m = describeMovement(line(20, -1), line(16, -1), NOISE, NOISE)!;

        expect(m.kind).toBe('shift');
        expect(m.axis).toBe('y');
        expect(m.sign).toBe(-1);
        expect(m.dy).toBeCloseTo(-4, 10);
    });

    // Up and right is one event described two ways, and choosing between them is
    // economics, not geometry — for a demand curve the convention is horizontal.
    // The engine reports both and declines to sign a direction it cannot pick.
    it('reports a diagonal move as both axes rather than guessing one', () => {
        const moved = line(20, -1).map(p => ({ x: p.x + 3, y: p.y + 3 }));
        const m = describeMovement(line(20, -1), moved, NOISE, NOISE)!;

        expect(m.axis).toBe('both');
        expect(m.sign).toBe(0);
        expect(m.dx).toBeCloseTo(3, 10);
        expect(m.dy).toBeCloseTo(3, 10);
    });

    // A pivot about the y-intercept: one end fixed, the other swung. Reported as
    // a shift it would be a wrong answer that reads perfectly well.
    it('tells a rotation about an intercept from a shift', () => {
        const m = describeMovement(line(20, -1), line(20, -2), NOISE, NOISE)!;

        expect(m.kind).toBe('rotate');
        expect(m.steeper).toBe(true);
    });

    it('knows a rotation that flattened the curve', () => {
        const m = describeMovement(line(20, -2), line(20, -1), NOISE, NOISE)!;

        expect(m.kind).toBe('rotate');
        expect(m.steeper).toBe(false);
    });

    it('calls a single point a move rather than a shift', () => {
        const m = describeMovement([{ x: 9, y: 11 }], [{ x: 11, y: 13 }], NOISE, NOISE)!;

        expect(m.kind).toBe('move');
        expect(m.axis).toBe('both');
    });

    // A curve resampled over a changed domain has no point-to-point
    // correspondence. Going silent would claim "nothing moved", which is worse
    // than an approximate answer from the centroid.
    it('falls back to the centroid when the sample counts differ', () => {
        const before = line(20, -1);
        const after = [0, 10, 20].map(x => ({ x: x + 5, y: 20 - x }));
        const m = describeMovement(before, after, NOISE, NOISE)!;

        expect(m).not.toBeNull();
        expect(m.dx).toBeCloseTo(5, 10);
    });

    it('says nothing rather than guessing when a coordinate is not a number', () => {
        const broken = [{ x: NaN, y: 3 }];
        expect(describeMovement([{ x: 1, y: 3 }], broken, NOISE, NOISE)).toBeNull();
        expect(describeMovement(broken, [{ x: 1, y: 3 }], NOISE, NOISE)).toBeNull();
    });

});

describe('what the diagram reports about itself', () => {

    /** A market whose demand intercept is a param, so it can be moved from outside. */
    function market() {
        return mountObjects([{
            type: 'EconLinearEquilibrium',
            def: {
                demand: { yIntercept: 'params.a', slope: -1 },
                supply: { yIntercept: 2, slope: 1 },
                equilibrium: {}
            }
        }], {
            params: [{ name: 'a', value: 20, min: 5, max: 28, round: 0.1 }],
            xAxis: { title: 'Q', min: 0, max: 20 },
            yAxis: { title: 'P', min: 0, max: 20 }
        });
    }

    it('emits kg:param_changed, which nothing in the engine used to emit at all', () => {
        const r = market();
        const events: any[] = [];
        r.kg.on(KG_EVENTS.PARAM_CHANGED, (e: any) => events.push(e));

        r.kg.update({ params: [{ name: 'a', value: 24 }] });

        expect(events).toHaveLength(1);
        expect(events[0].name).toBe('a');
        expect(events[0].value).toBe(24);
        expect(events[0].previousValue).toBe(20);
        expect(events[0].params.a).toBe(24);
        r.destroy();
    });

    it('carries the calcs as they now stand, so a host need not re-derive them', () => {
        // The event named what changed and what moved, and not what anything
        // *is*. A host putting a number beside a diagram was left to reach into
        // the model or to write the formula out a second time in its own code —
        // which is the duplication calcs exist to prevent, and the way a panel
        // ends up disagreeing with the diagram beside it.
        const r = mountObjects([{
            EconLinearEquilibrium: {
                demand: { yIntercept: 'params.a', slope: -1 },
                supply: { yIntercept: 2, slope: 1 },
                equilibrium: {}
            }
        }], {
            params: [{ name: 'a', value: 20, min: 5, max: 28, round: 0.1 }],
            calcs: { Pe: '(params.a + 2)/2', dPe: '(params.a + 2)/2 - prev.calcs.Pe' },
            xAxis: { title: 'Q', min: 0, max: 20 },
            yAxis: { title: 'P', min: 0, max: 20 }
        });
        let event: any = null;
        r.kg.on(KG_EVENTS.PARAM_CHANGED, (e: any) => { event = e; });

        r.kg.snapshot();
        r.kg.update({ params: [{ name: 'a', value: 24 }] });

        expect(event.calcs.Pe).toBeCloseTo(13, 6);
        // And a delta is an ordinary calc over `prev`, computed by the engine
        // from the same snapshot the ghosts are drawn from — not bookkeeping
        // the host has to do for itself.
        expect(event.calcs.dPe).toBeCloseTo(2, 6);
        r.destroy();
    });

    it('hands out a copy, not the model\'s own calc object', () => {
        const r = market();
        let event: any = null;
        r.kg.on(KG_EVENTS.PARAM_CHANGED, (e: any) => { event = e; });

        r.kg.update({ params: [{ name: 'a', value: 24 }] });
        event.calcs.equilibrium = 'clobbered';

        expect((r.kg as any).view.model.currentCalcValues.equilibrium).not.toBe('clobbered');
        r.destroy();
    });

    it('names the objects that moved, by their human titles', () => {
        const r = market();
        let event: any = null;
        r.kg.on(KG_EVENTS.PARAM_CHANGED, (e: any) => { event = e; });

        r.kg.update({ params: [{ name: 'a', value: 24 }] });

        const titles = event.affected.map((a: any) => a.title);
        expect(titles).toContain('demand');
        expect(titles).toContain('equilibrium');
        r.destroy();
    });

    // Raising demand's intercept moves the curve up: the sentence is "demand
    // shifted" and it is a translation, not a pivot, because the slope is fixed.
    it('describes the demand shift as a translation', () => {
        const r = market();
        let event: any = null;
        r.kg.on(KG_EVENTS.PARAM_CHANGED, (e: any) => { event = e; });

        r.kg.update({ params: [{ name: 'a', value: 24 }] });

        const demand = event.affected.find((a: any) => a.title === 'demand');
        expect(demand.movement.kind).toBe('shift');
        expect(demand.movement.dy).toBeGreaterThan(0);
        r.destroy();
    });

    // Q* and P* both rise, which is the whole point of the diagram — and the
    // reason a movement report has to cover more than the object dragged.
    it('reports the equilibrium point moving up and to the right', () => {
        const r = market();
        let event: any = null;
        r.kg.on(KG_EVENTS.PARAM_CHANGED, (e: any) => { event = e; });

        r.kg.update({ params: [{ name: 'a', value: 24 }] });

        const eq = event.affected.find((a: any) => a.title === 'equilibrium');
        expect(eq.movement.kind).toBe('move');
        expect(eq.movement.dx).toBeGreaterThan(0);
        expect(eq.movement.dy).toBeGreaterThan(0);
        r.destroy();
    });

    // Supply is fixed here. An app that is told supply moved will write a
    // sentence about supply, so silence about it is the assertion that matters.
    it('leaves out the objects that did not move', () => {
        const r = market();
        let event: any = null;
        r.kg.on(KG_EVENTS.PARAM_CHANGED, (e: any) => { event = e; });

        r.kg.update({ params: [{ name: 'a', value: 24 }] });

        expect(event.affected.map((a: any) => a.title)).not.toContain('supply');
        r.destroy();
    });

    it('reports nothing at all when a change moves nothing', () => {
        const r = mountObjects([
            { type: 'Point', def: { name: 'fixed', coordinates: [5, 5] } }
        ], { params: [{ name: 'unused', value: 1, min: 0, max: 10 }] });

        let event: any = null;
        r.kg.on(KG_EVENTS.PARAM_CHANGED, (e: any) => { event = e; });
        r.kg.update({ params: [{ name: 'unused', value: 4 }] });

        expect(event.name).toBe('unused');
        expect(event.affected).toEqual([]);
        r.destroy();
    });

    // Measured against the snapshot, not the previous frame, so a drag reports
    // the whole movement from where the student grabbed it — the same comparison
    // `prev.changed` makes, which keeps the ghost and the sentence describing one
    // event rather than two.
    it('accumulates a gesture into one movement rather than reporting each tick', () => {
        const r = market();
        const events: any[] = [];
        r.kg.on(KG_EVENTS.PARAM_CHANGED, (e: any) => events.push(e));

        r.kg.beginGesture();
        r.kg.update({ params: [{ name: 'a', value: 22 }] });
        r.kg.update({ params: [{ name: 'a', value: 24 }] });
        r.kg.endGesture();

        const firstDy = events[0].affected.find((a: any) => a.title === 'demand').movement.dy;
        const lastDy = events[1].affected.find((a: any) => a.title === 'demand').movement.dy;

        expect(firstDy).toBeCloseTo(2, 6);
        expect(lastDy).toBeCloseTo(4, 6);
        r.destroy();
    });

    // A host that only ever sets params in discrete jumps has no gesture to
    // bracket, and `snapshotOn: 'change'` is the mode for it. Movement is then
    // measured per change rather than per gesture — the same rule `prev` follows,
    // which is what keeps a ghost and a sentence from disagreeing.
    it('measures per change in snapshotOn: change mode', () => {
        const r = mountObjects([{
            type: 'EconLinearEquilibrium',
            def: {
                demand: { yIntercept: 'params.a', slope: -1 },
                supply: { yIntercept: 2, slope: 1 },
                equilibrium: {}
            }
        }], {
            params: [{ name: 'a', value: 20, min: 5, max: 28, round: 0.1 }],
            xAxis: { title: 'Q', min: 0, max: 20 },
            yAxis: { title: 'P', min: 0, max: 20 },
            snapshotOn: 'change'
        });

        const events: any[] = [];
        r.kg.on(KG_EVENTS.PARAM_CHANGED, (e: any) => events.push(e));

        r.kg.update({ params: [{ name: 'a', value: 22 }] });
        r.kg.update({ params: [{ name: 'a', value: 24 }] });

        const dys = events.map(e => e.affected.find((a: any) => a.title === 'demand').movement.dy);
        expect(dys[0]).toBeCloseTo(2, 6);
        expect(dys[1]).toBeCloseTo(2, 6);
        r.destroy();
    });

    it('costs nothing when no one is listening', () => {
        const r = market();
        // No listener attached: the emit path returns before sampling anything.
        expect(() => r.kg.update({ params: [{ name: 'a', value: 24 }] })).not.toThrow();
        r.destroy();
    });

});

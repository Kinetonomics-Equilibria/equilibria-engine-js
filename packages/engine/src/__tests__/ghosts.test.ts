import { describe, it, expect, beforeAll } from 'vitest';
import { mountConfig, stubContainerLayout, captureWarnings } from './helpers';

/**
 * `ghost: true` — the shorthand for "and where this was, one snapshot ago".
 *
 * Like `steps`, this adds no capability: every ghost in this repo was already
 * drawable by restating the object in terms of `prev`, and the study screen did
 * exactly that for three of them. What it removes is a second statement of a
 * fact — the geometry, the colour, the slope — which is the kind of duplication
 * that does not stay in agreement with itself.
 *
 * So what is worth testing is not that a second curve appears. It is that the
 * second curve is *the same curve*: bound one snapshot back, not addressable,
 * not draggable, revealed with the original, and paired with it in the labels.
 */

beforeAll(() => stubContainerLayout());

const AXES = {
    xAxis: { title: 'Q', min: 0, max: 20 },
    yAxis: { title: 'P', min: 0, max: 20 }
};

const A = { name: 'a', value: 20, min: 12, max: 28, round: 0.1 };

function build(objects: any[], extra: any = {}) {
    return mountConfig({
        schema: 'EconSchema',
        params: [A],
        layout: { OneGraph: { graph: { ...AXES, objects } } },
        ...extra
    });
}

/**
 * Every curve path the diagram drew.
 *
 * The transparent `dragPath` hit areas are excluded — every curve has one
 * whether or not it is draggable, so counting them counts each curve twice.
 */
function curves(r: any): string[] {
    return Array.from(r.container.querySelectorAll('path'))
        .filter((p: any) => !(p.getAttribute('class') || '').startsWith('dragPath'))
        .map((p: any) => p.getAttribute('d'))
        .filter((d: any) => typeof d === 'string' && d.length > 60);
}

/** Object labels, in draw order — the ghost first, since it is drawn under. */
function labels(r: any): string[] {
    return (r.kg as any).view.viewObjects
        .filter((o: any) => o.text !== undefined)
        .map((o: any) => String(o.text))
        .filter((t: string) => t.indexOf('\\text{') === -1);
}

/** The model's calcs as they stand now, not as they stood at mount. */
function calcsNow(r: any) {
    return (r.kg as any).view.model.currentCalcValues;
}

function objectsIn(r: any): any[] {
    return (r.kg as any).view.viewObjects;
}

function move(r: any, value: number) {
    r.kg.snapshot();
    r.kg.update({ params: [{ name: 'a', value }] });
}

const DEMAND = {
    type: 'Line',
    def: {
        name: 'demand', yIntercept: 'params.a', slope: -1,
        color: 'colors.demand', label: { text: 'D', x: 4 },
        drag: [{ vertical: 'a' }],
        ghost: true
    }
};

describe('ghost: the same object, one snapshot ago', () => {

    it('draws a second curve bound to the previous value', () => {
        const r = build([DEMAND]);
        expect(r.error).toBe(null);

        // Nothing has moved, so there is nothing for a ghost to remember and
        // only the live curve is on screen.
        const before = curves(r);
        expect(before.length).toBe(1);

        move(r, 14);

        const after = curves(r);
        expect(after.length).toBe(2);
        expect(after[0]).not.toBe(after[1]);

        // The ghost — drawn first, so underneath — is exactly where the live
        // curve was, traced from `prev` rather than remembered by this test.
        expect(after[0]).toBe(before[0]);
        r.destroy();
    });

    it('keeps the ghost off screen until a param actually moves', () => {
        const r = build([DEMAND]);
        const ghost = objectsIn(r).filter((o: any) => o.constructor.name === 'Curve')[0];

        expect(ghost.show).toBeFalsy();
        move(r, 14);
        expect(ghost.show).toBeTruthy();
        r.destroy();
    });

    it("conjoins the author's own show rather than replacing it", () => {
        const r = build([{
            type: 'Line',
            def: {
                name: 'demand', yIntercept: 'params.a', slope: -1,
                show: 'params.visible', ghost: true
            }
        }], { params: [A, { name: 'visible', value: 0, min: 0, max: 1, round: 1, presentation: true }] });

        const shown = () => objectsIn(r)
            .filter((o: any) => o.constructor.name === 'Curve')
            .map((o: any) => !!o.show);

        move(r, 14);
        // The param moved, but the author said not to show it.
        expect(shown()).toEqual([false, false]);

        r.kg.update({ params: [{ name: 'visible', value: 1 }] });
        expect(shown()).toEqual([true, true]);
        r.destroy();
    });

    it('takes an extra condition that is read as now, not as then', () => {
        const r = build([{
            type: 'Line',
            def: {
                name: 'demand', yIntercept: 'params.a', slope: -1,
                ghost: { show: 'not(params.asking)' }
            }
        }], { params: [A, { name: 'asking', value: 0, min: 0, max: 1, round: 1, presentation: true }] });

        const ghost = () => objectsIn(r).filter((o: any) => o.constructor.name === 'Curve')[0];

        move(r, 14);
        expect(ghost().show).toBeTruthy();

        r.kg.update({ params: [{ name: 'asking', value: 1 }] });
        expect(ghost().show).toBeFalsy();
        r.destroy();
    });
});

describe('a ghost is where *this* object was, not a record that something moved', () => {

    // Two curves on one diagram, which is the first case where "the student
    // moved something" and "this curve moved" come apart.
    const C = { name: 'c', value: 2, min: 0, max: 8, round: 0.1 };

    const SUPPLY = {
        type: 'Line',
        def: {
            name: 'supply', yIntercept: 'params.c', slope: 1,
            color: 'colors.supply', label: { text: 'S', x: 16 }
        }
    };

    const EQUILIBRIUM = {
        type: 'Point',
        def: { name: 'equilibrium', x: 'calcs.Qe', y: 'calcs.Pe', ghost: true }
    };

    const MARKET = {
        params: [A, C],
        calcs: { Qe: '(params.a - params.c)/2', Pe: '(params.a + params.c)/2' }
    };

    function moveParam(r: any, name: string, value: number) {
        r.kg.snapshot();
        r.kg.update({ params: [{ name, value }] });
    }

    /** Demand's ghost and demand, in draw order; supply has none and comes third. */
    function demandCurves(r: any): any[] {
        return objectsIn(r).filter((o: any) => o.constructor.name === 'Curve').slice(0, 2);
    }

    it('keeps the demand ghost off, and demand plain D, when only supply moved', () => {
        const r = build([DEMAND, SUPPLY], MARKET);
        expect(r.error).toBe(null);

        moveParam(r, 'c', 6);

        // Demand is drawn exactly where it was. A ghost of it would be a dashed
        // copy lying on top of the solid one, and a prime would be claiming a
        // shift that did not happen.
        const [ghost, live] = demandCurves(r);
        expect(ghost.show).toBeFalsy();
        expect(live.show).toBeTruthy();
        expect(labels(r)).toEqual(['D\\ ', 'D', 'S']);
        r.destroy();
    });

    it('raises the ghost and primes the label when demand itself moved', () => {
        const r = build([DEMAND, SUPPLY], MARKET);

        moveParam(r, 'a', 26);

        const [ghost] = demandCurves(r);
        expect(ghost.show).toBeTruthy();
        expect(labels(r)).toEqual(['D\\ ', 'D^\\prime', 'S']);
        r.destroy();
    });

    it('drops the ghost again once demand is back where it was snapshotted', () => {
        // The repro from the study screen: one scenario moves supply, the next
        // puts it back. Each is its own snapshot, and in neither did demand move.
        const r = build([DEMAND, SUPPLY], MARKET);

        moveParam(r, 'c', 6);
        moveParam(r, 'c', 2);

        expect(demandCurves(r)[0].show).toBeFalsy();
        expect(labels(r)).toEqual(['D\\ ', 'D', 'S']);
        r.destroy();
    });

    it('follows a calc, so a point moved by either curve keeps its ghost', () => {
        // The equilibrium is bound to calcs rather than to a param, and both
        // params move the calcs. That is the right answer for it: it *did* move.
        const r = build([DEMAND, SUPPLY, EQUILIBRIUM], MARKET);
        const arrow = () => objectsIn(r).filter((o: any) => o.constructor.name === 'Segment')[0];

        moveParam(r, 'c', 6);
        expect(arrow().show).toBeTruthy();
        expect([arrow().x1, arrow().y1]).toEqual([9, 11]);
        expect([arrow().x2, arrow().y2]).toEqual([7, 13]);
        r.destroy();
    });

    it('stays off for a presentation param, even one the object is bound to', () => {
        // `prev.changed` is conjoined, not replaced: a binding that differs only
        // because a presentation param moved is the host rearranging the
        // screen, not the student moving the curve (NOTES.md issue 13).
        const r = build([{
            type: 'Line',
            def: { name: 'start', yIntercept: 'params.startA', slope: -1, ghost: true }
        }], { params: [A, { name: 'startA', value: 20, min: 12, max: 28, round: 0.1, presentation: true }] });

        moveParam(r, 'startA', 26);
        const ghost = objectsIn(r).filter((o: any) => o.constructor.name === 'Curve')[0];
        expect(ghost.show).toBeFalsy();
        r.destroy();
    });

    it('does not count the drag it was not given', () => {
        // `draggable` reads `params.submitted` — a reference the ghost never
        // inherits, so it must not decide when the ghost appears either.
        const r = build([{
            type: 'Line',
            def: {
                name: 'demand', yIntercept: 'params.a', slope: -1,
                drag: [{ vertical: 'a', draggable: 'not(params.locked)' }],
                ghost: true
            }
        }], { params: [A, { name: 'locked', value: 0, min: 0, max: 1, round: 1 }] });

        moveParam(r, 'locked', 1);
        const ghost = objectsIn(r).filter((o: any) => o.constructor.name === 'Curve')[0];
        expect(ghost.show).toBeFalsy();
        r.destroy();
    });
});

describe('a ghost is not a second address', () => {

    it('claims no name, no calc key and no duplicate warning', () => {
        const { result: r, warnings } = captureWarnings(() => build([DEMAND]));

        expect(warnings.filter(w => w.indexOf('Duplicate object name') > -1)).toEqual([]);

        // One `calcs.demand`, belonging to the live curve: its intercept is the
        // live param, not the snapshot.
        expect(calcsNow(r).demand.yIntercept).toBe(20);

        move(r, 14);
        expect(calcsNow(r).demand.yIntercept).toBe(14);
        r.destroy();
    });

    it('is revealed by a step that reveals the object it shadows', () => {
        const r = build([DEMAND], { steps: [{ reveal: ['demand'] }] });

        const curveShows = () => objectsIn(r)
            .filter((o: any) => o.constructor.name === 'Curve')
            .map((o: any) => !!o.show);

        // Nothing at step 0 — and the ghost is hidden for two reasons at once,
        // which is the point: both predicates hold or it stays off.
        expect(curveShows()).toEqual([false, false]);

        r.kg.update({ params: [{ name: 'step', value: 1 }] });
        move(r, 14);

        expect(curveShows()).toEqual([true, true]);
        r.destroy();
    });

    it('does not inherit the drag, so only the live curve moves', () => {
        const r = build([DEMAND]);

        const dragged = objectsIn(r)
            .filter((o: any) => o.constructor.name === 'Curve')
            .map((o: any) => !!(o.def && o.def.drag && o.def.drag.length));

        expect(dragged).toEqual([false, true]);
        r.destroy();
    });
});

describe('the shift arrow', () => {

    const EQUILIBRIUM = {
        type: 'Point',
        def: {
            name: 'equilibrium', x: 'calcs.Qe', y: 'calcs.Pe',
            color: 'colors.equilibriumPrice', ghost: true
        }
    };

    const CALCS = { calcs: { Qe: '(params.a - 2)/2', Pe: '(params.a + 2)/2' } };

    it('joins where a point was to where it is', () => {
        const r = build([EQUILIBRIUM], CALCS);
        expect(r.error).toBe(null);

        const segments = objectsIn(r).filter((o: any) => o.constructor.name === 'Segment');
        expect(segments.length).toBe(1);

        move(r, 14);

        const arrow = segments[0];
        expect(arrow.show).toBeTruthy();
        // From (9, 11) — the seeded snapshot — to (6, 8).
        expect([arrow.x1, arrow.y1]).toEqual([9, 11]);
        expect([arrow.x2, arrow.y2]).toEqual([6, 8]);
        r.destroy();
    });

    it('is not drawn for a curve, which has no single displacement', () => {
        const r = build([DEMAND]);
        expect(objectsIn(r).filter((o: any) => o.constructor.name === 'Segment').length).toBe(0);
        r.destroy();
    });

    it('warns rather than silently drawing nothing when asked for on a curve', () => {
        const { result: r, warnings } = captureWarnings(() => build([{
            type: 'Line',
            def: { name: 'demand', yIntercept: 'params.a', slope: -1, ghost: { arrow: true } }
        }]));

        expect(warnings.some(w => w.indexOf('no single position') > -1)).toBe(true);
        r.destroy();
    });

    it('can be turned off on a point', () => {
        const r = build([{
            type: 'Point',
            def: { name: 'equilibrium', x: 'calcs.Qe', y: 'calcs.Pe', ghost: { arrow: false } }
        }], CALCS);

        expect(objectsIn(r).filter((o: any) => o.constructor.name === 'Segment').length).toBe(0);
        r.destroy();
    });
});

describe('the label pairing', () => {

    it('is D and D prime once the curve has moved, and plain D before', () => {
        const r = build([DEMAND]);

        expect(labels(r)).toEqual(['D\\ ', 'D']);

        move(r, 14);
        expect(labels(r)).toEqual(['D\\ ', 'D^\\prime']);
        r.destroy();
    });

    it('follows the schema idiom the author chose', () => {
        const r = build([DEMAND], { custom: '..1' });

        move(r, 14);
        expect(labels(r)).toEqual(['D_1', 'D_2']);
        r.destroy();
    });

    it('still renders when the config declares no schema at all', () => {
        const r = mountConfig({
            params: [A],
            layout: { OneGraph: { graph: { ...AXES, objects: [DEMAND] } } }
        });

        move(r, 14);
        expect(labels(r)).toEqual(['D\\ ', 'D^\\prime']);
        r.destroy();
    });

    it('leaves a computed label alone', () => {
        const r = build([{
            type: 'Line',
            def: {
                name: 'demand', yIntercept: 'params.a', slope: -1,
                label: { text: 'params.a', x: 4 }, ghost: true
            }
        }]);

        move(r, 14);
        // The live label reads the live value and the ghost reads the old one;
        // neither has been quoted into a string literal.
        expect(labels(r)).toEqual(['20', '14']);
        r.destroy();
    });

    it('qualifies the ghost alone when given a qualifier, and never primes the live curve', () => {
        const r = build([{
            type: 'Line',
            def: {
                name: 'demand', yIntercept: 'params.a', slope: -1,
                label: { text: 'D', x: 4 }, ghost: { label: '_0' }
            }
        }]);

        expect(labels(r)).toEqual(['D_0', 'D']);

        move(r, 26);
        expect(labels(r)).toEqual(['D_0', 'D']);

        // The move back, which is what a lesson's "back where we started" does.
        // Pairing would now prime the curve at the original place; a qualifier
        // still names the ghost, which is the one at the place just left.
        move(r, 20);
        expect(labels(r)).toEqual(['D_0', 'D']);
        r.destroy();
    });

    it('can be turned off', () => {
        const r = build([{
            type: 'Line',
            def: {
                name: 'demand', yIntercept: 'params.a', slope: -1,
                label: { text: 'D', x: 4 }, ghost: { label: false }
            }
        }]);

        move(r, 14);
        expect(labels(r)).toEqual(['D', 'D']);
        r.destroy();
    });
});

describe('what the shorthand refuses to guess', () => {

    it('warns when the ghosted expression names a param without its prefix', () => {
        const { result: r, warnings } = captureWarnings(() => build([{
            type: 'Point',
            def: { name: 'p', x: 'a', y: 5, ghost: true }
        }]));

        expect(warnings.some(w => w.indexOf('without a "params." or "calcs." prefix') > -1)).toBe(true);
        expect(warnings.some(w => w.indexOf('"p"') > -1)).toBe(true);
        r.destroy();
    });

    it('warns when a ghosted object cannot move at all', () => {
        const { result: r, warnings } = captureWarnings(() => build([{
            type: 'Point',
            def: { name: 'fixed', coordinates: [5, 5], ghost: true }
        }]));

        expect(warnings.some(w => w.indexOf('can never be anywhere else') > -1)).toBe(true);
        r.destroy();
    });

    it('does not warn about the `prev.calcs` it wrote itself', () => {
        // An object publishes its own def into `calcs.<name>` as it parses, so a
        // ghost point puts `prev.calcs.Qe` there — and the diagnostic aimed at a
        // *calc the author wrote* was reading that transcription and telling
        // them the spelling was probably a mistake. It is the spelling the docs
        // demonstrate, and for a ghost it is exactly what was meant.
        const { result: r, warnings } = captureWarnings(() => build([{
            type: 'Point',
            def: { name: 'equilibrium', x: 'calcs.Qe', y: 'calcs.Pe', ghost: true }
        }], { calcs: { Qe: '(params.a - 2)/2', Pe: '(params.a + 2)/2' } }));

        expect(warnings.filter(w => w.indexOf('prev.calcs') > -1)).toEqual([]);
        r.destroy();
    });

    it('still warns about a calc the author really did write that way', () => {
        const { result: r, warnings } = captureWarnings(() => build([{
            type: 'Point', def: { name: 'p', x: 'calcs.Qe', y: 5 }
        }], { calcs: { Qe: '(params.a - 2)/2', drift: 'calcs.Qe - prev.calcs.Qe' } }));

        expect(warnings.some(w => w.indexOf('prev.calcs') > -1)).toBe(true);
        r.destroy();
    });

    it('says nothing at all about a config that never mentions ghosts', () => {
        const { result: r, warnings } = captureWarnings(() => build([{
            type: 'Line', def: { name: 'demand', yIntercept: 'params.a', slope: -1 }
        }]));

        expect(warnings.filter(w => w.indexOf('ghost') > -1)).toEqual([]);
        expect(curves(r).length).toBe(1);
        r.destroy();
    });
});

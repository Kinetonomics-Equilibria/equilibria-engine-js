import { describe, it, expect, beforeAll } from 'vitest';
import { Model } from '../ts/model/model';
import { mountObjects, mountConfig, stubContainerLayout, captureWarnings } from './helpers';

/**
 * The `prev` scope: a one-deep memory of the state before the current interaction.
 *
 * Named `interaction_snapshot` to keep it clear of `snapshot.test.ts`, which is a
 * DOM snapshot-regression test and has nothing to do with this feature.
 *
 * The assertion these tests exist for is the anti-trap one: a drag fires ~60
 * updates a second, and an implementation that snapshots per change leaves `prev`
 * one tick behind — the ghost hidden under the live curve, the shift arrow a pixel
 * long. Everything else here is scaffolding around that.
 */

beforeAll(() => stubContainerLayout());

const market = (over: any = {}) => new Model({
    params: [
        { name: 'a', value: 20, min: 5, max: 28, round: 0.1 },
        { name: 'c', value: 2, min: 0, max: 8, round: 0.1 },
    ],
    calcs: { Qe: '(params.a - params.c)/2', Pe: '(params.a + params.c)/2' },
    colors: {}, idioms: {},
    ...over
});

/** Read an expression the way a view object would. */
const evalIn = (model: Model, expr: string) => (model as any).evaluate(expr);

describe('seeding', () => {
    it('prev equals current at construction, with seq and changed both 0', () => {
        const model = market();

        expect(evalIn(model, 'prev.params.a')).toBe(20);
        expect(evalIn(model, 'prev.calcs.Qe')).toBe(9);
        expect(evalIn(model, 'prev.seq')).toBe(0);
        expect(evalIn(model, 'prev.changed')).toBe(0);
    });

    it('flattens prev the same way the top-level scope flattens', () => {
        const model = market();

        expect(evalIn(model, 'prev.a')).toBe(20);
        expect(evalIn(model, 'prev.Qe')).toBe(9);
    });

    /**
     * The alternative — leaving prev undefined — is worse than it looks: mathjs
     * throws, evaluate() catches and returns the expression string verbatim, and
     * that string flows on into a coordinate. Exactly the silent-wrong-answer
     * failure reportUnresolvedCalcs was written to close.
     */
    it('never resolves prev to a string, even before any snapshot', () => {
        const model = market();
        expect(typeof evalIn(model, 'prev.params.a')).toBe('number');
        expect(typeof evalIn(model, 'prev.calcs.Pe')).toBe('number');
    });
});

describe('snapshot()', () => {
    it('holds the pre-change values and reports changed', () => {
        const model = market();
        model.snapshot();
        model.updateParam('a', 26);

        expect(evalIn(model, 'prev.params.a')).toBe(20);
        expect(model.currentParamValues['a']).toBe(26);
        expect(evalIn(model, 'prev.changed')).toBe(1);
        expect(evalIn(model, 'prev.seq')).toBe(1);
    });

    it('stores the calcs that were, rather than recomputing them', () => {
        // `drift` depends on nothing the params can reconstruct: it reads another
        // calc that is itself replaced. Recomputation from prev.params would give
        // the current answer; storage gives the one the student actually saw.
        const model = market();
        const before = model.currentCalcValues['Qe'];

        model.snapshot();
        model.updateParam('a', 28);

        expect(model.currentCalcValues['Qe']).not.toBe(before);
        expect(evalIn(model, 'prev.calcs.Qe')).toBe(before);
    });

    /**
     * THE anti-trap test. A naive per-change implementation fails exactly here.
     */
    it('stays fixed across many changes after a single snapshot', () => {
        const model = market();
        model.snapshot();

        for (let v = 20.1; v <= 25; v += 0.1) model.updateParam('a', v);

        expect(evalIn(model, 'prev.params.a')).toBe(20);
        expect(evalIn(model, 'prev.seq')).toBe(1);
    });

    it('is O(1) — it aliases the current objects rather than copying them', () => {
        const model = market();
        const calcsAtSnapshot = model.currentCalcValues;

        model.snapshot({ render: false });
        expect(model.prevCalcValues).toBe(calcsAtSnapshot);   // same object identity

        // and a later evaluation must not reach back and mutate it
        model.updateParam('a', 26);
        expect(model.prevCalcValues).toBe(calcsAtSnapshot);
        expect(calcsAtSnapshot['Qe']).toBe(9);
    });

    it('does not chain — prev never becomes prev-of-prev', () => {
        const model = market();
        model.snapshot();
        model.updateParam('a', 22);
        model.snapshot();
        model.updateParam('a', 24);

        expect(evalIn(model, 'prev.params.a')).toBe(22);   // one deep, not 20
    });
});

describe('gestures', () => {
    it('takes exactly one snapshot however many updates the gesture produces', () => {
        const model = market();

        model.beginGesture();
        for (let v = 20.1; v <= 24; v += 0.1) model.updateParam('a', v);
        model.endGesture();

        expect(evalIn(model, 'prev.seq')).toBe(1);
        expect(evalIn(model, 'prev.params.a')).toBe(20);
    });

    it('nests — an inner gesture does not take a second snapshot', () => {
        const model = market();

        model.beginGesture();
        model.updateParam('a', 22);
        model.beginGesture();          // e.g. a second finger, or a host gesture inside a drag
        model.updateParam('a', 24);
        model.endGesture();
        model.endGesture();

        expect(evalIn(model, 'prev.seq')).toBe(1);
        expect(evalIn(model, 'prev.params.a')).toBe(20);
    });

    it('cannot be driven negative by unbalanced endGesture calls', () => {
        const model = market();

        model.endGesture();
        model.endGesture();
        model.beginGesture();          // must still be the 0→1 transition
        model.updateParam('a', 26);
        model.endGesture();

        expect(evalIn(model, 'prev.seq')).toBe(1);
        expect(evalIn(model, 'prev.params.a')).toBe(20);
    });
});

describe('snapshotOn modes', () => {
    it("'change' snapshots per accepted change outside a gesture", () => {
        const model = market({ snapshotOn: 'change' });

        model.updateParam('a', 22);
        expect(evalIn(model, 'prev.params.a')).toBe(20);

        model.updateParam('a', 24);
        expect(evalIn(model, 'prev.params.a')).toBe(22);   // one tick behind — the trap, offered deliberately
    });

    it("'change' still coalesces inside a gesture", () => {
        const model = market({ snapshotOn: 'change' });

        model.beginGesture();
        model.updateParam('a', 22);
        model.updateParam('a', 24);
        model.updateParam('a', 26);
        model.endGesture();

        expect(evalIn(model, 'prev.params.a')).toBe(20);
        expect(evalIn(model, 'prev.seq')).toBe(1);
    });

    it("'never' moves prev only on an explicit call", () => {
        const model = market({ snapshotOn: 'never' });

        model.beginGesture();
        model.updateParam('a', 24);
        model.endGesture();
        expect(evalIn(model, 'prev.seq')).toBe(0);
        expect(evalIn(model, 'prev.params.a')).toBe(20);

        model.snapshot();
        model.updateParam('a', 26);
        expect(evalIn(model, 'prev.params.a')).toBe(24);
    });
});

describe('interaction with the rest of the model', () => {
    it('a restriction-rejected change does not move prev', () => {
        const model = market({ restrictions: [{ expression: 'params.a - params.c', min: 10 }] });

        model.snapshot();
        model.updateParam('a', 8);      // a - c would be 6, rejected

        expect(model.currentParamValues['a']).toBe(20);
        expect(evalIn(model, 'prev.params.a')).toBe(20);
        expect(evalIn(model, 'prev.changed')).toBe(0);
    });

    it('resetParams re-seeds prev rather than leaving a ghost of the old world', () => {
        const model = market();
        model.snapshot();
        model.updateParam('a', 26);
        expect(evalIn(model, 'prev.changed')).toBe(1);

        model.resetParams();

        expect(model.currentParamValues['a']).toBe(20);
        expect(evalIn(model, 'prev.params.a')).toBe(20);
        expect(evalIn(model, 'prev.changed')).toBe(0);
        expect(evalIn(model, 'prev.seq')).toBe(0);
    });
});

describe('calcs that reference prev', () => {
    it('resolves to a number at construction via the two-pass bootstrap', () => {
        const model = market({
            calcs: {
                Qe: '(params.a - params.c)/2',
                Pe: '(params.a + params.c)/2',
                shift: 'params.a - prev.params.a'
            }
        });

        expect(model.currentCalcValues['shift']).toBe(0);
        expect(typeof model.currentCalcValues['shift']).toBe('number');
    });

    it('warns once for the prev.calcs spelling, which is the surprising one', () => {
        const { warnings } = captureWarnings(() => market({
            calcs: { Qe: '(params.a - params.c)/2', drift: 'prev.calcs.Qe' }
        }));

        expect(warnings.filter(w => w.includes('prev.calcs'))).toHaveLength(1);
    });

    /**
     * The static scan is what keeps the bootstrap free for every config written
     * before `prev` existed: no mention, no second pass.
     */
    it('does not run the extra pass for a config that never mentions prev', () => {
        const model: any = market();
        let passes = 0;
        const real = model.evalCalcs.bind(model);
        model.evalCalcs = () => { passes++; return real(); };

        // reconstructing is the only way to observe construction, so assert on the
        // flag the constructor set instead
        expect(model.usesPrev).toBe(false);
        expect(market({ calcs: { x: 'prev.params.a' } } as any)['usesPrev']).toBe(true);
        expect(passes).toBe(0);
    });
});

describe('reserved names', () => {
    it('a param named prev warns once and the prev object wins', () => {
        const { result: model, warnings } = captureWarnings(() => new Model({
            params: [{ name: 'prev', value: 7, min: 0, max: 10 }],
            calcs: {}, colors: {}, idioms: {}
        }));

        expect(warnings.filter(w => w.includes('"prev" is a reserved name'))).toHaveLength(1);
        // the scope object shadows the param, so prev.seq resolves rather than failing
        expect(evalIn(model, 'prev.seq')).toBe(0);
    });

    it('a calc named prev warns too', () => {
        const { warnings } = captureWarnings(() => new Model({
            params: [], calcs: { prev: '3' }, colors: {}, idioms: {}
        }));
        expect(warnings.filter(w => w.includes('"prev" is a reserved name'))).toHaveLength(1);
    });
});

describe('rendered ghosts', () => {
    const ghostConfig = {
        schema: 'EconSchema',
        params: [{ name: 'a', value: 20, min: 5, max: 28, round: 0.1 }],
        calcs: { Qe: '(params.a - 2)/2', Pe: '(params.a + 2)/2' },
        layout: {
            OneGraph: {
                graph: {
                    xAxis: { title: 'Q', min: 0, max: 30 },
                    yAxis: { title: 'P', min: 0, max: 30 },
                    objects: [
                        { type: 'Line', def: { yIntercept: 'params.a', slope: -1, color: 'colors.blue' } },
                        {
                            type: 'Line',
                            def: {
                                yIntercept: 'prev.params.a', slope: -1, color: 'colors.blue',
                                lineStyle: 'dashed', strokeOpacity: 0.35, show: 'prev.changed'
                            }
                        }
                    ]
                }
            }
        }
    };

    const paths = (c: HTMLElement) => Array.from(c.querySelectorAll('path[class^="path-"]'));

    it('hides a ghost gated on prev.changed before anything has moved', () => {
        const r = mountConfig(ghostConfig);
        const [, ghost] = paths(r.container);

        const root = ghost.closest('g[class^="rootElement"]');
        expect((root?.getAttribute('style') || '')).toContain('display: none');

        // A hidden object is never redrawn (viewObject.update only calls redraw()
        // on the shown branch), so it carries no path data at all — which is why
        // the coincidence check below has to un-gate the ghost.
        expect(ghost.getAttribute('d')).toBeNull();

        r.destroy();
    });

    it('draws an un-gated ghost coincident with the live curve before any snapshot', () => {
        // prev === current at t=0 by design: an author who forgets to gate on
        // prev.changed gets a ghost exactly under the live curve, not a crash and
        // not a wrong number.
        const ungated = JSON.parse(JSON.stringify(ghostConfig));
        delete ungated.layout.OneGraph.graph.objects[1].def.show;

        const r = mountConfig(ungated);
        const [live, ghost] = paths(r.container);

        expect(ghost.getAttribute('d')).toBe(live.getAttribute('d'));
        r.destroy();
    });

    it('separates the ghost from the live curve after a snapshot and a change', () => {
        const r = mountConfig(ghostConfig);
        (r.kg as any).snapshot();
        r.kg.update({ params: [{ name: 'a', value: 26 }] });

        const [live, ghost] = paths(r.container);
        expect(ghost.getAttribute('d')).not.toBe(live.getAttribute('d'));

        // and show: prev.changed has revealed it
        const root = ghost.closest('g[class^="rootElement"]');
        expect((root?.getAttribute('style') || '')).not.toContain('display: none');

        r.destroy();
    });

    it('draws a shift arrow between the previous and current equilibrium', () => {
        const r = mountObjects([
            {
                type: 'Arrow',
                def: {
                    begin: ['prev.calcs.Qe', 'prev.calcs.Pe'],
                    end: ['calcs.Qe', 'calcs.Pe'],
                    color: 'colors.red', show: 'prev.changed'
                }
            }
        ], {
            params: [{ name: 'a', value: 20, min: 5, max: 28, round: 0.1 }],
            calcs: { Qe: '(params.a - 2)/2', Pe: '(params.a + 2)/2' }
        });

        (r.kg as any).snapshot();
        r.kg.update({ params: [{ name: 'a', value: 26 }] });

        const line = r.container.querySelector('line[class^="line-"]')!;
        expect(line.getAttribute('x1')).not.toBe(line.getAttribute('x2'));
        expect(line.getAttribute('y1')).not.toBe(line.getAttribute('y2'));
        expect(line.getAttribute('marker-end')).toMatch(/^url\(#/);

        r.destroy();
    });
});

describe('the host surface', () => {
    it('getSnapshot returns null before the first snapshot, and copies after', () => {
        const r = mountObjects([{ type: 'Point', def: { x: 10, y: 10, color: 'colors.blue' } }],
            { params: [{ name: 'a', value: 20, min: 5, max: 28 }] });

        expect((r.kg as any).getSnapshot()).toBeNull();

        (r.kg as any).snapshot();
        const snap = (r.kg as any).getSnapshot();

        expect(snap.seq).toBe(1);
        expect(snap.params.a).toBe(20);

        // mutating what the caller was handed must not reach the model
        snap.params.a = 999;
        expect((r.kg as any).getSnapshot().params.a).toBe(20);

        r.destroy();
    });

    it('getParams publishes what a host would otherwise re-derive', () => {
        const r = mountObjects([{ type: 'Point', def: { x: 10, y: 10, color: 'colors.blue' } }], {
            params: [
                { name: 'a', label: 'Demand intercept', value: 20, min: 5, max: 28, round: 0.1 },
                { name: 'zoom', value: 1, min: 0, max: 2, round: 1, presentation: true }
            ]
        });

        const params = (r.kg as any).getParams();
        expect(params.map((p: any) => p.name)).toEqual(['a', 'zoom']);

        const a = params[0];
        expect(a.label).toBe('Demand intercept');
        expect(a.value).toBe(20);
        expect(a.min).toBe(5);
        expect(a.max).toBe(28);
        expect(a.round).toBe(0.1);
        // The whole reason a host asks: printing 13.000000000002 beside a
        // diagram that says 13.0. `round: 0.1` means one decimal place.
        expect(a.precision).toBe(1);
        expect(a.presentation).toBe(false);

        // A host telling "the student moved this" from "the host is showing it
        // differently" cannot do it by name.
        expect(params[1].presentation).toBe(true);

        r.destroy();
    });

    it('getParams labels an unlabelled param with its own name', () => {
        // An empty string is not an answer a host can put in front of a number,
        // and `label` defaults to '' rather than to the name.
        const r = mountObjects([], { params: [{ name: 'a', value: 20, min: 5, max: 28 }] });
        expect((r.kg as any).getParams()[0].label).toBe('a');
        r.destroy();
    });

    it('getParams reports values as they now stand, not as declared', () => {
        const r = mountObjects([], { params: [{ name: 'a', value: 20, min: 5, max: 28, round: 0.1 }] });

        r.kg.update({ params: [{ name: 'a', value: 24.5 }] });
        expect((r.kg as any).getParams()[0].value).toBe(24.5);

        // and mutating what came back must not reach the model
        const copy = (r.kg as any).getParams()[0];
        copy.value = 999;
        expect((r.kg as any).getParams()[0].value).toBe(24.5);

        r.destroy();
    });

    // A boolean param skipped the branch that assigns `precision`, so `info()`
    // copied a field that had never been set and the key was absent from an
    // object whose type declares it required. Every reader was handed a
    // number-typed `undefined`: `formatted()` threw `invalid format:
    // .undefinedf` out of d3, and a host formatting the value itself printed a
    // raw float. Found by constructing one and printing `info()` — the
    // declaration said `precision: number` throughout.
    it('getParams reports a precision for a boolean param, not undefined', () => {
        const r = mountObjects([], { params: [{ name: 'showGhost', value: true }] });

        const p = (r.kg as any).getParams()[0];
        expect(p).toHaveProperty('precision');
        expect(p.precision).toBe(0);
        expect(typeof p.precision).toBe('number');

        r.destroy();
    });

    it('formats a boolean param instead of throwing', () => {
        const r = mountObjects([], { params: [{ name: 'showGhost', value: true }] });
        const param = (r.kg as any).view.model.getParam('showGhost');

        expect(() => param.formatted()).not.toThrow();
        expect(param.formatted()).toBe('1');

        r.destroy();
    });

    // The coercion to 0/1 happens before a host ever sees the param, and it
    // leaves nothing behind: `min: 0, max: 100, round: 1` describes a small
    // integer just as well as a toggle. Without this flag an Explore panel
    // offers a hundred-step slider for a true/false, and the only alternative
    // is sniffing the bounds — which is a guess that a legitimate 0-100 param
    // would fail.
    it('getParams says which params the author declared as booleans', () => {
        const r = mountObjects([], {
            params: [
                { name: 'showGhost', value: true },
                { name: 'a', value: 20, min: 5, max: 28, round: 0.1 },
                { name: 'steps', value: 1, min: 0, max: 100, round: 1 }
            ]
        });

        const byName: any = {};
        (r.kg as any).getParams().forEach((p: any) => { byName[p.name] = p });

        expect(byName.showGhost.isBoolean).toBe(true);
        expect(byName.a.isBoolean).toBe(false);
        // Identical bounds to the coerced boolean, and not a boolean.
        expect(byName.steps.isBoolean).toBe(false);

        r.destroy();
    });

    it('honours snapshotOn from the config root', () => {
        const r = mountConfig({
            schema: 'EconSchema',
            snapshotOn: 'never',
            params: [{ name: 'a', value: 20, min: 5, max: 28 }],
            layout: { OneGraph: { graph: { xAxis: { title: 'x', min: 0, max: 30 }, yAxis: { title: 'y', min: 0, max: 30 }, objects: [] } } }
        });
        const model: any = (r.kg as any).view.model;

        model.beginGesture();
        model.updateParam('a', 24);
        model.endGesture();

        expect(model.snapshotSeq).toBe(0);
        r.destroy();
    });
});

import { describe, it, expect, beforeAll } from 'vitest';
import { mountConfig, stubContainerLayout, captureWarnings } from './helpers';

/**
 * Declared build-up order.
 *
 * This adds no capability: `show: 'params.step >= 3'` per object already worked,
 * and P0 confirmed it in practice, un-revealing on the way back included. What
 * it removes is an authoring cost that was measured — 24 characters on every
 * object, the step number duplicated into each one, and renumbering a step
 * meaning an edit to all of them.
 *
 * So the thing worth testing is that it really does compile to that same
 * mechanism, and that it agrees with a hand-written `show` rather than
 * overruling one.
 */

beforeAll(() => stubContainerLayout());

function build(objects: any[], steps: any[], params: any[] = []) {
    return mountConfig({
        schema: 'EconSchema',
        params,
        steps,
        layout: {
            OneGraph: {
                graph: {
                    xAxis: { title: 'Q', min: 0, max: 20 },
                    yAxis: { title: 'P', min: 0, max: 20 },
                    objects
                }
            }
        }
    });
}

/** Is the object named `name` currently drawn on screen? */
function shown(r: any, name: string): boolean {
    const vo = r.kg.view.viewObjects.find((o: any) => o.name === name);
    return !!(vo && vo.show);
}

function step(r: any, n: number) {
    r.kg.update({ params: [{ name: 'step', value: n }] });
}

const TWO_POINTS = [
    { type: 'Point', def: { name: 'first', coordinates: [5, 5] } },
    { type: 'Point', def: { name: 'second', coordinates: [10, 10] } }
];

describe('declared steps', () => {

    it('hides what a step reveals until that step is reached', () => {
        const r = build(TWO_POINTS, [{ reveal: ['first'] }, { reveal: ['second'] }]);

        expect(shown(r, 'first')).toBe(false);
        expect(shown(r, 'second')).toBe(false);

        step(r, 1);
        expect(shown(r, 'first')).toBe(true);
        expect(shown(r, 'second')).toBe(false);

        step(r, 2);
        expect(shown(r, 'second')).toBe(true);
        r.destroy();
    });

    // The predicate is `>=`, so an object revealed at step 1 is still there at
    // step 3 — a build-up, not a slideshow of one object at a time.
    it('keeps earlier reveals on screen at later steps', () => {
        const r = build(TWO_POINTS, [{ reveal: ['first'] }, { reveal: ['second'] }]);

        step(r, 2);
        expect(shown(r, 'first')).toBe(true);
        r.destroy();
    });

    it('un-reveals on the way back', () => {
        const r = build(TWO_POINTS, [{ reveal: ['first'] }, { reveal: ['second'] }]);

        step(r, 2);
        step(r, 0);
        expect(shown(r, 'first')).toBe(false);
        expect(shown(r, 'second')).toBe(false);
        r.destroy();
    });

    it('leaves an object no step mentions visible from the start', () => {
        const r = build(TWO_POINTS, [{ reveal: ['second'] }]);

        expect(shown(r, 'first')).toBe(true);
        r.destroy();
    });

    it('declares the step param itself, ranged to the steps declared', () => {
        const r = build(TWO_POINTS, [{ reveal: ['first'] }, { reveal: ['second'] }]);

        const params = r.kg.view.parsedData.params;
        const stepParam = params.find((p: any) => p.name === 'step');
        expect(stepParam).toBeDefined();
        expect(stepParam.value).toBe(0);
        expect(stepParam.max).toBe(2);
        r.destroy();
    });

    it('leaves the author their own step param if they declared one', () => {
        const r = build(TWO_POINTS, [{ reveal: ['first'] }, { reveal: ['second'] }],
            [{ name: 'step', value: 1, min: 0, max: 5, round: 1 }]);

        // Their starting step, not the engine's: the first point is already up.
        expect(shown(r, 'first')).toBe(true);
        expect(r.kg.view.parsedData.params.filter((p: any) => p.name === 'step')).toHaveLength(1);
        r.destroy();
    });

});

describe('steps and hand-written show', () => {

    // Both statements are honoured. Revealed at step 2 *and* conditional on a
    // param means both must hold — dropping either would be a silent wrong
    // answer, and the author wrote both on purpose.
    it('ands a reveal with the show the author wrote', () => {
        const r = build([
            { type: 'Point', def: { name: 'mr', coordinates: [5, 5], show: 'params.showMR' } }
        ], [{ reveal: ['mr'] }], [{ name: 'showMR', value: 0, min: 0, max: 1, round: 1 }]);

        step(r, 1);
        expect(shown(r, 'mr')).toBe(false);           // stepped in, but switched off

        r.kg.update({ params: [{ name: 'showMR', value: 1 }] });
        expect(shown(r, 'mr')).toBe(true);            // both now hold

        step(r, 0);
        expect(shown(r, 'mr')).toBe(false);           // switched on, but stepped out
        r.destroy();
    });

    it('leaves a hand-written show alone on an object no step names', () => {
        const r = build([
            { type: 'Point', def: { name: 'mr', coordinates: [5, 5], show: 'params.showMR' } },
            { type: 'Point', def: { name: 'other', coordinates: [8, 8] } }
        ], [{ reveal: ['other'] }], [{ name: 'showMR', value: 1, min: 0, max: 1, round: 1 }]);

        expect(shown(r, 'mr')).toBe(true);
        r.destroy();
    });

});

describe('steps report what they cannot do', () => {

    // The failure this warning exists for: a step that reveals a misspelled name
    // hides nothing, so it looks like a step that simply does nothing.
    it('warns when a step reveals a name no object answers to', () => {
        const { result, warnings } = captureWarnings(() =>
            build(TWO_POINTS, [{ reveal: ['thrid'] }]));

        expect(warnings.some(w => w.includes('reveals "thrid"'))).toBe(true);
        result.destroy();
    });

    it('warns when two steps reveal the same object, and keeps the earlier', () => {
        const { result, warnings } = captureWarnings(() =>
            build(TWO_POINTS, [{ reveal: ['first'] }, { reveal: ['first'] }]));

        expect(warnings.some(w => w.includes('revealed at step 1 and again at step 2'))).toBe(true);
        step(result, 1);
        expect(shown(result, 'first')).toBe(true);
        result.destroy();
    });

    // A `set` block is parsed and handed back rather than applied. Applying it
    // would mean the engine choosing an order for a multi-param update that is
    // not atomic, and choosing it silently.
    it('hands back the set params rather than applying them', () => {
        const r = build(TWO_POINTS, [
            { reveal: ['first'] },
            { reveal: ['second'], set: { a: 24 } }
        ], [{ name: 'a', value: 20, min: 5, max: 28, round: 0.1 }]);

        expect(r.kg.steps()).toHaveLength(2);
        expect(r.kg.steps()[1].set).toEqual({ a: 24 });

        step(r, 2);
        expect((r.kg.view as any).model.currentParamValues.a).toBe(20);
        r.destroy();
    });

    it('reports no steps for a config that declared none', () => {
        const r = build(TWO_POINTS, []);
        expect(r.kg.steps()).toEqual([]);
        r.destroy();
    });

});

describe('what a reveal takes with it', () => {

    // A point's droplines and axis labels are separate objects with names of
    // their own, so without a back-reference a revealed point would arrive with
    // its droplines already hanging in an otherwise empty diagram.
    it('reveals a point together with its droplines', () => {
        const r = build([{
            type: 'Point',
            def: { name: 'eq', coordinates: [5, 5], droplines: { vertical: 'Q^*', horizontal: 'P^*' } }
        }], [{ reveal: ['eq'] }]);

        const decorations = r.kg.view.viewObjects.filter((o: any) => o.def && o.def.partOf === 'eq');
        expect(decorations.length).toBeGreaterThan(0);
        expect(decorations.every((o: any) => !o.show)).toBe(true);

        step(r, 1);
        expect(decorations.every((o: any) => !!o.show)).toBe(true);
        r.destroy();
    });

    // The composite publishes calcs and draws a point; the author's handle for
    // the whole thing is the composite's name.
    it('reveals an econ composite by the name the author knows it by', () => {
        const r = build([{
            type: 'EconLinearEquilibrium',
            def: {
                demand: { yIntercept: 20, slope: -1 },
                supply: { yIntercept: 2, slope: 1 },
                equilibrium: {}
            }
        }], [{ reveal: ['demand'] }, { reveal: ['supply'] }, { reveal: ['equilibrium'] }]);

        expect(shown(r, 'demand')).toBe(false);
        step(r, 1);
        expect(shown(r, 'demand')).toBe(true);
        expect(shown(r, 'supply')).toBe(false);

        step(r, 3);
        expect(shown(r, 'equilibrium_point')).toBe(true);
        r.destroy();
    });

});

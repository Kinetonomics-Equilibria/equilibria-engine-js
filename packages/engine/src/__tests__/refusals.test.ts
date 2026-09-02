import { describe, it, expect, beforeAll } from 'vitest';
import { Model } from '../ts/model/model';
import type { ParamBlockedEvent } from '../ts/model/model';
import { KG_EVENTS } from '../ts/constants';
import { mountConfig, stubContainerLayout, captureWarnings } from './helpers';

/**
 * Refusals that speak (P12).
 *
 * Two mechanisms stop a param moving and, from the student's side, they are the
 * same thing: the curve stops. Neither said anything at all before this.
 *
 * The assertion this file exists for is the coalescing one. Everything else is
 * whether a refusal is reported; that one is whether it is reported *once* — a
 * pointer dragged along a boundary produces one refusal per pointer move, and a
 * host wiring a sentence to each of them writes a strobe.
 */

beforeAll(() => stubContainerLayout());

/** A model plus a log of every refusal it announced. */
function market(over: any = {}) {
    const model = new Model({
        params: [
            { name: 'a', label: 'Demand intercept', value: 20, min: 12, max: 28, round: 0.1 },
            { name: 'c', value: 2, min: 0, max: 8, round: 0.1 },
        ],
        calcs: { Qe: '(params.a - params.c)/2' },
        colors: {}, idioms: {},
        ...over
    });
    const refusals: ParamBlockedEvent[] = [];
    model.onParamBlocked = (r) => refusals.push(r);
    return { model, refusals };
}

/** The restriction the study market cannot honestly declare: demand must clear supply. */
const TRADES = {
    name: 'market-trades',
    message: 'At these costs, supply sits above demand and nothing would trade.',
    expression: 'calcs.Qe',
    min: '1'
};

describe('a param bound', () => {
    it('reports the push past the end, along with the move it did allow', () => {
        const { model, refusals } = market();
        const changes: any[] = [];
        model.onParamChange = (c) => changes.push(c);

        model.updateParam('a', 32);

        // Both, in that order: the curve moved as far as it could *and* was
        // refused the rest. A host told only the first is told the curve moved.
        expect(model.currentParamValues['a']).toBe(28);
        expect(changes.length).toBe(1);
        expect(refusals.length).toBe(1);

        expect(refusals[0].reason).toBe('bounds');
        expect(refusals[0].limit).toBe('max');
        expect(refusals[0].requestedValue).toBe(32);
        expect(refusals[0].attemptedValue).toBe(28);
        expect(refusals[0].value).toBe(28);
        expect(refusals[0].restrictions).toEqual([]);
    });

    /**
     * The case that reported nothing whatsoever before. Once the param is at its
     * end, a further push does not change it, so `updateParam` returned early and
     * the student's continued drag reached no one.
     */
    it('reports a push that moves nothing at all, once it is already at the end', () => {
        const { model, refusals } = market();
        model.updateParam('a', 28);          // legal, lands exactly on the end
        expect(refusals.length).toBe(0);

        model.updateParam('a', 30);
        expect(refusals.length).toBe(1);
        expect(refusals[0].attemptedValue).toBe(28);
        expect(refusals[0].value).toBe(28);
    });

    it('carries the label and the range, so a host can write the sentence', () => {
        const { model, refusals } = market();
        model.updateParam('a', 40);

        expect(refusals[0].name).toBe('a');
        expect(refusals[0].label).toBe('Demand intercept');
        expect(refusals[0].min).toBe(12);
        expect(refusals[0].max).toBe(28);
    });

    it('names the other end when the drag goes the other way', () => {
        const { model, refusals } = market();
        model.updateParam('a', 4);

        expect(refusals[0].limit).toBe('min');
        expect(model.currentParamValues['a']).toBe(12);
    });

    /**
     * Rounding is not a refusal. Asking for 20.04 of a param that moves in tenths
     * is asking for 20.0, and reporting it would mean a refusal on almost every
     * drag tick — the noise this whole feature has to avoid being.
     */
    it('says nothing about rounding', () => {
        const { model, refusals } = market();
        model.updateParam('a', 20.04);

        expect(model.currentParamValues['a']).toBe(20);
        expect(refusals.length).toBe(0);
    });
});

describe('coalescing', () => {
    it('announces a boundary once however long the drag pushes against it', () => {
        const { model, refusals } = market();

        // What a pointer moving past the top of the range actually looks like:
        // a value per pointer move, every one of them out of range.
        [29, 30, 31, 32, 33].forEach(v => model.updateParam('a', v));

        expect(refusals.length).toBe(1);
        expect(model.currentParamValues['a']).toBe(28);
    });

    it('speaks again once the student has come back and pushed a second time', () => {
        const { model, refusals } = market();

        model.updateParam('a', 32);
        expect(refusals.length).toBe(1);

        model.updateParam('a', 24);        // an accepted, unclamped move
        model.updateParam('a', 32);

        expect(refusals.length).toBe(2);
    });

    it('keeps one param\'s refusal from silencing another\'s', () => {
        const { model, refusals } = market();

        model.updateParam('a', 32);
        model.updateParam('c', 12);

        expect(refusals.length).toBe(2);
        expect(refusals.map(r => r.name)).toEqual(['a', 'c']);
    });

    /**
     * The key is the cause, not the param. A drag that runs off one end of the
     * range and then off the other has been refused twice and should say so
     * twice, without the student having to pass through a legal value in between.
     */
    it('announces a different cause without waiting for an accepted move', () => {
        const { model, refusals } = market();

        model.updateParam('a', 40);        // off the top
        model.updateParam('a', 4);         // and straight off the bottom

        expect(refusals.length).toBe(2);
        expect(refusals.map(r => r.limit)).toEqual(['max', 'min']);
        expect(model.currentParamValues['a']).toBe(12);
    });

    it('forgets every standing refusal when the model is reset', () => {
        const { model, refusals } = market();

        model.updateParam('a', 32);
        model.resetParams();
        model.updateParam('a', 32);

        expect(refusals.length).toBe(2);
    });
});

describe('a restriction', () => {
    it('reports the rule that said no, with the author\'s own sentence', () => {
        // Qe >= 4, i.e. demand's intercept must clear supply's by 8.
        const { model, refusals } = market({ restrictions: [{ ...TRADES, min: '4' }] });

        model.updateParam('a', 12);         // Qe = (12 - 2)/2 = 5, legal
        expect(refusals.length).toBe(0);

        model.updateParam('c', 6);          // Qe = (12 - 6)/2 = 3, refused
        expect(model.currentParamValues['c']).toBe(2);
        expect(refusals.length).toBe(1);

        const refusal = refusals[0];
        expect(refusal.reason).toBe('restriction');
        expect(refusal.name).toBe('c');
        expect(refusal.value).toBe(2);
        expect(refusal.attemptedValue).toBe(6);
        expect(refusal.restrictions.length).toBe(1);
        expect(refusal.restrictions[0].name).toBe('market-trades');
        expect(refusal.restrictions[0].message).toBe(TRADES.message);
        expect(refusal.restrictions[0].expression).toBe('calcs.Qe');
    });

    /**
     * "How far out" is the difference between "not allowed" and "you'd need to
     * stay above 4" — and a bare boolean could say neither.
     */
    it('reports what the expression came to and what it had to clear', () => {
        const { model, refusals } = market({ restrictions: [{ ...TRADES, min: '4' }] });

        model.updateParam('a', 13);        // Qe = 5.5, legal
        model.updateParam('c', 7);         // Qe = 3, refused

        expect(refusals[0].restrictions[0].value).toBe(3);
        expect(refusals[0].restrictions[0].min).toBe(4);
        expect(refusals[0].restrictions[0].max).toBeUndefined();
    });

    it('reports every rule that objected, not merely the first', () => {
        // A market roomy enough for a small quantity and a high price at once,
        // which the study market's own bounds make unreachable.
        const model = new Model({
            params: [
                { name: 'a', value: 20, min: 0, max: 30, round: 0.1 },
                { name: 'c', value: 2, min: 0, max: 30, round: 0.1 },
            ],
            calcs: { Qe: '(params.a - params.c)/2', Pe: '(params.a + params.c)/2' },
            colors: {}, idioms: {},
            restrictions: [
                { name: 'trades', expression: 'calcs.Qe', min: '4' },
                { name: 'price-ceiling', expression: 'calcs.Pe', max: '12' }
            ]
        });
        const refusals: ParamBlockedEvent[] = [];
        model.onParamBlocked = (r) => refusals.push(r);

        model.updateParam('a', 16);        // Qe = 7, Pe = 9 — both fine
        model.updateParam('c', 12);        // Qe = 2 and Pe = 14 — both broken

        expect(refusals.length).toBe(1);
        expect(refusals[0].restrictions.map(r => r.name)).toEqual(['trades', 'price-ceiling']);
        expect(refusals[0].restrictions[0].min).toBe(4);
        expect(refusals[0].restrictions[1].max).toBe(12);
    });

    /**
     * A clamped request that is *also* refused reports the rule, because the rule
     * is the reason it went nowhere — but the payload still shows the clamp.
     */
    it('reports the rule rather than the clamp when both applied', () => {
        const { model, refusals } = market({ restrictions: [{ ...TRADES, min: '4' }] });

        model.updateParam('a', 12);        // Qe = 5, legal
        model.updateParam('c', 30);        // clamped to 8 → Qe = 2 → refused

        expect(refusals.length).toBe(1);
        expect(refusals[0].reason).toBe('restriction');
        expect(refusals[0].requestedValue).toBe(30);
        expect(refusals[0].attemptedValue).toBe(8);
        expect(refusals[0].value).toBe(2);
    });

    it('says nothing when the change is legal', () => {
        const { model, refusals } = market({ restrictions: [TRADES] });
        model.updateParam('a', 24);

        expect(model.currentParamValues['a']).toBe(24);
        expect(refusals.length).toBe(0);
    });
});

/**
 * The failure P0 found in a `show`, wearing the other costume.
 *
 * A typo in an expression reaches the model as one of two non-numbers: a name
 * mathjs cannot parse comes back from `Model.evaluate` as its own source
 * *string*, and a property that is simply missing off an object it can parse
 * comes back as `undefined`. In a `show` the first is truthy and the object is
 * permanently visible. In a restriction both compare `false` against every
 * bound, so the restriction refuses every change to every param, forever — one
 * keystroke, and the diagram seizes solid with nothing on screen or in the
 * console to say why.
 */
describe('a restriction that is not a rule', () => {
    it('still refuses, but says a missing name did not resolve', () => {
        const { warnings } = captureWarnings(() => {
            const { model, refusals } = market({
                restrictions: [{ name: 'typo', expression: 'calcs.Qee', min: '1' }]
            });

            model.updateParam('a', 24);

            expect(model.currentParamValues['a']).toBe(20);
            expect(refusals.length).toBe(1);
            expect(refusals[0].restrictions[0].unresolved).toBe('expression');
            // Reported, not disguised as a number the student failed to reach.
            expect(refusals[0].restrictions[0].value).toBeUndefined();
        });

        expect(warnings.join(' ')).toMatch(/Restriction "typo"/);
        expect(warnings.join(' ')).toMatch(/refuses every change/);
    });

    it('says the same of an expression that did not parse at all', () => {
        const { warnings } = captureWarnings(() => {
            const { model, refusals } = market({
                restrictions: [{ expression: 'params.aa - params.c', min: '1' }]
            });

            model.updateParam('a', 24);

            expect(model.currentParamValues['a']).toBe(20);
            expect(refusals[0].restrictions[0].unresolved).toBe('expression');
            // The whole trap in one assertion: the value is the source text.
            expect(refusals[0].restrictions[0].value).toBe('params.aa - params.c');
        });

        expect(warnings.join(' ')).toMatch(/did not resolve to a number/);
    });

    it('says the same of a bound that did not resolve', () => {
        const { warnings } = captureWarnings(() => {
            const { model, refusals } = market({
                restrictions: [{ expression: 'calcs.Qe', min: 'params.floorr' }]
            });
            model.updateParam('a', 24);
            expect(refusals[0].restrictions[0].unresolved).toBe('min');
        });

        expect(warnings.join(' ')).toMatch(/its min "params.floorr" did not resolve/);
    });

    it('warns once rather than on every drag tick', () => {
        const { warnings } = captureWarnings(() => {
            const { model } = market({ restrictions: [{ expression: 'calcs.Qee', min: '1' }] });
            [21, 22, 23, 24, 25].forEach(v => model.updateParam('a', v));
        });

        expect(warnings.filter(w => /did not resolve/.test(w)).length).toBe(1);
    });
});

/**
 * The other half of correction 4: a restriction that permits everything.
 *
 * `docs/schema/02` has always described the engine as honouring "mathematical
 * properties defined in the `expression` operators", which is a boolean
 * expression, and it never did — a restriction with no bounds narrowed nothing.
 */
describe('a bound-less restriction', () => {
    it('reads its expression as the condition the docs always described', () => {
        const { model, refusals } = market({
            restrictions: [{ name: 'trades', expression: 'calcs.Qe > 4' }]
        });

        model.updateParam('a', 24);        // Qe = 11 → true → allowed
        expect(model.currentParamValues['a']).toBe(24);

        model.updateParam('c', 8);         // Qe = 8 → true → allowed
        model.updateParam('a', 12);        // Qe = 2 → false → refused
        expect(model.currentParamValues['a']).toBe(24);
        expect(refusals.length).toBe(1);
        expect(refusals[0].restrictions[0].name).toBe('trades');
    });

    it('warns when it is neither a condition nor bounded, and permits everything', () => {
        const { warnings } = captureWarnings(() => {
            const { model } = market({ restrictions: [{ expression: 'calcs.Qe' }] });
            model.updateParam('a', 24);
            expect(model.currentParamValues['a']).toBe(24);
        });

        expect(warnings.join(' ')).toMatch(/permits everything/);
    });
});

describe('the event', () => {
    /** Matching `reportParamChange`: an engine with no host attached pays nothing. */
    it('is not emitted when nothing is listening', () => {
        const r = mountConfig({
            schema: 'EconSchema',
            params: [{ name: 'a', value: 20, min: 12, max: 28, round: 0.1 }],
            layout: {
                OneGraph: {
                    graph: {
                        xAxis: { title: 'x', min: 0, max: 30 },
                        yAxis: { title: 'y', min: 0, max: 30 },
                        objects: [{ type: 'Line', def: { slope: -1, yIntercept: 'params.a', color: 'colors.blue' } }]
                    }
                }
            }
        });

        // No listener: the seam is installed but returns before emitting.
        expect(() => r.kg.update({ params: [{ name: 'a', value: 40 }] })).not.toThrow();

        const seen: ParamBlockedEvent[] = [];
        r.kg.on(KG_EVENTS.PARAM_BLOCKED, (e: any) => seen.push(e));

        // A fresh cause, since the first push already set the standing one.
        r.kg.update({ params: [{ name: 'a', value: 20 }] });
        r.kg.update({ params: [{ name: 'a', value: 40 }] });

        expect(seen.length).toBe(1);
        expect(seen[0].name).toBe('a');
        expect(seen[0].reason).toBe('bounds');
        r.destroy();
    });

    it('reaches a host through kg.update, which is how an app moves a param', () => {
        const r = mountConfig({
            schema: 'EconSchema',
            params: [
                { name: 'a', value: 20, min: 12, max: 28, round: 0.1 },
                { name: 'c', value: 2, min: 0, max: 8, round: 0.1 }
            ],
            calcs: { Qe: '(params.a - params.c)/2' },
            restrictions: [{ ...TRADES, min: '4' }],
            layout: {
                OneGraph: {
                    graph: {
                        xAxis: { title: 'x', min: 0, max: 30 },
                        yAxis: { title: 'y', min: 0, max: 30 },
                        objects: [{ type: 'Line', def: { slope: -1, yIntercept: 'params.a', color: 'colors.blue' } }]
                    }
                }
            }
        });

        const seen: ParamBlockedEvent[] = [];
        r.kg.on(KG_EVENTS.PARAM_BLOCKED, (e: any) => seen.push(e));

        r.kg.update({ params: [{ name: 'a', value: 12 }] });   // Qe = 5, legal
        r.kg.update({ params: [{ name: 'c', value: 6 }] });    // Qe = 3, refused

        expect(seen.length).toBe(1);
        expect(seen[0].reason).toBe('restriction');
        expect(seen[0].restrictions[0].message).toBe(TRADES.message);
        r.destroy();
    });
});

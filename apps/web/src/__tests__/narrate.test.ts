import { describe, it, expect } from 'vitest';
import type { AffectedObject } from 'equilibria-engine-js';
import { CALC_PRECISION, formatValue, narrate, toSentence, undoParams } from '../narration/narrate';
import type { NarratedParam, NarrateInput, Snapshot } from '../narration/narrate';
import { phraseMechanism, phraseMovement } from '../narration/phrasebook';

/**
 * The narration core, as arithmetic.
 *
 * Every assertion here is about a *value* — which clauses exist, and what
 * numbers they carry — rather than about rendered markup. That is deliberate
 * and it is the habit NOTES.md blames every wrong-answer defect on the absence
 * of: a strip that renders is not a strip that says something true.
 */

const PARAMS: NarratedParam[] = [
    { name: 'a', label: 'a', precision: 1 },
    { name: 'c', label: 'c', precision: 1 }
];

const CALCS = [
    { name: 'Pe', label: 'P*', unit: '$' },
    { name: 'Qe', label: 'Q*' }
];

/** The study screen's market: demand P = a - Q, supply P = c + Q. */
const market = (a: number, c = 2): Snapshot => ({
    params: { a, c },
    calcs: { Pe: (a + c) / 2, Qe: (a - c) / 2 }
});

const line = (over: Partial<NarrateInput> = {}) => narrate({
    before: market(20),
    after: market(24),
    params: PARAMS,
    calcs: CALCS,
    ...over
});

const shiftUp: AffectedObject = {
    name: 'demand_market', title: 'demand',
    movement: { kind: 'shift', dx: 0, dy: 4, axis: 'y', sign: 1 }
};

const equilibriumMoved: AffectedObject = {
    name: 'equilibrium_market', title: 'equilibrium',
    movement: { kind: 'move', dx: 2, dy: 2, axis: 'both', sign: 0 }
};

describe('the cause clause', () => {
    it('names the param that moved, at the precision the engine declares', () => {
        const causes = line().causes;

        expect(causes).toHaveLength(1);
        expect(causes[0]).toMatchObject({ name: 'a', label: 'a', from: '20.0', to: '24.0', direction: 'up' });
    });

    it('formats from precision rather than printing the float', () => {
        // `round: 0.1` gives precision 1. The obvious first bug in a strip like
        // this is 13.000000000000002 beside a diagram that says 13.0.
        const causes = narrate({
            before: { params: { a: 20 }, calcs: {} },
            after: { params: { a: 0.1 + 0.2 }, calcs: {} },
            params: [{ name: 'a', label: 'a', precision: 1 }],
            calcs: []
        }).causes;

        expect(causes[0].to).toBe('0.3');
    });

    it('reports every param that moved, and no param that did not', () => {
        const causes = line({ after: { params: { a: 24, c: 4 }, calcs: market(24, 4).calcs } }).causes;
        expect(causes.map(c => c.name)).toEqual(['a', 'c']);

        expect(line({ after: market(24) }).causes.map(c => c.name)).toEqual(['a']);
    });

    it('never talks about a param it was not given', () => {
        // The stage promotes a panel by moving a param. A strip that narrated
        // presentation params would announce `stageFocus 0.0 → 1.0` when a
        // student clicked a thumbnail.
        const result = narrate({
            before: { params: { a: 20, stageFocus: 0 }, calcs: { Pe: 11 } },
            after: { params: { a: 20, stageFocus: 1 }, calcs: { Pe: 11 } },
            params: PARAMS,
            calcs: CALCS
        });

        expect(result.kind).toBe('rest');
    });
});

describe('the effects clause', () => {
    it('lists every changed calc and omits the unchanged ones', () => {
        // c is fixed, so both P* and Q* move with a.
        expect(line().effects.map(e => e.name)).toEqual(['Pe', 'Qe']);

        // Raising a and c together by the same amount moves P* and leaves Q*.
        const both = narrate({
            before: market(20, 2), after: market(22, 4),
            params: PARAMS, calcs: CALCS
        });
        expect(both.effects.map(e => e.name)).toEqual(['Pe']);
    });

    it('carries the unit, so the strip and a panel chip read alike', () => {
        expect(line().effects[0]).toMatchObject({ label: 'P*', unit: '$', from: '11.0', to: '13.0' });
        expect(line().effects[1].unit).toBe('');
    });

    it('omits a calc that moved by less than it shows', () => {
        // "11.0 → 11.0" claims an event and then fails to show one.
        const result = narrate({
            before: { params: { a: 20 }, calcs: { Pe: 11 } },
            after: { params: { a: 20.1 }, calcs: { Pe: 11.0001 } },
            params: PARAMS, calcs: CALCS
        });

        expect(result.causes.map(c => c.name)).toEqual(['a']);
        expect(result.effects).toEqual([]);
    });

    it('omits a calc that did not resolve to a number', () => {
        // `Model.evaluate` hands back the expression *as a string* when mathjs
        // cannot parse it, and a non-empty string is truthy — the trap the plans
        // README opens with. A strip must not print one as a value.
        const result = narrate({
            before: { params: { a: 20 }, calcs: { Pe: 11, Qe: 9 } },
            after: { params: { a: 24 }, calcs: { Pe: 'params.aa - 2', Qe: 11 } },
            params: PARAMS, calcs: CALCS
        });

        expect(result.effects.map(e => e.name)).toEqual(['Qe']);
    });

    it('points "why?" at the first effect the app declared', () => {
        expect(line().whyTarget).toBe('Pe');
        expect(narrate({ before: market(20), after: market(20), params: PARAMS, calcs: CALCS }).whyTarget)
            .toBeNull();
    });
});

describe('the rest state', () => {
    it('is what no change produces, rather than 20.0 → 20.0', () => {
        const result = narrate({ before: market(20), after: market(20), params: PARAMS, calcs: CALCS });

        expect(result.kind).toBe('rest');
        expect(result.causes).toEqual([]);
        expect(result.effects).toEqual([]);
    });

    it('is what an engine with no snapshot produces', () => {
        // `getSnapshot()` is null until the first interaction opens a gesture,
        // so its absence *is* the rest state — the app does not have to track
        // "has the student done anything" a second time.
        const result = narrate({ before: null, after: market(24), params: PARAMS, calcs: CALCS });
        expect(result.kind).toBe('rest');
    });
});

describe('mid-gesture', () => {
    it('shows values without the arrow form', () => {
        const result = line({ live: true });

        expect(result.kind).toBe('live');
        expect(result.causes[0]).toMatchObject({ name: 'a', to: '24.0' });
        expect(result.causes[0].from).toBeUndefined();
        expect(result.effects.map(e => e.to)).toEqual(['13.0', '11.0']);
        expect(result.effects.every(e => e.from === undefined)).toBe(true);
    });

    it('says nothing about mechanism, and offers nothing to explain', () => {
        // A middle clause mid-drag would be rewritten sixty times a second, and
        // a "why?" would open an explainer on a number about to change.
        const result = line({ live: true, affected: [shiftUp] });
        expect(result.mechanism).toBeNull();
        expect(result.whyTarget).toBeNull();
    });

    it('is never announced', () => {
        expect(toSentence(line({ live: true }))).toBe('');
        expect(toSentence(narrate({ before: null, after: market(20), params: PARAMS, calcs: CALCS }))).toBe('');
    });
});

describe('the middle clause', () => {
    it('is omitted rather than guessed when the engine reported nothing', () => {
        expect(line().mechanism).toBeNull();
        expect(line({ affected: [] }).mechanism).toBeNull();
    });

    it('names what the engine said moved', () => {
        expect(line({ affected: [shiftUp] }).mechanism).toBe('demand shifts up');
    });

    it('says one object once, however many panels drew it', () => {
        // A stage draws the same market three times, so the engine reports the
        // same demand curve three times. They are one thing.
        expect(phraseMechanism([shiftUp, shiftUp, shiftUp])).toBe('demand shifts up');
    });

    it('prefers the curve that shifted over the point that moved', () => {
        // The equilibrium's coordinates *are* the effects clause, so naming its
        // movement as the mechanism says the same thing twice and explains
        // nothing. The curve is what the student touched.
        expect(phraseMechanism([shiftUp, equilibriumMoved])).toBe('demand shifts up');
    });

    it('falls back to a point when nothing shifted', () => {
        expect(phraseMechanism([equilibriumMoved])).toBe('equilibrium moves up and to the right');
    });

    it('names two objects, and gives up on more', () => {
        const supply: AffectedObject = {
            name: 'supply_market', title: 'supply',
            movement: { kind: 'shift', dx: 0, dy: -1, axis: 'y', sign: -1 }
        };
        const third: AffectedObject = {
            name: 'mc', title: 'marginal cost',
            movement: { kind: 'shift', dx: 1, dy: 0, axis: 'x', sign: 1 }
        };

        expect(phraseMechanism([shiftUp, supply])).toBe('demand shifts up and supply shifts down');
        expect(phraseMechanism([shiftUp, supply, third])).toBeNull();
    });

    it('says nothing about an object two panels disagree about', () => {
        const contradiction: AffectedObject = {
            name: 'demand_surplus', title: 'demand',
            movement: { kind: 'shift', dx: 0, dy: -4, axis: 'y', sign: -1 }
        };
        expect(phraseMechanism([shiftUp, contradiction])).toBeNull();
    });
});

describe('the phrasebook', () => {
    it('turns a descriptor into a phrase, one direction at a time', () => {
        expect(phraseMovement({ kind: 'shift', dx: 1, dy: 0, axis: 'x', sign: 1 })).toBe('shifts to the right');
        expect(phraseMovement({ kind: 'shift', dx: -1, dy: 0, axis: 'x', sign: -1 })).toBe('shifts to the left');
        expect(phraseMovement({ kind: 'shift', dx: 0, dy: 1, axis: 'y', sign: 1 })).toBe('shifts up');
        expect(phraseMovement({ kind: 'shift', dx: 0, dy: -1, axis: 'y', sign: -1 })).toBe('shifts down');
    });

    it('composes both axes when the engine declines to choose one', () => {
        expect(phraseMovement({ kind: 'move', dx: 2, dy: 2, axis: 'both', sign: 0 }))
            .toBe('moves up and to the right');
        expect(phraseMovement({ kind: 'move', dx: -2, dy: 2, axis: 'both', sign: 0 }))
            .toBe('moves up and to the left');
    });

    it('says curves shift and points move', () => {
        expect(phraseMovement({ kind: 'shift', dx: 0, dy: 1, axis: 'y', sign: 1 })).toMatch(/^shifts/);
        expect(phraseMovement({ kind: 'move', dx: 0, dy: 1, axis: 'y', sign: 1 })).toMatch(/^moves/);
    });

    it('phrases a rotation from steeper, and omits it when the engine could not tell', () => {
        expect(phraseMovement({ kind: 'rotate', dx: 1, dy: 1, axis: 'both', sign: 0, steeper: true }))
            .toBe('gets steeper');
        expect(phraseMovement({ kind: 'rotate', dx: 1, dy: 1, axis: 'both', sign: 0, steeper: false }))
            .toBe('gets flatter');
        expect(phraseMovement({ kind: 'rotate', dx: 1, dy: 1, axis: 'both', sign: 0 })).toBeNull();
    });

    it('omits rather than invents when there is no direction to name', () => {
        expect(phraseMovement({ kind: 'shift', dx: 0, dy: 0, axis: 'x', sign: 0 })).toBeNull();
    });
});

describe('the announcement', () => {
    it('is the whole chain as one utterance', () => {
        expect(toSentence(line({ affected: [shiftUp] })))
            .toBe('You changed a from 20.0 to 24.0; demand shifts up; P* from $11.0 to $13.0, Q* from 9.0 to 11.0.');
    });

    it('leaves out a clause it does not have, rather than a gap where one goes', () => {
        expect(toSentence(line()))
            .toBe('You changed a from 20.0 to 24.0; P* from $11.0 to $13.0, Q* from 9.0 to 11.0.');
    });
});

describe('undo', () => {
    it('offers the params the snapshot held, and only those', () => {
        const before = market(20);
        const result = narrate({ before, after: market(24), params: PARAMS, calcs: CALCS });

        expect(undoParams(result, before)).toEqual([{ name: 'a', value: 20 }]);
    });

    it('offers nothing at rest, so the control has nothing to exist for', () => {
        const before = market(20);
        expect(undoParams(narrate({ before, after: before, params: PARAMS, calcs: CALCS }), before)).toEqual([]);
        expect(undoParams(narrate({ before, after: market(24), params: PARAMS, calcs: CALCS }), null)).toEqual([]);
    });

    it('offers nothing mid-gesture', () => {
        // Undoing halfway through a drag would fight the pointer for the curve.
        const before = market(20);
        const live = narrate({ before, after: market(24), params: PARAMS, calcs: CALCS, live: true });
        expect(undoParams(live, before)).toEqual([]);
    });
});

describe('formatValue', () => {
    it('is the one formatter, so two places cannot print one quantity differently', () => {
        expect(formatValue(40.5, CALC_PRECISION)).toBe('40.5');
        expect(formatValue(99, CALC_PRECISION)).toBe('99.0');
        expect(formatValue(13.000000000000002, 1)).toBe('13.0');
    });

    it('does not put a minus in front of a zero', () => {
        // A delta of -0.04 rounds to zero, and "-0.0" reads as a direction that
        // is not there.
        expect(formatValue(-0.04, 1)).toBe('0.0');
        expect(formatValue(-0.06, 1)).toBe('-0.1');
    });
});

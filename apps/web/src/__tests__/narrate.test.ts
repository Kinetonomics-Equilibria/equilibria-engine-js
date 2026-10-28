import { describe, it, expect } from 'vitest';
import type { AffectedObject } from 'equilibria-engine-js';
import {
    CALC_PRECISION, REST, announcement, calcPrecision, curveColor, formatValue, leaveOut, narrate, toSentence,
    undoParams
} from '../narration/narrate';
import type { NarratedCalc, NarratedParam, NarrateInput, Snapshot } from '../narration/narrate';
import { phraseMechanism, phraseMovement, phraseMovements, phraseRefusal } from '../narration/phrasebook';
import type { ParamBlockedEvent } from 'equilibria-engine-js';

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

    // The study screen declares money to the cent; a quantity it leaves at the
    // default. Both in one chain, because the point is that they differ.
    it('prints each calc at its own precision, and the default where it names none', () => {
        const effects = line({
            calcs: [{ name: 'Pe', label: 'P*', unit: '$', precision: 2 }, { name: 'Qe', label: 'Q*' }]
        }).effects;

        expect(effects[0]).toMatchObject({ from: '11.00', to: '13.00' });
        expect(effects[1]).toMatchObject({ from: '9.0', to: '11.0' });
    });

    it('counts a change at the precision it is printed at', () => {
        // A twentieth of a dollar is invisible at one decimal and is a real
        // move at two — so whether it is an event depends on the calc.
        const nudge = {
            before: { params: { a: 20 }, calcs: { Pe: 11 } },
            after: { params: { a: 20.1 }, calcs: { Pe: 11.04 } },
            params: PARAMS
        };

        expect(narrate({ ...nudge, calcs: CALCS }).effects).toEqual([]);
        expect(narrate({ ...nudge, calcs: [{ name: 'Pe', label: 'P*', unit: '$', precision: 2 }] }).effects)
            .toMatchObject([{ from: '11.00', to: '11.04' }]);
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

/**
 * A panel the lesson has not brought in yet: its number is left out of the
 * chain, as the engine leaves its curves out, so the chain never names a
 * picture the student cannot see.
 */
describe('what the stage is not drawing', () => {
    it('leaves out the effects on calcs it names, and keeps the rest', () => {
        const result = leaveOut(line(), ['Pe']);
        expect(result.causes.map(c => c.name)).toEqual(['a']);
        expect(result.effects.map(c => c.name)).toEqual(['Qe']);
    });

    it('sends "why?" to the first effect left', () => {
        expect(line().whyTarget).toBe('Pe');
        expect(leaveOut(line(), ['Pe']).whyTarget).toBe('Qe');
        expect(leaveOut(line(), ['Pe', 'Qe']).whyTarget).toBeNull();
    });

    it('keeps no "why?" mid-gesture, where there was none', () => {
        expect(leaveOut(line({ live: true }), ['Pe']).whyTarget).toBeNull();
    });

    it('hands back the same line where nothing is left out', () => {
        const same = line();
        expect(leaveOut(same, [])).toBe(same);
        expect(leaveOut(same, ['nothing'])).toBe(same);
    });

    it('is at rest where nothing it can show moved', () => {
        const effectsOnly = narrate({
            before: market(20), after: market(24), params: [], calcs: CALCS.slice(0, 1)
        });
        expect(effectsOnly.kind).toBe('settled');
        expect(leaveOut(effectsOnly, ['Pe'])).toBe(REST);
    });

    it('keeps a cause whose effects are all out of sight', () => {
        const result = leaveOut(line(), ['Pe', 'Qe']);
        expect(result.kind).toBe('settled');
        expect(result.causes).toHaveLength(1);
        expect(result.effects).toEqual([]);
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

    // A card lists the moved objects a line at a time; the strip joins them.
    // One list, read two ways, so the two cannot name different movements.
    it('is also a list of what moved, one object at a time', () => {
        const supply: AffectedObject = {
            name: 'supply_market', title: 'supply',
            movement: { kind: 'shift', dx: 0, dy: -1, axis: 'y', sign: -1 }
        };
        const result = line({ affected: [shiftUp, supply] });

        expect(result.movements).toEqual(['demand shifts up', 'supply shifts down']);
        expect(result.mechanism).toBe(result.movements.join(' and '));
        expect(phraseMovements([shiftUp, shiftUp])).toEqual(['demand shifts up']);
    });

    it('lists nothing where it would say nothing', () => {
        expect(line().movements).toEqual([]);
        expect(line({ affected: [shiftUp], live: true }).movements).toEqual([]);
        expect(phraseMovements([])).toEqual([]);
    });
});

/**
 * What a move means, in the lesson's words: "The price rises", not "P* ▲".
 *
 * Words are the lesson's to give and optional everywhere, so each of these is
 * also a claim about what happens without them — the label, as before.
 */
describe('the words', () => {
    const WORDED: NarratedParam[] = [
        { name: 'a', label: 'a', precision: 1, rise: 'Demand increases', fall: 'Demand decreases' },
        { name: 'c', label: 'c', precision: 1 }
    ];
    const WORDED_CALCS: NarratedCalc[] = [
        { name: 'Pe', label: 'P*', unit: '$', rise: 'The price rises', fall: 'The price falls' },
        { name: 'Qe', label: 'Q*' }
    ];
    const worded = (over: Partial<NarrateInput> = {}) =>
        line({ params: WORDED, calcs: WORDED_CALCS, ...over });

    it('says what a move means, whichever way it went', () => {
        expect(worded().causes[0].words).toBe('Demand increases');
        expect(worded().effects[0].words).toBe('The price rises');

        const down = worded({ after: market(16) });
        expect(down.causes[0].words).toBe('Demand decreases');
        expect(down.effects[0].words).toBe('The price falls');
    });

    it('gives a clause no words where the lesson has none', () => {
        expect(worded().effects[1].name).toBe('Qe');
        expect(worded().effects[1]).not.toHaveProperty('words');
    });

    it('has no words mid-gesture, where a reading has no direction to mean', () => {
        const live = worded({ live: true });
        expect(live.causes[0]).not.toHaveProperty('words');
        expect(live.effects[0]).not.toHaveProperty('words');
    });

    it('is said as what it means, and a clause without words by its name', () => {
        expect(toSentence(worded({ affected: [shiftUp] }))).toBe(
            'Demand increases from 20.0 to 24.0; demand shifts up; ' +
            'the price rises from $11.0 to $13.0, Q* from 9.0 to 11.0.'
        );
    });

    // "You changed" can only be followed by names: "You changed demand
    // increases" is not a sentence. So one cause without words names them all.
    it('names every cause when any of them has no words', () => {
        const both = worded({ after: { params: { a: 24, c: 4 }, calcs: market(24, 4).calcs } });
        expect(toSentence(both)).toMatch(/^You changed a from 20\.0 to 24\.0, c from 2\.0 to 4\.0; /);
    });

    it('keeps an acronym\'s capitals inside a sentence', () => {
        const fx = narrate({
            before: { params: { demand: 50 }, calcs: { rate: 0.65 } },
            after: { params: { demand: 60 }, calcs: { rate: 0.7 } },
            params: [{ name: 'demand', label: 'Demand for A$', precision: 0, rise: 'Demand for A$ increases' }],
            calcs: [{ name: 'rate', label: 'A$1 =', unit: 'US$', precision: 2, rise: 'A$ up' }]
        });
        expect(toSentence(fx)).toBe('Demand for A$ increases from 50 to 60; A$ up from US$0.65 to US$0.70.');
    });
});

/**
 * Which colour a cause is marked in: its curve's, where the lesson names one.
 *
 * A colour says which curve, not which way, so it is the same whichever way
 * the param went and whether or not the gesture is over — a marker that was
 * grey mid-drag and turned blue on release would be news about nothing.
 */
describe('the curve colour', () => {
    const COLORED: NarratedParam[] = [
        { name: 'a', label: 'a', precision: 1, color: '#1f77b4' },
        { name: 'c', label: 'c', precision: 1, color: '#ff7f0e' }
    ];
    const both = { after: { params: { a: 24, c: 4 }, calcs: market(24, 4).calcs } };

    it('marks a cause in its param\'s colour, whichever way it went, mid-gesture too', () => {
        expect(line({ params: COLORED }).causes[0].color).toBe('#1f77b4');
        expect(line({ params: COLORED, after: market(16) }).causes[0].color).toBe('#1f77b4');
        expect(line({ params: COLORED, live: true }).causes[0].color).toBe('#1f77b4');
    });

    it('gives a cause no colour where the lesson names none, and an effect none at all', () => {
        expect(line().causes[0]).not.toHaveProperty('color');
        expect(line({ params: COLORED }).effects.some(e => 'color' in e)).toBe(false);
    });

    it('is the chain\'s colour where every cause has the same one', () => {
        expect(curveColor(line({ params: COLORED }))).toBe('#1f77b4');
        const blues = COLORED.map(p => ({ ...p, color: '#1f77b4' }));
        expect(curveColor(line({ params: blues, ...both }))).toBe('#1f77b4');
    });

    // One marker cannot be both colours, and either would tie a cause to the
    // other's curve.
    it('is no colour where the causes disagree, or one of them has none', () => {
        expect(curveColor(line({ params: COLORED, ...both }))).toBeNull();
        expect(curveColor(line({ params: [COLORED[0], PARAMS[1]], ...both }))).toBeNull();
        expect(curveColor(line())).toBeNull();
    });

    it('is no colour at rest, where there is nothing to mark', () => {
        expect(curveColor(narrate({ before: null, after: market(20), params: COLORED, calcs: CALCS }))).toBeNull();
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

    // The strip and the card announce through this, so either can stand in for
    // the other at any width and a screen reader hears the same thing.
    it('puts a refusal first, and keeps the chain after it', () => {
        const chain = toSentence(line());
        expect(announcement(line(), 'At these costs nothing would trade.')).toBe('At these costs nothing would trade. ' + chain);
        expect(announcement(line())).toBe(chain);
        expect(announcement(narrate({ before: null, after: market(20), params: PARAMS, calcs: CALCS }), 'Stopped.'))
            .toBe('Stopped.');
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

describe('calcPrecision', () => {
    it('is the calc\'s own where it declares one, and the default where it does not', () => {
        expect(calcPrecision({ name: 'Pe', label: 'P*', unit: '$', precision: 2 })).toBe(2);
        expect(calcPrecision({ name: 'Qe', label: 'Q*' })).toBe(CALC_PRECISION);
        expect(calcPrecision(undefined)).toBe(CALC_PRECISION);
    });

    // Zero is a precision, not an absence: a count of firms is printed whole.
    it('takes a declared zero at its word', () => {
        expect(calcPrecision({ name: 'n', label: 'n', precision: 0 })).toBe(0);
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


/**
 * The sentences a refusal can be, and who each is addressed to (P12).
 *
 * The one that matters is the last. A restriction whose expression did not
 * resolve refuses everything the student tries, and telling them "that isn't
 * allowed" would be a lie landing as their mistake — so the copy has to name
 * whose fault it is instead.
 */
describe('a refusal', () => {
    const bounds = (over: Partial<ParamBlockedEvent> = {}): ParamBlockedEvent => ({
        name: 'a', label: 'a', reason: 'bounds',
        requestedValue: 31.4, attemptedValue: 28, value: 28,
        min: 12, max: 28, limit: 'max', restrictions: [],
        ...over
    });

    // The curve stopping at the edge of the range is the news, and the slider
    // already shows the number it stopped at.
    it('says nothing when a param reaches the end of its range', () => {
        expect(phraseRefusal(bounds())).toBeNull();
        expect(phraseRefusal(bounds({ limit: 'min', value: 12 }))).toBeNull();
    });

    // The author wrote the economics, so the author writes the sentence. An app
    // paraphrasing them would be guessing at a mechanism it does not know.
    it('hands back the author\'s own sentence for a rule', () => {
        const said = phraseRefusal(bounds({
            reason: 'restriction',
            restrictions: [{
                name: 'trades', message: 'At these costs nothing would trade.',
                expression: 'calcs.Qe', value: 0.5, min: 1
            }]
        }));

        expect(said).toBe('At these costs nothing would trade.');
    });

    it('says something rather than nothing for a rule with no message', () => {
        const said = phraseRefusal(bounds({
            reason: 'restriction',
            restrictions: [{ expression: 'calcs.Qe', value: 0.5, min: 1 }]
        }));

        expect(said).toBe('This diagram can\'t show that combination.');
    });

    it('blames the diagram, not the student, for a rule that is not a rule', () => {
        const said = phraseRefusal(bounds({
            reason: 'restriction',
            restrictions: [{
                expression: 'calcs.Qee', value: undefined, min: 1, unresolved: 'expression'
            }]
        }));

        expect(said).toContain('a problem with the diagram');
        expect(said).toContain('not with anything you did');
        expect(said).not.toMatch(/you can|not allowed/i);
    });
});

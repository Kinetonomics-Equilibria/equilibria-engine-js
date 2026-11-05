import type { Scenario } from '../../dock/Scenarios';
import { defineLesson } from '../kit/lesson';
import type { ModelSpec } from '../kit/lesson';
import type { StudyContent } from '../content';
import { BASELINE, SHORTAGE_LESSON } from './steps';
import { CALCS, PANELS, PARAMS } from './chart';

export { SHORTAGE_LESSON } from './steps';

/**
 * Shortages and surpluses, told with mangoes at a weekend market.
 *
 * The market lesson says the price is pushed to where the curves cross; this
 * one holds the price somewhere else and shows the push. The price is a
 * param of its own, drawn as a line across the market with the two points it
 * picks, one on each curve, so quantity demanded and quantity supplied are
 * read off the axis side by side and the gap between them is drawn and
 * named. A step moves the price a weekend at a time, and the faint points
 * left behind say which way it went.
 *
 * Drawn after econgraphs.org's "Shortage and surplus" graph, in the house's
 * own way: a straight demand curve, so every number a step says comes out
 * round, and no hand-drawn arrow for the price's pressure, which the chart
 * rules keep to the engine's (Annotations). The pressure is said in the
 * words, shown by the steps that move the price, and drawn by the points'
 * own arrows as they move.
 */

/**
 * The numbers the strip reports, and what they are called everywhere.
 *
 * Quantity demanded and quantity supplied first, as the chain reads a move of
 * the price: what each side did, then the gap it left. The equilibrium price
 * is the caption's, since it is where the gap pushes the price: it moves only
 * when a curve does.
 */
const NARRATED_CALCS = [
    {
        name: 'Qd', label: 'Quantity demanded', precision: 0, tex: 'Q_d',
        meaning: 'Mangoes buyers want a morning at the price',
        rise: 'Quantity demanded rises', fall: 'Quantity demanded falls'
    },
    {
        name: 'Qs', label: 'Quantity supplied', precision: 0, tex: 'Q_s',
        meaning: 'Mangoes growers bring a morning at the price',
        rise: 'Quantity supplied rises', fall: 'Quantity supplied falls'
    },
    {
        name: 'surplus', label: 'Surplus', precision: 0, tex: '\\text{Surplus}',
        meaning: 'Mangoes left over, where growers bring more than buyers want',
        rise: 'The surplus grows', fall: 'The surplus shrinks'
    },
    {
        name: 'shortage', label: 'Shortage', precision: 0, tex: '\\text{Shortage}',
        meaning: 'Mangoes buyers miss out on, where buyers want more than growers bring',
        rise: 'The shortage grows', fall: 'The shortage shrinks'
    },
    {
        name: 'Pe', label: 'Equilibrium price', tex: 'P^*', unit: '$', precision: 2,
        meaning: 'The price at which quantity demanded equals quantity supplied',
        rise: 'The equilibrium price rises', fall: 'The equilibrium price falls'
    }
];

/**
 * Each sets one thing, so two can be combined: a shift of a curve with the
 * price where it was, which leaves a gap for the student to close, or the
 * price on its own.
 */
const SCENARIOS: Scenario[] = [
    {
        id: 'christmas',
        label: 'The weekend before Christmas',
        description: 'Families want mangoes for Christmas lunch, so demand increases. At the old price ' +
            'there is a shortage.',
        params: { demand: 400 }
    },
    {
        id: 'cool-weekend',
        label: 'A cold, wet weekend',
        description: 'Fewer families come to the market, so demand decreases. At the old price there is a ' +
            'surplus.',
        params: { demand: 200 }
    },
    {
        id: 'good-season',
        label: 'A good season',
        description: 'Growers have more mangoes to bring at every price, so supply increases. At the old ' +
            'price there is a surplus.',
        params: { supply: 400 }
    },
    {
        id: 'cyclone',
        label: 'A cyclone hits the crop',
        description: 'Growers have fewer mangoes to bring at every price, so supply decreases. At the old ' +
            'price there is a shortage.',
        params: { supply: 200 }
    },
    {
        id: 'opens-high',
        label: 'The stalls open at $4.00',
        description: 'The price is above equilibrium, so growers bring more mangoes than buyers want. There ' +
            'is a surplus.',
        params: { price: 4 }
    },
    {
        id: 'opens-low',
        label: 'The stalls open at $2.00',
        description: 'The price is below equilibrium, so buyers want more mangoes than growers bring. There ' +
            'is a shortage.',
        params: { price: 2 }
    },
    {
        id: 'baseline',
        label: 'Back to the start',
        params: { ...BASELINE }
    }
];

/** A market for mangoes at a price that need not clear it: what the shortages lesson is drawn on. */
const MODEL: ModelSpec = {
    id: 'mangoes',
    name: 'A market for mangoes, at any price',
    params: PARAMS,
    calcs: CALCS,
    panels: PANELS,
    narratedCalcs: NARRATED_CALCS,
    // The levels a student can check by hand. Where the price line stops is
    // the chart's business, and Q* is read nowhere.
    explainedCalcs: {
        Qd: CALCS.Qd,
        Qs: CALCS.Qs,
        surplus: CALCS.surplus,
        shortage: CALCS.shortage,
        Pe: CALCS.Pe
    },
    paramMeanings: {
        price: 'the price of a mango, in dollars',
        demand: 'mangoes buyers want a morning at $3',
        supply: 'mangoes growers bring a morning at $3'
    },
    // Each answerable with the three sliders: at the start a surplus of 100
    // is at $3.50 and a shortage of 100 at $2.50; a rise in demand leaves a
    // shortage at the old price, which closes at a higher one; and equal
    // rises in both curves leave P* at $3.00.
    explorePrompts: [
        'At what price is there a surplus of 100 mangoes? At what price is there a shortage of 100?',
        'If demand increases while the price stays where it was, is there a shortage or a surplus? Where does the price stop?',
        'How can both curves shift and still leave the market clearing at $3.00?'
    ],
    // The price is not a curve, so it names no colour: it draws its line and
    // its points in grey, and the gap it leaves in the colour of the side
    // with more.
    paramWords: {
        price: {
            about: 'The price the stalls charge for a mango. Changing it moves buyers and growers along their ' +
                'curves without shifting either one.',
            rise: 'The price rises',
            fall: 'The price falls',
            because: {
                rise: 'Fewer mangoes are worth the higher price to buyers, and more are worth bringing to ' +
                    'growers.',
                fall: 'More mangoes are worth the lower price to buyers, and fewer are worth bringing to ' +
                    'growers.'
            }
        },
        demand: {
            about: 'The mangoes all buyers want at each price.',
            rise: 'Demand for mangoes increases',
            fall: 'Demand for mangoes decreases',
            curve: 'demand',
            because: {
                rise: 'The price has not changed, but buyers now want more mangoes at every price, including ' +
                    'this one.',
                fall: 'The price has not changed, but buyers now want fewer mangoes at every price, including ' +
                    'this one.'
            }
        },
        supply: {
            about: 'The mangoes all growers bring at each price.',
            rise: 'Supply of mangoes increases',
            fall: 'Supply of mangoes decreases',
            curve: 'supply',
            because: {
                rise: 'The price has not changed, but growers now bring more mangoes at every price, including ' +
                    'this one.',
                fall: 'The price has not changed, but growers now bring fewer mangoes at every price, including ' +
                    'this one.'
            }
        }
    },
    scenarios: SCENARIOS,
    // Both curves are dragged sideways, so their params rise as they move right.
    directionWords: {
        demand: { up: 'right', down: 'left' },
        supply: { up: 'right', down: 'left' }
    }
};

export const SHORTAGES_AND_SURPLUSES: StudyContent = defineLesson({
    id: 'shortage-surplus',
    label: 'Shortages and surpluses',
    title: 'Shortages and surpluses',
    goals: [
        'Why a price above equilibrium leaves a surplus',
        'Why a price below equilibrium leaves a shortage',
        'How a shortage or a surplus pushes the price towards equilibrium'
    ],
    cover: {
        question: 'What happens when the price is too high or too low?',
        hook: 'At a weekend market, the mangoes sell out by eight o\'clock some mornings, and on other mornings ' +
            'growers take boxes of them home. In this lesson we look at what happens when the price is above ' +
            'or below equilibrium, and at how the market moves back to it.'
    },
    steps: SHORTAGE_LESSON,
    model: MODEL
});

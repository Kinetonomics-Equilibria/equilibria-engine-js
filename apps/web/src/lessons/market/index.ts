import type { Scenario } from '../../dock/Scenarios';
import { defineLesson } from '../kit/lesson';
import type { StudyContent, StudyModel } from '../content';
import { MARKET_LESSON } from './steps';
import { CALCS, PANELS, PARAMS } from './chart';

export { MARKET_LESSON } from './steps';

/**
 * One diagram, three panels, one market: the first lesson.
 *
 * The panels are not three charts that happen to sit together: they are one
 * config, one engine and one set of params, so a drag in whichever panel is
 * focal moves all three at once with nothing in this app synchronising them.
 * That is the whole reason the stage places regions of a single canvas rather
 * than mounting a component per panel.
 *
 * The model is a demand curve `P = a − Q` and a supply curve `P = c + Q`, so
 * each param is where its curve meets the price axis, and the market clears
 * at `P* = (a + c)/2` and `Q* = (a − c)/2`.
 */

/**
 * Money, wherever a calc is measured in it: dollars, to the cent.
 *
 * Declared once and spread into each calc that is money, so the unit and the
 * decimals cannot be given to one calc and not the other. Two decimals because
 * that is how a price is written — "$13.0" is a number nobody would put on a
 * label — and the one-decimal default stays for a quantity, where 9.0 is fine.
 */
const MONEY = { unit: '$', precision: 2 };

/**
 * The numbers the narration strip reports as consequences, most important first.
 *
 * `calcs` holds everything the diagram computes, including a bag of geometry
 * per named object, and which of them are *results a student should read* is a
 * claim about economics rather than something a component could work out. This
 * list is the panels' headlines plus `Qe`, which no panel headlines and every
 * chain needs — a price that moved without a quantity is half an event.
 *
 * The labels are words, because a caption and the strip are words: "P* $13.00"
 * and "CS $40.50" asked a student to know two abbreviations nobody had spelt
 * out. A symbol is for the diagram and for a formula, where there is no room
 * for a word, so `tex` gives the Maths instrument the one the dropline uses.
 * Consumer surplus and revenue have none on the diagram, and their formulas
 * say them in words.
 *
 * Order matters twice over: it is the order the clauses appear in, and the first
 * entry is what "why?" opens the maths explainer on.
 */
const NARRATED_CALCS = [
    {
        name: 'Pe', label: 'Price', tex: 'P^*', meaning: 'Equilibrium price', ...MONEY,
        rise: 'The price rises', fall: 'The price falls'
    },
    {
        name: 'Qe', label: 'Quantity', tex: 'Q^*', meaning: 'Equilibrium quantity',
        rise: 'More is bought and sold', fall: 'Less is bought and sold'
    },
    // In the words of the steps that bring these panels in: "What buyers gain"
    // and "What sellers earn". Labelled as the panels are named, so a caption
    // says the name once and not twice.
    //
    // In a formula consumer surplus is "Surplus", under the heading that says
    // whose: the whole phrase made its working wider than the Maths tab.
    {
        name: 'CS', label: 'Consumer surplus', tex: '\\text{Surplus}', meaning: 'Consumer surplus', ...MONEY,
        rise: 'Buyers gain more', fall: 'Buyers gain less'
    },
    {
        name: 'TR', label: 'Revenue', meaning: 'Total revenue', ...MONEY,
        rise: 'Sellers earn more', fall: 'Sellers earn less'
    }
];

/**
 * Named param sets a student can jump to.
 *
 * Applied instantly rather than animated. Two curves sliding simultaneously is
 * a pretty thing that teaches less than a sentence naming what shifted — and the
 * sentence is already there, under the stage, generated from the same change.
 */
const SCENARIOS: Scenario[] = [
    {
        id: 'demand-shock',
        label: 'Demand shock',
        description: 'Incomes rise and buyers want more at every price.',
        params: { a: 26 }
    },
    {
        id: 'input-costs',
        label: 'Input costs rise',
        description: 'Production gets dearer, so sellers need more to supply the same quantity.',
        params: { c: 6 }
    },
    {
        id: 'both',
        label: 'Boom and cost squeeze',
        description: 'Both at once — the quantity effects work against each other.',
        params: { a: 26, c: 6 }
    },
    {
        id: 'baseline',
        label: 'Back to baseline',
        params: { a: 20, c: 2 }
    }
];

export const SUPPLY_AND_DEMAND: StudyContent = defineLesson({
    id: 'market',
    label: 'Supply and demand',
    title: 'A market, and what it does to everything else',
    goals: [
        'How demand and supply set a price',
        'What changes when demand rises',
        'One change to work out yourself'
    ],
    cover: {
        question: 'Why do prices go up and down?',
        hook: 'Nobody sets most prices. They settle where what buyers want meets what sellers ' +
            'will sell, and when either side changes the price moves, and with it who gains.'
    },
    steps: MARKET_LESSON,

    /** A market, with its consumer surplus and revenue: what the first lesson is drawn on. */
    model: {
        id: 'market',
        name: 'A market, its surplus and its revenue',
        params: PARAMS,
        calcs: CALCS,
        panels: PANELS,
        narratedCalcs: NARRATED_CALCS,
        // The curves are `P = a − Q` and `P = c + Q`, so each param is where its
        // curve meets the price axis — which a student can see, and check, on
        // the diagram beside the formula. The params themselves stay
        // unlabelled: the strip and the sliders call them `a` and `c`, and so
        // do the formulas this explains.
        paramMeanings: {
            a: 'where demand meets the price axis',
            c: 'where supply meets the price axis'
        },
        // With P* = (a + c)/2 and Q* = (a − c)/2 every answer is there: costs
        // up raises the price and cuts the quantity; equal rises in `a` and
        // `c` raise the price and leave the quantity, and so consumer surplus,
        // where they were; and raising `c` alone shrinks what buyers gain.
        explorePrompts: [
            'Raise sellers\' costs (c). Which way do the price and the quantity sold go?',
            'Raise a and c by the same amount. What changes, and what stays the same?',
            'Make buyers gain less without touching demand.'
        ],
        // The letters stay on the sliders, as on the formulas; the sentence
        // under each says which curve it is and which way is which, since
        // "higher a" means nothing until you know a is demand. Raising `c`
        // lifts the supply curve, which is a *fall* in supply — the reading
        // says what happened to sellers rather than leave a student to work
        // out that up is less. Each is marked in its curve's colour, which is
        // what ties a letter to a line before the student has learnt which is
        // which.
        paramWords: {
            a: {
                about: 'Where demand meets the price axis. Higher means buyers want more at every price.',
                rise: 'Demand increases',
                fall: 'Demand decreases',
                curve: 'demand'
            },
            c: {
                about: 'Where supply meets the price axis. Higher means each unit costs sellers more.',
                rise: 'Sellers\' costs rise',
                fall: 'Sellers\' costs fall',
                curve: 'supply'
            }
        },
        scenarios: SCENARIOS
    }
});

export const MARKET: StudyModel = SUPPLY_AND_DEMAND.model;

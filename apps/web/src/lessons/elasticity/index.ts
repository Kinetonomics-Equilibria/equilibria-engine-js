import { defineLesson } from '../kit/lesson';
import type { ModelSpec } from '../kit/lesson';
import type { StudyContent, StudyModel } from '../content';
import { BASELINE, BAKERY, ELASTICITY_LESSON } from './steps';
import { CALCS, ELASTICITY, PANELS, PARAMS, PCT_PRICE, PCT_QUANTITY } from './chart';

export { ELASTICITY_LESSON } from './steps';

/**
 * Price elasticity of demand, told with a school canteen's sausage rolls.
 *
 * Elasticity is how far students respond to a price, so the model's second
 * param is exactly that: how many fewer rolls they buy for each dollar on
 * the price, the slope of a demand curve that pivots about where the canteen
 * starts. The first is the price itself. A step moves one or the other, and
 * never shifts the curve: every curve passes through 210 rolls at $4.50, so
 * one $1 rise from there can be told twice, on a steep curve and a flat one,
 * and the only difference is how far students respond.
 *
 * Two charts. The canteen's demand, headlined by the elasticity of the move
 * from $4.50 to its price; and its revenue, the rectangle under the point,
 * which arrives when the lesson turns to what elasticity means for a seller.
 * Its caption's chip is the total revenue test: ▲ for a rise on inelastic
 * demand, ▼ on elastic.
 *
 * The questions offer the price and the curve, as the Jordans lesson's do:
 * a reason for students to respond more or less is the curve, and a canteen
 * after more revenue is the price, one way or the other.
 */

/**
 * The numbers the strip reports, and what they are called everywhere.
 *
 * The two headlines first, then quantity demanded, then the two percentages
 * the elasticity divides, so the Maths tab can write it in words. The
 * percentages have no unit, which is a prefix; their labels say what they
 * are instead.
 */
const NARRATED_CALCS = [
    {
        name: 'e', label: 'Price elasticity', precision: 2,
        meaning: 'Price elasticity of demand, for the move from $4.50 to the canteen\'s price',
        rise: 'Demand is more elastic', fall: 'Demand is less elastic'
    },
    {
        name: 'revenue', label: 'Revenue', unit: '$', precision: 2,
        meaning: 'What the canteen earns each day, which is the price multiplied by the sausage rolls sold',
        rise: 'Revenue rises', fall: 'Revenue falls'
    },
    {
        name: 'Qd', label: 'Quantity demanded', tex: 'Q_d', precision: 0,
        meaning: 'Sausage rolls students buy a day at the canteen\'s price',
        rise: 'Quantity demanded rises', fall: 'Quantity demanded falls'
    },
    {
        name: 'pctP', label: '% change in price', precision: 0,
        meaning: 'The change in price from $4.50, as a percentage of halfway between'
    },
    {
        name: 'pctQ', label: '% change in quantity demanded', precision: 0,
        meaning: 'The change in quantity demanded from 210, as a percentage of halfway between'
    }
];

/** What moves how far students respond, and the price itself beside them. */
const SCENARIOS = [
    {
        id: 'bakery',
        label: 'A bakery opens across the road',
        description: 'Students have a substitute for the canteen\'s rolls, so each dollar on the price ' +
            'loses more sales. Demand is more elastic.',
        params: { response: BAKERY }
    },
    {
        id: 'wet-week',
        label: 'It rains all week',
        description: 'Fewer students want to walk to the bakery in the rain, so they keep buying at the ' +
            'canteen when the price rises. Demand is less elastic.',
        params: { response: 30 }
    },
    {
        id: 'price-rise',
        label: 'The canteen adds a dollar',
        description: 'The rolls\' own price rises, so students move along the curve. Quantity demanded ' +
            'falls, and the curve does not move.',
        params: { price: 5.5 }
    },
    {
        id: 'price-cut',
        label: 'The canteen takes 50c off',
        description: 'The rolls\' own price falls, so students move along the curve. Quantity demanded ' +
            'rises, and the curve does not move.',
        params: { price: 4 }
    },
    { id: 'baseline', label: 'Back to $4.50 and no bakery', params: { ...BASELINE } }
];

/** A school canteen's demand for sausage rolls, and its revenue: what the elasticity lesson is drawn on. */
const MODEL: ModelSpec = {
    id: 'canteen',
    name: 'A canteen\'s sausage rolls',
    params: PARAMS,
    calcs: CALCS,
    panels: PANELS,
    narratedCalcs: NARRATED_CALCS,
    // Each as the sum a student can do, without the steps that hold the
    // percentages and the elasticity back until they are taught.
    explainedCalcs: {
        e: ELASTICITY,
        revenue: CALCS.revenue,
        Qd: CALCS.Qd,
        pctP: PCT_PRICE,
        pctQ: PCT_QUANTITY
    },
    paramMeanings: {
        price: 'the canteen\'s price for a sausage roll, in dollars',
        response: 'sausage rolls a day students stop buying for each dollar on the price'
    },
    // Each answerable with the two sliders: at $5.50, 30 sales a dollar is
    // 0.77 and 40 is 1.05; at 70 a dollar, revenue is highest at $3.75, so
    // no rise from $4.50 brings in more; and at 0 the curve is vertical.
    explorePrompts: [
        'At a price of $5.50, how many sales must each dollar lose before demand is elastic?',
        `With sales lost per $1 at ${BAKERY}, as with the bakery, is there any price rise that increases revenue?`,
        'With sales lost per $1 at 0, what does a price rise do to quantity demanded and to revenue?'
    ],
    // The curve is blue, as demand always is; the price is orange, as the
    // point it moves is.
    paramWords: {
        price: {
            about: 'The price the canteen charges for a sausage roll. Changing it moves students along ' +
                'the demand curve without shifting the curve.',
            rise: 'The canteen raises its price',
            fall: 'The canteen cuts its price',
            curve: 'choice',
            // Nothing about revenue, which a price move reaches steps before
            // the revenue panel does; and "how far", since at 0 sales lost per
            // $1 sales do not move at all.
            because: {
                rise: 'The curve does not move, so students move up along it, and sales fall by an ' +
                    'amount that depends on how much they respond to the price.',
                fall: 'The curve does not move, so students move down along it, and sales rise by an ' +
                    'amount that depends on how much they respond to the price.'
            }
        },
        response: {
            about: 'How many fewer rolls students buy for each dollar on the price. This number is ' +
                'higher when they have somewhere else to go.',
            rise: 'Each dollar on the price loses more sales',
            fall: 'Each dollar on the price loses fewer sales',
            curve: 'demand',
            // At $4.50 a turn of the curve changes nothing, so this is said only
            // away from it, where it is true.
            because: {
                rise: 'The same change in price from $4.50 now changes sales by a bigger percentage.',
                fall: 'The same change in price from $4.50 now changes sales by a smaller percentage.'
            }
        }
    },
    scenarios: SCENARIOS
};

export const PRICE_ELASTICITY: StudyContent = defineLesson({
    id: 'elasticity',
    label: 'Price elasticity of demand',
    title: 'Price elasticity of demand',
    goals: [
        'How to measure how much buyers respond to a price',
        'Why a price rise can increase or decrease revenue',
        'What makes demand elastic'
    ],
    cover: {
        question: 'Does a higher price always bring in more money?',
        hook: 'Suppose a school canteen raises the price of a sausage roll by $1. The canteen earns more ' +
            'on each roll, but it sells fewer rolls. In this lesson we measure how much students respond ' +
            'to a price change, and what that means for the canteen\'s revenue.'
    },
    steps: ELASTICITY_LESSON,
    model: MODEL
});

export const CANTEEN: StudyModel = PRICE_ELASTICITY.model;

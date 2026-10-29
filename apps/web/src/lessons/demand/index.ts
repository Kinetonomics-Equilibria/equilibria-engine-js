import type { Scenario } from '../../dock/Scenarios';
import { defineLesson } from '../kit/lesson';
import type { ModelSpec } from '../kit/lesson';
import type { StudyContent, StudyModel } from '../content';
import { BASELINE, DEMAND_LESSON } from './steps';
import { CALCS, PANELS, PARAMS } from './chart';
import coverPicture from '../pictures/jordans-cover.svg';

export { DEMAND_LESSON } from './steps';

/**
 * Demand, and what shifts it, told with a pair of Air Jordans.
 *
 * Two charts. The first is one buyer, the student: what they would pay for a
 * first pair this year, then a second, a third and a fourth, each worth $100
 * less than the one before. That is diminishing marginal utility, stepped out
 * as four points, and it is why a demand curve slopes down: the lower the
 * price, the more pairs are worth buying. Nike's price is drawn across the
 * same chart, so the pairs worth buying are the points on or above it.
 *
 * The second is every fan in Australia, about 100,000 of them, each valuing a
 * pair a bit differently, so their points add up to a smooth line: the market
 * demand curve. A change in Nike's own price slides the point along it, and
 * anything in PETPIG shifts the whole curve. That difference — a change in
 * quantity demanded against a change in demand — is what the questions turn
 * on, so each offers both the price and the curve, and the student has to say
 * which one the news moves before saying which way.
 *
 * The model, in thousands of pairs a year at a price P in dollars:
 *
 *     market     Q = demand − (P − 300)
 *     the student   every pair worth at least P: 4 at $100 and below,
 *                   1 at $400, none above it
 *
 * so `demand` is what fans want at $300, Nike's price at the start, and a
 * dollar on the price is a thousand pairs a year. At $300 the market wants
 * 200,000 pairs, which is the student's 2 pairs times 100,000 fans; at other
 * prices the two part company, because the fans are not all the student.
 *
 * The student's chart does not move when demand does. Every PETPIG step is
 * said of fans in general, and the population step makes a point of it: there
 * are more fans, and the student's own points stay where they were.
 *
 * Government policy is the G, and is named and left for a lesson of its own.
 */

/**
 * The numbers the strip reports, and what they are called everywhere.
 *
 * Quantity demanded first: it is the market's caption and what "why?" opens
 * the maths on, and its rise and fall are the step title that teaches it. In
 * thousands, which the axis says, as the café's coffees are counted in the
 * axis's units.
 */
const NARRATED_CALCS = [
    {
        name: 'Qd', label: 'Quantity demanded', precision: 0, tex: 'Q_d',
        meaning: 'Thousands of pairs fans want a year at Nike\'s price',
        rise: 'Quantity demanded rises', fall: 'Quantity demanded falls'
    },
    {
        name: 'mine', label: 'Pairs you buy', precision: 0,
        meaning: 'Your pairs a year at Nike\'s price: every pair worth at least that to you',
        rise: 'You buy more pairs', fall: 'You buy fewer pairs'
    }
];

/**
 * PETPIG, as one-click shifts, and Nike's own price beside them.
 *
 * Each says which letter it is and so which way demand goes; the strip says
 * what that did to the quantity. Each sets only the param it is about, so
 * two can be combined.
 */
const SCENARIOS: Scenario[] = [
    {
        id: 'adidas-sale',
        label: 'Adidas has a sale',
        description: 'A substitute gets cheaper, so fans want fewer Jordans at every price: demand decreases.',
        params: { demand: 150 }
    },
    {
        id: 'club-fees',
        label: 'Basketball club fees fall',
        description: 'More people play, and the shoes go with playing: a complement gets cheaper, so demand increases.',
        params: { demand: 250 }
    },
    {
        id: 'price-rise-coming',
        label: 'A price rise is announced',
        description: 'Fans expect to pay more next month, so they buy now: demand today increases.',
        params: { demand: 250 }
    },
    {
        id: 'boxing-day',
        label: 'Boxing Day sales are coming',
        description: 'Fans expect lower prices soon, so many wait: demand today decreases.',
        params: { demand: 150 }
    },
    {
        id: 'nba-star',
        label: 'An NBA star wears them',
        description: 'Tastes swing towards Jordans, so fans want more at every price: demand increases.',
        params: { demand: 250 }
    },
    {
        id: 'more-teenagers',
        label: 'More teenagers in Australia',
        description: 'More buyers want more pairs at every price: demand increases.',
        params: { demand: 250 }
    },
    {
        id: 'wages-rise',
        label: 'Wages rise',
        description: 'Jordans are a normal good, so fans with more to spend want more: demand increases.',
        params: { demand: 250 }
    },
    {
        id: 'downturn',
        label: 'Part-time shifts dry up',
        description: 'Fans have less to spend, so they want fewer pairs at every price: demand decreases.',
        params: { demand: 150 }
    },
    {
        id: 'nike-sale',
        label: 'Nike takes $50 off',
        description: 'Jordans\' own price falls, so fans move along the curve: quantity demanded rises, and demand stays put.',
        params: { price: 250 }
    },
    {
        id: 'baseline',
        label: 'Back to the start',
        params: { ...BASELINE }
    }
];

/** One fan's demand for Air Jordans and every fan's: what the PETPIG lesson is drawn on. */
const MODEL: ModelSpec = {
    id: 'air-jordans',
    name: 'Demand for Air Jordans',
    params: PARAMS,
    calcs: CALCS,
    panels: PANELS,
    narratedCalcs: NARRATED_CALCS,
    // Quantity demanded as the sum a student can do: what fans want at $300,
    // less a thousand pairs for every dollar the price is above it. The
    // student's own pairs are a count of points, not a formula.
    explainedCalcs: {
        Qd: CALCS.q
    },
    paramMeanings: {
        demand: 'thousands of pairs fans want a year at $300',
        price: 'Nike\'s price for a pair, in dollars'
    },
    // Each answerable with the two sliders: the student buys 3 pairs at $200
    // and below, where fans want 300 thousand at the start; a price cut
    // raises quantity demanded and leaves the curve; and 250 at $300 is
    // demand at 250, which any of P, E, T, P or I can cause.
    explorePrompts: [
        'Find the highest price at which you\'d buy 3 pairs. How many do all fans want there?',
        'Make quantity demanded rise without moving the demand curve.',
        'Shift demand so fans want 250,000 pairs at $300. Which letters of PETPIG could do that?'
    ],
    // The curve is blue, as demand always is; the price is orange, as the
    // point it moves and the line it draws are.
    paramWords: {
        price: {
            about: 'What Nike charges for a pair. Changing it moves fans along the curve, and the ' +
                'curve stays put.',
            rise: 'Nike raises its price',
            fall: 'Nike cuts its price',
            curve: 'choice',
            // Said of a pair, not of fans, so it holds at the steps where the
            // chart is your own pairs alone.
            because: {
                rise: 'Fewer pairs are worth at least the higher price, so fewer are bought: a move ' +
                    'along the curve.',
                fall: 'More pairs are worth at least the lower price, so more are bought: a move ' +
                    'along the curve.'
            }
        },
        demand: {
            about: 'What all fans want at each price. Anything in PETPIG shifts it.',
            rise: 'Demand for Air Jordans increases',
            fall: 'Demand for Air Jordans decreases',
            curve: 'demand',
            because: {
                rise: 'Nike\'s price hasn\'t changed, but fans now want more pairs at every price, ' +
                    'including this one.',
                fall: 'Nike\'s price hasn\'t changed, but fans now want fewer pairs at every price, ' +
                    'including this one.'
            }
        }
    },
    scenarios: SCENARIOS,
    // The curve is dragged sideways, so its param rises as it moves right.
    directionWords: {
        demand: { up: 'right', down: 'left' }
    }
};

export const DEMAND_SHIFTERS: StudyContent = defineLesson({
    id: 'demand',
    label: 'What shifts demand',
    title: 'Air Jordans, and what shifts demand',
    goals: [
        'Why each extra pair is worth less to you',
        'Moving along the demand curve, and shifting it',
        'The six things that shift demand: PETPIG'
    ],
    cover: {
        question: 'What makes people want more Air Jordans?',
        hook: 'A pair of Air Jordans costs the same in every shop, yet some months they sell out and ' +
            'some months they sit on the shelf. Work out why and you can say which way demand will move.',
        picture: 'cover'
    },
    pictures: {
        cover: {
            name: 'A sneaker shop',
            src: coverPicture,
            alt: 'A sneaker wall in a shop, with high-tops on its shelves and a red pair on the counter ' +
                'under a $300 price tag.'
        }
    },
    asides: {
        wageNews: {
            name: 'News report',
            headline: 'Junior wages rise from 1 July',
            body: 'Teenagers with part-time jobs will take home more each week.',
            note: 'A made-up report, for this question'
        }
    },
    steps: DEMAND_LESSON,
    model: MODEL
});

export const AIR_JORDANS: StudyModel = DEMAND_SHIFTERS.model;

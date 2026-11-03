import { defineLesson } from '../kit/lesson';
import type { ModelSpec } from '../kit/lesson';
import type { StudyContent, StudyModel } from '../content';
import { BASELINE, TERMS_OF_TRADE_LESSON } from './steps';
import { CALCS, PANELS, PARAMS } from './chart';
import coverPicture from '../pictures/tot-cover.svg';

export { TERMS_OF_TRADE_LESSON } from './steps';

/**
 * The terms of trade, told through Australia's mining boom.
 *
 * A market gives the export price, and a param gives the import price, so
 * the terms of trade are one sum over the two: what they measure can be
 * taught with import prices alone, and what moves them with the market.
 *
 * Three charts. The market for what Australia digs up, which sets export
 * prices; the terms of trade, as a line through the origin whose slope is
 * what a basket of exports buys in imports; and export revenue, the rectangle
 * under the market's point, which is what shows a price and an income are not
 * the same thing: as the mines open the first falls and the second rises.
 *
 * Everything is an index from 100, as the terms of trade are. The numbers are
 * the lesson's own, though the shape is what happened: a fall of a third from
 * the peak, to somewhere above where it began.
 */

/**
 * The numbers the strip reports, and what they are called everywhere. Each
 * chart that names its number takes that name as its label, so the caption
 * says it once. Indexes have no unit.
 */
const NARRATED_CALCS = [
    {
        name: 'tot', label: 'Terms of trade', tex: '\\text{ToT}', precision: 0,
        meaning: 'Export prices ÷ import prices × 100, which is what 100 baskets of exports buy in imports',
        rise: 'The terms of trade rise', fall: 'The terms of trade fall'
    },
    {
        name: 'Pe', label: 'Export prices', tex: 'P^*', precision: 0,
        meaning: 'The price index of what Australia sells overseas',
        rise: 'Export prices rise', fall: 'Export prices fall'
    },
    {
        name: 'Qe', label: 'Export volume', tex: 'Q^*', precision: 0,
        meaning: 'How much Australia ships, as an index',
        rise: 'Export volume rises', fall: 'Export volume falls'
    },
    {
        name: 'revenue', label: 'Export revenue', precision: 0,
        meaning: 'What the world pays Australia for its exports, as an index of price multiplied by volume',
        rise: 'Export revenue rises', fall: 'Export revenue falls'
    }
];

/** What moves each of the three, one param each, so two can be combined. */
const SCENARIOS = [
    {
        id: 'boom',
        label: 'China starts building',
        description: 'Steel mills want more iron ore and coal at every price. Demand for commodities rises.',
        params: { demand: 200 }
    },
    {
        id: 'slowdown',
        label: 'Steel mills cut back',
        description: 'Mills overseas want less iron ore and coal at every price. Demand for commodities falls.',
        params: { demand: 80 }
    },
    {
        id: 'new-mines',
        label: 'New mines open',
        description: 'Miners can ship more at every price. Supply of commodities rises.',
        params: { supply: 150 }
    },
    {
        id: 'cyclone',
        label: 'A cyclone shuts a port',
        description: 'Iron ore cannot reach the ships, so miners ship less at every price. Supply of commodities falls.',
        params: { supply: 80 }
    },
    {
        id: 'dearer-imports',
        label: 'Phones and cars cost more',
        description: 'Factories overseas raise their prices, so a basket of imports costs more. Import prices rise.',
        params: { imports: 125 }
    },
    {
        id: 'cheaper-imports',
        label: 'Factories cut their prices',
        description: 'A basket of imports costs less, so the same exports buy more of it. Import prices fall.',
        params: { imports: 80 }
    },
    { id: 'baseline', label: 'Back to terms of trade of 100', params: { ...BASELINE } }
];

/** The market for Australia's commodities, and what they buy: what the terms of trade lesson is drawn on. */
const MODEL: ModelSpec = {
    id: 'commodities',
    name: 'Australia\'s commodity exports',
    params: PARAMS,
    calcs: CALCS,
    panels: PANELS,
    narratedCalcs: NARRATED_CALCS,
    paramMeanings: {
        demand: 'how much of Australia\'s commodities the world wants when export prices are 100',
        supply: 'how much Australian miners ship when export prices are 100',
        imports: 'the price index of what Australia buys from overseas'
    },
    // Each answerable with the three sliders: 200 is demand at 205 and supply
    // at 80; import prices of 120 want export prices of 120, which is demand
    // at 125; and import prices touch nothing in the market.
    explorePrompts: [
        'How can the terms of trade reach 200 without any change in import prices?',
        'If import prices rise to 120, how can a move in demand bring the terms of trade back to 100?',
        'Which move lowers the terms of trade without changing export revenue?'
    ],
    // Demand and supply in their own colours. Import prices are in the terms
    // of trade's, the line they turn. They turn it whichever way the market
    // does as well, and demand and supply mark in the market's colours,
    // where each is drawn first.
    paramWords: {
        demand: {
            about: 'Steel mills and power stations overseas, buying Australian ore, coal and gas.',
            rise: 'Demand for commodities increases',
            fall: 'Demand for commodities decreases',
            curve: 'demand',
            because: {
                rise: 'At the old price, buyers now want more than miners ship, so the price is pushed ' +
                    'up until the two match again.',
                fall: 'At the old price, miners now ship more than buyers want, so the price is pushed ' +
                    'down until the two match again.'
            }
        },
        supply: {
            about: 'Australian miners, shipping what their mines can dig.',
            rise: 'Supply of commodities increases',
            fall: 'Supply of commodities decreases',
            curve: 'supply',
            because: {
                rise: 'At the old price, miners now ship more than buyers want, so the price is pushed ' +
                    'down until the two match again.',
                fall: 'At the old price, miners now ship less than buyers want, so the price is pushed ' +
                    'up until the two match again.'
            }
        },
        imports: {
            about: 'What Australia pays for phones, laptops, cars and fuel from overseas.',
            rise: 'Import prices rise',
            fall: 'Import prices fall',
            curve: 'termsOfTrade',
            because: {
                rise: 'A basket of imports costs more, so the same exports buy fewer of them.',
                fall: 'A basket of imports costs less, so the same exports buy more of them.'
            }
        }
    },
    scenarios: SCENARIOS,
    // Both curves are dragged sideways, so their params rise as the curve
    // moves right. Import prices are a slider, and go up and down.
    directionWords: {
        demand: { up: 'right', down: 'left' },
        supply: { up: 'right', down: 'left' }
    }
};

export const TERMS_OF_TRADE: StudyContent = defineLesson({
    id: 'terms-of-trade',
    label: 'Terms of trade',
    title: 'The terms of trade',
    goals: [
        'What the terms of trade measure, and how to calculate them',
        'Why a commodity boom lifts them, and who gains',
        'Why a boom fades, and where prices settle',
        'How to apply this to four cases'
    ],
    cover: {
        question: 'How many phones does a shipload of iron ore buy?',
        hook: 'Australia sells iron ore and buys phones. When the price of iron ore rises compared with ' +
            'the price of phones, each shipload buys more phones. In this lesson we measure this change ' +
            'and follow one mining boom from start to finish.',
        picture: 'cover'
    },
    pictures: {
        cover: {
            name: 'Two ships passing',
            src: coverPicture,
            alt: 'An ore carrier leaving Australia loaded with iron ore passes a container ship ' +
                'arriving with imports.'
        }
    },
    asides: {
        factoryReport: {
            name: 'News report',
            headline: 'Phones, laptops and cars cost more around the world',
            body: 'Rising wages push up what factories in Asia and Europe charge.',
            note: 'A made-up report, for this question'
        }
    },
    steps: TERMS_OF_TRADE_LESSON,
    model: MODEL
});

export const COMMODITIES: StudyModel = TERMS_OF_TRADE.model;

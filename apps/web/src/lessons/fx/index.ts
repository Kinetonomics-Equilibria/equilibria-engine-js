import type { Scenario } from '../../dock/Scenarios';
import { defineLesson } from '../kit/lesson';
import type { ModelSpec } from '../kit/lesson';
import type { StudyContent, StudyModel } from '../content';
import { BASELINE, FX_LESSON } from './steps';
import { CALCS, PANELS, PARAMS } from './chart';
import coverPicture from '../pictures/fx-cover.svg';
import tradePicture from '../pictures/fx-trade.svg';
import tradeStill from '../pictures/fx-trade-still.svg';
import rbaPicture from '../pictures/fx-rba.svg';

export { FX_LESSON } from './steps';

/**
 * The market for the Australian dollar, for Australian students.
 *
 * The AUD is the reference currency, quoted the way the RBA and every news
 * bulletin quotes it: the price of AUD 1 in US dollars. So "up" on the price axis
 * is the AUD appreciating, and the curves are the demand for and supply of AUD —
 * the world buying Australian exports and assets, and Australians buying
 * imports and assets abroad.
 *
 * Two panels, one engine. The second is the same trades seen from the American
 * side, which is the idea the teaching slides return to on every determinant
 * ("the dollar appreciates, the pound depreciates"): whoever buys AUD pays in
 * USD, so demand for AUD *is* the supply of USD, and the price of USD 1 is the
 * reciprocal of the price of AUD 1. Nothing synchronises the two panels; they are
 * drawn from the same two params.
 *
 * The model, in AUD billion traded at an exchange rate e (USD per AUD):
 *
 *     demand for AUD   Q = demand − 100·(e − 0.65)
 *     supply of AUD    Q = supply + 100·(e − 0.65)
 *
 * so the market clears at e* = 0.65 + (demand − supply)/200 and
 * Q* = (demand + supply)/2. `demand` and `supply` are each curve's quantity at
 * USD 0.65: a shift of 10 moves the rate five US cents, which is a move a
 * student can see and a size the AUD has moved by in a season more than once.
 */

/**
 * The numbers the strip reports, and what they are called everywhere.
 *
 * Written the way an exchange rate is written — "AUD 1 = USD 0.65" — and to the
 * cent, because that is how a rate is quoted. The caption, its chip and the
 * strip then read "AUD 1 = USD 0.65 → USD 0.70" without anyone formatting a rate
 * twice.
 *
 * A label made to sit in front of a number is no symbol for a formula, so the
 * two rates carry the diagram's own: `e*` on the AUD market's dropline and
 * `1/e*` on the USD market's. The second is also the whole of its formula, and
 * the Maths instrument says so once rather than twice.
 */
const NARRATED_CALCS = [
    {
        name: 'rate', label: 'AUD 1 =', unit: 'USD ', precision: 2,
        tex: 'e^*', meaning: 'Exchange rate: the price of AUD 1 in USD',
        rise: 'The AUD appreciates', fall: 'The AUD depreciates'
    },
    // The reciprocal, so its words are the other way round from the rate's: a
    // dearer USD 1 is a USD that has appreciated, which happens exactly when the
    // AUD has depreciated.
    {
        name: 'inverse', label: 'USD 1 =', unit: 'AUD ', precision: 2,
        tex: '\\frac{1}{e^*}', meaning: 'The price of USD 1 in AUD',
        rise: 'The USD appreciates', fall: 'The USD depreciates'
    },
    // In words where a student reads it, and Q* only in a formula, where it
    // is the dropline's symbol (docs/chart-design.md).
    {
        name: 'Qe', label: 'AUD traded', tex: 'Q^*', precision: 0, meaning: 'Quantity of AUD traded',
        rise: 'More AUD changes hands', fall: 'Less AUD changes hands'
    }
];

/**
 * Determinants, as one-click shifts — Australian ones.
 *
 * Each moves one curve, as the slides do, and each says in its own words which
 * curve and why: the point of a scenario is the reasoning, and the strip under
 * the stage is what says what it did to the rate. Each sets only the param it
 * is about, so two can be combined, which is the first lesson's convention.
 */
const SCENARIOS: Scenario[] = [
    {
        id: 'iron-ore',
        label: 'Iron ore prices soar',
        description: 'China pays more for Australian iron ore, and pays in AUD: demand for AUD rises.',
        params: { demand: 60 }
    },
    {
        id: 'rba',
        label: 'RBA lifts the cash rate',
        description: 'Higher Australian interest rates draw investors overseas into AUD bonds: demand for AUD rises.',
        params: { demand: 60 }
    },
    {
        id: 'china-slows',
        label: 'China\'s economy slows',
        description: 'Less steel, less iron ore and coal bought from Australia: demand for AUD falls.',
        params: { demand: 40 }
    },
    {
        id: 'holidays',
        label: 'Australians holiday abroad',
        description: 'Holiday money means selling AUD for foreign currency: supply of AUD rises.',
        params: { supply: 60 }
    },
    {
        id: 'inflation',
        label: 'Australian prices rise faster',
        description: 'Imports look cheap beside dearer local goods, so Australians buy more of them: supply of AUD rises.',
        params: { supply: 60 }
    },
    {
        id: 'fed',
        label: 'US Fed lifts its rates',
        description: 'Australian savers move money into US bonds, selling AUD to do it: supply of AUD rises.',
        params: { supply: 60 }
    },
    {
        id: 'imports-fall',
        label: 'Australians buy fewer imports',
        description: 'Fewer imported cars and phones means less AUD sold for USD: supply of AUD falls.',
        params: { supply: 40 }
    },
    {
        id: 'baseline',
        label: 'Back to AUD 1 = USD 0.65',
        params: { ...BASELINE }
    }
];

/** The AUD market and the USD market it mirrors: what the exchange-rate lesson is drawn on. */
const MODEL: ModelSpec = {
    id: 'aud',
    name: 'The market for the Australian dollar',
    params: PARAMS,
    calcs: CALCS,
    panels: PANELS,
    narratedCalcs: NARRATED_CALCS,
    // The engine's labels, "Demand for AUD", say which curve and not what the
    // number is. It is that curve's quantity at the rate the lesson starts at.
    paramMeanings: {
        demand: 'AUD demanded at USD 0.65',
        supply: 'AUD supplied at USD 0.65'
    },
    // Each answerable with the two sliders: USD 0.75 is demand 20 above supply
    // (70 and 50, or 50 and 30); equal rises leave the rate where it was and
    // move only the quantity; and demand alone can take the AUD down.
    explorePrompts: [
        'Make AUD 1 worth USD 0.75. Which curve did you move, and which way?',
        'Raise demand and supply by the same amount. What happens to the exchange rate?',
        'Make the AUD depreciate without touching supply.'
    ],
    // Who is behind each curve, as the first two steps introduce them, and the
    // titles of the steps that move them. Each in the colour of its curve in
    // the AUD market. In the USD market the same param moves a curve of the
    // other kind, drawn in that kind's colour — demand for AUD moves the orange
    // supply of USD — so "What changed" marks the movements in the colour of
    // the first one it lists, the AUD market's.
    paramWords: {
        demand: {
            about: 'People overseas paying for Australian exports, holidays and assets.',
            rise: 'Demand for AUD increases',
            fall: 'Demand for AUD decreases',
            curve: 'demand'
        },
        supply: {
            about: 'Australians paying for imports, trips and assets overseas.',
            rise: 'Supply of AUD increases',
            fall: 'Supply of AUD decreases',
            curve: 'supply'
        }
    },
    scenarios: SCENARIOS,
    // Both curves are dragged sideways, so their params rise as the curve moves
    // right — and "right" is the word every syllabus uses for an increase.
    directionWords: {
        demand: { up: 'right', down: 'left' },
        supply: { up: 'right', down: 'left' }
    }
};

export const FOREIGN_EXCHANGE: StudyContent = defineLesson({
    id: 'fx',
    label: 'Exchange rates (AUD)',
    title: 'The Australian dollar, and what moves it',
    goals: [
        'Who buys Australian dollars, and who sells them',
        'Why the AUD rises and falls against the USD',
        'Four real-world cases to work out yourself'
    ],
    cover: {
        question: 'Why does the Australian dollar rise and fall?',
        hook: 'Every time the world buys Australian iron ore, a degree or a week on the Gold ' +
            'Coast, someone has to buy AUD to pay for it. Follow those trades and you can work ' +
            'out which way the AUD moves when the news changes.',
        picture: 'cover'
    },
    pictures: {
        cover: {
            name: 'An ore carrier leaving port',
            src: coverPicture,
            alt: 'An ore carrier loaded with iron ore leaving an Australian port, with a ' +
                'plane flying overhead.'
        },
        trade: {
            name: 'Who needs AUD',
            src: tradePicture,
            still: tradeStill,
            alt: 'Iron ore, beef, wine, degrees, holidays and shares leave Australia for buyers ' +
                'overseas, who swap USD for AUD to pay for them. Every AUD they need is part of ' +
                'the demand for AUD.'
        },
        rba: {
            name: 'A central bank announcement',
            src: rbaPicture,
            alt: 'An office tower in a city centre, with a percentage sign and an arrow pointing up.'
        }
    },
    asides: {
        rbaReport: {
            name: 'News report',
            headline: 'The RBA lifts the cash rate above US interest rates',
            body: 'Investors overseas buy Australian bonds to earn the higher return.',
            note: 'A made-up report, for this question',
            picture: 'rba'
        }
    },
    steps: FX_LESSON,
    model: MODEL
});

export const AUD_MARKET: StudyModel = FOREIGN_EXCHANGE.model;

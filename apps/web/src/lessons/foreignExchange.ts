import type { LessonStep } from '../track/track';
import type { Scenario } from '../dock/Scenarios';
import { explainable } from './content';
import type { StudyContent, StudyModel } from './content';
import coverPicture from './pictures/fx-cover.svg';
import tradePicture from './pictures/fx-trade.svg';
import tradeStill from './pictures/fx-trade-still.svg';
import rbaPicture from './pictures/fx-rba.svg';

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
 * The curves are written as quantity in terms of the rate — x as a function of y.
 *
 * That is not a stylistic choice. The engine says which way a curve moved by
 * sampling it along its own independent variable, so a line written as
 * `e = f(Q)` and pulled sideways reports that it moved *up* or *down* — and an
 * increase in the supply of AUD would be narrated as "supply of AUD shifts down",
 * which is literally true and teaches the wrong idiom. Written as `Q = f(e)`,
 * the curve is sampled at fixed rates, a shift is horizontal, and the strip
 * says "shifts to the right", which is how this is taught.
 *
 * `(y)` in parentheses because that is how the engine both recognises the
 * independent variable and substitutes into it to place a label.
 */
const demandAt = (q: string) => `${q} - 100*((y) - 0.65)`;
const supplyAt = (q: string) => `${q} + 100*((y) - 0.65)`;

/**
 * The same two curves on the USD side, where the price is AUD per USD — 1/e.
 *
 * The quantity axis stays in AUD, and that is what keeps this exact: the trades
 * are the same trades, counted in the same units, so a shift of 10 in one panel
 * is a shift of 10 in the other and the two equilibria are one equilibrium.
 * Counted in USD instead, the supply of USD bends backwards across most of this
 * range — a true property of a linear demand for AUD, and a terrible first
 * picture of a currency market.
 */
const usdSupplyAt = (q: string) => `${q} - 100*(1/(y) - 0.65)`;
const usdDemandAt = (q: string) => `${q} + 100*(1/(y) - 0.65)`;

/**
 * Sideways, because these curves move sideways.
 *
 * `horizontal` adds the drag's own `dx` to the param, and `dx` is measured in
 * the panel's quantity units — which is exactly how far a shift of the param
 * moves each curve, in either panel. `draggable` is what a committed answer
 * freezes, as in the first lesson.
 */
const dragging = (param: string) => [{ horizontal: param, draggable: 'not(params.submitted)' }];

/**
 * A curve's "before", as the first lesson draws it.
 *
 * The ghost is the one that carries a qualifier (`D_0`) so the live curve keeps
 * its letter, and it stands down while a question is on screen, where the
 * question's own start line is the "before" — see `startLine`.
 */
const GHOST = { show: 'not(params.asking)', label: '_0' };

const curve = (
    name: string, title: string, fn: string, color: string,
    label: { text: string; y: number }, drag: string
) => ({
    type: 'Curve',
    def: {
        name, title, fn,
        // Two intervals is a straight line exactly; the USD side is not straight
        // and gets the engine's default sampling instead.
        ...(fn.indexOf('1/(y)') < 0 ? { samplePoints: 2 } : {}),
        color, label,
        drag: dragging(drag),
        ghost: GHOST
    }
});

/**
 * Where a question found a curve, and where its answer would be.
 *
 * One pair per askable param, because this lesson asks about both curves. The
 * screen parks the pair belonging to the curve a question is *not* about on
 * that curve's own position, so the start line marks where it was if the
 * student reaches for the wrong one, and the answer line — gated on differing
 * from its start — has nothing to draw.
 *
 * Every question here asks direction only, so the answer line has no correct
 * position to show. What "Show me" draws on it is each question's
 * `illustrate`: the right curve, shifted the right way by an amount chosen for
 * the picture, which the grade never reads (P14).
 */
const startLine = (name: string, fn: string, color: string) => ({
    type: 'Curve',
    def: {
        name, fn, samplePoints: 2,
        color, lineStyle: 'dashed', strokeOpacity: 0.35,
        show: 'params.asking'
    }
});

const answerLine = (
    name: string, fn: string, color: string, label: { text: string; y: number },
    answer: string, start: string
) => ({
    type: 'Curve',
    def: {
        name, fn, samplePoints: 2,
        color, lineStyle: 'dotted', label,
        show: `params.revealed and (params.${answer} != params.${start})`
    }
});

const equilibrium = (panel: string, y: string, priceLabel: string) => ({
    type: 'Point',
    def: {
        name: 'equilibrium_' + panel, title: 'equilibrium',
        x: 'calcs.Qe', y,
        color: 'colors.equilibriumPrice',
        droplines: { vertical: 'Q^*', horizontal: priceLabel },
        srTitle: 'Equilibrium exchange rate',
        ghost: true
    }
});

/**
 * The x-axis is drawn at the bottom of the price range rather than at zero: no
 * exchange rate worth drawing is near zero, and an axis at 0 would sit below
 * the panel. `intercept` is where the x-axis crosses the y-axis, and the
 * droplines drop to it.
 */
const marketAxes = {
    xAxis: { title: 'Quantity of AUD traded', min: 0, max: 100, intercept: 0.4 },
    yAxis: { title: 'USD per AUD', min: 0.4, max: 0.9, tickPrecision: 2 }
};

const mirrorAxes = {
    xAxis: { title: 'Quantity traded (AUD)', min: 0, max: 100, intercept: 1 },
    yAxis: { title: 'AUD per USD', min: 1, max: 2.6, tickPrecision: 2 }
};

/** Where the market starts, and where every question starts from. */
const BASELINE = { demand: 50, supply: 50 };

/**
 * The lesson, in the order the slides take it.
 *
 * What a currency's price is and that it reads both ways, then the market that
 * sets it, then appreciation and depreciation as movements of that price, then
 * the student moving the curves themselves. The determinants arrive as the
 * reasons the curves move — the slides' four, tastes, incomes, relative prices
 * and interest rates, plus the one Australia cannot be taught without, the
 * price of what it digs up — with Australian examples where the slides had
 * American ones.
 *
 * Written for Year 10 to first-year students, and chunked twice: three parts,
 * and one idea per step. Each step has a short title that says the idea, then a
 * paragraph saying what happens and, where it helps, a second saying what it
 * means. A word is defined in the step that first uses it, in a key-term box,
 * and not again. Plain words first and the economics word second ("worth more
 * — it has appreciated"), contractions, and no sentence a student has to read
 * twice. Where the slides make two points on one slide, this makes them on two
 * steps: the shift, and then what the shift did to each currency.
 *
 * Every number a step states is one the diagram solves to at that step, and
 * `foreignExchange.test.tsx` holds each one to it — which is why a step never
 * quotes the rate it moved away from: the caption beside it shows only the
 * rate now.
 */
export const FX_LESSON: LessonStep[] = [
    // Who the buyers are, as a picture before they are a curve: the trades are
    // the idea, and a line on a pair of axes is a summary of trades nobody has
    // been shown yet. The diagram waits under the picture, and the next step
    // draws the demand curve on it.
    {
        part: 'Meet the market',
        picture: 'trade',
        title: 'Who wants Australian dollars?',
        say: 'People overseas need AUD to pay for what Australia sells: iron ore, beef, wine, a ' +
            'degree at an Australian university, a holiday on the Gold Coast. Investors need AUD ' +
            'to buy Australian shares and property.'
    },
    {
        reveal: ['demand_market'],
        title: 'Demand for AUD slopes down',
        say: 'The dearer the AUD, the more all of that costs them, so the less AUD they want. ' +
            'That\'s why the demand curve slopes down.',
        term: {
            word: 'Demand for AUD',
            meaning: 'How much AUD people want to buy at each exchange rate.'
        }
    },
    {
        reveal: ['supply_market'],
        title: 'Who sells Australian dollars?',
        say: 'Australians do, whenever they pay for something from overseas: imported phones ' +
            'and cars, a holiday in Bali, shares in an American company. To pay, they swap AUD ' +
            'for foreign currency.\n\n' +
            'The more USD each AUD buys, the better the deal, so the more AUD they\'re willing ' +
            'to sell. That\'s why the supply curve slopes up.',
        term: {
            word: 'Supply of AUD',
            meaning: 'How much AUD people want to sell for other currencies at each exchange rate.'
        }
    },
    {
        reveal: ['equilibrium_market'],
        title: 'The exchange rate',
        say: 'Where the curves cross, the amount of AUD people want to buy matches the amount ' +
            'they want to sell. That sets the price of the AUD: AUD 1 = USD 0.65.\n\n' +
            'Nobody chooses this number. The AUD floats, so the market sets its price, the same ' +
            'way it sets the price of anything else.',
        term: {
            word: 'Exchange rate',
            meaning: 'The price of one currency in another. Here, how many USD one AUD buys.'
        }
    },
    {
        reveal: ['mirror'],
        title: 'The same trades, from the US side',
        say: 'Anyone buying AUD with USD is also selling USD. So demand for AUD and the supply ' +
            'of USD are the same trades, and the second panel shows them from the American ' +
            'side.\n\n' +
            'Read that way round, the price is USD 1 = AUD 1.54.'
    },
    {
        part: 'When the AUD moves',
        set: { demand: 60 },
        title: 'Demand for AUD increases',
        say: 'Say iron ore prices soar. The world spends more on Australian ore, so it wants ' +
            'more AUD at every exchange rate.\n\n' +
            'The whole demand curve shifts to the right. Watch where the curves cross now.',
        term: {
            word: 'Shift',
            meaning: 'When something other than the exchange rate changes how much AUD people ' +
                'want, and the whole curve moves.'
        }
    },
    {
        title: 'The AUD appreciates',
        say: 'AUD 1 now buys USD 0.70, so the AUD has appreciated: it\'s worth more than before.\n\n' +
            'From the US side, USD 1 now costs AUD 1.43. The USD has depreciated: it\'s worth less.',
        term: {
            word: 'Appreciate and depreciate',
            meaning: 'A currency appreciates when it\'s worth more of another currency, and ' +
                'depreciates when it\'s worth less.'
        }
    },
    {
        set: { demand: 50 },
        title: 'Up is stronger, down is weaker',
        say: 'Up the price axis, the AUD appreciates. Down it, the AUD depreciates.\n\n' +
            'Iron ore prices settle, demand goes back to where it was, and so does the rate: ' +
            'AUD 1 = USD 0.65.'
    },
    {
        set: { supply: 60 },
        title: 'Supply of AUD increases',
        say: 'Now say Australians travel overseas in record numbers. Every trip means ' +
            'swapping AUD for foreign currency, so Australians sell more AUD at every exchange ' +
            'rate.\n\n' +
            'This time it\'s the supply curve that shifts to the right.'
    },
    {
        title: 'The AUD depreciates',
        say: 'AUD 1 now buys only USD 0.60, so the AUD has depreciated.\n\n' +
            'From the US side, USD 1 now costs AUD 1.67. The USD has appreciated.'
    },
    // The questions. Each starts from the baseline, both curves included: the
    // answer is marked from where the question began, so where it begins should
    // not depend on what the student did on the way — and a supply curve left
    // shifted from the step before would make a demand question about a
    // different market. Both are bounded only by their own ranges, so the
    // two-param update cannot pass through a state the diagram refuses.
    //
    // Direction only, deliberately. The slides' practice asks which way a curve
    // moves and what that does to the currency, never by how much; a target
    // would have the verdict tell a student that the RBA's decision "goes to
    // 60", which is a number this lesson made up. `illustrate` is the same
    // number put where it belongs instead — on the picture "Show me" draws, and
    // nowhere the grade looks.
    //
    // No prompt names its curve, because which curve moves is the first thing
    // the slides ask (P14). Each question offers both, in the same order every
    // time, so the order says nothing about the answer; the student is marked
    // on the choice and then on the direction, and told in words if they moved
    // the wrong one. That makes each scenario carry the reasoning, and each is
    // written to pin one curve: the RBA's "investors overseas buy Australian
    // bonds" is a demand for AUD, and the relative-prices question says
    // "Australians switch to imports" because the export side of the same
    // change would be a fair answer otherwise — and moves the other curve.
    //
    // `explain` is the reasoning, for after the question is finished: who needs
    // AUD or sells them, so which curve, which way, and what the rate does.
    {
        part: 'Your turn',
        set: { ...BASELINE },
        title: 'Interest rates rise',
        // The event is the report's, beside the diagram, so the card asks the
        // question and nothing else: one home for the news.
        aside: 'rbaReport',
        say: 'Read the news report next to the diagram.\n\n' +
            'Which curve moves, and which way? Move it, then press Check.',
        ask: {
            param: 'demand', direction: 'up', among: ['demand', 'supply'], illustrate: 10,
            explain: 'To buy Australian bonds, investors first need AUD. So demand for AUD ' +
                'increases, the demand curve shifts right, and the AUD appreciates.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'Prices rise faster in Australia',
        say: 'Prices in Australia rise faster than in the US. Imports now look cheap next to ' +
            'Australian-made goods, so Australians switch to imports.\n\n' +
            'Which curve moves, and which way?',
        ask: {
            param: 'supply', direction: 'up', among: ['demand', 'supply'], illustrate: 10,
            explain: 'To pay for imports, Australians sell AUD for foreign currency. So the ' +
                'supply of AUD increases, the supply curve shifts right, and the AUD depreciates.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'China buys less iron ore',
        say: 'China\'s steel mills cut production and buy less Australian iron ore.\n\n' +
            'Which curve moves, and which way?',
        ask: {
            param: 'demand', direction: 'down', among: ['demand', 'supply'], illustrate: 10,
            explain: 'Less ore bought means less AUD needed to pay for it. So demand for AUD ' +
                'decreases, the demand curve shifts left, and the AUD depreciates.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'Australians spend less overseas',
        say: 'In a downturn, Australians buy fewer imported cars and holiday at home instead.\n\n' +
            'Which curve moves, and which way?',
        ask: {
            param: 'supply', direction: 'down', among: ['demand', 'supply'], illustrate: 10,
            explain: 'Fewer imports and trips abroad mean less AUD swapped for foreign ' +
                'currency. So the supply of AUD decreases, the supply curve shifts left, and ' +
                'the AUD appreciates.'
        }
    },
    // The rule the four cases were instances of, said once, on the stage under
    // the cases themselves — and so not on the card as well.
    {
        set: { ...BASELINE },
        title: 'Over to you',
        say: 'Here\'s how you went on the four cases.\n\n' +
            'Press Finish to try more real-world cases in Scenarios, or to drag the curves ' +
            'yourself.',
        recap: {
            takeaway: 'Anything that changes how much AUD the world wants to buy, or how much AUD ' +
                'Australians want to sell, moves the exchange rate: more demand or less supply ' +
                'and the AUD appreciates, the reverse and it depreciates.'
        }
    }
];

const calcs = {
    rate: '0.65 + (params.demand - params.supply)/200',
    inverse: '1/calcs.rate',
    Qe: '(params.demand + params.supply)/2',
    dRate: 'calcs.rate - prev.calcs.rate',
    dInverse: 'calcs.inverse - prev.calcs.inverse'
};

/** Bounded like the curve each one draws. */
const apparatusParam = (name: string) =>
    ({ name, value: 50, min: 30, max: 70, round: 2, presentation: true });

export const fxDiagram = {
    schema: 'EconSchema',

    params: [
        // From 30 to 70, which keeps the clearing rate between USD 0.45 and
        // USD 0.85 and every curve inside the panel at both ends of its range.
        //
        // In steps of 2, because a step of 2 is a cent on the rate. A step of
        // 1 moved it half a cent, which a rate quoted to the cent shows as no
        // change at all every other step — an arrow key that moved the curve
        // and left the rate, the caption and the strip saying nothing happened.
        // It also keeps Q* = (demand + supply)/2 a whole number.
        { name: 'demand', label: 'Demand for AUD', value: 50, min: 30, max: 70, round: 2 },
        { name: 'supply', label: 'Supply of AUD', value: 50, min: 30, max: 70, round: 2 },

        // The question apparatus, as in the first lesson — and, as there, every
        // one of these is `presentation`, or arming a question would raise the
        // ghost of a curve nobody touched.
        { name: 'asking', value: 0, min: 0, max: 1, round: 1, presentation: true },
        { name: 'submitted', value: 0, min: 0, max: 1, round: 1, presentation: true },
        { name: 'revealed', value: 0, min: 0, max: 1, round: 1, presentation: true },
        apparatusParam('startDemand'),
        apparatusParam('answerDemand'),
        apparatusParam('startSupply'),
        apparatusParam('answerSupply')
    ],

    calcs,

    layout: {
        CustomLayout: {
            panels: [
                {
                    key: 'market',
                    ...marketAxes,
                    objects: [
                        curve('demand_market', 'demand for AUD', demandAt('params.demand'),
                            'colors.demand', { text: 'D', y: 0.47 }, 'demand'),
                        curve('supply_market', 'supply of AUD', supplyAt('params.supply'),
                            'colors.supply', { text: 'S', y: 0.86 }, 'supply'),
                        startLine('questionStartDemand', demandAt('params.startDemand'), 'colors.demand'),
                        startLine('questionStartSupply', supplyAt('params.startSupply'), 'colors.supply'),
                        answerLine('questionAnswerDemand', demandAt('params.answerDemand'),
                            'colors.demand', { text: 'D_1', y: 0.47 }, 'answerDemand', 'startDemand'),
                        answerLine('questionAnswerSupply', supplyAt('params.answerSupply'),
                            'colors.supply', { text: 'S_1', y: 0.86 }, 'answerSupply', 'startSupply'),
                        equilibrium('market', 'calcs.rate', 'e^*')
                    ]
                },
                {
                    key: 'mirror',
                    ...mirrorAxes,
                    objects: [
                        // Demand is blue and supply orange here too, as on
                        // every chart: the supply of USD is orange though it is
                        // the same trades as the blue demand for AUD. The
                        // lesson's words make that link, not the colour.
                        curve('usdSupply_mirror', 'supply of USD', usdSupplyAt('params.demand'),
                            'colors.supply', { text: 'S', y: 2.35 }, 'demand'),
                        curve('usdDemand_mirror', 'demand for USD', usdDemandAt('params.supply'),
                            'colors.demand', { text: 'D', y: 1.2 }, 'supply'),
                        equilibrium('mirror', 'calcs.inverse', '1/e^*')
                    ]
                }
            ]
        }
    }
};

/**
 * Which panel headlines what. A rate in each, each in the other's currency.
 *
 * The names are short because the numbers beside them are long. A caption is
 * one line — name, rate, change — and "AUD 1 = USD 0.70 ▲ USD 0.05" is wider than
 * any number the stage's caption room was measured against, so in the grid a
 * longer name ("Market for AUD") was squeezed to "Marke…".
 */
const PANELS = [
    { key: 'market', name: 'AUD market', headline: 'rate', delta: 'dRate' },
    { key: 'mirror', name: 'USD market', headline: 'inverse', delta: 'dInverse' }
] as const;

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
export const AUD_MARKET: StudyModel = {
    id: 'aud',
    name: 'The market for the Australian dollar',
    diagram: fxDiagram,
    panels: PANELS,
    narratedCalcs: NARRATED_CALCS,
    explainedCalcs: explainable(calcs),
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
    questionApparatus: {
        demand: { start: 'startDemand', answer: 'answerDemand' },
        supply: { start: 'startSupply', answer: 'answerSupply' }
    },
    scenarios: SCENARIOS,
    // Both curves are dragged sideways, so their params rise as the curve moves
    // right — and "right" is the word every syllabus uses for an increase.
    directionWords: {
        demand: { up: 'right', down: 'left' },
        supply: { up: 'right', down: 'left' }
    }
};

export const FOREIGN_EXCHANGE: StudyContent = {
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
    lesson: FX_LESSON,
    model: AUD_MARKET
};

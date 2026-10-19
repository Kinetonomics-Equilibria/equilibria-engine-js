import type { LessonStep } from '../track/track';
import type { Scenario } from '../dock/Scenarios';
import { explainable } from './content';
import type { StudyContent } from './content';

/**
 * The market for the Australian dollar, for Australian students.
 *
 * The A$ is the reference currency, quoted the way the RBA and every news
 * bulletin quotes it: the price of A$1 in US dollars. So "up" on the price axis
 * is the A$ appreciating, and the curves are the demand for and supply of A$ —
 * the world buying Australian exports and assets, and Australians buying
 * imports and assets abroad.
 *
 * Two panels, one engine. The second is the same trades seen from the American
 * side, which is the idea the teaching slides return to on every determinant
 * ("the dollar appreciates, the pound depreciates"): whoever buys A$ pays in
 * US$, so demand for A$ *is* the supply of US$, and the price of US$1 is the
 * reciprocal of the price of A$1. Nothing synchronises the two panels; they are
 * drawn from the same two params.
 *
 * The model, in A$ billion traded at an exchange rate e (US$ per A$):
 *
 *     demand for A$   Q = demand − 100·(e − 0.65)
 *     supply of A$    Q = supply + 100·(e − 0.65)
 *
 * so the market clears at e* = 0.65 + (demand − supply)/200 and
 * Q* = (demand + supply)/2. `demand` and `supply` are each curve's quantity at
 * US$0.65: a shift of 10 moves the rate five US cents, which is a move a
 * student can see and a size the A$ has moved by in a season more than once.
 */

/**
 * The curves are written as quantity in terms of the rate — x as a function of y.
 *
 * That is not a stylistic choice. The engine says which way a curve moved by
 * sampling it along its own independent variable, so a line written as
 * `e = f(Q)` and pulled sideways reports that it moved *up* or *down* — and an
 * increase in the supply of A$ would be narrated as "supply of A$ shifts down",
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
 * The same two curves on the US$ side, where the price is A$ per US$ — 1/e.
 *
 * The quantity axis stays in A$, and that is what keeps this exact: the trades
 * are the same trades, counted in the same units, so a shift of 10 in one panel
 * is a shift of 10 in the other and the two equilibria are one equilibrium.
 * Counted in US$ instead, the supply of US$ bends backwards across most of this
 * range — a true property of a linear demand for A$, and a terrible first
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
        // Two intervals is a straight line exactly; the US$ side is not straight
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
 * Axis titles are typeset inside `\text{}`, where a bare `$` would open maths.
 *
 * The x-axis is drawn at the bottom of the price range rather than at zero: no
 * exchange rate worth drawing is near zero, and an axis at 0 would sit below
 * the panel. `intercept` is where the x-axis crosses the y-axis, and the
 * droplines drop to it.
 */
const marketAxes = {
    xAxis: { title: 'Quantity of A\\$ traded', min: 0, max: 100, intercept: 0.4 },
    yAxis: { title: 'US\\$ per A\\$', min: 0.4, max: 0.9, tickPrecision: 2 }
};

const mirrorAxes = {
    xAxis: { title: 'Quantity traded (A\\$)', min: 0, max: 100, intercept: 1 },
    yAxis: { title: 'A\\$ per US\\$', min: 1, max: 2.6, tickPrecision: 2 }
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
 * One idea per step, and one line per idea. A step's sentence is shown in the
 * narration strip, which is one line that never grows — a strip that grew would
 * take height from the stage and rebuild the engine — so a sentence longer than
 * the strip is cut off at an ellipsis. About 110 characters fits at 1280px. Where
 * the slides make two points on one slide, this makes them on two steps: the
 * shift, and then what the shift did to each currency.
 *
 * Every number a sentence states is one the diagram solves to at that step,
 * and `foreignExchange.test.tsx` holds each sentence to it.
 */
export const FX_LESSON: LessonStep[] = [
    {
        reveal: ['demand_market'],
        say: 'Demand for A$: the world buying Australian exports and assets, paid in A$. ' +
            'The dearer the A$, the less it wants.'
    },
    {
        reveal: ['supply_market'],
        say: 'Supply of A$: Australians selling A$ to pay for imports, travel and assets ' +
            'abroad — more as each A$ buys more.'
    },
    {
        reveal: ['equilibrium_market'],
        say: 'Where they meet is the exchange rate: A$1 = US$0.65. The A$ floats, so the ' +
            'market sets it, like any price.'
    },
    {
        reveal: ['mirror'],
        say: 'Buying A$ means selling US$, so demand for A$ is the supply of US$. Read the ' +
            'other way: US$1 = A$1.54.'
    },
    {
        set: { demand: 60 },
        say: 'Iron ore prices soar, so the world wants more A$ at every rate: demand for ' +
            'A$ shifts right.'
    },
    {
        say: 'A$1 now buys US$0.70: the A$ has appreciated. And US$1 costs A$1.43: the US$ ' +
            'has depreciated.'
    },
    {
        set: { demand: 50 },
        say: 'Up the price axis the A$ appreciates; down it, the A$ depreciates. Back to ' +
            'A$1 = US$0.65.'
    },
    {
        set: { supply: 60 },
        say: 'Australians holiday abroad in record numbers, selling A$: supply of A$ shifts ' +
            'right.'
    },
    {
        say: 'A$1 buys only US$0.60: the A$ has depreciated. US$1 now costs A$1.67: the US$ ' +
            'has appreciated.'
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
    // would have the verdict tell a student that the RBA's decision "belongs at
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
    // bonds" is a demand for A$, and the relative-prices question says
    // "Australians switch to imports" because the export side of the same
    // change would be a fair answer otherwise — and moves the other curve.
    //
    // A prompt is in the question row, which wraps, so these may run longer
    // than a step's sentence.
    {
        set: { ...BASELINE },
        say: 'Your turn. The RBA lifts the cash rate above US rates, and investors overseas ' +
            'buy Australian bonds. Which curve moves, and which way? Move it, then check.',
        ask: { param: 'demand', direction: 'up', among: ['demand', 'supply'], illustrate: 10 }
    },
    {
        set: { ...BASELINE },
        say: 'Prices in Australia rise faster than in the US, and Australians switch to ' +
            'imports that now look cheap. Which curve moves, and which way?',
        ask: { param: 'supply', direction: 'up', among: ['demand', 'supply'], illustrate: 10 }
    },
    {
        set: { ...BASELINE },
        say: 'China\'s steel mills cut output and buy less Australian iron ore. Which curve ' +
            'moves, and which way?',
        ask: { param: 'demand', direction: 'down', among: ['demand', 'supply'], illustrate: 10 }
    },
    {
        set: { ...BASELINE },
        say: 'In a downturn, Australians buy fewer imported cars and holiday at home. Which ' +
            'curve moves, and which way?',
        ask: { param: 'supply', direction: 'down', among: ['demand', 'supply'], illustrate: 10 }
    },
    {
        set: { ...BASELINE },
        say: 'Anything that changes how many A$ the world wants, or Australians sell, moves ' +
            'the rate. The market is yours.'
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

    steps: FX_LESSON,

    params: [
        // From 30 to 70, which keeps the clearing rate between US$0.45 and
        // US$0.85 and every curve inside the panel at both ends of its range.
        //
        // In steps of 2, because a step of 2 is a cent on the rate. A step of
        // 1 moved it half a cent, which a rate quoted to the cent shows as no
        // change at all every other step — an arrow key that moved the curve
        // and left the rate, the caption and the strip saying nothing happened.
        // It also keeps Q* = (demand + supply)/2 a whole number.
        { name: 'demand', label: 'Demand for A$', value: 50, min: 30, max: 70, round: 2 },
        { name: 'supply', label: 'Supply of A$', value: 50, min: 30, max: 70, round: 2 },

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
                        curve('demand_market', 'demand for A$', demandAt('params.demand'),
                            'colors.demand', { text: 'D', y: 0.47 }, 'demand'),
                        curve('supply_market', 'supply of A$', supplyAt('params.supply'),
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
                        // Blue and orange mean the same people in both panels:
                        // blue is the world buying A$ with US$, orange is
                        // Australians selling A$ for US$. Only the names change.
                        curve('usdSupply_mirror', 'supply of US$', usdSupplyAt('params.demand'),
                            'colors.demand', { text: 'S', y: 2.35 }, 'demand'),
                        curve('usdDemand_mirror', 'demand for US$', usdDemandAt('params.supply'),
                            'colors.supply', { text: 'D', y: 1.2 }, 'supply'),
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
 * one line — name, rate, change — and "A$1 = US$0.70 ▲ US$0.05" is wider than
 * any number the stage's caption room was measured against, so in the grid a
 * longer name ("Market for A$") was squeezed to "Marke…".
 */
const PANELS = [
    { key: 'market', name: 'A$ market', headline: 'rate', delta: 'dRate' },
    { key: 'mirror', name: 'US$ market', headline: 'inverse', delta: 'dInverse' }
] as const;

/**
 * The numbers the strip reports, and what they are called everywhere.
 *
 * Written the way an exchange rate is written — "A$1 = US$0.65" — and to the
 * cent, because that is how a rate is quoted. The caption, its chip and the
 * strip then read "A$1 = US$0.65 → US$0.70" without anyone formatting a rate
 * twice.
 */
const NARRATED_CALCS = [
    { name: 'rate', label: 'A$1 =', unit: 'US$', precision: 2 },
    { name: 'inverse', label: 'US$1 =', unit: 'A$', precision: 2 },
    { name: 'Qe', label: 'Q*', precision: 0 }
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
        description: 'China pays more for Australian iron ore, and pays in A$: demand for A$ rises.',
        params: { demand: 60 }
    },
    {
        id: 'rba',
        label: 'RBA lifts the cash rate',
        description: 'Higher Australian interest rates draw investors overseas into A$ bonds: demand for A$ rises.',
        params: { demand: 60 }
    },
    {
        id: 'china-slows',
        label: 'China\'s economy slows',
        description: 'Less steel, less iron ore and coal bought from Australia: demand for A$ falls.',
        params: { demand: 40 }
    },
    {
        id: 'holidays',
        label: 'Australians holiday abroad',
        description: 'Holiday money means selling A$ for foreign currency: supply of A$ rises.',
        params: { supply: 60 }
    },
    {
        id: 'inflation',
        label: 'Australian prices rise faster',
        description: 'Imports look cheap beside dearer local goods, so Australians buy more of them: supply of A$ rises.',
        params: { supply: 60 }
    },
    {
        id: 'fed',
        label: 'US Fed lifts its rates',
        description: 'Australian savers move money into US bonds, selling A$ to do it: supply of A$ rises.',
        params: { supply: 60 }
    },
    {
        id: 'imports-fall',
        label: 'Australians buy fewer imports',
        description: 'Fewer imported cars and phones means fewer A$ sold for US$: supply of A$ falls.',
        params: { supply: 40 }
    },
    {
        id: 'baseline',
        label: 'Back to A$1 = US$0.65',
        params: { ...BASELINE }
    }
];

export const FOREIGN_EXCHANGE: StudyContent = {
    id: 'fx',
    label: 'Exchange rates (A$)',
    title: 'The Australian dollar, and what moves it',
    intro: 'Step through the lesson below, or drag a curve at any point. The price is what ' +
        'A$1 costs in US dollars; the second panel is the same trades seen from the US side.',
    diagram: fxDiagram,
    lesson: FX_LESSON,
    panels: PANELS,
    narratedCalcs: NARRATED_CALCS,
    explainedCalcs: explainable(calcs),
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

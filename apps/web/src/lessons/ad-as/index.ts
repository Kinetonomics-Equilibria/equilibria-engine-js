import type { Scenario } from '../../dock/Scenarios';
import { defineModel } from '../kit/lesson';
import type { StudyModel } from '../content';
import { CALCS, PANELS, PARAMS } from './chart';

/**
 * Aggregate demand and supply, with the Phillips curve, the business cycle
 * and the production possibility curve beside it: one economy, four views.
 *
 * In the Playground only, for now, so it is a model with no lesson: its topic
 * lists it (`LessonTopic.models`). A lesson drawn on it later lists it by
 * itself, and its steps go to `defineLesson` with this model.
 *
 * Brought in from a D3 page with sliders and a readout. The readout's four
 * numbers are the panels' captions now, and its colours for a gap above and
 * below potential are gone: a number never gets a verdict colour
 * (docs/design.md). The Strait of Hormuz scenario is a scenario here, with
 * the RBA's response as another, so a student can make the closure and then
 * the rate rise, and see what each does.
 *
 * Its numbers are Australia's, roughly, in the rates the ABS and the RBA
 * report: GDP growing 3.4% a year, inflation at 2.5%, the middle of the RBA's
 * target, and unemployment at 4.5%. They were an index once, which no
 * student had seen anywhere else.
 */

/** Where the model starts: GDP growing at its potential rate, on the falling half of the cycle. */
export const BASELINE = { demand: 3.4, supply: 3.4, potential: 3.4, expanding: 0 };

/**
 * The numbers the strip reports, and what they are called everywhere. GDP
 * growth first, as the effect of every move, then the two a central bank
 * watches, then the gap between GDP growth and potential growth, and the
 * pieces the Maths tab builds unemployment from.
 *
 * A percentage says so in its label, since a unit goes in front of its
 * number: "Inflation (%) 2.5".
 */
const NARRATED_CALCS = [
    {
        name: 'gdpGrowth', label: 'GDP growth (%)', tex: '\\text{GDP growth}', precision: 1,
        meaning: 'The rise in real GDP over the year, as a percentage, where aggregate demand meets short-run aggregate supply',
        rise: 'GDP growth rises', fall: 'GDP growth falls'
    },
    {
        name: 'inflation', label: 'Inflation (%)', tex: '\\pi', precision: 1,
        meaning: 'The rise in the consumer price index (CPI) over the year, as a percentage',
        rise: 'Inflation rises', fall: 'Inflation falls'
    },
    {
        name: 'unemployment', label: 'Unemployment (%)', tex: 'U', precision: 1,
        meaning: 'The share of the labour force without a job, as a percentage',
        rise: 'Unemployment rises', fall: 'Unemployment falls'
    },
    {
        name: 'gap', label: 'Growth gap', tex: '\\text{Growth gap}', precision: 1,
        meaning: 'GDP growth minus potential growth, in percentage points'
    },
    {
        name: 'cyclical', label: 'Cyclical unemployment (%)', tex: '\\text{Cyclical}', precision: 1,
        meaning: 'Unemployment minus the natural rate, which rises as GDP growth falls below potential growth'
    },
    {
        name: 'natural', label: 'Natural rate (%)', tex: '\\text{Natural}', precision: 1,
        meaning: 'The natural rate of unemployment, when GDP grows at its potential rate',
        rise: 'The natural rate of unemployment rises', fall: 'The natural rate of unemployment falls'
    }
];

/**
 * Shocks an Australian student hears about, each moving one curve and saying
 * which in its own words, so two can be combined: the Strait of Hormuz and
 * then the RBA is the stagflation and the central bank's answer to it, which
 * takes inflation back to 2.5% and GDP growth down to 1.4%.
 */
const SCENARIOS: Scenario[] = [
    {
        id: 'hormuz',
        label: 'The Strait of Hormuz closes',
        description: 'A war cuts Australia\'s diesel imports, so fuel costs more for every firm. ' +
            'Short-run aggregate supply decreases.',
        params: { supply: 1.4 }
    },
    {
        id: 'rba',
        label: 'The RBA raises the cash rate',
        description: 'Loans cost more, so households and firms spend less. Aggregate demand decreases.',
        params: { demand: 1.4 }
    },
    {
        id: 'infrastructure',
        label: 'The government builds more roads',
        description: 'The government spends more on Australian workers and materials. Aggregate demand increases.',
        params: { demand: 5.4 }
    },
    {
        id: 'oil-falls',
        label: 'Oil prices fall',
        description: 'Fuel costs less for every firm, so firms produce more at every inflation rate. ' +
            'Short-run aggregate supply increases.',
        params: { supply: 5.4 }
    },
    {
        id: 'migration',
        label: 'More skilled workers arrive',
        description: 'More skilled migrants join the workforce each year, so the economy can grow faster at full ' +
            'employment. Potential growth rises.',
        params: { potential: 4.2 }
    },
    { id: 'baseline', label: 'Back to potential growth', params: { ...BASELINE } }
];

export const AGGREGATE_DEMAND_AND_SUPPLY: StudyModel = defineModel({
    id: 'ad-as',
    name: 'Aggregate demand and supply',
    params: PARAMS,
    calcs: CALCS,
    panels: PANELS,
    narratedCalcs: NARRATED_CALCS,
    // The levels, and none of what the later panels are drawn from: where on
    // the cycle the economy is and how far out the PPC reaches are pictures
    // of GDP growth and potential growth, not more of the model.
    explainedCalcs: {
        gdpGrowth: CALCS.gdpGrowth,
        inflation: CALCS.inflation,
        gap: CALCS.gap,
        natural: CALCS.natural,
        cyclical: CALCS.cyclical,
        unemployment: CALCS.unemployment
    },
    paramMeanings: {
        demand: 'GDP growth that buyers want at an inflation rate of 2.5%',
        supply: 'GDP growth that firms offer at an inflation rate of 2.5%, before potential growth changes',
        potential: 'GDP growth when the economy\'s workers and capital are fully employed'
    },
    // Each answerable with the controls: a fall in supply, a fall in demand,
    // and a rise in potential growth or supply.
    explorePrompts: [
        'How can inflation and unemployment rise at the same time?',
        'What moves the production point inside the production possibility curve, and what happens to unemployment?',
        'How can GDP grow faster without inflation rising?'
    ],
    paramWords: {
        demand: {
            about: 'Households, firms, the government and buyers overseas, spending on Australian goods and services.',
            rise: 'Aggregate demand increases',
            fall: 'Aggregate demand decreases',
            curve: 'demand',
            because: {
                rise: 'At the old inflation rate, buyers now want more than firms produce, so firms raise ' +
                    'output faster and prices rise faster until the two match again.',
                fall: 'At the old inflation rate, firms now produce more than buyers want, so firms raise ' +
                    'output more slowly and prices rise more slowly until the two match again.'
            }
        },
        supply: {
            about: 'Firms across Australia, and what it costs them to produce.',
            rise: 'Short-run aggregate supply increases',
            fall: 'Short-run aggregate supply decreases',
            curve: 'supply',
            because: {
                rise: 'At the old inflation rate, firms now offer more than buyers want, so prices rise more ' +
                    'slowly until buyers take what firms produce.',
                fall: 'At the old inflation rate, firms now offer less than buyers want, so prices rise faster ' +
                    'until buyers want only what firms produce.'
            }
        },
        potential: {
            about: 'How fast the economy can grow with its workers, capital and technology fully employed.',
            rise: 'Potential growth rises',
            fall: 'Potential growth falls',
            curve: 'potential',
            because: {
                rise: 'The economy can grow faster at every inflation rate, so firms offer more than buyers ' +
                    'want and prices rise more slowly until the two match again.',
                fall: 'The economy can grow only more slowly at every inflation rate, so firms offer less than ' +
                    'buyers want and prices rise faster until the two match again.'
            }
        },
        expanding: {
            about: 'The half of the business cycle the economy is on. GDP growth speeds up in an expansion and slows in a contraction.',
            rise: 'The economy moves into an expansion',
            fall: 'The economy moves into a contraction'
        }
    },
    scenarios: SCENARIOS,
    // The three curves are dragged sideways, so their params rise as the
    // curve moves right.
    directionWords: {
        demand: { up: 'right', down: 'left' },
        supply: { up: 'right', down: 'left' },
        potential: { up: 'right', down: 'left' }
    }
});

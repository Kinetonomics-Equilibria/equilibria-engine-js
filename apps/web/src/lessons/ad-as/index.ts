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
 */

/** Where the model starts: at potential GDP, on the falling half of the cycle. */
export const BASELINE = { demand: 104, supply: 104, potential: 104, expanding: 0 };

/**
 * The numbers the strip reports, and what they are called everywhere. Real
 * GDP first, as the effect of every move, then the two a central bank
 * watches, then the gap between real and potential GDP, and the pieces the
 * Maths tab builds unemployment from.
 *
 * A percentage says so in its label, since a unit goes in front of its
 * number: "Inflation (%) 4.0".
 */
const NARRATED_CALCS = [
    {
        name: 'realGdp', label: 'Real GDP', tex: 'Y', precision: 1,
        meaning: 'Real GDP, where aggregate demand meets short-run aggregate supply',
        rise: 'Real GDP rises', fall: 'Real GDP falls'
    },
    {
        name: 'inflation', label: 'Inflation (%)', tex: '\\pi', precision: 1,
        meaning: 'The rise in the price level since last year, as a percentage',
        rise: 'Inflation rises', fall: 'Inflation falls'
    },
    {
        name: 'unemployment', label: 'Unemployment (%)', tex: 'U', precision: 1,
        meaning: 'The share of the labour force without a job, as a percentage',
        rise: 'Unemployment rises', fall: 'Unemployment falls'
    },
    {
        name: 'gap', label: 'Output gap', tex: '\\text{Output gap}', precision: 1,
        meaning: 'Real GDP minus potential GDP'
    },
    {
        name: 'level', label: 'Price level', tex: '\\text{PL}', precision: 1,
        meaning: 'The price level, where last year\'s was 100',
        rise: 'The price level rises', fall: 'The price level falls'
    },
    {
        name: 'cyclical', label: 'Cyclical unemployment (%)', tex: '\\text{Cyclical}', precision: 1,
        meaning: 'Unemployment minus the natural rate, which rises as real GDP falls below potential GDP'
    },
    {
        name: 'natural', label: 'Natural rate (%)', tex: '\\text{Natural}', precision: 1,
        meaning: 'The natural rate of unemployment, when real GDP is at potential GDP',
        rise: 'The natural rate of unemployment rises', fall: 'The natural rate of unemployment falls'
    }
];

/**
 * Shocks an Australian student hears about, each moving one curve and saying
 * which in its own words, so two can be combined: the Strait of Hormuz and
 * then the RBA is the stagflation and the central bank's answer to it.
 */
const SCENARIOS: Scenario[] = [
    {
        id: 'hormuz',
        label: 'The Strait of Hormuz closes',
        description: 'A war cuts Australia\'s diesel imports, so fuel costs more for every firm. ' +
            'Short-run aggregate supply decreases.',
        params: { supply: 102 }
    },
    {
        id: 'rba',
        label: 'The RBA raises the cash rate',
        description: 'Loans cost more, so households and firms spend less. Aggregate demand decreases.',
        params: { demand: 102 }
    },
    {
        id: 'infrastructure',
        label: 'The government builds more roads',
        description: 'The government spends more on Australian workers and materials. Aggregate demand increases.',
        params: { demand: 106 }
    },
    {
        id: 'oil-falls',
        label: 'Oil prices fall',
        description: 'Fuel costs less for every firm, so firms produce more at every price level. ' +
            'Short-run aggregate supply increases.',
        params: { supply: 106 }
    },
    {
        id: 'migration',
        label: 'More skilled workers arrive',
        description: 'Skilled migrants join the workforce, so the economy can produce more at full employment. ' +
            'Potential GDP increases.',
        params: { potential: 106 }
    },
    { id: 'baseline', label: 'Back to potential GDP', params: { ...BASELINE } }
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
    // of real GDP and potential GDP, not more of the model.
    explainedCalcs: {
        realGdp: CALCS.realGdp,
        level: CALCS.level,
        inflation: CALCS.inflation,
        gap: CALCS.gap,
        natural: CALCS.natural,
        cyclical: CALCS.cyclical,
        unemployment: CALCS.unemployment
    },
    paramMeanings: {
        demand: 'Real GDP that buyers want at a price level of 104',
        supply: 'Real GDP that firms offer at a price level of 104, before potential GDP changes',
        potential: 'Real GDP when the economy\'s workers and capital are fully employed'
    },
    // Each answerable with the controls: a fall in supply, a fall in demand,
    // and a rise in potential GDP or supply.
    explorePrompts: [
        'How can inflation and unemployment rise at the same time?',
        'What moves the production point inside the production possibility curve, and what happens to unemployment?',
        'How can real GDP grow without the price level rising?'
    ],
    paramWords: {
        demand: {
            about: 'Households, firms, the government and buyers overseas, spending on Australian goods and services.',
            rise: 'Aggregate demand increases',
            fall: 'Aggregate demand decreases',
            curve: 'demand',
            because: {
                rise: 'At the old price level, buyers now want more than firms produce, so firms raise ' +
                    'output and prices until the two match again.',
                fall: 'At the old price level, firms now produce more than buyers want, so firms cut ' +
                    'output and prices until the two match again.'
            }
        },
        supply: {
            about: 'Firms across Australia, and what it costs them to produce.',
            rise: 'Short-run aggregate supply increases',
            fall: 'Short-run aggregate supply decreases',
            curve: 'supply',
            because: {
                rise: 'At the old price level, firms now offer more than buyers want, so prices fall ' +
                    'until buyers take what firms produce.',
                fall: 'At the old price level, firms now offer less than buyers want, so prices rise ' +
                    'until buyers want only what firms produce.'
            }
        },
        potential: {
            about: 'What the economy can produce with its workers, capital and technology fully employed.',
            rise: 'Potential GDP increases',
            fall: 'Potential GDP decreases',
            curve: 'potential',
            because: {
                rise: 'The economy can produce more at every price level, so firms offer more than buyers ' +
                    'want and prices fall until the two match again.',
                fall: 'The economy can produce less at every price level, so firms offer less than buyers ' +
                    'want and prices rise until the two match again.'
            }
        },
        expanding: {
            about: 'The half of the business cycle the economy is on. Real GDP rises in an expansion and falls in a contraction.',
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

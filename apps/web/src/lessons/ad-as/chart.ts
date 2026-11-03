import { axis, axisValue, contextArea, curve, equilibrium } from '../kit/chart';
import { UNLESS_ASKING } from '../kit/question';
import type { ParamDefinition, PanelDefinition } from '../kit/lesson';

/**
 * Aggregate demand and supply, and three views of the one economy it solves:
 * the Phillips curve, the business cycle and the production possibility
 * curve. Four panels, drawn from the same params, so a shock dragged on one
 * moves all four.
 *
 * The model, in GDP growth g and inflation π, each a percentage a year, as
 * the ABS reports them:
 *
 *     aggregate demand              g = demand + (2.5 − π)
 *     short-run aggregate supply    g = supply + shift + (π − 2.5)
 *     long-run aggregate supply     g = potential
 *
 * with shift = potential − 3.4, so faster potential growth shifts short-run
 * supply with it. `demand` and `supply` are each curve's GDP growth at
 * inflation of 2.5%, the middle of the RBA's target, where the model starts.
 * The economy is where AD meets SRAS:
 *
 *     g = (demand + supply + potential − 3.4) / 2
 *     π = demand + 2.5 − g
 *
 * The growth gap is g − potential, and every point of it below potential is
 * half a point of cyclical unemployment (Okun's law, at a slope of a half),
 * on top of a natural rate of 4.5%, which falls half a point for each point
 * potential growth rises. The short-run Phillips curve is the same economy
 * against unemployment U: inflation = 2.5 − (supply − 3.4) + 2·(natural − U),
 * so a fall in supply shifts it up as it shifts SRAS to the left.
 *
 * It starts where Australia's economy roughly is in a good year: GDP growing
 * 3.4% a year, inflation at 2.5% and unemployment at 4.5%. Growth is 3.4%,
 * not 3.5%, because a param moves in multiples of its step, 0.2, from zero.
 */

/** GDP growth, inflation and unemployment where the model starts, each a percentage. */
const GROWTH = 3.4;
const INFLATION = 2.5;
const NATURAL = 4.5;

/**
 * The params a student moves.
 *
 * Demand and supply from 1.4 to 5.4, and potential from 2.6 to 4.2, which
 * keeps GDP growth between 1% and 5.8%, inflation between 0.1% and 4.9%, the
 * growth gap within 2.4 either way and unemployment between 3.3% and 5.7%:
 * numbers Australia has seen. The business cycle swings as far as the gap,
 * so its trough stays above zero growth.
 *
 * In steps of 0.2, because a step moves GDP growth and inflation 0.1, which
 * is what their captions print.
 *
 * `expanding` is the business cycle's phase: which half of the cycle the
 * economy is on, with GDP growth at the height the other three set. A switch,
 * and nothing else reads it.
 */
export const PARAMS: ParamDefinition[] = [
    { name: 'demand', label: 'Aggregate demand', value: GROWTH, min: 1.4, max: 5.4, round: 0.2, precision: 1 },
    { name: 'supply', label: 'Short-run aggregate supply', value: GROWTH, min: 1.4, max: 5.4, round: 0.2, precision: 1 },
    { name: 'potential', label: 'Potential growth', value: GROWTH, min: 2.6, max: 4.2, round: 0.2, precision: 1 },
    { name: 'expanding', label: 'Expansion', value: 0, min: 0, max: 1, round: 1, isBoolean: true }
];

/**
 * A cycle ten units of time long, in radians (π/5 a unit), and back (5/π),
 * written out as the café's quarter turn is.
 */
const TO_RADIANS = 0.6283185307179586;
const TO_TIME = 1.5915494309189535;

/**
 * The business cycle's time axis: a cycle and a half, from potential growth
 * rising to a peak at 2.5, down to a trough at 7.5, up to a peak at 12.5 and
 * down to potential again at 15. The economy is always between the two
 * peaks, so the ends are free for the curve's label and potential growth's.
 */
const FIRST_PEAK = 2.5;
const LAST_PEAK = 12.5;
const TIME_AXIS = 15;

/** A quarter turn, for the PPC as a parametric path (see `lessons/ppc/chart.ts`). */
const QUARTER_TURN = 1.5707963267948966;

/** One over the square root of two: where the PPC's 45° ray meets it, as a share of each end. */
const ON_THE_RAY = 0.7071067811865476;

/** How far GDP growth swings either side of potential over a cycle: as far as the growth gap can reach. */
const SWING = 2.4;

export const CALCS = {
    // The levels, which "What changed" and the Maths tab say.
    gdpGrowth: `(params.demand + params.supply + params.potential - ${GROWTH}) / 2`,
    inflation: `params.demand + ${INFLATION} - calcs.gdpGrowth`,
    gap: 'calcs.gdpGrowth - params.potential',
    natural: `${NATURAL} - (params.potential - ${GROWTH}) / 2`,
    cyclical: '-calcs.gap / 2',
    unemployment: 'calcs.natural + calcs.cyclical',

    // What the panels after the first are drawn from. Potential growth comes
    // in as a shift from where it starts, so a curve it moves in a later
    // panel is drawn in that panel's colours, not in grey: the business cycle
    // is purple and the PPC blue, though potential growth moves both
    // (lessons.test.ts).
    shift: `params.potential - ${GROWTH}`,
    // Where on the cycle the economy is: the time at which the cycle is at
    // this height, past the first peak on the falling half in a contraction,
    // and short of the last on the rising half in an expansion.
    cycleFall: `${TO_TIME} * acos(max(-1, min(1, calcs.gap / ${SWING})))`,
    cycleTime: `params.expanding > 0.5 ? ${LAST_PEAK} - calcs.cycleFall : ${FIRST_PEAK} + calcs.cycleFall`,
    // The PPC's ends, which grow with potential growth, and the production
    // point on its 45° ray: on the curve at potential, inside it below,
    // outside it above, a fifth of the way at the widest gap.
    mostConsumer: '40 + 10 * calcs.shift',
    mostCapital: '20 + 5 * calcs.shift',
    scale: `1 + calcs.gap / ${5 * SWING}`
};

/**
 * The axes of the panels drawn in GDP growth or inflation, past the furthest
 * either reaches: five ticks, 2 apart, from 0.
 */
const RATE_AXIS = 8;

/** How far in from the plot's edge a curve's label sits: as far as it did on the old 20-point axes. */
const INSET = 0.6;

/** GDP growth on the business cycle at time `t`: potential growth, and a swing either side of it. */
const cycleAt = (t: string) =>
    `${GROWTH} + calcs.shift + ${SWING} * cos(${TO_RADIANS} * (${t} - ${FIRST_PEAK}))`;

/** What is said beside the production point: how the economy uses its resources. */
const STATE = 'calcs.gap < -0.05 ? "Inefficient" : (calcs.gap > 0.05 ? "Unsustainable" : "Efficient")';

/** Which half of the cycle the economy is on, said beside its point. */
const PHASE = 'params.expanding > 0.5 ? "Expansion" : "Contraction"';

/**
 * Four panels, headlined by the four numbers a student reads off them:
 * inflation, unemployment, GDP growth and the growth gap.
 *
 * AD, SRAS and LRAS are written as GDP growth in terms of inflation, so a
 * shift is sampled at fixed inflation rates and said to be to the right or
 * left, as it is taught (`lessons/fx/chart.ts` says why), and dragged
 * sideways. Only they are dragged: every other panel follows from them.
 *
 * The labels sit at each curve's end, a little in from the edge of the plot
 * across every slider: AD's lower right, or its upper left where that is in
 * the way, SRAS's upper right, and LRAS at the top, clear of the
 * equilibrium, which stays between 0% and 5% inflation.
 */
export const PANELS: PanelDefinition[] = [
    {
        key: 'economy', name: 'Output and prices', headline: 'inflation',
        xAxis: axis('Annual GDP growth rate (%)', 0, RATE_AXIS),
        yAxis: axis('CPI growth rate (%)', 0, RATE_AXIS),
        objects: [
            ...curve({
                name: 'lras', title: 'long-run aggregate supply', meaning: 'potential', symbol: '\\text{LRAS}',
                moves: ['potential'],
                shape: p => ({ fn: `${p.potential} + 0 * (y)`, samplePoints: 2 }),
                labelAt: () => ({ y: RATE_AXIS - INSET }),
                drag: [{ horizontal: 'potential' }], ghost: true, shiftAt: 'prev.calcs.inflation'
            }),
            ...curve({
                name: 'ad', title: 'aggregate demand', meaning: 'demand', symbol: '\\text{AD}',
                moves: ['demand'],
                shape: p => ({ fn: `${p.demand} + ${INFLATION} - (y)`, samplePoints: 2 }),
                // Where AD leaves the plot at its lower right, the bottom
                // edge, which is close to the equilibrium and to LRAS: with
                // inflation at 2.5%, AD reaches the bottom only 2.5 points
                // of growth past the economy. So the label moves to AD's upper-left
                // end, on the left edge, while the economy is low on AD and
                // the point would sit on it, or while LRAS would run through
                // it. Potential growth is read as the calc, so AD's label is
                // not drawn by a grey param.
                labelAt: p => ({
                    y: `calcs.inflation < 1.8 or abs(${p.demand} + ${INFLATION - INSET} - ${GROWTH} - calcs.shift) < 0.6` +
                        ` ? ${p.demand} + ${INFLATION - INSET} : ${INSET}`
                }),
                drag: [{ horizontal: 'demand' }], ghost: true, shiftAt: 'prev.calcs.inflation'
            }),
            ...curve({
                name: 'sras', title: 'short-run aggregate supply', meaning: 'supply', symbol: '\\text{SRAS}',
                moves: ['supply'],
                shape: p => ({ fn: `${p.supply} + calcs.shift + (y) - ${INFLATION}`, samplePoints: 2 }),
                // The top edge, or the right edge once supply and the shift
                // together are past 2.4.
                labelAt: p => ({
                    y: `min(${RATE_AXIS - INSET}, ${RATE_AXIS + INFLATION - INSET} - ${p.supply} - calcs.shift)`
                }),
                drag: [{ horizontal: 'supply' }], ghost: true, shiftAt: 'prev.calcs.inflation'
            }),
            equilibrium({
                name: 'equilibrium_economy', x: 'calcs.gdpGrowth', y: 'calcs.inflation', places: [1, 1],
                srTitle: 'Where aggregate demand meets short-run aggregate supply', ghost: true
            })
        ]
    },
    {
        key: 'phillips', name: 'Phillips curve', headline: 'unemployment',
        xAxis: axis('Unemployment rate (%)', 0, 8),
        yAxis: axis('Inflation rate (%)', 0, RATE_AXIS),
        objects: [
            ...curve({
                name: 'lrpc', title: 'long-run Phillips curve', meaning: 'potential', symbol: '\\text{LRPC}',
                moves: [],
                shape: () => ({ fn: 'calcs.natural + 0 * (y)', samplePoints: 2 }),
                labelAt: () => ({ y: RATE_AXIS - INSET }),
                ghost: true
            }),
            // Shifted up and down by supply, as SRAS is left and right, so it
            // is supply's orange. Labelled at its lower right, at an inflation
            // rate of 0.8%, or at its upper left, at 7.2%: there while the
            // economy is down at the lower right, where the point would sit on
            // its label, and while supply is high, where the long-run Phillips
            // curve would run through it.
            ...curve({
                name: 'srpc', title: 'short-run Phillips curve', meaning: 'supply', symbol: '\\text{SRPC}',
                moves: ['supply'],
                shape: p => ({
                    fn: `${INFLATION} - (${p.supply} - ${GROWTH}) + 2 * (calcs.natural - (x))`, samplePoints: 2
                }),
                labelAt: p => ({
                    x: `calcs.inflation < 2 or ${p.supply} > 4 ? ` +
                        `max(0.4, calcs.natural + (${INFLATION + GROWTH} - 7.2 - ${p.supply}) / 2) : ` +
                        `min(7.6, calcs.natural + (${INFLATION + GROWTH} - 0.8 - ${p.supply}) / 2)`
                }),
                ghost: true
            }),
            // The economy, read off both axes. Not the kit's equilibrium,
            // whose ghost draws no arrow, because nothing here shifts level:
            // the point moves along the curve or with it, and its own arrow
            // says where it went.
            {
                type: 'Point',
                def: {
                    name: 'economy_phillips', title: '',
                    x: 'calcs.unemployment', y: 'calcs.inflation',
                    color: 'colors.equilibriumPrice',
                    droplines: {
                        vertical: axisValue('calcs.unemployment', 1), horizontal: axisValue('calcs.inflation', 1),
                        plainText: true
                    },
                    srTitle: 'Unemployment and inflation now',
                    ghost: { show: UNLESS_ASKING }
                }
            }
        ]
    },
    {
        key: 'cycle', name: 'Business cycle', headline: 'gdpGrowth',
        // Time has no dates on it, so no tick numbers, and nothing else on
        // the axis: it reads "Time" and no more.
        xAxis: axis('Time', 0, TIME_AXIS, { tickValues: [] }),
        yAxis: axis('Annual GDP growth rate (%)', 0, RATE_AXIS),
        objects: [
            // Potential growth, to read the cycle against, as a price line is
            // read against: dotted, and named in words under its right end,
            // where the cycle is above it.
            {
                type: 'Segment',
                def: {
                    name: 'trend', title: '',
                    a: [0, `${GROWTH} + calcs.shift`], b: [TIME_AXIS, `${GROWTH} + calcs.shift`],
                    color: 'colors.potential', lineStyle: 'dotted'
                }
            },
            {
                type: 'Label',
                def: {
                    name: 'trendName', title: '', x: TIME_AXIS, y: `${GROWTH} + calcs.shift`, text: 'Potential growth',
                    plainText: true, position: 'tr', color: 'colors.potential'
                }
            },
            ...curve({
                name: 'cycle', title: 'business cycle', meaning: 'businessCycle', symbol: '\\text{GDP}',
                moves: [],
                shape: () => ({ fn: cycleAt('(x)'), min: 0, max: TIME_AXIS, samplePoints: 120 }),
                // On its way up to the first peak, where the economy never is.
                labelAt: () => ({ x: 0.8 }),
                ghost: true
            }),
            // The half of the cycle the economy is on is named beside it.
            {
                type: 'Point',
                def: {
                    name: 'economy_cycle', title: '',
                    x: 'calcs.cycleTime', y: 'calcs.gdpGrowth',
                    color: 'colors.equilibriumPrice',
                    label: { text: PHASE, plainText: true, flipToFit: true },
                    srTitle: 'GDP growth now',
                    ghost: { show: UNLESS_ASKING }
                }
            }
        ]
    },
    {
        key: 'ppc', name: 'Production', headline: 'gap',
        xAxis: axis('Consumer goods', 0, 60),
        yAxis: axis('Capital goods', 0, 30),
        objects: [
            contextArea({
                name: 'attainable', meaning: 'ppf',
                shape: {
                    fn1: 'calcs.mostCapital * sqrt(max(0, 1 - ((x) / calcs.mostConsumer)^2))', fn2: '0',
                    min: 0, max: 'calcs.mostConsumer', samplePoints: 80
                },
                srTitle: 'What the economy can produce'
            }),
            // Untitled, as the café's is: a PPC that grows keeps its chord's
            // slope, so the engine would say it "gets flatter" of an outward
            // shift. "Potential growth rises" says what happened.
            {
                type: 'Curve',
                def: {
                    name: 'ppc', title: '',
                    xFn: 'calcs.mostConsumer * max(0, cos((t)))',
                    yFn: 'calcs.mostCapital * max(0, sin((t)))',
                    min: 0, max: QUARTER_TURN, samplePoints: 80,
                    color: 'colors.ppf',
                    label: { text: '\\text{PPC}', t: 1.35, position: 'bl' },
                    srTitle: 'Production possibility curve',
                    ghost: { show: UNLESS_ASKING, label: '_0' }
                }
            },
            {
                type: 'Point',
                def: {
                    name: 'production', title: '',
                    x: `calcs.mostConsumer * ${ON_THE_RAY} * calcs.scale`,
                    y: `calcs.mostCapital * ${ON_THE_RAY} * calcs.scale`,
                    color: 'colors.combination',
                    label: { text: STATE, plainText: true, flipToFit: true },
                    srTitle: 'What the economy produces now',
                    ghost: { show: UNLESS_ASKING }
                }
            }
        ]
    }
];

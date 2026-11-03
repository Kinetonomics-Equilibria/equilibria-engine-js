import { axis, contextArea, curve, equilibrium } from '../kit/chart';
import { UNLESS_ASKING } from '../kit/question';
import type { ParamDefinition, PanelDefinition } from '../kit/lesson';

/**
 * Aggregate demand and supply, and three views of the one economy it solves:
 * the Phillips curve, the business cycle and the production possibility
 * curve. Four panels, drawn from the same params, so a shock dragged on one
 * moves all four.
 *
 * The model, in real GDP Y and a price level PL where last year's was 100:
 *
 *     aggregate demand              Y = demand + (104 − PL)
 *     short-run aggregate supply    Y = supply + growth + (PL − 104)
 *     long-run aggregate supply     Y = potential
 *
 * with growth = potential − 104, so potential GDP shifts short-run supply
 * with it. `demand` and `supply` are each curve's real GDP at a price level of
 * 104, where the model starts. The economy is where AD meets SRAS:
 *
 *     Y  = (demand + supply + potential − 104) / 2
 *     PL = demand + 104 − Y
 *
 * Inflation is PL − 100, the rise since last year. The output gap is Y −
 * potential, and every point of it below potential is half a point of
 * cyclical unemployment (Okun's law, at a slope of a half), on top of a
 * natural rate of 4%, which falls half a point for each point potential GDP
 * grows. The short-run Phillips curve is the same economy against
 * unemployment U: inflation = 4 − (supply − 104) + 2·(natural − U), so a fall
 * in supply shifts it up as it shifts SRAS to the left.
 *
 * The numbers are the model's own: an index, not dollars.
 */

/**
 * The params a student moves.
 *
 * Demand and supply from 101 to 107, and potential from 102 to 106, which
 * keeps real GDP between 100 and 108, the price level between 100 and 108,
 * the output gap within 4 either way and unemployment between 1% and 7%.
 *
 * In steps of 0.2, because a step moves real GDP and the price level 0.1,
 * which is what their captions print.
 *
 * `expanding` is the business cycle's phase: which half of the cycle the
 * economy is on, with real GDP at the height the other three set. A switch,
 * and nothing else reads it.
 */
export const PARAMS: ParamDefinition[] = [
    { name: 'demand', label: 'Aggregate demand', value: 104, min: 101, max: 107, round: 0.2, precision: 1 },
    { name: 'supply', label: 'Short-run aggregate supply', value: 104, min: 101, max: 107, round: 0.2, precision: 1 },
    { name: 'potential', label: 'Potential GDP', value: 104, min: 102, max: 106, round: 0.2, precision: 1 },
    { name: 'expanding', label: 'Expansion', value: 0, min: 0, max: 1, round: 1, isBoolean: true }
];

/**
 * A cycle ten units of time long, in radians (π/5 a unit), and back (5/π),
 * written out as the café's quarter turn is.
 */
const TO_RADIANS = 0.6283185307179586;
const TO_TIME = 1.5915494309189535;

/**
 * The business cycle's time axis: a cycle and a half, from potential GDP
 * rising to a peak at 2.5, down to a trough at 7.5, up to a peak at 12.5 and
 * down to potential again at 15. The economy is always between the two
 * peaks, so the ends are free for the curve's label and potential GDP's.
 */
const FIRST_PEAK = 2.5;
const TROUGH = 7.5;
const LAST_PEAK = 12.5;
const TIME_AXIS = 15;

/** A quarter turn, for the PPC as a parametric path (see `lessons/ppc/chart.ts`). */
const QUARTER_TURN = 1.5707963267948966;

/** One over the square root of two: where the PPC's 45° ray meets it, as a share of each end. */
const ON_THE_RAY = 0.7071067811865476;

/** How far real GDP swings either side of potential over a cycle: as far as the output gap can reach. */
const SWING = 4;

export const CALCS = {
    // The levels, which "What changed" and the Maths tab say.
    realGdp: '(params.demand + params.supply + params.potential - 104) / 2',
    level: 'params.demand + 104 - calcs.realGdp',
    inflation: 'calcs.level - 100',
    gap: 'calcs.realGdp - params.potential',
    natural: '4 - (params.potential - 104) / 2',
    cyclical: '-calcs.gap / 2',
    unemployment: 'calcs.natural + calcs.cyclical',

    // What the panels after the first are drawn from. Potential GDP comes in
    // as growth, so a curve it moves in a later panel is drawn in that
    // panel's colours, not in grey: the business cycle is purple and the PPC
    // blue, though potential GDP moves both (lessons.test.ts).
    growth: 'params.potential - 104',
    // Where on the cycle real GDP is: the time at which the cycle is at this
    // height, past the first peak on the falling half in a contraction, and
    // short of the last on the rising half in an expansion.
    cycleFall: `${TO_TIME} * acos(max(-1, min(1, calcs.gap / ${SWING})))`,
    cycleTime: `params.expanding > 0.5 ? ${LAST_PEAK} - calcs.cycleFall : ${FIRST_PEAK} + calcs.cycleFall`,
    // The PPC's ends, which grow with potential GDP, and the production point
    // on its 45° ray: on the curve at potential, inside it below, outside it
    // above, five times as far as the gap in percent.
    mostConsumer: '40 + 5 * calcs.growth',
    mostCapital: '20 + 2.5 * calcs.growth',
    scale: '1 + 5 * calcs.gap / params.potential'
};

/**
 * The axes of the panels drawn in real GDP, past the furthest either reaches:
 * five ticks, 5 apart, from 95.
 */
const GDP_AXIS = { min: 95, max: 115 };

/** Real GDP on the business cycle at time `t`: potential GDP, and a swing either side of it. */
const cycleAt = (t: string) => `104 + calcs.growth + ${SWING} * cos(${TO_RADIANS} * (${t} - ${FIRST_PEAK}))`;

/** What is said beside the production point: how the economy uses its resources. */
const STATE = 'calcs.gap < -0.05 ? "Inefficient" : (calcs.gap > 0.05 ? "Unsustainable" : "Efficient")';

/**
 * A word on the business cycle panel, in the cycle's colour, plain text.
 * Untitled, as every annotation is, so "What changed" never says one moved.
 */
const cycleWord = (name: string, text: string, x: number | string, y: string, place: object) => ({
    type: 'Label',
    def: { name, title: '', x, y, text, plainText: true, color: 'colors.businessCycle', ...place }
});

/**
 * Four panels, headlined by the four numbers the original readout gave:
 * inflation, unemployment, the output gap and real GDP.
 *
 * AD, SRAS and LRAS are written as real GDP in terms of the price level, so
 * a shift is sampled at fixed price levels and said to be to the right or
 * left, as it is taught (`lessons/fx/chart.ts` says why), and dragged
 * sideways. Only they are dragged: every other panel follows from them.
 *
 * The labels sit at each curve's end, a little in from the edge of the plot
 * across every slider: AD's lower right, SRAS's upper right, and LRAS at the
 * top, clear of the equilibrium, which stays between 100 and 108.
 */
export const PANELS: PanelDefinition[] = [
    {
        key: 'economy', name: 'Output and prices', headline: 'inflation',
        xAxis: axis('Real GDP (index)', GDP_AXIS.min, GDP_AXIS.max, { intercept: GDP_AXIS.min }),
        yAxis: axis('Price level (last year = 100)', GDP_AXIS.min, GDP_AXIS.max, { intercept: GDP_AXIS.min }),
        objects: [
            ...curve({
                name: 'lras', title: 'long-run aggregate supply', meaning: 'potential', symbol: '\\text{LRAS}',
                moves: ['potential'],
                shape: p => ({ fn: `${p.potential} + 0 * (y)`, samplePoints: 2 }),
                labelAt: () => ({ y: 113.5 }),
                drag: [{ horizontal: 'potential' }], ghost: true, shiftAt: 'prev.calcs.level'
            }),
            ...curve({
                name: 'ad', title: 'aggregate demand', meaning: 'demand', symbol: '\\text{AD}',
                moves: ['demand'],
                shape: p => ({ fn: `${p.demand} + 104 - (y)`, samplePoints: 2 }),
                // Where AD leaves the plot at its lower right is the bottom
                // edge, or the right edge for demand above 104.
                labelAt: p => ({ y: `max(96.5, ${p.demand} - 9.5)` }),
                drag: [{ horizontal: 'demand' }], ghost: true, shiftAt: 'prev.calcs.level'
            }),
            ...curve({
                name: 'sras', title: 'short-run aggregate supply', meaning: 'supply', symbol: '\\text{SRAS}',
                moves: ['supply'],
                shape: p => ({ fn: `${p.supply} + calcs.growth + (y) - 104`, samplePoints: 2 }),
                // The top edge, or the right edge once supply and growth
                // together are past 104.
                labelAt: p => ({ y: `min(113.5, 217.5 - ${p.supply} - calcs.growth)` }),
                drag: [{ horizontal: 'supply' }], ghost: true, shiftAt: 'prev.calcs.level'
            }),
            equilibrium({
                name: 'equilibrium_economy', x: 'calcs.realGdp', y: 'calcs.level', droplines: ['Y', '\\text{PL}'],
                srTitle: 'Where aggregate demand meets short-run aggregate supply', ghost: true
            })
        ]
    },
    {
        key: 'phillips', name: 'Phillips curve', headline: 'unemployment',
        xAxis: axis('Unemployment rate (%)', 0, 8),
        yAxis: axis('Inflation rate (%)', 0, 10),
        objects: [
            ...curve({
                name: 'lrpc', title: 'long-run Phillips curve', meaning: 'potential', symbol: '\\text{LRPC}',
                moves: [],
                shape: () => ({ fn: 'calcs.natural + 0 * (y)', samplePoints: 2 }),
                labelAt: () => ({ y: 9.4 }),
                ghost: true
            }),
            // Shifted up and down by supply, as SRAS is left and right, so it
            // is supply's orange. Labelled at its lower right, or at its upper
            // left while the economy is down there, where the point would sit
            // on its label.
            ...curve({
                name: 'srpc', title: 'short-run Phillips curve', meaning: 'supply', symbol: '\\text{SRPC}',
                moves: ['supply'],
                shape: p => ({ fn: `4 - (${p.supply} - 104) + 2 * (calcs.natural - (x))`, samplePoints: 2 }),
                labelAt: p => ({
                    x: `calcs.inflation < 2.5 ? max(0.4, 49.5 - ${p.supply} / 2 + calcs.natural) : ` +
                        `min(7.6, 53.5 - ${p.supply} / 2 + calcs.natural)`
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
                    droplines: { vertical: 'U', horizontal: '\\pi' },
                    srTitle: 'Unemployment and inflation now',
                    ghost: { show: UNLESS_ASKING }
                }
            }
        ]
    },
    {
        key: 'cycle', name: 'Business cycle', headline: 'gap',
        // Time has no dates on it, so no tick numbers.
        xAxis: axis('Time', 0, TIME_AXIS, { tickValues: [], intercept: GDP_AXIS.min }),
        yAxis: axis('Real GDP (index)', GDP_AXIS.min, GDP_AXIS.max),
        objects: [
            // Potential GDP, to read the cycle against, as a price line is
            // read against: dotted, and named in words under its right end,
            // where the cycle is above it.
            {
                type: 'Segment',
                def: {
                    name: 'trend', title: '',
                    a: [0, '104 + calcs.growth'], b: [TIME_AXIS, '104 + calcs.growth'],
                    color: 'colors.potential', lineStyle: 'dotted'
                }
            },
            {
                type: 'Label',
                def: {
                    name: 'trendName', title: '', x: TIME_AXIS, y: '104 + calcs.growth', text: 'Potential GDP',
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
            // The turning points, over the last peak, away from the curve's
            // label, and under the trough; and the halves either side of the
            // trough, each under its half, where the cycle is above it.
            cycleWord('peak', 'Peak', LAST_PEAK, `104 + calcs.growth + ${SWING}`, { position: 'b' }),
            cycleWord('trough', 'Trough', TROUGH, `104 + calcs.growth - ${SWING}`, { position: 't' }),
            cycleWord('contraction', 'Contraction', TROUGH - 3.9, '104 + calcs.growth - 2.5', { align: 'center' }),
            cycleWord('expansion', 'Expansion', TROUGH + 3.9, '104 + calcs.growth - 2.5', { align: 'center' }),
            {
                type: 'Point',
                def: {
                    name: 'economy_cycle', title: '',
                    x: 'calcs.cycleTime', y: 'calcs.realGdp',
                    color: 'colors.equilibriumPrice',
                    srTitle: 'Real GDP now',
                    ghost: { show: UNLESS_ASKING }
                }
            }
        ]
    },
    {
        key: 'ppc', name: 'Production', headline: 'realGdp',
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
            // shift. "Potential GDP increases" says what happened.
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
            // No ghost: a ghost point carries its label, and the word for
            // where it was sat on the word for where it is.
            {
                type: 'Point',
                def: {
                    name: 'production', title: '',
                    x: `calcs.mostConsumer * ${ON_THE_RAY} * calcs.scale`,
                    y: `calcs.mostCapital * ${ON_THE_RAY} * calcs.scale`,
                    color: 'colors.combination',
                    label: { text: STATE, plainText: true, flipToFit: true },
                    srTitle: 'What the economy produces now'
                }
            }
        ]
    }
];

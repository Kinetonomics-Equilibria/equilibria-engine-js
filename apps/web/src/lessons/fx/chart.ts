import { axis, curve, equilibrium } from '../kit/chart';
import type { ParamDefinition, PanelDefinition } from '../kit/lesson';

/**
 * The AUD market, and the USD market it mirrors: two panels, drawn from the
 * same two params.
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

/** Two intervals is a straight line exactly. The USD side is not straight, and gets the engine's sampling. */
const STRAIGHT = { samplePoints: 2 };

/**
 * From 30 to 70, which keeps the clearing rate between USD 0.45 and USD 0.85
 * and every curve inside the panel at both ends of its range.
 *
 * In steps of 2, because a step of 2 is a cent on the rate. A step of 1 moved
 * it half a cent, which a rate quoted to the cent shows as no change at all
 * every other step — an arrow key that moved the curve and left the rate, the
 * caption and the strip saying nothing happened. It also keeps
 * Q* = (demand + supply)/2 a whole number.
 */
export const PARAMS: ParamDefinition[] = [
    { name: 'demand', label: 'Demand for AUD', value: 50, min: 30, max: 70, round: 2 },
    { name: 'supply', label: 'Supply of AUD', value: 50, min: 30, max: 70, round: 2 }
];

export const CALCS = {
    rate: '0.65 + (params.demand - params.supply)/200',
    inverse: '1/calcs.rate',
    Qe: '(params.demand + params.supply)/2'
};

/**
 * Which panel headlines what. A rate in each, each in the other's currency.
 *
 * The names are short because the numbers beside them are long. A caption is
 * one line — name, rate, change — and "AUD 1 = USD 0.70 ▲ USD 0.05" is wider than
 * any number the stage's caption room was measured against, so in the grid a
 * longer name ("Market for AUD") was squeezed to "Marke…".
 *
 * Both curves are dragged sideways, because they move sideways: `horizontal`
 * adds the drag's own `dx` to the param, and `dx` is measured in the panel's
 * quantity units, which is exactly how far a shift of the param moves each
 * curve, in either panel.
 *
 * The x-axis is drawn at the bottom of the price range rather than at zero: no
 * exchange rate worth drawing is near zero, and an axis at 0 would sit below
 * the panel. `intercept` is where the x-axis crosses the y-axis, and the
 * droplines drop to it.
 *
 * Every question here asks direction only, so the answer line has no correct
 * position to show. What "Show me" draws on it is each question's
 * `illustrate`: the right curve, shifted the right way by an amount chosen for
 * the picture, which the grade never reads (P14). The screen parks the pair
 * belonging to the curve a question is *not* about on that curve's own
 * position, so its start line marks where it was if the student reaches for
 * the wrong one.
 */
export const PANELS: PanelDefinition[] = [
    {
        key: 'market', name: 'AUD market', headline: 'rate',
        xAxis: axis('Quantity of AUD traded', 0, 100, { intercept: 0.4 }),
        yAxis: axis('USD per AUD', 0.4, 0.9, { tickPrecision: 2 }),
        objects: [
            ...curve({
                name: 'demand_market', title: 'demand for AUD', meaning: 'demand', symbol: 'D',
                moves: ['demand'], shape: p => ({ fn: demandAt(p.demand), ...STRAIGHT }), labelAt: () => ({ y: 0.47 }),
                drag: [{ horizontal: 'demand' }], ghost: true, asked: true
            }),
            ...curve({
                name: 'supply_market', title: 'supply of AUD', meaning: 'supply', symbol: 'S',
                moves: ['supply'], shape: p => ({ fn: supplyAt(p.supply), ...STRAIGHT }), labelAt: () => ({ y: 0.86 }),
                drag: [{ horizontal: 'supply' }], ghost: true, asked: true
            }),
            equilibrium({
                name: 'equilibrium_market', x: 'calcs.Qe', y: 'calcs.rate', droplines: ['Q^*', 'e^*'],
                srTitle: 'Equilibrium exchange rate', ghost: true
            })
        ]
    },
    {
        key: 'mirror', name: 'USD market', headline: 'inverse',
        xAxis: axis('Quantity traded (AUD)', 0, 100, { intercept: 1 }),
        yAxis: axis('AUD per USD', 1, 2.6, { tickPrecision: 2 }),
        objects: [
            // Demand is blue and supply orange here too, as on every chart:
            // the supply of USD is orange though it is the same trades as the
            // blue demand for AUD. The lesson's words make that link, not the
            // colour.
            ...curve({
                name: 'usdSupply_mirror', title: 'supply of USD', meaning: 'supply', symbol: 'S',
                moves: ['demand'], shape: p => ({ fn: usdSupplyAt(p.demand) }), labelAt: () => ({ y: 2.35 }),
                drag: [{ horizontal: 'demand' }], ghost: true
            }),
            ...curve({
                name: 'usdDemand_mirror', title: 'demand for USD', meaning: 'demand', symbol: 'D',
                moves: ['supply'], shape: p => ({ fn: usdDemandAt(p.supply) }), labelAt: () => ({ y: 1.2 }),
                drag: [{ horizontal: 'supply' }], ghost: true
            }),
            equilibrium({
                name: 'equilibrium_mirror', x: 'calcs.Qe', y: 'calcs.inverse', droplines: ['Q^*', '1/e^*'],
                srTitle: 'Equilibrium exchange rate', ghost: true
            })
        ]
    }
];

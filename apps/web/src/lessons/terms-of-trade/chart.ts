import { axis, curve, equilibrium, namedArea } from '../kit/chart';
import type { Drawn } from '../kit/chart';
import type { ParamDefinition, PanelDefinition } from '../kit/lesson';

/**
 * The diagram: its params, its calcs and its panels.
 *
 * The model, in indexes that all start at 100. At an export price index P:
 *
 *     demand   Q = demand − (P − 100)
 *     supply   Q = supply + 0.25·(P − 100)
 *
 * so the market clears at P* = 100 + 0.8·(demand − supply) and
 * Q* = 0.2·demand + 0.8·supply, and each param is its curve's quantity at an
 * index of 100. Supply is four times less responsive than demand, which is
 * the short run the lesson teaches: a boom goes mostly into the price.
 *
 *     terms of trade   100·P* ÷ imports
 *     export revenue   P*·Q* ÷ 100
 *
 * The numbers are chosen to come out whole across the cycle. Each of them is
 * a step's: 100 → 200 on demand is a price of 180 and a volume of 120, 216
 * in revenue; 100 → 150 on supply is 140 and 160, 224 in revenue; and
 * 200 → 175 on demand is 120 and 155, 186 in revenue. Revenue rises as the
 * mines open because demand is elastic from 180 down to 140, which is what
 * happened as the mines came on, and a third off the peak is what the terms
 * of trade did after 2011.
 */

/**
 * Each curve as quantity in terms of the price, so a curve pulled sideways is
 * said to shift right or left, as this is taught. `(y)` in parentheses for
 * the curve, because that is how the engine recognises the variable.
 */
const demandAt = (demand: string, price: string) => `${demand} - (${price} - 100)`;
const supplyAt = (supply: string, price: string) => `${supply} + 0.25*(${price} - 100)`;

/** Where the market clears, from the two curves. */
const priceFrom = (demand: string, supply: string) => `100 + 0.8*(${demand} - ${supply})`;

/**
 * The terms of trade from all three params, so the line, its dashed start and
 * its answer are one definition. `calcs.tot` is this at the params now, but
 * a question's start and answer have to be worked out from their own.
 */
const termsOf = (p: Drawn) => `100*(${priceFrom(p.demand, p.supply)})/${p.imports}`;

/**
 * The params a student moves, in steps of 5, a step of 4 on the price.
 *
 * Demand from 80 to 210 and supply from 80 to 160 keep the price between 36
 * and 204, on an axis to 250, and past the 200 and 150 the boom reaches.
 * Import prices from 80 to 160, the 125 and 80 the lesson uses among them,
 * keep the terms of trade under 300 with every param at its dearest end.
 */
export const PARAMS: ParamDefinition[] = [
    { name: 'demand', label: 'Demand for commodities', value: 100, min: 80, max: 210, round: 5 },
    { name: 'supply', label: 'Supply of commodities', value: 100, min: 80, max: 160, round: 5 },
    { name: 'imports', label: 'Import prices', value: 100, min: 80, max: 160, round: 5 }
];

/** The levels. A panel's change calc, and a question's params, are the kit's. */
export const CALCS = {
    Pe: priceFrom('params.demand', 'params.supply'),
    Qe: '0.2*params.demand + 0.8*params.supply',
    tot: '100*calcs.Pe/params.imports',
    revenue: 'calcs.Pe*calcs.Qe/100'
};

/**
 * Demand, in a panel: blue, D at its lower right, a little above the quantity
 * axis or, once it leaves the plot through its right-hand edge, a little
 * above where it does. Low enough to stay clear of the point at the most the
 * sliders ship, 144 at a price of 36, where D is at 165.
 *
 * Its question's lines in the market only, at the front through the
 * questions. The kit names them for the param, not the panel, so a second
 * panel's would be the same objects twice.
 */
const demand = (panel: string) => curve({
    name: 'demand_' + panel, title: 'demand', meaning: 'demand', symbol: 'D',
    moves: ['demand'],
    shape: p => ({ fn: demandAt(p.demand, '(y)'), samplePoints: 2 }),
    labelAt: p => ({ y: `max(15, ${p.demand} - 135)` }),
    drag: [{ horizontal: 'demand' }], ghost: true, shiftAt: 'prev.calcs.Pe', asked: panel === 'market'
});

/** Supply, at its upper right: at 230, above the most the sliders take the price, 204. */
const supply = (panel: string) => curve({
    name: 'supply_' + panel, title: 'supply', meaning: 'supply', symbol: 'S',
    moves: ['supply'],
    shape: p => ({ fn: supplyAt(p.supply, '(y)'), samplePoints: 2 }),
    labelAt: () => ({ y: 230 }),
    drag: [{ horizontal: 'supply' }], ghost: true, shiftAt: 'prev.calcs.Pe', asked: panel === 'market'
});

const cleared = (panel: string) => equilibrium({
    name: 'equilibrium_' + panel, x: 'calcs.Qe', y: 'calcs.Pe', droplines: ['Q^*', 'P^*'],
    srTitle: 'Equilibrium export price and volume', ghost: true
});

/** Both on one scale, so a curve's slope says how responsive it is. To 250, past all the sliders reach. */
const marketAxes = () => ({
    xAxis: axis('Export volume (index)', 0, 250),
    yAxis: axis('Export prices (index)', 0, 250)
});

/**
 * Three panels: the market that sets export prices, what those prices buy,
 * and what the market earns. The market comes first, because the first panel
 * a param draws in says its colour; the terms of trade take the front at the
 * step that teaches them.
 *
 * The terms of trade are a line through the origin: exports sold along the
 * bottom, the imports they buy up the side, so its slope is what one basket
 * buys, and the point at 100 baskets reads the index off the imports axis.
 * No drag: it is the ratio of two prices, and a question moves import prices
 * with a slider. It moves for all three params, so `imports` comes first in
 * `moves`, to name its question's lines apart from demand's and supply's.
 *
 * ToT is labelled at the line's upper end, inside the plot whichever edge the
 * line leaves by, or low down where a line that steep would have it on the
 * point.
 */
export const PANELS: PanelDefinition[] = [
    {
        key: 'market', name: 'Commodity market', headline: 'Pe',
        ...marketAxes(),
        objects: [...demand('market'), ...supply('market'), cleared('market')]
    },
    {
        key: 'trade', name: 'Terms of trade', headline: 'tot',
        xAxis: axis('Exports sold (baskets)', 0, 200),
        yAxis: axis('Imports bought (baskets)', 0, 300),
        objects: [
            ...curve({
                name: 'line_trade', title: 'terms of trade line', meaning: 'termsOfTrade', symbol: '\\text{ToT}',
                type: 'Line',
                moves: ['imports', 'demand', 'supply'],
                shape: p => ({ yIntercept: 0, slope: `(${termsOf(p)})/100` }),
                labelAt: p => ({ x: `(${termsOf(p)}) > 200 ? 50 : min(185, 27500/(${termsOf(p)}))` }),
                ghost: true, asked: true
            }),
            {
                type: 'Point',
                def: {
                    name: 'bought_trade', title: '',
                    x: 100, y: 'calcs.tot',
                    color: 'colors.termsOfTrade',
                    droplines: { horizontal: '\\text{ToT}' },
                    srTitle: 'What 100 baskets of exports buy',
                    ghost: true
                }
            }
        ]
    },
    {
        key: 'revenue', name: 'Export revenue', headline: 'revenue',
        ...marketAxes(),
        objects: [
            // Price times quantity, so the equilibrium's green, as the market
            // lesson's is. The panel's one area, so its title names it. First,
            // so the curves and the point are drawn over it.
            namedArea({
                name: 'revenueArea', meaning: 'equilibriumPrice', type: 'Rectangle',
                shape: { a: [0, 0], b: ['calcs.Qe', 'calcs.Pe'] },
                srTitle: 'Export revenue'
            }),
            ...demand('revenue'), ...supply('revenue'), cleared('revenue')
        ]
    }
];

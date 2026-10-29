import { axis, curve, equilibrium, priceAxis } from '../kit/chart';
import type { ParamDefinition, PanelDefinition } from '../kit/lesson';

/**
 * The diagram: its params, its calcs and its panels.
 *
 * The model, in punnets a morning at a price P in dollars:
 *
 *     demand   Q = demand − 10·(P − 5)
 *     supply   Q = supply + 10·(P − 5)
 *
 * so the market clears at P* = 5 + (demand − supply)/20 and
 * Q* = (demand + supply)/2, and each param is its curve's quantity at $5.
 */

/**
 * Each curve as quantity in terms of the price, so a curve pulled sideways is
 * said to shift right or left, as this is taught. `(y)` in parentheses for
 * the curve, because that is how the engine recognises the variable.
 */
const demandAt = (demand: string, price: string) => `${demand} - 10*(${price} - 5)`;
const supplyAt = (supply: string, price: string) => `${supply} + 10*(${price} - 5)`;

/**
 * The params a student moves. From 30 to 70, which keeps P* between $3 and
 * $7, and every label on the plot at both ends of each range.
 */
export const PARAMS: ParamDefinition[] = [
    { name: 'demand', label: 'Demand for strawberries', value: 50, min: 30, max: 70, round: 2 },
    { name: 'supply', label: 'Supply of strawberries', value: 50, min: 30, max: 70, round: 2 }
];

/** The levels. A panel's change calc, and a question's params, are the kit's. */
export const CALCS = {
    Pe: '5 + (params.demand - params.supply)/20',
    Qe: '(params.demand + params.supply)/2'
};

/**
 * One panel, the market, headlined by the price.
 *
 * The axes run past the most any curve reaches across the sliders. D is
 * labelled at its lower right, at $1, and S at its upper right, at $9: at
 * 70 to 110 punnets, on the plot for every param, and never on P*, which the
 * sliders keep between $3 and $7.
 */
export const PANELS: PanelDefinition[] = [
    {
        key: 'market', name: 'Market', headline: 'Pe',
        xAxis: axis('Punnets a morning', 0, 150),
        yAxis: priceAxis(10),
        objects: [
            ...curve({
                name: 'demand_market', title: 'demand', meaning: 'demand', symbol: 'D',
                moves: ['demand'],
                shape: p => ({ fn: demandAt(p.demand, '(y)'), samplePoints: 2 }),
                labelAt: () => ({ y: 1 }),
                drag: [{ horizontal: 'demand' }], ghost: true, asked: true
            }),
            ...curve({
                name: 'supply_market', title: 'supply', meaning: 'supply', symbol: 'S',
                moves: ['supply'],
                shape: p => ({ fn: supplyAt(p.supply, '(y)'), samplePoints: 2 }),
                labelAt: () => ({ y: 9 }),
                drag: [{ horizontal: 'supply' }], ghost: true, asked: true
            }),
            equilibrium({
                name: 'equilibrium_market', x: 'calcs.Qe', y: 'calcs.Pe', droplines: ['Q^*', 'P^*'],
                ghost: true
            })
        ]
    }
];

import { axis, colourOf, curve, equilibrium, priceAxis, priceLine, pricePoint } from '../kit/chart';
import { fromStep, stepRevealing } from '../kit/lesson';
import type { ParamDefinition, PanelDefinition } from '../kit/lesson';
import { SHORTAGE_LESSON } from './steps';

/**
 * The diagram: a market for mangoes, held at a price the student moves.
 *
 * The model, in mangoes a morning at a price P in dollars:
 *
 *     demand   Qd = demand − 100·(P − 3)
 *     supply   Qs = supply + 100·(P − 3)
 *
 * so each param is its curve's quantity at $3, and the market clears at
 * P* = 3 + (demand − supply)/200 and Q* = (demand + supply)/2. Each 50c the
 * price moves takes 50 mangoes from one side and adds 50 to the other, so at
 * the start a price $1 above P* leaves a surplus of 200 and a price $1 below
 * it a shortage of 200, and every gap is a multiple of 100.
 *
 * The price moves in steps of 50c and each curve in steps of 100, which moves
 * P* by 50c: so every market the sliders make clears at a price the price
 * slider can reach, and "where does it stop?" always has an answer. No
 * finer: at 25c and 50 mangoes a price one step from P* put the two points'
 * quantities 50 apart, and on a phone "275" and "325" ran together, as did
 * the price line's value and P*'s on the price axis.
 */

/**
 * Each curve as quantity in terms of the price, so a curve pulled sideways is
 * said to shift right or left, as this is taught. `(y)` in parentheses for
 * the curve, because that is how the engine recognises the variable.
 */
const demandAt = (demand: string, price: string) => `${demand} - 100*(${price} - 3)`;
const supplyAt = (supply: string, price: string) => `${supply} + 100*(${price} - 3)`;

/**
 * The lowest price the supply curve is drawn from, as the plane tickets
 * lesson's is: with supply at its most, a line drawn on down to $0 would
 * meet the quantity axis and say growers bring 100 mangoes for nothing. The
 * price slider stops at $1, so nothing a student reads is lost.
 */
const LOWEST_PRICE_DRAWN = 0.5;

/**
 * Where the gap between the two points is first drawn: a surplus at the step
 * that names it, and a shortage at its own. In the Playground every
 * `fromStep` is true, so both are drawn wherever they are.
 */
const SURPLUS = stepRevealing(SHORTAGE_LESSON, 'surplusLeg');
const SHORTAGE = stepRevealing(SHORTAGE_LESSON, 'shortageLeg');

/**
 * The price from $1 to $5 in steps of 50c, so at its ends, with either curve
 * at the end of its range, one side of the market wants or brings none: the
 * corner of what the sliders reach, with the point on the price axis. Each
 * curve has three places, the start and 100 mangoes either side of it.
 */
export const PARAMS: ParamDefinition[] = [
    { name: 'price', label: 'The price', value: 3, min: 1, max: 5, round: 0.5, precision: 2 },
    { name: 'demand', label: 'Demand for mangoes', value: 300, min: 200, max: 400, round: 100 },
    { name: 'supply', label: 'Supply of mangoes', value: 300, min: 200, max: 400, round: 100 }
];

export const CALCS = {
    Qd: demandAt('params.demand', 'params.price'),
    Qs: supplyAt('params.supply', 'params.price'),
    surplus: 'max(0, calcs.Qs - calcs.Qd)',
    shortage: 'max(0, calcs.Qd - calcs.Qs)',
    Pe: '3 + (params.demand - params.supply)/200',
    Qe: '(params.demand + params.supply)/2',
    // Where the price line stops: at the nearer point where a surplus or a
    // shortage is drawn on from it in its own colour, and at the further
    // point where nothing is. Drawn on top of each other, two dotted lines
    // that start in different places put their dots out of step, and the
    // gap read as a smear of grey and orange.
    lineTo: `((calcs.surplus > 0 and ${fromStep(SURPLUS)}) or (calcs.shortage > 0 and ${fromStep(SHORTAGE)}))` +
        ' ? min(calcs.Qd, calcs.Qs) : max(calcs.Qd, calcs.Qs)'
};

/** Where D and S are labelled: D at its lower right and S at its upper right, half a dollar past the furthest a point on either can go. */
const D_LABEL_AT = 0.5;
const S_LABEL_AT = 5.5;

/**
 * The gap at the price: a surplus or a shortage, as a measured step.
 *
 * Dotted, as a distance to read along the quantity axis is, from one point to
 * the other along the price line, and labelled with its size in words. In
 * the colour of the side with more: a surplus is mangoes growers take home,
 * so supply's orange, and a shortage is buyers who miss out, so demand's
 * blue. Above the line for a surplus and below it for a shortage, where the
 * curves open away from it and leave room between them for the words.
 */
const gap = (kind: 'surplus' | 'shortage') => {
    const surplus = kind === 'surplus';
    const [from, to] = surplus ? ['calcs.Qd', 'calcs.Qs'] : ['calcs.Qs', 'calcs.Qd'];
    const color = colourOf(surplus ? 'supply' : 'demand');
    const show = `calcs.${kind} > 0`;
    return [
        {
            type: 'Segment',
            def: {
                name: kind + 'Leg', title: '',
                a: [from, 'params.price'], b: [to, 'params.price'],
                color, lineStyle: 'dotted', show
            }
        },
        {
            type: 'Label',
            def: {
                name: kind + 'Label', title: '',
                x: '(calcs.Qd + calcs.Qs)/2', y: 'params.price',
                text: `concat("${surplus ? 'Surplus' : 'Shortage'} of ", string(calcs.${kind}), " mangoes")`,
                // Past the arrows of the points at either end, which can be
                // dragged up and down: 12px off the line, the words ran
                // between the two points' arrows (Handles).
                plainText: true, position: surplus ? 'b' : 't', besideHandle: 'y',
                color, show
            }
        }
    ];
};

/**
 * One panel, the market, headlined by the price it would clear at: the price
 * a surplus or a shortage pushes the price towards.
 *
 * Wide enough for the most either side can reach at a price the slider
 * allows, 600 mangoes, with room past it for D's label. The price axis runs
 * a dollar past the slider, for S's.
 */
export const PANELS: PanelDefinition[] = [
    {
        key: 'market', name: 'Market', headline: 'Pe',
        xAxis: axis('Mangoes a morning', 0, 800),
        yAxis: priceAxis(6),
        objects: [
            ...curve({
                name: 'marketDemand', title: 'demand', meaning: 'demand', symbol: 'D',
                moves: ['demand'],
                shape: p => ({ fn: demandAt(p.demand, '(y)'), samplePoints: 2 }),
                labelAt: () => ({ y: D_LABEL_AT }),
                // No shift arrow: the points the price picks draw theirs,
                // level, from where they were (Lines).
                drag: [{ horizontal: 'demand' }], ghost: true, asked: true
            }),
            ...curve({
                name: 'marketSupply', title: 'supply', meaning: 'supply', symbol: 'S',
                moves: ['supply'],
                shape: p => ({ fn: supplyAt(p.supply, '(y)'), samplePoints: 2, min: LOWEST_PRICE_DRAWN }),
                labelAt: () => ({ y: S_LABEL_AT }),
                drag: [{ horizontal: 'supply' }], ghost: true, asked: true
            }),
            // The price across the plot, in grey: a price the market is at,
            // not one a seller chooses, and neither curve's colour. Hidden
            // where it clears the market, where the equilibrium's own
            // dropline reads the same price from the same point.
            ...priceLine({
                param: 'price', across: [0, 'calcs.lineTo'], meaning: 'price', places: 2,
                show: 'calcs.Qd != calcs.Qs'
            }),
            ...gap('surplus'),
            ...gap('shortage'),
            // What buyers want and growers bring at the price, each read off
            // the quantity axis. The price line reads the price for both.
            // Either one drags the price up and down.
            ...pricePoint({
                name: 'atDemand', meaning: 'price', price: 'price', on: ['demand'],
                at: p => demandAt(p.demand, p.price), x: 'calcs.Qd', places: [0, null],
                srTitle: 'What buyers want at the price', asked: true, askedAs: 'PriceOnDemand'
            }),
            ...pricePoint({
                name: 'atSupply', meaning: 'price', price: 'price', on: ['supply'],
                at: p => supplyAt(p.supply, p.price), x: 'calcs.Qs', places: [0, null],
                srTitle: 'What growers bring at the price', asked: true, askedAs: 'PriceOnSupply'
            }),
            // Where the market would clear, read off the price axis alone:
            // the quantity axis has the two points' quantities on it, and a
            // third between them ran into both. No ghost: the points the
            // price picks already show where the market was, and a ghost
            // here would ask each curve for a shift arrow beside theirs.
            equilibrium({
                name: 'equilibrium', x: 'calcs.Qe', y: 'calcs.Pe', places: [null, 2]
            })
        ]
    }
];

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
 *
 * Dragged on the chart, each moves on a grid ten times finer, 5c and 10
 * mangoes, and glides onto its own step once it is let go. On its own step
 * the price sat still under a moving pointer, then jumped a twelfth of the
 * axis. Mid-drag every quantity is still a whole number of mangoes and every
 * gap a multiple of 10, and near P* the two points' labels can pass over each
 * other until the drag settles them apart.
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
 * price slider stops at $1.50, so nothing a student reads is lost.
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
 * The price from $1.50 to $4.50 in steps of 50c: a gap of up to 300 at the
 * start, and every equilibrium the curves make, $2.00 to $4.00, with room
 * either side of it. Each curve has three places, the start and 100 mangoes
 * either side of it.
 *
 * No further. On a phone the gap's words are two thirds of the plot wide, and
 * at $1.00 "Shortage of 400 mangoes" ran into D's label, as a surplus at
 * $5.00 did into S's.
 */
export const PARAMS: ParamDefinition[] = [
    { name: 'price', label: 'The price', value: 3, min: 1.5, max: 4.5, round: 0.5, dragRound: 0.05, precision: 2 },
    { name: 'demand', label: 'Demand for mangoes', value: 300, min: 200, max: 400, round: 100, dragRound: 10 },
    { name: 'supply', label: 'Supply of mangoes', value: 300, min: 200, max: 400, round: 100, dragRound: 10 }
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

/**
 * Where D and S are labelled: D at its lower right and S at its upper right,
 * $1.25 past the furthest the price can go, which leaves room between them
 * and the gap's words at either end of the price slider.
 */
const D_LABEL_AT = 0.25;
const S_LABEL_AT = 5.75;

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
                // Rounded, because at a price of 3.35 the sum is
                // 70.00000000000011 in floating point, and a drag stops there.
                text: `concat("${surplus ? 'Surplus' : 'Shortage'} of ", string(round(calcs.${kind})), " mangoes")`,
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
 * Which way the gap pushes the price: down from a surplus, up from a
 * shortage, from the price line to where the market would clear.
 *
 * Straight down the middle between the curves, because the middle of the gap
 * is always over or under the equilibrium: at any price the two quantities
 * add to demand plus supply, so halfway between them is Q*. A surplus's words
 * are above the line and a shortage's below it, so the arrow, on the other
 * side, never runs into them. Stopped short of the line and of the point at
 * either end, as the engine's shift arrows are. In the price's grey: it says
 * where the price goes, as the price's own points do when it moves.
 *
 * Unlabelled, like the engine's shift arrows: the step that brings it in says
 * what it is, and "Price pressure" beside it ran across a curve wherever the
 * gap was small, and across half the plot on a phone.
 */
const pressure = (kind: 'surplus' | 'shortage') => ({
    type: 'Arrow',
    def: {
        name: kind + 'Pressure', title: '',
        begin: ['calcs.Qe', 'params.price'], end: ['calcs.Qe', 'calcs.Pe'],
        color: colourOf('price'), inset: 12,
        srTitle: kind === 'surplus' ? 'The surplus pushes the price down' : 'The shortage pushes the price up',
        show: `calcs.${kind} > 0`,
        breaksRule: {
            rule: 'Annotations',
            why: 'Which way a surplus or a shortage pushes the price is what the lesson teaches, and the ' +
                'engine draws no arrow for it: its arrows say where something was, and this says where the ' +
                'price is going. Drawn by hand, from the price line to the equilibrium.'
        }
    }
});

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
            pressure('surplus'),
            pressure('shortage'),
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

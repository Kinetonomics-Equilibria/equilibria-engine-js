import { axis, curve, namedArea, priceAxis, pricePoint } from '../kit/chart';
import { fromStep, stepTitled } from '../kit/lesson';
import type { ParamDefinition, PanelDefinition } from '../kit/lesson';
import { ELASTICITY_LESSON, START_PRICE, START_ROLLS } from './steps';

/**
 * The diagram: its params, its calcs and its panels.
 *
 * The model, in sausage rolls a day at the canteen's price P in dollars:
 *
 *     demand   Q = 210 − response·(P − 4.50)
 *
 * a straight line through where the canteen starts, 210 rolls at $4.50, that
 * pivots there: `response` is how many fewer rolls students buy for each
 * dollar on the price. Every curve the sliders draw passes through that one
 * point, so two curves can be compared by how far the same price rise moves
 * students along each.
 *
 * Elasticity is measured from that start, by the midpoint method: each
 * change as a share of halfway between before and after.
 *
 *     % change in price              100·(P − 4.50) / ((P + 4.50)/2)
 *     % change in quantity demanded  100·(Q − 210) / ((Q + 210)/2)
 *     price elasticity               |% change in quantity ÷ % change in price|
 *
 * Midpoint, not "from the start", because it is the measure under which a
 * price rise brings in more revenue exactly when demand is inelastic, which
 * is what the revenue panel shows. Measured from $4.50 alone, a rise to $5.50
 * that left revenue where it was would come out at about 0.8, and a student
 * would see revenue hold still under "inelastic".
 *
 * The numbers are chosen to come out whole: a $1 rise is 20%, and 210 rolls
 * is 21 tens, so losing 20 of them is 10% and losing 70 is 40%. Elasticities
 * of 0.50 and 2.00.
 */

/**
 * Quantity demanded as quantity in terms of the price, as every lesson's
 * demand is written, so the engine samples it along the price. `(y)` in
 * parentheses for the curve, because that is how the engine recognises the
 * variable and substitutes into it to place a label.
 */
const quantityAt = (response: string, price: string) =>
    `${START_ROLLS} - ${response}*(${price} - ${START_PRICE})`;

/** Each change from the start as a percentage of halfway between, so a rise and the fall back come out the same size. */
export const PCT_PRICE = `100*(params.price - ${START_PRICE})/((params.price + ${START_PRICE})/2)`;
export const PCT_QUANTITY = `100*(calcs.Qd - ${START_ROLLS})/((calcs.Qd + ${START_ROLLS})/2)`;
/** Without the minus sign, as it is taught. NaN at $4.50, where the price has not changed. */
export const ELASTICITY = 'abs(calcs.pctQ / calcs.pctP)';

/**
 * Where D is labelled: at its lower-right end, as the house rules put it, at
 * $1 — or, once the curve is flat enough to leave the plot through its right
 * edge before then, where it is at 380 rolls, short of that edge. That is
 * from 50 sales a dollar; at 80, the flattest, it is at $2.38, and the point
 * it must not sit on is at $3.50 or more and 290 rolls or fewer. A vertical
 * curve, at 0, divides by 1, not 0.
 */
const labelAt = (response: string) => `max(1, ${START_PRICE} - 170/max(${response}, 1))`;

/** Where the percentages and the elasticity arrive: nothing before, which a number about nothing would be. */
const PERCENTAGES = stepTitled(ELASTICITY_LESSON, 'Changes as percentages');
const ELASTICITY_STEP = stepTitled(ELASTICITY_LESSON, 'Price elasticity of demand');

/**
 * The params a student moves.
 *
 * The price from $3.50 to $6.50 in steps of 10c: $1 below the start and $2
 * above it, past the $5.50 every step and question uses, and never so high
 * that students buy none. A cut goes only as far down as $3.50 because there, with the
 * bakery's 70 sales a dollar, a cut still brings in more than $4.50 did: the
 * question that asks for one is marked by direction, and at $3.00 it would
 * bring in exactly as much. Labelled for the verdicts, which lower its first
 * letter: "You moved the price down".
 *
 * Sales lost per $1 from 0, a vertical curve, to 80 in steps of 10: 20 with
 * students kept in at lunch, 70 with the bakery. At 80 and $6.50 students
 * still buy 50 a day, and at $3.50, 290.
 */
export const PARAMS: ParamDefinition[] = [
    { name: 'price', label: 'The price', value: START_PRICE, min: 3.5, max: 6.5, round: 0.1 },
    { name: 'response', label: 'Sales lost per $1', value: 20, min: 0, max: 80, round: 10 }
];

/**
 * The levels. The percentages and the elasticity are NaN until the step that
 * brings each in, which the caption and the chain leave unsaid; the Maths tab
 * explains each without that (`explainedCalcs` in `index.ts`).
 */
export const CALCS = {
    Qd: quantityAt('params.response', 'params.price'),
    revenue: 'params.price * calcs.Qd',
    pctP: `${fromStep(PERCENTAGES)} ? ${PCT_PRICE} : NaN`,
    pctQ: `${fromStep(PERCENTAGES)} ? ${PCT_QUANTITY} : NaN`,
    e: `${fromStep(ELASTICITY_STEP)} ? ${ELASTICITY} : NaN`
};

/**
 * Demand, in a panel: blue, D at its lower right. Faint where it was, and the
 * question's lines, in both, because the revenue panel is at the front when
 * the bakery opens and through the questions.
 */
const demand = (panel: string) => curve({
    name: 'demand_' + panel, title: 'demand', meaning: 'demand', symbol: 'D',
    moves: ['response'],
    shape: p => ({ fn: quantityAt(p.response, '(y)'), samplePoints: 2 }),
    labelAt: p => ({ y: labelAt(p.response) }),
    ghost: true, asked: true
});

/**
 * What students buy at the canteen's price: P on the price axis, Qd on the
 * quantity axis. In the colour of a point chosen on a curve, as the Jordans'
 * is: orange moves along, blue pivots.
 */
const atPrice = (panel: string) => pricePoint({
    name: 'atPrice_' + panel, meaning: 'choice', price: 'price', on: ['response'],
    at: p => quantityAt(p.response, p.price), x: 'calcs.Qd', quantity: 'Q_d',
    srTitle: 'What students buy at the canteen\'s price', asked: true
});

/**
 * Two panels: the canteen's demand, headlined by the elasticity, and its
 * revenue, which arrives at the step that teaches it and takes the front.
 *
 * The quantity axis runs to 400, past the most the sliders sell, 290 at
 * $3.50 and 80 sales a dollar, with room for D's label beyond it. The price
 * axis runs to $8, past the top of the price's range.
 */
export const PANELS: PanelDefinition[] = [
    {
        key: 'canteen', name: 'Canteen', headline: 'e',
        xAxis: axis('Sausage rolls a day', 0, 400),
        yAxis: priceAxis(8),
        objects: [...demand('canteen'), ...atPrice('canteen')]
    },
    {
        key: 'revenue', name: 'Revenue', headline: 'revenue',
        xAxis: axis('Sausage rolls a day', 0, 400),
        yAxis: priceAxis(8),
        objects: [
            // Price times quantity, so the equilibrium's green, as the
            // market lesson's is. The panel's one area, so its title names
            // it. First, so the curve and the point are drawn over it.
            namedArea({
                name: 'revenueArea', meaning: 'equilibriumPrice', type: 'Rectangle',
                shape: { a: [0, 0], b: ['calcs.Qd', 'params.price'] },
                srTitle: 'Revenue'
            }),
            ...demand('revenue'), ...atPrice('revenue')
        ]
    }
];

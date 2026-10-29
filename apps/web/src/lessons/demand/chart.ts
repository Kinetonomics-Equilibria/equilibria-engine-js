import { axis, curve, priceAxis, priceLine, pricePoint } from '../kit/chart';
import { atStep, fromStep, stepRevealing, stepTitled } from '../kit/lesson';
import type { ParamDefinition, PanelDefinition } from '../kit/lesson';
import { DEMAND_LESSON } from './steps';

/** What the student would pay for their first pair, and how much less each pair after is worth. */
const FIRST_PAIR = 400;
const EACH_PAIR_LESS = 100;

/**
 * What the market wants at a price, in thousands of pairs a year: the
 * curve, the point on it and the quantity the caption reads, from one sum.
 *
 * The curve is written as quantity in terms of the price, for the reason the
 * A$ lesson gives: the engine says which way a curve moved by sampling it
 * along its own variable, so a curve written as Q = f(P) and pulled sideways
 * is said to shift right or left, as this is taught. `(y)` in parentheses for
 * the curve, because that is how the engine both recognises the variable and
 * substitutes into it to place a label.
 */
const quantityAt = (demand: string, price: string) => `${demand} - (${price} - 300)`;

/**
 * Where D is labelled: at its lower-right end, as the house rules put it,
 * forty dollars above the quantity axis — or, once demand is high enough to
 * leave the panel through its right-hand edge, a little above where it does.
 * The point it must not sit on is at $200 or more, well clear of either.
 */
const labelAt = (demand: string) => `max(40, ${demand} - 160)`;

/** Where the price arrives, on the student's chart. */
const PRICED = stepTitled(DEMAND_LESSON, 'Nike sets the price');
/** Where the point on the market's curve arrives, and quantity demanded with it. */
const QUANTITY = stepTitled(DEMAND_LESSON, 'Quantity demanded');

export const PARAMS: ParamDefinition[] = [
    // From $200 to $400 in steps of $10: at either end the student buys a
    // whole number of pairs, 3 or 1, and the market's point stays on the
    // chart for any demand. Labelled for the verdicts, which lower its first
    // letter: "You moved the price down".
    { name: 'price', label: 'The price', value: 300, min: 200, max: 400, round: 10 },
    // From 100 to 300 thousand pairs at $300, in steps of 10. At 100 and $400
    // fans want none, which is a true answer and the corner of what the
    // sliders reach; the point sits on the price axis there.
    { name: 'demand', label: 'Demand for Air Jordans', value: 200, min: 100, max: 300, round: 10 }
];

export const CALCS = {
    // Where the point on the market's curve is, from the step that brings it
    // in. `Qd` is the same number for the caption and the strip, and NaN
    // before that step, which both leave unsaid: a quantity demanded read out
    // over a curve with no price on it yet would be a number about nothing.
    q: quantityAt('params.demand', 'params.price'),
    Qd: `${fromStep(QUANTITY)} ? calcs.q : NaN`,
    // The pairs worth at least the price to the student: the points on or
    // above the dotted line. From the step that draws the line.
    mine: `${fromStep(PRICED)} ? ` +
        `floor((${FIRST_PAIR + EACH_PAIR_LESS} - params.price) / ${EACH_PAIR_LESS}) : NaN`
};

/**
 * One of the student's four pairs, at what it is worth to them.
 *
 * Its step says where it goes, "1 pair and $400", so it has droplines to read
 * that off the axes at that step and no other: the next pair takes them over,
 * and after the fourth the price's step counts points against its line. The
 * droplines carry no symbol on the axes, against the house rule, and say why.
 *
 * Each arrives: the point pops in, then its droplines are drawn out from it
 * to the axes, the way the step has the student read it.
 */
const pair = (n: number) => {
    const worth = FIRST_PAIR - EACH_PAIR_LESS * (n - 1);
    const name = 'pair' + n;
    return {
        type: 'Point',
        def: {
            name, title: '',
            x: n, y: worth,
            color: 'colors.demand',
            droplines: { vertical: '', horizontal: '', show: atStep(stepRevealing(DEMAND_LESSON, name)) },
            arrive: true,
            srTitle: `Pair ${n}, worth $${worth} to you`,
            breaksRule: {
                rule: 'Droplines',
                why: 'Each pair lands on a tick, so the tick number is the value its step says, and no symbol ' +
                    'on the list means what a pair is worth to you.'
            }
        }
    };
};

/**
 * The student's chart first, because panels arrive in the order they are
 * declared and it is on the stage from the start. The market arrives second,
 * and its step brings it to the front (`focus`), with the student's chart on
 * the rail beside it.
 *
 * The market headlined by quantity demanded, the student by the pairs they
 * buy: each the number its chart says about the price.
 */
export const PANELS: PanelDefinition[] = [
    {
        key: 'you', name: 'You', headline: 'mine',
        // Five pairs a year is where the student's points would reach $0,
        // and $500 is where they would start. Titled as the market's
        // quantity is, by its unit.
        xAxis: axis('Pairs a year', 0, 5),
        yAxis: priceAxis(500),
        objects: [
            // Nike's price across the student's chart, labelled on the price
            // axis as the market's dropline is, so P is one price on both.
            ...priceLine({ param: 'price', across: [0, 5], meaning: 'choice' }),
            pair(1), pair(2), pair(3), pair(4)
        ]
    },
    {
        key: 'market', name: 'Market', headline: 'Qd',
        // Wide enough for the most the sliders can ask for, 400 thousand
        // pairs at $200, with room past it. The unit is the whole title:
        // "Quantity (thousands of pairs a year)" ran past the edge of the
        // sheet on a phone.
        xAxis: axis('Thousands of pairs a year', 0, 500),
        yAxis: priceAxis(500),
        objects: [
            ...curve({
                name: 'marketDemand', title: 'demand', meaning: 'demand', symbol: 'D',
                moves: ['demand'],
                shape: p => ({ fn: quantityAt(p.demand, '(y)'), samplePoints: 2 }),
                labelAt: p => ({ y: labelAt(p.demand) }),
                // Sideways, because this curve moves sideways.
                drag: [{ horizontal: 'demand' }], ghost: true, asked: true
            }),
            // What fans want at Nike's price. In the colour of a point chosen
            // on a curve, not the curve's: orange moves along, blue shifts.
            // A student who moves the price sees it slide along the curve from
            // where a question found it, and one who shifts the curve sees it
            // slide sideways.
            ...pricePoint({
                name: 'atPrice', meaning: 'choice', price: 'price', on: ['demand'],
                at: p => quantityAt(p.demand, p.price), x: 'calcs.q', quantity: 'Q_d',
                srTitle: 'What fans want at Nike\'s price',
                show: fromStep(QUANTITY), asked: true
            })
        ]
    }
];

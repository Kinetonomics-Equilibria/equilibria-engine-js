import { axis, curve, priceAxis, priceLine, pricePoint } from '../kit/chart';
import { atStep, firstQuestion, fromStep, stepRevealing, stepTitled, untilStep } from '../kit/lesson';
import type { ParamDefinition, PanelDefinition } from '../kit/lesson';
import { NEW_AIRLINE_SEATS, SUPPLY_LESSON } from './steps';

/** The lowest fare at which the student's first flight is worth running, and how much more each flight after needs. */
const FIRST_FLIGHT = 100;
const EACH_FLIGHT_MORE = 50;

/**
 * What airlines offer at a fare, in thousands of seats a week: the curve, the
 * point on it and the quantity the caption reads, from one sum.
 *
 * The curve is written as quantity in terms of the fare, for the reason the
 * A$ and Jordans lessons give: the engine says which way a curve moved by
 * sampling it along its own variable, so a curve written as Q = f(P) and
 * pulled sideways is said to shift right or left, as this is taught. `(y)` in
 * parentheses for the curve, because that is how the engine both recognises
 * the variable and substitutes into it to place a label.
 */
const quantityAt = (supply: string, price: string) => `${supply} + (${price} - 200)`;

/**
 * The lowest fare the supply curve is drawn from.
 *
 * Shifted sideways, a line through the origin meets the quantity axis once
 * supply is past 200, which would say airlines fly 100 thousand seats a week
 * for nothing. So the curve starts at $50, short of either axis as a
 * textbook's is, and S and S₀ start at one height, side by side; a curve low
 * enough to meet the price axis above $50 starts there instead. The sliders
 * never take the fare under $100, so nothing a student reads is lost.
 */
const LOWEST_FARE_DRAWN = 50;

/**
 * Where S is labelled: near its upper-right end, as the house rules put it,
 * $40 under the top of the price axis. It leaves through the top edge for
 * every supply the sliders reach, at 300 to 500 thousand seats, so the label
 * is always on the plot; and the point it must not sit on is at $300 or less.
 */
const LABEL_AT = 360;

/** Where the fare arrives, on the student's chart. */
const PRICED = stepTitled(SUPPLY_LESSON, 'The going fare');
/** Where the point on the market's curve arrives, and quantity supplied with it. */
const QUANTITY = stepTitled(SUPPLY_LESSON, 'Quantity supplied');
/** The PEANUT part: from its first step to the step before the first question. */
const PEANUT = stepTitled(SUPPLY_LESSON, 'What shifts the whole curve');
const NEW_AIRLINE = stepTitled(SUPPLY_LESSON, 'N: number of sellers');
const FIRST_QUESTION = firstQuestion(SUPPLY_LESSON);

export const PARAMS: ParamDefinition[] = [
    // From $100 to $300 in steps of $10: at $100 the student runs 1 flight,
    // and from $250 all 4. Labelled for the verdicts, which lower its first
    // letter: "You moved the fare up".
    { name: 'price', label: 'The fare', value: 200, min: 100, max: 300, round: 10 },
    // From 100 to 300 thousand seats at $200, in steps of 10. At 100 and $100
    // airlines offer none, which is a true answer and the corner of what the
    // sliders reach; the point sits on the price axis there.
    { name: 'supply', label: 'Supply of seats', value: 200, min: 100, max: 300, round: 10 }
];

export const CALCS = {
    // Where the point on the market's curve is, from the step that brings it
    // in. `Qs` is the same number for the caption and the strip, and NaN
    // before that step, which both leave unsaid.
    q: quantityAt('params.supply', 'params.price'),
    Qs: `${fromStep(QUANTITY)} ? calcs.q : NaN`,
    // How much more a seat on each of the student's flights needs than at
    // the start: the market's shift read as a cost, $1 for every thousand
    // seats, less the new airline's seats from its step on, since another
    // airline's planes cost the student nothing. Through PEANUT only, and 0
    // everywhere else (see the top of `index.ts`).
    yourCost: `(${fromStep(PEANUT)} and ${untilStep(FIRST_QUESTION)}) ? ` +
        `200 - params.supply + (${fromStep(NEW_AIRLINE)} ? ${NEW_AIRLINE_SEATS} : 0) : 0`,
    // The flights whose costs the fare covers: the points on or below the
    // dotted line. From the step that draws the line.
    mine: `${fromStep(PRICED)} ? min(4, max(0, ` +
        `floor((params.price - ${FIRST_FLIGHT - EACH_FLIGHT_MORE} - calcs.yourCost) / ${EACH_FLIGHT_MORE}))) : NaN`
};

/**
 * One of the student's four flights, at the lowest fare it is worth flying for.
 *
 * Its step says where it goes, "1 flight and $100", so it has droplines to
 * read that off the axes at that step and no other, as the Jordans' pairs do,
 * and carry no symbol on the axes, for their reason.
 *
 * Each arrives: the point pops in, then its droplines are drawn out from it
 * to the axes, the way the step has the student read it.
 */
const flight = (n: number) => {
    const needs = FIRST_FLIGHT + EACH_FLIGHT_MORE * (n - 1);
    const name = 'flight' + n;
    return {
        type: 'Point',
        def: {
            name, title: '',
            x: n, y: `${needs} + calcs.yourCost`,
            color: 'colors.supply',
            droplines: { vertical: '', horizontal: '', show: atStep(stepRevealing(SUPPLY_LESSON, name)) },
            arrive: true,
            srTitle: `Flight ${n}, at the lowest fare that covers its costs`,
            breaksRule: {
                rule: 'Droplines',
                why: 'Each flight lands on a tick, so the tick number is the value its step says, and no ' +
                    'symbol on the list means the fare a flight needs.'
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
 * The market headlined by quantity supplied, the student by the flights they
 * run: each the number its chart says about the fare.
 */
export const PANELS: PanelDefinition[] = [
    {
        key: 'you', name: 'Your airline', headline: 'mine',
        // Room for a fifth flight past the student's four. The price axis is
        // the market's, so P is one height on both charts, and it reaches the
        // $400 a fourth flight needs at the most it can: supply dragged to
        // its least after the new airline's step.
        xAxis: axis('Flights a day', 0, 5),
        yAxis: priceAxis(400),
        objects: [
            // The going fare across the student's chart. Grey `price`, not
            // `choice`: see the top of `index.ts`.
            ...priceLine({ param: 'price', across: [0, 5], meaning: 'price' }),
            flight(1), flight(2), flight(3), flight(4)
        ]
    },
    {
        key: 'market', name: 'Market', headline: 'Qs',
        // Wide enough for the most the sliders can offer, 400 thousand seats
        // at $300, with room past it.
        xAxis: axis('Thousands of seats a week', 0, 500),
        yAxis: priceAxis(400),
        objects: [
            ...curve({
                name: 'marketSupply', title: 'supply', meaning: 'supply', symbol: 'S',
                moves: ['supply'],
                shape: p => ({ fn: quantityAt(p.supply, '(y)'), samplePoints: 2, min: LOWEST_FARE_DRAWN }),
                labelAt: () => ({ y: LABEL_AT }),
                // Sideways, because this curve moves sideways.
                drag: [{ horizontal: 'supply' }], ghost: true, asked: true
            }),
            // What airlines offer at the fare. In the fare's grey, not the
            // curve's orange: grey moves along, orange shifts.
            ...pricePoint({
                name: 'atPrice', meaning: 'price', price: 'price', on: ['supply'],
                at: p => quantityAt(p.supply, p.price), x: 'calcs.q', quantity: 'Q_s',
                srTitle: 'What airlines offer at the fare',
                show: fromStep(QUANTITY), asked: true
            })
        ]
    }
];

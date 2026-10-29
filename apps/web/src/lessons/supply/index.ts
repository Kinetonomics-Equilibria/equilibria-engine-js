import type { Scenario } from '../../dock/Scenarios';
import { defineLesson } from '../kit/lesson';
import type { ModelSpec } from '../kit/lesson';
import type { StudyContent, StudyModel } from '../content';
import { BASELINE, SUPPLY_LESSON } from './steps';
import { CALCS, PANELS, PARAMS } from './chart';
import coverPicture from '../pictures/flights-cover.svg';

export { SUPPLY_LESSON } from './steps';

/**
 * Supply, and what shifts it, told with plane tickets from Sydney to Melbourne.
 *
 * The Air Jordans lesson told from the other side of the counter, and built
 * the same way. Two charts. The first is one seller, the student, who runs an
 * airline: the lowest fare at which each of its flights a day is worth
 * flying, from a first flight at $100 a seat to a fourth at $250, each $50
 * dearer than the one before. That is increasing marginal cost, stepped out as
 * four points, and it is why a supply curve slopes up: the higher the fare,
 * the more flights cover their costs. The going fare is drawn across the same
 * chart, so the flights worth running are the points on or below it.
 *
 * The second is every airline on the route, whose flights all cost a little
 * more or less to run, so their points add up to a smooth line: the market
 * supply curve. A change in the fare slides the point along it, and anything
 * in PEANUT shifts the whole curve. That difference is what the questions
 * turn on, so each offers both the fare and the curve.
 *
 * The model, in thousands of seats a week at a fare P in dollars:
 *
 *     market       Q = supply + (P − 200)
 *     the student  every flight the fare covers: 3 at $200, 4 at $250 and up
 *
 * so `supply` is what airlines offer at $200, the fare at the start, and a
 * dollar on the fare is a thousand seats a week. Because it is one for one, a
 * shift of 50 thousand seats sideways is a shift of $50 up or down, and the
 * tax step says so: the curve rises by the tax.
 *
 * Unlike the Jordans fan, the student's airline is one of the sellers the
 * PEANUT steps are about. Dearer fuel, a tax on every ticket or newer planes
 * change what its own flights cost, so through that part of the lesson its
 * points move with the market's costs (`yourCost`), and "What changed" says
 * how many flights it now runs. A new airline on the route is the one letter
 * that changes nothing about the student's flights, and the N step makes a
 * point of it, as the Jordans' population step does. Outside that part, in
 * the questions and the playground, the student's chart holds still at its
 * own costs, as the fan's does: there, a move of the curve could be any letter,
 * and only five of the six would be the student's costs.
 *
 * The fare is drawn in `price`, grey, where the Jordans' price is `choice`.
 * `choice` is orange, which is supply's colour, so here the fare line, the
 * point it picks and the flights it is read against would all be one orange,
 * and the flight that needs exactly the fare would vanish into the line it
 * sits on. See "Colour" in `docs/chart-design.md`.
 */

/**
 * The numbers the strip reports, and what they are called everywhere.
 *
 * Quantity supplied first: it is the market's caption and what "why?" opens
 * the maths on, and its rise and fall are the step title that teaches it. In
 * thousands, which the axis says.
 */
const NARRATED_CALCS = [
    {
        name: 'Qs', label: 'Quantity supplied', precision: 0, tex: 'Q_s',
        meaning: 'Thousands of seats airlines offer a week at the fare',
        rise: 'Quantity supplied rises', fall: 'Quantity supplied falls'
    },
    {
        name: 'mine', label: 'Flights you run', precision: 0,
        meaning: 'Your flights a day at the fare: every flight whose costs it covers',
        rise: 'You run more flights', fall: 'You run fewer flights'
    }
];

/**
 * PEANUT, as one-click shifts, and the fare itself beside them.
 *
 * Each says which letter it is and so which way supply goes; the strip says
 * what that did to the quantity. Each sets only the param it is about, so
 * two can be combined.
 */
const SCENARIOS: Scenario[] = [
    {
        id: 'fuel-dearer',
        label: 'Jet fuel gets dearer',
        description: 'An input costs more, so every flight costs more to run: supply decreases.',
        params: { supply: 150 }
    },
    {
        id: 'boom-expected',
        label: 'Airlines expect a boom',
        description: 'They lease planes and train crew now, ready for more travellers: supply increases.',
        params: { supply: 250 }
    },
    {
        id: 'gold-coast',
        label: 'Gold Coast fares jump',
        description: 'Planes move to the route that pays more, a substitute in production: supply decreases.',
        params: { supply: 150 }
    },
    {
        id: 'freight',
        label: 'Freight rates rise',
        description: 'Each flight earns more from the freight in its hold, a complement in production: ' +
            'supply increases.',
        params: { supply: 250 }
    },
    {
        id: 'new-airline',
        label: 'A new airline joins the route',
        description: 'More sellers offer more seats at every fare: supply increases.',
        params: { supply: 250 }
    },
    {
        id: 'airline-broke',
        label: 'An airline goes broke',
        description: 'Fewer sellers offer fewer seats at every fare: supply decreases.',
        params: { supply: 150 }
    },
    {
        id: 'new-planes',
        label: 'Airlines get new planes',
        description: 'Planes that burn less fuel make every flight cheaper to run: supply increases.',
        params: { supply: 250 }
    },
    {
        id: 'ticket-tax',
        label: 'A $50 tax on every ticket',
        description: 'Each seat must sell for $50 more to cover its costs: supply decreases.',
        params: { supply: 150 }
    },
    {
        id: 'seat-subsidy',
        label: 'A $50 subsidy on every seat',
        description: 'Each seat costs airlines $50 less to fly: supply increases.',
        params: { supply: 250 }
    },
    {
        id: 'school-holidays',
        label: 'Holiday fares rise $50',
        description: 'The fare itself rises, so airlines move along the curve: quantity supplied rises, ' +
            'and supply stays put.',
        params: { price: 250 }
    },
    {
        id: 'baseline',
        label: 'Back to the start',
        params: { ...BASELINE }
    }
];

/** One airline's supply of seats and every airline's: what the PEANUT lesson is drawn on. */
const MODEL: ModelSpec = {
    id: 'plane-tickets',
    name: 'Supply of plane tickets',
    params: PARAMS,
    calcs: CALCS,
    panels: PANELS,
    narratedCalcs: NARRATED_CALCS,
    // Quantity supplied as the sum a student can do: what airlines offer at
    // $200, plus a thousand seats for every dollar the fare is above it. The
    // student's own flights are a count of points, not a formula.
    explainedCalcs: {
        Qs: CALCS.q
    },
    paramMeanings: {
        supply: 'thousands of seats airlines offer a week at $200',
        price: 'the fare for a seat, in dollars'
    },
    // Each answerable with the two sliders: the student runs all 4 flights
    // from $250, where airlines offer 250 thousand at the start; a fare rise
    // raises quantity supplied and leaves the curve; and 250 at $200 is
    // supply at 250, which E, A, N, U or T can cause.
    explorePrompts: [
        'Find the lowest fare at which you\'d run all 4 flights. How many seats do all airlines offer there?',
        'Make quantity supplied rise without moving the supply curve.',
        'Shift supply so airlines offer 250,000 seats at $200. Which letters of PEANUT could do that?'
    ],
    // The curve is orange, as supply always is; the fare is grey, as the
    // point it moves and the line it draws are.
    paramWords: {
        price: {
            about: 'What a seat on the route sells for. Changing it moves airlines along the curve, and ' +
                'the curve stays put.',
            rise: 'Fares rise',
            fall: 'Fares fall',
            curve: 'price',
            // Said of a flight, not of airlines, so it holds at the steps where
            // the chart is your own flights alone.
            because: {
                rise: 'More flights cover their costs at the higher fare, so more seats are offered: ' +
                    'a move along the curve.',
                fall: 'Fewer flights cover their costs at the lower fare, so fewer seats are offered: ' +
                    'a move along the curve.'
            }
        },
        supply: {
            about: 'The seats all airlines offer at each fare. Anything in PEANUT shifts it.',
            rise: 'Supply of seats increases',
            fall: 'Supply of seats decreases',
            curve: 'supply',
            because: {
                rise: 'The fare hasn\'t changed, but airlines now offer more seats at every fare, ' +
                    'including this one.',
                fall: 'The fare hasn\'t changed, but airlines now offer fewer seats at every fare, ' +
                    'including this one.'
            }
        }
    },
    scenarios: SCENARIOS,
    // The curve is dragged sideways, so its param rises as it moves right.
    directionWords: {
        supply: { up: 'right', down: 'left' }
    }
};

export const SUPPLY_SHIFTERS: StudyContent = defineLesson({
    id: 'supply',
    label: 'What shifts supply',
    title: 'Plane tickets, and what shifts supply',
    goals: [
        'Why each extra flight needs a higher fare',
        'Moving along the supply curve, and shifting it',
        'The six things that shift supply: PEANUT'
    ],
    cover: {
        question: 'What makes airlines offer more seats?',
        hook: 'Some weeks there\'s a flight to Melbourne every half hour, and some weeks airlines cut ' +
            'back. Work out what airlines weigh up and you can say which way supply will move.',
        picture: 'cover'
    },
    pictures: {
        cover: {
            name: 'A departures board',
            src: coverPicture,
            alt: 'An airport departures board listing five morning flights to Melbourne, half an hour ' +
                'apart, with one cancelled, and a plane waiting at the gate through the window.'
        }
    },
    asides: {
        airlineNews: {
            name: 'News report',
            headline: 'Budget airline grounds its planes',
            body: 'A budget airline that flew Sydney to Melbourne has gone broke, and all its flights are ' +
                'cancelled.',
            note: 'A made-up report, for this question'
        }
    },
    steps: SUPPLY_LESSON,
    model: MODEL
});

export const PLANE_TICKETS: StudyModel = SUPPLY_SHIFTERS.model;

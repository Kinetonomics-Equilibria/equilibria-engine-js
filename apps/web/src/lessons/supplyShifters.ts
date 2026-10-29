import type { LessonStep } from '../track/track';
import type { Scenario } from '../dock/Scenarios';
import type { StudyContent, StudyModel } from './content';
import coverPicture from './pictures/flights-cover.svg';

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

/** The lowest fare at which the student's first flight is worth running, and how much more each flight after needs. */
const FIRST_FLIGHT = 100;
const EACH_FLIGHT_MORE = 50;

/** The seats a new airline adds to the route at every fare, from the N step on. */
const NEW_AIRLINE_SEATS = 50;

/** Where the market starts, and where every question starts from. */
const BASELINE = { price: 200, supply: 200 };

/**
 * The market's supply curve, as quantity in terms of the fare.
 *
 * Written that way round for the reason the A$ and Jordans lessons give: the
 * engine says which way a curve moved by sampling it along its own variable,
 * so a curve written as Q = f(P) and pulled sideways is said to shift right
 * or left, as this is taught. `(y)` in parentheses, because that is how the
 * engine both recognises the variable and substitutes into it to place a
 * label.
 */
const supplyAt = (supply: string) => `${supply} + ((y) - 200)`;

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

/**
 * Sideways, because this curve moves sideways, and frozen once an answer is
 * committed, as in every lesson.
 */
const DRAG_SUPPLY = [{ horizontal: 'supply', draggable: 'not(params.submitted)' }];

/**
 * The lesson, in four parts: why supply slopes up, from one airline to the
 * market, PEANUT, and four news items for the student to work out.
 *
 * Written the way the other lessons are, for Year 10 to first-year students:
 * one idea per step, a short title that says it, a paragraph saying what
 * happens and, where it helps, one saying what it means. A word is defined
 * where it is first used, in a key-term box, and not again.
 *
 * Every number a step states is one the diagram solves to at that step, and
 * `supplyShifters.test.tsx` holds them to it.
 */
export const SUPPLY_LESSON: LessonStep[] = [
    // The student's own four flights, one at a time: the fare each needs
    // stepped out flight by flight, so the upward slope is something they
    // worked out before it is a line on a chart.
    {
        part: 'Why supply slopes up',
        reveal: ['flight1'],
        title: 'Your first flight',
        say: 'Say you run an airline flying Sydney to Melbourne. Your first flight of the day uses your ' +
            'newest plane and a crew already at work, so it\'s cheap to run: seats at $100 or more cover ' +
            'its costs.\n\n' +
            'That\'s the lowest fare you\'d fly it for, so it goes on the chart at 1 flight and $100.',
        term: {
            word: 'Cost of production',
            meaning: 'What a business pays to make something. For a flight, that\'s fuel, crew, the plane ' +
                'and airport fees.'
        }
    },
    {
        reveal: ['flight2'],
        title: 'Your second flight',
        say: 'A second flight needs your older plane, which burns more fuel. You\'d fly it only if seats ' +
            'sell for $150 or more.\n\n' +
            'The second flight costs more to run than the first did.',
        term: {
            word: 'Marginal cost',
            meaning: 'The extra cost of producing one more unit: here, one more flight.'
        }
    },
    {
        reveal: ['flight3'],
        title: 'Your third flight',
        say: 'A third flight means leasing a plane and paying the crew overtime. It needs $200 a seat.\n\n' +
            'Each flight costs more to run than the one before, so each needs a higher fare.',
        term: {
            word: 'Increasing marginal cost',
            meaning: 'Each extra unit costs more to produce than the one before.'
        }
    },
    {
        reveal: ['flight4'],
        title: 'Your fourth flight',
        say: 'A fourth flight stretches you further still: $250 a seat, at least.\n\n' +
            'Every flight needs $50 more a seat than the last. The more flights you run, the more one more ' +
            'costs, so your points step up.'
    },
    // The fare arrives on the student's chart before there is a market to
    // put it on, so "how many would you run?" is answered by counting points.
    {
        reveal: ['priceLine', 'priceSymbol'],
        set: { price: 200 },
        title: 'The going fare',
        say: 'Say seats on the route sell for $200: the dotted line, P. Your first three flights cover ' +
            'their costs at that fare, so you run 3. Your fourth needs $250, so you don\'t run it.\n\n' +
            'Move the fare and count how many flights you\'d run.',
        try: [{ param: 'price', label: 'The fare' }],
        term: {
            word: 'Law of supply',
            meaning: 'When the price of something rises, sellers offer more of it. When it falls, they ' +
                'offer less.'
        }
    },
    {
        part: 'From you to the market',
        reveal: ['market'],
        // The rest of the lesson is about the market, so it takes the front
        // as it arrives, and the student's chart goes to the rail.
        focus: 'market',
        set: { ...BASELINE },
        title: 'Every airline on the route',
        say: 'You\'re one of several airlines flying Sydney to Melbourne, and every flight costs a ' +
            'different amount to run. Add up the seats they\'d all offer at each fare.\n\n' +
            'All those points together make one smooth line: the market supply curve, S.',
        term: {
            word: 'Market supply',
            meaning: 'How much all sellers together are willing and able to sell at each price.'
        }
    },
    // Draws the point on the market's curve, by its `show` rather than a
    // reveal: the step before revealed the market's panel, which reaches
    // everything in it, and a second reveal of the point would be two steps
    // claiming one object.
    {
        title: 'Quantity supplied',
        say: 'At a fare of P = $200, airlines offer 200,000 seats a week. Read it off the bottom axis, ' +
            'at Qs.\n\n' +
            'One price gives one quantity: a single point on the curve.',
        term: {
            word: 'Quantity supplied',
            meaning: 'How much sellers want to sell at one particular price.'
        }
    },
    {
        set: { price: 250 },
        title: 'Quantity supplied rises',
        say: 'Say fares rise to $250. Airlines offer 250,000 seats a week, and the point slides up the ' +
            'curve from the faint one, where it was. The curve itself doesn\'t move.\n\n' +
            'And you now run 4: at $250, your fourth flight covers its costs too.',
        try: [{ param: 'price', label: 'The fare' }],
        term: {
            word: 'Change in quantity supplied',
            meaning: 'A move along the supply curve, because the good\'s own price changed.'
        }
    },
    // The determinants in the order the acronym spells them. Each step moves
    // supply from where the step before left it, so the dashed curve is
    // always the one the student just read about; they zigzag about the
    // start rather than climbing off the chart. Every letter but N moves the
    // student's own points with the market's (see the top), and the steps
    // that change how many flights they run say so.
    {
        part: 'PEANUT: what shifts supply',
        set: { ...BASELINE },
        title: 'What shifts the whole curve',
        say: 'Back at $200, change anything other than the fare and the whole supply curve shifts. The ' +
            'six things that shift it spell PEANUT.\n\n' +
            'Prices of inputs, Expectations, Alternative goods, Number of sellers, Upgraded technology, ' +
            'and Taxes and subsidies.',
        term: {
            word: 'Change in supply',
            meaning: 'The whole supply curve shifts, because something other than the good\'s own price ' +
                'changed.'
        }
    },
    {
        set: { supply: 150 },
        title: 'P: prices of inputs',
        say: 'Jet fuel gets dearer. Fuel is one of an airline\'s biggest costs, so every flight costs more ' +
            'to run. Yours too: each now needs $50 more a seat, so you run 2.\n\n' +
            'Airlines offer fewer seats at every fare. Supply decreases: the curve shifts left of the ' +
            'dashed one, where it was, to 150,000 seats at $200.',
        term: {
            word: 'Inputs',
            meaning: 'What a business uses to make a good: for an airline, fuel, crew, planes and airports.'
        }
    },
    {
        set: { supply: 200 },
        title: 'E: expectations',
        say: 'Airlines expect the economy to boom next year, with more people flying for work and ' +
            'holidays. So they lease extra planes and train more crew now, ready for it.\n\n' +
            'They offer more seats at every fare. Supply increases: the curve shifts right.',
        term: {
            word: 'Expectations',
            meaning: 'What sellers think will happen later, such as the economy growing or slowing.'
        }
    },
    {
        set: { supply: 150 },
        title: 'A: a substitute pays more',
        say: 'Fares to the Gold Coast jump for the summer holidays. The same planes can fly either route, ' +
            'so airlines move some to the Gold Coast, where they earn more.\n\n' +
            'They offer fewer seats to Melbourne at every fare. Supply decreases: the curve shifts left.',
        term: {
            word: 'Substitute in production',
            meaning: 'Another good a seller could make with the same resources, like flights on a ' +
                'different route.'
        }
    },
    {
        set: { supply: 200 },
        title: 'A: a complement pays more',
        say: 'A passenger flight also carries freight, such as parcels, in its hold. Say freight rates ' +
            'rise, so each flight earns more from its hold.\n\n' +
            'Flights are worth more to run, so airlines offer more seats at every fare. Supply ' +
            'increases: the curve shifts right.',
        term: {
            word: 'Complement in production',
            meaning: 'A good made together with another, like the freight a passenger flight carries in ' +
                'its hold.'
        }
    },
    {
        set: { supply: 200 + NEW_AIRLINE_SEATS },
        title: 'N: number of sellers',
        say: 'A new budget airline starts flying Sydney to Melbourne.\n\n' +
            'More sellers offer more seats at every fare, so supply increases. Your own points don\'t ' +
            'move: there are just more airlines.'
    },
    {
        set: { supply: 300 },
        title: 'U: upgraded technology',
        say: 'Airlines swap old planes for new ones that burn a fifth less fuel, yours included. Each ' +
            'flight costs less to run, so you run 4.\n\n' +
            'Airlines offer more seats at every fare. Supply increases again: at $200, they now offer ' +
            '300,000 seats a week.',
        term: {
            word: 'Technology',
            meaning: 'The know-how, machines and methods used to make a good.'
        }
    },
    // Taxes drawn, and subsidies said: a subsidy after the tax would be the
    // tax scrapped and $50 paid on top, which takes the curve past the
    // sliders' reach and the student's first flight down to $0 a seat. The
    // last question and a scenario are a subsidy, so it is moved as well as
    // said before the lesson ends.
    {
        set: { supply: 250 },
        title: 'T: taxes and subsidies',
        say: 'The government puts a $50 tax on every ticket, paid by the airline. Each seat must now sell ' +
            'for $50 more to cover its costs, so you run 3.\n\n' +
            'The curve shifts up by $50, the tax: left, to 250,000 seats at $200. A subsidy for every ' +
            'seat would do the opposite.',
        term: {
            word: 'Subsidy',
            meaning: 'Money the government pays a business for each unit it sells, which lowers its costs.'
        }
    },
    // The questions. Each starts from the baseline, and each offers the fare
    // and the curve, in that order every time: which one the news moves is
    // the first half of the answer. Two are written to catch a student who
    // moves the fare for any news with a price in it — the pilots' pay rise,
    // and a subsidy said to keep fares low — and one is the fare itself,
    // which is the one time the fare is the answer.
    //
    // The fare is labelled "The fare" so a verdict reads "You moved the fare
    // up", and no prompt says "the fare": the holiday question says "seats
    // now sell for $50 more" instead.
    //
    // Direction only, as in the other lessons. `illustrate` is how far "Show
    // me" draws the answer, a number made up for the picture: S₁ for the
    // curve, and for the fare the point at P₁.
    {
        part: 'Your turn',
        set: { ...BASELINE },
        aside: 'airlineNews',
        title: 'A budget airline goes broke',
        say: 'Read the news report next to the diagram.\n\n' +
            'What moves, and which way? Move it, then press Check.',
        ask: {
            param: 'supply', direction: 'down', among: ['price', 'supply'], illustrate: 50,
            explain: 'One seller has left the route, and its flights have gone with it. Airlines offer ' +
                'fewer seats at every fare: supply decreases, and the curve shifts left.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'The school holidays',
        say: 'It\'s the school holidays, and seats to Melbourne now sell for $50 more.\n\n' +
            'What moves, and which way?',
        ask: {
            param: 'price', direction: 'up', among: ['price', 'supply'], illustrate: 50,
            explain: 'This is the price of the seats themselves, so the curve stays put. Airlines move up ' +
                'along it to $250: quantity supplied rises, and supply doesn\'t change.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'Pilots get a pay rise',
        say: 'Airline pilots win a 15% pay rise.\n\n' +
            'What moves, and which way?',
        ask: {
            param: 'supply', direction: 'down', among: ['price', 'supply'], illustrate: 50,
            explain: 'A price rose, but not the price of a seat. Pilots are an input, so every flight costs ' +
                'more to run and airlines offer fewer seats at every fare: supply decreases.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'The government pays airlines',
        say: 'To keep fares low, the government will pay airlines $50 for every seat they fly.\n\n' +
            'What moves, and which way?',
        ask: {
            param: 'supply', direction: 'up', among: ['price', 'supply'], illustrate: 50,
            explain: 'That\'s a subsidy: each seat costs airlines $50 less to fly. They offer more seats at ' +
                'every fare, so supply increases, and the curve shifts right.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'Over to you',
        say: 'Here\'s how you went on the four cases.\n\n' +
            'Press Finish to take this market to the Playground, where you can try more cases in ' +
            'Scenarios or move the fare and the curve yourself.',
        recap: {
            takeaway: 'A change in the good\'s own price moves sellers along its supply curve. Anything ' +
                'else in PEANUT shifts the whole curve: right when sellers offer more at every price, left ' +
                'when they offer less.'
        }
    }
];

/** The position of the step titled `title`: 1 for the first step. */
const stepTitled = (title: string) => SUPPLY_LESSON.findIndex(step => step.title === title) + 1;

/** Where the fare arrives, on the student's chart. */
const PRICED = stepTitled('The going fare');
/** Where the point on the market's curve arrives, and quantity supplied with it. */
const QUANTITY = stepTitled('Quantity supplied');
/** The PEANUT part: from its first step to the step before the first question. */
const PEANUT = stepTitled('What shifts the whole curve');
const NEW_AIRLINE = stepTitled('N: number of sellers');
const FIRST_QUESTION = SUPPLY_LESSON.findIndex(step => !!step.ask) + 1;

/** Each param of the question apparatus is bounded like the param it draws. */
const PRICE = { value: 200, min: 100, max: 300, round: 10 };
const SUPPLY = { value: 200, min: 100, max: 300, round: 10 };
const apparatus = (name: string, like: typeof PRICE) => ({ name, ...like, presentation: true });

const calcs = {
    // Where the point on the market's curve is, from the step that brings it
    // in. `Qs` is the same number for the caption and the strip, and NaN
    // before that step, which both leave unsaid.
    q: 'params.supply + (params.price - 200)',
    Qs: `params.step >= ${QUANTITY} ? calcs.q : NaN`,
    // How much more a seat on each of the student's flights needs than at
    // the start: the market's shift read as a cost, $1 for every thousand
    // seats, less the new airline's seats from its step on, since another
    // airline's planes cost the student nothing. Through PEANUT only, and 0
    // everywhere else (see the top).
    yourCost: `(params.step >= ${PEANUT} and params.step < ${FIRST_QUESTION}) ? ` +
        `200 - params.supply + (params.step >= ${NEW_AIRLINE} ? ${NEW_AIRLINE_SEATS} : 0) : 0`,
    // The flights whose costs the fare covers: the points on or below the
    // dotted line. From the step that draws the line.
    mine: `params.step >= ${PRICED} ? min(4, max(0, ` +
        `floor((params.price - ${FIRST_FLIGHT - EACH_FLIGHT_MORE} - calcs.yourCost) / ${EACH_FLIGHT_MORE}))) : NaN`,
    dQs: 'calcs.Qs - prev.calcs.Qs',
    dMine: 'calcs.mine - prev.calcs.mine'
};

/** The position of the step that puts `name` on the chart. */
const revealing = (name: string) => SUPPLY_LESSON.findIndex(step => (step.reveal || []).includes(name)) + 1;

/**
 * One of the student's four flights, at the lowest fare it is worth flying for.
 *
 * Its step says where it goes, "1 flight and $100", so it has droplines to
 * read that off the axes at that step and no other, as the Jordans' pairs do.
 * Not named on the axes, for their reason: each flight lands on a tick, so
 * the tick number is the value its step says.
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
            droplines: { vertical: '', horizontal: '', show: `params.step == ${revealing(name)}` },
            arrive: true,
            srTitle: `Flight ${n}, at the lowest fare that covers its costs`
        }
    };
};

export const supplyDiagram = {
    schema: 'EconSchema',

    params: [
        // From $100 to $300 in steps of $10: at $100 the student runs 1
        // flight, and from $250 all 4. Labelled for the verdicts, which lower
        // its first letter: "You moved the fare up".
        { name: 'price', label: 'The fare', ...PRICE },
        // From 100 to 300 thousand seats at $200, in steps of 10. At 100 and
        // $100 airlines offer none, which is a true answer and the corner of
        // what the sliders reach; the point sits on the price axis there.
        { name: 'supply', label: 'Supply of seats', ...SUPPLY },

        // The question apparatus, presentation like every lesson's.
        { name: 'asking', value: 0, min: 0, max: 1, round: 1, presentation: true },
        { name: 'submitted', value: 0, min: 0, max: 1, round: 1, presentation: true },
        { name: 'revealed', value: 0, min: 0, max: 1, round: 1, presentation: true },
        apparatus('startPrice', PRICE),
        apparatus('answerPrice', PRICE),
        apparatus('startSupply', SUPPLY),
        apparatus('answerSupply', SUPPLY)
    ],

    calcs,

    layout: {
        CustomLayout: {
            // The student's chart first, because panels arrive in the order
            // they are declared and it is on the stage from the start. The
            // market arrives second, and its step brings it to the front
            // (`focus`), with the student's chart on the rail beside it.
            panels: [
                {
                    key: 'you',
                    // Room for a fifth flight past the student's four. The
                    // price axis is the market's, so P is one height on both
                    // charts, and it reaches the $400 a fourth flight needs
                    // at the most it can: supply dragged to its least after
                    // the new airline's step.
                    xAxis: { title: 'Flights a day', min: 0, max: 5 },
                    yAxis: { title: 'Price (\\$)', min: 0, max: 400 },
                    objects: [
                        // The going fare across the student's chart, dotted
                        // because it is a line to read the points against, and
                        // labelled on the price axis as the market's dropline
                        // is, so P is one price on both charts. Grey `price`,
                        // not `choice`: see the top.
                        {
                            type: 'Segment',
                            def: {
                                name: 'priceLine', title: '',
                                a: [0, 'params.price'], b: [5, 'params.price'],
                                color: 'colors.price', lineStyle: 'dotted'
                            }
                        },
                        {
                            type: 'Label',
                            def: {
                                name: 'priceSymbol', title: '',
                                x: 'AXIS', y: 'params.price', text: 'P',
                                color: 'colors.price'
                            }
                        },
                        flight(1), flight(2), flight(3), flight(4)
                    ]
                },
                {
                    key: 'market',
                    // Wide enough for the most the sliders can offer, 400
                    // thousand seats at $300, with room past it.
                    xAxis: { title: 'Thousands of seats a week', min: 0, max: 500 },
                    yAxis: { title: 'Price (\\$)', min: 0, max: 400 },
                    objects: [
                        {
                            type: 'Curve',
                            def: {
                                name: 'marketSupply', title: 'supply',
                                fn: supplyAt('params.supply'), samplePoints: 2, min: LOWEST_FARE_DRAWN,
                                color: 'colors.supply',
                                label: { text: 'S', y: LABEL_AT },
                                srTitle: 'Supply',
                                drag: DRAG_SUPPLY,
                                // S₀ is where the curve was, and stands down
                                // while a question is on screen, where the
                                // question's own start line is the "before".
                                ghost: { show: 'not(params.asking)', label: '_0' }
                            }
                        },
                        // Where a question found the curve, and where its
                        // answer would put it, as in the other lessons.
                        {
                            type: 'Curve',
                            def: {
                                name: 'questionStartSupply', title: '',
                                fn: supplyAt('params.startSupply'), samplePoints: 2, min: LOWEST_FARE_DRAWN,
                                color: 'colors.supply', lineStyle: 'dashed', strokeOpacity: 0.35,
                                show: 'params.asking'
                            }
                        },
                        {
                            type: 'Curve',
                            def: {
                                name: 'questionAnswerSupply', title: '',
                                fn: supplyAt('params.answerSupply'), samplePoints: 2, min: LOWEST_FARE_DRAWN,
                                color: 'colors.supply', lineStyle: 'dotted',
                                label: { text: 'S_1', y: LABEL_AT },
                                show: 'params.revealed and (params.answerSupply != params.startSupply)'
                            }
                        },
                        // Where the point was when a question was asked, drawn
                        // as a ghost point is: the student who moves the fare
                        // sees it slide away from here along the curve, and
                        // the one who shifts the curve sees it slide sideways.
                        {
                            type: 'Point',
                            def: {
                                name: 'questionStartPoint', title: '',
                                x: 'params.startSupply + (params.startPrice - 200)', y: 'params.startPrice',
                                color: 'colors.price', opacity: 0.35, strokeOpacity: 0.35,
                                show: 'params.asking'
                            }
                        },
                        // Where the point goes when the answer is the fare: on
                        // the curve as the question found it, at the fare the
                        // answer moves it to, read off the price axis at P₁.
                        // Only once a verdict shows it, and never for a
                        // question about the curve.
                        {
                            type: 'Point',
                            def: {
                                name: 'questionAnswerPoint', title: '',
                                x: 'params.startSupply + (params.answerPrice - 200)', y: 'params.answerPrice',
                                color: 'colors.price',
                                droplines: { horizontal: 'P_1' },
                                show: 'params.revealed and (params.answerPrice != params.startPrice)'
                            }
                        },
                        // What airlines offer at the fare. In the fare's grey,
                        // not the curve's orange, because the fare moves it
                        // along the curve and the curve is what moves for
                        // everything else: grey moves along, orange shifts.
                        // Untitled, so "What changed" says what the fare and
                        // quantity did rather than that a point moved.
                        {
                            type: 'Point',
                            def: {
                                name: 'atPrice', title: '',
                                x: 'calcs.q', y: 'params.price',
                                color: 'colors.price',
                                show: `params.step >= ${QUANTITY}`,
                                droplines: { vertical: 'Q_s', horizontal: 'P' },
                                drag: [{ vertical: 'price', draggable: 'not(params.submitted)' }],
                                srTitle: 'What airlines offer at the fare',
                                ghost: { show: 'not(params.asking)' }
                            }
                        }
                    ]
                }
            ]
        }
    }
};

/**
 * The market headlined by quantity supplied, the student by the flights they
 * run: each the number its chart says about the fare.
 */
const PANELS = [
    { key: 'you', name: 'Your airline', headline: 'mine', delta: 'dMine' },
    { key: 'market', name: 'Market', headline: 'Qs', delta: 'dQs' }
] as const;

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
export const PLANE_TICKETS: StudyModel = {
    id: 'plane-tickets',
    name: 'Supply of plane tickets',
    diagram: supplyDiagram,
    panels: PANELS,
    narratedCalcs: NARRATED_CALCS,
    // Quantity supplied as the sum a student can do: what airlines offer at
    // $200, plus a thousand seats for every dollar the fare is above it. The
    // student's own flights are a count of points, not a formula.
    explainedCalcs: {
        Qs: calcs.q
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
            curve: 'price'
        },
        supply: {
            about: 'The seats all airlines offer at each fare. Anything in PEANUT shifts it.',
            rise: 'Supply of seats increases',
            fall: 'Supply of seats decreases',
            curve: 'supply'
        }
    },
    questionApparatus: {
        price: { start: 'startPrice', answer: 'answerPrice' },
        supply: { start: 'startSupply', answer: 'answerSupply' }
    },
    scenarios: SCENARIOS,
    // The curve is dragged sideways, so its param rises as it moves right.
    directionWords: {
        supply: { up: 'right', down: 'left' }
    }
};

export const SUPPLY_SHIFTERS: StudyContent = {
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
    lesson: SUPPLY_LESSON,
    model: PLANE_TICKETS
};

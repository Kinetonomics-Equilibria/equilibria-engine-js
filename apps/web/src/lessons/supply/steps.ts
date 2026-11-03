import type { LessonStep } from '../../track/track';
import { GLOSSARY } from '../glossary';

/** The seats a new airline adds to the route at every fare, from the N step on. */
export const NEW_AIRLINE_SEATS = 50;

/** Where the market starts, and where every question starts from. */
export const BASELINE = { price: 200, supply: 200 };

/**
 * The lesson, in four parts: why supply slopes up, from one airline to the
 * market, PEANUT, and four news items for the student to work out.
 *
 * Written the way the other lessons are, for Year 10 to first-year students,
 * in the voice `docs/language.md` sets out: one idea per step, a short title
 * that says it, and short paragraphs that say what happens and then what it
 * means. A word is defined where it is first used, in a key-term box, and not
 * again.
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
        say: 'Suppose you run an airline that flies from Sydney to Melbourne. Your first flight of the ' +
            'day uses your newest plane and a crew already at work, so it is cheap to run.\n\n' +
            'A flight\'s costs include fuel, crew, the plane and airport fees. Seats at $100 or more ' +
            'would cover these costs, so $100 is the lowest fare you would accept.\n\n' +
            'We can show this on the chart as a point at 1 flight and $100.',
        term: GLOSSARY.costOfProduction
    },
    {
        reveal: ['flight2'],
        title: 'Your second flight',
        say: 'A second flight needs your older plane, which burns more fuel. You would run this flight ' +
            'only if seats sell for $150 or more.\n\n' +
            'The second flight costs more to run than the first did. The extra cost of one more flight ' +
            'is called marginal cost.',
        term: GLOSSARY.marginalCost
    },
    {
        reveal: ['flight3'],
        title: 'Your third flight',
        say: 'A third flight means leasing a plane and paying the crew overtime, so it needs a fare of ' +
            '$200 a seat.\n\n' +
            'Notice the pattern. Each flight costs more to run than the one before, so each flight needs ' +
            'a higher fare.',
        term: GLOSSARY.increasingMarginalCost
    },
    {
        reveal: ['flight4'],
        title: 'Your fourth flight',
        say: 'A fourth flight stretches your airline further, so it needs a fare of at least $250 a ' +
            'seat.\n\n' +
            'Each flight needs $50 more a seat than the last. This is why your points step up the chart ' +
            'as you run more flights.'
    },
    // The fare arrives on the student's chart before there is a market to
    // put it on, so "how many would you run?" is answered by counting points.
    {
        reveal: ['priceLine', 'priceSymbol'],
        set: { price: 200 },
        title: 'The going fare',
        say: 'Now let\'s add a fare. Suppose seats on the route sell for $200, which is shown by the ' +
            'dotted line across the chart.\n\n' +
            'Your first three flights cover their costs at this fare, so you run 3. Your fourth flight ' +
            'needs $250, so you don\'t run it.'
    },
    {
        title: 'The law of supply',
        say: 'You can move the fare below to count the flights you would run at each fare.\n\n' +
            'As the fare rises, more flights cover their costs, so you run more. This pattern is called ' +
            'the law of supply.',
        try: [{ param: 'price', label: 'The fare' }],
        term: GLOSSARY.lawOfSupply
    },
    {
        part: 'From you to the market',
        reveal: ['market'],
        // The rest of the lesson is about the market, so it takes the front
        // as it arrives, and the student's chart goes to the rail.
        focus: 'market',
        set: { ...BASELINE },
        title: 'Every airline on the route',
        say: 'You are one of several airlines flying from Sydney to Melbourne, and each flight costs a ' +
            'different amount to run.\n\n' +
            'If we add up the seats that all airlines would offer at each fare, the points form one ' +
            'smooth line. This line is the market supply curve, labelled S.',
        term: GLOSSARY.marketSupply
    },
    // Draws the point on the market's curve, by its `show` rather than a
    // reveal: the step before revealed the market's panel, which reaches
    // everything in it, and a second reveal of the point would be two steps
    // claiming one object.
    {
        title: 'Quantity supplied',
        say: 'At a fare of $200, airlines offer 200,000 seats a week. You can read this amount from the ' +
            'bottom axis. Economists write it as Qs.\n\n' +
            'Each price matches one quantity, so each price is a single point on the curve.',
        term: GLOSSARY.quantitySupplied
    },
    {
        set: { price: 250 },
        title: 'Quantity supplied rises',
        say: 'Suppose fares rise to $250. Airlines now offer 250,000 seats a week.\n\n' +
            'The point slides up the curve from the faint point, which shows where it was. The curve ' +
            'itself does not move.\n\n' +
            'You now run 4, because a fare of $250 covers the costs of your fourth flight too.',
        try: [{ param: 'price', label: 'The fare' }],
        term: GLOSSARY.changeInQuantitySupplied
    },
    // The determinants in the order the acronym spells them. Each step moves
    // supply from where the step before left it, so the dashed curve is
    // always the one the student just read about; they zigzag about the
    // start rather than climbing off the chart. Every letter but N moves the
    // student's own points with the market's (see the top), and the steps
    // that change how many flights they run say so.
    {
        part: 'What shifts supply (PEANUT)',
        set: { ...BASELINE },
        title: 'What shifts the whole curve',
        say: 'Let\'s return to a fare of $200. So far, only the fare has changed, which moves airlines ' +
            'along the curve.\n\n' +
            'When something other than the fare changes, the whole supply curve can shift.',
        term: GLOSSARY.changeInSupply
    },
    {
        title: 'The six determinants of supply',
        say: 'Economists call the factors that shift supply its determinants. There are six, and the ' +
            'letters of PEANUT help us remember them.\n\n' +
            '- Prices of inputs\n' +
            '- Expectations\n' +
            '- Alternative goods\n' +
            '- Number of sellers\n' +
            '- Upgraded technology\n' +
            '- Taxes and subsidies'
    },
    {
        set: { supply: 150 },
        title: 'Prices of inputs',
        say: 'P stands for prices of inputs. Suppose the price of jet fuel rises. Fuel is one of an ' +
            'airline\'s biggest costs, so every flight costs more to run.\n\n' +
            'This includes your flights. Each one now needs $50 more a seat, so you run 2.\n\n' +
            'Airlines offer fewer seats at every fare, so supply decreases. The curve shifts to the left ' +
            'of the dashed curve, to 150,000 seats at $200.',
        term: GLOSSARY.inputs
    },
    {
        set: { supply: 200 },
        title: 'Expectations',
        say: 'E stands for expectations. Suppose airlines expect more people to fly for work and holidays ' +
            'next year, so they lease extra planes and train more crew now.\n\n' +
            'Airlines offer more seats at every fare. Supply increases and the curve shifts to the right.',
        term: GLOSSARY.producerExpectations
    },
    {
        set: { supply: 150 },
        title: 'A substitute pays more',
        say: 'A stands for alternative goods. Suppose fares to the Gold Coast rise for the summer ' +
            'holidays.\n\n' +
            'The same planes can fly either route, so airlines move some planes to the Gold Coast, where ' +
            'they earn more.\n\n' +
            'Airlines offer fewer seats to Melbourne at every fare. Supply decreases and the curve shifts ' +
            'to the left.',
        term: GLOSSARY.substituteInProduction
    },
    {
        set: { supply: 200 },
        title: 'A complement pays more',
        say: 'A passenger flight also carries freight, such as parcels, in its hold. Suppose freight rates ' +
            'rise, so each flight earns more from its hold.\n\n' +
            'Each flight is now worth more to run, so airlines offer more seats at every fare. Supply ' +
            'increases and the curve shifts to the right.',
        term: GLOSSARY.complementInProduction
    },
    {
        set: { supply: 200 + NEW_AIRLINE_SEATS },
        title: 'Number of sellers',
        say: 'N stands for the number of sellers. Suppose a new budget airline starts flying from Sydney ' +
            'to Melbourne.\n\n' +
            'More sellers offer more seats at every fare, so supply increases.\n\n' +
            'Your own points don\'t move, because your costs have not changed. There are more airlines ' +
            'on the route.'
    },
    {
        set: { supply: 300 },
        title: 'Upgraded technology',
        say: 'U stands for upgraded technology. Suppose airlines, including yours, replace old planes with ' +
            'new ones that burn a fifth less fuel. Each flight costs less to run, so you run 4.\n\n' +
            'Airlines offer more seats at every fare, so supply increases again. At $200, airlines now ' +
            'offer 300,000 seats a week.',
        term: GLOSSARY.technology
    },
    // Taxes drawn, and subsidies said: a subsidy after the tax would be the
    // tax scrapped and $50 paid on top, which takes the curve past the
    // sliders' reach and the student's first flight down to $0 a seat. The
    // last question and a scenario are a subsidy, so it is moved as well as
    // said before the lesson ends.
    {
        set: { supply: 250 },
        title: 'Taxes and subsidies',
        say: 'T stands for taxes and subsidies. Suppose the government puts a $50 tax on every ticket, ' +
            'paid by the airline. Each seat must now sell for $50 more to cover its costs, so you run 3.\n\n' +
            'The curve shifts up by $50, the amount of the tax. This is the same as a shift to the left, ' +
            'to 250,000 seats at $200. A subsidy would have the opposite effect.',
        term: GLOSSARY.subsidy
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
            'What moves, and which way? Move it on the diagram, then press Check.',
        ask: {
            param: 'supply', direction: 'down', among: ['price', 'supply'], illustrate: 50,
            explain: 'One seller has left the route, and its flights have gone with it. Airlines offer ' +
                'fewer seats at every fare, so supply decreases and the curve shifts to the left.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'The school holidays',
        say: 'It\'s the school holidays, and seats to Melbourne now sell for $50 more.\n\n' +
            'What moves, and which way?',
        ask: {
            param: 'price', direction: 'up', among: ['price', 'supply'], illustrate: 50,
            explain: 'This is a change in the price of the seats themselves, so the curve does not move. ' +
                'Airlines move up along the curve to $250. Quantity supplied rises, and supply does not ' +
                'change.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'Pilots get a pay rise',
        say: 'Airline pilots win a 15% pay rise.\n\n' +
            'What moves, and which way?',
        ask: {
            param: 'supply', direction: 'down', among: ['price', 'supply'], illustrate: 50,
            explain: 'A price rose, but it was not the price of a seat. Pilots are an input, so every ' +
                'flight costs more to run. Airlines offer fewer seats at every fare, so supply decreases.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'The government pays airlines',
        say: 'To keep fares low, the government will pay airlines $50 for every seat they fly.\n\n' +
            'What moves, and which way?',
        ask: {
            param: 'supply', direction: 'up', among: ['price', 'supply'], illustrate: 50,
            explain: 'This payment is a subsidy, so each seat costs airlines $50 less to fly. Airlines ' +
                'offer more seats at every fare, so supply increases and the curve shifts to the right.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'Over to you',
        say: 'Here is how you went on the four cases.\n\n' +
            'If you would like more practice, press Finish to open this market in the Playground. You ' +
            'can try more cases in Scenarios, or move the fare and the curve yourself.',
        recap: {
            takeaway: 'A change in a good\'s own price moves sellers along the supply curve. A change in ' +
                'any factor in PEANUT shifts the whole curve, to the right when sellers offer more at ' +
                'every price and to the left when they offer less.'
        }
    }
];

import type { LessonStep } from '../../track/track';

/** The seats a new airline adds to the route at every fare, from the N step on. */
export const NEW_AIRLINE_SEATS = 50;

/** Where the market starts, and where every question starts from. */
export const BASELINE = { price: 200, supply: 200 };

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

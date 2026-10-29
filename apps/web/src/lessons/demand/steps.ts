import type { LessonStep } from '../../track/track';

/** Where the market starts, and where every question starts from. */
export const BASELINE = { price: 300, demand: 200 };

/**
 * The lesson, in four parts: why demand slopes down, from one buyer to the
 * market, PETPIG, and four news items for the student to work out.
 *
 * Written the way the other lessons are, for Year 10 to first-year students:
 * one idea per step, a short title that says it, a paragraph saying what
 * happens and, where it helps, one saying what it means. A word is defined
 * where it is first used, in a key-term box, and not again.
 *
 * Every number a step states is one the diagram solves to at that step, and
 * `demandShifters.test.tsx` holds them to it.
 */
export const DEMAND_LESSON: LessonStep[] = [
    // The student's own four pairs, one at a time: the price stepped out pair
    // by pair, so the downward slope is something they worked out before it
    // is a line on a chart.
    {
        part: 'Why demand slopes down',
        reveal: ['pair1'],
        title: 'Your first pair',
        say: 'Say you\'ve wanted a pair of Air Jordans for ages. What\'s the most you\'d pay for your ' +
            'first pair this year? Say $400.\n\n' +
            'That\'s what the first pair is worth to you, so it goes on the chart at 1 pair and $400.',
        term: {
            word: 'Utility',
            meaning: 'The satisfaction you get from having or using something.'
        }
    },
    {
        reveal: ['pair2'],
        title: 'Your second pair',
        say: 'Now a second pair. A spare is good to have, but it isn\'t as exciting as the first. ' +
            'You\'d pay $300 for it, tops.\n\n' +
            'The second pair adds less to your satisfaction than the first did.',
        term: {
            word: 'Marginal utility',
            meaning: 'The extra satisfaction you get from one more of something.'
        }
    },
    {
        reveal: ['pair3'],
        title: 'Your third pair',
        say: 'A third pair? You\'d wear them, but not as often. They\'re worth $200 to you.\n\n' +
            'Each pair adds less than the one before, so each is worth less to you.',
        term: {
            word: 'Diminishing marginal utility',
            meaning: 'Each extra unit of something adds less satisfaction than the one before.'
        }
    },
    {
        reveal: ['pair4'],
        title: 'Your fourth pair',
        say: 'By the fourth pair you have more than you can wear: $100, tops.\n\n' +
            'Every pair is worth $100 less than the last. The more pairs you have, the less one ' +
            'more is worth, so your points step down.'
    },
    // The price arrives on the student's chart before there is a market to
    // put it on, so "how many would you buy?" is answered by counting points.
    {
        reveal: ['priceLine', 'priceSymbol'],
        set: { price: 300 },
        title: 'Nike sets the price',
        say: 'Nike charges $300 a pair: the dotted line, P. Your first two pairs are worth at least ' +
            'that to you, so you buy 2. Your third is worth only $200, so you don\'t buy it.\n\n' +
            'Move the price and count how many pairs you\'d buy.',
        try: [{ param: 'price', label: 'Nike\'s price' }],
        term: {
            word: 'Law of demand',
            meaning: 'When the price of something falls, people buy more of it. When it rises, they ' +
                'buy less.'
        }
    },
    {
        part: 'From you to the market',
        reveal: ['market'],
        // The rest of the lesson is about the market, so it takes the front
        // as it arrives, and the student's chart goes to the rail.
        focus: 'market',
        set: { ...BASELINE },
        title: 'Every fan in Australia',
        say: 'You\'re one of about 100,000 Air Jordan fans in Australia, and each values a pair a ' +
            'bit differently. Add up the pairs they\'d all buy at each price.\n\n' +
            'All those points together make one smooth line: the market demand curve, D.',
        term: {
            word: 'Market demand',
            meaning: 'How much all buyers together are willing and able to buy at each price.'
        }
    },
    // Draws the point on the market's curve, by its `show` rather than a
    // reveal: the step before revealed the market's panel, which reaches
    // everything in it, and a second reveal of the point would be two steps
    // claiming one object.
    {
        title: 'Quantity demanded',
        say: 'At Nike\'s price, P = $300, fans want 200,000 pairs a year. Read it off the bottom ' +
            'axis, at Qd.\n\n' +
            'One price gives one quantity: a single point on the curve.',
        term: {
            word: 'Quantity demanded',
            meaning: 'How much buyers want to buy at one particular price.'
        }
    },
    {
        set: { price: 250 },
        title: 'Quantity demanded rises',
        say: 'Say Nike cuts its price to $250. Fans want 250,000 pairs a year, and the point slides ' +
            'down the curve from the faint one, where it was. The curve itself doesn\'t move.\n\n' +
            'You still buy 2: your third pair is worth only $200.',
        try: [{ param: 'price', label: 'Nike\'s price' }],
        term: {
            word: 'Change in quantity demanded',
            meaning: 'A move along the demand curve, because the good\'s own price changed.'
        }
    },
    // The determinants in the order the acronym spells them. Each step moves
    // demand from where the step before left it, so the dashed curve is
    // always the one the student just read about; they zigzag about the
    // start rather than climbing off the chart. Each says of "fans" what it
    // says, never of "you": the student's chart stays put (see the top).
    {
        part: 'PETPIG: what shifts demand',
        set: { ...BASELINE },
        title: 'What shifts the whole curve',
        say: 'Back at $300, change anything other than Nike\'s price and the whole demand curve ' +
            'shifts. The six things that shift it spell PETPIG.\n\n' +
            'Prices of related goods, Expectations, Tastes, Population, Income and Government policy.',
        term: {
            word: 'Change in demand',
            meaning: 'The whole demand curve shifts, because something other than the good\'s own ' +
                'price changed.'
        }
    },
    {
        set: { demand: 150 },
        title: 'P: a substitute gets cheaper',
        say: 'Adidas puts its sneakers on sale. Fans could buy them instead of Jordans, and now ' +
            'they\'re cheaper.\n\n' +
            'So fans want fewer Jordans at every price. Demand decreases: the curve shifts left of ' +
            'the dashed one, where it was, to 150,000 pairs at $300.',
        term: {
            word: 'Substitute',
            meaning: 'A good bought instead of another, like Adidas sneakers instead of Air Jordans.'
        }
    },
    {
        set: { demand: 200 },
        title: 'P: a complement gets cheaper',
        say: 'Air Jordans began as basketball shoes. Say club basketball fees fall, so more people ' +
            'sign up to play.\n\n' +
            'Playing and the shoes go together, so fans want more Jordans at every price. Demand ' +
            'increases: the curve shifts right.',
        term: {
            word: 'Complement',
            meaning: 'A good used together with another, like basketball and basketball shoes.'
        }
    },
    {
        set: { demand: 150 },
        title: 'E: expectations',
        say: 'Fans hear that Air Jordans will be marked down in the Boxing Day sales, so many decide ' +
            'to wait.\n\n' +
            'They want fewer pairs now, at every price. Demand today decreases: the curve shifts left.',
        term: {
            word: 'Expectations',
            meaning: 'What buyers think will happen later, such as a price rising or falling.'
        }
    },
    {
        set: { demand: 200 },
        title: 'T: tastes and preferences',
        say: 'An NBA star wears a new pair of Jordans in the finals, and the clip goes viral.\n\n' +
            'Suddenly Jordans are the shoe everyone wants. Demand increases: the curve shifts right.',
        term: {
            word: 'Tastes and preferences',
            meaning: 'What buyers like, which changes with fashion, advertising and who\'s wearing what.'
        }
    },
    {
        set: { demand: 250 },
        title: 'P: population',
        say: 'Australia\'s population grows, with more teenagers and young adults: the people who buy ' +
            'the most Jordans.\n\n' +
            'More buyers want more pairs at every price, so demand increases. Your own points don\'t ' +
            'move: there are just more fans.'
    },
    {
        set: { demand: 300 },
        title: 'I: income',
        say: 'Wages rise, and fans have more to spend. Air Jordans are a normal good: people buy more ' +
            'of them as their income rises.\n\n' +
            'Demand increases again. At $300, fans now want 300,000 pairs a year.',
        term: {
            word: 'Normal good',
            meaning: 'A good people buy more of when their income rises.'
        }
    },
    // Named and left, as the course does at this point: taxes and subsidies
    // need supply on the chart to say anything true about them.
    {
        title: 'G: government policy',
        say: 'The last letter, G, is for government policies, such as taxes and subsidies. They\'re a ' +
            'lesson of their own, so we\'ll leave G there.\n\n' +
            'Everything in PETPIG shifts the whole curve. A change in Nike\'s own price only moves ' +
            'fans along it.'
    },
    // The questions. Each starts from the baseline, and each offers the price
    // and the curve, in that order every time: which one the news moves is
    // the first half of the answer. Two are written to catch a student who
    // moves the price for any news with a price in it — New Balance's sale,
    // and a price rise that has not happened yet — and one is Nike's own
    // price, which is the one time the price is the answer.
    //
    // The price is labelled "The price" so a verdict reads "You moved the
    // price down", and no prompt says "the price": the Nike question says
    // "$50 off every pair" instead. It still names an event about price,
    // because that is the event; what it does not name is which control.
    //
    // Direction only, as in the A$ lesson. `illustrate` is how far "Show me"
    // draws the answer, a number made up for the picture: D₁ for the curve,
    // and for the price the point at P₁.
    {
        part: 'Your turn',
        set: { ...BASELINE },
        aside: 'wageNews',
        title: 'Junior wages rise',
        say: 'Read the news report next to the diagram.\n\n' +
            'What moves, and which way? Move it, then press Check.',
        ask: {
            param: 'demand', direction: 'up', among: ['price', 'demand'], illustrate: 50,
            explain: 'Teenagers earn more, and Jordans are a normal good. So fans want more pairs at ' +
                'every price: demand increases, and the curve shifts right.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'Nike takes $50 off',
        say: 'Nike takes $50 off every pair of Air Jordans.\n\n' +
            'What moves, and which way?',
        ask: {
            param: 'price', direction: 'down', among: ['price', 'demand'], illustrate: 50,
            explain: 'This is the price of Jordans themselves, so the curve stays put. Fans move ' +
                'down along it to $250: quantity demanded rises, and demand doesn\'t change.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'New Balance has a sale',
        say: 'New Balance puts all its sneakers on sale at half price.\n\n' +
            'What moves, and which way?',
        ask: {
            param: 'demand', direction: 'down', among: ['price', 'demand'], illustrate: 50,
            explain: 'A price fell, but not the price of Jordans. New Balance is a substitute, so fans ' +
                'want fewer Jordans at every price: demand decreases, and the curve shifts left.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'A price rise is coming',
        say: 'Nike announces that Air Jordans will cost $50 more from next month.\n\n' +
            'What moves, and which way?',
        ask: {
            param: 'demand', direction: 'up', among: ['price', 'demand'], illustrate: 50,
            explain: 'Today\'s price hasn\'t changed. Fans expect it to rise, so they buy now: demand ' +
                'today increases, and the curve shifts right.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'Over to you',
        say: 'Here\'s how you went on the four cases.\n\n' +
            'Press Finish to take this market to the Playground, where you can try more cases in ' +
            'Scenarios or move the price and the curve yourself.',
        recap: {
            takeaway: 'A change in a good\'s own price moves buyers along its demand curve. Anything ' +
                'else in PETPIG shifts the whole curve: right when buyers want more at every price, ' +
                'left when they want less.'
        }
    }
];

import type { LessonStep } from '../../track/track';
import { GLOSSARY } from '../glossary';

/** Where the market starts, and where every question starts from. */
export const BASELINE = { price: 300, demand: 200 };

/**
 * The lesson, in four parts: why demand slopes down, from one buyer to the
 * market, PETPIG, and four news items for the student to work out.
 *
 * Written the way the other lessons are, for Year 10 to first-year students,
 * in the voice `docs/language.md` sets out: one idea per step, a short title
 * that says it, and short paragraphs that say what happens and then what it
 * means. A word is defined where it is first used, in a key-term box, and not
 * again.
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
        say: 'Suppose you have wanted a pair of Air Jordans for a long time. The most you would pay for ' +
            'your first pair this year is $400.\n\n' +
            'Economists call the satisfaction you get from something its utility. Your first pair has a ' +
            'lot of utility, so it is worth $400 to you.\n\n' +
            'We can show this on the chart as a point at 1 pair and $400.',
        term: GLOSSARY.utility
    },
    {
        reveal: ['pair2'],
        title: 'Your second pair',
        say: 'Now think about a second pair. A spare pair is useful, but it is not as exciting as the ' +
            'first, so the most you would pay is $300.\n\n' +
            'The second pair adds less to your satisfaction than the first pair did. The extra ' +
            'satisfaction from one more pair is called marginal utility.',
        term: GLOSSARY.marginalUtility
    },
    {
        reveal: ['pair3'],
        title: 'Your third pair',
        say: 'You would wear a third pair less often, so it is worth only $200 to you.\n\n' +
            'Notice the pattern. Each pair adds less satisfaction than the pair before it, so each pair ' +
            'is worth less to you.',
        term: GLOSSARY.diminishingMarginalUtility
    },
    {
        reveal: ['pair4'],
        title: 'Your fourth pair',
        say: 'By the fourth pair, you have more shoes than you can wear, so the most you would pay is ' +
            '$100.\n\n' +
            'Each pair is worth $100 less than the one before. This is why your points step down the ' +
            'chart as you buy more pairs.'
    },
    // The price arrives on the student's chart before there is a market to
    // put it on, so "how many would you buy?" is answered by counting points.
    {
        reveal: ['priceLine', 'priceSymbol'],
        set: { price: 300 },
        title: 'Nike sets the price',
        say: 'Now let\'s add a price. Nike charges $300 a pair, which is shown by the dotted line ' +
            'across the chart.\n\n' +
            'Your first two pairs are worth at least $300 to you, so you buy 2. Your third pair is worth ' +
            'only $200, so you don\'t buy it.'
    },
    {
        title: 'The law of demand',
        say: 'You can move the price below to count the pairs you would buy at each price.\n\n' +
            'As the price falls, more pairs are worth buying, so you buy more. This pattern is called the ' +
            'law of demand.',
        try: [{ param: 'price', label: 'Nike\'s price' }],
        term: GLOSSARY.lawOfDemand
    },
    {
        part: 'From you to the market',
        reveal: ['market'],
        // The rest of the lesson is about the market, so it takes the front
        // as it arrives, and the student's chart goes to the rail.
        focus: 'market',
        set: { ...BASELINE },
        title: 'Every fan in Australia',
        say: 'You are one of about 100,000 Air Jordan fans in Australia, and each fan values a pair a ' +
            'little differently.\n\n' +
            'If we add up the pairs that all fans would buy at each price, the points form one smooth ' +
            'line. This line is the market demand curve, labelled D.',
        term: GLOSSARY.marketDemand
    },
    // Draws the point on the market's curve, by its `show` rather than a
    // reveal: the step before revealed the market's panel, which reaches
    // everything in it, and a second reveal of the point would be two steps
    // claiming one object.
    {
        title: 'Quantity demanded',
        say: 'At Nike\'s price of $300, fans want 200,000 pairs a year. You can read this amount from the ' +
            'bottom axis. Economists write it as Qd.\n\n' +
            'Each price matches one quantity, so each price is a single point on the curve.',
        term: GLOSSARY.quantityDemanded
    },
    {
        set: { price: 250 },
        title: 'Quantity demanded rises',
        say: 'Suppose Nike cuts its price to $250. Fans now want 250,000 pairs a year.\n\n' +
            'The point slides down the curve from the faint point, which shows where it was. The curve ' +
            'itself does not move.\n\n' +
            'You still buy 2, because your third pair is worth only $200.',
        try: [{ param: 'price', label: 'Nike\'s price' }],
        term: GLOSSARY.changeInQuantityDemanded
    },
    // The determinants in the order the acronym spells them. Each step moves
    // demand from where the step before left it, so the dashed curve is
    // always the one the student just read about; they zigzag about the
    // start rather than climbing off the chart. Each says of "fans" what it
    // says, never of "you": the student's chart stays put (see the top).
    {
        part: 'What shifts demand (PETPIG)',
        set: { ...BASELINE },
        title: 'What shifts the whole curve',
        say: 'Let\'s return to a price of $300. So far, only Nike\'s price has changed, which moves fans ' +
            'along the curve.\n\n' +
            'When something other than Nike\'s price changes, the whole demand curve can shift.',
        term: GLOSSARY.changeInDemand
    },
    {
        title: 'The six determinants of demand',
        say: 'Economists call the factors that shift demand its determinants. There are six, and the ' +
            'letters of PETPIG help us remember them.\n\n' +
            '- Prices of related goods\n' +
            '- Expectations\n' +
            '- Tastes and preferences\n' +
            '- Population\n' +
            '- Income\n' +
            '- Government policy'
    },
    {
        set: { demand: 150 },
        title: 'A substitute gets cheaper',
        say: 'The first P stands for prices of related goods. Suppose Adidas puts its sneakers on sale. ' +
            'Fans could buy these instead of Jordans, and they now cost less.\n\n' +
            'Fans want fewer Jordans at every price, so demand decreases.\n\n' +
            'The curve shifts to the left of the dashed curve, which shows where it was. At $300, fans ' +
            'now want 150,000 pairs.',
        term: GLOSSARY.substitute
    },
    {
        set: { demand: 200 },
        title: 'A complement gets cheaper',
        say: 'A related good can also be something used together with Jordans. Air Jordans began as ' +
            'basketball shoes, so suppose club basketball fees fall and more people sign up to play.\n\n' +
            'Playing basketball and wearing the shoes go together, so fans want more Jordans at every ' +
            'price. Demand increases and the curve shifts to the right.',
        term: GLOSSARY.complement
    },
    {
        set: { demand: 150 },
        title: 'Expectations',
        say: 'E stands for expectations. Suppose fans hear that Air Jordans will be marked down in the ' +
            'Boxing Day sales, so many of them decide to wait.\n\n' +
            'Fans want fewer pairs today at every price. Demand today decreases and the curve shifts to ' +
            'the left.',
        term: GLOSSARY.consumerExpectations
    },
    {
        set: { demand: 200 },
        title: 'Tastes and preferences',
        say: 'T stands for tastes and preferences. Suppose an NBA star wears a new pair of Jordans in the ' +
            'finals, and the clip is shared widely.\n\n' +
            'More people now want Jordans at every price. Demand increases and the curve shifts to the ' +
            'right.',
        term: GLOSSARY.tastesAndPreferences
    },
    {
        set: { demand: 250 },
        title: 'Population',
        say: 'The second P stands for population. Suppose Australia\'s population grows, with more ' +
            'teenagers and young adults, who are the people most likely to buy Jordans.\n\n' +
            'More buyers want more pairs at every price, so demand increases.\n\n' +
            'Your own points don\'t move, because you are still the same buyer. There are more fans in ' +
            'the market.'
    },
    {
        set: { demand: 300 },
        title: 'Income',
        say: 'I stands for income. Suppose wages rise, so fans have more to spend. Air Jordans are a ' +
            'normal good, which means people buy more of them as their income rises.\n\n' +
            'Demand increases again. At $300, fans now want 300,000 pairs a year.',
        term: GLOSSARY.normalGood
    },
    // Named and left, as the course does at this point: taxes and subsidies
    // need supply on the chart to say anything true about them.
    {
        title: 'Government policy',
        say: 'G stands for government policy, such as taxes and subsidies. Government policy needs a ' +
            'lesson of its own, so we will stop at this letter for now.\n\n' +
            'To sum up, every factor in PETPIG shifts the whole demand curve. A change in Nike\'s own ' +
            'price moves fans along the curve instead.'
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
            'What moves, and which way? Move it on the diagram, then press Check.',
        ask: {
            param: 'demand', direction: 'up', among: ['price', 'demand'], illustrate: 50,
            explain: 'Teenagers earn more, and Air Jordans are a normal good, so fans want more pairs ' +
                'at every price. Demand increases and the curve shifts to the right.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'Nike takes $50 off',
        say: 'Nike takes $50 off every pair of Air Jordans.\n\n' +
            'What moves, and which way?',
        ask: {
            param: 'price', direction: 'down', among: ['price', 'demand'], illustrate: 50,
            explain: 'This is a change in the price of Jordans themselves, so the curve does not move. ' +
                'Fans move down along the curve to $250. Quantity demanded rises, and demand does not ' +
                'change.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'New Balance has a sale',
        say: 'New Balance puts all its sneakers on sale at half price.\n\n' +
            'What moves, and which way?',
        ask: {
            param: 'demand', direction: 'down', among: ['price', 'demand'], illustrate: 50,
            explain: 'A price fell, but it was not the price of Jordans. New Balance sneakers are a ' +
                'substitute, so fans want fewer Jordans at every price. Demand decreases and the curve ' +
                'shifts to the left.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'A price rise is coming',
        say: 'Nike announces that Air Jordans will cost $50 more from next month.\n\n' +
            'What moves, and which way?',
        ask: {
            param: 'demand', direction: 'up', among: ['price', 'demand'], illustrate: 50,
            explain: 'Today\'s price has not changed. Fans expect the price to rise, so they buy now. ' +
                'Demand today increases and the curve shifts to the right.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'Over to you',
        say: 'Here is how you went on the four cases.\n\n' +
            'If you would like more practice, press Finish to open this market in the Playground. You ' +
            'can try more cases in Scenarios, or move the price and the curve yourself.',
        recap: {
            takeaway: 'A change in a good\'s own price moves buyers along the demand curve. A change in ' +
                'any factor in PETPIG shifts the whole curve, to the right when buyers want more at ' +
                'every price and to the left when they want less.'
        }
    }
];

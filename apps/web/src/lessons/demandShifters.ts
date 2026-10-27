import type { LessonStep } from '../track/track';
import type { Scenario } from '../dock/Scenarios';
import type { StudyContent } from './content';
import coverPicture from './pictures/jordans-cover.svg';

/**
 * Demand, and what shifts it, told with a pair of Air Jordans.
 *
 * Two charts. The first is one buyer, the student: what they would pay for a
 * first pair this year, then a second, a third and a fourth, each worth $100
 * less than the one before. That is diminishing marginal utility, stepped out
 * as four points, and it is why a demand curve slopes down: the lower the
 * price, the more pairs are worth buying. Nike's price is drawn across the
 * same chart, so the pairs worth buying are the points on or above it.
 *
 * The second is every fan in Australia, about 100,000 of them, each valuing a
 * pair a bit differently, so their points add up to a smooth line: the market
 * demand curve. A change in Nike's own price slides the point along it, and
 * anything in PETPIG shifts the whole curve. That difference — a change in
 * quantity demanded against a change in demand — is what the questions turn
 * on, so each offers both the price and the curve, and the student has to say
 * which one the news moves before saying which way.
 *
 * The model, in thousands of pairs a year at a price P in dollars:
 *
 *     market     Q = demand − (P − 300)
 *     the student   every pair worth at least P: 4 at $100 and below,
 *                   1 at $400, none above it
 *
 * so `demand` is what fans want at $300, Nike's price at the start, and a
 * dollar on the price is a thousand pairs a year. At $300 the market wants
 * 200,000 pairs, which is the student's 2 pairs times 100,000 fans; at other
 * prices the two part company, because the fans are not all the student.
 *
 * The student's chart does not move when demand does. Every PETPIG step is
 * said of fans in general, and the population step makes a point of it: there
 * are more fans, and the student's own points stay where they were.
 *
 * Government policy is the G, and is named and left for a lesson of its own.
 */

/** What the student would pay for their first pair, and how much less each pair after is worth. */
const FIRST_PAIR = 400;
const EACH_PAIR_LESS = 100;

/** Where the market starts, and where every question starts from. */
const BASELINE = { price: 300, demand: 200 };

/**
 * The market's demand curve, as quantity in terms of the price.
 *
 * Written that way round for the reason the A$ lesson gives: the engine says
 * which way a curve moved by sampling it along its own variable, so a curve
 * written as Q = f(P) and pulled sideways is said to shift right or left, as
 * this is taught. `(y)` in parentheses, because that is how the engine both
 * recognises the variable and substitutes into it to place a label.
 */
const demandAt = (demand: string) => `${demand} - ((y) - 300)`;

/**
 * Where D is labelled: at its lower-right end, as the house rules put it,
 * forty dollars above the quantity axis — or, once demand is high enough to
 * leave the panel through its right-hand edge, a little above where it does.
 * The point it must not sit on is at $200 or more, well clear of either.
 */
const labelAt = (demand: string) => `max(40, ${demand} - 160)`;

/**
 * Sideways, because this curve moves sideways, and frozen once an answer is
 * committed, as in every lesson.
 */
const DRAG_DEMAND = [{ horizontal: 'demand', draggable: 'not(params.submitted)' }];

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
            'Press Finish to try more cases in Scenarios, or to move the price and the curve yourself.',
        recap: {
            takeaway: 'A change in a good\'s own price moves buyers along its demand curve. Anything ' +
                'else in PETPIG shifts the whole curve: right when buyers want more at every price, ' +
                'left when they want less.'
        }
    }
];

/** The position of the step titled `title`: 1 for the first step. */
const stepTitled = (title: string) => DEMAND_LESSON.findIndex(step => step.title === title) + 1;

/** Where the price arrives, on the student's chart. */
const PRICED = stepTitled('Nike sets the price');
/** Where the point on the market's curve arrives, and quantity demanded with it. */
const QUANTITY = stepTitled('Quantity demanded');

/** Each param of the question apparatus is bounded like the param it draws. */
const PRICE = { value: 300, min: 200, max: 400, round: 10 };
const DEMAND = { value: 200, min: 100, max: 300, round: 10 };
const apparatus = (name: string, like: typeof PRICE) => ({ name, ...like, presentation: true });

const calcs = {
    // Where the point on the market's curve is, from the step that brings it
    // in. `Qd` is the same number for the caption and the strip, and NaN
    // before that step, which both leave unsaid: a quantity demanded read out
    // over a curve with no price on it yet would be a number about nothing.
    q: 'params.demand - (params.price - 300)',
    Qd: `params.step >= ${QUANTITY} ? calcs.q : NaN`,
    // The pairs worth at least the price to the student: the points on or
    // above the dotted line. From the step that draws the line.
    mine: `params.step >= ${PRICED} ? ` +
        `floor((${FIRST_PAIR + EACH_PAIR_LESS} - params.price) / ${EACH_PAIR_LESS}) : NaN`,
    dQd: 'calcs.Qd - prev.calcs.Qd',
    dMine: 'calcs.mine - prev.calcs.mine'
};

/** One of the student's four pairs, at what it is worth to them. */
const pair = (n: number) => {
    const worth = FIRST_PAIR - EACH_PAIR_LESS * (n - 1);
    return {
        type: 'Point',
        def: {
            name: 'pair' + n, title: '',
            x: n, y: worth,
            color: 'colors.demand',
            srTitle: `Pair ${n}, worth $${worth} to you`
        }
    };
};

export const demandDiagram = {
    schema: 'EconSchema',

    steps: DEMAND_LESSON,

    params: [
        // From $200 to $400 in steps of $10: at either end the student buys a
        // whole number of pairs, 3 or 1, and the market's point stays on the
        // chart for any demand. Labelled for the verdicts, which lower its
        // first letter: "You moved the price down".
        { name: 'price', label: 'The price', ...PRICE },
        // From 100 to 300 thousand pairs at $300, in steps of 10. At 100 and
        // $400 fans want none, which is a true answer and the corner of what
        // the sliders reach; the point sits on the price axis there.
        { name: 'demand', label: 'Demand for Air Jordans', ...DEMAND },

        // The question apparatus, presentation like every lesson's.
        { name: 'asking', value: 0, min: 0, max: 1, round: 1, presentation: true },
        { name: 'submitted', value: 0, min: 0, max: 1, round: 1, presentation: true },
        { name: 'revealed', value: 0, min: 0, max: 1, round: 1, presentation: true },
        apparatus('startPrice', PRICE),
        apparatus('answerPrice', PRICE),
        apparatus('startDemand', DEMAND),
        apparatus('answerDemand', DEMAND)
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
                    // Five pairs a year is where the student's points would
                    // reach $0, and $500 is where they would start. Titled
                    // as the market's quantity is, by its unit.
                    xAxis: { title: 'Pairs a year', min: 0, max: 5 },
                    yAxis: { title: 'Price (\\$)', min: 0, max: 500 },
                    objects: [
                        // Nike's price across the student's chart, dotted
                        // because it is a line to read the points against, and
                        // labelled on the price axis as the market's dropline
                        // is, so P is one price on both charts.
                        {
                            type: 'Segment',
                            def: {
                                name: 'priceLine', title: '',
                                a: [0, 'params.price'], b: [5, 'params.price'],
                                color: 'colors.choice', lineStyle: 'dotted'
                            }
                        },
                        {
                            type: 'Label',
                            def: {
                                name: 'priceSymbol', title: '',
                                x: 'AXIS', y: 'params.price', text: 'P',
                                color: 'colors.choice'
                            }
                        },
                        pair(1), pair(2), pair(3), pair(4)
                    ]
                },
                {
                    key: 'market',
                    // Wide enough for the most the sliders can ask for, 400
                    // thousand pairs at $200, with room past it. The unit is
                    // the whole title: "Quantity (thousands of pairs a year)"
                    // ran past the edge of the sheet on a phone.
                    xAxis: { title: 'Thousands of pairs a year', min: 0, max: 500 },
                    yAxis: { title: 'Price (\\$)', min: 0, max: 500 },
                    objects: [
                        {
                            type: 'Curve',
                            def: {
                                name: 'marketDemand', title: 'demand',
                                fn: demandAt('params.demand'), samplePoints: 2,
                                color: 'colors.demand',
                                label: { text: 'D', y: labelAt('params.demand') },
                                drag: DRAG_DEMAND,
                                // D₀ is where the curve was, and stands down
                                // while a question is on screen, where the
                                // question's own start line is the "before".
                                ghost: { show: 'not(params.asking)', label: '_0' }
                            }
                        },
                        // Where a question found the curve, and where its
                        // answer would put it, as in the A$ lesson.
                        {
                            type: 'Curve',
                            def: {
                                name: 'questionStartDemand', title: '',
                                fn: demandAt('params.startDemand'), samplePoints: 2,
                                color: 'colors.demand', lineStyle: 'dashed', strokeOpacity: 0.35,
                                show: 'params.asking'
                            }
                        },
                        {
                            type: 'Curve',
                            def: {
                                name: 'questionAnswerDemand', title: '',
                                fn: demandAt('params.answerDemand'), samplePoints: 2,
                                color: 'colors.demand', lineStyle: 'dotted',
                                label: { text: 'D_1', y: labelAt('params.answerDemand') },
                                show: 'params.revealed and (params.answerDemand != params.startDemand)'
                            }
                        },
                        // Where the point was when a question was asked, drawn
                        // as a ghost point is: the student who moves the price
                        // sees it slide away from here along the curve, and
                        // the one who shifts the curve sees it slide sideways.
                        {
                            type: 'Point',
                            def: {
                                name: 'questionStartPoint', title: '',
                                x: 'params.startDemand - (params.startPrice - 300)', y: 'params.startPrice',
                                color: 'colors.choice', opacity: 0.35, strokeOpacity: 0.35,
                                show: 'params.asking'
                            }
                        },
                        // Where the point goes when the answer is the price:
                        // on the curve as the question found it, at the price
                        // the answer moves it to, read off the price axis at
                        // P₁ as D₁ is read off the curve. Only once a verdict
                        // shows it, and never for a question about the curve,
                        // whose answer leaves the price where it started.
                        {
                            type: 'Point',
                            def: {
                                name: 'questionAnswerPoint', title: '',
                                x: 'params.startDemand - (params.answerPrice - 300)', y: 'params.answerPrice',
                                color: 'colors.choice',
                                droplines: { horizontal: 'P_1' },
                                show: 'params.revealed and (params.answerPrice != params.startPrice)'
                            }
                        },
                        // What fans want at Nike's price. In the colour of a
                        // point chosen on a curve, not the curve's, because
                        // the price moves it along the curve and the curve is
                        // what moves for everything else: orange moves along,
                        // blue shifts. Untitled, so "What changed" says what
                        // the price and quantity did rather than that a point
                        // moved.
                        {
                            type: 'Point',
                            def: {
                                name: 'atPrice', title: '',
                                x: 'calcs.q', y: 'params.price',
                                color: 'colors.choice',
                                show: `params.step >= ${QUANTITY}`,
                                droplines: { vertical: 'Q_d', horizontal: 'P' },
                                drag: [{ vertical: 'price', draggable: 'not(params.submitted)' }],
                                srTitle: 'What fans want at Nike\'s price',
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
 * The market headlined by quantity demanded, the student by the pairs they
 * buy: each the number its chart says about the price.
 */
const PANELS = [
    { key: 'you', name: 'You', headline: 'mine', delta: 'dMine' },
    { key: 'market', name: 'Market', headline: 'Qd', delta: 'dQd' }
] as const;

/**
 * The numbers the strip reports, and what they are called everywhere.
 *
 * Quantity demanded first: it is the market's caption and what "why?" opens
 * the maths on, and its rise and fall are the step title that teaches it. In
 * thousands, which the axis says, as the café's coffees are counted in the
 * axis's units.
 */
const NARRATED_CALCS = [
    {
        name: 'Qd', label: 'Quantity demanded', precision: 0, tex: 'Q_d',
        meaning: 'Thousands of pairs fans want a year at Nike\'s price',
        rise: 'Quantity demanded rises', fall: 'Quantity demanded falls'
    },
    {
        name: 'mine', label: 'Pairs you buy', precision: 0,
        meaning: 'Your pairs a year at Nike\'s price: every pair worth at least that to you',
        rise: 'You buy more pairs', fall: 'You buy fewer pairs'
    }
];

/**
 * PETPIG, as one-click shifts, and Nike's own price beside them.
 *
 * Each says which letter it is and so which way demand goes; the strip says
 * what that did to the quantity. Each sets only the param it is about, so
 * two can be combined.
 */
const SCENARIOS: Scenario[] = [
    {
        id: 'adidas-sale',
        label: 'Adidas has a sale',
        description: 'A substitute gets cheaper, so fans want fewer Jordans at every price: demand decreases.',
        params: { demand: 150 }
    },
    {
        id: 'club-fees',
        label: 'Basketball club fees fall',
        description: 'More people play, and the shoes go with playing: a complement gets cheaper, so demand increases.',
        params: { demand: 250 }
    },
    {
        id: 'price-rise-coming',
        label: 'A price rise is announced',
        description: 'Fans expect to pay more next month, so they buy now: demand today increases.',
        params: { demand: 250 }
    },
    {
        id: 'boxing-day',
        label: 'Boxing Day sales are coming',
        description: 'Fans expect lower prices soon, so many wait: demand today decreases.',
        params: { demand: 150 }
    },
    {
        id: 'nba-star',
        label: 'An NBA star wears them',
        description: 'Tastes swing towards Jordans, so fans want more at every price: demand increases.',
        params: { demand: 250 }
    },
    {
        id: 'more-teenagers',
        label: 'More teenagers in Australia',
        description: 'More buyers want more pairs at every price: demand increases.',
        params: { demand: 250 }
    },
    {
        id: 'wages-rise',
        label: 'Wages rise',
        description: 'Jordans are a normal good, so fans with more to spend want more: demand increases.',
        params: { demand: 250 }
    },
    {
        id: 'downturn',
        label: 'Part-time shifts dry up',
        description: 'Fans have less to spend, so they want fewer pairs at every price: demand decreases.',
        params: { demand: 150 }
    },
    {
        id: 'nike-sale',
        label: 'Nike takes $50 off',
        description: 'Jordans\' own price falls, so fans move along the curve: quantity demanded rises, and demand stays put.',
        params: { price: 250 }
    },
    {
        id: 'baseline',
        label: 'Back to the start',
        params: { ...BASELINE }
    }
];

export const DEMAND_SHIFTERS: StudyContent = {
    id: 'demand',
    label: 'What shifts demand',
    title: 'Air Jordans, and what shifts demand',
    goals: [
        'Why each extra pair is worth less to you',
        'Moving along the demand curve, and shifting it',
        'The six things that shift demand: PETPIG'
    ],
    cover: {
        question: 'What makes people want more Air Jordans?',
        hook: 'A pair of Air Jordans costs the same in every shop, yet some months they sell out and ' +
            'some months they sit on the shelf. Work out why and you can say which way demand will move.',
        picture: 'cover'
    },
    pictures: {
        cover: {
            name: 'A sneaker shop',
            src: coverPicture,
            alt: 'A sneaker wall in a shop, with high-tops on its shelves and a red pair on the counter ' +
                'under a $300 price tag.'
        }
    },
    asides: {
        wageNews: {
            name: 'News report',
            headline: 'Junior wages rise from 1 July',
            body: 'Teenagers with part-time jobs will take home more each week.',
            note: 'A made-up report, for this question'
        }
    },
    diagram: demandDiagram,
    lesson: DEMAND_LESSON,
    panels: PANELS,
    narratedCalcs: NARRATED_CALCS,
    // Quantity demanded as the sum a student can do: what fans want at $300,
    // less a thousand pairs for every dollar the price is above it. The
    // student's own pairs are a count of points, not a formula.
    explainedCalcs: {
        Qd: calcs.q
    },
    paramMeanings: {
        demand: 'thousands of pairs fans want a year at $300',
        price: 'Nike\'s price for a pair, in dollars'
    },
    // Each answerable with the two sliders: the student buys 3 pairs at $200
    // and below, where fans want 300 thousand at the start; a price cut
    // raises quantity demanded and leaves the curve; and 250 at $300 is
    // demand at 250, which any of P, E, T, P or I can cause.
    explorePrompts: [
        'Find the highest price at which you\'d buy 3 pairs. How many do all fans want there?',
        'Make quantity demanded rise without moving the demand curve.',
        'Shift demand so fans want 250,000 pairs at $300. Which letters of PETPIG could do that?'
    ],
    // The curve is blue, as demand always is; the price is orange, as the
    // point it moves and the line it draws are.
    paramWords: {
        price: {
            about: 'What Nike charges for a pair. Changing it moves fans along the curve, and the ' +
                'curve stays put.',
            rise: 'Nike raises its price',
            fall: 'Nike cuts its price',
            curve: 'choice'
        },
        demand: {
            about: 'What all fans want at each price. Anything in PETPIG shifts it.',
            rise: 'Demand for Air Jordans increases',
            fall: 'Demand for Air Jordans decreases',
            curve: 'demand'
        }
    },
    questionApparatus: {
        price: { start: 'startPrice', answer: 'answerPrice' },
        demand: { start: 'startDemand', answer: 'answerDemand' }
    },
    scenarios: SCENARIOS,
    // The curve is dragged sideways, so its param rises as it moves right.
    directionWords: {
        demand: { up: 'right', down: 'left' }
    }
};

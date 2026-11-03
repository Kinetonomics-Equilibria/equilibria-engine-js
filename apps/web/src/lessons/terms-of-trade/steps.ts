import type { LessonStep } from '../../track/track';
import { GLOSSARY } from '../glossary';

/** Where the lesson starts, and where the questions start from: every index at 100. */
export const BASELINE = { demand: 100, supply: 100, imports: 100 };

/** The three the questions offer, in the order the sliders are. */
const EVERYTHING = ['demand', 'supply', 'imports'];

/**
 * The lesson, in four parts: what the terms of trade measure, a boom that
 * lifts them, what brings them down again, and four cases to work out.
 *
 * The market comes first because a student has met one, and the terms of
 * trade are built on it: an export price, then an import price, then the
 * ratio. Then one boom, told from start to finish as Australia's mining boom
 * went: demand shifts, supply can't follow for years, then it does, and
 * demand eases back to somewhere above where it began.
 *
 * Every number a step states is one the diagram solves to at that step, and
 * `termsOfTrade.test.tsx` holds them to it. A step that goes back over the
 * cycle says "the peak" and "where they began" rather than quoting either,
 * because neither number is on the screen by then.
 */
export const TERMS_OF_TRADE_LESSON: LessonStep[] = [
    {
        part: 'What the terms of trade are',
        reveal: ['demand_market', 'supply_market'],
        title: 'What Australia sells',
        say: 'Australia\'s biggest exports are commodities, such as iron ore, coal and gas. These are ' +
            'shipped to steel mills and power stations overseas.\n\n' +
            'The demand curve, labelled D, shows how much the world wants at each price. The supply ' +
            'curve, labelled S, shows how much Australian miners ship.',
        term: GLOSSARY.commodity
    },
    {
        reveal: ['equilibrium_market'],
        title: 'Prices as an index',
        say: 'At the point where the curves cross, the market sets a price and a volume shipped, which ' +
            'you can read off the axes. Economists write them as P* and Q*.\n\n' +
            'We write each of these as an index that starts at 100, so a price of 120 means that prices ' +
            'are 20% higher than at the start.',
        term: GLOSSARY.index
    },
    // Words alone, with the market still at the front: the other half of the
    // ratio, before the panel that draws the ratio.
    {
        title: 'What Australia buys',
        say: 'Exports pay for imports, such as phones, laptops, cars and fuel. Import prices are also an ' +
            'index, which tracks the cost of a basket of imports and starts at 100.\n\n' +
            'How much can a basket of exports buy? The answer depends on both prices.',
        term: GLOSSARY.basket
    },
    {
        reveal: ['trade'],
        focus: 'trade',
        title: 'The terms of trade',
        say: 'To compare the two prices, we divide export prices by import prices and multiply by 100. ' +
            'Here, 100 ÷ 100 × 100 = 100. This number is the terms of trade, labelled ToT.\n\n' +
            'We can read it in baskets. At 100, the point shows 100 baskets of exports buying 100 ' +
            'baskets of imports.',
        term: GLOSSARY.termsOfTrade
    },
    {
        set: { imports: 125 },
        title: 'Imports cost more',
        say: 'Suppose a chip shortage pushes up the price of phones and laptops, and import prices rise ' +
            'to 125. Export prices have not changed.\n\n' +
            'The terms of trade are now 100 ÷ 125 × 100 = 80. The line turns down from the dashed line, ' +
            'which shows where it was.\n\n' +
            'This means that 100 baskets of exports now buy 80 baskets of imports.'
    },
    {
        set: { imports: 80 },
        title: 'Imports cost less',
        say: 'Now suppose factories overseas cut their prices, and import prices fall to 80.\n\n' +
            'The terms of trade are now 100 ÷ 80 × 100 = 125, so the same exports buy more imports.\n\n' +
            'You can move import prices below to see how the line turns.',
        try: [{ param: 'imports', label: 'Import prices' }]
    },
    // Back to the start as a step of its own, so the boom that follows moves
    // only demand; and it sets import prices, which the step before handed
    // to the student.
    {
        set: { imports: 100 },
        title: 'Favourable and unfavourable',
        say: 'Suppose import prices settle back at 100. The terms of trade return to 100 as well.\n\n' +
            'A rise in the terms of trade is called favourable, because the same exports buy more ' +
            'imports. A fall is called unfavourable.\n\n' +
            'Either movement can start with export prices or with import prices.',
        term: GLOSSARY.favourableMovement
    },
    {
        part: 'The boom',
        focus: 'market',
        set: { demand: 200 },
        title: 'China starts building',
        say: 'In the 2000s, China built cities, railways and factories at a record pace. Its steel mills ' +
            'wanted far more iron ore and coal at every price.\n\n' +
            'The demand curve shifts to the right of the dashed curve, which shows where it was.'
    },
    {
        title: 'Mines take years to build',
        say: 'A new mine, with its railway and port, takes years to build. Until then, miners can produce ' +
            'only a little more from the mines they have, so the supply curve is steep.\n\n' +
            'Volume edges up to 120, and the price nearly doubles to 180.',
        term: GLOSSARY.shortRun
    },
    {
        focus: 'trade',
        title: 'The terms of trade rise sharply',
        say: 'Import prices have not changed, so the terms of trade are 180 ÷ 100 × 100 = 180. The line ' +
            'is much steeper.\n\n' +
            'This means that 100 baskets of exports now buy 180 baskets of imports. Australia can afford ' +
            'nearly twice the imports for the same exports.'
    },
    {
        reveal: ['revenue'],
        focus: 'revenue',
        title: 'More money coming in',
        say: 'Export revenue is the price multiplied by the volume, which is shown by the green rectangle. ' +
            'It is what the world pays Australia. Export revenue is also an index, and it started at ' +
            '100.\n\n' +
            'Export revenue is now 216, which is more than double. Most of this rise came from the price.',
        term: GLOSSARY.exportRevenue
    },
    {
        title: 'Who gains, and who doesn\'t',
        say: 'Mining profits rise, and so does the tax that governments collect on them. Buyers need more ' +
            'AUD to pay for the iron ore, so the AUD tends to rise, which also makes imports cheaper.\n\n' +
            'Not everyone gains. A stronger AUD makes it harder for farmers, universities and tourism ' +
            'businesses to sell overseas.'
    },
    {
        part: 'After the boom',
        focus: 'market',
        set: { supply: 150 },
        title: 'New mines open',
        say: 'High prices make new mines worth building. Years later the new mines start shipping, so ' +
            'miners sell more at every price.\n\n' +
            'The supply curve shifts to the right. The price falls to 140, and volume jumps to 160.',
        term: GLOSSARY.longRun
    },
    {
        focus: 'revenue',
        title: 'Lower prices, more revenue',
        say: 'The terms of trade fall to 140, so each basket of exports buys less than at the peak.\n\n' +
            'However, far more is leaving port, so export revenue rises to 224.\n\n' +
            'The terms of trade depend only on prices, while export revenue also depends on volume.'
    },
    {
        focus: 'market',
        set: { demand: 175 },
        title: 'China slows down',
        say: 'China finishes its biggest projects, and its mills need less iron ore. Demand eases, but it ' +
            'stays well above where it began.\n\n' +
            'The demand curve shifts to the left, and the price falls to 120.'
    },
    {
        focus: 'trade',
        title: 'A new normal',
        say: 'The terms of trade settle at 120, which is below the peak but above where they began.\n\n' +
            'Australia\'s terms of trade followed the same pattern. They peaked in 2011, then fell by ' +
            'about a third, and stayed above their 20th-century average.'
    },
    // The questions. Each starts from the baseline, whatever the student did
    // on the way, and the market stays at the front through all of them: two
    // of the three things on offer are curves in it, and bringing the terms of
    // trade forward for the question about import prices would give it away.
    // Each offers all three in the same order, and names none: which one
    // moves is the first half of the answer.
    //
    // Direction only, but for the last, which asks how far because a ratio is
    // something to work out. `illustrate` is how far "Show me" draws the
    // answer: as far as the lesson's own moves go.
    {
        part: 'Your turn',
        focus: 'market',
        set: { ...BASELINE },
        title: 'A cyclone hits Port Hedland',
        say: 'Suppose a cyclone shuts Australia\'s biggest iron ore port for weeks, and ships cannot ' +
            'load.\n\n' +
            'Which one moves, and which way? Move it on the diagram, then press Check.',
        ask: {
            param: 'supply', direction: 'down', among: EVERYTHING, illustrate: 20,
            explain: 'Less can be shipped at every price, so supply decreases and the curve shifts to the ' +
                'left. Export prices rise. Import prices have not changed, so the terms of trade rise.'
        }
    },
    // The event is the report's, beside the diagram, so the card asks the
    // question and nothing else.
    {
        set: { ...BASELINE },
        title: 'Factories raise their prices',
        aside: 'factoryReport',
        say: 'Read the news report next to the diagram.\n\n' +
            'Which one moves, and which way?',
        ask: {
            param: 'imports', direction: 'up', among: EVERYTHING, illustrate: 25,
            explain: 'Australia buys these goods from overseas, so import prices rise. Export prices have ' +
                'not changed, so the same exports buy fewer imports and the terms of trade fall.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'India starts building',
        say: 'Suppose India builds railways and ports at a record pace, and orders more Australian coal ' +
            'and iron ore.\n\n' +
            'Which one moves, and which way?',
        ask: {
            param: 'demand', direction: 'up', among: EVERYTHING, illustrate: 50,
            explain: 'Buyers want more at every price, so demand increases and the curve shifts to the ' +
                'right. Export prices rise. Import prices have not changed, so the terms of trade rise.'
        }
    },
    // Starts away from the baseline, because a ratio of 100 from 100 and 100
    // has nothing to work out. The same `set` whatever the student did.
    {
        set: { demand: 125, supply: 100, imports: 100 },
        title: 'Prices catch up',
        say: 'Export prices are at 120, so the terms of trade are also at 120. Suppose the things Australia ' +
            'buys then cost more, until the terms of trade are back at 100.\n\n' +
            'Move it as far as this requires, then press Check.',
        ask: {
            param: 'imports', direction: 'up', target: 120, among: EVERYTHING,
            explain: 'The terms of trade are 120 ÷ 120 × 100 = 100. When export prices and import prices ' +
                'rise by the same percentage, exports buy the same amount as before.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'Over to you',
        say: 'Here is how you went on the four cases.\n\n' +
            'If you would like more practice, press Finish to open this market in the Playground. You ' +
            'can try more cases in Scenarios, or move the curves yourself.',
        recap: {
            takeaway: 'The terms of trade are export prices divided by import prices, multiplied by 100. ' +
                'They rise when export prices rise or import prices fall, because the same exports buy ' +
                'more imports. High prices attract new supply, so a boom tends to fade.'
        }
    }
];

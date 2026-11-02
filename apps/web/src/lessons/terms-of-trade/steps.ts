import type { LessonStep } from '../../track/track';

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
        say: 'Australia\'s biggest exports are commodities: iron ore, coal and gas, shipped to steel ' +
            'mills and power stations overseas.\n\n' +
            'The demand curve, D, shows how much the world wants at each price. The supply curve, S, ' +
            'shows how much Australian miners ship.',
        term: {
            word: 'Commodity',
            meaning: 'A raw material sold in bulk, where one load is much the same as another.'
        }
    },
    {
        reveal: ['equilibrium_market'],
        title: 'Prices as an index',
        say: 'Where the curves cross, the market sets a price, P*, and a volume shipped, Q*. Each is ' +
            'written as an index that starts at 100.\n\n' +
            'So a price of 120 would mean prices are 20% higher than at the start.',
        term: {
            word: 'Index',
            meaning: 'A number that tracks a change from a start of 100: 120 means 20% higher, and 90 ' +
                'means 10% lower.'
        }
    },
    // Words alone, with the market still at the front: the other half of the
    // ratio, before the panel that draws the ratio.
    {
        title: 'What Australia buys',
        say: 'Exports pay for imports: phones, laptops, cars and fuel. Import prices are an index too, ' +
            'tracking the cost of a basket of imports. It starts at 100.\n\n' +
            'So how much can a basket of exports buy? That depends on both prices.',
        term: {
            word: 'Basket',
            meaning: 'A fixed mix of goods, kept the same so a price index compares like with like.'
        }
    },
    {
        reveal: ['trade'],
        focus: 'trade',
        title: 'The terms of trade',
        say: 'Divide export prices by import prices, then multiply by 100: 100 ÷ 100 × 100 = 100. ' +
            'That\'s the terms of trade, ToT.\n\n' +
            'Read it in baskets: at 100, the point shows 100 baskets of exports buying 100 baskets ' +
            'of imports.',
        term: {
            word: 'Terms of trade',
            meaning: 'Export prices ÷ import prices × 100: how much a country\'s exports buy in imports.'
        }
    },
    {
        set: { imports: 125 },
        title: 'Imports get dearer',
        say: 'Say a chip shortage pushes up the price of phones and laptops, and import prices rise ' +
            'to 125. Exports haven\'t changed.\n\n' +
            '100 ÷ 125 × 100 = 80. The line turns down from the dashed one, where it was: 100 ' +
            'baskets of exports now buy 80.'
    },
    {
        set: { imports: 80 },
        title: 'Imports get cheaper',
        say: 'Now say factories overseas cut their prices, and import prices fall to 80.\n\n' +
            '100 ÷ 80 × 100 = 125, so the same exports buy more. Move import prices yourself and ' +
            'watch the line turn.',
        try: [{ param: 'imports', label: 'Import prices' }]
    },
    // Back to the start as a step of its own, so the boom that follows moves
    // only demand; and it sets import prices, which the step before handed
    // to the student.
    {
        set: { imports: 100 },
        title: 'Favourable and unfavourable',
        say: 'Import prices settle back at 100, and the terms of trade with them.\n\n' +
            'A rise is called favourable, because the same exports buy more imports. A fall is ' +
            'unfavourable. Either can start with export prices or with import prices.',
        term: {
            word: 'Favourable movement',
            meaning: 'A rise in the terms of trade: the same exports buy more imports. A fall is an ' +
                'unfavourable movement.'
        }
    },
    {
        part: 'The boom',
        focus: 'market',
        set: { demand: 200 },
        title: 'China starts building',
        say: 'In the 2000s, China built cities, railways and factories at a record pace. Its steel ' +
            'mills wanted far more iron ore and coal at every price.\n\n' +
            'The demand curve shifts right of the dashed one, where it was.'
    },
    {
        title: 'Mines take years to build',
        say: 'A new mine, its railway and its port take years. Until then, miners can only squeeze a ' +
            'little more from the mines they have, so the supply curve is steep.\n\n' +
            'Volume edges up to 120, and the price nearly doubles to 180.',
        term: {
            word: 'Short run',
            meaning: 'A time too short to build new capacity, so sellers can change how much they ' +
                'sell only a little.'
        }
    },
    {
        focus: 'trade',
        title: 'The terms of trade soar',
        say: 'Import prices haven\'t moved, so 180 ÷ 100 × 100 = 180. The line is much steeper.\n\n' +
            '100 baskets of exports now buy 180 baskets of imports. Australia can afford nearly ' +
            'twice the imports for the same exports.'
    },
    {
        reveal: ['revenue'],
        focus: 'revenue',
        title: 'More money coming in',
        say: 'Price times volume is export revenue, the green rectangle: what the world pays ' +
            'Australia. It\'s an index too, and it started at 100.\n\n' +
            'Now it\'s 216, more than double. Most of that rise came from the price.',
        term: {
            word: 'Export revenue',
            meaning: 'What a country earns from its exports: their price times their volume.'
        }
    },
    {
        title: 'Who gains, and who doesn\'t',
        say: 'Mining profits soar, and so does the tax governments collect on them. Buyers need more ' +
            'AUD to pay for dearer ore, so the AUD tends to rise, which makes imports cheaper too.\n\n' +
            'Not everyone gains. A dearer AUD makes it harder for farmers, universities and tourism ' +
            'to sell overseas.'
    },
    {
        part: 'After the boom',
        focus: 'market',
        set: { supply: 150 },
        title: 'New mines open',
        say: 'High prices make new mines worth building. Years later they start shipping, so miners ' +
            'sell more at every price.\n\n' +
            'The supply curve shifts right. The price falls to 140, and volume jumps to 160.',
        term: {
            word: 'Long run',
            meaning: 'Time enough to build new capacity, so sellers can change how much they sell by ' +
                'much more.'
        }
    },
    {
        focus: 'revenue',
        title: 'Lower prices, more revenue',
        say: 'The terms of trade fall to 140: each basket of exports buys less than at the peak.\n\n' +
            'But far more is leaving port, so export revenue rises to 224. The terms of trade follow ' +
            'prices. Revenue counts the volume as well.'
    },
    {
        focus: 'market',
        set: { demand: 175 },
        title: 'China slows down',
        say: 'China finishes its biggest projects, and its mills need less ore. Demand eases, but it ' +
            'stays well above where it began.\n\n' +
            'The demand curve shifts left, and the price falls to 120.'
    },
    {
        focus: 'trade',
        title: 'A new normal',
        say: 'The terms of trade settle at 120: below the peak, but above where they began.\n\n' +
            'That\'s what really happened. Australia\'s peaked in 2011, then fell by about a third, ' +
            'and stayed above their 20th-century average.'
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
        say: 'A cyclone shuts Australia\'s biggest ore port for weeks, and ships can\'t load.\n\n' +
            'Which one moves, and which way? Move it, then press Check.',
        ask: {
            param: 'supply', direction: 'down', among: EVERYTHING, illustrate: 20,
            explain: 'Less can be shipped at every price, so supply decreases and the curve shifts ' +
                'left. Export prices rise, and with import prices unchanged, so do the terms of trade.'
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
            explain: 'Australia buys those goods from overseas, so import prices rise. Export prices ' +
                'haven\'t changed, so the same exports buy fewer imports: the terms of trade fall.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'India starts building',
        say: 'India builds railways and ports at a record pace, and orders more Australian coal and ' +
            'iron ore.\n\n' +
            'Which one moves, and which way?',
        ask: {
            param: 'demand', direction: 'up', among: EVERYTHING, illustrate: 50,
            explain: 'Buyers want more at every price, so demand increases and the curve shifts ' +
                'right. Export prices rise, and with import prices unchanged, so do the terms of trade.'
        }
    },
    // Starts away from the baseline, because a ratio of 100 from 100 and 100
    // has nothing to work out. The same `set` whatever the student did.
    {
        set: { demand: 125, supply: 100, imports: 100 },
        title: 'Prices catch up',
        say: 'Export prices are at 120, so the terms of trade are too. Then the things Australia buys ' +
            'get dearer, until the terms of trade are back at 100.\n\n' +
            'Move it just as far as that takes, then press Check.',
        ask: {
            param: 'imports', direction: 'up', target: 120, among: EVERYTHING,
            explain: '120 ÷ 120 × 100 = 100. When export prices and import prices rise by the same ' +
                'percentage, exports buy just what they did before.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'Over to you',
        say: 'Here\'s how you went on the four cases.\n\n' +
            'Press Finish to take this market to the Playground, where you can try more cases in ' +
            'Scenarios or move the curves yourself.',
        recap: {
            takeaway: 'The terms of trade are export prices ÷ import prices × 100. They rise when ' +
                'exports get dearer or imports cheaper, and the same exports buy more. High prices ' +
                'bring new supply, so a boom fades.'
        }
    }
];

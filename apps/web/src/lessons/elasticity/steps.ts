import type { LessonStep } from '../../track/track';

/** Where the canteen starts: 210 sausage rolls a day at $4.50. Every curve the sliders draw passes through it. */
export const START_PRICE = 4.5;
export const START_ROLLS = 210;

/** Sales lost for each dollar on the price: with students kept in at lunch, and with the bakery across the road. */
export const KEPT_IN = 20;
export const BAKERY = 70;

/** Where the lesson starts, and the questions about a canteen with no bakery. */
export const BASELINE = { price: START_PRICE, response: KEPT_IN };

/** Where the questions about a canteen with the bakery open start. */
export const BAKERY_OPEN = { price: START_PRICE, response: BAKERY };

/**
 * The lesson, in four parts: what elasticity measures, what it does to a
 * seller's revenue, what makes it high or low, and three cases to work out.
 *
 * One canteen, one $1 rise, told twice: first with students kept in at
 * lunch, then with a bakery across the road. The rise is the same both
 * times, 20%, so the difference in what follows is the difference in how
 * far students respond, and nothing else.
 *
 * Every number a step states is one the diagram solves to at that step, and
 * `priceElasticity.test.tsx` holds them to it.
 */
export const ELASTICITY_LESSON: LessonStep[] = [
    {
        part: 'How much buyers respond',
        reveal: ['demand_canteen', 'atPrice_canteen'],
        title: 'The canteen\'s sausage rolls',
        say: 'Your school canteen sells sausage rolls for $4.50, and students buy 210 a day. The ' +
            'demand curve, D, shows how many they\'d buy at each price.\n\n' +
            'The canteen\'s price is P. Read the quantity demanded at it, Qd, off the bottom axis.',
        term: {
            word: 'Quantity demanded',
            meaning: 'How much buyers want to buy at one particular price.'
        }
    },
    {
        set: { price: 5.5 },
        title: 'Up a dollar',
        say: 'The canteen puts sausage rolls up to $5.50. Students can\'t leave school at lunch, so ' +
            'most still buy one: 190 a day.\n\n' +
            'The point slides up the curve from the faint one, where it was.'
    },
    // The two changes as the elasticity divides them, a step before it
    // does: the percentages arrive here, and the elasticity at the next.
    {
        title: 'Changes as percentages',
        say: 'To compare a change in dollars with a change in sausage rolls, turn each into a ' +
            'percentage of halfway between before and after.\n\n' +
            '$1 on $5.00, halfway between $4.50 and $5.50, is 20%. 20 rolls on 200 is 10%. So the ' +
            'price rose 20%, and quantity demanded fell 10%.',
        term: {
            word: 'Midpoint method',
            meaning: 'Measuring a change as a percentage of halfway between before and after, so a ' +
                'rise and the fall back again come out the same size.'
        }
    },
    {
        title: 'Price elasticity of demand',
        say: 'Divide one by the other: 10% ÷ 20% = 0.50. That\'s the price elasticity of demand: ' +
            'how much students respond to the price.\n\n' +
            'Quantity demanded fell, so its change is really −10%, but elasticity is written ' +
            'without the minus sign.',
        term: {
            word: 'Price elasticity of demand',
            meaning: 'How much quantity demanded responds to a change in price: the % change in ' +
                'quantity demanded ÷ the % change in price.'
        }
    },
    {
        title: 'Inelastic demand',
        say: 'An elasticity under 1 means quantity demanded changes by a smaller percentage than ' +
            'the price. Demand is inelastic.\n\n' +
            'Stuck at school, students have nowhere else to buy lunch, so a dearer roll loses few ' +
            'sales.',
        term: {
            word: 'Inelastic demand',
            meaning: 'Quantity demanded changes by a smaller percentage than the price: an ' +
                'elasticity under 1.'
        }
    },
    // The revenue panel takes the front as it arrives: the rest of the
    // lesson is read off its caption, and the canteen's goes to the rail.
    {
        part: 'Elasticity and revenue',
        reveal: ['revenue'],
        focus: 'revenue',
        set: { price: START_PRICE },
        title: 'The canteen\'s revenue',
        say: 'Back at $4.50, the canteen takes $4.50 × 210 = $945.00 a day. That\'s its revenue: ' +
            'the green rectangle, as tall as the price and as wide as the quantity sold.\n\n' +
            'A higher price makes the rectangle taller. Fewer sales make it narrower.',
        term: {
            word: 'Revenue',
            meaning: 'What a seller takes from its sales: the price times the quantity sold.'
        }
    },
    {
        set: { price: 5.5 },
        title: 'Inelastic: a rise brings in more',
        say: 'At $5.50 the canteen sells 190 a day, and its revenue rises by $100.00.\n\n' +
            'With inelastic demand, sales fall by a smaller percentage than the price rises. What ' +
            'the canteen gains on the rolls it still sells is more than it loses on the ones it ' +
            'doesn\'t.'
    },
    // The same rise again, on a flatter curve through the same point. Back
    // at the start first, so the dashed curve is the one the first rise was
    // on and the next step's rise is from $4.50, as the first was.
    {
        part: 'When students have a choice',
        set: { ...BAKERY_OPEN },
        title: 'A bakery opens across the road',
        say: 'Back at $4.50, say a bakery opens across the road, selling sausage rolls for $4.50 ' +
            'too, and the school lets students out at lunch.\n\n' +
            'The canteen still sells 210 a day at $4.50. But its demand curve is flatter than the ' +
            'dashed one, where it was: each dollar on the price now loses 70 sales, not 20.',
        try: [{ param: 'response', label: 'Sales lost per $1' }],
        term: {
            word: 'Substitute',
            meaning: 'A good bought instead of another, like the bakery\'s sausage rolls instead of ' +
                'the canteen\'s.'
        }
    },
    {
        set: { ...BAKERY_OPEN, price: 5.5 },
        title: 'The same rise again',
        say: 'Now the canteen puts the price up to $5.50 again. Many students walk across the ' +
            'road: it sells just 140 a day.\n\n' +
            'This time its revenue falls by $175.00.'
    },
    {
        title: 'Elastic demand',
        say: 'Quantity demanded fell 40% this time, for the same 20% rise in price: 40% ÷ 20% = ' +
            '2.00.\n\n' +
            'An elasticity over 1 means quantity demanded changes by a bigger percentage than the ' +
            'price. Demand is elastic: students have somewhere else to go.',
        term: {
            word: 'Elastic demand',
            meaning: 'Quantity demanded changes by a bigger percentage than the price: an ' +
                'elasticity over 1.'
        }
    },
    {
        title: 'Which way revenue goes',
        say: 'With inelastic demand, a price rise brings in more revenue. With elastic demand, it ' +
            'brings in less, and a price cut brings in more.\n\n' +
            'Right on 1, demand is unit elastic, and a change in price leaves revenue where it was.',
        term: {
            word: 'Total revenue test',
            meaning: 'If a price rise brings in more revenue, demand is inelastic. If it brings in ' +
                'less, demand is elastic.'
        }
    },
    {
        title: 'What makes demand elastic',
        say: 'The bakery made the difference: a close substitute. Demand is also more elastic for ' +
            'a want than for a need, for something that takes a big share of what you spend, and ' +
            'the longer buyers have to change their habits.\n\n' +
            'Petrol is a need with few substitutes, so when it goes up, drivers still fill up: its ' +
            'demand is inelastic.'
    },
    // The questions. Each starts where its words say, the bakery open or
    // not, whatever the student did on the way; and each offers the price
    // and the curve, in that order every time. The first is a reason for
    // the curve to pivot; the other two ask for more revenue, which is the
    // price, one way with elastic demand and the other with inelastic.
    //
    // Direction only. `illustrate` is how far "Show me" draws the answer:
    // the curve back to the 20 sales a dollar of a school with no bakery,
    // and the price to $4.00 and $5.50, where each explanation's numbers are.
    {
        part: 'Your turn',
        set: { ...BAKERY_OPEN },
        title: 'No going out at lunch',
        say: 'The bakery is still open, but the school stops letting students out at lunch.\n\n' +
            'What moves, and which way? Move it, then press Check.',
        ask: {
            param: 'response', direction: 'down', among: ['price', 'response'], illustrate: 50,
            explain: 'With the bakery out of reach, students have no substitute at lunch. Each ' +
                'dollar on the price loses fewer sales: demand is less elastic, and its curve is ' +
                'steeper. The price stays put.'
        }
    },
    {
        set: { ...BAKERY_OPEN },
        title: 'More money, with the bakery open',
        say: 'The bakery is open, and students can go to it. The canteen wants to take more money ' +
            'each day.\n\n' +
            'What should it change, and which way?',
        ask: {
            param: 'price', direction: 'down', among: ['price', 'response'], illustrate: 0.5,
            explain: 'Demand is elastic, so a lower price wins sales by a bigger percentage than the ' +
                'price falls, and revenue rises: at $4.00 the canteen sells 245 a day and takes ' +
                '$980.00.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'More money, with no bakery',
        say: 'Now there\'s no bakery, and students can\'t leave school at lunch. The canteen wants ' +
            'to take more money each day.\n\n' +
            'What should it change, and which way?',
        ask: {
            param: 'price', direction: 'up', among: ['price', 'response'], illustrate: 1,
            explain: 'Demand is inelastic, so a higher price loses sales by a smaller percentage than ' +
                'the price rises, and revenue rises: at $5.50 the canteen sells 190 a day and takes ' +
                '$100.00 more.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'Over to you',
        say: 'Here\'s how you went on the three cases.\n\n' +
            'Press Finish to take the canteen to the Playground, where you can try more cases in ' +
            'Scenarios or move the price and the curve yourself.',
        recap: {
            takeaway: 'Elasticity is the % change in quantity demanded ÷ the % change in price. ' +
                'Under 1, a price rise brings in more revenue; over 1, a price cut does. The more ' +
                'substitutes buyers have, the more elastic their demand.'
        }
    }
];

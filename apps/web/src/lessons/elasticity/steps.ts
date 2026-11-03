import type { LessonStep } from '../../track/track';
import { GLOSSARY } from '../glossary';

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
        say: 'Your school canteen sells sausage rolls for $4.50, and students buy 210 a day.\n\n' +
            'The demand curve, labelled D, shows how many rolls students would buy at each price.\n\n' +
            'You can read the canteen\'s price from the price axis, and the quantity demanded, Qd, from ' +
            'the bottom axis.',
        term: GLOSSARY.quantityDemanded
    },
    {
        set: { price: 5.5 },
        title: 'A $1 price rise',
        say: 'Suppose the canteen raises the price of a sausage roll to $5.50. Students cannot leave ' +
            'school at lunch, so most of them still buy one. Sales fall to 190 a day.\n\n' +
            'The point slides up the curve from the faint point, which shows where it was.'
    },
    // The two changes as the elasticity divides them, a step before it
    // does: the percentages arrive here, and the elasticity at the next.
    {
        title: 'Changes as percentages',
        say: 'A change in dollars and a change in sausage rolls are hard to compare, so we turn each ' +
            'change into a percentage. We measure each one against the point halfway between the old ' +
            'and new values.\n\n' +
            '- The price rose by $1, and halfway is $5.00, so the price rose 20%.\n' +
            '- Sales fell by 20 rolls, and halfway is 200, so quantity demanded fell 10%.',
        term: GLOSSARY.midpointMethod
    },
    {
        title: 'Price elasticity of demand',
        say: 'To compare the two changes, we divide the change in quantity demanded by the change in ' +
            'price. Here, 10% ÷ 20% = 0.50.\n\n' +
            'This number is the price elasticity of demand. It tells us how much students respond to a ' +
            'change in price.\n\n' +
            'Quantity demanded fell, so its change is −10%, but elasticity is usually written without ' +
            'the minus sign.',
        term: GLOSSARY.priceElasticityOfDemand
    },
    {
        title: 'Inelastic demand',
        say: 'When the elasticity is below 1, quantity demanded changes by a smaller percentage than the ' +
            'price. We say that demand is inelastic.\n\n' +
            'Students are at school with nowhere else to buy lunch, so a higher price loses few sales.',
        term: GLOSSARY.inelasticDemand
    },
    // The revenue panel takes the front as it arrives: the rest of the
    // lesson is read off its caption, and the canteen's goes to the rail.
    {
        part: 'Elasticity and revenue',
        reveal: ['revenue'],
        focus: 'revenue',
        set: { price: START_PRICE },
        title: 'The canteen\'s revenue',
        say: 'Let\'s return to a price of $4.50. The canteen earns $4.50 × 210 = $945.00 a day, which is ' +
            'its total revenue.\n\n' +
            'Total revenue is shown by the green rectangle. The rectangle is as tall as the price and as ' +
            'wide as the quantity sold.\n\n' +
            'A higher price makes the rectangle taller, and lower sales make it narrower.',
        term: GLOSSARY.totalRevenue
    },
    {
        set: { price: 5.5 },
        title: 'A price rise with inelastic demand',
        say: 'At $5.50 the canteen sells 190 rolls a day, and its revenue rises by $100.00.\n\n' +
            'With inelastic demand, sales fall by a smaller percentage than the price rises. The canteen ' +
            'gains more on the rolls it still sells than it loses on the rolls it no longer sells.'
    },
    // Back to the start, as a step of its own: it is the other half of what
    // inelastic demand does to revenue, and it leaves the next step moving
    // only the curve. Once, that step moved the price back as well, and its
    // chip and "What changed" led with the price cut, not the bakery.
    {
        set: { price: START_PRICE },
        title: 'A price cut with inelastic demand',
        say: 'If the price returns to $4.50, the canteen sells 210 rolls a day again, but its revenue ' +
            'falls by $100.00.\n\n' +
            'With inelastic demand, a price cut raises sales by a smaller percentage than the price ' +
            'falls, so revenue falls.'
    },
    // The same rise again, on a flatter curve through the same point, so the
    // dashed curve is the one the first rise was on and the next step's rise
    // is from $4.50, as the first was.
    {
        part: 'When students have a choice',
        set: { response: BAKERY },
        title: 'A bakery opens across the road',
        say: 'Now suppose a bakery opens across the road and sells sausage rolls for $4.50 too. The school ' +
            'also lets students leave at lunch.\n\n' +
            'The canteen still sells 210 rolls a day at $4.50, but its demand curve is now flatter than ' +
            'the dashed curve, which shows where it was.\n\n' +
            'Each dollar on the price now loses 70 sales, not 20.',
        try: [{ param: 'response', label: 'Sales lost per $1' }]
    },
    {
        set: { ...BAKERY_OPEN, price: 5.5 },
        title: 'The same rise again',
        say: 'Suppose the canteen raises the price to $5.50 again. The bakery\'s rolls are a substitute, ' +
            'so many students walk across the road.\n\n' +
            'The canteen sells only 140 rolls a day, and this time its revenue falls by $175.00.',
        term: GLOSSARY.substitute
    },
    {
        title: 'Elastic demand',
        say: 'Quantity demanded fell by 40% this time, for the same 20% rise in price. The elasticity is ' +
            '40% ÷ 20% = 2.00.\n\n' +
            'When the elasticity is above 1, quantity demanded changes by a bigger percentage than the ' +
            'price. We say that demand is elastic, because students have somewhere else to go.',
        term: GLOSSARY.elasticDemand
    },
    {
        title: 'Which way revenue goes',
        say: 'Here is what happens to revenue after a price rise. A price cut has the opposite effect.\n\n' +
            '- With inelastic demand, revenue increases.\n' +
            '- With elastic demand, revenue decreases.\n' +
            '- With unit elastic demand, which has an elasticity of 1, revenue does not change.',
        term: GLOSSARY.totalRevenueTest
    },
    {
        title: 'What makes demand elastic',
        say: 'The bakery made demand more elastic because it is a close substitute. Demand also tends to ' +
            'be more elastic in three other cases.\n\n' +
            '- The good is a want rather than a need.\n' +
            '- The good takes up a large share of what buyers spend.\n' +
            '- Buyers have more time to change their habits.\n\n' +
            'Petrol is a need with few substitutes. When its price rises, most drivers still buy it, so ' +
            'demand for petrol is inelastic.'
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
            'What moves, and which way? Move it on the diagram, then press Check.',
        ask: {
            param: 'response', direction: 'down', among: ['price', 'response'], illustrate: 50,
            explain: 'With the bakery out of reach, students have no substitute at lunch. Each dollar on ' +
                'the price loses fewer sales, so demand is less elastic and the curve is steeper. The ' +
                'price does not change.'
        }
    },
    {
        set: { ...BAKERY_OPEN },
        title: 'More money, with the bakery open',
        say: 'The bakery is open, and students can go to it. The canteen wants to earn more money each ' +
            'day.\n\n' +
            'What should it change, and which way?',
        ask: {
            param: 'price', direction: 'down', among: ['price', 'response'], illustrate: 0.5,
            explain: 'Demand is elastic, so a lower price raises sales by a bigger percentage than the ' +
                'price falls. Revenue rises, and at $4.00 the canteen sells 245 a day and earns $980.00.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'More money, with no bakery',
        say: 'Now suppose there is no bakery, and students cannot leave school at lunch. The canteen ' +
            'wants to earn more money each day.\n\n' +
            'What should it change, and which way?',
        ask: {
            param: 'price', direction: 'up', among: ['price', 'response'], illustrate: 1,
            explain: 'Demand is inelastic, so a higher price lowers sales by a smaller percentage than ' +
                'the price rises. Revenue rises, and at $5.50 the canteen sells 190 a day and earns ' +
                '$100.00 more.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'Over to you',
        say: 'Here is how you went on the three cases.\n\n' +
            'If you would like more practice, press Finish to open the canteen in the Playground. You ' +
            'can try more cases in Scenarios, or move the price and the curve yourself.',
        recap: {
            takeaway: 'Price elasticity of demand is the percentage change in quantity demanded divided ' +
                'by the percentage change in price. Below 1, a price rise increases revenue. Above 1, a ' +
                'price cut does. More substitutes make demand more elastic.'
        }
    }
];

import type { LessonStep } from '../../track/track';
import { GLOSSARY } from '../glossary';

/** Where the market starts, at equilibrium, and where every question starts from. */
export const BASELINE = { price: 3, demand: 300, supply: 300 };

/**
 * The lesson, in four parts: a price above equilibrium and the surplus it
 * leaves, a price below it and the shortage, a shift of demand that leaves a
 * shortage at the old price, and four markets for the student to settle.
 *
 * Each price is a weekend's: the stalls open at a price, and what is left
 * over or sold out by the end of the morning sets the price they open at the
 * next weekend. So the price moves in steps, one a step, and the faint points
 * the engine leaves behind say where it was.
 *
 * Every number a step states is one the diagram solves to at that step, and
 * `shortageSurplus.test.tsx` holds them to it.
 */
export const SHORTAGE_LESSON: LessonStep[] = [
    {
        part: 'When the price is too high',
        reveal: ['marketDemand', 'marketSupply', 'equilibrium'],
        title: 'Mangoes at the market',
        say: 'Suppose growers sell mangoes at a weekend market. The demand curve, labelled D, shows how many ' +
            'mangoes buyers want at each price. The supply curve, labelled S, shows how many growers bring.\n\n' +
            'The curves cross at the equilibrium price of $3.00, which economists write as P*. At this price, ' +
            'buyers want as many mangoes as growers bring.',
        term: GLOSSARY.equilibrium
    },
    // The price arrives with the two points it picks, and the line runs out
    // to the further of them: the surplus between them is the next step's.
    {
        reveal: ['priceLine', 'priceSymbol', 'atDemand', 'atSupply'],
        set: { price: 4 },
        title: 'The stalls open at $4.00',
        say: 'Now suppose the stalls open at $4.00 a mango, which is shown by the dotted line.\n\n' +
            'At this price, buyers want only 200 mangoes, but growers bring 400. Economists write these ' +
            'amounts as Qd and Qs, the quantity demanded and the quantity supplied.'
    },
    {
        reveal: ['surplusLeg', 'surplusLabel'],
        title: 'A surplus',
        say: 'Growers bring 400 − 200 = 200 more mangoes than buyers want, so 200 mangoes are left over at ' +
            'the end of the morning.\n\n' +
            'This gap between quantity supplied and quantity demanded is called a surplus, or excess supply.',
        term: GLOSSARY.surplus
    },
    {
        set: { price: 3.5 },
        title: 'Growers cut their prices',
        say: 'Growers would rather sell their mangoes for less than take them home, so they cut their ' +
            'prices. Suppose that the next weekend, the stalls open at $3.50.\n\n' +
            'At this price, buyers want 250 mangoes and growers bring 350. The surplus shrinks to ' +
            '350 − 250 = 100 mangoes. The faint points show where the market was.'
    },
    {
        set: { price: 3 },
        title: 'The surplus is gone',
        say: 'Growers keep cutting their prices until the price reaches $3.00. Here buyers want 300 ' +
            'mangoes and growers bring 300, so nothing is left over.\n\n' +
            'With no surplus, growers have no reason to cut their prices again, so the price stops falling.'
    },
    {
        part: 'When the price is too low',
        set: { price: 2 },
        title: 'The stalls open at $2.00',
        say: 'Now suppose the stalls open at $2.00 a mango instead.\n\n' +
            'At this price, buyers want 400 mangoes, but growers bring only 200.'
    },
    {
        reveal: ['shortageLeg', 'shortageLabel'],
        title: 'A shortage',
        say: 'Buyers want 400 − 200 = 200 more mangoes than growers bring. The stalls sell out early in the ' +
            'morning, and some buyers miss out.\n\n' +
            'This gap between quantity demanded and quantity supplied is called a shortage, or excess demand.',
        term: GLOSSARY.shortage
    },
    {
        set: { price: 2.5 },
        title: 'Prices rise',
        say: 'Buyers who miss out are willing to pay more, and growers notice the queues at their stalls. ' +
            'So the next weekend, the stalls open at $2.50.\n\n' +
            'At this price, buyers want 350 mangoes and growers bring 250. The shortage shrinks to ' +
            '350 − 250 = 100 mangoes.'
    },
    {
        set: { price: 3 },
        title: 'The shortage is gone',
        say: 'Prices keep rising until they reach $3.00, where buyers want as many mangoes as growers ' +
            'bring.\n\n' +
            'A surplus pushes the price down, and a shortage pushes it up. Either way, the price moves ' +
            'towards equilibrium. This is called the price mechanism.',
        term: GLOSSARY.priceMechanism
    },
    // The one "see what happens" step. The step after it sets the price
    // back, so wherever the student leaves it, the next part starts at $3.
    {
        title: 'A price further from equilibrium',
        say: 'You can move the price below to see the shortage or surplus at each price.\n\n' +
            'Notice that the further the price is from $3.00, the bigger the gap.',
        try: [{ param: 'price', label: 'The price' }]
    },
    // A move back to the start is a step of its own: the price, alone, so
    // the shift after it moves demand alone.
    {
        part: 'When demand changes',
        set: { price: 3 },
        title: 'Back to equilibrium',
        say: 'Let\'s return to a price of $3.00, where the market clears.\n\n' +
            'So far, only the price has moved, and the curves have not. Next, let\'s see what happens when ' +
            'one of the curves shifts.'
    },
    {
        set: { demand: 400 },
        title: 'Christmas is coming',
        say: 'Suppose it is the weekend before Christmas, and families want mangoes for Christmas lunch. ' +
            'Buyers want 100 more mangoes at every price, so the demand curve shifts to the right.\n\n' +
            'The stalls still open at $3.00. At this price, buyers now want 400 mangoes, but growers bring ' +
            '300, so there is a shortage of 100.',
        term: GLOSSARY.increaseInDemand
    },
    {
        set: { price: 3.5 },
        title: 'The price rises to $3.50',
        say: 'The shortage pushes the price up, as before. At $3.50, buyers want 350 mangoes and growers ' +
            'bring 350, so the shortage is gone.\n\n' +
            'The market has reached its new equilibrium. When demand increases, the shortage at the old ' +
            'price is what pushes the price up.'
    },
    // The questions. Each starts from the baseline, or from a market one
    // shift away from it, and each offers the price and both curves, in the
    // order the sliders are: a student who meets a surplus by shifting a
    // curve has missed the lesson's point, which is that the price moves and
    // the curves do not. No prompt says "the price", which is the price's
    // label: the stalls open at a price instead.
    //
    // Each has a target, the price where the market clears, because a price
    // pushed down past it leaves a shortage, and direction alone would mark
    // that right.
    {
        part: 'Your turn',
        set: { ...BASELINE, price: 4.5 },
        title: 'The stalls open at $4.50',
        say: 'Suppose that one weekend, the stalls open at $4.50 a mango.\n\n' +
            'What moves, and where does it stop? Move it on the diagram, then press Check.',
        ask: {
            param: 'price', direction: 'down', target: 3, among: ['price', 'demand', 'supply'],
            explain: 'At $4.50, growers bring 450 mangoes but buyers want only 150, so there is a surplus of ' +
                '300. Growers cut their prices until the surplus is gone at $3.00. Neither curve moves.'
        }
    },
    {
        set: { ...BASELINE, price: 1.5 },
        title: 'The stalls open at $1.50',
        say: 'Suppose that the next weekend, the stalls open at $1.50 a mango.\n\n' +
            'What moves, and where does it stop?',
        ask: {
            param: 'price', direction: 'up', target: 3, among: ['price', 'demand', 'supply'],
            explain: 'At $1.50, buyers want 450 mangoes but growers bring only 150, so there is a shortage of ' +
                '300. The price is pushed up until the shortage is gone at $3.00. Neither curve moves.'
        }
    },
    // A market one shift from the baseline, with the stalls still at $3:
    // the shift has happened, and the question is what the price does next.
    {
        set: { ...BASELINE, supply: 400 },
        title: 'A good season',
        say: 'Suppose a good season means growers bring 100 more mangoes at every price, but the stalls ' +
            'still open at $3.00.\n\n' +
            'What moves, and where does it stop?',
        ask: {
            param: 'price', direction: 'down', target: 2.5, among: ['price', 'demand', 'supply'],
            explain: 'At $3.00, growers now bring 400 mangoes but buyers want only 300, so there is a surplus ' +
                'of 100. Growers cut their prices until the surplus is gone at $2.50.'
        }
    },
    {
        set: { ...BASELINE, supply: 200 },
        title: 'A cyclone',
        say: 'Suppose a cyclone damages mango trees, and growers bring 100 fewer mangoes at every price. ' +
            'The stalls still open at $3.00.\n\n' +
            'What moves, and where does it stop?',
        ask: {
            param: 'price', direction: 'up', target: 3.5, among: ['price', 'demand', 'supply'],
            explain: 'At $3.00, buyers want 300 mangoes but growers now bring only 200, so there is a shortage ' +
                'of 100. The price is pushed up until the shortage is gone at $3.50.'
        }
    },
    {
        set: { ...BASELINE },
        title: 'Over to you',
        say: 'Here is how you went on the four questions.\n\n' +
            'If you would like more practice, press Finish to open this market in the Playground. You can ' +
            'move the price or either curve, or try a scenario.',
        recap: {
            takeaway: 'At a price above equilibrium, quantity supplied is greater than quantity demanded, and ' +
                'the surplus pushes the price down. At a price below it, the shortage pushes the price up. ' +
                'The price stops moving once quantity demanded equals quantity supplied.'
        }
    }
];

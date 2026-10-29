import type { LessonStep } from '../../track/track';

/**
 * The lesson, in order: what a student reads at each step, and what the step
 * does to the diagram (`reveal`, `set`).
 *
 * One idea per step: a short title that says it, a paragraph saying what
 * happens and, where it helps, one saying what it means. A word is defined in
 * the step that first uses it, in a key-term box, and not again. Every number
 * a step states is one the diagram solves to at that step.
 */

/** Where the market starts, and where every question starts from. */
export const BASELINE = { demand: 50, supply: 50 };

export const TEMPLATE_LESSON: LessonStep[] = [
    {
        part: 'Meet the market',
        reveal: ['demand_market', 'supply_market'],
        title: 'Shoppers and growers',
        say: 'The demand curve, D, shows how many punnets shoppers want at each price. The supply ' +
            'curve, S, shows how many growers bring.\n\n' +
            'The dearer a punnet, the fewer shoppers buy and the more growers bring.',
        term: {
            word: 'Demand and supply',
            meaning: 'How much buyers want to buy, and sellers want to sell, at each price.'
        }
    },
    {
        reveal: ['equilibrium_market'],
        title: 'Where they meet',
        say: 'Where the curves cross, shoppers want exactly as many punnets as growers bring: 50 ' +
            'punnets at $5.00 each.\n\n' +
            'That point gives one price, P*, and one quantity, Q*.',
        term: {
            word: 'Equilibrium',
            meaning: 'The price and quantity where demand equals supply.'
        }
    },
    // A question starts from the baseline, both curves included: the answer
    // is marked from where it began. It offers both curves, in the order the
    // sliders are, and its prompt names neither: which curve moves is the
    // first half of the answer.
    {
        part: 'Your turn',
        set: { ...BASELINE },
        title: 'A hailstorm',
        say: 'Hail flattens half the strawberry crop the night before the market.\n\n' +
            'Which curve moves, and which way? Move it, then press Check.',
        ask: {
            param: 'supply', direction: 'down', among: ['demand', 'supply'], illustrate: 10,
            explain: 'Growers have fewer punnets to bring at every price. So supply decreases, the ' +
                'supply curve shifts left, and the price rises.'
        }
    }
];

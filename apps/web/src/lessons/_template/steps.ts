import type { LessonStep } from '../../track/track';
import { GLOSSARY } from '../glossary';

/**
 * The lesson, in order: what a student reads at each step, and what the step
 * does to the diagram (`reveal`, `set`).
 *
 * One idea per step: a short title that says it, and short paragraphs that say
 * what happens and then what it means, in the voice `docs/language.md` sets
 * out. A word is defined in the step that first uses it, in a key-term box from
 * the glossary, and not again. Every number a step states is one the diagram
 * solves to at that step.
 */

/** Where the market starts, and where every question starts from. */
export const BASELINE = { demand: 50, supply: 50 };

export const TEMPLATE_LESSON: LessonStep[] = [
    {
        part: 'Meet the market',
        reveal: ['demand_market', 'supply_market'],
        title: 'Shoppers and growers',
        say: 'The demand curve, labelled D, shows how many punnets shoppers want at each price. The ' +
            'supply curve, labelled S, shows how many punnets growers bring.\n\n' +
            'When the price of a punnet rises, shoppers buy fewer punnets and growers bring more.',
        term: GLOSSARY.demand
    },
    {
        reveal: ['equilibrium_market'],
        title: 'Market equilibrium',
        say: 'At the point where the curves cross, shoppers want as many punnets as growers bring. This ' +
            'happens at 50 punnets, at $5.00 each.\n\n' +
            'You can read this price and quantity off the axes. Economists write them as P* and Q*.',
        term: GLOSSARY.equilibrium
    },
    // A question starts from the baseline, both curves included: the answer
    // is marked from where it began. It offers both curves, in the order the
    // sliders are, and its prompt names neither: which curve moves is the
    // first half of the answer.
    {
        part: 'Your turn',
        set: { ...BASELINE },
        title: 'A hailstorm',
        say: 'Suppose hail flattens half the strawberry crop the night before the market.\n\n' +
            'Which curve moves, and which way? Move it on the diagram, then press Check.',
        ask: {
            param: 'supply', direction: 'down', among: ['demand', 'supply'], illustrate: 10,
            explain: 'Growers have fewer punnets to bring at every price. Supply decreases, the supply ' +
                'curve shifts to the left, and the price rises.'
        }
    }
];

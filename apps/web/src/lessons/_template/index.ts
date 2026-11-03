import { defineLesson } from '../kit/lesson';
import type { StudyContent } from '../content';
import { BASELINE, TEMPLATE_LESSON } from './steps';
import { CALCS, PANELS, PARAMS } from './chart';

/**
 * The smallest lesson the kit makes: one market, three steps, one question.
 *
 * A lesson to copy, not to teach. No strand lists it, so no student sees it,
 * and the lesson tests run it beside every lesson that is listed, so it
 * cannot go stale. `docs/lesson-authoring.md` says how a lesson is written,
 * and in what order; this is the shape that comes out.
 *
 * Three files: `steps.ts` for the steps, `chart.ts` for the diagram, and
 * this one for the words and the `defineLesson` call that puts them
 * together. What is not here is the kit's: the question's params, each
 * panel's change, the ghost that stands down for a question, the drag that
 * freezes after Check.
 */
export const TEMPLATE: StudyContent = defineLesson({
    id: '_template',
    label: 'A template',
    title: 'The market for strawberries',
    goals: [
        'Who buys strawberries, and who grows them',
        'How the price of a punnet is set',
        'How to apply this to one change in the market'
    ],
    cover: {
        question: 'Why do strawberries cost more in some weeks?',
        hook: 'No single person sets the price of a punnet at a farmers\' market. In this lesson we look ' +
            'at how shoppers and growers together set the price, and at why the price changes.'
    },
    steps: TEMPLATE_LESSON,
    model: {
        id: '_template',
        name: 'A market for strawberries',
        params: PARAMS,
        calcs: CALCS,
        panels: PANELS,
        // What every number on screen is called, most important first.
        narratedCalcs: [
            {
                name: 'Pe', label: 'Price', tex: 'P^*', meaning: 'Equilibrium price', unit: '$', precision: 2,
                rise: 'The price rises', fall: 'The price falls'
            },
            {
                name: 'Qe', label: 'Punnets sold', tex: 'Q^*', precision: 0, meaning: 'Punnets sold a morning',
                rise: 'More punnets are sold', fall: 'Fewer punnets are sold'
            }
        ],
        paramMeanings: {
            demand: 'punnets shoppers want at $5',
            supply: 'punnets growers bring at $5'
        },
        // Each answerable with the two sliders.
        explorePrompts: [
            'What would make a punnet cost $6? Which curve moves, and which way?',
            'What happens to the price when demand and supply rise by the same amount?'
        ],
        paramWords: {
            demand: {
                about: 'Shoppers at the market, buying for the week.',
                rise: 'Demand for strawberries increases',
                fall: 'Demand for strawberries decreases',
                curve: 'demand',
                because: {
                    rise: 'At the old price, shoppers now want more than growers bring, so some ' +
                        'shoppers miss out and the price is pushed up until the two match again.',
                    fall: 'At the old price, growers now bring more than shoppers want, so some is ' +
                        'left over and the price is pushed down until the two match again.'
                }
            },
            supply: {
                about: 'Growers from around the district, bringing what they picked.',
                rise: 'Supply of strawberries increases',
                fall: 'Supply of strawberries decreases',
                curve: 'supply',
                because: {
                    rise: 'At the old price, growers now bring more than shoppers want, so some is ' +
                        'left over and the price is pushed down until the two match again.',
                    fall: 'At the old price, growers now bring less than shoppers want, so some ' +
                        'shoppers miss out and the price is pushed up until the two match again.'
                }
            }
        },
        scenarios: [
            {
                id: 'hail',
                label: 'Hail hits the crop',
                description: 'Growers bring fewer punnets at every price, so supply decreases.',
                params: { supply: 40 }
            },
            { id: 'baseline', label: 'Back to $5.00 a punnet', params: { ...BASELINE } }
        ],
        // Both curves are dragged sideways, so their params rise as the curve
        // moves right.
        directionWords: {
            demand: { up: 'right', down: 'left' },
            supply: { up: 'right', down: 'left' }
        }
    }
});

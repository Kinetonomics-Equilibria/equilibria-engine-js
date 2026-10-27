import {
    studyDiagram, EXPLAINED_CALCS, EXPLORE_PROMPTS, LESSON, NARRATED_CALCS, PANELS, PARAM_MEANINGS,
    PARAM_WORDS, QUESTION_APPARATUS, SCENARIOS
} from '../studyDiagram';
import type { LessonStep } from '../track/track';
import type { StudyContent, StudyModel } from './content';

/** A market, with its consumer surplus and revenue: what the first lesson is drawn on. */
export const MARKET: StudyModel = {
    id: 'market',
    name: 'A market, its surplus and its revenue',
    diagram: studyDiagram,
    panels: PANELS,
    narratedCalcs: NARRATED_CALCS,
    explainedCalcs: EXPLAINED_CALCS,
    paramMeanings: PARAM_MEANINGS,
    paramWords: PARAM_WORDS,
    explorePrompts: EXPLORE_PROMPTS,
    questionApparatus: QUESTION_APPARATUS,
    scenarios: SCENARIOS
};

/**
 * The first lesson, as the screen now takes it.
 *
 * The diagram and everything about it stay in `studyDiagram.ts`, untouched;
 * this only gathers its exports into the shape every lesson and model has,
 * and carries the heading the screen used to print whatever it was showing.
 */
export const SUPPLY_AND_DEMAND: StudyContent = {
    id: 'market',
    label: 'Supply and demand',
    title: 'A market, and what it does to everything else',
    goals: [
        'How demand and supply set a price',
        'What changes when demand rises',
        'One change to work out yourself'
    ],
    cover: {
        question: 'Why do prices go up and down?',
        hook: 'Nobody sets most prices. They settle where what buyers want meets what sellers ' +
            'will sell, and when either side changes the price moves, and with it who gains.'
    },
    lesson: LESSON as LessonStep[],
    model: MARKET
};

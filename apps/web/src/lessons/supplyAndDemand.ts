import {
    studyDiagram, EXPLAINED_CALCS, LESSON, NARRATED_CALCS, PANELS, PARAM_MEANINGS, QUESTION_APPARATUS,
    SCENARIOS
} from '../studyDiagram';
import type { LessonStep } from '../track/track';
import type { StudyContent } from './content';

/**
 * The first lesson, as the screen now takes it.
 *
 * The diagram and everything about it stay in `studyDiagram.ts`, untouched;
 * this only gathers its exports into the shape every lesson has, and carries
 * the heading the screen used to print whatever it was showing.
 */
export const SUPPLY_AND_DEMAND: StudyContent = {
    id: 'market',
    label: 'Supply and demand',
    title: 'A market, and what it does to everything else',
    intro: 'One market, seen three ways. Follow the lesson, or drag the demand curve at any time.',
    goals: [
        'How demand and supply set a price',
        'What changes when demand rises',
        'One change to work out yourself'
    ],
    diagram: studyDiagram,
    lesson: LESSON as LessonStep[],
    panels: PANELS,
    narratedCalcs: NARRATED_CALCS,
    explainedCalcs: EXPLAINED_CALCS,
    paramMeanings: PARAM_MEANINGS,
    questionApparatus: QUESTION_APPARATUS,
    scenarios: SCENARIOS
};

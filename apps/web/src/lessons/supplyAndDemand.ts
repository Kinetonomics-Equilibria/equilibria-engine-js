import {
    studyDiagram, EXPLAINED_CALCS, LESSON, NARRATED_CALCS, PANELS, QUESTION_APPARATUS, SCENARIOS
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
    intro: 'Step through the lesson below, or drag a curve at any point. The panels are the ' +
        'same market seen three ways, and they arrive as the lesson reaches them.',
    diagram: studyDiagram,
    lesson: LESSON as LessonStep[],
    panels: PANELS,
    narratedCalcs: NARRATED_CALCS,
    explainedCalcs: EXPLAINED_CALCS,
    questionApparatus: QUESTION_APPARATUS,
    scenarios: SCENARIOS
};

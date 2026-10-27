import type { StudyContent, StudyModel } from './content';
import { SUPPLY_AND_DEMAND } from './supplyAndDemand';
import { FOREIGN_EXCHANGE } from './foreignExchange';
import { PRODUCTION_POSSIBILITIES } from './productionPossibilities';
import { DEMAND_SHIFTERS } from './demandShifters';

/** A topic in the navbar's Lessons panel: a row that drops down to its lessons. */
export interface LessonTopic {
    /** Its key in the panel. */
    id: string;
    label: string;
    /**
     * A Mantine colour name. The dot before the topic's name is drawn in it,
     * and the topic holding the open lesson is lit in it.
     */
    color: string;
    lessons: StudyContent[];
}

/** A run of topics under one heading in the Lessons panel. */
export interface LessonStrand {
    label: string;
    topics: LessonTopic[];
}

/**
 * The lessons as the navbar arranges them: strands, the topics in each, and the
 * lessons in each topic.
 *
 * Adding a lesson to a topic here is what lists it — `LESSONS` below is read
 * off this, so the panel and the addresses cannot disagree about what exists.
 */
export const CURRICULUM: LessonStrand[] = [
    {
        label: 'Microeconomics',
        // In the order a course meets them: the economic problem, then
        // markets. The app opens on Home, so the first lesson listed is only
        // where a course starts, and where a link to a lesson that has gone
        // opens.
        topics: [
            {
                id: 'economic-problem', label: 'The economic problem', color: 'grape',
                lessons: [PRODUCTION_POSSIBILITIES]
            },
            // Demand's determinants before the whole market, as a course
            // meets them.
            { id: 'markets', label: 'Markets', color: 'teal', lessons: [DEMAND_SHIFTERS, SUPPLY_AND_DEMAND] }
        ]
    },
    {
        label: 'Macroeconomics',
        topics: [
            { id: 'international', label: 'International economics', color: 'orange', lessons: [FOREIGN_EXCHANGE] }
        ]
    }
];

/**
 * Every lesson the app offers, in the order the Lessons panel lists them.
 *
 * The first is where a course starts. A lesson is addressed by its `id`, which is
 * what `lessons/<id>` carries — so a teacher can hand a class a link to one.
 */
export const LESSONS: StudyContent[] =
    CURRICULUM.flatMap(strand => strand.topics.flatMap(topic => topic.lessons));

/** The lesson an id names, or the first one for an id that names nothing. */
export function lessonById(id: string | null | undefined): StudyContent {
    return LESSONS.filter(lesson => lesson.id === id)[0] || LESSONS[0];
}

/** The topic a lesson is listed under, or `null` for a lesson no topic holds. */
export function topicOfLesson(id: string): LessonTopic | null {
    const topics = CURRICULUM.flatMap(strand => strand.topics);
    return topics.filter(topic => topic.lessons.some(lesson => lesson.id === id))[0] || null;
}

/** Each model once, in the order the lessons drawn on them first come. */
const firstOfEach = (lessons: StudyContent[]): StudyModel[] => lessons
    .map(lesson => lesson.model)
    .filter((model, i, all) => all.map(m => m.id).indexOf(model.id) === i);

/**
 * Every model the playground offers: each one a lesson is drawn on, once, in
 * the order the Lessons panel lists the first lesson on it. Read off the
 * curriculum, so a model is in the playground once a lesson on it is listed,
 * and the two panels cannot disagree about what exists. A model is addressed
 * by its `id`: `playground/<id>`.
 */
export const MODELS: StudyModel[] = firstOfEach(LESSONS);

/** The model an id names, or the first one for an id that names nothing. */
export function modelById(id: string | null | undefined): StudyModel {
    return MODELS.filter(model => model.id === id)[0] || MODELS[0];
}

/**
 * A model under the topic its first lesson is listed under, or `null` for one
 * no listed lesson is drawn on — so the playground's panel is arranged in the
 * lessons' strands and topics, and a model is named over its title as its
 * lesson is.
 */
export function topicOfModel(id: string): LessonTopic | null {
    const lesson = LESSONS.filter(l => l.model.id === id)[0];
    return lesson ? topicOfLesson(lesson.id) : null;
}

/** The models a topic's lessons are drawn on, for the playground's panel. */
export function modelsOf(topic: LessonTopic): StudyModel[] {
    return firstOfEach(topic.lessons).filter(model => {
        const home = topicOfModel(model.id);
        return home !== null && home.id === topic.id;
    });
}

export type { StudyContent, StudyModel } from './content';

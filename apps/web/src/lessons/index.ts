import type { StudyContent, StudyModel } from './content';
import { SUPPLY_AND_DEMAND } from './market';
import { SHORTAGES_AND_SURPLUSES } from './shortage-surplus';
import { FOREIGN_EXCHANGE } from './fx';
import { PRODUCTION_POSSIBILITIES } from './ppc';
import { DEMAND_SHIFTERS } from './demand';
import { SUPPLY_SHIFTERS } from './supply';
import { PRICE_ELASTICITY } from './elasticity';
import { TERMS_OF_TRADE } from './terms-of-trade';
import { AGGREGATE_DEMAND_AND_SUPPLY } from './ad-as';

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
    /**
     * Models the Playground lists under this topic before any lesson is drawn
     * on them, after the ones its lessons are drawn on. A topic with these and
     * no lessons is in the Playground panel and not the Lessons panel. Once a
     * lesson is drawn on one, the lesson lists it, and it comes out of here.
     */
    models?: StudyModel[];
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
            // Demand's determinants, then supply's, before the whole
            // market, as a course meets them; then what a price away from
            // equilibrium leaves, which is why the market gets there; then
            // how far buyers respond to a price, which needs demand and a
            // price on it.
            {
                id: 'markets', label: 'Markets', color: 'teal',
                lessons: [DEMAND_SHIFTERS, SUPPLY_SHIFTERS, SUPPLY_AND_DEMAND, SHORTAGES_AND_SURPLUSES, PRICE_ELASTICITY]
            }
        ]
    },
    {
        label: 'Macroeconomics',
        topics: [
            // The economy as a whole before its trade with the world. No
            // lesson yet: its model is in the Playground on its own.
            {
                id: 'economic-activity', label: 'Economic activity', color: 'indigo',
                lessons: [], models: [AGGREGATE_DEMAND_AND_SUPPLY]
            },
            // The exchange rate first: the terms of trade lean on it for what
            // a boom does to the AUD.
            {
                id: 'international', label: 'International economics', color: 'orange',
                lessons: [FOREIGN_EXCHANGE, TERMS_OF_TRADE]
            }
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

const TOPICS = CURRICULUM.flatMap(strand => strand.topics);

/**
 * A model under the topic its first lesson is listed under, or the topic that
 * lists it with no lesson yet, or `null` for one neither does — so the
 * playground's panel is arranged in the lessons' strands and topics, and a
 * model is named over its title as its lesson is.
 */
export function topicOfModel(id: string): LessonTopic | null {
    const lesson = LESSONS.filter(l => l.model.id === id)[0];
    if (lesson) return topicOfLesson(lesson.id);
    return TOPICS.filter(topic => (topic.models || []).some(model => model.id === id))[0] || null;
}

/** The models a topic's lessons are drawn on, then its own, for the playground's panel. */
export function modelsOf(topic: LessonTopic): StudyModel[] {
    return [...firstOfEach(topic.lessons), ...(topic.models || [])].filter(model => {
        const home = topicOfModel(model.id);
        return home !== null && home.id === topic.id;
    });
}

/**
 * Every model the playground offers: each one a lesson is drawn on, and each
 * one a topic lists before any lesson is, once, in the order the Playground
 * panel lists them. Read off the curriculum, so a model is in the playground
 * once a lesson on it or its topic lists it, and the two panels cannot
 * disagree about what exists. A model is addressed by its `id`:
 * `playground/<id>`.
 */
export const MODELS: StudyModel[] = TOPICS.flatMap(modelsOf);

/** The model an id names, or the first one for an id that names nothing. */
export function modelById(id: string | null | undefined): StudyModel {
    return MODELS.filter(model => model.id === id)[0] || MODELS[0];
}

export type { StudyContent, StudyModel } from './content';

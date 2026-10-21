import type { StudyContent } from './content';
import { SUPPLY_AND_DEMAND } from './supplyAndDemand';
import { FOREIGN_EXCHANGE } from './foreignExchange';
import { PRODUCTION_POSSIBILITIES } from './productionPossibilities';

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
        topics: [
            { id: 'markets', label: 'Markets', color: 'teal', lessons: [SUPPLY_AND_DEMAND] },
            // After Markets for now, though a course meets it first: the first
            // lesson listed is the one the app opens on.
            {
                id: 'economic-problem', label: 'The economic problem', color: 'grape',
                lessons: [PRODUCTION_POSSIBILITIES]
            }
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
 * The first is where the app opens. A lesson is addressed by its `id`, which is
 * what `?lesson=` carries — so a teacher can hand a class a link to one.
 */
export const LESSONS: StudyContent[] =
    CURRICULUM.flatMap(strand => strand.topics.flatMap(topic => topic.lessons));

/** The lesson an id names, or the first one for an id that names nothing. */
export function lessonById(id: string | null | undefined): StudyContent {
    return LESSONS.filter(lesson => lesson.id === id)[0] || LESSONS[0];
}

export type { StudyContent } from './content';

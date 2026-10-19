import type { StudyContent } from './content';
import { SUPPLY_AND_DEMAND } from './supplyAndDemand';
import { FOREIGN_EXCHANGE } from './foreignExchange';

/**
 * Every lesson the app offers, in the order the navbar lists them.
 *
 * The first is where the app opens. A lesson is addressed by its `id`, which is
 * what `?lesson=` carries — so a teacher can hand a class a link to one.
 */
export const LESSONS: StudyContent[] = [SUPPLY_AND_DEMAND, FOREIGN_EXCHANGE];

/** The lesson an id names, or the first one for an id that names nothing. */
export function lessonById(id: string | null | undefined): StudyContent {
    return LESSONS.filter(lesson => lesson.id === id)[0] || LESSONS[0];
}

export type { StudyContent } from './content';

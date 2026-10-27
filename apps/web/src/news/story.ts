import type { StudyModel } from '../lessons/content';

/**
 * Something that happened, told against one model: what happened, which curve
 * it moves and which way, and why (docs/design.md, "In the news").
 *
 * Real, so it is dated and sourced: the day it happened, and the outlet that
 * reported it, linked. The headline and the sentence are written for the app
 * in plain words, never the article's own text. The real numbers are in the
 * words only: the diagram's numbers are the model's, and the report says so.
 *
 * A story is true of its day and stays so. It never expires, and a link to it
 * keeps opening.
 */
export interface Story {
    /**
     * Its address, `news/<id>`: the year and month it happened, then a few
     * words for what — `2026-09-rba-cash-rate` — so a teacher can read what a
     * link opens before sending it.
     */
    id: string;

    /** The day it happened, not the day it was written up: `2026-09-29`. */
    date: string;

    /** Plain words, present tense, sentence case: "The RBA raises the cash rate". */
    headline: string;

    /** One sentence of what happened, with its real numbers. */
    body: string;

    /** Who reported it, and where. */
    source: StorySource;

    /** The model the story is told against. */
    model: StudyModel;

    /**
     * The params it moves, and so which way, as a scenario's set: where it
     * leaves each one, from the model's own market.
     */
    move: Record<string, number>;

    /** Who, which curve, which way, as a scenario's reasoning is written. */
    reasoning: string;
}

/** An outlet and the article, or the statement, a story was checked against. */
export interface StorySource {
    /** Its name as a student would know it: "Reserve Bank of Australia". */
    outlet: string;
    href: string;
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * A story's date in words: `long` on its title line ("29 September 2026"),
 * `short` beside its headline on Home ("29 Sep 2026"), `day` under its month
 * in the In the news panel ("29 Sep").
 *
 * Read from the digits rather than through `Date`, which would put midnight
 * in Sydney on the day before in a browser west of Greenwich.
 */
export function dateWords(date: string, form: 'long' | 'short' | 'day'): string {
    const [year, month, day] = date.split('-').map(Number),
        name = MONTHS[month - 1] || '';
    if (form === 'long') return `${day} ${name} ${year}`;
    return form === 'short' ? `${day} ${name.slice(0, 3)} ${year}` : `${day} ${name.slice(0, 3)}`;
}

/** The month a story is listed under in the In the news panel: "September 2026". */
export function monthWords(date: string): string {
    const [year, month] = date.split('-').map(Number);
    return `${MONTHS[month - 1] || ''} ${year}`;
}

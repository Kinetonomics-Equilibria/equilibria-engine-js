import { topicOfModel } from '../lessons';
import type { LessonTopic } from '../lessons';
import { WRITTEN } from './stories';
import { monthWords } from './story';
import type { Story } from './story';

/**
 * Every story the app tells, newest first: the order the In the news panel
 * lists them in and Home's feed takes the first few from. A story is addressed
 * by its `id`, which is what `news/<id>` carries.
 */
export const STORIES: Story[] = WRITTEN.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

/** How many of the newest Home's feed shows. The panel lists every one. */
export const ON_HOME = 3;

/**
 * The story an id names, or null for one that names nothing.
 *
 * Not the newest in its place, as a lesson that has gone opens the first: a
 * story is a dated, real event, and another one opened in its place would say
 * something happened that the link was never about. The shell opens Home.
 */
export function storyById(id: string | null | undefined): Story | null {
    return STORIES.filter(story => story.id === id)[0] || null;
}

/** The topic a story is listed under: its model's, which is its first lesson's. */
export function topicOfStory(story: Story): LessonTopic | null {
    return topicOfModel(story.model.id);
}

/** The stories under each month they happened in, newest first, for the In the news panel. */
export function storiesByMonth(stories: Story[] = STORIES): { month: string; stories: Story[] }[] {
    const months: { month: string; stories: Story[] }[] = [];
    stories.forEach(story => {
        const month = monthWords(story.date), last = months[months.length - 1];
        if (last && last.month === month) last.stories.push(story);
        else months.push({ month, stories: [story] });
    });
    return months;
}

/**
 * The line under every story's report: a story's numbers are real and in its
 * words, and the diagram's are the model's.
 */
export const STORY_NOTE = 'The diagram shows which way this moves the market, not how far.';

export { dateWords, monthWords } from './story';
export type { Story, StorySource } from './story';

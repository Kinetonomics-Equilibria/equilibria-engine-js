import { describe, it, expect } from 'vitest';
import { LESSONS } from '../lessons';

/**
 * Every lesson as the screen is handed it, pinned, while the lesson kit (P16)
 * takes over writing them.
 *
 * The kit's claim is that a lesson it makes is the lesson that was written by
 * hand: the same params, calcs, objects and words. This is how that is shown,
 * one lesson at a time — the snapshot is taken before the kit exists, and each
 * lesson it moves has to leave its snapshot as it was, or explain the diff in
 * its commit.
 *
 * A tool for the migration, and deleted at the end of it. Kept, it would fail
 * on every chart edit and be updated without being read.
 *
 * Keys are sorted, because the engine reads an object by its keys and never by
 * their order, so a diff here is always a change in what is drawn or said.
 * Arrays keep their order: the order of a panel's objects is the order they
 * are drawn in.
 */

const sorted = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(sorted);
    if (value && typeof value === 'object') {
        const out: Record<string, unknown> = {};
        Object.keys(value as Record<string, unknown>).sort().forEach(key => {
            out[key] = sorted((value as Record<string, unknown>)[key]);
        });
        return out;
    }
    return value;
};

describe.each(LESSONS.map(lesson => [lesson.id, lesson] as const))('the "%s" lesson', (_id, lesson) => {
    it('is the lesson it was before the kit', () => {
        expect(sorted(lesson)).toMatchSnapshot();
    });
});

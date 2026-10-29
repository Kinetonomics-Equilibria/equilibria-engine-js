import { describe, it, expect } from 'vitest';
import { insideOf } from '../ts/view/letterFill';

/**
 * The insides of a label's letters are filled, so a line through the label
 * does not show in the bowl of its D. What counts as inside is what a flood
 * from the edges cannot reach; see `view/letterFill.ts`. The canvas the
 * letters are drawn on is not in jsdom, so this is the flood alone.
 */

/** Alpha from rows of `#` (ink) and `.` (paper). */
function picture(rows: string[]) {
    const width = rows[0].length, height = rows.length;
    const alpha = rows.join('').split('').map(c => c === '#' ? 255 : 0);
    return { alpha, width, height };
}

function rowsOf(inside: Uint8Array, width: number): string[] {
    const rows: string[] = [];
    for (let i = 0; i < inside.length; i += width) {
        rows.push(Array.from(inside.slice(i, i + width), v => v ? '#' : '.').join(''));
    }
    return rows;
}

describe('the insides of letters', () => {

    it('fills what a letter encloses, and nothing outside it', () => {
        const { alpha, width, height } = picture([
            '.......',
            '.####..',
            '.#...#.',
            '.#...#.',
            '.####..',
            '.......'
        ]);
        expect(rowsOf(insideOf(alpha, width, height), width)).toEqual([
            '.......',
            '.####..',
            '.#####.',
            '.#####.',
            '.####..',
            '.......'
        ]);
    });

    it('fills nothing in a letter that is open, as C is', () => {
        const { alpha, width, height } = picture([
            '......',
            '.####.',
            '.#....',
            '.#....',
            '.####.',
            '......'
        ]);
        const inside = insideOf(alpha, width, height);
        expect(Array.from(inside)).toEqual(alpha.map(a => a ? 1 : 0));
    });

    it('a hairline whose pixels meet only at a corner still closes a bowl', () => {
        const { alpha, width, height } = picture([
            '.......',
            '..###..',
            '.#...#.',
            '.#...#.',
            '..###..',
            '.......'
        ]);
        expect(rowsOf(insideOf(alpha, width, height), width)[2]).toBe('.#####.');
    });

    it('faint ink is paper, so antialiasing alone does not close a gap', () => {
        const alpha = [
            0, 0, 0, 0, 0,
            0, 255, 255, 255, 0,
            0, 255, 0, 30, 0,
            0, 255, 255, 255, 0,
            0, 0, 0, 0, 0
        ];
        expect(insideOf(alpha, 5, 5)[12]).toBe(0);
    });
});

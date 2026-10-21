import { describe, it, expect, beforeAll } from 'vitest';
import { mountObjects, stubContainerLayout } from './helpers';
import { readableOn, contrast, TEXT_CONTRAST } from '../ts/view/readable';

/**
 * A label is drawn in its thing's colour, darkened until it can be read.
 *
 * A colour chosen for a 2px line need only clear 3:1 against the sheet; a
 * letter needs 4.5:1. The equilibrium's green is 3.4:1 on white, so `P*` and
 * `Q*` were drawn in a colour a line can carry and a letter cannot. See
 * `view/readable.ts` and docs/chart-design.md.
 */

beforeAll(() => stubContainerLayout(800, 400));

function labelDiv(c: HTMLElement, text: string): HTMLElement {
    return Array.from(c.querySelectorAll('div[class^="rootElement-"]'))
        .find(d => (d.textContent || '').indexOf(text) > -1) as HTMLElement;
}

/** `rgb(…)` as jsdom reports a style, back to hex. */
function hex(rgb: string): string {
    const [r, g, b] = (rgb.match(/\d+/g) || []).map(Number);
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

describe('readable text', () => {

    it('leaves a colour that already reads as it is', () => {
        expect(readableOn('#1f77b4', '#ffffff')).toBe('#1f77b4');
        expect(readableOn('black', '#ffffff')).toBe('black');
    });

    it('darkens one that does not, on white, until it does', () => {
        for (const color of ['#2ca02c', '#e56a00', '#9467bd', '#7f7f7f']) {
            const shade = readableOn(color, '#ffffff');
            expect(shade).not.toBe(color);
            expect(contrast(shade, '#ffffff')).toBeGreaterThanOrEqual(TEXT_CONTRAST);
        }
    });

    it('lightens it on a dark canvas instead', () => {
        const shade = readableOn('#1f77b4', '#111111');
        expect(contrast(shade, '#111111')).toBeGreaterThanOrEqual(TEXT_CONTRAST);
        expect(contrast(shade, '#ffffff')).toBeLessThan(contrast('#1f77b4', '#ffffff'));
    });

    it('passes through what is not a colour', () => {
        expect(readableOn('currentColor', '#ffffff')).toBe('currentColor');
    });

    it('draws a label in the readable shade, and its line in the colour it was given', () => {
        const r = mountObjects([{
            Point: {
                // Quoted: a bare `#` starts a comment in mathjs.
                name: 'e', coordinates: [10, 10], color: "'#2ca02c'",
                droplines: { vertical: 'Q^*', horizontal: 'P^*' }
            }
        }]);

        const drawn = hex(labelDiv(r.container, 'P').style.color);
        expect(drawn).not.toBe('#2ca02c');
        expect(contrast(drawn, '#ffffff')).toBeGreaterThanOrEqual(TEXT_CONTRAST);

        const lines = Array.from(r.container.querySelectorAll('line'))
            .map(l => l.getAttribute('stroke'))
            .filter(s => s && s.startsWith('#'));
        expect(lines).toContain('#2ca02c');

        r.destroy();
    });
});

import { describe, it, expect, beforeAll } from 'vitest';
import { mountObjects, stubContainerLayout } from './helpers';

/**
 * An axis title is marked, so the theme can set it in the page's font.
 *
 * Titles are KaTeX labels, `\text{Quantity}`, and KaTeX sets text mode in its
 * own serif. The rule that undoes that is in kgjs-theme.css and jsdom does no
 * styling, so what is pinned here is the class it hangs on: on an axis title,
 * and on nothing else — a curve's `D` is maths and keeps KaTeX's italic. The
 * fonts themselves are checked in a browser, in apps/web/tests/app.spec.ts.
 */

beforeAll(() => stubContainerLayout(800, 400));

function labelDiv(c: HTMLElement, text: string): HTMLElement {
    return Array.from(c.querySelectorAll('div[class^="rootElement-"]'))
        .find(d => (d.textContent || '').indexOf(text) > -1) as HTMLElement;
}

describe('axis title font', () => {

    it('an axis title carries kg-axis-title, and another label does not', () => {
        const r = mountObjects(
            [{ Label: { name: 'note', text: 'note', x: 5, y: 5, plainText: true } }],
            { xAxis: { title: 'Quantity', min: 0, max: 30 }, yAxis: { title: 'Price', min: 0, max: 30 } }
        );

        expect(labelDiv(r.container, 'Quantity').classList.contains('kg-axis-title')).toBe(true);
        expect(labelDiv(r.container, 'Price').classList.contains('kg-axis-title')).toBe(true);
        expect(labelDiv(r.container, 'note').classList.contains('kg-axis-title')).toBe(false);

        r.destroy();
    });
});

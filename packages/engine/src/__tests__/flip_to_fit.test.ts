import { describe, it, expect, beforeAll } from 'vitest';
import { mountObjects } from './helpers';

/**
 * A label beside its anchor goes to the other side when this side runs off the
 * plot, if it asks to (`flipToFit`).
 *
 * On the café's PPC the coffees label stood to the left of the step's upright
 * leg, and with B at the coffees axis it ran across the axis and its title.
 * Whether it fits is a matter of pixels, so the label decides when it knows its
 * width. jsdom lays nothing out, so every label here is 60px wide and the
 * container 800 by 400; see `position` in `view/viewObjects/label.ts`.
 */

const LABEL_WIDTH = 60;

const isLabel = (el: Element) => el.tagName === 'DIV' && /^rootElement-/.test(el.getAttribute('class') || '');

beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {
        get() { return isLabel(this) ? LABEL_WIDTH : 800; }, configurable: true
    });
    Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
        get() { return isLabel(this) ? 16 : 400; }, configurable: true
    });
});

function left(c: HTMLElement, text: string): number {
    const div = Array.from(c.querySelectorAll('div[class^="rootElement-"]'))
        .find(d => d.textContent === text) as HTMLElement;
    return parseFloat(div.style.left);
}

/** A label to the left of its anchor at `x`, with and without `flipToFit`. */
const beside = (name: string, x: number, flipToFit: boolean) =>
    ({ Label: { name, text: name, x, y: 15, plainText: true, position: 'r', flipToFit } });

describe('a label that flips to fit', () => {

    it('goes to the other side of its anchor when this side runs off the plot', () => {
        // x = 1 in [0, 30] is a few pixels from the y axis: no room for 60px.
        const r = mountObjects([beside('stays', 1, false), beside('flips', 1, true)]);

        // The same anchor, 5px either side of it: one ends there, one starts there.
        expect(left(r.container, 'flips')).toBeCloseTo(left(r.container, 'stays') + LABEL_WIDTH + 10, 5);
        r.destroy();
    });

    it('stays where it was put when it fits there', () => {
        const r = mountObjects([beside('stays', 15, false), beside('flips', 15, true)]);
        expect(left(r.container, 'flips')).toBe(left(r.container, 'stays'));
        r.destroy();
    });

    it('flips back as its anchor moves to where it fits', () => {
        const moving = (name: string, flipToFit: boolean) =>
            ({ Label: { name, text: name, x: 'params.x', y: 15, plainText: true, position: 'r', flipToFit } });
        const r = mountObjects([moving('stays', false), moving('flips', true)],
            { params: [{ name: 'x', value: 1, min: 0, max: 30 }] });
        const flipped = () => left(r.container, 'flips') - left(r.container, 'stays');

        expect(flipped()).toBeCloseTo(LABEL_WIDTH + 10, 5);
        r.kg.update({ params: [{ name: 'x', value: 15 }] });
        expect(flipped()).toBe(0);
        r.kg.update({ params: [{ name: 'x', value: 1 }] });
        expect(flipped()).toBeCloseTo(LABEL_WIDTH + 10, 5);
        r.destroy();
    });
});

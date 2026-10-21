import { describe, it, expect, beforeAll } from 'vitest';
import { mountConfig, mountObjects, stubContainerLayout } from './helpers';

/**
 * A label is ringed in the canvas colour, not set on a box of it.
 *
 * Labels are HTML over the SVG, so whatever is behind a label's text is in front
 * of every curve, point and fill. It was a box in the canvas colour, and on the
 * PPC lesson that was a white tile on the shaded region behind `A` and `B`. The
 * halo that replaces it still clears a line from under the letters, which is
 * what the box was for, without covering anything else. See `haloOf` in
 * `view/viewObjects/label.ts`.
 */

beforeAll(() => stubContainerLayout(800, 400));

/** The div one Label draws into; see `updatables_contract.test.ts`. */
function labelDiv(c: HTMLElement, text: string): HTMLElement {
    return Array.from(c.querySelectorAll('div[class^="rootElement-"]'))
        .find(d => (d.textContent || '').indexOf(text) > -1) as HTMLElement;
}

describe('label halo', () => {

    it('a label has no box, and a halo in the canvas colour', () => {
        const r = mountObjects([{ Label: { name: 'note', text: 'hello', x: 5, y: 5, plainText: true } }]);
        const div = labelDiv(r.container, 'hello');

        expect(div.style.backgroundColor).toBe('');
        expect(div.style.textShadow).toContain('#FFFFFF');

        r.destroy();
    });

    it('the halo follows the canvas colour an author sets', () => {
        const r = mountConfig({
            schema: 'EconSchema',
            clearColor: '#FFF8E7',
            layout: { OneGraph: { graph: {
                xAxis: { title: 'x', min: 0, max: 30 }, yAxis: { title: 'y', min: 0, max: 30 },
                objects: [{ Label: { name: 'note', text: 'hello', x: 5, y: 5, plainText: true } }]
            } } }
        });

        expect(labelDiv(r.container, 'hello').style.textShadow).toContain('#FFF8E7');
        r.destroy();
    });

    it('a point label, which asks for bgcolor: null, has no box', () => {
        // The case `??` got wrong: null was taken as missing, and the point's
        // label was given the canvas-coloured box it had asked not to have.
        const r = mountObjects([{ Point: { name: 'a', coordinates: [10, 10], label: { text: 'A' } } }]);
        const div = labelDiv(r.container, 'A');

        expect(div.style.backgroundColor).toBe('');
        expect(div.style.textShadow).not.toBe('');

        r.destroy();
    });

    it('an author who sets bgcolor gets a box in it, and no halo', () => {
        const r = mountObjects([
            { Label: { name: 'boxed', text: 'boxed', x: 5, y: 5, plainText: true, bgcolor: 'yellow' } },
            { Label: { name: 'bare', text: 'bare', x: 5, y: 15, plainText: true, bgcolor: 'none' } }
        ]);
        const boxed = labelDiv(r.container, 'boxed'), bare = labelDiv(r.container, 'bare');

        expect(boxed.style.backgroundColor).toBe('yellow');
        expect(boxed.style.textShadow).toBe('');
        expect(bare.style.backgroundColor).toBe('');
        expect(bare.style.textShadow).not.toBe('');

        r.destroy();
    });
});

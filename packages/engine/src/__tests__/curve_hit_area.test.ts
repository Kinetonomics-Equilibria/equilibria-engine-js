import { describe, it, expect, beforeAll } from 'vitest';
import { mountConfig, stubContainerLayout } from './helpers';

/**
 * A draggable curve is hit through a wide, invisible stroke beside it, and
 * that stroke must stay invisible.
 *
 * Focus used to fill it yellow. A straight line closes on itself with no area,
 * so on every demand and supply curve that drew nothing and nobody saw it; a
 * bowed curve closes into a segment from one end to the other, and the first
 * production possibility curve turned solid yellow the moment a student
 * clicked it to drag. Asserted on the hit area's own style, since jsdom paints
 * nothing.
 */

beforeAll(() => stubContainerLayout());

const QUARTER_ELLIPSE = {
    type: 'Curve',
    def: {
        name: 'ppc',
        xFn: '100 * cos((t))', yFn: '200 * sin((t))', min: 0, max: 1.5707963267948966,
        color: 'colors.blue',
        drag: [{ directions: 'xy', param: 'h', expression: 'params.h + drag.dx' }]
    }
};

function build() {
    return mountConfig({
        schema: 'EconSchema',
        params: [{ name: 'h', value: 20, min: 10, max: 30, round: 1 }],
        layout: {
            OneGraph: {
                graph: {
                    xAxis: { title: 'x', min: 0, max: 160 },
                    yAxis: { title: 'y', min: 0, max: 320 },
                    objects: [QUARTER_ELLIPSE]
                }
            }
        }
    });
}

describe('a draggable curve\'s hit area', () => {

    it('is never filled, focused or not', () => {
        const r = build();
        try {
            const hit = r.container.querySelector('path[class^="dragPath-"]') as SVGPathElement;
            const path = r.container.querySelector('path[class^="path-"]') as SVGPathElement;
            expect(hit.style.fill).toBe('none');

            path.dispatchEvent(new FocusEvent('focus'));
            expect(hit.style.fill).toBe('none');

            path.dispatchEvent(new FocusEvent('blur'));
            expect(hit.style.fill).toBe('none');
        } finally {
            r.destroy();
        }
    });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mountConfig, stubContainerLayout } from './helpers';
import { readyForPicture } from '../ts/view/picture';

/**
 * A saved picture leaves the stylesheet behind for what is inside an `<svg>`,
 * so a diagram is got ready for one: its axes' styles written on them, its
 * handles hidden, and all of it put back after, on the page the student is
 * still looking at. What the picture itself comes out as is read from its
 * pixels in `apps/web/tests/share.spec.ts`.
 *
 * The rule here stands in for `kgjs-theme.css`, which jsdom is not given.
 */

let sheet: HTMLStyleElement;

beforeAll(() => {
    stubContainerLayout();
    sheet = document.createElement('style');
    sheet.textContent = '.kg-container g.axis path { stroke-width: 2px; } .kg-container g.axis { font-size: 14px; }';
    document.head.appendChild(sheet);
});

afterAll(() => sheet.remove());

const LOCKED = { name: 'locked', value: 0, min: 0, max: 1, round: 1 };

function build() {
    return mountConfig({
        schema: 'EconSchema',
        params: [{ name: 'a', value: 20, min: 10, max: 28, round: 0.1 }, LOCKED],
        layout: {
            OneGraph: {
                graph: {
                    xAxis: { title: 'Quantity', min: 0, max: 20 },
                    yAxis: { title: 'Price', min: 0, max: 20 },
                    objects: [
                        { type: 'Line', def: { name: 'demand', yIntercept: 'params.a', slope: -1, drag: [{ horizontal: 'a' }] } },
                        { type: 'Line', def: { name: 'frozen', yIntercept: 8, slope: 1, drag: [{ vertical: 'a', draggable: 'not(params.locked < 1)' }] } }
                    ]
                }
            }
        }
    });
}

const handles = (r: any) => Array.from(r.container.querySelectorAll('.kg-handle')) as SVGElement[];
const axisLine = (r: any) => r.container.querySelector('g.axis path.domain') as SVGElement;
const axis = (r: any) => r.container.querySelector('g.axis') as SVGElement;

describe('a diagram ready for a picture', () => {

    it('has what the stylesheet draws on its axes written on them', () => {
        const r = build();
        const putBack = readyForPicture(r.container);
        expect(axisLine(r).style.getPropertyValue('stroke-width')).toBe('2px');
        expect(axis(r).style.getPropertyValue('font-size')).toBe('14px');
        putBack();
        r.destroy();
    });

    it('has its handles hidden', () => {
        const r = build();
        const putBack = readyForPicture(r.container);
        expect(handles(r).length).toBe(2);
        expect(handles(r).map(handle => handle.style.display)).toEqual(['none', 'none']);
        putBack();
        r.destroy();
    });

    it('is put back as it was, a handle that was hidden already included', () => {
        const r = build();
        // The frozen curve's drag is off, so its handle is hidden going in.
        const before = handles(r).map(handle => handle.style.display);
        expect(before).toEqual(['', 'none']);

        readyForPicture(r.container)();

        expect(handles(r).map(handle => handle.style.display)).toEqual(before);
        expect(axisLine(r).style.getPropertyValue('stroke-width')).toBe('');
        expect(axis(r).style.getPropertyValue('font-size')).toBe('');
        r.destroy();
    });

    it('keeps what a redraw changed in the meantime', () => {
        const r = build();
        const putBack = readyForPicture(r.container);
        axisLine(r).style.setProperty('opacity', '0.5');
        putBack();
        expect(axisLine(r).style.getPropertyValue('opacity')).toBe('0.5');
        r.destroy();
    });
});

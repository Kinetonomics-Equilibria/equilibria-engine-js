import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { KineticGraph } from '../ts/kg';

// The view sizes itself from the container's clientWidth, which jsdom always
// reports as 0 because it never performs layout. Without a real width every
// scale maps to NaN, so stub in concrete dimensions before mounting.
const CONTAINER_WIDTH = 800;

beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {
        get() { return CONTAINER_WIDTH; },
        configurable: true
    });
    Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
        get() { return CONTAINER_WIDTH / 2; },
        configurable: true
    });
});

// Element ids are generated with Math.random(), so normalise them before
// snapshotting; otherwise the snapshot can never match on a second run.
function normalizeIds(html: string) {
    return html.replace(/KGID_[A-Za-z0-9]+/g, 'KGID_x');
}

describe('Snapshot Tests', () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    it('matches exact SVG output for basic line graph', () => {
        const config = {
            aspectRatio: 2,
            scales: [
                // axis/rangeMin/rangeMax are required by ScaleDefinition; without
                // them rangeMin * extent is NaN and every coordinate renders as NaN.
                { name: 'x', axis: 'x', domainMin: 0, domainMax: 10, rangeMin: 0.1, rangeMax: 0.9 },
                { name: 'y', axis: 'y', domainMin: 0, domainMax: 10, rangeMin: 0.9, rangeMax: 0.1 }
            ],
            layers: [
                [],
                [
                    {
                        type: 'Curve',
                        def: {
                            univariateFunction: {
                                fn: "2*x",
                                ind: "x"
                            },
                            xScaleName: 'x',
                            yScaleName: 'y',
                            stroke: "blue",
                            strokeWidth: 2
                        }
                    }
                ],
                [],
                []
            ]
        };

        const kg = new KineticGraph(config);
        kg.mount(container);

        const svg = container.querySelector('svg');
        expect(svg).not.toBeNull();

        const path = svg?.querySelector('path');
        expect(path).not.toBeNull();

        // Guard against the whole diagram silently degrading to NaN coordinates.
        const d = path?.getAttribute('d') ?? '';
        expect(d).not.toContain('NaN');

        expect(normalizeIds(container.innerHTML)).toMatchSnapshot();

        kg.destroy();
    });
});

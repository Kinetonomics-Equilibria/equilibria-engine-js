import { describe, it, expect, beforeAll } from 'vitest';
import { KineticGraph } from '../ts/kg';

// jsdom performs no layout, so clientWidth is 0 and every scale maps to NaN.
beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {
        get() { return 800; }, configurable: true
    });
    Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
        get() { return 400; }, configurable: true
    });
});

// Top-level `objects` are parsed as layout-scoped, so a bare Point has no graph
// to resolve its scales against and the view fails to build.
const failingConfig = {
    params: [{ name: 'price', value: 10 }],
    scales: [{ name: 'x', axis: 'x', domainMin: 0, domainMax: 20 }],
    objects: [{ type: 'Point', def: { x: '10', y: 'price' } }]
};

const workingConfig = {
    aspectRatio: 2,
    scales: [
        { name: 'x', axis: 'x', domainMin: 0, domainMax: 10, rangeMin: 0.1, rangeMax: 0.9 },
        { name: 'y', axis: 'y', domainMin: 0, domainMax: 10, rangeMin: 0.9, rangeMax: 0.1 }
    ],
    layers: [[], [{ type: 'Point', def: { x: '5', y: '5', xScaleName: 'x', yScaleName: 'y' } }], [], []]
};

function container() {
    const el = document.createElement('div');
    document.body.appendChild(el);
    return el;
}

describe('mount() error reporting', () => {
    // Regression: mount() used to emit 'error' unconditionally. eventemitter3 does
    // not throw on an unhandled 'error' event, so a caller that had not subscribed
    // was left with an empty container and nothing logged anywhere.
    it('throws when no error listener is attached', () => {
        const kg = new KineticGraph(failingConfig);
        expect(() => kg.mount(container())).toThrow();
    });

    it('emits instead of throwing when a listener is attached', () => {
        const kg = new KineticGraph(failingConfig);
        let received: any = null;
        kg.on('error', (err: any) => { received = err; });

        expect(() => kg.mount(container())).not.toThrow();
        expect(received).not.toBeNull();
    });

    it('leaves view null after a failed mount', () => {
        const kg = new KineticGraph(failingConfig);
        kg.on('error', () => { /* handled */ });
        kg.mount(container());

        expect(kg.view).toBeNull();
    });

    it('does not disturb a successful mount without a listener', () => {
        const kg = new KineticGraph(workingConfig);
        const el = container();

        expect(() => kg.mount(el)).not.toThrow();
        expect(kg.view).not.toBeNull();
        expect(el.querySelectorAll('circle').length).toBeGreaterThan(0);
        kg.destroy();
    });
});

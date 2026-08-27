import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Imported for its own sake, and to keep this file loadable. A `vi.mock`
// factory that reaches for the mocked module (through `importActual`, and
// through `engineMock`, which imports it too) deadlocks unless the test file
// itself pulls the mocked module in first: without this line the run hangs
// before a single test executes, with no error and no output. Removing it
// looks like a tidy-up and is not.
import { KG_CONTAINER_CLASS } from 'equilibria-engine-js';
import { Stage } from '../Stage';
import { FOCUS_PARAM, MODE_PARAM, MODE_VALUE } from '../arrangement';
import { engineControl, resetEngineMock, latestInstance } from './engineMock';

vi.mock('equilibria-engine-js', async () => {
    const actual = await vi.importActual<Record<string, unknown>>('equilibria-engine-js');
    const { FakeKineticGraph } = await import('./engineMock');
    return { ...actual, KineticGraph: FakeKineticGraph };
});

/**
 * The stage: one engine, chrome above it, promotion as a param change.
 *
 * The test that matters most is the lifecycle one. Promotion must not destroy
 * and recreate the engine — if it does, the whole "panels keep their identity
 * through the change" premise is gone and nobody notices until they look at a
 * transition in a browser. It is asserted on the mock's construct and destroy
 * counts, which is the only place that regression is visible from the outside.
 */

const KEYS = ['market', 'firm', 'cost'];

const config = () => ({
    schema: 'EconSchema',
    params: [{ name: 'price', value: 10 }],
    layout: {
        CustomLayout: {
            panels: KEYS.map(key => ({
                key: key,
                xAxis: { title: 'Q', min: 0, max: 10 },
                yAxis: { title: 'P', min: 0, max: 10 },
                objects: []
            }))
        }
    }
});

/** jsdom performs no layout, so the stage would measure 0x0 and place nothing. */
function stubStageSize(width = 900, height = 714) {
    Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {
        get() { return width }, configurable: true
    });
    Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
        get() { return height }, configurable: true
    });
}

/**
 * A resize is two things jsdom will not do by itself: the element reporting a
 * new size, and the observer saying so. The shared setup's ResizeObserver is an
 * inert stub, so this one records its callbacks and hands them back.
 */
const observers: ResizeObserverCallback[] = [];

function resizeStageTo(width: number, height: number) {
    stubStageSize(width, height);
    act(() => { observers.forEach(cb => cb([], null as unknown as ResizeObserver)) });
}

beforeEach(() => {
    resetEngineMock();
    stubStageSize();
    observers.length = 0;
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
        constructor(cb: ResizeObserverCallback) { observers.push(cb) }
        observe() { /* the test fires the callback itself */ }
        unobserve() { }
        disconnect() { }
    };
});

const chromeFor = (root: HTMLElement, key: string) =>
    root.querySelector(`[data-panel="${key}"]`) as HTMLElement;

const boxOf = (el: HTMLElement) => ({
    x: parseFloat(el.style.left), y: parseFloat(el.style.top),
    width: parseFloat(el.style.width), height: parseFloat(el.style.height)
});

const paramUpdates = () =>
    latestInstance().updates.flatMap((u: any) => u.params as { name: string; value: number }[]);

describe('what the stage hands the engine', () => {

    it('mounts exactly one engine for all the panels', () => {
        const { container } = render(<Stage config={config()} focused="market" />);

        expect(engineControl.instances).toHaveLength(1);
        // and into its own element, which carries the engine's container class
        // because React owns that attribute and would otherwise rewrite it away
        expect(latestInstance().container!.classList.contains(KG_CONTAINER_CLASS)).toBe(true);
        expect(container.querySelectorAll(`.${KG_CONTAINER_CLASS}`)).toHaveLength(1);
    });

    it('replaces every panel rect with an expression over the focus param', () => {
        render(<Stage config={config()} focused="market" />);
        const panels = (latestInstance().config as any).layout.CustomLayout.panels;

        panels.forEach((p: any) => {
            expect(typeof p.x).toBe('string');
            expect(p.x).toContain(`params.${FOCUS_PARAM}`);
        });
    });

    it('leaves the author\'s own keys alone', () => {
        render(<Stage config={config()} focused="market" />);
        const panels = (latestInstance().config as any).layout.CustomLayout.panels;

        expect(panels.map((p: any) => p.key)).toEqual(KEYS);
        expect(panels[0].xAxis).toEqual({ title: 'Q', min: 0, max: 10 });
        expect((latestInstance().config as any).params[0]).toEqual({ name: 'price', value: 10 });
    });

    it('declares the params the expressions read, alongside the author\'s', () => {
        render(<Stage config={config()} focused="market" />);
        const names = (latestInstance().config as any).params.map((p: any) => p.name);
        expect(names).toEqual(['price', FOCUS_PARAM, MODE_PARAM]);
    });

    it('does not mutate the config it was given', () => {
        const original = config();
        const before = JSON.stringify(original);
        render(<Stage config={original} focused="market" />);
        expect(JSON.stringify(original)).toBe(before);
    });

    it('leaves the levels to the engine, and an author\'s own density alone', () => {
        const withDensity: any = config();
        withDensity.layout.CustomLayout.panels[1].density = 'compact';
        render(<Stage config={withDensity} focused="market" />);

        const panels = (latestInstance().config as any).layout.CustomLayout.panels;
        expect(panels[0].density).toBe('auto');
        expect(panels[1].density).toBe('compact');
    });
});

describe('chrome', () => {

    it('renders one overlay per panel, positioned over it', () => {
        const { container } = render(
            <Stage config={config()} focused="market" renderChrome={p => <span>{p.key}</span>} />
        );

        KEYS.forEach(key => expect(chromeFor(container, key)).toBeTruthy());

        const focal = boxOf(chromeFor(container, 'market')),
            rail = boxOf(chromeFor(container, 'firm'));

        expect(focal.width).toBeGreaterThan(rail.width * 2);
        expect(rail.x).toBeGreaterThan(focal.x + focal.width);
    });

    it('tells the app which panel is focal', () => {
        // Collected as a set: chrome is re-rendered whenever the stage is, and
        // what is being asserted is which panel is ever called focal, not how
        // many times React asked.
        const focal = new Set<string>(), rail = new Set<string>();
        render(<Stage config={config()} focused="firm" renderChrome={p => {
            (p.focused ? focal : rail).add(p.key);
            return null;
        }} />);

        expect([...focal]).toEqual(['firm']);
        expect([...rail].sort()).toEqual(['cost', 'market']);
    });

    it('does not intercept pointer events except on its affordances', () => {
        const { getByTestId, container } = render(<Stage config={config()} focused="market" />);

        // The container is transparent, so a drag anywhere that is not a rail
        // panel reaches the diagram underneath.
        expect(getByTestId('stage-chrome').style.pointerEvents).toBe('none');
        expect(chromeFor(container, 'market').style.pointerEvents).toBe('');
        expect(chromeFor(container, 'firm').style.pointerEvents).toBe('auto');
    });

    it('gives the focal panel no button, so a drag is not swallowed', () => {
        const { container } = render(<Stage config={config()} focused="market" />);
        expect(chromeFor(container, 'market').tagName).toBe('DIV');
        expect(chromeFor(container, 'firm').tagName).toBe('BUTTON');
    });

    it('renders nothing of its own when the app supplies no chrome', () => {
        const { container } = render(<Stage config={config()} focused="market" />);
        expect(chromeFor(container, 'firm').textContent).toBe('');
    });
});

describe('promotion', () => {

    it('calls onPromote with the key that was clicked', () => {
        const onPromote = vi.fn();
        const { container } = render(<Stage config={config()} focused="market" onPromote={onPromote} />);

        fireEvent.click(chromeFor(container, 'cost'));
        expect(onPromote).toHaveBeenCalledWith('cost');
    });

    it('promotes from the keyboard, on Enter and on Space', async () => {
        const user = userEvent.setup();
        const onPromote = vi.fn();
        const { container } = render(<Stage config={config()} focused="market" onPromote={onPromote} />);

        (chromeFor(container, 'firm') as HTMLButtonElement).focus();
        await user.keyboard('{Enter}');
        await user.keyboard(' ');

        expect(onPromote.mock.calls).toEqual([['firm'], ['firm']]);
    });

    it('reaches the rail panels by tabbing, and not the focal one', async () => {
        const user = userEvent.setup();
        const { container } = render(<Stage config={config()} focused="market" />);

        await user.tab();
        expect(document.activeElement).toBe(chromeFor(container, 'firm'));
        await user.tab();
        expect(document.activeElement).toBe(chromeFor(container, 'cost'));
    });

    it('names the control for a screen reader, and lets the app say it better', () => {
        const { container } = render(
            <Stage config={config()} focused="market" promoteLabel={k => `Bring ${k} to the front`} />
        );
        expect(chromeFor(container, 'firm').getAttribute('aria-label')).toBe('Bring firm to the front');

        const plain = render(<Stage config={config()} focused="market" />);
        expect(chromeFor(plain.container, 'firm').getAttribute('aria-label')).toBe('Show firm');
    });
});

describe('promotion does not rebuild the diagram', () => {

    it('changes a param instead of remounting', () => {
        const cfg = config();
        const { rerender } = render(<Stage config={cfg} focused="market" />);
        const engine = latestInstance();

        rerender(<Stage config={cfg} focused="cost" />);

        expect(engineControl.instances).toHaveLength(1);
        expect(engine.destroyed).toBe(false);
        expect(paramUpdates()).toContainEqual({ name: FOCUS_PARAM, value: 2 });
    });

    it('sends only the param that moved', () => {
        const cfg = config();
        const { rerender } = render(<Stage config={cfg} focused="market" />);
        latestInstance().updates.length = 0;

        rerender(<Stage config={cfg} focused="firm" />);

        expect(paramUpdates()).toEqual([{ name: FOCUS_PARAM, value: 1 }]);
    });

    it('toggles the mode the same way', () => {
        const cfg = config();
        const { rerender } = render(<Stage config={cfg} focused="market" />);
        latestInstance().updates.length = 0;

        rerender(<Stage config={cfg} focused="market" mode="grid" />);

        expect(engineControl.instances).toHaveLength(1);
        expect(paramUpdates()).toEqual([{ name: MODE_PARAM, value: MODE_VALUE.grid }]);
    });

    it('moves the chrome with the panels', () => {
        const cfg = config();
        const { container, rerender } = render(<Stage config={cfg} focused="market" />);
        const focalBox = boxOf(chromeFor(container, 'market'));

        rerender(<Stage config={cfg} focused="firm" />);

        expect(boxOf(chromeFor(container, 'firm'))).toEqual(focalBox);
    });

    it('starts at the focused panel the app asked for, not at the first', () => {
        render(<Stage config={config()} focused="cost" />);
        expect(paramUpdates()).toContainEqual({ name: FOCUS_PARAM, value: 2 });
    });

    it('re-applies the focus after a rebuild, since a new engine starts at zero', () => {
        const { rerender } = render(<Stage config={config()} focused="cost" />);
        expect(engineControl.instances).toHaveLength(1);

        // A new config object is a shape change, which is the one thing that
        // does cost a rebuild.
        rerender(<Stage config={config()} focused="cost" />);

        expect(engineControl.instances).toHaveLength(2);
        expect(paramUpdates()).toContainEqual({ name: FOCUS_PARAM, value: 2 });
    });
});

describe('when the stage cannot do as it is told', () => {

    it('says so when the config is not a stage config', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => { });
        render(<Stage config={{ layout: { OneGraph: { graph: {} } } }} />);

        expect(warn.mock.calls.flat().join(' ')).toContain('CustomLayout');
        expect(engineControl.instances).toHaveLength(0);
        warn.mockRestore();
    });

    it('reports a failed mount rather than rendering an error of its own', () => {
        engineControl.mountFailure = new Error('bad config');
        const onError = vi.fn();
        const { container } = render(<Stage config={config()} onError={onError} />);

        expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'bad config' }));
        expect(container.textContent).toBe('');
    });

    it('mounts nothing until it knows its own size', () => {
        stubStageSize(0, 0);
        render(<Stage config={config()} />);
        expect(engineControl.instances).toHaveLength(0);
    });
});

describe('resize', () => {

    it('does not rebuild when the stage scales proportionally', () => {
        render(<Stage config={config()} focused="market" />);
        expect(engineControl.instances).toHaveLength(1);

        // Same shape, a third larger, and still wide enough for a rail.
        // `arrange` is scale-free, so every fraction still holds: the canvas
        // scales and there is nothing to recompute.
        resizeStageTo(1200, 952);

        expect(engineControl.instances).toHaveLength(1);
    });

    it('does not rebuild for a change too small to matter', () => {
        render(<Stage config={config()} focused="market" />);
        resizeStageTo(900, 712);
        expect(engineControl.instances).toHaveLength(1);
    });

    it('rebuilds when the stage changes proportions', () => {
        render(<Stage config={config()} focused="market" />);

        resizeStageTo(1000, 500);

        expect(engineControl.instances).toHaveLength(2);
    });

    it('moves the chrome with the canvas as it scales', () => {
        const { container } = render(<Stage config={config()} focused="market" />);
        const before = boxOf(chromeFor(container, 'market'));

        resizeStageTo(1800, 1428);

        const after = boxOf(chromeFor(container, 'market'));
        expect(after.width).toBeCloseTo(before.width * 2, 4);
        expect(after.x).toBeCloseTo(before.x * 2, 4);
    });

    it('rebuilds when the rail has to become a filmstrip', () => {
        render(<Stage config={config()} focused="market" />);

        // Same shape, but now too narrow for a rail beside the focal panel.
        resizeStageTo(700, 555);

        expect(engineControl.instances).toHaveLength(2);
    });
});

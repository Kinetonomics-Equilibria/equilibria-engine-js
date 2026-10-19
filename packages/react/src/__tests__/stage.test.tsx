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
import {
    arrange, pixelBox, rectParamName, FOCUS_PARAM, FURNITURE, MODE_PARAM, MODE_VALUE, REVEALED_PARAM
} from '../arrangement';
import { engineControl, resetEngineMock, latestInstance } from './engineMock';

vi.mock('equilibria-engine-js', async () => {
    const actual = await vi.importActual<Record<string, unknown>>('equilibria-engine-js');
    const { FakeKineticGraph } = await import('./engineMock');
    return { ...actual, KineticGraph: FakeKineticGraph };
});

/**
 * The stage: one engine, chrome above it, every arrangement a param change.
 *
 * The tests that matter most are the lifecycle ones. Neither a promotion nor a
 * resize may destroy and recreate the engine — a promotion because the whole
 * "panels keep their identity through the change" premise goes with it, and a
 * resize because a new engine is a new model, and a new model has forgotten the
 * student's last move: the ghost, the deltas and the sentence describing it.
 * Both are asserted on the mock's construct and destroy counts, which is the
 * only place that regression is visible from the outside.
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

/** Every state write the stage made, which should be none: the arrangement is not state. */
const paramUpdates = () =>
    latestInstance().updates.flatMap((u: any) => u.params as { name: string; value: number }[]);

/** Every presentation param the stage has laid the engine out with, in order. */
const laidOut = () =>
    latestInstance().relayouts.flatMap(r => r.params || []);

/** What the stage built the engine with, by name. */
const declared = (name: string) =>
    ((latestInstance().config as any).params as { name: string; value: number }[])
        .filter(p => p.name === name)[0];

const rectNames = (index: number) =>
    (['x', 'y', 'width', 'height'] as const).map(prop => rectParamName(index, prop));

describe('what the stage hands the engine', () => {

    it('mounts exactly one engine for all the panels', () => {
        const { container } = render(<Stage config={config()} focused="market" />);

        expect(engineControl.instances).toHaveLength(1);
        // and into its own element, which carries the engine's container class
        // because React owns that attribute and would otherwise rewrite it away
        expect(latestInstance().container!.classList.contains(KG_CONTAINER_CLASS)).toBe(true);
        expect(container.querySelectorAll(`.${KG_CONTAINER_CLASS}`)).toHaveLength(1);
    });

    it('gives every panel rect four params of its own', () => {
        render(<Stage config={config()} focused="market" />);
        const panels = (latestInstance().config as any).layout.CustomLayout.panels;

        panels.forEach((p: any, i: number) => {
            expect([p.x, p.y, p.width, p.height]).toEqual(rectNames(i).map(n => `params.${n}`));
        });
    });

    it('leaves the author\'s own keys alone', () => {
        render(<Stage config={config()} focused="market" />);
        const panels = (latestInstance().config as any).layout.CustomLayout.panels;

        expect(panels.map((p: any) => p.key)).toEqual(KEYS);
        expect(panels[0].xAxis).toEqual({ title: 'Q', min: 0, max: 10 });
        expect((latestInstance().config as any).params[0]).toEqual({ name: 'price', value: 10 });
    });

    it('declares the params the rects read, alongside the author\'s', () => {
        render(<Stage config={config()} focused="market" />);
        const names = (latestInstance().config as any).params.map((p: any) => p.name);
        expect(names).toEqual([
            'price', FOCUS_PARAM, MODE_PARAM, REVEALED_PARAM, ...rectNames(0), ...rectNames(1), ...rectNames(2)
        ]);
    });

    // So the engine's first frame is already the stage the student sees, and
    // there is nothing to correct before it is painted.
    it('builds the engine at the arrangement as it stands, and has nothing to send', () => {
        const { container } = render(<Stage config={config()} focused="cost" />);
        const focal = boxOf(chromeFor(container, 'cost'));
        const canvas = 900;   // the stubbed stage width

        expect(declared(FOCUS_PARAM).value).toBe(2);
        const [x, , width] = rectNames(2).map(n => declared(n).value);
        expect(x * canvas).toBeCloseTo(focal.x, 6);
        expect(width * canvas).toBeCloseTo(focal.width, 6);
        expect(latestInstance().relayouts).toEqual([]);
    });

    it('does not mutate the config it was given', () => {
        const original = config();
        const before = JSON.stringify(original);
        render(<Stage config={original} focused="market" />);
        expect(JSON.stringify(original)).toBe(before);
    });

    it('builds each panel at its role\'s level, and leaves an author\'s own density alone', () => {
        const withDensity: any = config();
        withDensity.layout.CustomLayout.panels[1].density = 'compact';
        render(<Stage config={withDensity} focused="market" />);

        const panels = (latestInstance().config as any).layout.CustomLayout.panels;
        expect(panels.map((p: any) => p.density)).toEqual(['full', 'compact', 'indicator']);
    });

    it('never moves the level of a panel whose author set one', () => {
        const withDensity: any = config();
        withDensity.layout.CustomLayout.panels[1].density = 'compact';
        const { rerender } = render(<Stage config={withDensity} focused="market" />);
        rerender(<Stage config={withDensity} focused="firm" />);

        expect(laidOut().map(p => p.name)).toContain(FOCUS_PARAM);
        expect(laidOut().map(p => p.name)).not.toContain('density_firm');
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

    it('tells the app what each panel is, so it knows where its chrome can go', () => {
        const roles: { [key: string]: string } = {};
        render(<Stage config={config()} focused="market" renderChrome={p => {
            roles[p.key] = p.role;
            return null;
        }} />);

        expect(roles).toEqual({ market: 'focal', firm: 'rail', cost: 'rail' });
    });
});

/**
 * The grid, where every panel is read and worked on.
 *
 * It used to lay a promote button across every panel, which is the rail's
 * affordance and the wrong one here: a student who switched to the grid to
 * compare the panels could not drag a curve in any of them, and clicking one
 * promoted it in a mode that ignores which panel is focal.
 */
describe('grid', () => {

    it('lays no control across a panel, so a drag reaches the diagram', () => {
        const { container } = render(<Stage config={config()} focused="market" mode="grid" />);

        KEYS.forEach(key => {
            expect(chromeFor(container, key).tagName).toBe('DIV');
            expect(chromeFor(container, key).style.pointerEvents).toBe('');
            expect(chromeFor(container, key).getAttribute('data-role')).toBe('grid');
        });
        expect(container.querySelectorAll('button')).toHaveLength(0);
    });

    it('hands each panel\'s chrome a way to promote it instead', () => {
        const onPromote = vi.fn();
        const { getByText } = render(
            <Stage config={config()} focused="market" mode="grid" onPromote={onPromote}
                renderChrome={p => (p.promote ? <button onClick={p.promote}>{p.key}</button> : null)} />
        );

        fireEvent.click(getByText('cost'));
        expect(onPromote).toHaveBeenCalledWith('cost');
    });

    it('offers the focal panel no promotion, in either mode', () => {
        const promotable = new Set<string>();
        render(<Stage config={config()} focused="market" renderChrome={p => {
            if (p.promote) promotable.add(p.key);
            return null;
        }} />);

        expect([...promotable]).toEqual([]);
    });

    // The early steps of a lesson, with the grid toggled on: one panel, and a
    // button across the whole of it would leave nothing on the stage to drag.
    it('treats a lone panel as focal, so it stays workable', () => {
        const { container } = render(
            <Stage config={config()} focused="market" mode="grid" revealed={['market']} />
        );

        expect(chromeFor(container, 'market').tagName).toBe('DIV');
        expect(chromeFor(container, 'market').getAttribute('data-focused')).toBe('true');
    });
});

describe('room for chrome', () => {

    it('keeps the room the app asks for clear above the focal panel', () => {
        const plain = render(<Stage config={config()} focused="market" />);
        const without = boxOf(chromeFor(plain.container, 'market'));
        plain.unmount();

        const roomy = render(<Stage config={config()} focused="market" chromeRoom={{ focal: { top: 60 } }} />);
        const withRoom = boxOf(chromeFor(roomy.container, 'market'));

        expect(withRoom.y).toBeGreaterThanOrEqual(60);
        expect(withRoom.width).toBeLessThan(without.width);
    });

    it('does not rebuild for a room written as a new but equal object', () => {
        const cfg = config();
        const { rerender } = render(<Stage config={cfg} focused="market" chromeRoom={{ focal: { top: 28 } }} />);
        rerender(<Stage config={cfg} focused="market" chromeRoom={{ focal: { top: 28 } }} />);

        expect(engineControl.instances).toHaveLength(1);
    });

    // Every fraction moves with the room, which used to mean a new config and
    // so a new engine. It is a new arrangement now, and nothing more.
    it('moves the panels when the room changes, without rebuilding', () => {
        const cfg = config();
        const { container, rerender } = render(
            <Stage config={cfg} focused="market" chromeRoom={{ focal: { top: 28 } }} />
        );
        rerender(<Stage config={cfg} focused="market" chromeRoom={{ focal: { top: 40 } }} />);

        expect(engineControl.instances).toHaveLength(1);
        expect(laidOut().map(p => p.name)).toContain(rectParamName(0, 'y'));
        expect(boxOf(chromeFor(container, 'market')).y).toBeGreaterThanOrEqual(40);
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

    it('lays the same engine out again instead of remounting', () => {
        const cfg = config();
        const { rerender } = render(<Stage config={cfg} focused="market" />);
        const engine = latestInstance();

        rerender(<Stage config={cfg} focused="cost" />);

        expect(engineControl.instances).toHaveLength(1);
        expect(engine.destroyed).toBe(false);
        expect(laidOut()).toContainEqual({ name: FOCUS_PARAM, value: 2 });
    });

    // The focus, the rects of the two panels that traded places and their
    // levels — in one relayout, so the promoted panel never draws a frame at
    // its new size with its old furniture. `cost` stayed where it was, a
    // glyph, and is not mentioned; and the box did not change, so neither is
    // the shape.
    it('sends only what moved', () => {
        const cfg = config();
        const { rerender } = render(<Stage config={cfg} focused="market" />);

        rerender(<Stage config={cfg} focused="firm" />);

        expect(latestInstance().relayouts).toHaveLength(1);
        expect(latestInstance().relayouts[0].aspectRatio).toBeUndefined();
        expect(laidOut().map(p => p.name)).toEqual([
            FOCUS_PARAM, ...rectNames(0), ...rectNames(1), 'density_market', 'density_firm'
        ]);
        expect(laidOut().slice(-2)).toEqual([
            { name: 'density_market', value: 2 },
            { name: 'density_firm', value: 0 }
        ]);
    });

    it('toggles the mode the same way', () => {
        const cfg = config();
        const { rerender } = render(<Stage config={cfg} focused="market" />);

        rerender(<Stage config={cfg} focused="market" mode="grid" />);

        expect(engineControl.instances).toHaveLength(1);
        const names = laidOut().map(p => p.name);
        expect(names[0]).toBe(MODE_PARAM);
        expect(names).not.toContain(FOCUS_PARAM);
        expect(names.slice(1).every(n => n.indexOf('stage') === 0 || n.indexOf('density_') === 0)).toBe(true);
    });

    // The arrangement is how the diagram is shown, not what the student did
    // to it. An `update` is the road state takes, and it is the road a ghost
    // and a delta are measured along.
    it('never writes the arrangement as state', () => {
        const cfg = config();
        const { rerender } = render(<Stage config={cfg} focused="market" revealed={['market']} />);
        rerender(<Stage config={cfg} focused="firm" revealed={KEYS} mode="grid" />);
        resizeStageTo(700, 555);

        expect(latestInstance().relayouts.length).toBeGreaterThan(0);
        expect(paramUpdates()).toEqual([]);
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
        expect(declared(FOCUS_PARAM).value).toBe(2);
    });

    // A new config is the one thing that still costs a new engine, and the
    // new one starts where the stage is rather than where the first one did.
    it('builds a new config at the focus as it stands, since that is still a rebuild', () => {
        const { rerender } = render(<Stage config={config()} focused="market" />);
        rerender(<Stage config={config()} focused="cost" />);

        expect(engineControl.instances).toHaveLength(2);
        expect(declared(FOCUS_PARAM).value).toBe(2);
    });
});

/**
 * A panel arriving mid-lesson (P10).
 *
 * Two claims, and the second is the one that took work: the panels that have
 * not arrived neither hold space nor offer a control, and getting them out of
 * the way costs a param rather than a rebuild.
 */
describe('a staged reveal', () => {

    it('arranges only the panels that have arrived', () => {
        const { container } = render(
            <Stage config={config()} focused="market" revealed={['market']}
                renderChrome={p => <span>{p.key}</span>} />
        );

        // One panel, so it gets the whole stage rather than a focal square with
        // a rail of empty slots beside it.
        const focal = boxOf(chromeFor(container, 'market'));
        expect(focal.width).toBeGreaterThan(600);
    });

    // A promote button over a blank square is worse than no button: it is
    // focusable, it is named after a panel the student has not met, and
    // pressing it promotes nothing.
    it('renders no chrome and no control for a panel that has not arrived', () => {
        const { container } = render(
            <Stage config={config()} focused="market" revealed={['market', 'firm']}
                renderChrome={p => <span>{p.key}</span>} />
        );

        expect(chromeFor(container, 'firm')).toBeTruthy();
        expect(chromeFor(container, 'cost')).toBeNull();
        expect(container.querySelectorAll('button')).toHaveLength(1);
    });

    it('reveals by laying the engine out again, not by rebuilding', () => {
        const cfg = config();
        const { rerender } = render(<Stage config={cfg} focused="market" revealed={['market']} />);
        const engine = latestInstance();

        rerender(<Stage config={cfg} focused="market" revealed={['market', 'firm']} />);

        expect(engineControl.instances).toHaveLength(1);
        expect(engine.destroyed).toBe(false);
        expect(engine.relayouts).toHaveLength(1);
        expect(laidOut()).toContainEqual({ name: REVEALED_PARAM, value: 2 });
        // The panel that arrived leaves the focal box it was parked on for a
        // rail slot of its own, and the focal panel gives up the rail's width.
        const names = laidOut().map(p => p.name);
        rectNames(0).concat(rectNames(1)).forEach(n => expect(names).toContain(n));
    });

    it('says every panel has arrived when the app does not mention it', () => {
        render(<Stage config={config()} focused="market" />);
        expect(declared(REVEALED_PARAM).value).toBe(KEYS.length);
    });

    // The focal key may be a panel the lesson has not reached — an app that
    // leaves `focused` alone while stepping back through a build-up. `arrange`
    // resolves that to the first panel that has arrived, and the chrome has to
    // read the same answer or two panels claim the same square.
    it('falls back to an arrived panel when the focal one has not arrived', () => {
        const focal = new Set<string>();
        render(
            <Stage config={config()} focused="cost" revealed={['market']}
                renderChrome={p => { if (p.focused) focal.add(p.key); return null }} />
        );
        expect([...focal]).toEqual(['market']);
    });

    // Panels arrive in declared order, because one count is the whole state.
    // A set with a gap has to resolve to something, and resolving it silently
    // is how the chrome and the diagram come to disagree.
    it('warns and fills the gap when panels are revealed out of order', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => { });
        const { container } = render(
            <Stage config={config()} focused="market" revealed={['market', 'cost']}
                renderChrome={p => <span>{p.key}</span>} />
        );

        expect(warn.mock.calls.some(c => String(c[0]).includes('arrive in the order'))).toBe(true);
        expect(chromeFor(container, 'firm')).toBeTruthy();
        warn.mockRestore();
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

/**
 * A change of size or shape, which used to be the one thing that rebuilt the
 * diagram — any resize that moved the proportions by a hundredth, the dock
 * turning into a sheet, a question row arriving under the stage — and with it
 * the student's last move. It is a relayout now: a new aspect ratio and new
 * rects for the same engine.
 */
describe('resize', () => {

    it('does not rebuild when the stage scales proportionally', () => {
        render(<Stage config={config()} focused="market" />);
        expect(engineControl.instances).toHaveLength(1);

        // Same shape, a third larger, and still wide enough for a rail.
        resizeStageTo(1200, 952);

        expect(engineControl.instances).toHaveLength(1);
    });

    it('does not rebuild when the stage changes proportions, and tells the engine its new shape', () => {
        render(<Stage config={config()} focused="market" />);
        const engine = latestInstance();

        resizeStageTo(1000, 500);

        expect(engineControl.instances).toHaveLength(1);
        expect(engine.destroyed).toBe(false);
        const last = engine.relayouts[engine.relayouts.length - 1];
        expect(last.aspectRatio).toBe(2);
        expect(last.params!.map(p => p.name)).toContain(rectNames(0)[2]);
    });

    it('turns the rail into a filmstrip without rebuilding', () => {
        const { container } = render(<Stage config={config()} focused="market" />);

        // Same shape, but now too narrow for a rail beside the focal panel.
        resizeStageTo(700, 555);

        expect(engineControl.instances).toHaveLength(1);
        expect(chromeFor(container, 'firm').getAttribute('data-role')).toBe('strip');
    });

    // A box that grows keeps the same shape and still moves every rect a
    // little, because the room for the axes and the captions is pixels. The
    // engine is told to measure itself in the same redraw.
    it('sends the shape whenever the box changes, so the engine re-measures in the same redraw', () => {
        render(<Stage config={config()} focused="market" />);
        resizeStageTo(1800, 1428);

        const last = latestInstance().relayouts[latestInstance().relayouts.length - 1];
        expect(last.aspectRatio).toBeCloseTo(1800 / 1428, 9);
    });

    /**
     * The room is pixels, so a stage twice the size keeps the same room — the
     * arrangement is made at the box as it is *now*, every time.
     *
     * It used to be made at the width the stage had when its shape last
     * changed, and scaled from there, because a new arrangement was a new
     * engine. So a stage that grew kept proportionally more room than its axes
     * needed, and one that shrank kept less.
     */
    it('places the chrome at the box measured now, with room in pixels', () => {
        const { container } = render(<Stage config={config()} focused="market" />);

        resizeStageTo(1800, 1428);

        const now = arrange({ width: 1800, height: 1428, panels: KEYS, focused: 'market', furniture: FURNITURE });
        const expected = pixelBox(now, 'market', 1800)!;
        const after = boxOf(chromeFor(container, 'market'));
        expect(after.x).toBeCloseTo(expected.x, 6);
        expect(after.width).toBeCloseTo(expected.width, 6);
    });

    // Hidden is not gone. A stage whose box collapses has nothing to arrange,
    // but its engine still holds everything the student did.
    it('keeps the engine while the stage has no area, and lays it out again when it has one', () => {
        const { container } = render(<Stage config={config()} focused="market" />);
        const engine = latestInstance();

        resizeStageTo(0, 0);
        expect(engine.destroyed).toBe(false);
        expect(chromeFor(container, 'market')).toBeNull();

        resizeStageTo(1000, 500);
        expect(engineControl.instances).toHaveLength(1);
        expect(chromeFor(container, 'market')).toBeTruthy();
        expect(engine.relayouts[engine.relayouts.length - 1].aspectRatio).toBe(2);
    });

    /**
     * The observer's callback and the engine's own both run after layout and
     * before paint, and the engine's redraws the canvas at its new width — at
     * its old proportions — straight away. If the stage's half waited for
     * React's scheduler, a frame would be painted with the diagram at one shape
     * and the captions at another. So by the time the callback returns, the
     * engine has been told.
     */
    it('lays the engine out before the resize callback returns', () => {
        render(<Stage config={config()} focused="market" />);
        const engine = latestInstance();
        const before = engine.relayouts.length;

        // Deliberately outside `act`, which would flush the render for us and
        // hide whether the stage flushes it itself. React says so, loudly.
        const quiet = vi.spyOn(console, 'error').mockImplementation(() => { });
        stubStageSize(1000, 500);
        observers.forEach(cb => cb([], null as unknown as ResizeObserver));
        const after = engine.relayouts.length;
        quiet.mockRestore();

        expect(after).toBe(before + 1);
    });
});

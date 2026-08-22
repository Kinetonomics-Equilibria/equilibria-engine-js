/**
 * A stand-in for `KineticGraph` that mirrors the parts of the engine contract
 * the React bindings depend on, without pulling d3/mathjs/katex or requiring a
 * layout engine that jsdom does not have.
 *
 * The behaviour that matters most here is failure reporting. The real
 * `KineticGraph.mount()` does **not** throw when building the view fails: it
 * catches internally and hands the error to `reportFailure()`, which emits an
 * 'error' event synchronously if anything is listening and only re-throws when
 * nothing is. `useEquilibria` always attaches an 'error' listener before
 * mounting, so in practice a failed mount returns normally. The mock reproduces
 * that exactly — tests that assume `mount()` throws would not catch the bugs
 * this package actually has.
 */

type Listener = (...args: unknown[]) => void;

/** Knobs for steering the fake engine, reset between tests via `resetEngineMock()`. */
export const engineControl = {
    /** Every instance constructed since the last reset, in creation order. */
    instances: [] as FakeKineticGraph[],

    /** When set, `mount()` reports this failure instead of succeeding. */
    mountFailure: null as unknown,

    /** When set, the constructor throws this instead of returning an instance. */
    constructFailure: null as unknown,

    /** When set, `destroy()` throws this — the hook is expected to swallow it. */
    destroyFailure: null as unknown
};

export function resetEngineMock() {
    engineControl.instances = [];
    engineControl.mountFailure = null;
    engineControl.constructFailure = null;
    engineControl.destroyFailure = null;
}

/** The most recently constructed instance. Throws if there isn't one. */
export function latestInstance(): FakeKineticGraph {
    const instance = engineControl.instances[engineControl.instances.length - 1];
    if (!instance) {
        throw new Error('No FakeKineticGraph has been constructed');
    }
    return instance;
}

export class FakeKineticGraph {
    readonly config: unknown;
    readonly options: unknown;

    container: HTMLElement | null = null;
    mountCount = 0;
    destroyCount = 0;

    /** Configs passed to `update()`, in call order. */
    readonly updates: unknown[] = [];

    private readonly listeners = new Map<string, Listener[]>();

    constructor(config: unknown, options?: unknown) {
        if (engineControl.constructFailure) {
            throw engineControl.constructFailure;
        }
        this.config = config;
        this.options = options;
        engineControl.instances.push(this);
    }

    on(event: string, fn: Listener) {
        const existing = this.listeners.get(event);
        if (existing) {
            existing.push(fn);
        } else {
            this.listeners.set(event, [fn]);
        }
        return this;
    }

    listenerCount(event: string) {
        return this.listeners.get(event)?.length ?? 0;
    }

    emit(event: string, ...args: unknown[]) {
        const fns = this.listeners.get(event);
        if (!fns || fns.length === 0) return false;
        // Copy first: a listener may detach during dispatch.
        fns.slice().forEach((fn) => fn(...args));
        return true;
    }

    mount(containerElement: HTMLElement) {
        this.container = containerElement;
        this.mountCount++;

        if (engineControl.mountFailure) {
            // Mirrors KineticGraph.reportFailure().
            if (this.listenerCount('error') > 0) {
                this.emit('error', engineControl.mountFailure);
                return;
            }
            throw engineControl.mountFailure;
        }
    }

    update(newConfig: unknown) {
        this.updates.push(newConfig);
    }

    destroy() {
        this.destroyCount++;
        this.container = null;
        this.listeners.clear();
        if (engineControl.destroyFailure) {
            throw engineControl.destroyFailure;
        }
    }

    /** True once `destroy()` has been called at least once. */
    get destroyed() {
        return this.destroyCount > 0;
    }
}

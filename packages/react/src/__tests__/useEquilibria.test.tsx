import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { KG_EVENTS } from 'equilibria-engine-js';
import { useEquilibria } from '../useEquilibria';
import type { UseEquilibriaEventCallbacks, UseEquilibriaOptions, UseEquilibriaReturn } from '../useEquilibria';
import { engineControl, resetEngineMock, latestInstance } from './engineMock';

vi.mock('equilibria-engine-js', async () => {
    const actual = await vi.importActual<Record<string, unknown>>('equilibria-engine-js');
    const { FakeKineticGraph } = await import('./engineMock');
    // Keep the real KG_EVENTS so these tests fail if the engine renames an event.
    return { ...actual, KineticGraph: FakeKineticGraph };
});

interface HarnessProps {
    config: Record<string, unknown>;
    options?: UseEquilibriaOptions;
    callbacks?: UseEquilibriaEventCallbacks;
}

/**
 * `renderHook` alone is not enough here: the hook only mounts the engine once
 * its ref is attached to a real element, so the harness has to render one.
 */
function renderUseEquilibria(props: HarnessProps) {
    const hook = { current: null as unknown as UseEquilibriaReturn };

    function Harness({ config, options, callbacks }: HarnessProps) {
        const value = useEquilibria(config, options, callbacks);
        hook.current = value;
        return <div data-testid="container" ref={value.containerRef} />;
    }

    const utils = render(<Harness {...props} />);

    return {
        hook,
        ...utils,
        rerenderWith: (next: HarnessProps) => utils.rerender(<Harness {...next} />)
    };
}

const config = { params: [{ name: 'price', value: 10 }] };

beforeEach(() => {
    resetEngineMock();
});

describe('useEquilibria', () => {
    describe('successful mount', () => {
        it('constructs the engine with the config and options and mounts it into the ref', () => {
            const options = { legacyUrlOverrides: true };
            const { getByTestId } = renderUseEquilibria({ config, options });

            expect(engineControl.instances).toHaveLength(1);
            const instance = latestInstance();
            expect(instance.config).toBe(config);
            expect(instance.options).toBe(options);
            expect(instance.mountCount).toBe(1);
            expect(instance.container).toBe(getByTestId('container'));
        });

        it('reports ready with no error', () => {
            const { hook } = renderUseEquilibria({ config });

            expect(hook.current.isReady).toBe(true);
            expect(hook.current.error).toBeNull();
            expect(hook.current.instance).toBe(latestInstance());
        });

        it('destroys the engine on unmount', () => {
            const { unmount } = renderUseEquilibria({ config });
            const instance = latestInstance();

            expect(instance.destroyed).toBe(false);
            unmount();

            expect(instance.destroyCount).toBe(1);
            expect(instance.container).toBeNull();
        });

        it('swallows errors thrown by destroy() during cleanup', () => {
            const { unmount } = renderUseEquilibria({ config });
            engineControl.destroyFailure = new Error('teardown blew up');

            expect(() => unmount()).not.toThrow();
        });
    });

    describe('failed mount', () => {
        // Regression: KineticGraph.mount() reports build failures by emitting
        // 'error' synchronously rather than throwing, so the assignments that
        // follow `kg.mount(el)` still run. Readiness used to be stored state set
        // to `true` on that line, which clobbered the failure that had just been
        // recorded — every failed mount reported itself as ready.
        it('does not report ready when the engine emits an error during mount', () => {
            engineControl.mountFailure = new Error('view failed to build');

            const { hook } = renderUseEquilibria({ config });

            expect(hook.current.error).toBeInstanceOf(Error);
            expect(hook.current.error?.message).toBe('view failed to build');
            expect(hook.current.isReady).toBe(false);
        });

        it('does not report ready when the engine constructor throws', () => {
            engineControl.constructFailure = new Error('bad config');

            const { hook } = renderUseEquilibria({ config });

            expect(hook.current.error?.message).toBe('bad config');
            expect(hook.current.isReady).toBe(false);
            expect(hook.current.instance).toBeNull();
        });

        it('wraps non-Error failures so consumers always get an Error', () => {
            engineControl.mountFailure = 'just a string';

            const { hook } = renderUseEquilibria({ config });

            expect(hook.current.error).toBeInstanceOf(Error);
            expect(hook.current.error?.message).toBe('just a string');
        });

        it('still tracks the failed instance so it is destroyed on unmount', () => {
            engineControl.mountFailure = new Error('view failed to build');

            const { unmount } = renderUseEquilibria({ config });
            const instance = latestInstance();

            unmount();
            expect(instance.destroyCount).toBe(1);
        });
    });

    describe('errors reported after a successful mount', () => {
        it('drops out of the ready state', () => {
            const { hook } = renderUseEquilibria({ config });
            expect(hook.current.isReady).toBe(true);

            act(() => {
                latestInstance().emit('error', new Error('update failed'));
            });

            expect(hook.current.error?.message).toBe('update failed');
            expect(hook.current.isReady).toBe(false);
        });

        it('never reports ready and an error at the same time', () => {
            const { hook } = renderUseEquilibria({ config });

            act(() => {
                latestInstance().emit('error', new Error('boom'));
            });

            expect(hook.current.isReady && hook.current.error !== null).toBe(false);
        });
    });

    describe('re-mounting', () => {
        it('tears down the old engine and builds a new one when the config identity changes', () => {
            const { rerenderWith } = renderUseEquilibria({ config });
            const first = latestInstance();

            const nextConfig = { params: [{ name: 'price', value: 20 }] };
            rerenderWith({ config: nextConfig });

            expect(engineControl.instances).toHaveLength(2);
            expect(first.destroyCount).toBe(1);
            expect(latestInstance().config).toBe(nextConfig);
        });

        it('does not re-mount when the config identity is unchanged', () => {
            const { rerenderWith } = renderUseEquilibria({ config });

            rerenderWith({ config });
            rerenderWith({ config });

            expect(engineControl.instances).toHaveLength(1);
            expect(latestInstance().mountCount).toBe(1);
        });
    });

    describe('retry', () => {
        it('rebuilds the engine and clears the error once the failure is gone', () => {
            engineControl.mountFailure = new Error('view failed to build');
            const { hook } = renderUseEquilibria({ config });
            expect(hook.current.isReady).toBe(false);

            engineControl.mountFailure = null;
            act(() => {
                hook.current.retry();
            });

            expect(hook.current.error).toBeNull();
            expect(hook.current.isReady).toBe(true);
            expect(engineControl.instances).toHaveLength(2);
        });

        it('leaves the error in place when the retry fails again', () => {
            engineControl.mountFailure = new Error('still broken');
            const { hook } = renderUseEquilibria({ config });

            act(() => {
                hook.current.retry();
            });

            expect(hook.current.error?.message).toBe('still broken');
            expect(hook.current.isReady).toBe(false);
        });
    });

    describe('updateParams', () => {
        it('forwards params to the engine as an update', () => {
            const { hook } = renderUseEquilibria({ config });

            act(() => {
                hook.current.updateParams([{ name: 'price', value: 15 }]);
            });

            expect(latestInstance().updates).toEqual([
                { params: [{ name: 'price', value: 15 }] }
            ]);
        });

        it('is a no-op when there is no mounted instance', () => {
            engineControl.constructFailure = new Error('bad config');
            const { hook } = renderUseEquilibria({ config });

            expect(() => {
                act(() => {
                    hook.current.updateParams([{ name: 'price', value: 15 }]);
                });
            }).not.toThrow();
        });
    });

    describe('event forwarding', () => {
        it('forwards each engine interaction event to its callback', () => {
            const onParamChanged = vi.fn();
            const onCurveDragged = vi.fn();
            const onNodeHover = vi.fn();

            renderUseEquilibria({
                config,
                callbacks: { onParamChanged, onCurveDragged, onNodeHover }
            });
            const instance = latestInstance();

            act(() => {
                instance.emit(KG_EVENTS.PARAM_CHANGED, { name: 'price', value: 12 });
                instance.emit(KG_EVENTS.CURVE_DRAGGED, { curve: 'demand' });
                instance.emit(KG_EVENTS.NODE_HOVER, { node: 'eq' });
            });

            expect(onParamChanged).toHaveBeenCalledWith({ name: 'price', value: 12 });
            expect(onCurveDragged).toHaveBeenCalledWith({ curve: 'demand' });
            expect(onNodeHover).toHaveBeenCalledWith({ node: 'eq' });
        });

        it('calls the latest callback after a re-render without re-mounting', () => {
            const first = vi.fn();
            const second = vi.fn();

            const { rerenderWith } = renderUseEquilibria({
                config,
                callbacks: { onParamChanged: first }
            });

            rerenderWith({ config, callbacks: { onParamChanged: second } });

            act(() => {
                latestInstance().emit(KG_EVENTS.PARAM_CHANGED, { name: 'price', value: 3 });
            });

            expect(first).not.toHaveBeenCalled();
            expect(second).toHaveBeenCalledWith({ name: 'price', value: 3 });
            // Swapping callbacks must not tear the chart down and rebuild it.
            expect(engineControl.instances).toHaveLength(1);
        });

        it('tolerates events with no callback registered', () => {
            renderUseEquilibria({ config });

            expect(() => {
                act(() => {
                    latestInstance().emit(KG_EVENTS.PARAM_CHANGED, {});
                });
            }).not.toThrow();
        });
    });
});

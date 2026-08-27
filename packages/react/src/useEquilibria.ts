import { useRef, useState, useEffect, useCallback } from 'react';
import { KineticGraph, KG_EVENTS } from 'equilibria-engine-js';
import type { KineticGraphOptions } from 'equilibria-engine-js';

export interface UseEquilibriaOptions extends KineticGraphOptions { }

/**
 * Optional event callbacks that the hook will wire to engine events.
 */
export interface UseEquilibriaEventCallbacks {
    /** Fired when a parameter value changes via user interaction (e.g. dragging a point). */
    onParamChanged?: (data: unknown) => void;

    /** Fired when a curve element is dragged by the user. */
    onCurveDragged?: (data: unknown) => void;

    /** Fired when the user hovers over an interactive node. */
    onNodeHover?: (data: unknown) => void;
}

export interface UseEquilibriaReturn {
    /** Ref to attach to the container div element. */
    containerRef: React.RefObject<HTMLDivElement>;

    /** The KineticGraph instance (null until mounted). */
    instance: KineticGraph | null;

    /** Error caught during mount, if any. */
    error: Error | null;

    /**
     * Whether the engine mounted successfully and has not reported an error
     * since. Never true at the same time as a non-null `error`.
     */
    isReady: boolean;

    /** Manually retry mounting after an error. */
    retry: () => void;

    /**
     * Programmatically update parameter values on the engine.
     * Equivalent to calling `instance.update({ params: [...] })`.
     *
     * @example
     * updateParams([{ name: 'price', value: 15 }]);
     */
    updateParams: (params: { name: string; value: number }[]) => void;

    /**
     * Mark the current state as the one diagram expressions read as `prev` —
     * scenario applied, answer revealed, lesson step started. In-diagram drags
     * snapshot themselves; this is for boundaries only the app knows about.
     */
    snapshot: () => void;

    /**
     * Bracket a host-driven gesture so it takes one snapshot rather than one per
     * tick. Map these onto the control's own gesture events — a Mantine `Slider`
     * gives `onChangeStart` / `onChangeEnd`. Without them a slider scrub reaches
     * the engine as an undifferentiated stream of updates and produces no usable
     * ghost.
     */
    beginGesture: () => void;
    endGesture: () => void;
}

/**
 * Core hook that manages the KineticGraph lifecycle.
 *
 * `config` may be null, which mounts nothing. That is the honest state for a
 * caller whose config depends on a measurement it has not taken yet — a stage
 * that has to know its own size before it can place panels — and it was already
 * the behaviour, guarded but not declared.
 *
 * - Creates and mounts the engine when the ref is attached
 * - Destroys the engine on unmount
 * - Re-mounts when the config identity changes
 * - Surfaces errors, loading state, and engine events
 *
 * **Important:** The hook re-mounts when `config` identity changes.
 * Wrap your config object in `React.useMemo()` to avoid unnecessary
 * re-mounts on every parent render.
 */
export function useEquilibria(
    config: Record<string, unknown> | null,
    options?: UseEquilibriaOptions,
    eventCallbacks?: UseEquilibriaEventCallbacks
): UseEquilibriaReturn {
    const containerRef = useRef<HTMLDivElement>(null!);
    const instanceRef = useRef<KineticGraph | null>(null);
    const [instance, setInstance] = useState<KineticGraph | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [mounted, setMounted] = useState(false);

    // `isReady` is derived rather than stored so it can never disagree with
    // `error`. The engine does not throw when a mount fails: `KineticGraph.mount()`
    // catches internally and emits 'error' instead (synchronously, while we are
    // still inside the `kg.mount(el)` call below). Storing readiness meant the
    // `setIsReady(true)` that follows a failed mount overwrote the failure, so
    // consumers were told a broken chart was ready.
    const isReady = mounted && error === null;

    // Store event callbacks in a ref so engine listeners always call the latest
    // version without needing to re-mount (avoids stale closures).
    const callbacksRef = useRef<UseEquilibriaEventCallbacks>({});
    callbacksRef.current = eventCallbacks || {};

    const mount = useCallback(() => {
        // Cleanup any existing instance first
        if (instanceRef.current) {
            try {
                instanceRef.current.destroy();
            } catch {
                // Ignore destroy errors
            }
            instanceRef.current = null;
            setInstance(null);
            setMounted(false);
        }

        setError(null);

        const el = containerRef.current;
        if (!el || !config) return;

        try {
            const kg = new KineticGraph(config, options);

            // Listen for engine errors
            kg.on('error', (err: unknown) => {
                setError(err instanceof Error ? err : new Error(String(err)));
            });

            // Forward engine interaction events via stable refs
            kg.on(KG_EVENTS.PARAM_CHANGED, (data: unknown) => {
                callbacksRef.current.onParamChanged?.(data);
            });

            kg.on(KG_EVENTS.CURVE_DRAGGED, (data: unknown) => {
                callbacksRef.current.onCurveDragged?.(data);
            });

            kg.on(KG_EVENTS.NODE_HOVER, (data: unknown) => {
                callbacksRef.current.onNodeHover?.(data);
            });

            kg.mount(el);

            instanceRef.current = kg;
            setInstance(kg);
            setMounted(true);
        } catch (err) {
            const mountError = err instanceof Error ? err : new Error(String(err));
            setError(mountError);
            setMounted(false);
        }
    }, [config, options]);

    // Mount on first render and when config changes
    useEffect(() => {
        mount();

        return () => {
            if (instanceRef.current) {
                try {
                    instanceRef.current.destroy();
                } catch {
                    // Ignore destroy errors during cleanup
                }
                instanceRef.current = null;
                setInstance(null);
                setMounted(false);
            }
        };
    }, [mount]);

    const retry = useCallback(() => {
        mount();
    }, [mount]);

    /** Programmatically update parameter values on the mounted engine instance. */
    const updateParams = useCallback((params: { name: string; value: number }[]) => {
        if (instanceRef.current) {
            instanceRef.current.update({ params });
        }
    }, []);

    const snapshot = useCallback(() => {
        instanceRef.current?.snapshot();
    }, []);

    const beginGesture = useCallback(() => {
        instanceRef.current?.beginGesture();
    }, []);

    const endGesture = useCallback(() => {
        instanceRef.current?.endGesture();
    }, []);

    return { containerRef, instance, error, isReady, retry, updateParams, snapshot, beginGesture, endGesture };
}

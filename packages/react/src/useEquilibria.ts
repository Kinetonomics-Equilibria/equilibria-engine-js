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

    /** Whether the engine has successfully mounted. */
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
}

/**
 * Core hook that manages the KineticGraph lifecycle.
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
    config: Record<string, unknown>,
    options?: UseEquilibriaOptions,
    eventCallbacks?: UseEquilibriaEventCallbacks
): UseEquilibriaReturn {
    const containerRef = useRef<HTMLDivElement>(null!);
    const instanceRef = useRef<KineticGraph | null>(null);
    const [instance, setInstance] = useState<KineticGraph | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [isReady, setIsReady] = useState(false);

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
            setIsReady(false);
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
            setIsReady(true);
        } catch (err) {
            const mountError = err instanceof Error ? err : new Error(String(err));
            setError(mountError);
            setIsReady(false);
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
                setIsReady(false);
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

    return { containerRef, instance, error, isReady, retry, updateParams };
}

import { useRef, useState, useEffect, useCallback } from 'react';
import { KineticGraph } from 'equilibria-engine-js';
import type { KineticGraphOptions } from 'equilibria-engine-js';

export interface UseEquilibriaOptions extends KineticGraphOptions { }

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
}

/**
 * Core hook that manages the KineticGraph lifecycle.
 *
 * - Creates and mounts the engine when the ref is attached
 * - Destroys the engine on unmount
 * - Re-mounts when the config identity changes
 * - Surfaces errors and loading state
 */
export function useEquilibria(
    config: Record<string, unknown>,
    options?: UseEquilibriaOptions
): UseEquilibriaReturn {
    const containerRef = useRef<HTMLDivElement>(null!);
    const instanceRef = useRef<KineticGraph | null>(null);
    const [instance, setInstance] = useState<KineticGraph | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [isReady, setIsReady] = useState(false);

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

    return { containerRef, instance, error, isReady, retry };
}

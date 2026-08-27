import { useEffect } from 'react';
import { KG_CONTAINER_CLASS } from 'equilibria-engine-js';
import { useEquilibria } from './useEquilibria';
import type { EquilibriaChartProps } from './types';

/**
 * Mounts the engine into a div and does nothing else.
 *
 * It has no styling opinion on purpose. Panel chrome — a heading, a description,
 * a surface, a loading treatment, an error panel — belongs to whatever renders
 * this, because on a study screen that chrome is the stage's job and a component
 * that brought its own would be a second container competing with it. The
 * package used to ship an `EquilibriaCard` that did all of that, along with its
 * own `--eq-*` theme; both are gone, so there is one theming system on screen.
 */
export function EquilibriaChart({
    config,
    options,
    className,
    style,
    onError,
    onReady,
    onParamChanged,
    onCurveDragged,
    onNodeHover,
}: EquilibriaChartProps) {
    const { containerRef, error, isReady } = useEquilibria(config, options, {
        onParamChanged,
        onCurveDragged,
        onNodeHover,
    });

    // Forward error callback
    useEffect(() => {
        if (error && onError) {
            onError(error);
        }
    }, [error, onError]);

    // Forward ready callback
    useEffect(() => {
        if (isReady && onReady) {
            onReady();
        }
    }, [isReady, onReady]);

    // KG_CONTAINER_CLASS is rendered here rather than left to the engine's
    // classList.add: React owns this element's class attribute and rewrites it
    // on every render, which dropped the class the engine had added.
    const classNames = [KG_CONTAINER_CLASS, className].filter(Boolean).join(' ');

    // Always rendered, including while erroring, so the ref stays attached and
    // `retry()` has somewhere to mount into.
    return (
        <div
            ref={containerRef}
            className={classNames}
            style={style}
        />
    );
}

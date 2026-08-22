import { useEffect } from 'react';
import { KG_CONTAINER_CLASS } from 'equilibria-engine-js';
import { useEquilibria } from './useEquilibria';
import type { EquilibriaChartProps } from './types';
import styles from './styles.module.css';

/**
 * Minimal chart component — mounts the Equilibria engine into a div container
 * with no additional chrome. Use this when you want full control over the
 * surrounding UI and only need the graph itself.
 *
 * For a styled wrapper with title, description, loading state, and error
 * handling, use `<EquilibriaCard />` instead.
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
    const classNames = [
        KG_CONTAINER_CLASS,
        styles.chartContainer,
        !isReady || error ? styles.chartContainerLoading : styles.chartContainerReady,
        className
    ].filter(Boolean).join(' ');

    return (
        <div
            ref={containerRef}
            className={classNames}
            style={style}
        />
    );
}

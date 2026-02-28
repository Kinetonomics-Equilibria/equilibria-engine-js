import { useEffect } from 'react';
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
}: EquilibriaChartProps) {
    const { containerRef, error, isReady } = useEquilibria(config, options);

    // Forward callbacks
    useEffect(() => {
        if (error && onError) {
            onError(error);
        }
    }, [error, onError]);

    useEffect(() => {
        if (isReady && onReady) {
            onReady();
        }
    }, [isReady, onReady]);

    const classNames = [styles.chartContainer, className].filter(Boolean).join(' ');

    return (
        <div
            ref={containerRef}
            className={classNames}
            style={style}
        />
    );
}

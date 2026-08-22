import { useEffect, type ReactNode } from 'react';
import { KG_CONTAINER_CLASS } from 'equilibria-engine-js';
import { useEquilibria } from './useEquilibria';
import type { EquilibriaCardProps } from './types';
import styles from './styles.module.css';

/**
 * Styled card component wrapping the Equilibria engine.
 * Includes title, description, loading skeleton, error state, and footer slot.
 *
 * This is the recommended "drop-in" component for rendering charts.
 */
export function EquilibriaCard({
    config,
    options,
    className,
    style,
    onError,
    onReady,
    onParamChanged,
    onCurveDragged,
    onNodeHover,
    title,
    description,
    footer,
    loading: loadingOverride,
    errorFallback,
    variant = 'elevated',
}: EquilibriaCardProps) {
    const { containerRef, error, isReady, retry } = useEquilibria(config, options, {
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

    const isLoading = loadingOverride !== undefined ? loadingOverride : !isReady && !error;

    const cardClassNames = [
        styles.card,
        styles[`card--${variant}`],
        className,
    ].filter(Boolean).join(' ');

    // Determine error content
    let errorContent: ReactNode = null;
    if (error) {
        if (errorFallback) {
            errorContent = typeof errorFallback === 'function'
                ? errorFallback(error)
                : errorFallback;
        } else {
            errorContent = (
                <div className={styles.errorContainer}>
                    <div className={styles.errorIcon}>⚠</div>
                    <p className={styles.errorMessage}>
                        {error.message || 'Failed to render chart'}
                    </p>
                    <button className={styles.retryButton} onClick={retry}>
                        Retry
                    </button>
                </div>
            );
        }
    }

    return (
        <div className={cardClassNames} style={style}>
            {/* Header */}
            {(title || description) && (
                <div className={styles.header}>
                    {title && <h3 className={styles.title}>{title}</h3>}
                    {description && <p className={styles.description}>{description}</p>}
                </div>
            )}

            {/* Chart area */}
            <div className={styles.chartArea}>
                {/* Loading skeleton */}
                <div className={`${styles.skeleton} ${!isLoading || error ? styles.skeletonHidden : ''}`}>
                    <div className={styles.skeletonPulse} />
                </div>

                {/* Error state */}
                {error && errorContent}

                {/* Chart container — always rendered so the ref is attached.
                    KG_CONTAINER_CLASS is rendered here rather than left to the
                    engine's classList.add: React owns this element's class
                    attribute and rewrites it on every render, which dropped the
                    class the engine had added. */}
                <div
                    ref={containerRef}
                    className={`${KG_CONTAINER_CLASS} ${styles.chartContainer} ${isLoading || error ? styles.chartContainerLoading : styles.chartContainerReady}`}
                />
            </div>

            {/* Footer */}
            {footer && <div className={styles.footer}>{footer}</div>}
        </div>
    );
}

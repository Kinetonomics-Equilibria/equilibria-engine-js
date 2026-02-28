import type { ReactNode } from 'react';
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
    onError: _onError,
    onReady: _onReady,
    title,
    description,
    footer,
    loading: loadingOverride,
    errorFallback,
    variant = 'elevated',
}: EquilibriaCardProps) {
    const { containerRef, error, isReady, retry } = useEquilibria(config, options);

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
                ? (errorFallback as (err: Error) => ReactNode)(error)
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
                {isLoading && !error && (
                    <div className={styles.skeleton}>
                        <div className={styles.skeletonPulse} />
                    </div>
                )}

                {/* Error state */}
                {error && errorContent}

                {/* Chart container — always rendered so the ref is attached */}
                <div
                    ref={containerRef}
                    className={styles.chartContainer}
                    style={{
                        opacity: isLoading || error ? 0 : 1,
                        position: isLoading || error ? 'absolute' : 'relative',
                        pointerEvents: isLoading || error ? 'none' : 'auto',
                    }}
                />
            </div>

            {/* Footer */}
            {footer && <div className={styles.footer}>{footer}</div>}
        </div>
    );
}

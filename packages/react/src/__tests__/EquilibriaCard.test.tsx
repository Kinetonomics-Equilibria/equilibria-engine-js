import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act, fireEvent } from '@testing-library/react';
import { EquilibriaCard } from '../EquilibriaCard';
import styles from '../styles.module.css';
import { engineControl, resetEngineMock, latestInstance } from './engineMock';

vi.mock('equilibria-engine-js', async () => {
    const actual = await vi.importActual<Record<string, unknown>>('equilibria-engine-js');
    const { FakeKineticGraph } = await import('./engineMock');
    return { ...actual, KineticGraph: FakeKineticGraph };
});

const config = { params: [{ name: 'price', value: 10 }] };

beforeEach(() => {
    resetEngineMock();
});

const skeleton = (root: HTMLElement) =>
    root.querySelector(`.${styles.skeleton}`) as HTMLElement;

const chartContainer = (root: HTMLElement) =>
    root.querySelector(`.${styles.chartContainer}`) as HTMLElement;

describe('<EquilibriaCard />', () => {
    describe('chrome', () => {
        it('renders the title, description and footer when provided', () => {
            const { container, getByText } = render(
                <EquilibriaCard
                    config={config}
                    title="Supply and demand"
                    description="Drag the curves"
                    footer={<span>Source: textbook</span>}
                />
            );

            expect(getByText('Supply and demand').tagName).toBe('H3');
            expect(getByText('Drag the curves')).toBeTruthy();
            expect(getByText('Source: textbook')).toBeTruthy();
            expect(container.querySelector(`.${styles.header}`)).not.toBeNull();
            expect(container.querySelector(`.${styles.footer}`)).not.toBeNull();
        });

        it('omits the header and footer when there is nothing to put in them', () => {
            const { container } = render(<EquilibriaCard config={config} />);

            expect(container.querySelector(`.${styles.header}`)).toBeNull();
            expect(container.querySelector(`.${styles.footer}`)).toBeNull();
        });

        it('defaults to the elevated variant', () => {
            const { container } = render(<EquilibriaCard config={config} />);

            expect(container.firstElementChild!.className).toContain(styles['card--elevated']);
        });

        it.each(['outlined', 'flat'] as const)('applies the %s variant', (variant) => {
            const { container } = render(<EquilibriaCard config={config} variant={variant} />);

            expect(container.firstElementChild!.className).toContain(styles[`card--${variant}`]);
        });

        it('applies the caller className and style to the card', () => {
            const { container } = render(
                <EquilibriaCard config={config} className="my-card" style={{ width: 400 }} />
            );
            const card = container.firstElementChild as HTMLElement;

            expect(card.className).toContain('my-card');
            expect(card.style.width).toBe('400px');
        });
    });

    describe('loading state', () => {
        it('hides the skeleton once the engine is ready', () => {
            const { container } = render(<EquilibriaCard config={config} />);

            expect(skeleton(container).className).toContain(styles.skeletonHidden);
            expect(chartContainer(container).className).toContain(styles.chartContainerReady);
        });

        it('shows the skeleton while the loading override is set', () => {
            const { container } = render(<EquilibriaCard config={config} loading />);

            expect(skeleton(container).className).not.toContain(styles.skeletonHidden);
            expect(chartContainer(container).className).toContain(styles.chartContainerLoading);
        });

        it('hides the skeleton when the loading override is false, even before the engine mounts', () => {
            engineControl.mountFailure = new Error('view failed to build');
            const { container } = render(<EquilibriaCard config={config} loading={false} />);

            expect(skeleton(container).className).toContain(styles.skeletonHidden);
        });
    });

    describe('error state', () => {
        beforeEach(() => {
            engineControl.mountFailure = new Error('view failed to build');
        });

        it('renders the default error UI with the engine message', () => {
            const { container, getByText } = render(<EquilibriaCard config={config} />);

            expect(container.querySelector(`.${styles.errorContainer}`)).not.toBeNull();
            expect(getByText('view failed to build')).toBeTruthy();
        });

        it('falls back to a generic message when the error has none', () => {
            engineControl.mountFailure = new Error('');
            const { getByText } = render(<EquilibriaCard config={config} />);

            expect(getByText('Failed to render chart')).toBeTruthy();
        });

        it('keeps the chart container mounted so the ref stays attached', () => {
            const { container } = render(<EquilibriaCard config={config} />);

            expect(chartContainer(container)).not.toBeNull();
            expect(chartContainer(container).className).toContain(styles.chartContainerLoading);
        });

        it('rebuilds the chart when Retry is clicked', () => {
            const { container, getByText } = render(<EquilibriaCard config={config} />);
            expect(engineControl.instances).toHaveLength(1);

            engineControl.mountFailure = null;
            act(() => {
                fireEvent.click(getByText('Retry'));
            });

            expect(engineControl.instances).toHaveLength(2);
            expect(container.querySelector(`.${styles.errorContainer}`)).toBeNull();
            expect(chartContainer(container).className).toContain(styles.chartContainerReady);
        });

        it('renders a ReactNode errorFallback instead of the default UI', () => {
            const { container, getByText } = render(
                <EquilibriaCard config={config} errorFallback={<p>Chart unavailable</p>} />
            );

            expect(getByText('Chart unavailable')).toBeTruthy();
            expect(container.querySelector(`.${styles.errorContainer}`)).toBeNull();
        });

        it('calls a function errorFallback with the error', () => {
            const errorFallback = vi.fn((err: Error) => <p>Failed: {err.message}</p>);

            const { getByText } = render(
                <EquilibriaCard config={config} errorFallback={errorFallback} />
            );

            expect(errorFallback).toHaveBeenCalled();
            expect(errorFallback.mock.calls[0][0].message).toBe('view failed to build');
            expect(getByText('Failed: view failed to build')).toBeTruthy();
        });
    });

    describe('lifecycle callbacks', () => {
        it('calls onReady after a successful mount', () => {
            const onReady = vi.fn();

            render(<EquilibriaCard config={config} onReady={onReady} />);

            expect(onReady).toHaveBeenCalledTimes(1);
        });

        // Regression: mirrors the EquilibriaChart case — a failed mount reports
        // itself through the engine's 'error' event, not by throwing, and used to
        // leave the card announcing readiness for a chart that never rendered.
        it('calls onError and never onReady when the mount fails', () => {
            engineControl.mountFailure = new Error('view failed to build');
            const onReady = vi.fn();
            const onError = vi.fn();

            render(<EquilibriaCard config={config} onReady={onReady} onError={onError} />);

            expect(onError).toHaveBeenCalledTimes(1);
            expect(onReady).not.toHaveBeenCalled();
        });

        it('shows the error UI when the engine fails after mounting', () => {
            const { container } = render(<EquilibriaCard config={config} />);
            expect(container.querySelector(`.${styles.errorContainer}`)).toBeNull();

            act(() => {
                latestInstance().emit('error', new Error('later failure'));
            });

            expect(container.querySelector(`.${styles.errorContainer}`)).not.toBeNull();
        });
    });

    it('destroys the engine when unmounted', () => {
        const { unmount } = render(<EquilibriaCard config={config} />);
        const instance = latestInstance();

        unmount();

        expect(instance.destroyCount).toBe(1);
    });
});

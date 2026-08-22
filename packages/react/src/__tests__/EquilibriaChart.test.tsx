import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { KG_EVENTS } from 'equilibria-engine-js';
import { EquilibriaChart } from '../EquilibriaChart';
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

/** The chart renders exactly one div — the engine container. */
function containerOf(root: HTMLElement) {
    const el = root.firstElementChild as HTMLElement | null;
    if (!el) throw new Error('EquilibriaChart rendered nothing');
    return el;
}

describe('<EquilibriaChart />', () => {
    it('mounts the engine into the div it renders', () => {
        const { container } = render(<EquilibriaChart config={config} />);

        expect(latestInstance().container).toBe(containerOf(container));
    });

    it('applies the caller className and style alongside its own classes', () => {
        const { container } = render(
            <EquilibriaChart config={config} className="my-chart" style={{ height: 300 }} />
        );
        const el = containerOf(container);

        expect(el.className).toContain('my-chart');
        expect(el.className).toContain(styles.chartContainer);
        expect(el.style.height).toBe('300px');
    });

    it('marks the container ready once the engine has mounted', () => {
        const { container } = render(<EquilibriaChart config={config} />);

        expect(containerOf(container).className).toContain(styles.chartContainerReady);
    });

    it('marks the container as loading when the mount failed', () => {
        engineControl.mountFailure = new Error('view failed to build');

        const { container } = render(<EquilibriaChart config={config} />);
        const el = containerOf(container);

        expect(el.className).toContain(styles.chartContainerLoading);
        expect(el.className).not.toContain(styles.chartContainerReady);
    });

    describe('lifecycle callbacks', () => {
        it('calls onReady after a successful mount', () => {
            const onReady = vi.fn();
            const onError = vi.fn();

            render(<EquilibriaChart config={config} onReady={onReady} onError={onError} />);

            expect(onReady).toHaveBeenCalledTimes(1);
            expect(onError).not.toHaveBeenCalled();
        });

        // Regression: the engine emits 'error' instead of throwing when a mount
        // fails, so the chart used to announce itself ready and fire onReady for
        // a chart that had rendered nothing.
        it('calls onError and never onReady when the mount fails', () => {
            engineControl.mountFailure = new Error('view failed to build');
            const onReady = vi.fn();
            const onError = vi.fn();

            render(<EquilibriaChart config={config} onReady={onReady} onError={onError} />);

            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
            expect(onError.mock.calls[0][0].message).toBe('view failed to build');
            expect(onReady).not.toHaveBeenCalled();
        });

        it('calls onError when the engine fails after mounting', () => {
            const onError = vi.fn();
            render(<EquilibriaChart config={config} onError={onError} />);
            expect(onError).not.toHaveBeenCalled();

            act(() => {
                latestInstance().emit('error', new Error('later failure'));
            });

            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError.mock.calls[0][0].message).toBe('later failure');
        });
    });

    it('forwards interaction events to the matching props', () => {
        const onParamChanged = vi.fn();
        const onCurveDragged = vi.fn();
        const onNodeHover = vi.fn();

        render(
            <EquilibriaChart
                config={config}
                onParamChanged={onParamChanged}
                onCurveDragged={onCurveDragged}
                onNodeHover={onNodeHover}
            />
        );
        const instance = latestInstance();

        act(() => {
            instance.emit(KG_EVENTS.PARAM_CHANGED, { name: 'price', value: 12 });
            instance.emit(KG_EVENTS.CURVE_DRAGGED, { curve: 'supply' });
            instance.emit(KG_EVENTS.NODE_HOVER, { node: 'eq' });
        });

        expect(onParamChanged).toHaveBeenCalledWith({ name: 'price', value: 12 });
        expect(onCurveDragged).toHaveBeenCalledWith({ curve: 'supply' });
        expect(onNodeHover).toHaveBeenCalledWith({ node: 'eq' });
    });

    it('destroys the engine when unmounted', () => {
        const { unmount } = render(<EquilibriaChart config={config} />);
        const instance = latestInstance();

        unmount();

        expect(instance.destroyCount).toBe(1);
    });
});

import type { CSSProperties } from 'react';
import type { KineticGraphOptions } from 'equilibria-engine-js';

/**
 * Event data emitted when a parameter changes via user interaction (drag, click).
 */
export interface ParamChangeEvent {
    name: string;
    value: number;
}

/**
 * Props for EquilibriaChart, the package's only component.
 */
export interface EquilibriaChartProps {
    /** Engine configuration object (parsed JSON/YAML). */
    config: Record<string, unknown>;

    /** Engine options passed to the KineticGraph constructor. */
    options?: KineticGraphOptions;

    /** Additional CSS class name applied to the chart container. */
    className?: string;

    /** Inline styles applied to the chart container. */
    style?: CSSProperties;

    /** Callback fired when the engine encounters an error during mount. */
    onError?: (error: Error) => void;

    /** Callback fired after the engine successfully mounts and renders. */
    onReady?: () => void;

    /** Callback fired when a parameter value changes via user interaction (e.g. dragging a point). */
    onParamChanged?: (data: unknown) => void;

    /** Callback fired when the engine refuses a change — a param bound, or a restriction. */
    onParamBlocked?: (data: unknown) => void;

    /** Callback fired when a curve element is dragged by the user. */
    onCurveDragged?: (data: unknown) => void;

    /** Callback fired when the user hovers over an interactive node. */
    onNodeHover?: (data: unknown) => void;
}

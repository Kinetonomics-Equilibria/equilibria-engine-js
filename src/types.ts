import type { CSSProperties, ReactNode } from 'react';
import type { KineticGraphOptions } from 'equilibria-engine-js';

/**
 * Event data emitted when a parameter changes via user interaction (drag, click).
 */
export interface ParamChangeEvent {
    name: string;
    value: number;
}

/**
 * Props for the minimal EquilibriaChart component.
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

    /** Callback fired when a curve element is dragged by the user. */
    onCurveDragged?: (data: unknown) => void;

    /** Callback fired when the user hovers over an interactive node. */
    onNodeHover?: (data: unknown) => void;
}

/**
 * Card style variants.
 */
export type CardVariant = 'elevated' | 'outlined' | 'flat';

/**
 * Props for the styled EquilibriaCard component.
 */
export interface EquilibriaCardProps extends EquilibriaChartProps {
    /** Card title displayed above the chart. */
    title?: string;

    /** Subtitle / description displayed below the title. */
    description?: string;

    /** Footer content rendered below the chart. */
    footer?: ReactNode;

    /** Override the loading state (auto-detected by default). */
    loading?: boolean;

    /** Custom error UI. Can be a ReactNode or a render function receiving the error. */
    errorFallback?: ReactNode | ((error: Error) => void);

    /** Card container style variant. Default: 'elevated'. */
    variant?: CardVariant;
}

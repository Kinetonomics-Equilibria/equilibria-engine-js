// Components
export { EquilibriaChart } from './EquilibriaChart';
export { Stage } from './Stage';

// Hook
export { useEquilibria } from './useEquilibria';

// Re-export engine constants for convenience. KG_CONTAINER_CLASS is what a
// component building its own container div must render, since React rewrites
// the class attribute it owns and would drop the class the engine adds.
export { KG_EVENTS, KG_CONTAINER_CLASS } from 'equilibria-engine-js';

// Arrangement — the pure layout arithmetic the Stage is built on, exported so
// an app can compute a panel's box without rendering one.
export { arrange, toCustomLayout, pixelBox, FILMSTRIP_BELOW_PX, FOCUS_PARAM, MODE_PARAM, MODE_VALUE } from './arrangement';

// Types
export type { StageProps, StagePanel } from './Stage';
export type { Arrangement, ArrangeInput, PanelRect, LayoutPanel, StageLayout, StageMode } from './arrangement';
export type { EquilibriaChartProps, ParamChangeEvent } from './types';
export type { UseEquilibriaReturn, UseEquilibriaOptions, UseEquilibriaEventCallbacks } from './useEquilibria';

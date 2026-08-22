import 'katex/dist/katex.min.css';

// Components
export { EquilibriaChart } from './EquilibriaChart';
export { EquilibriaCard } from './EquilibriaCard';

// Hook
export { useEquilibria } from './useEquilibria';

// Re-export engine constants for convenience
export { KG_EVENTS } from 'equilibria-engine-js';

// Types
export type { EquilibriaChartProps, EquilibriaCardProps, CardVariant, ParamChangeEvent } from './types';
export type { UseEquilibriaReturn, UseEquilibriaOptions, UseEquilibriaEventCallbacks } from './useEquilibria';

import 'katex/dist/katex.min.css';

// Components
export { EquilibriaChart } from './EquilibriaChart';
export { EquilibriaCard } from './EquilibriaCard';

// Hook
export { useEquilibria } from './useEquilibria';

// Re-export engine constants for convenience. KG_CONTAINER_CLASS is what a
// component building its own container div must render, since React rewrites
// the class attribute it owns and would drop the class the engine adds.
export { KG_EVENTS, KG_CONTAINER_CLASS } from 'equilibria-engine-js';

// Types
export type { EquilibriaChartProps, EquilibriaCardProps, CardVariant, ParamChangeEvent } from './types';
export type { UseEquilibriaReturn, UseEquilibriaOptions, UseEquilibriaEventCallbacks } from './useEquilibria';

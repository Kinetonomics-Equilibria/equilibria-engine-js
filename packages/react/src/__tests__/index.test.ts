import { describe, it, expect } from 'vitest';
import { KG_EVENTS as engineEvents, KG_CONTAINER_CLASS as engineContainerClass } from 'equilibria-engine-js';
import * as publicApi from '../index';

// Deliberately does not mock the engine: this file guards the package's public
// surface, including that the KG_EVENTS re-export really is the engine's own.

describe('public API', () => {
    it('exports the components and the hook', () => {
        expect(typeof publicApi.EquilibriaChart).toBe('function');
        expect(typeof publicApi.EquilibriaCard).toBe('function');
        expect(typeof publicApi.useEquilibria).toBe('function');
    });

    it('re-exports the engine constants unchanged', () => {
        expect(publicApi.KG_EVENTS).toBe(engineEvents);
        expect(publicApi.KG_CONTAINER_CLASS).toBe(engineContainerClass);
    });

    it('exports nothing beyond the documented surface', () => {
        expect(Object.keys(publicApi).sort()).toEqual([
            'EquilibriaCard',
            'EquilibriaChart',
            'KG_CONTAINER_CLASS',
            'KG_EVENTS',
            'useEquilibria'
        ]);
    });
});

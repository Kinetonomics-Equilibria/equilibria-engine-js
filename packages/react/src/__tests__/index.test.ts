import { describe, it, expect } from 'vitest';
import { KG_EVENTS as engineEvents, KG_CONTAINER_CLASS as engineContainerClass } from 'equilibria-engine-js';
import * as publicApi from '../index';

// Deliberately does not mock the engine: this file guards the package's public
// surface, including that the KG_EVENTS re-export really is the engine's own.

describe('public API', () => {
    it('exports the component and the hook', () => {
        expect(typeof publicApi.EquilibriaChart).toBe('function');
        expect(typeof publicApi.useEquilibria).toBe('function');
    });

    it('exports the stage and the arithmetic it is built on', () => {
        expect(typeof publicApi.Stage).toBe('function');
        // Exported separately from the component because an app that computes
        // its own arrangement policy needs the numbers without rendering one.
        expect(typeof publicApi.arrange).toBe('function');
        expect(typeof publicApi.toCustomLayout).toBe('function');
        expect(typeof publicApi.pixelBox).toBe('function');
    });

    it('re-exports the engine constants unchanged', () => {
        expect(publicApi.KG_EVENTS).toBe(engineEvents);
        expect(publicApi.KG_CONTAINER_CLASS).toBe(engineContainerClass);
    });

    it('exports nothing beyond the documented surface', () => {
        expect(Object.keys(publicApi).sort()).toEqual([
            'EquilibriaChart',
            'FILMSTRIP_BELOW_PX',
            'FOCUS_PARAM',
            'KG_CONTAINER_CLASS',
            'KG_EVENTS',
            'MODE_PARAM',
            'MODE_VALUE',
            'Stage',
            'arrange',
            'pixelBox',
            'toCustomLayout',
            'useEquilibria'
        ]);
    });

    // The package used to export a styled EquilibriaCard and to import
    // katex/dist/katex.min.css as a side effect of being imported at all. Panel
    // chrome is the host application's job, and KaTeX is the engine's to ask for
    // (packages/engine/src/ts/kg.ts), so neither belongs here. The exhaustive
    // key assertion above is what actually guards this; naming the card
    // separately is what makes a reintroduction obvious in a diff.
    it('no longer exports a card', () => {
        expect('EquilibriaCard' in publicApi).toBe(false);
    });
});

import { describe, it, expect, beforeAll } from 'vitest';
import { mountObjects, stubContainerLayout } from './helpers';

/**
 * Objects publish their results into a single flat `calcs` namespace keyed by
 * name. An object that hardcodes its key can only ever appear once in a
 * diagram — a second one overwrites the first, and whichever parsed last
 * silently wins.
 */

beforeAll(() => stubContainerLayout());

describe('EconContractCurve calc keys', () => {
    it('still publishes under calcs.cc when unnamed', () => {
        const r = mountObjects([
            { type: 'EconContractCurve', def: { a: 0.5, b: 0.5, totalGood1: 10, totalGood2: 10 } }
        ]);

        expect(r.error).toBeNull();
        expect(r.calcs.cc).toBeDefined();
        r.destroy();
    });

    it('numbers a second unnamed contract curve rather than dropping it', () => {
        const r = mountObjects([
            { type: 'EconContractCurve', def: { a: 0.5, b: 0.5, totalGood1: 10, totalGood2: 10 } },
            { type: 'EconContractCurve', def: { a: 0.2, b: 0.8, totalGood1: 10, totalGood2: 10 } }
        ]);

        expect(r.error).toBeNull();
        expect(r.calcs.cc).toBeDefined();
        expect(r.calcs.cc2).toBeDefined();
        expect(r.calcs.cc2).not.toEqual(r.calcs.cc);
        r.destroy();
    });

    it('keeps two contract curves separate', () => {
        const r = mountObjects([
            { type: 'EconContractCurve', def: { name: 'ccA', a: 0.5, b: 0.5, totalGood1: 10, totalGood2: 10 } },
            { type: 'EconContractCurve', def: { name: 'ccB', a: 0.2, b: 0.8, totalGood1: 10, totalGood2: 10 } }
        ]);

        expect(r.error).toBeNull();
        expect(r.calcs.ccA).toBeDefined();
        expect(r.calcs.ccB).toBeDefined();
        // different preferences must give different contract curves
        expect(r.calcs.ccA).not.toEqual(r.calcs.ccB);
        r.destroy();
    });
});

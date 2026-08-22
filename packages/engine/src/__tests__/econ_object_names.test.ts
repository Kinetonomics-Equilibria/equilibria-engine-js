import { describe, it, expect, vi } from 'vitest';
import { parse } from '../ts/KGAuthor/parsers/parsingFunctions';
import '../ts/KGAuthor/index'; // side-effect: registers all KGAuthor classes into the registry

// Object names are calc keys, so these assert on the parsed calcs rather than on
// the DOM: what matters is which key each object's slope, intercepts and points
// land under, and that a second object of the same kind gets a key of its own.
function parseObjects(objects: any[]) {
    const parsedData: any = {
        params: [],
        calcs: {},
        colors: {},
        idioms: {},
        clipPaths: [],
        markers: [],
        scales: [],
        layers: [[], [], [], []],
        divs: [],
        objects: []
    };

    return parse([{
        type: 'OneGraph',
        def: {
            graph: {
                xAxis: { title: 'Q', min: 0, max: 20 },
                yAxis: { title: 'P', min: 0, max: 20 },
                objects
            }
        }
    }] as any, parsedData);
}

describe('econ object names', () => {

    // Regression: EconLinearDemand/Supply/Equilibrium default to the names
    // "demand"/"supply"/"equilibrium", and Line.parseSelf merges into
    // parsedData.calcs with setDefaults, which skips keys that already exist.
    // Two unnamed demand curves therefore both claimed calcs.demand and the
    // second curve's values were silently dropped - it reported the first
    // curve's geometry.

    it('gives the only unnamed curve of a kind the bare semantic name', () => {
        const { calcs } = parseObjects([
            { type: 'EconLinearDemand', def: { yIntercept: 20, slope: -1 } },
            { type: 'EconLinearSupply', def: { yIntercept: 2, slope: 1 } }
        ]);

        // Existing configs reference calcs.demand and calcs.supply; the first
        // claim on a name stays unqualified precisely so they keep working.
        expect(calcs.demand.yIntercept).toBe('20');
        expect(calcs.supply.yIntercept).toBe('2');
        expect(calcs.supply.slope).toBe('1');
        expect(calcs.demand2).toBeUndefined();
        expect(calcs.supply2).toBeUndefined();
    });

    it('numbers later unnamed curves of the same kind instead of dropping them', () => {
        const { calcs } = parseObjects([
            { type: 'EconLinearSupply', def: { yIntercept: 2, slope: 1 } },
            { type: 'EconLinearSupply', def: { yIntercept: 5, slope: 3 } },
            { type: 'EconLinearSupply', def: { yIntercept: 8, slope: 4 } }
        ]);

        expect(calcs.supply.yIntercept).toBe('2');
        expect(calcs.supply.slope).toBe('1');
        expect(calcs.supply2.yIntercept).toBe('5');
        expect(calcs.supply2.slope).toBe('3');
        expect(calcs.supply3.yIntercept).toBe('8');
        expect(calcs.supply3.slope).toBe('4');
    });

    it('keeps two unnamed demand curves distinct', () => {
        const { calcs } = parseObjects([
            { type: 'EconLinearDemand', def: { yIntercept: 20, slope: -1 } },
            { type: 'EconLinearDemand', def: { yIntercept: 30, slope: -2 } }
        ]);

        expect(calcs.demand.yIntercept).toBe('20');
        expect(calcs.demand2.yIntercept).toBe('30');
    });

    it('never rewrites a name the author supplied', () => {
        const { calcs } = parseObjects([
            { type: 'EconLinearSupply', def: { name: 'domestic', yIntercept: 2, slope: 1 } },
            { type: 'EconLinearSupply', def: { name: 'foreign', yIntercept: 4, slope: 2 } }
        ]);

        expect(calcs.domestic.slope).toBe('1');
        expect(calcs.foreign.slope).toBe('2');
        expect(calcs.supply).toBeUndefined();
    });

    it('routes a generated name around a name the author already took', () => {
        const { calcs } = parseObjects([
            { type: 'EconLinearSupply', def: { name: 'supply', yIntercept: 2, slope: 1 } },
            { type: 'EconLinearSupply', def: { name: 'supply2', yIntercept: 4, slope: 2 } },
            { type: 'EconLinearSupply', def: { yIntercept: 6, slope: 3 } }
        ]);

        expect(calcs.supply.slope).toBe('1');
        expect(calcs.supply2.slope).toBe('2');
        expect(calcs.supply3.slope).toBe('3');
    });

    it('warns rather than silently merging when the author reuses a name', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        parseObjects([
            { type: 'EconLinearSupply', def: { name: 'supply', yIntercept: 2, slope: 1 } },
            { type: 'EconLinearSupply', def: { name: 'supply', yIntercept: 4, slope: 2 } }
        ]);

        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Duplicate object name "supply"'));
        warnSpy.mockRestore();
    });

    it('gives each equilibrium its own Q and P, and its own curves', () => {
        const { calcs } = parseObjects([
            {
                type: 'EconLinearEquilibrium',
                def: { demand: { yIntercept: 20, slope: -1 }, supply: { yIntercept: 2, slope: 1 } }
            },
            {
                type: 'EconLinearEquilibrium',
                def: { demand: { yIntercept: 30, slope: -2 }, supply: { yIntercept: 5, slope: 3 } }
            }
        ]);

        expect(calcs.equilibrium).toBeDefined();
        expect(calcs.equilibrium2).toBeDefined();
        expect(calcs.equilibrium2.P).not.toBe(calcs.equilibrium.P);
        expect(calcs.supply.yIntercept).toBe('2');
        expect(calcs.supply2.yIntercept).toBe('5');
        expect(calcs.demand.yIntercept).toBe('20');
        expect(calcs.demand2.yIntercept).toBe('30');
    });

    it('starts naming over on each parse, so names are stable across mounts', () => {
        const first = parseObjects([{ type: 'EconLinearSupply', def: { yIntercept: 2, slope: 1 } }]);
        const second = parseObjects([{ type: 'EconLinearSupply', def: { yIntercept: 2, slope: 1 } }]);

        expect(first.calcs.supply).toBeDefined();
        expect(second.calcs.supply).toBeDefined();
        expect(second.calcs.supply2).toBeUndefined();
    });

});

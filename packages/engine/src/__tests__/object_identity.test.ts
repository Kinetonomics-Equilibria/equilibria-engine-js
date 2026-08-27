import { describe, it, expect, beforeAll } from 'vitest';
import { mountObjects, stubContainerLayout, captureWarnings } from './helpers';

/**
 * Identity: which object is this, and what do you call it in a sentence?
 *
 * Everything above the renderer was anonymous. `name` existed but nothing
 * required it, checked it, or carried it upward, and nothing anywhere held a
 * human word for an object — `label.text` is `D`, `srDesc` is a sentence for a
 * screen reader, and neither is "the demand curve". These pin the two halves:
 * a name is an address and is unique, and `title` is the word for prose.
 *
 * They assert on the parsed data rather than the DOM because identity is not
 * drawn. Nothing about a name or a title changes a single pixel.
 */

beforeAll(() => stubContainerLayout());

/** Every parsed object across all layers, plus the divs (labels live there). */
function parsedObjects(result: any): any[] {
    const parsed = result.kg.view.parsedData;
    return parsed.layers.flat().concat(parsed.divs);
}

function defsByName(result: any): Record<string, any[]> {
    const byName: Record<string, any[]> = {};
    parsedObjects(result).forEach((o: any) => {
        const name = o.def && o.def.name;
        if (!name) return;
        (byName[name] = byName[name] || []).push(o.def);
    });
    return byName;
}

function titleOf(result: any, name: string): string | undefined {
    const defs = defsByName(result)[name];
    return defs && defs[0].title;
}

describe('object names are addresses', () => {

    // Load-bearing and easy to break: GraphObject fills a random name through
    // setDefaults, which skips a key the def already owns. Change that to a
    // plain assignment and every author-supplied name silently disappears.
    it('keeps the name the author wrote', () => {
        const r = mountObjects([
            { type: 'Point', def: { name: 'peak', coordinates: [5, 5] } }
        ]);

        expect(Object.keys(defsByName(r))).toContain('peak');
        r.destroy();
    });

    it('gives an unnamed object a generated name, and no two the same', () => {
        const r = mountObjects([
            { type: 'Point', def: { coordinates: [5, 5] } },
            { type: 'Point', def: { coordinates: [6, 6] } }
        ]);

        const names = parsedObjects(r).map((o: any) => o.def && o.def.name).filter(Boolean);
        expect(new Set(names).size).toBe(names.length);
        r.destroy();
    });

    it('warns when two objects answer to one name', () => {
        const { result, warnings } = captureWarnings(() => mountObjects([
            { type: 'Point', def: { name: 'peak', coordinates: [5, 5] } },
            { type: 'Point', def: { name: 'peak', coordinates: [6, 6] } }
        ]));

        expect(warnings.filter(w => w.includes('Duplicate object name "peak"'))).toHaveLength(1);
        result.destroy();
    });

    // A generated name is not an address — nothing refers to it and an author
    // cannot act on a collision between two of them. Only names someone chose
    // are worth reporting.
    it('stays quiet about the names it generated itself', () => {
        const { result, warnings } = captureWarnings(() => mountObjects([
            { type: 'Point', def: { coordinates: [5, 5], droplines: { vertical: 'x', horizontal: 'y' } } },
            { type: 'Point', def: { coordinates: [6, 6], droplines: { vertical: 'x', horizontal: 'y' } } }
        ]));

        expect(warnings.filter(w => w.includes('Duplicate object name'))).toEqual([]);
        result.destroy();
    });

    // The droplines and axis labels hanging off a point are built by copying its
    // def, which by then carries its name. Three objects answered to
    // `equilibrium`, which was invisible while a name was only a calc key that
    // decorations never write to, and wrong the moment it became an address.
    it('does not let a point lend its name to its own droplines and labels', () => {
        const { result, warnings } = captureWarnings(() => mountObjects([{
            type: 'Point',
            def: {
                name: 'eq',
                coordinates: [5, 5],
                label: { text: 'E' },
                droplines: { vertical: 'Q^*', horizontal: 'P^*' }
            }
        }]));

        expect(warnings.filter(w => w.includes('Duplicate object name'))).toEqual([]);
        expect(defsByName(result)['eq']).toHaveLength(1);
        result.destroy();
    });

    // The opposite case, and the reason the check is not simply "no repeats":
    // an indifference curve is drawn as several curve segments from one def, and
    // those parts are one object the author named once.
    it('lets one object drawn as several curves keep its single name', () => {
        const { result, warnings } = captureWarnings(() => mountObjects([{
            type: 'EconOptimalBundle',
            def: {
                name: 'ob',
                utilityFunction: { type: 'CobbDouglas', def: { alpha: 0.5 } },
                budgetLine: { name: 'bl', p1: 2, p2: 1, m: 20 }
            }
        }]));

        expect(warnings.filter(w => w.includes('Duplicate object name'))).toEqual([]);
        expect(result.calcs.ob.x).toBe(5);
        result.destroy();
    });

});

describe('titles are the word for prose', () => {

    it('takes the title the author wrote', () => {
        const r = mountObjects([
            { type: 'Point', def: { name: 'eq', title: 'the equilibrium', coordinates: [5, 5] } }
        ]);

        expect(titleOf(r, 'eq')).toBe('the equilibrium');
        r.destroy();
    });

    // A name the author chose is already a word they picked for this object, so
    // it is a better default than nothing. A generated name never is.
    it('defaults a named object to its own name', () => {
        const r = mountObjects([
            { type: 'Point', def: { name: 'peak', coordinates: [5, 5] } }
        ]);

        expect(titleOf(r, 'peak')).toBe('peak');
        r.destroy();
    });

    it('leaves an unnamed object untitled rather than titling it KGID_…', () => {
        const r = mountObjects([{ type: 'Point', def: { coordinates: [5, 5] } }]);

        parsedObjects(r).forEach((o: any) => {
            if (o.def && o.def.title) expect(o.def.title).not.toMatch(/^KGID_/);
        });
        r.destroy();
    });

    // The whole point of defaulting these: narration that only works on
    // hand-titled diagrams works on almost none of them.
    it('titles the econ composites without the author lifting a finger', () => {
        const r = mountObjects([{
            type: 'EconLinearEquilibrium',
            def: {
                demand: { yIntercept: 20, slope: -1 },
                supply: { yIntercept: 2, slope: 1 },
                equilibrium: {}
            }
        }]);

        expect(titleOf(r, 'demand')).toBe('demand');
        expect(titleOf(r, 'supply')).toBe('supply');

        // The composite named `equilibrium` is not drawn — it publishes Q and P
        // and builds a point. Narration is about what moved on screen, so the
        // point is what carries the word. It cannot be called `equilibrium`
        // outright: that calc key already holds the composite's Q and P, and
        // Point.parseSelf assigns over the key rather than merging into it.
        expect(titleOf(r, 'equilibrium_point')).toBe('equilibrium');
        r.destroy();
    });

    it('numbers the title when the registry numbered the name', () => {
        const r = mountObjects([
            { type: 'EconLinearDemand', def: { yIntercept: 20, slope: -1 } },
            { type: 'EconLinearDemand', def: { yIntercept: 30, slope: -2 } }
        ]);

        expect(titleOf(r, 'demand')).toBe('demand');
        expect(titleOf(r, 'demand2')).toBe('demand 2');
        r.destroy();
    });

    // Two curves both called "demand" is exactly the ambiguity narration cannot
    // survive, so an author's own name wins over the composite's word.
    it('prefers the name the author chose to the composite word', () => {
        const r = mountObjects([
            { type: 'EconLinearSupply', def: { name: 'domestic', yIntercept: 2, slope: 1 } },
            { type: 'EconLinearSupply', def: { name: 'foreign', yIntercept: 4, slope: 2 } }
        ]);

        expect(titleOf(r, 'domestic')).toBe('domestic');
        expect(titleOf(r, 'foreign')).toBe('foreign');
        r.destroy();
    });

    it('gives the marginal revenue curve its own words', () => {
        const r = mountObjects([{
            type: 'EconLinearDemand',
            def: { yIntercept: 20, slope: -1, marginalRevenue: {} }
        }]);

        const titles = parsedObjects(r).map((o: any) => o.def && o.def.title);
        expect(titles).toContain('marginal revenue');
        r.destroy();
    });

});

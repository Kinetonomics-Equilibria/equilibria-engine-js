import * as KGAuthor from "../../../../index";
import { extractTypeAndDef } from "../../../../parsers/parsingFunctions";



// Every name an author may use for a functional form, mapped to the class that
// implements it. The `*Function` names are the ones the classes are exported
// under and the ones the schema reference documents; the shorter names are kept
// for configs written against the original KGJS vocabulary.
const UTILITY_FUNCTION_TYPES: { [name: string]: string } = {
    CobbDouglas: 'CobbDouglasFunction',
    CobbDouglasFunction: 'CobbDouglasFunction',

    Substitutes: 'LinearFunction',
    PerfectSubstitutes: 'LinearFunction',
    Linear: 'LinearFunction',
    LinearFunction: 'LinearFunction',

    Complements: 'MinFunction',
    PerfectComplements: 'MinFunction',
    Min: 'MinFunction',
    MinFunction: 'MinFunction',

    Concave: 'ConcaveFunction',
    ConcaveFunction: 'ConcaveFunction',

    Quasilinear: 'QuasilinearFunction',
    QuasilinearFunction: 'QuasilinearFunction',

    CES: 'CESFunction',
    CESFunction: 'CESFunction'
};

export function getUtilityFunction(def) {
    if (def == undefined) {
        return undefined;
    }

    def = extractTypeAndDef(def);

    const className = UTILITY_FUNCTION_TYPES[def.type];
    if (!className) {
        // Falling through used to return undefined, and the caller then failed
        // with "Cannot read properties of undefined (reading 'levelCurve')"
        // from deep inside the object it was building. Name the real problem.
        throw new Error(
            `Unknown utility function type "${def.type}". ` +
            `Expected one of: ${Object.keys(UTILITY_FUNCTION_TYPES).join(', ')}.`
        );
    }

    return new KGAuthor[className](def.def);
}

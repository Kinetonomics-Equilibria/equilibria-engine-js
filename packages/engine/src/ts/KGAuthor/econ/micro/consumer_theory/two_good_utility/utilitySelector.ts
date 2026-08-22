import * as KGAuthor from "../../../../index";
import { extractTypeAndDef } from "../../../../parsers/parsingFunctions";



export function getUtilityFunction(def) {
    if (def != undefined) {
        def = extractTypeAndDef(def);
        if (def.type == 'CobbDouglas') {
            return new KGAuthor.CobbDouglasFunction(def.def)
        } else if (def.type == 'Substitutes' || def.type == 'PerfectSubstitutes') {
            return new KGAuthor.LinearFunction(def.def)
        } else if (def.type == 'Complements' || def.type == 'PerfectComplements') {
            return new KGAuthor.MinFunction(def.def)
        } else if (def.type == 'Concave') {
            return new KGAuthor.ConcaveFunction(def.def)
        } else if (def.type == 'Quasilinear') {
            return new KGAuthor.QuasilinearFunction(def.def)
        } else if (def.type == 'CESFunction' || def.type == 'CES') {
            return new KGAuthor.CESFunction(def.def)
        }



    }

}

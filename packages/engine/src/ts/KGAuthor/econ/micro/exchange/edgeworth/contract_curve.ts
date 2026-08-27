import { setDefaults } from "../../../../../util";
import { CurveDefinition, Curve } from "../../../../../KGAuthor/graphObjects/curve";
import { multiplyDefs, subtractDefs } from "../../../../parsers/parsingFunctions";
import { setEconName } from "../../../../parsers/nameRegistry";



    export interface EconContractCurveDefinition extends CurveDefinition {
        totalGood1: string | number;
        totalGood2: string | number;
        a: string | number; // agent A's Cobb-Douglas utility function alpha
        b: string | number; // agent B's Cobb-Douglas utility function alpha
    }


    export class EconContractCurve extends Curve {

        fnString: string;

        constructor(def: EconContractCurveDefinition, graph) {

            const a = def.a,
                b = def.b,
                ab = multiplyDefs(a, b),
                aMinusABtimesX = multiplyDefs(subtractDefs(a, ab), def.totalGood1),
                bMinusABtimesY = multiplyDefs(subtractDefs(b, ab), def.totalGood2),
                bMinusA = subtractDefs(b, a),
                fnString = `${bMinusABtimesY}*(x)/(${aMinusABtimesX} + ${bMinusA}*(x))`;

            def.univariateFunction = {fn: fnString};

            // 'cc' was the fixed key this curve published its function under;
            // keeping it as the default name means existing configs still
            // reference calcs.cc, while a named curve now gets its own key
            // instead of overwriting another one. Going through the registry
            // covers the remaining case: a second *unnamed* contract curve is
            // numbered (cc2) rather than overwriting the first.
            setEconName(def, 'cc', 'the contract curve');

            setDefaults(def, {
                interpolation: 'curveMonotoneX',
                color: 'colors.budget'
            });

            super(def, graph);

            this.fnString = fnString;

        }

        parseSelf(parsedData) {
            let cc = this;
            parsedData = super.parseSelf(parsedData);
            // Keyed by name rather than a fixed 'cc': two contract curves in one
            // diagram used to overwrite each other, and whichever parsed last
            // silently won.
            parsedData.calcs[cc.name] = cc.fnString;
            return parsedData;
        
    



}

}

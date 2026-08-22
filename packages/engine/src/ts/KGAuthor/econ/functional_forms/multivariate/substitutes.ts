import { subtractDefs } from "../../../parsers/parsingFunctions";
import { EconBudgetLine } from "../../micro/consumer_theory/constraints/budgetLine";
import { EconMultivariateFunction } from "./multivariate";




    export class LinearFunction extends EconMultivariateFunction {

        constructor(def) {
            super(def);
            let fn = this;
            this.interpolation = 'curveLinear';
            if (def.hasOwnProperty('alpha')) {
                fn.coefficients = [def.alpha, subtractDefs(1, def.alpha)];
            }
        }

        value(x) {
            const c = this.coefficients;
            return `((${x[0]})*(${c[0]})+(${x[1]})*(${c[1]}))`;
        }

        levelSet(def) {
            const c = this.coefficients,
                level = def.level || this.value(def.point);
            return [
                {
                    "fn": `(${level} - (${c[0]})*(x))/(${c[1]})`,
                    "ind": "x",
                    "samplePoints": 2
                }
            ]
        }

        optimalBundle(budgetLine: EconBudgetLine) {
            const c = this.coefficients;
            const buyOnlyGood2 = `((${c[0]})*(${budgetLine.p2}) < (${c[1]})*(${budgetLine.p1}))`;
            return [`${buyOnlyGood2} ? 0 : ${budgetLine.xIntercept}`,`${buyOnlyGood2} ? ${budgetLine.yIntercept} : 0`]
        
    

}

}

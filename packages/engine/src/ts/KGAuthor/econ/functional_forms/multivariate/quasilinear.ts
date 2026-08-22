import { divideDefs, multiplyDefs, subtractDefs } from "../../../parsers/parsingFunctions";
import { EconBudgetLine } from "../../micro/consumer_theory/constraints/budgetLine";
import { EconMultivariateFunction } from "./multivariate";




    export class QuasilinearFunction extends EconMultivariateFunction {

        value(x) {
            const c = this.coefficients;
            return `(${c[0]}*log(${x[0]})+${x[1]})`;
        }

        levelSet(def) {
            const c = this.coefficients,
                level = this.extractLevel(def);
            return [
                {
                    "fn": `((${level})-(${c[0]})*log((x)))`,
                    "ind": "x",
                    "samplePoints": 100
                }
            ]
        }

        cornerCondition(budgetLine: EconBudgetLine) {
            return `(${this.lagrangeBundle(budgetLine)[1]} < 0)`
        }

        lagrangeBundle(budgetLine: EconBudgetLine) {
            const c = this.coefficients;
            return [divideDefs(multiplyDefs(c[0], budgetLine.p2), budgetLine.p1), subtractDefs(budgetLine.yIntercept, c[0])]
        }

        optimalBundle(budgetLine: EconBudgetLine) {
            const lagr = this.lagrangeBundle(budgetLine),
                cornerCondition = this.cornerCondition(budgetLine);
            return [`(${cornerCondition} ? ${budgetLine.xIntercept} : ${lagr[0]})`, `(${cornerCondition} ? 0 : ${lagr[1]})`]
        
    


}

}

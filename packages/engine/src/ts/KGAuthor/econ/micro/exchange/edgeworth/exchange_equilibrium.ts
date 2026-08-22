import { setDefaults } from "../../../../../util";
import { multiplyDefs, subtractDefs, divideDefs, addDefs } from "../../../../parsers/parsingFunctions";
import { OptimalBundleDefinition, EconOptimalBundle } from "../../consumer_theory/optimization/optimalBundle";
import { BundleDefinition, EconBundle } from "../../consumer_theory/two_good_utility/bundle";



    export interface ExchangeEquilibriumBundleDefinition extends OptimalBundleDefinition {
        agentA: BundleDefinition
        agentB: BundleDefinition
    }


    export class ExchangeEquilibriumBundle extends EconOptimalBundle {

        constructor(def: ExchangeEquilibriumBundleDefinition, graph) {

            const agentA = new EconBundle(def.agentA, graph),
                agentB = new EconBundle(def.agentB, graph);

            let p;

            if (def.agentA.utilityFunction.type == 'CobbDouglas' && def.agentB.utilityFunction.type == 'CobbDouglas') {
                let alphaW2 = function (agent) {
                        return multiplyDefs(agent.y, agent.utilityFunction.alpha);
                    },
                    oneMinusAlphaW1 = function (agent) {
                        return multiplyDefs(agent.x, subtractDefs(1, agent.utilityFunction.alpha));
                    };
                p = divideDefs(addDefs(alphaW2(agentA), alphaW2(agentB)), addDefs(oneMinusAlphaW1(agentA), oneMinusAlphaW1(agentB)));

            } else {
                // Only Cobb-Douglas is supported for Edgeworth equilibrium
            }

            setDefaults(def, {
                label: {text: 'E'},
                color: "colors.budget"
            });

            def.utilityFunctionObject = agentA.utilityFunction;
            def.budgetLine = {
                p1: p,
                p2: 1,
                point: [agentA.x, agentA.y]
            };

            super(def, graph);

        
    



}

}

import { setDefaults } from "../../../../util";
import { setEconName } from "../../../parsers/nameRegistry";
import { PointDefinition, Point } from "../../../../KGAuthor/graphObjects/point";
import { GraphObjectGeneratorDefinition, GraphObjectGenerator } from "../../../defObjects/graphObjectGenerator";
import { EconConstantElasticityCurveDefinition, EconConstantElasticityCurve } from "./constantElasticityCurve";



    export interface EconConstantElasticityEquilibriumDefinition extends GraphObjectGeneratorDefinition {
        demand: EconConstantElasticityCurveDefinition;
        supply: EconConstantElasticityCurveDefinition;
        equilibrium?: PointDefinition;
        showCS?: any;
        showPS?: any;
    }

    export class EconConstantElasticityEquilibrium extends GraphObjectGenerator {

        public demand: EconConstantElasticityCurve;
        public supply: EconConstantElasticityCurve;
        public Q: string;
        public P: string;

        constructor(def: EconConstantElasticityEquilibriumDefinition, graph) {

            setEconName(def, 'equilibrium');

            setDefaults(def, {
                showCS: false,
                showPS: false
            });

            super(def, graph);

            let cee = this;

            // As in EconLinearEquilibrium: the composite is not drawn, the point is,
            // so the point carries the human word. It keeps a generated name here
            // because this same def is handed on to both curves as their `point`.
            def.equilibrium.color = def.equilibrium.color || "colors.green";
            def.equilibrium.title = def.equilibrium.title || cee.title || def.name;
            const equilibrium = new Point(def.equilibrium, graph);
            cee.Q = equilibrium.x;
            cee.P = equilibrium.y;

            def.demand.point = def.equilibrium;
            def.demand.name = def.name + "dem";
            def.demand.color = "colors.demand";
            const demand = new EconConstantElasticityCurve(def.demand, graph)
            cee.subObjects.push(demand);

            def.supply.point = def.equilibrium;
            def.supply.name = def.name + "sup";
            def.supply.color = "colors.supply";
            const supply = new EconConstantElasticityCurve(def.supply, graph)
            cee.subObjects.push(supply);

        }

        parseSelf(parsedData) {
            let cee = this;
            parsedData = super.parseSelf(parsedData);
            parsedData.calcs[cee.name] = {
                Q: cee.Q.toString(),
                P: cee.P.toString()
            };

            return parsedData;
        

    



}

}

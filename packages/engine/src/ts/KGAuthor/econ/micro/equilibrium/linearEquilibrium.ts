import { setDefaults } from "../../../../util";
import { PointDefinition, Point } from "../../../../KGAuthor/graphObjects/point";
import { GraphObjectGenerator } from "../../../defObjects/graphObjectGenerator";
import { lineIntersection } from "../../../graphObjects/line";
import { EconLinearDemandDefinition, EconLinearDemand } from "./linearDemand";
import { EconLinearSupplyDefinition, EconLinearSupply } from "./linearSupply";



export interface EconLinearEquilibriumDefinition {
    equilibrium: PointDefinition;

    demand: EconLinearDemandDefinition;

    supply: EconLinearSupplyDefinition;

    showCS?: any;
    showPS?: any;
}

export class EconLinearEquilibrium extends GraphObjectGenerator {

    public demand: EconLinearDemand;
    public supply: EconLinearSupply;
    public Q: string;
    public P: string;

    constructor(def: EconLinearEquilibriumDefinition, graph) {

        setDefaults(def, {
            name: 'equilibrium',
            showCS: false,
            showPS: false
        });

        super(def, graph);

        let le = this;

        def.demand.price = `calcs.${le.name}.P`;
        def.supply.price = `calcs.${le.name}.P`;

        le.demand = new EconLinearDemand(def.demand, graph);
        le.supply = new EconLinearSupply(def.supply, graph);

        le.subObjects.push(this.demand);
        le.subObjects.push(this.supply);

        let eq = lineIntersection(le.demand, le.supply);

        le.Q = eq[0];
        le.P = eq[1];

        if (graph) {

            if (def.hasOwnProperty('equilibrium')) {
                def.equilibrium = setDefaults(def.equilibrium, {
                    "color": "colors.equilibriumPrice",
                    "x": le.Q,
                    "y": le.P,
                    "droplines": {
                        "vertical": "Q^*",
                        "horizontal": "P^*"
                    }
                });
                le.subObjects.push(new Point(def.equilibrium, graph));
            }

        }


    }

    parseSelf(parsedData) {
        let le = this;
        parsedData = super.parseSelf(parsedData);
        parsedData.calcs[le.name] = {
            Q: le.Q.toString(),
            P: le.P.toString()
        };

        return parsedData;






    }

}

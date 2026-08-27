import { setDefaults } from "../../../../util";
import { setEconName } from "../../../parsers/nameRegistry";
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

        setEconName(def, 'equilibrium');

        setDefaults(def, {
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
                // The composite is not itself drawn — the point is. Narration is
                // about what moved on screen, so the point carries the human word,
                // and a name of its own so a lesson step can address it. It cannot
                // simply be called `equilibrium`: that key already holds the
                // composite's Q and P, and Point.parseSelf assigns over it.
                def.equilibrium = setDefaults(def.equilibrium, {
                    "name": le.name + "_point",
                    "title": le.title || le.name,
                    // So a step that reveals `equilibrium` reveals the point too.
                    "partOf": le.name,
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

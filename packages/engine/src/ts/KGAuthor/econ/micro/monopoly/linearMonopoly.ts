import { setDefaults } from "../../../../util";
import { setEconName } from "../../../parsers/nameRegistry";
import { PointDefinition } from "../../../../KGAuthor/graphObjects/point";
import { GraphObjectGenerator } from "../../../defObjects/graphObjectGenerator";
import { AreaDefinition, Area } from "../../../graphObjects/area";
import { lineIntersection } from "../../../graphObjects/line";
import { EconLinearDemandDefinition, EconLinearDemand } from "../equilibrium/linearDemand";
import { EconLinearMCDefinition, EconLinearMC } from "./linearMC";



export interface EconLinearMonopolyDefinition {
    demand: EconLinearDemandDefinition;
    cost: EconLinearMCDefinition;
    profitMax?: PointDefinition;
    showCS?: any;
    showPS?: any;
    showProfit?: any;

    showDWL?: any;
}

export class EconLinearMonopoly extends GraphObjectGenerator {

    public demand: EconLinearDemand;
    public cost: EconLinearMC;
    public Q: any;
    public P: any;
    public competitiveQ: any;
    public competitiveP: any;
    public MRMC: any;
    public profit: any;

    constructor(def: EconLinearMonopolyDefinition, graph) {

        setEconName(def, 'monopoly');

        setDefaults(def, {
            showCS: false,
            showPS: false,
            showProfit: false,
            showDWL: false
        });

        super(def, graph);

        let lm = this;

        // The monopoly outcome is defined by MR = MC, so the demand curve must always
        // generate its marginal revenue line; EconLinearDemand only builds one when the
        // key is present, so supply it here if the author didn't.
        def.demand.marginalRevenue = def.demand.marginalRevenue || {};

        def.demand.surplus = { show: def.showCS, price: `calcs.${lm.name}.P`, quantity: `calcs.${lm.name}.Q` };
        def.cost.surplus = { show: def.showPS, price: `calcs.${lm.name}.P`, quantity: `calcs.${lm.name}.Q` };
        lm.demand = new EconLinearDemand(def.demand, graph);
        lm.cost = new EconLinearMC(def.cost, graph);

        let intersectMRMC = lineIntersection(lm.demand.marginalRevenue, lm.cost);
        lm.Q = intersectMRMC[0];
        lm.P = lm.demand.yOfX(lm.Q);
        lm.MRMC = lm.cost.yOfX(lm.Q);

        let intersectDMC = lineIntersection(lm.demand, lm.cost);
        lm.competitiveQ = intersectDMC[0];
        lm.competitiveP = lm.demand.yOfX(lm.competitiveQ);

        if (def.hasOwnProperty('showDWL')) {
            let DWLDef: AreaDefinition = {
                show: def.showDWL,
                fill: "colors.dwl"
            }
            DWLDef.univariateFunction1 = {
                fn: lm.demand.def.univariateFunction.fn,
                min: lm.Q,
                max: lm.competitiveQ,
                samplePoints: 2
            };
            DWLDef.univariateFunction2 = {
                fn: lm.cost.def.univariateFunction.fn,
                min: lm.Q,
                max: lm.competitiveQ,
                samplePoints: 2
            };
            lm.subObjects.push(new Area(DWLDef, graph));
        }

        lm.subObjects.push(this.demand);
        lm.subObjects.push(this.cost);

    }

    parseSelf(parsedData) {
        let lm = this;
        parsedData = super.parseSelf(parsedData);
        parsedData.calcs[lm.name] = {
            Q: lm.Q.toString(),
            P: lm.P.toString(),
            competitiveQ: lm.competitiveQ.toString(),
            competitiveP: lm.competitiveP.toString()
        };

        return parsedData;






    }

}

import { setDefaults } from "../../../../../util";
import { TypeAndDef } from "../../../../../view/view";
import { CurveDefinition } from "../../../../../KGAuthor/graphObjects/curve";
import { GraphObjectGenerator } from "../../../../defObjects/graphObjectGenerator";
import { copyJSON, multiplyDefs } from "../../../../parsers/parsingFunctions";
import { EconMultivariateFunction } from "../../../functional_forms/multivariate/multivariate";
import { extractUtilityFunction } from "./bundle";



    export function extractIndifferenceCurve(def, graph) {
        if (def.hasOwnProperty('indifferenceCurveObject')) {
            return def.indifferenceCurveObject;
        }
        if (def.hasOwnProperty('indifferenceCurve')) {
            let indifferenceCurveDef = copyJSON(def.indifferenceCurve);
            indifferenceCurveDef.show = indifferenceCurveDef.show || def.show;
            indifferenceCurveDef.name = def.name + "_IC";
            return new EconIndifferenceCurve(indifferenceCurveDef, graph);
        }
    }

    export interface IndifferenceCurveDefinition extends CurveDefinition {
        utilityFunction?: TypeAndDef,
        showPreferred?: string;
        preferredColor?: string;
        showDispreferred?: string;
        dispreferredColor?: string;
        inMap?: boolean;
        showMapLevels?: boolean;
        level: string | number;
        include2d?: boolean;
        include3d?: boolean;

        // this are used if an object representing the utility function already exists
        utilityFunctionObject?: EconMultivariateFunction;

    }


    export class EconIndifferenceCurve extends GraphObjectGenerator {

        utilityFunction: EconMultivariateFunction;

        constructor(def: IndifferenceCurveDefinition, graph) {
            if (def.inMap) {
                def.strokeWidth = 1;
                def.color = 'lightgrey';
                def.layer = 0;
            }

            setDefaults(def, {
                strokeWidth: 2,
                color: 'colors.utility',
                layer: 1,
                showPreferred: false,
                showDispreferred: false,
                inMap: false,
                showMapLevels: false
            });

            if (def.inMap) {
                if (def.showMapLevels) {
                    def.label = setDefaults(def.label || {}, {
                        fontSize: 8,
                        x: multiplyDefs(0.98, graph.xScale.max),
                        text: `${def.level}.toFixed(0)`,
                        color: def.color,
                        bgcolor: null
                    });
                }
            } else {
                def.label = setDefaults(def.label || {}, {
                    x: multiplyDefs(0.95, graph.xScale.max),
                    text: "U",
                    color: def.color,
                    bgcolor: null,
                    position: 'bl'
                });
            }


            super(def, graph);
            let curve = this;
            const utilityFunction = extractUtilityFunction(def);
            curve.utilityFunction = utilityFunction;
            curve.subObjects = curve.subObjects.concat(utilityFunction.levelCurve(def, graph));

            if (!def.inMap) {
                if (!!def.showPreferred) {
                    let preferredDef = copyJSON(def);
                    //preferredDef.fill = def.preferredColor || 'colors.preferred';
                    preferredDef.fill = def.color || 'colors.preferred';
                    preferredDef.show = def.showPreferred;
                    curve.subObjects = curve.subObjects.concat(utilityFunction.areaAboveLevelCurve(preferredDef, graph));
                }
                if (!!def.showDispreferred) {
                    let dispreferredDef = copyJSON(def);
                    dispreferredDef.fill = 'colors.dispreferred';
                    dispreferredDef.show = def.showDispreferred;
                    curve.subObjects = curve.subObjects.concat(utilityFunction.areaBelowLevelCurve(dispreferredDef, graph));
                }
            }
        }
    }

    export class EconIndifferenceMap extends GraphObjectGenerator {

        constructor(def, graph) {
            super(def, graph);
            this.subObjects = def.levels.map(function (level) {
                let icDef = copyJSON(def);
                icDef.inMap = true;
                delete icDef.levels;
                if (Array.isArray(level)) {
                    icDef.point = level;
                } else {
                    icDef.level = level;
                }
                return new EconIndifferenceCurve(icDef, graph);
            })
        
    

}

}

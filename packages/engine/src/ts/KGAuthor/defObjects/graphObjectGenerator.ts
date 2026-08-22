import { AuthoringObjectDefinition, AuthoringObject } from "../parsers/authoringObject";
import { Graph } from "../positionedObjects/graph";



export interface GraphObjectGeneratorDefinition extends AuthoringObjectDefinition {
    include3d?: boolean;
}

export class GraphObjectGenerator extends AuthoringObject {

    public def: any;
    public subObjects: AuthoringObject[];

    constructor(def, graph?: Graph) {
        super(def);
        if (graph) {
            this.def.xScaleName = graph.xScale.name;
            this.def.yScaleName = graph.yScale.name;
            if (!def.inDef) {
                this.def.clipPathName = def.clipPathName || graph.clipPath.name;
            }

        }

        this.subObjects = [];
    }

    extractCoordinates(coordinatesKey?, xKey?, yKey?) {
        coordinatesKey = coordinatesKey || 'coordinates';
        xKey = xKey || 'x';
        yKey = yKey || 'y';
        let obj = this,
            def = this.def;
        if (def.hasOwnProperty(coordinatesKey) && def[coordinatesKey] != undefined) {
            def[xKey] = def[coordinatesKey][0].toString();
            def[yKey] = def[coordinatesKey][1].toString();
            delete def[coordinatesKey];
        }
        if (def[xKey] == null || def[yKey] == null) {
            console.warn(`Missing coordinate "${xKey}" or "${yKey}" on object "${def.name || 'unnamed'}".`);
            def[xKey] = def[xKey] ?? "0";
            def[yKey] = def[yKey] ?? "0";
        }
        obj[xKey] = def[xKey].toString();
        obj[yKey] = def[yKey].toString();






    }

}

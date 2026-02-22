import { randomString } from "../../model/updateListener";
import { setDefaults } from "../../util";
import { ViewDefinition } from "../../view/view";
import { GraphObjectGeneratorDefinition, GraphObjectGenerator } from "../defObjects/graphObjectGenerator";
import { GraphObject, GraphObjectDefinition } from "./graphObject";
import { Graph } from "../positionedObjects/graph";

export interface LabelDefinition extends GraphObjectDefinition {
    text: string;
    x?: any;
    y?: any;
    coordinates?: any[];
    fontSize?: number;
    xPixelOffset?: number;
    yPixelOffset?: number;
    rotate?: number;
    align?: string;
    position?: string;
}

export class Label extends GraphObject {

    public type: string;

    constructor(def: LabelDefinition, graph: Graph) {
        if (def.hasOwnProperty('position')) {
            if (def.position.toLowerCase() == 'bl') {
                def.xPixelOffset = 5;
                def.yPixelOffset = 10;
                def.align = 'left';
            }
            if (def.position.toLowerCase() == 'tr') {
                def.xPixelOffset = -5;
                def.yPixelOffset = -12;
                def.align = 'right';
            }
        }
        super(def, graph);
        this.type = 'Label';
        this.extractCoordinates();
    }

    parseSelf(parsedData: ViewDefinition) {
        parsedData.divs.push({ type: this.type, def: this.def });
        return parsedData;
    }
}

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
            const pos = def.position.toLowerCase();
            switch (pos) {
                case 'bl':
                    def.xPixelOffset = 5;
                    def.yPixelOffset = 10;
                    def.align = 'left';
                    break;
                case 'tr':
                    def.xPixelOffset = -5;
                    def.yPixelOffset = -12;
                    def.align = 'right';
                    break;
                case 'tl':
                    def.xPixelOffset = 5;
                    def.yPixelOffset = -12;
                    def.align = 'left';
                    break;
                case 'br':
                    def.xPixelOffset = -5;
                    def.yPixelOffset = 10;
                    def.align = 'right';
                    break;
                case 't':
                    def.xPixelOffset = 0;
                    def.yPixelOffset = -12;
                    def.align = 'center';
                    break;
                case 'b':
                    def.xPixelOffset = 0;
                    def.yPixelOffset = 10;
                    def.align = 'center';
                    break;
                case 'l':
                    def.xPixelOffset = 5;
                    def.yPixelOffset = 0;
                    def.align = 'left';
                    break;
                case 'r':
                    def.xPixelOffset = -5;
                    def.yPixelOffset = 0;
                    def.align = 'right';
                    break;
                default:
                    console.warn(`Unknown label position "${def.position}". Supported: bl, br, tl, tr, t, b, l, r.`);
                    break;
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

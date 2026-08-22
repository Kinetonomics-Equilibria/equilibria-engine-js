import { randomString } from "../../model/updateListener";
import { setDefaults } from "../../util";
import { ViewDefinition } from "../../view/view";
import { ClipPath } from "../defObjects/clipPath";
import { GraphObjectGeneratorDefinition, GraphObjectGenerator } from "../defObjects/graphObjectGenerator";
import { KGAuthorClasses } from "../classRegistry";



export interface GraphObjectDefinition extends GraphObjectGeneratorDefinition {
    type?: string;
    layer?: number;
    color?: string;
    fill?: string;
    opacity?: string | number;
    stroke?: string;
    strokeWidth?: string | number;
    strokeOpacity?: string | number;
    lineStyle?: string;
    drag?: any;
    click?: any;
    show?: string;
    clipPaths?: any[];
}

export class GraphObject extends GraphObjectGenerator {

    public type: string;
    public layer: number;
    public color: any;
    public clearColor: any;

    constructor(def, graph?) {

        if (def.hasOwnProperty('clipPaths')) {
            def.clipPathName = randomString(10)
        }

        setDefaults(def, {
            name: randomString(10)
        });

        super(def, graph);

        let g = this;

        if (def.hasOwnProperty('color')) {
            g.color = def.color;
        }

        if (def.hasOwnProperty("clipPaths")) {
            let clipPathObjects = def.clipPaths.map(function (shape) {
                const shapeType = Object.keys(shape)[0];
                let shapeDef = shape[shapeType];
                shapeDef.inDef = true;
                return new KGAuthorClasses[shapeType](shapeDef, graph);
            });
            g.subObjects.push(new ClipPath({ name: def.clipPathName, paths: clipPathObjects }, graph));
        }
    }

    parseSelf(parsedData: ViewDefinition) {
        parsedData.layers[this.layer].push(this);
        return parsedData;




    }

}

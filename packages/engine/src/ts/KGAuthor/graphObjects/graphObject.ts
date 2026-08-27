import { randomString } from "../../model/updateListener";
import { setDefaults } from "../../util";
import { ViewDefinition } from "../../view/view";
import { ClipPath } from "../defObjects/clipPath";
import { GraphObjectGeneratorDefinition, GraphObjectGenerator } from "../defObjects/graphObjectGenerator";
import { KGAuthorClasses } from "../classRegistry";
import { claimNameOnce } from "../parsers/nameRegistry";



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

    /**
     * The object's human name, for prose about it: "demand" where the drawn
     * label is `D` and `name` is a calc key. Defaults to `name` when the author
     * supplied one, and to a semantic word on the econ composites.
     */
    title?: string;
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

        // A name the author wrote is an address — for a lesson step, for narration,
        // for a host asking what moved — so register it and warn if two objects
        // answer to it. Objects the author did not name keep a random one and are
        // deliberately not addressable. Econ composites have already claimed
        // theirs, and `claimNameOnce` knows not to count that twice.
        if (claimNameOnce(def) && !def.hasOwnProperty('title')) {
            def.title = def.name;
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

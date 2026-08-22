import { randomString } from "../../model/updateListener";
import { setDefaults } from "../../util";
import { Label } from "./label";
import { ClipPath } from "../defObjects/clipPath";
import { setFillColor, copyJSON, averageDefs } from "../parsers/parsingFunctions";
import { GraphObject, GraphObjectDefinition } from "./graphObject";
import { KGAuthorClasses } from "../classRegistry";



export class Rectangle extends GraphObject {

    constructor(def, graph) {
        setFillColor(def);
        super(def, graph);

        let rect = this;
        rect.type = 'Rectangle';
        rect.layer = def.layer || 0;
        rect.extractCoordinates('a', 'x1', 'y1');
        rect.extractCoordinates('b', 'x2', 'y2');
        if (def.hasOwnProperty('label')) {
            let labelDef = copyJSON(def);
            delete labelDef.label;
            labelDef = setDefaults(labelDef, def.label);
            labelDef = setDefaults(labelDef, {
                fontSize: 10,
                color: def.color,
                bgcolor: null,
                x: averageDefs(rect['x1'], rect['x2']),
                y: averageDefs(rect['y1'], rect['y2'])
            });
            rect.subObjects.push(new Label(labelDef, graph));
        }
    }

}

// A contour overlap fills in the area above different contour lines

export interface OverlapDefinition extends GraphObjectDefinition {
    shapes: any[];
}

export class Overlap extends Rectangle {
    constructor(def: OverlapDefinition, graph) {
        const shape1name = randomString(10),
            shape2name = randomString(10);
        def = setFillColor(def);
        setDefaults(def, {
            x1: graph.def.xAxis.min,
            x2: graph.def.xAxis.max,
            y1: graph.def.yAxis.min,
            y2: graph.def.yAxis.max,
            clipPathName: shape1name,
            clipPathName2: shape2name
        });
        super(def, graph);

        let r = this;
        let clipPathObjects = def.shapes.map(function (shape) {
            const shapeType = Object.keys(shape)[0];
            let shapeDef = shape[shapeType];
            shapeDef.inDef = true;
            return new KGAuthorClasses[shapeType](shapeDef, graph);
        });

        // As of now this does at most two; can make more recursive in the future but this handles 80% of the use cases
        r.subObjects.push(new ClipPath({ name: shape1name, paths: [clipPathObjects[0]] }, graph));
        r.subObjects.push(new ClipPath({ name: shape2name, paths: [clipPathObjects[1]] }, graph));





    }

}

import { Graph } from "../positionedObjects/graph";
import { Tree } from "../positionedObjects/tree";
import { SquareLayout, WideRectangleLayout } from "./layout";

    export class OneGraph extends SquareLayout {

        constructor(def) {
            super(def);

            const l = this;
            let graphDef = def['graph'];

            graphDef.position = {
                "x": 0.15,
                "y": 0.025,
                "width": 0.74,
                "height": 0.9
            };

            l.subObjects.push(new Graph(graphDef));
        }
    }

    export class OneTree extends SquareLayout {

        constructor(def) {
            super(def);

            const l = this;
            let treeDef = def['tree'];

            treeDef.position = {
                "x": 0.15,
                "y": 0.025,
                "width": 0.74,
                "height": 0.9
            };

            l.subObjects.push(new Tree(treeDef));
        }
    }

    export class OneWideGraph extends WideRectangleLayout {

        constructor(def) {
            super(def);

            const l = this;
            let graphDef = def['graph'];

            graphDef.position = {
                "x": 0.15,
                "y": 0.025,
                "width": 0.74,
                "height": 0.9
            };

            l.subObjects.push(new Graph(graphDef));
        }
    }

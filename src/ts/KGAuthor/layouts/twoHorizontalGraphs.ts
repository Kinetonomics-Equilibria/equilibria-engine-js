
import { Graph } from "../positionedObjects/graph";
import { Layout } from "./layout";

class DivContainer {
    name: string; def: any; subObjects: any[]; tabbable: boolean; srTitle: string; srDesc: string;
    constructor(def) { }
    parseSelf(parsedData) { return parsedData; }
    parse(parsedData) { return parsedData; }
    addSecondGraph(graph) { }
}

export class TwoHorizontalGraphs extends Layout {

    constructor(def) {
        super(def);

        const l = this;
        let leftGraphDef = def['leftGraph'],
            rightGraphDef = def['rightGraph'];

        const leftX = 0.15,
            rightX = 0.65,
            topY = 0.1,
            bottomY = 0.9,
            width = 0.3,
            controlHeight = 0.25;

        let includeControls = false;


        if (def.hasOwnProperty('leftControls')) {

            l.subObjects.push(new DivContainer({
                position: {
                    x: leftX,
                    y: bottomY,
                    width: width,
                    height: controlHeight
                },
                children: [
                    {
                        type: "Controls",
                        def: def['leftControls']
                    }
                ]
            }));

            includeControls = true;

        }

        if (def.hasOwnProperty('rightControls')) {

            l.subObjects.push(new DivContainer({
                position: {
                    x: rightX,
                    y: bottomY,
                    width: width,
                    height: controlHeight
                },
                children: [
                    {
                        type: "Controls",
                        def: def['rightControls']
                    }
                ]
            }));

            includeControls = true;

        }

        let graphHeight = includeControls ? 0.5 : 0.9;

        this.aspectRatio = includeControls ? 2 : 4;


        leftGraphDef.position = {
            x: leftX,
            y: topY,
            width: width,
            height: graphHeight
        };

        l.subObjects.push(new Graph(leftGraphDef));

        rightGraphDef.position = {
            "x": rightX,
            "y": topY,
            "width": width,
            "height": graphHeight
        };

        l.subObjects.push(new Graph(rightGraphDef));



    }

}

export class GameMatrixPlusGraph extends Layout {

    constructor(def) {
        super(def);

        const l = this;
        let graphDef = def['graph'];

        let gameDivDef = {
            position: {
                x: 0.05,
                y: 0.1,
                width: 0.35,
                height: 0.7
            },
            children: [
                {
                    type: "GameMatrix",
                    def: def.game
                }
            ]
        };

        graphDef.position = {
            x: 0.6,
            y: 0.1,
            width: 0.35,
            height: 0.7
        };

        l.subObjects.push(new DivContainer(gameDivDef));
        l.subObjects.push(new Graph(graphDef));

    }

}

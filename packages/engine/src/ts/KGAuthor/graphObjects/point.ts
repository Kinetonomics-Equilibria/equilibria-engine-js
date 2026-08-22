import { randomString } from "../../model/updateListener";
import { setDefaults } from "../../util";
import { LabelDefinition, Label } from "./label";
import { GraphObjectGenerator } from "../defObjects/graphObjectGenerator";
import { setFillColor, makeDraggable, copyJSON } from "../parsers/parsingFunctions";
import { Graph } from "../positionedObjects/graph";
import { Tree } from "../positionedObjects/tree";
import { GraphObjectDefinition, GraphObject } from "./graphObject";
import { EdgeDefinition, Edge, Segment } from "./segment";



export interface PointDefinition extends GraphObjectDefinition {
    label?: LabelDefinition;
    draggable?: boolean;
    x?: any;
    y?: any;
    coordinates?: any[];
    droplines?: { horizontal?: string; vertical?: string; top?: string; right?: string; };
    r?: any;
}

export class Point extends GraphObject {

    public x;
    public y;
    public labelText;

    constructor(def: PointDefinition, graph) {


        setDefaults(def, {
            color: 'colors.blue'
        });

        def = setFillColor(def);

        super(def, graph);

        const p = this;
        p.type = 'Point';
        p.layer = 3;
        p.extractCoordinates();

        def = makeDraggable(def);

        if (def.hasOwnProperty('label')) {
            let labelDef = copyJSON(def);
            delete labelDef.label;
            labelDef = setDefaults(labelDef, def.label);
            labelDef = setDefaults(labelDef, {
                fontSize: 10,
                position: 'bl',
                color: def.color,
                bgcolor: null
            });
            p.subObjects.push(new Label(labelDef, graph));
        }

        if (def.hasOwnProperty('droplines')) {
            if (def.droplines.hasOwnProperty('vertical')) {
                let verticalDroplineDef = copyJSON(def);

                // only drag vertical droplines horizontally
                if (verticalDroplineDef.hasOwnProperty('drag')) {
                    verticalDroplineDef.drag = verticalDroplineDef.drag.filter(function (value, index, arr) { return ((value.directions == 'x') || value.hasOwnProperty('horizontal')) });
                }

                if (def.droplines.hasOwnProperty('top')) {
                    verticalDroplineDef.y = graph.yScale.max;
                    let xTopAxisLabelDef = copyJSON(verticalDroplineDef);
                    xTopAxisLabelDef.y = 'OPPAXIS';
                    setDefaults(xTopAxisLabelDef, {
                        text: def.droplines.top,
                        fontSize: 10
                    });
                    p.subObjects.push(new Label(xTopAxisLabelDef, graph));
                }
                verticalDroplineDef.lineStyle = 'dotted';
                delete verticalDroplineDef.label;
                verticalDroplineDef.a = [verticalDroplineDef.x, graph.xScale.intercept];
                verticalDroplineDef.b = [verticalDroplineDef.x, verticalDroplineDef.y];
                p.subObjects.push(new Segment(verticalDroplineDef, graph));
                let xAxisLabelDef = copyJSON(verticalDroplineDef);
                xAxisLabelDef.y = 'AXIS';
                setDefaults(xAxisLabelDef, {
                    text: def.droplines.vertical,
                    fontSize: 10
                });
                p.subObjects.push(new Label(xAxisLabelDef, graph));
            }
            if (def.droplines.hasOwnProperty('horizontal')) {
                let horizontalDroplineDef = copyJSON(def);

                // only drag horizontal droplines vertically
                if (horizontalDroplineDef.hasOwnProperty('drag')) {
                    horizontalDroplineDef.drag = horizontalDroplineDef.drag.filter(function (value, index, arr) { return ((value.directions == 'y') || value.hasOwnProperty('vertical')) });
                }

                horizontalDroplineDef.lineStyle = 'dotted';
                delete horizontalDroplineDef.label;
                horizontalDroplineDef.a = [graph.yScale.intercept, horizontalDroplineDef.y];
                horizontalDroplineDef.b = [horizontalDroplineDef.x, horizontalDroplineDef.y];
                p.subObjects.push(new Segment(horizontalDroplineDef, graph));

                let yAxisLabelDef = copyJSON(horizontalDroplineDef);
                yAxisLabelDef.x = 'AXIS';
                setDefaults(yAxisLabelDef, {
                    text: def.droplines.horizontal,
                    fontSize: 10
                });
                p.subObjects.push(new Label(yAxisLabelDef, graph));
            }
        }

    }

    parseSelf(parsedData) {
        let p = this;
        parsedData = super.parseSelf(parsedData);
        parsedData.calcs[p.name] = {
            x: p.x.toString(),
            y: p.y.toString()
        };

        return parsedData;
    }

}



export class Points extends GraphObjectGenerator {

    constructor(def: PointDefinition, graph: Graph) {
        super(def, graph);

        const ps = this;
        const coordinateArray = def.coordinates;

        coordinateArray.forEach(function (c: any[]) {
            const pointDef = JSON.parse(JSON.stringify(def));
            pointDef.coordinates = c;
            ps.subObjects.push(new Point(pointDef, graph));
        })
    }


}

export interface PayoffDefinition {
    player1: string;
    player2: string;
    position?: string;
}

export interface NodeDefinition extends PointDefinition {
    name: string;
    children?: NodeDefinition[];
    childSelectParam?: string;
    edgeLabel?: string; // used to label the edge from the parent node
    payoffs?: PayoffDefinition;
}

export class Node extends Point {

    public name;
    private selectChildren;

    constructor(def: NodeDefinition, tree: Tree) {
        setDefaults(def, {
            name: randomString(10)
        })
        if (def.hasOwnProperty('payoffs')) {
            const payoff1: string = "\\\\color{${colors.player1}}{" + def.payoffs.player1 + "}"
            const comma: string = "\\\\color{black}{,\\\\ }"
            const payoff2: string = "\\\\color{${colors.player2}}{" + def.payoffs.player2 + "}"
            def.label = {
                text: "`" + payoff1 + comma + payoff2 + "`",
                position: def.payoffs.position || 'l',
                fontSize: 14
            }
        }
        super(def, tree);
        const node = this;
        tree.nodeCoordinates[def.name] = [node.x, node.y];
        node.name = def.name;



        if (def.hasOwnProperty('children')) {
            const n = def.children.length;
            for (let i = 0; i < n; i++) {
                const childNum = i + 1 // number of child, with first being 1 rather than 0;
                let nodeDef: NodeDefinition = def.children[i];
                setDefaults(nodeDef, {
                    name: randomString(10)
                })
                let edgeDef: EdgeDefinition = {
                    node1: def.name,
                    node2: nodeDef.name,
                    color: def.color,
                    label: { text: nodeDef.edgeLabel, x: 0, y: 0 }
                };

                // if selectChildren is true, create a parameter called "select[nodeName]"
                // which is used to select which child is active
                // when true, clicking on an edge selects that edge
                // unless the edge is already selected, in which case no edge is selected
                if (def.hasOwnProperty('childSelectParam')) {
                    let param = def.childSelectParam;
                    let transitions = new Array(n + 1);
                    transitions[0] = childNum;
                    for (let j = 1; j < n + 1; j++) {
                        transitions[j] = (j == childNum) ? 0 : childNum;
                    }
                    edgeDef['click'] = [{
                        param: param,
                        transitions: transitions
                    }]
                    edgeDef['strokeWidth'] = `((params.${def.childSelectParam} == ${childNum}) ? 6 : 2)`
                }

                tree.subObjects.push(new Node(nodeDef, tree));
                tree.subObjects.push(new Edge(edgeDef, tree));
            }
        }





    }

}

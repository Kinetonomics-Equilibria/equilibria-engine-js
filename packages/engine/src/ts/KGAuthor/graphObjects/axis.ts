import { setDefaults } from "../../util";
import { Label } from "./label";
import { averageDefs } from "../parsers/parsingFunctions";
import { GraphObject } from "./graphObject";



/**
 * What kind of chrome a label is, for anything that removes chrome.
 *
 * Every drawn `Label` is text, so density needs no marker to find them — but it
 * does need to tell an axis *title* from a curve's name, because the two go at
 * different levels. Stamped here rather than inferred later: this is the only
 * place an axis title is built, and a rule that guessed from position or text
 * would be wrong the first time an author put a label near an axis.
 */
export const AXIS_TITLE = 'axisTitle';

export class Axis extends GraphObject {

    constructor(def, graph) {
        setDefaults(def, {
            yPixelOffset: 40,
            xPixelOffset: 40
        })
        super(def, graph);
        let a = this;
        a.type = 'Axis';
        a.layer = 2;

        if (def.hasOwnProperty('title') && ("" != def.title)) {
            if (def.orient == 'bottom') {
                a.subObjects.push(new Label({
                    text: `\\text{${def.title}}`,
                    //text: def.title,
                    //plainText: true,
                    furniture: AXIS_TITLE,
                    x: averageDefs(graph.xScale.min, graph.xScale.max),
                    y: graph.yScale.min,
                    yPixelOffset: -1 * def.yPixelOffset
                }, graph))
            }

            else if (def.orient == 'left') {
                a.subObjects.push(new Label({
                    text: `\\text{${def.title}}`,
                    //text: def.title,
                    //plainText: true,
                    furniture: AXIS_TITLE,
                    x: graph.xScale.min,
                    y: averageDefs(graph.yScale.min, graph.yScale.max),
                    xPixelOffset: -1 * def.xPixelOffset,
                    rotate: 90
                }, graph))
            }
            else if (def.orient == 'top') {
                a.subObjects.push(new Label({
                    text: `\\text{${def.title}}`,
                    furniture: AXIS_TITLE,
                    x: averageDefs(graph.xScale.min, graph.xScale.max),
                    y: graph.yScale.min,
                    yPixelOffset: def.yPixelOffset
                }, graph))
            } else {
                a.subObjects.push(new Label({
                    text: `\\text{${def.title}}`,
                    furniture: AXIS_TITLE,
                    x: graph.xScale.min,
                    y: averageDefs(graph.yScale.min, graph.yScale.max),
                    xPixelOffset: def.xPixelOffset,
                    rotate: 270
                }, graph));
            }
        }





    }

}

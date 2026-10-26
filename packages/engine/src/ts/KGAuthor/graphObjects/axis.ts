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
        // How far a title sits from its axis, clear of the tick numbers and a
        // dropline's label between them. Further from a vertical one, because
        // its tick numbers run sideways from it: at 14px, "0.70" on the A$
        // market's rate axis reaches 39px out, and a 16px title turned on its
        // side is about 12px either side of where it is put. Under the x axis
        // the ticks and `Q*` reach 24px down.
        setDefaults(def, {
            yPixelOffset: 44,
            xPixelOffset: 56
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

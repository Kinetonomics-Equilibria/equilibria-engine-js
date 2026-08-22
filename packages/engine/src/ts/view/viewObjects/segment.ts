import { setDefaults, setProperties } from "../../util";
import { Scale } from "../scale";
import { ViewObjectDefinition, ViewObject } from "./viewObject";



export interface SegmentDefinition extends ViewObjectDefinition {
    x1: any;
    y1: any;
    x2: any;
    y2: any;
    xScale2?: Scale;
    yScale2?: Scale;
}

export class Segment extends ViewObject {

    private xScale2: Scale;
    private yScale2: Scale;

    private x1;
    private y1;
    private x2;
    private y2;

    private dragLine;
    private line;

    constructor(def: SegmentDefinition) {
        setDefaults(def, {
            xScale2: def.xScale,
            yScale2: def.yScale,
            strokeWidth: 2
        });
        setProperties(def, 'constants', ['xScale2', 'yScale2', 'startArrow', 'endArrow']);
        setProperties(def, 'updatables', ['x1', 'y1', 'x2', 'y2']);
        super(def);
    }

    // create SVG elements
    draw(layer) {
        let segment = this;
        segment.rootElement = layer.selectAll('g.rootElement-' + segment.id).data([1]).join('g').attr('class', 'rootElement-' + segment.id);
        segment.dragLine = segment.rootElement.selectAll('line.dragLine-' + segment.id).data([1]).join('line').attr('class', 'dragLine-' + segment.id).attr('stroke-width', '20px').style('stroke', 'yellow').style('stroke-opacity', 0);
        segment.line = segment.rootElement.selectAll('line.line-' + segment.id).data([1]).join('line').attr('class', 'line-' + segment.id);
        segment.markedElement = segment.line;
        return segment.addClipPathAndArrows().addInteraction();
    }

    // update properties
    redraw() {
        let segment = this;
        const x1 = segment.xScale.scale(segment.x1),
            x2 = segment.xScale.scale(segment.x2),
            y1 = segment.yScale2.scale(segment.y1),
            y2 = segment.yScale2.scale(segment.y2);
        segment.dragLine
            .attr("x1", x1)
            .attr("y1", y1)
            .attr("x2", x2)
            .attr("y2", y2);
        segment.line
            .attr("x1", x1)
            .attr("y1", y1)
            .attr("x2", x2)
            .attr("y2", y2);
        segment.drawStroke(segment.line);
        return segment;
    }



}

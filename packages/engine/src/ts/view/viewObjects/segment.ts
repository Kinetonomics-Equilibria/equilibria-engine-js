import { setDefaults, setProperties } from "../../util";
import { Sample } from "../movement";
import { Scale } from "../scale";
import { ViewObjectDefinition, ViewObject, LINE_WEIGHT } from "./viewObject";
import { ARRIVAL, DROP_DELAY_MS, DROP_MS, dropEase } from "../arrival";



export interface SegmentDefinition extends ViewObjectDefinition {
    x1: any;
    y1: any;
    x2: any;
    y2: any;
    xScale2?: Scale;
    yScale2?: Scale;
    /**
     * Draw the segment this many pixels to one side of where it is, parallel
     * to itself.
     *
     * For an arrow describing a move *along* a curve, like a ghost's joining
     * the old equilibrium to the new: both its ends are on that curve, so drawn
     * where it is it lies exactly on top of the line it is describing.
     * Measured in pixels rather than data units because the gap is a matter of
     * legibility, not of economics: the same gap whatever the axes' ranges, and
     * the same on a steep curve as on a flat one.
     *
     * Always to the side that is *up* the screen (rightward for a vertical
     * segment), not to the left or right of travel. A student dragging back and
     * forth reverses the arrow every time, and an arrow keyed to its own
     * direction would hop across the curve with each reversal.
     */
    offset?: number;
    /**
     * Stop this many pixels short of each end.
     *
     * An offset arrow ending level with the point it is describing has its
     * head beside that point, which is where every other line through it
     * passes: the curve that crossed there, the droplines. Each of them cuts
     * the offset shaft within a few pixels of the end, so an arrow that stops
     * short of both ends runs alongside the move without touching any of them.
     *
     * Never so far that less than `INSET_KEEPS` pixels remain. A move too short
     * to inset keeps what length it has rather than shrinking to a bare head,
     * or turning round.
     */
    inset?: number;
}

/** The shortest a segment is inset to: an arrowhead and a little shaft. */
const INSET_KEEPS = 16;

export class Segment extends ViewObject {

    private xScale2: Scale;
    private yScale2: Scale;

    private x1;
    private y1;
    private x2;
    private y2;
    private offset;
    private inset;

    private dragLine;
    private line;

    constructor(def: SegmentDefinition) {
        setDefaults(def, {
            xScale2: def.xScale,
            yScale2: def.yScale,
            strokeWidth: LINE_WEIGHT
        });
        setProperties(def, 'constants', ['xScale2', 'yScale2', 'startArrow', 'endArrow', 'offset', 'inset']);
        setProperties(def, 'updatables', ['x1', 'y1', 'x2', 'y2']);
        super(def);
    }

    sampleGeometry(): Sample[] | null {
        const s = this;
        return [{ x: +s.x1, y: +s.y1 }, { x: +s.x2, y: +s.y2 }];
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
        let x1 = segment.xScale.scale(segment.x1),
            x2 = segment.xScale.scale(segment.x2),
            y1 = segment.yScale2.scale(segment.y1),
            y2 = segment.yScale2.scale(segment.y2);
        const [ox, oy] = offsetVector(x2 - x1, y2 - y1, +segment.offset || 0);
        const [ix, iy] = insetVector(x2 - x1, y2 - y1, +segment.inset || 0);
        x1 += ox + ix; x2 += ox - ix;
        y1 += oy + iy; y2 += oy - iy;
        segment.line.interrupt(ARRIVAL);
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

    // Drawn out from one end, `a` or the `b` that `arrive` names: the end it
    // grows from stays put and the other starts on top of it. A dropline
    // grows from its point, after the point's own pop has mostly played.
    drawArrival() {
        let segment = this;
        const line = segment.line,
            [from, to] = segment.arrive == 'b' ? ['2', '1'] : ['1', '2'],
            x = +line.attr('x' + to),
            y = +line.attr('y' + to);
        line.attr('x' + to, +line.attr('x' + from)).attr('y' + to, +line.attr('y' + from))
            .transition(ARRIVAL).delay(DROP_DELAY_MS).duration(DROP_MS).ease(dropEase)
            .attr('x' + to, x).attr('y' + to, y);
        return segment;
    }



}

/**
 * The pixel shift that puts a segment running (dx, dy) `distance` above itself.
 *
 * Screen y grows downward, so "above" is the normal with negative y. A
 * vertical segment has no above and goes right; a zero-length one, which has
 * no direction to be perpendicular to, stays where it is.
 */
export function offsetVector(dx: number, dy: number, distance: number): [number, number] {
    const length = Math.sqrt(dx * dx + dy * dy);
    if (!distance || !(length > 0)) return [0, 0];
    let nx = dy / length, ny = -dx / length;
    if (ny > 0 || (ny === 0 && nx < 0)) {
        nx = -nx;
        ny = -ny;
    }
    return [nx * distance, ny * distance];
}

/**
 * How far to move the start of a segment running (dx, dy) along itself so that
 * it stops `distance` short at each end — or less, so that `INSET_KEEPS` is
 * left. The end moves back by the same amount.
 */
export function insetVector(dx: number, dy: number, distance: number): [number, number] {
    const length = Math.sqrt(dx * dx + dy * dy);
    if (!distance || !(length > 0)) return [0, 0];
    const inset = Math.max(0, Math.min(distance, (length - INSET_KEEPS) / 2));
    return [dx / length * inset, dy / length * inset];
}

import { setDefaults, setProperties } from "../../util";
import { Sample } from "../movement";
import { ViewObjectDefinition, ViewObject } from "./viewObject";
import { ARRIVAL, POP_MS, popEase } from "../arrival";



    export interface PointDefinition extends ViewObjectDefinition {
        x: any;
        y: any;
        r?: any;
        labelText?: string;
    }

    export class Point extends ViewObject {

        // SVG elements
        private dragCircle;
        private circle;

        // properties
        private x;
        private y;
        private r;

        constructor(def: PointDefinition) {

            if(def.hasOwnProperty('label') && !def.hasOwnProperty('srTitle')) {
                def.srTitle = `Point ${def['label']['text']}`
            }
            setDefaults(def, {
                fill: 'colors.blue',
                opacity: 1,
                stroke: 'white',
                // A point is half again as wide as it was, to stand out from
                // 3px curves on a projector (`LINE_WEIGHT`), and its white ring
                // is wider with it, to keep the curve under it off its edge.
                strokeWidth: 1.5,
                strokeOpacity: 1,
                r: 7
            });
            setProperties(def, 'updatables',['x', 'y', 'r']);
            super(def);
        }

        sampleGeometry(): Sample[] | null {
            const p = this;
            return [{ x: +p.x, y: +p.y }];
        }

        /** Where the point is drawn, in its panel's pixels, and its radius. */
        pixelCircle(): { at: [number, number], r: number } {
            const p = this;
            return { at: [p.xScale.scale(+p.x), p.yScale.scale(+p.y)], r: +p.r };
        }

        // create SVG elements
        draw(layer) {
            let p = this;
            p.rootElement = layer.selectAll('g.rootElement-' + p.id).data([1]).join('g').attr('class', 'rootElement-' + p.id); // SVG group
            p.dragCircle = p.rootElement.selectAll('circle.dragCircle-' + p.id).data([1]).join('circle').attr('class', 'dragCircle-' + p.id).style('fill','yellow').style('fill-opacity', 0).attr('r', 20);
            p.circle = p.rootElement.selectAll('circle.circle-' + p.id).data([1]).join('circle').attr('class', 'circle-' + p.id);
            //p.addClipPathAndArrows()
            p.addScreenReaderDescriptions(p.circle);
            p.addHandle();
            //p.rootElement.on("focus", function() {p.dragCircle.style('fill-opacity','30%')});
            //p.rootElement.on("blur", function() {p.dragCircle.style('fill-opacity',0)});
            return p.addInteraction();
        }

        // update properties
        redraw() {
            let p = this;
            p.updateScreenReaderDescriptions();
            p.rootElement.attr('transform', `translate(${p.xScale.scale(p.x)} ${p.yScale.scale(p.y)})`);
            p.circle.interrupt(ARRIVAL);
            p.circle.attr('r', p.r);
            p.circle.style('fill', p.fill);
            p.circle.style('fill-opacity', p.opacity);
            p.circle.style('stroke', p.stroke);
            p.circle.style('stroke-width', `${p.drawnStrokeWidth()}px`);
            p.circle.style('stroke-opacity', p.strokeOpacity);
            return p;
        }

        // A pop: from nothing to its size, a little past it and back.
        drawArrival() {
            let p = this;
            p.circle.attr('r', 0)
                .transition(ARRIVAL).duration(POP_MS).ease(popEase)
                .attr('r', p.r);
            return p;
        }
    



}

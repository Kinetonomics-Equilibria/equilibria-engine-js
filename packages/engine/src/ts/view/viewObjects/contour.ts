/// <reference path='../../kg.ts' />

import { MultivariateFunction } from "../../math/multivariateFunction";
import { setDefaults, setProperties } from "../../util";
import { AreaDefinition } from "./area";
import { ViewObjectDefinition, ViewObject } from "./viewObject";



export interface ContourDefinition extends ViewObjectDefinition {
    fn: string;
    level: any;
    fillAbove?: AreaDefinition;
    fillBelow?: AreaDefinition;
    xMin?: any;
    xMax?: any;
    yMin?: any;
    yMax?: any;
}

export class Contour extends ViewObject {

    private path;
    private negativePath;

    public fn: MultivariateFunction;
    public negativeFn: MultivariateFunction;
    public level;

    private fillAbove;
    private fillBelow;
    private xMin;
    private xMax;
    private yMin;
    private yMax;

    constructor(def: ContourDefinition) {
        setDefaults(def, {
            opacity: 0.2,
            stroke: "grey",
            fillAbove: "none",
            fillBelow: "none",
            strokeOpacity: 1
        });
        setProperties(def, 'colorAttributes', ['fillAbove', 'fillBelow']);
        setProperties(def, 'updatables', ['level', 'fillBelow', 'fillAbove', 'xMin', 'xMax', 'yMin', 'yMax']);
        super(def);

        // used for shading area above
        this.fn = new MultivariateFunction({
            fn: def.fn,
            model: def.model
        }).update(true);

        // used for shading area below
        this.negativeFn = new MultivariateFunction({
            fn: `-1*(${def.fn})`,
            model: def.model
        }).update(true);
    }

    draw(layer) {
        let c = this;
        if (c.inDef) {
            c.rootElement = layer.selectAll('path.rootElement-' + c.id).data([1]).join('path').attr('class', 'rootElement-' + c.id);
            c.path = c.rootElement;
        } else {
            c.rootElement = layer.selectAll('g.rootElement-' + c.id).data([1]).join('g').attr('class', 'rootElement-' + c.id);
            c.negativePath = c.rootElement.selectAll('path.negativePath-' + c.id).data([1]).join('path').attr('class', 'negativePath-' + c.id);
            c.path = c.rootElement.selectAll('path.path-' + c.id).data([1]).join('path').attr('class', 'path-' + c.id);
        }

        return c.addClipPathAndArrows();
    }

    redraw() {
        let c = this;
        if (undefined != c.fn) {
            let bounds = {};
            ['xMin', 'xMax', 'yMin', 'yMax'].forEach(function (p) {
                if (c.hasOwnProperty(p) && c[p] != undefined) {
                    bounds[p] = c[p];
                }
            });
            c.path.attr("d", c.fn.contour(c.level, c.xScale, c.yScale, bounds));

            if (!c.inDef) {
                c.path.style('fill', c.fillAbove);
                c.path.style('fill-opacity', c.opacity);
                c.path.style('stroke', c.stroke);
                c.path.style('stroke-width', c.strokeWidth);
                c.path.style('stroke-opacity', c.strokeOpacity);

                c.negativePath.attr("d", c.negativeFn.contour(-1 * c.level, c.xScale, c.yScale));
                c.negativePath.style('fill', c.fillBelow);
                c.negativePath.style('fill-opacity', c.opacity);
            }

        }
        return c;
    }

    // update self and functions
    update(force) {
        let c = super.update(force);
        if (!c.hasChanged) {
            if (c.fn.hasChanged) {
                c.redraw();
            }
        }
        return c;
    }

}

export class ContourMap extends ViewObject {

    constructor(def) {
        super(def);
    }



}

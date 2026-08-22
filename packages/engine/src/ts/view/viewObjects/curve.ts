/// <reference path='../../kg.ts' />

import * as d3 from "d3";
import { ParametricFunctionDefinition, ParametricFunction } from "../../math/parametricFunction";
import { UnivariateFunctionDefinition, UnivariateFunction } from "../../math/univariateFunction";
import { ViewObjectDefinition, ViewObject } from "./viewObject";
import { setDefaults, setProperties } from "../../util";



export interface CurveDefinition extends ViewObjectDefinition {
    univariateFunction?: UnivariateFunctionDefinition;
    parametricFunction?: ParametricFunctionDefinition;
}

export class Curve extends ViewObject {

    private dataLine;

    private dragPath;
    private path;
    private interpolation;
    private univariateFunction: UnivariateFunction;
    private parametricFunction: ParametricFunction;

    constructor(def: CurveDefinition) {
        let univariateFunction, parametricFunction;
        setDefaults(def, {
            interpolation: 'curveBasis',
            strokeWidth: 2
        });
        setProperties(def, 'constants', ['interpolation']);
        if (def.hasOwnProperty('univariateFunction')) {
            def.univariateFunction.model = def.model;
            univariateFunction = new UnivariateFunction(def.univariateFunction);
            setProperties(def, 'updatables', [])
        } else if (def.hasOwnProperty('parametricFunction')) {
            def.parametricFunction.model = def.model;
            parametricFunction = new ParametricFunction(def.parametricFunction);
            setProperties(def, 'updatables', [])
        }
        super(def);
        let curve = this;
        if (def.hasOwnProperty('univariateFunction')) {
            curve.univariateFunction = univariateFunction;
        } else if (def.hasOwnProperty('parametricFunction')) {
            def.parametricFunction.model = def.model;
            curve.parametricFunction = parametricFunction;
        }

    }

    // create SVG elements
    draw(layer) {
        let curve = this;

        curve.dataLine = d3.line()
            .curve(d3[curve.interpolation])
            .x(function (d: any) {
                return curve.xScale.scale(d.x)
            })
            .y(function (d: any) {
                return curve.yScale.scale(d.y)
            });

        curve.rootElement = layer.selectAll('g.rootElement-' + curve.id).data([1]).join('g').attr('class', 'rootElement-' + curve.id);
        curve.dragPath = curve.rootElement.selectAll('path.dragPath-' + curve.id).data([1]).join('path').attr('class', 'dragPath-' + curve.id).attr('stroke-width', '20px').style('stroke', 'yellow').style('stroke-opacity', 0).style('fill', 'none');
        curve.path = curve.rootElement.selectAll('path.path-' + curve.id).data([1]).join('path').attr('class', 'path-' + curve.id).style('fill', 'none');
        curve.addScreenReaderDescriptions(curve.path);
        curve.path.on("focus", function () { curve.dragPath.style('fill', 'yellow') });
        curve.path.on("blur", function () { curve.dragPath.style('fill', 'none') });
        return curve.addClipPathAndArrows().addInteraction();
    }

    // update properties
    redraw() {
        let curve = this;
        if (curve.univariateFunction != undefined) {
            const fn = curve.univariateFunction,
                scale = fn.ind == 'y' ? curve.yScale : curve.xScale;
            fn.generateData(scale.domainMin, scale.domainMax);
            curve.dragPath.data([fn.data]).attr('d', curve.dataLine);
            curve.path.data([fn.data]).attr('d', curve.dataLine);
        }
        if (curve.parametricFunction != undefined) {
            const fn = curve.parametricFunction;
            fn.generateData();
            curve.dragPath.data([fn.data]).attr('d', curve.dataLine);
            curve.path.data([fn.data]).attr('d', curve.dataLine);
        }
        curve.drawStroke(curve.path);
        return curve;
    }

    // update self and functions
    update(force) {
        let curve = super.update(force);
        if (!curve.hasChanged) {
            if (curve.univariateFunction != undefined) {
                if (curve.univariateFunction.hasChanged) {
                    curve.redraw();
                }
            }
            if (curve.parametricFunction != undefined) {
                if (curve.parametricFunction.hasChanged) {
                    curve.redraw();
                }
            }
        }
        return curve;
    }




}

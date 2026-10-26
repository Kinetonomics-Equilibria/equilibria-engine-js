import { ParametricFunctionDefinition, ParametricFunction } from "../../math/parametricFunction";
import { SYMBOL_SIZE } from "../../view/typeScale";
import { UnivariateFunctionDefinition, UnivariateFunction } from "../../math/univariateFunction";
import { setDefaults } from "../../util";
import { LabelDefinition, Label } from "./label";
import { setStrokeColor, parseFn, parseFill, copyJSON, replaceVariable } from "../parsers/parsingFunctions";
import { AreaDefinition, Area } from "./area";
import { GraphObjectDefinition, GraphObject } from "./graphObject";
import { anonymizeCopy } from "../parsers/nameRegistry";



export interface CurveDefinition extends GraphObjectDefinition {
    label?: LabelDefinition
    fn?: string;
    xFn?: string;
    yFn?: string;
    univariateFunction?: UnivariateFunctionDefinition;
    parametricFunction?: ParametricFunctionDefinition;
    pts?: { name: string; x?: string; y?: string; }[];
    areaBelow?: string | AreaDefinition;
    areaAbove?: string | AreaDefinition;
}

/**
 * The curve a label sits on, as a function of the coordinate the label was placed by.
 *
 * Handed to the label so that it can slide along the curve when the place it was
 * put is off the plot (see `Label.slide` in the view). The same two strings
 * `yOfX` and `xOfY` substitute into, so the label and its coordinates cannot
 * describe different curves. The range is passed only when it is a range of the
 * label's own coordinate: a line drawn over `x` in [2, 10] says nothing about
 * where along `y` a label placed by `y` may go.
 */
function along(fn: UnivariateFunctionDefinition, by: 'x' | 'y'): UnivariateFunctionDefinition {
    const sameAxis = (by === 'y') === (fn.ind === 'y');
    const out: UnivariateFunctionDefinition = {
        fn: (by === 'y' && fn.yFn) ? fn.yFn : fn.fn,
        ind: by
    };
    if (sameAxis && fn.min !== undefined) out.min = fn.min;
    if (sameAxis && fn.max !== undefined) out.max = fn.max;
    return out;
}

export class Curve extends GraphObject {

    public pts: string[];
    public univariateFunction: UnivariateFunction;
    public parametricFunction: ParametricFunction;


    constructor(def, graph) {
        def = setStrokeColor(def);

        parseFn(def, 'fn', 'univariateFunction');
        parseFn(def, 'xFn', 'parametricFunction');

        super(def, graph);

        const c = this;
        c.type = 'Curve';
        c.layer = def.layer || 1;
        c.pts = def.pts || [];

        if (def.hasOwnProperty('areaBelow')) {
            setDefaults(def.areaBelow, {
                color: def.color
            });
            parseFill(def, 'areaBelow');
            setDefaults(def.areaBelow, def.univariateFunction);
            parseFn(def.areaBelow, 'fn', 'univariateFunction1');
            c.subObjects.push(new Area(def.areaBelow, graph));
        }

        if (def.hasOwnProperty('areaAbove')) {
            setDefaults(def.areaAbove, {
                color: def.color
            });
            parseFill(def, 'areaAbove');
            setDefaults(def.areaAbove, def.univariateFunction);
            parseFn(def.areaAbove, 'fn', 'univariateFunction1');
            def.areaAbove.above = true;
            c.subObjects.push(new Area(def.areaAbove, graph));
        }

        if (def.hasOwnProperty('label')) {
            let labelDef = anonymizeCopy(copyJSON(def));
            delete labelDef.label;
            labelDef = setDefaults(labelDef, def.label);
            labelDef = setDefaults(labelDef, {
                fontSize: SYMBOL_SIZE,
                color: def.color
            });
            if (def.hasOwnProperty('univariateFunction')) {
                if (labelDef.hasOwnProperty('x') && def.univariateFunction.ind != 'y') {
                    labelDef.coordinates = [labelDef.x, c.yOfX(labelDef.x)];
                    labelDef.along = along(def.univariateFunction, 'x');
                    c.subObjects.push(new Label(labelDef, graph));
                } else if (labelDef.hasOwnProperty('y') && def.univariateFunction.ind != 'x') {
                    labelDef.coordinates = [c.xOfY(labelDef.y), labelDef.y];
                    labelDef.along = along(def.univariateFunction, 'y');
                    c.subObjects.push(new Label(labelDef, graph));
                }
            }
            if (def.hasOwnProperty('parametricFunction')) {
                if (labelDef.hasOwnProperty('t')) {
                    labelDef.coordinates = c.xyOfT(labelDef.t);
                    c.subObjects.push(new Label(labelDef, graph));
                }
            }
        }
    }

    yOfX(x) {
        return `(${replaceVariable(this.def.univariateFunction.fn, '(x)', `(${x})`)})`
    }

    xOfY(y) {
        const c = this;
        if (c.def.univariateFunction.hasOwnProperty('yFn')) {
            return `(${replaceVariable(c.def.univariateFunction.yFn, '(y)', `(${y})`)})`
        } else {
            return `(${replaceVariable(c.def.univariateFunction.fn, '(y)', `(${y})`)})`
        }

    }

    xyOfT(t) {
        return [
            replaceVariable(this.def.parametricFunction.xFunction, '(t)', `(${t})`),
            replaceVariable(this.def.parametricFunction.yFunction, '(t)', `(${t})`)
        ]
    }

    parseSelf(parsedData) {
        let c = this;
        parsedData = super.parseSelf(parsedData);
        parsedData.calcs[c.name] = parsedData.calcs[c.name] || {};
        c.pts.forEach(function (p) {
            if (p.hasOwnProperty('x')) {
                parsedData.calcs[c.name][p['name']] = {
                    x: p['x'],
                    y: c.yOfX(p['x'])
                }
            }
            if (p.hasOwnProperty('y')) {
                parsedData.calcs[c.name][p['name']] = {
                    x: c.xOfY(p['y']),
                    y: p['y']
                }
            }
        });
        return parsedData;





    }

}

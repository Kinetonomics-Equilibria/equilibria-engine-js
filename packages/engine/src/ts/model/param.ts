import * as d3 from "d3";
import { setDefaults } from "../util";



export interface ParamDefinition {
    name: string;     // how to refer to this parameter; e.g. if name is "x", you would refer to this as "params.x"
    label: string;    // what to label a slider that controls this param
    value: any;       // initial value (either a number or true/false)
    min?: any;        // if param is a number, lowest acceptable value; also sets left bound of a slider
    max?: any;        // ditto for max
    round?: any;      // interval to snap to as user changes 
    precision?: any;  // number of decimal places to display value to; automatically sets itself based on "round" - i.e., if round = 0.01 then precision will automatically choose 2 decimal places

    /**
     * Set by `View.parse`, not by an author: this param's value was declared as
     * a boolean and has since been coerced to 0/1. See `ParamInfo.isBoolean`.
     */
    isBoolean?: boolean;

    /**
     * True when this param says how the diagram is *shown* rather than what it
     * shows: a panel's density level, which panel a host has focused.
     *
     * The distinction is not cosmetic. `prev.changed` is "has the student moved
     * anything", and it gates every ghost and shift arrow an author draws. A
     * panel resizing itself, or a host promoting one, would otherwise light all
     * of them up before the student had touched the diagram — which is exactly
     * what an `auto` density did the first time one was put on a screen.
     */
    presentation?: boolean;
}

/**
 * A param's declaration and its value now, as a host sees it.
 *
 * `Param` holds everything a slider, a readout or a narration clause needs —
 * `label`, `precision` derived from `round`, and whether the param carries
 * presentation or state — and none of it was reachable from outside the engine.
 * A host that wants to print a param's value to the right number of decimals
 * had two choices: hardcode one, or re-derive `precision` from `round` with its
 * own copy of `decimalPlaces`. Both end with the host and the diagram disagreeing
 * about the same quantity, which is the duplication `calcs` in the event payload
 * already exists to prevent.
 *
 * `presentation` is here for the same reason: a host filtering "params the
 * student changed" from "params describing how the diagram is shown" cannot do
 * it by name, and guessing gets an undo button that yanks a promoted panel back.
 */
export interface ParamInfo {
    name: string;
    /** The author's label, or the name when they gave none — never empty. */
    label: string;
    value: number;
    min: number;
    max: number;
    round: number;
    /** Decimal places implied by `round`, unless the author overrode it. */
    precision: number;
    /** True when the param says how the diagram is shown, not what it shows. */
    presentation: boolean;

    /**
     * True when the author declared this param's value as `true`/`false`.
     *
     * The engine coerces booleans to 0/1 in `View.parse` before a `Param` is
     * ever built, so by the time a host sees one it is a number and nothing in
     * its bounds says otherwise — which is how a control panel ends up offering
     * a continuous slider for a toggle. A host cannot recover this by
     * inspection, so the engine records it where it is still known and reports
     * it here.
     */
    isBoolean: boolean;
}

export interface IParam {
    name: string;
    label: string;
    value: number;
    update: (newValue: any) => any;
    formatted: (precision?: number) => string;
}

export class Param implements IParam {

    public name: string;
    public label: string;
    public value: any;
    public min: number;
    public max: number;
    public round: number;
    public precision: number;
    public presentation: boolean;
    public isBoolean: boolean;

    constructor(def: ParamDefinition) {

        function decimalPlaces(numAsString: string) {
            let match = ('' + numAsString).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
            if (!match) {
                return 0;
            }
            return Math.max(
                0,
                // Number of digits right of decimal point.
                (match[1] ? match[1].length : 0)
                // Adjust for scientific notation.
                - (match[2] ? +match[2] : 0));
        }

        setDefaults(def, { min: 0, max: 10, round: 1, label: '' });

        this.name = def.name;
        this.label = def.label;
        this.presentation = !!def.presentation;

        // Two roads reach here. A config that came through `View.parse` has
        // already had its booleans coerced to 0/1 and carries `isBoolean` to say
        // so; a `Param` constructed directly still holds the real thing. Neither
        // is the odd one out, so both are asked.
        this.isBoolean = typeof def.value == 'boolean' || !!def.isBoolean;

        if (typeof def.value == 'boolean') {
            this.value = +def.value;
            this.min = 0;
            this.max = 100;
            this.round = 1;
            // Assigned here for the same reason it is assigned below, and it was
            // not: `precision` is declared non-optional on `ParamInfo`, so a
            // param that skipped it handed every reader a number-typed
            // `undefined`. `formatted()` was the loudest victim — d3 threw
            // `invalid format: .undefinedf` — and a host formatting the value
            // itself printed the raw float at a student. A 0/1 value rounded to
            // 1 shows no decimals.
            this.precision = 0;
        } else {
            this.value = parseFloat(def.value);
            this.min = parseFloat(def.min);
            this.max = parseFloat(def.max);
            this.round = parseFloat(def.round);
            this.precision = parseInt(def.precision) || decimalPlaces(this.round.toString());

            if (isNaN(this.value)) {
                console.warn(`Param "${def.name}": value "${def.value}" is not a number, defaulting to ${this.min || 0}.`);
                this.value = isNaN(this.min) ? 0 : this.min;
            }
        }

    }

    // Receives an instruction to update the parameter to a new value
    // Updates to the closest rounded value to the desired newValue within accepted range
    update(newValue: any) {
        let param = this;
        if (newValue < param.min) {
            param.value = param.min;
        }
        else if (newValue > param.max) {
            param.value = param.max;
        }
        else {
            param.value = Math.round(newValue / param.round) * param.round;
        }
        return param.value;
    }

    /** This param's declaration and current value, copied, for a host to read. */
    info(): ParamInfo {
        const param = this;
        return {
            name: param.name,
            // A label is what a host puts in front of the number, so an empty
            // one is not a usable answer; the name is the word the author chose
            // for this param and is what the diagram's own expressions call it.
            label: param.label || param.name,
            value: param.value,
            min: param.min,
            max: param.max,
            round: param.round,
            precision: param.precision,
            presentation: param.presentation,
            isBoolean: param.isBoolean
        };
    }

    // Displays current value of the parameter to desired precision
    // If no precision is given, uses the implied precision given by the rounding parameter
    formatted(precision?: number) {
        precision = precision || this.precision;
        return d3.format(`.${precision}f`)(this.value);
    }




}

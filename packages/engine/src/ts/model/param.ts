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
     * A finer interval the param moves on while a student drags it, so a
     * coarse `round` does not make the drag jump. Let go, it settles onto
     * `round` (`Model.settle`). Leave it out and a drag snaps onto `round` as
     * it moves, as it always has.
     *
     * `round` should be a whole number of these, so every value the param
     * rests at can be reached mid-drag. A keyboard press, a slider and a host
     * writing the param still move it on `round`.
     */
    dragRound?: any;

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

/**
 * `value` on a grid of `step`, written to the step's own decimals.
 *
 * Without the last part a grid of 0.05 puts float dust on most of its values:
 * 0.05 × 67 is 3.3500000000000005, and a label that writes a calc from it
 * as a string says "Surplus of 70.00000000000011 mangoes".
 */
function onGrid(value: number, step: number): number {
    return parseFloat((Math.round(value / step) * step).toFixed(decimalPlaces(step.toString())));
}

export class Param implements IParam {

    public name: string;
    public label: string;
    public value: any;
    public min: number;
    public max: number;
    public round: number;
    /** The grid a drag moves it on, or null where a drag moves it on `round`. */
    public dragRound: number | null = null;
    public precision: number;
    public presentation: boolean;
    public isBoolean: boolean;

    constructor(def: ParamDefinition) {

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

            if (def.dragRound !== undefined) {
                const dragRound = parseFloat(def.dragRound), steps = this.round / dragRound;
                if (!(dragRound > 0) || !(dragRound < this.round)) {
                    console.warn(`Param "${def.name}": dragRound ${def.dragRound} is not finer than its round ${this.round}, so a drag moves it on round.`);
                } else {
                    if (Math.abs(steps - Math.round(steps)) > 1e-9) {
                        console.warn(`Param "${def.name}": round ${this.round} is not a whole number of dragRound ${dragRound}, so a drag cannot reach every value it rests at.`);
                    }
                    this.dragRound = dragRound;
                }
            }
        }

    }

    // Receives an instruction to update the parameter to a new value
    // Updates to the closest rounded value to the desired newValue within accepted range
    update(newValue: any, dragging?: boolean, gliding?: boolean) {
        let param = this;
        param.value = param.landing(newValue, dragging, gliding);
        return param.value;
    }

    /**
     * What `update` would make the value: clamped to the range, and rounded
     * within it, onto `dragRound` while `dragging` where it has one, and onto
     * `glideStep` while `gliding`.
     */
    landing(newValue: any, dragging?: boolean, gliding?: boolean): number {
        const param = this;
        if (newValue < param.min) return param.min;
        if (newValue > param.max) return param.max;
        if (gliding) return onGrid(newValue, param.glideStep());
        if (dragging && param.dragRound) return onGrid(newValue, param.dragRound);
        return Math.round(newValue / param.round) * param.round;
    }

    /**
     * The grid a glide moves it on: its `dragRound`, or a tenth of `round`.
     *
     * A step's move glides there from where the step before left it (see
     * `Model.glide`), and on `round` most of those moves are four or five
     * steps long: a curve that jumps five times in half a second. So a glide
     * moves on the drag's finer grid where there is one, which an author chose
     * to print whole, and otherwise on a tenth of `round`, which prints at the
     * param's own precision or one place past it.
     */
    glideStep(): number {
        const param = this;
        if (param.dragRound) return param.dragRound;
        return parseFloat((param.round / 10).toFixed(decimalPlaces(param.round.toString()) + 1));
    }

    /**
     * Whether a glide moves it, rather than putting it there at once.
     *
     * Not a presentation param, which says how the diagram is shown, and the
     * step it has reached is one: a reveal lands at once. Not a boolean,
     * which has nothing between its two values to pass through.
     */
    glides(): boolean {
        return !this.presentation && !this.isBoolean;
    }

    /** Whether a drag left it between two of the values it rests at. */
    unsettled(): boolean {
        return this.dragRound !== null && this.landing(this.value) !== this.value;
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

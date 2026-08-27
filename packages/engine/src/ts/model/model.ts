import * as math from "mathjs";
import { Param, ParamDefinition } from "./param";
import { Restriction } from "./restriction";
import { UpdateListener } from "./updateListener";



export interface IModel {
    evaluate: (name: string) => any;
    addUpdateListener: (updateListener: UpdateListener) => Model;
    getParam: (name: string) => any;
    updateParam: (name: string, value: any) => void;
    toggleParam: (name: string) => void;
    cycleParam: (name: string) => void;
    update: (force: boolean) => void;
}

/**
 * Does this calc still carry an `undefined` interpolated into it?
 *
 * Failing to evaluate is not by itself a bug: color names ("blue"), LaTeX label
 * text ("^\prime"), forward references that resolve on a later pass, and
 * deliberate function-of-x strings all land in the same place and are all
 * legitimate. The one unambiguous defect is the literal token `undefined`,
 * which only ever appears because a definition was missing a value when the
 * expression was assembled — for instance a line through the origin emitting
 * `((undefined)/(1 - 1))` for its fixed point.
 */
export function containsUndefinedToken(value: any): boolean {
    return typeof value === 'string' && /\bundefined\b/.test(value);
}

export class Model implements IModel {

    private restrictions: Restriction[];
    private updateListeners: UpdateListener[];

    // warnings already emitted, so an unresolved calc is reported once rather
    // than on every parameter change
    private warnedExpressions: Set<string> = new Set();

    // objects that store definitions of params, calcs, and colors
    private params: Param[];
    private initialParams: ParamDefinition[];
    private calcs: {};
    public colors: {};
    public idioms: {};
    public clearColor: string;

    // objects that store current realized values of params, calcs, and colors
    public currentParamValues: {};
    public currentCalcValues: {};
    public currentColors: {};
    public currentIdioms: {};

    /**
     * One-deep memory of the state before the current interaction, exposed to
     * expressions as `prev`. This is what lets an author draw a ghost of where a
     * curve *was* without shadow params or host bookkeeping.
     *
     * Both are captured by *reference*, which is sound and O(1) because
     * `evalParams()` and `evalCalcs()` each build a fresh object and rebind the
     * field rather than mutating in place — the same aliasing that already makes
     * `params.X + drag.dx` resolve to the drag-start value for a whole gesture.
     * Never snapshot `prev*` into `prev*`: the depth is one, deliberately.
     */
    public prevParamValues: {} = {};
    public prevCalcValues: {} = {};

    /** Counts snapshots, not student actions — a gesture rejected on its first tick still bumps it. */
    public snapshotSeq: number = 0;

    /**
     * Open gestures. A counter rather than a boolean so multi-touch and a host
     * gesture nesting inside a diagram gesture both behave: only the 0→1
     * transition snapshots.
     */
    private gestureDepth: number = 0;

    private snapshotOn: 'gesture' | 'change' | 'never' = 'gesture';

    /** True when any calc definition mentions `prev`; see the constructor. */
    private usesPrev: boolean = false;

    constructor(parsedData) {
        let model = this;
        model.params = parsedData.params.map(function (def) {
            return new Param(def)
        });
        model.initialParams = parsedData.params;
        model.calcs = parsedData.calcs;
        model.colors = parsedData.colors;
        model.idioms = parsedData.idioms;
        model.clearColor = parsedData.clearColor;
        model.restrictions = (parsedData.restrictions || []).map(function (def) {
            return new Restriction(def)
        });
        model.updateListeners = [];

        if (parsedData.snapshotOn) model.snapshotOn = parsedData.snapshotOn;

        model.warnReservedPrevName();
        model.usesPrev = model.definitionsMentionPrev();

        model.currentParamValues = model.evalParams();
        model.evalCalcs();
        model.currentColors = model.evalObject(model.colors);
        model.currentIdioms = model.evalObject(model.idioms);

        // Seed `prev` so it is never undefined. At t=0 prev === current, so an
        // un-snapshotted ghost draws coincident with the live object rather than
        // resolving to `undefined`, failing to parse, and flowing on as the
        // expression string — the silent-wrong-answer mode reportUnresolvedCalcs
        // exists to close. `prev.seq` and `prev.changed` are both 0, which is how
        // an author hides it.
        model.snapshot({ render: false, seed: true });

        // Only a config that actually asks for `prev` pays for the second pass:
        // on the first pass `prev` was still empty, so a calc referencing it fell
        // through evaluate()'s catch and is currently its own source string.
        if (model.usesPrev) {
            model.evalCalcs();
            model.prevCalcValues = model.currentCalcValues;
        }
    }

    /**
     * `prev` joins params/calcs/colors/idioms/d3 as a name the expression scope
     * reserves. Warn rather than throw, matching every other diagnostic here.
     */
    private warnReservedPrevName() {
        const model = this;
        const clash = model.params.some(p => p.name === 'prev')
            || Object.prototype.hasOwnProperty.call(model.calcs || {}, 'prev');
        if (clash) {
            console.warn(
                'Model: "prev" is a reserved name in the expression scope (the previous-state ' +
                'object) and shadows a param or calc of the same name. Rename it.'
            );
        }
    }

    /**
     * A cheap static scan, run once. For every config authored before `prev`
     * existed this finds nothing and construction behaves exactly as it did.
     */
    private definitionsMentionPrev(): boolean {
        const model = this;
        let found = false, referencesPrevCalcs = false;

        const walk = (obj: any) => {
            for (const key in obj) {
                const def = obj[key];
                if (typeof def === 'string') {
                    if (/\bprev\b/.test(def)) found = true;
                    if (/\bprev\s*\.\s*calcs\b/.test(def)) referencesPrevCalcs = true;
                } else if (def && typeof def === 'object') {
                    walk(def);
                }
            }
        };
        walk(model.calcs || {});

        if (referencesPrevCalcs) {
            console.warn(
                'Model: a calc references `prev.calcs`, which resolves to the value one snapshot ' +
                'ago rather than to a fixpoint. That is well-defined, but it is the spelling most ' +
                'likely to surprise — `prev.params` is usually what is meant.'
            );
        }
        return found;
    }

    /**
     * Capture the current state as `prev`.
     *
     * `seed` is the construction-time call, which establishes prev === current
     * without claiming a student action happened, so `snapshotSeq` stays 0.
     */
    snapshot(opts?: { render?: boolean; seed?: boolean }) {
        const model = this;
        model.prevParamValues = model.currentParamValues;
        model.prevCalcValues = model.currentCalcValues;
        if (!opts || !opts.seed) model.snapshotSeq++;
        if (!opts || opts.render !== false) model.update(false);
    }

    /**
     * Open a gesture. Only the outermost one snapshots, which is the whole point:
     * a drag fires ~60 updates a second, and a snapshot per update would leave
     * `prev` one tick behind — the ghost sitting under the live curve and the
     * shift arrow a pixel long.
     *
     * A host with a continuous control (a slider) must call this itself; the
     * engine cannot infer a gesture from a stream of `kg.update({params})` calls.
     */
    beginGesture() {
        const model = this;
        // 'change' coalesces to one snapshot per gesture rather than to none: the
        // gesture's "before" is its start, which is the same answer 'gesture' mode
        // gives. Only 'never' declines.
        if (++model.gestureDepth === 1 && model.snapshotOn !== 'never') {
            model.snapshot();
        }
    }

    endGesture() {
        this.gestureDepth = Math.max(0, this.gestureDepth - 1);
    }

    /** True while a gesture is open — the interaction handler asks before opening a second. */
    get inGesture(): boolean {
        return this.gestureDepth > 0;
    }

    /**
     * The state as it was at the last snapshot, shaped for an expression scope.
     *
     * Fully formed before any evaluation pass begins and never captured from
     * within one, so `prev.*` resolves on pass 1 and leaves evalCalcs' 5-pass
     * convergence unchanged. Flattened the same way as the top level, with calcs
     * shadowing params on a collision, so `prev.Qe` reads the way `Qe` does.
     *
     * Public because curves do not evaluate through `evaluate()`: a `fn` string is
     * textually substituted against its own scope in `MathFunction.updateFunctionString`,
     * which needs the same object or `prev` inside a curve resolves to nothing.
     */
    prevScope() {
        const model = this;
        return {
            ...model.prevParamValues,
            ...model.prevCalcValues,
            params: model.prevParamValues,
            calcs: model.prevCalcValues,
            seq: model.snapshotSeq,
            changed: model.paramsDifferFromSnapshot() ? 1 : 0
        };
    }

    /**
     * Whether any param has moved since the snapshot. Exact equality is right
     * here: `Param.update()` snaps every value onto a `round` grid, so there is
     * no float dust to tolerate, and computing it in the engine saves every
     * author from writing their own epsilon comparison and getting it wrong.
     */
    paramsDifferFromSnapshot(): boolean {
        const model = this;
        for (const name in model.currentParamValues) {
            if (model.currentParamValues[name] !== model.prevParamValues[name]) return true;
        }
        return false;
    }

    addUpdateListener(updateListener: UpdateListener) {
        this.updateListeners.push(updateListener);
        return this;
    }

    resetParams() {
        const model = this;
        model.initialParams.forEach(function (p) {
            model.updateParam(p.name, p.value);
        })
        model.update(true);
        // Re-seed, or a reset leaves a ghost of the pre-reset world hanging over a
        // fresh diagram. Seeded rather than counted: a reset is not a student move.
        model.snapshot({ render: false, seed: true });
        model.snapshotSeq = 0;
    }

    evalParams() {
        let p: any = {};
        this.params.forEach(function (param) {
            p[param.name] = param.value;
        });
        return p;
    }

    // evaluates the calcs object; then re-evaluates to capture calcs that depend on other calcs
    evalCalcs() {
        const model = this;
        // clear calculations so old values aren't used;
        model.currentCalcValues = {};

        // generate as many calculations from params as possible
        model.currentCalcValues = model.evalObject(model.calcs, true);

        // calculate values based on other calculations (up to a depth of 5)
        for (let i = 0; i < 5; i++) {
            for (const calcName in model.currentCalcValues) {
                if (typeof model.calcs[calcName] == 'object') {
                    model.currentCalcValues[calcName] = model.evalObject(model.calcs[calcName], true)
                } else if (isNaN(model.currentCalcValues[calcName]) && typeof model.calcs[calcName] == 'string') {
                    model.currentCalcValues[calcName] = model.evaluate(model.calcs[calcName], true);
                }
            }
        }

        model.reportUnresolvedCalcs(model.currentCalcValues, '');

        return model.currentCalcValues;
    }

    evalObject(obj: {}, onlyJSMath?: boolean) {
        const model = this;
        let newObj = {};
        for (const stringOrObj in obj) {
            const def = obj[stringOrObj];
            if (typeof def === 'number') {
                newObj[stringOrObj] = def;
            }
            else if (typeof def === 'string') {
                newObj[stringOrObj] = model.evaluate(def, onlyJSMath);
            } else {
                newObj[stringOrObj] = model.evalObject(def, onlyJSMath)
            }
        }
        return newObj;
    }

    // the model serves as a model, and can evaluate expressions within the context of that model
    // if onlyJSMath is selected, it will only try to evaluate using JSMath; this is especially important for calculations.
    evaluate(name: string, onlyJSMath?: boolean) {

        const model = this;

        // don't just evaluate numbers
        if (!isNaN(parseFloat(name))) {
            //console.log('interpreted ', name, 'as a number.');
            return parseFloat(name);
        }

        // collect current values in a scope object
        const params = model.currentParamValues,
            calcs = model.currentCalcValues,
            colors = model.currentColors,
            idioms = model.currentIdioms;

        const prev = model.prevScope();

        // Create a flattened scope for MathJS so names like "demand" or "price" work directly
        const flatScope = {
            ...params,
            ...calcs,
            ...colors,
            ...idioms,
            // Preserve the nested objects for backwards compatibility
            params: params,
            calcs: calcs,
            idioms: idioms,
            colors: colors,
            prev: prev,
            d3: { schemeCategory10: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'] }
        };

        // try to evaluate using mathjs
        try {
            const compiledMath = math.compile(name);
            let result = compiledMath.evaluate(flatScope);
            //onsole.log('parsed', name, 'as ', result);
            return result;
        } catch (err: any) {

            // If MathJS can't parse the expression, return it as-is rather than
            // falling back to eval() which is a security risk with user-provided YAML.
            // Not every failure here is a defect — colors, label text and forward
            // references all fail legitimately — so reporting happens once the
            // calcs have settled, in reportUnresolvedCalcs().
            return name;

        }

    }

    // Walk the settled calcs and report any that still carry an interpolated
    // `undefined`. Such a calc is silently returned as a string and flows on
    // into the diagram as if nothing went wrong, so without this the only
    // symptom is a shape drawn in the wrong place.
    private reportUnresolvedCalcs(obj: any, path: string) {
        const model = this;
        for (const key in obj) {
            const value = obj[key];
            const keyPath = path ? `${path}.${key}` : key;
            if (containsUndefinedToken(value)) {
                const message = `calcs.${keyPath} could not be resolved: "${value}". ` +
                    `A definition was missing a value when this expression was built.`;
                if (!model.warnedExpressions.has(message)) {
                    model.warnedExpressions.add(message);
                    console.warn(message);
                }
            } else if (value && typeof value === 'object') {
                model.reportUnresolvedCalcs(value, keyPath);
            }
        }
    }

    // This is a utility for exporting currently used colors for use in LaTex documents.
    latexColors() {
        let result = '%% econ colors %%\n', model = this;
        for (const color in model.colors) {
            result += `\\definecolor{${color}}{HTML}{${model.evaluate(model.colors[color]).replace('#', '')}}\n`
        }
        return result;
    }

    getParam(paramName: string) {
        const param = this.params.find(p => p.name === paramName);
        if (!param) {
            console.warn(`Param "${paramName}" not found.`);
        }
        return param;
    }


    updateParam(name: string, newValue: any) {
        let model = this,
            param = model.getParam(name);
        if (!param) return;
        const oldValue = param.value;
        // Held for 'change' mode: once the hypothetical below rebinds these fields
        // the pre-change generation is otherwise unreachable.
        const oldParamValues = model.currentParamValues,
            oldCalcValues = model.currentCalcValues;
        param.update(newValue);

        // if param has changed, check to make sure the change is valid
        if (oldValue != param.value) {

            // Hypothesize the new state values computationally so restrictions evaluate the NEW mathematical state
            model.currentParamValues = model.evalParams();
            model.evalCalcs();

            let valid = true;
            model.restrictions.forEach(function (r) {
                if (!r.valid(model)) {
                    valid = false;
                }
            });

            if (valid) {
                // In 'change' mode every accepted change is its own "before" — but a
                // real gesture still coalesces, or the ghost would track one tick
                // behind the curve for the whole drag.
                if (model.snapshotOn === 'change' && model.gestureDepth === 0) {
                    model.prevParamValues = oldParamValues;
                    model.prevCalcValues = oldCalcValues;
                    model.snapshotSeq++;
                }
                // If the hypothetical is strictly legal, proceed with a full broadcast update
                model.update(false);
            } else {
                // Otherwise rollback safely
                param.update(oldValue);
                model.currentParamValues = model.evalParams();
                model.evalCalcs();
            }
        }
    }


    // method exposed to viewObjects to allow them to toggle a binary param
    toggleParam(name: string) {
        const param = this.getParam(name);
        if (!param) return;
        this.updateParam(name, !param.value);
    }

    // method exposed to viewObjects to allow them to cycle a discrete param
    // increments by 1 if below max value, otherwise sets to zero
    cycleParam(name: string) {
        const param = this.getParam(name);
        if (!param) return;
        this.updateParam(name, param.value < param.max ? param.value + 1 : 0);
    }


    update(force: boolean) {
        const model = this;
        model.currentParamValues = model.evalParams();
        model.evalCalcs();

        model.currentColors = model.evalObject(model.colors);
        model.currentIdioms = model.evalObject(model.idioms);

        model.updateListeners.forEach(function (listener) {
            listener.update(force)
        });
    }





}

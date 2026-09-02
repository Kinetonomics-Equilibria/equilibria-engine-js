import { Model } from "./model";



export interface RestrictionDefinition {
    expression: string;

    /**
     * Accepted and unread.
     *
     * It has been declared required since the fork and consulted by nothing —
     * a restriction declared `type: 'nonsense'` enforces its `min` exactly as
     * one declared anything else does. Optional rather than removed, because
     * configs in the wild carry it, and optional rather than given a meaning,
     * because inventing one now would change what those configs do.
     */
    type?: string;

    min?: string;
    max?: string;

    /**
     * A stable id for this restriction, so an app can key coaching, analytics or
     * a hint off *which* rule was broken rather than off the text of its message.
     */
    name?: string;

    /**
     * The author's sentence for the learner: "Price can't go below zero."
     *
     * Without it — or a `name` an app has copy for — the most a host can say is
     * "that isn't allowed", which is barely better than the silence this exists
     * to end. Written as prose, in the author's voice, because it is read by a
     * student rather than by a developer.
     */
    message?: string;
}

/**
 * What one restriction saw when it was asked.
 *
 * A bare boolean cannot say *how far* out of range an attempt was, which is the
 * difference between "not allowed" and "you'd need to stay above 0.001" — and it
 * cannot distinguish a student breaking a rule from a rule that is not a rule,
 * which is a sentence addressed to a different person entirely.
 */
export interface RestrictionCheck {
    ok: boolean;
    /** What `expression` evaluated to. A string means it did not parse. */
    value: any;
    /** Evaluated bounds, present only when the author declared them. */
    min?: any;
    max?: any;
    /**
     * Which part failed to resolve to a number, if any.
     *
     * `Model.evaluate` returns an unparseable expression as its own source
     * string, and every comparison against a string is `false` — so a typo here
     * does not weaken the guard, it welds it shut. See `unresolvedPart`.
     */
    unresolved?: 'expression' | 'min' | 'max';
}

export interface IRestriction {
    valid: (model: Model) => boolean;
    check: (model: Model) => RestrictionCheck;
}

/** A value the comparisons below can actually mean something against. */
function isNumeric(value: any): boolean {
    return typeof value === 'number' && !isNaN(value);
}

export class Restriction implements IRestriction {

    /** Public because a refusal reports the rule it broke, verbatim. */
    public expression: string;
    public name: string | undefined;
    public message: string | undefined;

    private type: string | undefined;
    private min: any;
    private max: any;

    /** Warned about once, not on every evaluation — a restriction runs per drag tick. */
    private warned: boolean = false;

    constructor(def: RestrictionDefinition) {

        this.expression = def.expression;
        this.type = def.type;
        this.min = def.min;
        this.max = def.max;
        this.name = def.name;
        this.message = def.message;
    }

    /** How this restriction is named in a warning or a payload. */
    get id(): string {
        return this.name || this.expression;
    }

    /**
     * Ask this restriction about the model's current (hypothetical) state.
     *
     * Two things it now does that `valid()` did not.
     *
     * **A bound-less restriction reads its expression as a predicate.** The
     * schema docs have always described the engine as honouring "mathematical
     * properties defined in the `expression` operators", which is a boolean
     * expression — and it has never worked: the old implementation opened with
     * `isValid = true` and only ever narrowed on a declared bound, so
     * `{ expression: 'params.a > 0' }` was a guard that guarded nothing. Now a
     * boolean answer is the answer.
     *
     * **It reports what it could not resolve.** An expression or bound that
     * fails to parse comes back from `Model.evaluate` as its own source string,
     * and `"params.aa" >= 0` is `false` — so one keystroke turns a restriction
     * into a refusal of everything, forever. That behaviour is kept, because a
     * broken guard that quietly stops guarding is the worse of the two failures,
     * but it is now reported rather than suffered.
     */
    check(model: Model): RestrictionCheck {
        const r = this,
            value = model.evaluate(r.expression),
            hasMin = r.min !== undefined,
            hasMax = r.max !== undefined,
            min = hasMin ? model.evaluate(r.min) : undefined,
            max = hasMax ? model.evaluate(r.max) : undefined;

        const unresolved = r.unresolvedPart(value, hasMin, min, hasMax, max);
        if (unresolved) r.warnUnresolved(unresolved);

        let ok: boolean;
        if (hasMin || hasMax) {
            ok = (!hasMin || value >= min) && (!hasMax || value <= max);
        } else if (typeof value === 'boolean') {
            ok = value;
        } else {
            // Neither a bound to compare against nor a predicate to believe.
            // Permissive, which is what it has always been — but said out loud,
            // because a guard that guards nothing looks identical to one that
            // works right up until the day it was supposed to fire.
            r.warnGuardsNothing(value);
            ok = true;
        }

        const result: RestrictionCheck = { ok: ok, value: value };
        if (hasMin) result.min = min;
        if (hasMax) result.max = max;
        if (unresolved) result.unresolved = unresolved;
        return result;
    }

    /** Kept for callers that only want the verdict; `check()` is the whole answer. */
    valid(model: Model): boolean {
        return this.check(model).ok;
    }

    private unresolvedPart(
        value: any, hasMin: boolean, min: any, hasMax: boolean, max: any
    ): 'expression' | 'min' | 'max' | undefined {
        // A boolean expression is legitimate when there are no bounds, and is
        // the one non-numeric value that means something here.
        if (!isNumeric(value) && !(typeof value === 'boolean' && !hasMin && !hasMax)) {
            return 'expression';
        }
        if (hasMin && !isNumeric(min)) return 'min';
        if (hasMax && !isNumeric(max)) return 'max';
        return undefined;
    }

    private warnUnresolved(part: 'expression' | 'min' | 'max') {
        const r = this;
        if (r.warned) return;
        r.warned = true;
        const source = part === 'expression' ? r.expression : (part === 'min' ? r.min : r.max);
        console.warn(
            `Restriction "${r.id}": its ${part} "${source}" did not resolve to a number, so every ` +
            `comparison against it is false and this restriction now refuses every change to every ` +
            `param. Check the names it refers to.`
        );
    }

    private warnGuardsNothing(value: any) {
        const r = this;
        if (r.warned) return;
        r.warned = true;
        console.warn(
            `Restriction "${r.id}" declares neither min nor max, and its expression evaluated to ` +
            `${JSON.stringify(value)} rather than to true or false, so it permits everything. ` +
            `Give it a bound, or write the expression as a condition.`
        );
    }

}

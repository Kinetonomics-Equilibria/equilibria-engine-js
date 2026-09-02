import { TypeAndDef } from "../../view/view";
import { KGAuthorClasses } from "../classRegistry";
import { anonymizeCopy } from "./nameRegistry";
import { combineShow } from "./steps";

/**
 * `ghost: true` — where this object was, one snapshot ago.
 *
 * P5 built the memory and stopped there, on purpose: `prev` is a scope, and
 * every ghost written against it so far has been the live object restated by
 * hand with `prev.` in front of its bindings. That works, and it means the copy
 * has to be kept in step with the original for as long as the diagram lives —
 * change the live curve's slope and the dashed one still has the old one,
 * silently, because nothing ties the two together but the author's memory.
 *
 * A ghost is not a new object. It is *the same object, one snapshot ago*, and
 * saying that in a config should look like saying it in English: a flag on the
 * thing rather than a copy of the thing.
 *
 * So this expands one declaration into up to three, at the one place where an
 * author's `{type, def}` pair is still whole — before `Graph` hands the def to
 * its class. The twin is therefore an *ordinary object of the same type*: a
 * `Line` ghost goes through `Line`'s geometry dispatch, an `EconLinearDemand`
 * ghost through the composite, and every subobject a class builds from a def —
 * a curve's label, a point's droplines — is rebuilt from the ghosted def with
 * no code here.
 */

export interface GhostDefinition {
    /**
     * An extra condition on the ghost only, conjoined with `prev.changed`.
     *
     * Read as written, not rewritten to `prev`: it is a claim about now. The
     * study screen uses it to hide the drag ghost while a question is on screen,
     * where a second dashed curve would be claiming to be the question's own
     * starting line.
     */
    show?: string;
    /**
     * Draw the displacement. Defaults to true for a def that carries a position
     * and is refused elsewhere — two parallel lines have no single arrow
     * between them, which is why the study screen's arrow joins the equilibrium
     * *points* rather than the demand curves.
     */
    arrow?: boolean;
    /** Pair the labels through the schema's idioms. Default true. */
    label?: boolean;
    /** Anything else is merged onto the generated def. */
    [property: string]: any;
}

/** How a ghost looks unless the author says otherwise. */
const GHOST_STYLE = {
    lineStyle: 'dashed',
    strokeOpacity: 0.35,
    opacity: 0.35
};

/**
 * Keys a ghost must not inherit.
 *
 * `drag` and `click` because a ghost that could be dragged would be writing a
 * param through a binding that reads the snapshot; `draggable` and `handles`
 * because they are how the econ composites *generate* a drag. `srTitle` and
 * `srDesc` because a ghost is the same object twice and a screen reader should
 * meet it once. `name` and `title` are removed separately, by `anonymizeCopy`,
 * which leaves the `partOf` back-reference behind — see `ghostDef`.
 */
const NOT_INHERITED = ['ghost', 'drag', 'click', 'draggable', 'handles', 'srTitle', 'srDesc'];

/**
 * The one key that is emphatically *not* rewritten to `prev`.
 *
 * Whether an object is on screen is a claim about now. A curve revealed at step
 * 3 has a ghost revealed at step 3, not a ghost revealed at whatever step the
 * lesson had reached one snapshot ago.
 */
const NOT_REWRITTEN = ['show'];

/**
 * Where the bare-name check does not look.
 *
 * A label's text is evaluated like anything else, but it is overwhelmingly
 * LaTeX, and a diagram with a calc called `Q` would otherwise be told that the
 * axis label `Q^*` is a bare reference. The rewrite still applies to these —
 * a label genuinely reading `calcs.Qe` should show the old value on the ghost.
 */
const PROSE_KEYS = ['text', 'srTitle', 'srDesc', 'droplines', 'title', 'name'];

/**
 * The two idioms the label pairing emits, for a config that declares no schema.
 *
 * `EconSchema` and everything descended from it supply both, and a schema still
 * wins — these are applied as defaults after the object list is parsed. Without
 * them a schema-less diagram renders the literal characters
 * `concat("D", idioms.oldValueLabel)` as its label, because an expression mathjs
 * cannot resolve comes back as its own source text.
 */
export const GHOST_LABEL_IDIOMS = {
    oldValueLabel: '\\ ',
    newValueLabel: '^\\prime'
};

/**
 * `params.a` → `prev.params.a`, `calcs.Qe` → `prev.calcs.Qe`.
 *
 * Deliberately narrow. It matches only the two qualified prefixes, and only
 * where they are not already part of a longer path, so it is idempotent and
 * leaves `colors.demand`, `drag.dy`, `x` and `y` alone. A bare reference is not
 * rewritten — see `bareReferences` for why that is a warning rather than a
 * cleverer regex.
 */
export function toPrev(expression: string): string {
    return expression.replace(/(^|[^.\w])(params|calcs)\./g, '$1prev.$2.');
}

let declaredNames: string[] = [];

/**
 * The param and calc names this parse can see, for the bare-name diagnostic.
 *
 * Parse-scoped module state, the way `nameRegistry` is and for the same reason:
 * the information is known where the parse starts and needed several layers
 * down, and threading it through every constructor would be a parameter on
 * classes that have no other use for it.
 */
export function resetGhostScope(params?: any[], calcs?: {}) {
    declaredNames = []
        .concat((params || []).map((p: any) => p && p.name).filter(Boolean))
        .concat(Object.keys(calcs || {}));
}

/**
 * Declared names appearing bare in a ghosted expression.
 *
 * These are the ones a `prev.` rewrite cannot see, and what they do today
 * depends entirely on where they land: a `Point`'s `x: 'a'` resolves through the
 * flattened scope and is fine, while a `Line`'s `yIntercept: 'a'` throws
 * `Undefined symbol a` out of the curve's own function compiler and takes the
 * whole diagram with it. So a ghost written that way either sits exactly on top
 * of the object it shadows, forever and silently, or never draws at all.
 *
 * Rewriting them instead was the obvious move and is the wrong one: substituting
 * bare identifiers inside arbitrary expressions is how this codebase has been
 * bitten three times over, and the author's fix — write `params.a` — is one they
 * need anyway, since the bare form is already fatal in half the positions it can
 * occupy.
 */
function bareReferences(value: any, key?: string, found: string[] = []): string[] {
    if (key !== undefined && (PROSE_KEYS.indexOf(key) > -1 || NOT_REWRITTEN.indexOf(key) > -1)) {
        return found;
    }
    if (typeof value === 'string') {
        const matches: string[] = value.match(/(^|[^.\w])([A-Za-z_$][\w$]*)/g) || [];
        matches.forEach(function (m) {
            const name = m.replace(/^[^A-Za-z_$]/, '');
            if (declaredNames.indexOf(name) > -1 && found.indexOf(name) === -1) {
                found.push(name);
            }
        });
    } else if (Array.isArray(value)) {
        value.forEach(v => bareReferences(v, key, found));
    } else if (value && typeof value === 'object') {
        for (const k in value) bareReferences(value[k], k, found);
    }
    return found;
}

/** Deep copy with every string rewritten, skipping the keys that mean *now*. */
function rewrite(value: any, key?: string): any {
    if (key !== undefined && NOT_REWRITTEN.indexOf(key) > -1) return value;
    if (typeof value === 'string') return toPrev(value);
    if (Array.isArray(value)) return value.map(v => rewrite(v, key));
    if (value && typeof value === 'object') {
        const out = {};
        for (const k in value) out[k] = rewrite(value[k], k);
        return out;
    }
    return value;
}

/** Does this def name a single place, such that a shift arrow has two ends? */
function position(def: any): any[] | null {
    if (Array.isArray(def.coordinates) && def.coordinates.length === 2) return def.coordinates;
    if (def.hasOwnProperty('x') && def.hasOwnProperty('y')) return [def.x, def.y];
    return null;
}

/**
 * A literal label can be paired; a computed one is left alone.
 *
 * The pairing embeds the author's text into a mathjs string literal, which is
 * only meaningful if the text *is* text. A label that computes what it says —
 * `calcs.Qe`, or a bare number — would be turned into the characters of its own
 * expression, which is precisely the failure this file's rewrite exists to avoid
 * causing.
 */
function isLiteralLabel(text: any): boolean {
    if (typeof text !== 'string' || text.length === 0) return false;
    if (/\b(params|calcs|prev|colors|idioms)\./.test(text)) return false;
    return isNaN(parseFloat(text));
}

/** The author's text as a mathjs string literal — LaTeX is mostly backslashes. */
function quote(text: string): string {
    return JSON.stringify(text);
}

/**
 * Expand every `ghost` in a list of declared objects.
 *
 * Returns a new list in draw order: the ghost *before* the object it shadows,
 * because a layer is drawn in the order it was filled and a ghost belongs
 * underneath; the arrow after both, because the move belongs on top.
 */
export function expandGhosts(objects: TypeAndDef[]): TypeAndDef[] {
    if (!Array.isArray(objects)) return objects;

    const expanded: TypeAndDef[] = [];

    objects.forEach(function (obj) {
        const def = obj && (obj as any).def;

        if (!def || !def.hasOwnProperty('ghost') || !def.ghost) {
            if (def) delete def.ghost;
            expanded.push(obj);
            return;
        }

        const options: GhostDefinition = (def.ghost === true) ? {} : def.ghost;
        delete def.ghost;

        const ghost = ghostDef(def, options, (obj as any).type);

        expanded.push({ type: (obj as any).type, def: ghost });
        expanded.push(obj);

        const arrow = arrowDef(def, ghost, options, (obj as any).type);
        if (arrow) expanded.push(arrow);
    });

    return expanded;
}

/** The twin: same type, same everything, one snapshot back. */
function ghostDef(def: any, options: GhostDefinition, type: string): any {
    const ghost = anonymizeCopy(rewrite(def));

    NOT_INHERITED.forEach(function (key) { delete ghost[key]; });

    const bare = bareReferences(ghost);
    if (bare.length > 0) {
        console.warn(
            `ghost: ${describe(type, def)} refers to ${bare.map(n => `"${n}"`).join(', ')} without ` +
            `a "params." or "calcs." prefix, so the ghost is bound to the same value as the object ` +
            `it shadows and will sit exactly on top of it. Write "params.${bare[0]}" instead.`
        );
    } else if (!/\bprev\./.test(JSON.stringify(ghost))) {
        console.warn(
            `ghost: ${describe(type, def)} does not depend on any param or calc, so its ghost can ` +
            `never be anywhere else. Nothing will appear to happen.`
        );
    }

    // `prev.changed` last, so it reads as the outermost condition: the ghost is
    // off until the student has moved something, whatever else is also true.
    let show = def.show;
    if (options.show) show = combineShow(show, options.show);
    ghost.show = combineShow(show, 'prev.changed');

    pairLabels(def, ghost, options);

    const overrides = { ...options };
    ['show', 'arrow', 'label'].forEach(function (key) { delete overrides[key]; });

    // The style wins over what was inherited — a ghost drawn exactly like the
    // object it shadows is not a ghost — and loses to what the author asked for
    // on the `ghost` key itself.
    Object.assign(ghost, GHOST_STYLE, overrides);

    return ghost;
}

/**
 * `D` and `D′`, or `D_1` and `D_2` — whichever pair the schema's idioms name.
 *
 * Emitted as expressions rather than resolved here, because this runs while the
 * graph is being built and the schema has not been parsed yet. mathjs has no
 * string `+` — it throws, and a throw comes back as the expression's own source
 * text, drawn on the diagram — so the concatenation is `concat()`.
 *
 * The live label is conditioned on the *ghost's* predicate rather than on
 * `prev.changed` directly. That is what stops a curve reading `D′` while there
 * is no `D` on screen for it to be prime to.
 */
function pairLabels(def: any, ghost: any, options: GhostDefinition) {
    if (options.label === false) return;
    if (!def.label || !isLiteralLabel(def.label.text)) return;

    const text = quote(def.label.text);

    ghost.label = { ...ghost.label, text: `concat(${text}, idioms.oldValueLabel)` };
    def.label.text = `(${ghost.show}) ? concat(${text}, idioms.newValueLabel) : ${text}`;
}

/** The move itself: from where the thing was to where it is. */
function arrowDef(def: any, ghost: any, options: GhostDefinition, type: string): TypeAndDef | null {
    const here = position(def);

    if (options.arrow === false) return null;

    if (!here) {
        if (options.arrow === true) {
            console.warn(
                `ghost: ${describe(type, def)} has no single position, so there are no two points ` +
                `for a shift arrow to join. Draw one between the objects that do move to a place — ` +
                `an equilibrium point, not the curves that cross there.`
            );
        }
        return null;
    }

    if (options.arrow !== true && !isPointLike(type)) return null;

    return {
        type: 'Arrow',
        def: {
            begin: position(ghost),
            end: here,
            color: def.color,
            show: ghost.show
        }
    } as TypeAndDef;
}

/**
 * Is this the kind of object that is *at* somewhere?
 *
 * Asked of the registry rather than of a `type === 'Point'` comparison, so the
 * econ composites that are points — a bundle, an optimal choice, an equilibrium
 * — answer yes without being listed here. Looked up lazily because the registry
 * is how this package breaks its own import cycles.
 */
function isPointLike(type: string): boolean {
    const cls = KGAuthorClasses[type];
    const Point = KGAuthorClasses['Point'];
    if (!cls || !Point) return false;
    return cls === Point || cls.prototype instanceof Point;
}

/** Name it if the author named it, otherwise say what kind of thing it is. */
function describe(type: string, def: any): string {
    return def && def.name ? `"${def.name}"` : `a ${type || 'graph object'}`;
}

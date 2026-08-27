import { ViewDefinition } from "../../view/view";
import { DEFAULT_TICKS } from "../../view/viewObjects/axis";
import { allObjects, combineShow } from "./steps";

/**
 * How much detail a panel draws.
 *
 * A small panel has a different job, not a smaller version of the same job. At
 * 620px a panel is *read* — the values matter, the axes matter. At 190px in a
 * rail it answers one question: did something change here, and is it worth
 * clicking? So a level drops furniture rather than scaling it down, and keeps
 * the shape — curve geometry, shaded areas, the equilibrium point, droplines —
 * at full fidelity, because shape is the only thing carrying recognition.
 *
 * Like `steps`, this compiles to mechanisms that already exist rather than
 * introducing a second rendering path: a level resolves to `show` predicates,
 * a tick count and a stroke factor, all of them ordinary updatables. One
 * rendering path, and an author can still see what the level did by reading the
 * parsed def.
 *
 * The level is carried in a param, one per panel, for the same reason P3 made a
 * panel's rect a param: it is what lets a panel change level *without a
 * remount*, which is what a promotion animation needs. `kg.setDensity()` is a
 * param update and nothing else.
 */

export type DensityLevel = 'full' | 'compact' | 'indicator';

/** Ordered, and the order is the encoding: the param holds this index. */
export const DENSITY_LEVELS: DensityLevel[] = ['full', 'compact', 'indicator'];

/** Declared level that asks the engine to choose from the panel's measured size. */
export const AUTO_DENSITY = 'auto';

export function densityIndex(level: DensityLevel): number {
    return DENSITY_LEVELS.indexOf(level);
}

/** The param a panel's density lives in. Authors may declare it themselves. */
export function densityParamName(panelName: string): string {
    return 'density_' + panelName;
}

/**
 * What each level does to a tick count, as a factor rather than a replacement.
 *
 * A factor because an author who wrote `ticks: 10` meant something by it, and
 * halving their number respects it where overwriting it with a constant would
 * not. d3 treats a tick count as a hint and is content with a fractional one,
 * so 5 → 2.5 renders as two or three ticks rather than erroring.
 *
 * Zero is exact, though: `d3.axis.ticks(0)` draws the domain line and nothing
 * else, which is precisely what `indicator` wants — the axis still frames the
 * shape, and no text competes with it.
 */
const TICK_FACTOR = [1, 0.5, 0];

/**
 * What each level does to a stroke width.
 *
 * Under one canvas (P3) every panel shares one pixel space, so a 2px curve in a
 * 190px panel reads three times thinner than the same curve in a 620px one. At
 * `indicator` the curve *is* the content, so it is drawn twice as heavy. This
 * is the one place density adds rather than removes.
 */
const STROKE_SCALE = [1, 1, 2];

/** Below this many pixels on a panel's short side, `auto` chooses `indicator`. */
export const INDICATOR_BELOW_PX = 240;

/** And below this, `compact`. Above it, `full`. */
export const COMPACT_BELOW_PX = 420;

/**
 * The level `auto` picks for a panel that measures `px` on its short side.
 *
 * These two numbers are working values, not findings. They come from
 * typographic reasoning about the 10pt default — tick labels and KaTeX curve
 * labels start colliding with each other and with the curve somewhere around
 * 220px — and have not been tested with real diagrams in front of real
 * students. The short side rather than the width, because it is the smaller
 * dimension that furniture collides in.
 */
export function levelForSize(px: number): DensityLevel {
    if (!isFinite(px) || px <= 0) return 'full';
    if (px < INDICATOR_BELOW_PX) return 'indicator';
    if (px < COMPACT_BELOW_PX) return 'compact';
    return 'full';
}

/**
 * A panel the layout published, and what the host asked it to draw.
 *
 * Scale names rather than a naming convention: `PositionedObject` derives them
 * from the panel name, but the derivation is its business, and an object's
 * `xScaleName` is what actually ties it to a panel in the parsed output.
 */
export interface PanelDefinition {
    name?: string;
    density?: string;
    xScaleName: string;
    yScaleName: string;
}

/** A panel whose density is compiled, plus what the runtime needs to move it. */
export interface DensityPanel {
    /** The panel's key — what `setDensity` addresses and what a warning names. */
    key: string;
    /** As declared: a level, or `auto`. */
    declared: string;
    param: string;
    xScaleName: string;
    yScaleName: string;
}

/** Wrap an operand before composing, matching `getDefinitionProperty`'s rule. */
function operand(v: any): string {
    return '(' + v + ')';
}

/**
 * `ticks` for an axis at a compiled density: whatever it was, times the level's
 * factor.
 *
 * The axis def usually has no `ticks` at this point — the default is applied in
 * the view class, which is constructed after parsing — so the default is read
 * from there rather than duplicated here.
 */
function tickExpression(existing: any, param: string): string {
    const t = operand(existing === undefined || existing === null ? DEFAULT_TICKS : existing);
    return `(${t} * (params.${param} == 0 ? ${TICK_FACTOR[0]} : ` +
        `(params.${param} == 1 ? ${TICK_FACTOR[1]} : ${TICK_FACTOR[2]})))`;
}

function strokeScaleExpression(param: string): string {
    return `(params.${param} == 0 ? ${STROKE_SCALE[0]} : ` +
        `(params.${param} == 1 ? ${STROKE_SCALE[1]} : ${STROKE_SCALE[2]}))`;
}

/**
 * Read a declared density, or report why it was ignored.
 *
 * An unrecognised level is named rather than guessed at: `density: 'small'` is
 * a typo, and silently drawing it at `full` would be the engine's usual failure
 * mode — a config that looks like it says something and does not.
 */
function validLevel(declared: any, key: string): string | null {
    if (declared === AUTO_DENSITY || DENSITY_LEVELS.indexOf(declared) > -1) return declared;
    console.warn(`density: panel "${key}" declares density "${declared}", which is not a level. ` +
        `Use one of ${DENSITY_LEVELS.join(', ')} or "${AUTO_DENSITY}". The panel was drawn at full detail.`);
    return null;
}

/**
 * Resolve every declared panel density into properties that already exist.
 *
 * Runs after `parse()` for the same reason `compileSteps` does: it addresses
 * objects, and the objects do not exist until the layout and its composites
 * have been built.
 *
 * Nothing here ever *replaces* an authored value. `show` is conjoined, so
 * density can only hide more and never reveal; `ticks` and the stroke factor
 * are multiplied. That is a stronger rule than "explicit beats default" and a
 * simpler one to hold: a level composes with the diagram, it does not overrule
 * it.
 */
export function compileDensity(parsedData: ViewDefinition): ViewDefinition {

    const panels: PanelDefinition[] = (parsedData.panels || []) as PanelDefinition[];
    const declared = panels.filter(p => p.density !== undefined && p.density !== null && p.density !== '');

    if (declared.length === 0) return parsedData;

    const objects = allObjects(parsedData);
    const params: any[] = (parsedData.params || []) as any[];
    const compiled: DensityPanel[] = [];

    declared.forEach(function (panel) {
        const key = panel.name;

        // A density is addressed by the panel's key: it names the param the
        // predicates read, and it is what `setDensity` is given. An unnamed
        // graph has no key — its scales are random strings — so there is
        // nothing to address and nothing to say about it later.
        if (!key) {
            console.warn(`density: a panel declares density "${panel.density}" but has no key, so it ` +
                `cannot be addressed and was drawn at full detail. Give the panel a "key" (in ` +
                `CustomLayout) or the graph a "name".`);
            return;
        }

        const level = validLevel(panel.density, key);
        if (level === null) return;

        const param = densityParamName(key);

        // The author may declare the param themselves — to start a panel small,
        // or to drive it from their own control. Same rule as `steps`.
        if (!params.some(p => p.name === param)) {
            params.push({
                name: param,
                value: level === AUTO_DENSITY ? 0 : densityIndex(level as DensityLevel),
                min: 0,
                max: DENSITY_LEVELS.length - 1,
                round: 1
            });
        }

        compiled.push({
            key: key,
            declared: level,
            param: param,
            xScaleName: panel.xScaleName,
            yScaleName: panel.yScaleName
        });

        objects.forEach(function (o) {
            if (!o.def || o.def.xScaleName !== panel.xScaleName) return;

            if (o.type === 'Axis') {
                o.def.ticks = tickExpression(o.def.ticks, param);
                return;
            }

            if (o.type === 'Label') {
                // An axis title goes at `compact`; every other label — a curve's
                // name, a point's coordinates, a dropline's axis value — survives
                // until `indicator`, where the panel stops being read at all.
                const goesAt = (o.def.furniture === 'axisTitle') ? 1 : 2;
                o.def.show = combineShow(o.def.show, `params.${param} < ${goesAt}`);
                return;
            }

            o.def.strokeScale = strokeScaleExpression(param);
        });
    });

    parsedData.params = params;
    parsedData.densityPanels = compiled;

    return parsedData;
}

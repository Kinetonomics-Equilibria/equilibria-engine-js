import { Graph } from "../positionedObjects/graph";
import { Layout } from "./layout";

/**
 * A panel in a `CustomLayout`: a rect given as fractions of the canvas, plus an
 * ordinary graph def (`xAxis`, `yAxis`, `objects`).
 *
 * `key` is the host's handle for the panel — what `linkTo` addresses and what a
 * warning names. It is optional; a panel without one is called `panel0` by position.
 */
export interface CustomLayoutPanelDefinition {
    key?: string;
    x: any;
    y: any;
    width: any;
    height: any;
    linkTo?: string;
    [propName: string]: any;
}

export interface CustomLayoutDefinition {
    aspectRatio?: number;
    panels: CustomLayoutPanelDefinition[];
}

/** Layout keys that describe the rect rather than the graph inside it. */
const PANEL_KEYS = ['key', 'x', 'y', 'width', 'height', 'linkTo'];

/**
 * A fraction the engine can check *now*, or `undefined` if it is an expression.
 *
 * A position may legitimately be `'params.focus == 0 ? 0.05 : 0.62'`, whose value is
 * not knowable at construction. Checking those numerically would either reject valid
 * configs or force an evaluation pass before the model exists, so they are simply not
 * checked — which the bounds warning's wording is careful not to overstate.
 */
function staticFraction(v: any): number | undefined {
    if (typeof v === 'number') return isFinite(v) ? v : undefined;
    if (typeof v === 'string' && v.trim() !== '' && isFinite(v as any)) return parseFloat(v);
    return undefined;
}

/**
 * The pass-through layout: the host says where the panels go.
 *
 * Every other layout class in this directory is a hardcoded arrangement — a table of
 * fractions with a name. `CustomLayout` is the same code path with the table supplied
 * from outside, which is what lets an app compute "focus square on the left, three
 * indicators down the right" from its own measured viewport.
 *
 * Two constraints are real and are not worked around here. One canvas has one
 * `aspectRatio`, so a host arranging panels is choosing the *canvas* shape too; and
 * `addSecondGraph` wires exactly one second graph per object, so `linkTo` is one
 * directed link per panel rather than an N-way mesh (see `parsers/authoringObject.ts`).
 */
export class CustomLayout extends Layout {

    constructor(def: CustomLayoutDefinition) {
        super(def as any);

        const l = this;

        if (def.aspectRatio) {
            l.aspectRatio = def.aspectRatio;
        }

        const panels = def.panels || [];

        if (!Array.isArray(def.panels) || panels.length === 0) {
            console.warn('CustomLayout: no "panels" array, so nothing was drawn. Each panel needs ' +
                'x, y, width and height as fractions of the canvas.');
            return;
        }

        const graphsByKey: { [key: string]: Graph } = {},
            links: Array<{ key: string, linkTo: string, graph: Graph }> = [];

        panels.forEach(function (panel, i) {
            const key = panel.key || 'panel' + i;

            if (Object.prototype.hasOwnProperty.call(graphsByKey, key)) {
                console.warn(`CustomLayout: two panels share the key "${key}". Keys address a panel — ` +
                    `for a link and for anything the host wants to say about it — so the second is ` +
                    `unreachable. Rename it.`);
            }

            const missing = ['x', 'y', 'width', 'height'].filter(function (k) {
                return panel[k] === undefined || panel[k] === null;
            });

            if (missing.length > 0) {
                console.warn(`CustomLayout: panel "${key}" is missing ${missing.join(', ')} and was ` +
                    `not drawn. A panel's rect is given as fractions of the canvas.`);
                return;
            }

            const x = staticFraction(panel.x),
                y = staticFraction(panel.y),
                width = staticFraction(panel.width),
                height = staticFraction(panel.height);

            // Only a rect whose numbers are all known now can be checked now. An
            // expression is left alone rather than guessed at.
            if (x !== undefined && y !== undefined && width !== undefined && height !== undefined) {
                if (width <= 0 || height <= 0) {
                    console.warn(`CustomLayout: panel "${key}" has width ${width} and height ${height}. ` +
                        `A panel with no extent draws nothing.`);
                } else if (x < 0 || y < 0 || x + width > 1 || y + height > 1) {
                    console.warn(`CustomLayout: panel "${key}" is outside the canvas ` +
                        `(x ${x}–${x + width}, y ${y}–${y + height}; both must stay within 0–1). ` +
                        `It will be drawn clipped or off-screen.`);
                }
            }

            const graphDef: any = {};
            for (const prop in panel) {
                if (PANEL_KEYS.indexOf(prop) < 0) graphDef[prop] = panel[prop];
            }

            // The key survives into the parsed data as the graph's name, so something
            // outside the engine can say *which* panel a thing happened in.
            graphDef.name = key;
            graphDef.position = { x: panel.x, y: panel.y, width: panel.width, height: panel.height };

            const graph = new Graph(graphDef);
            graphsByKey[key] = graph;
            l.subObjects.push(graph);

            if (panel.linkTo) {
                links.push({ key: key, linkTo: panel.linkTo, graph: graph });
            }
        });

        // Linking happens after every panel exists, so a panel may link forwards.
        links.forEach(function (link) {
            const target = graphsByKey[link.linkTo];

            if (!target) {
                console.warn(`CustomLayout: panel "${link.key}" links to "${link.linkTo}", which is not ` +
                    `a panel key in this layout. The link was dropped.`);
                return;
            }

            if (target === link.graph) {
                console.warn(`CustomLayout: panel "${link.key}" links to itself. The link was dropped.`);
                return;
            }

            link.graph.subObjects.forEach(function (obj) { obj.addSecondGraph(target) });
        });
    }
}

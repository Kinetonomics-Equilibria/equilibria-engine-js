import { Curve } from "./viewObjects/curve";
import { Label } from "./viewObjects/label";
import { Point } from "./viewObjects/point";
import { Segment } from "./viewObjects/segment";
import { ViewObject } from "./viewObjects/viewObject";
import { boxOf } from "./labelYields";

/**
 * What a student can drag says so, at rest.
 *
 * The only sign a curve could be moved was the cursor, which changes once the
 * pointer is over the curve's grip: a student had to sweep the plot and wait,
 * a tablet has no pointer to change, and on a projector nobody but the person
 * at the laptop sees it. So everything that can be dragged right now carries a
 * handle, drawn whether or not anything is near it.
 *
 * A curve's handle is a thumb, the sliders' own (a white disc ringed in its
 * colour, 16px across), sitting on the curve, with an arrow beside it for each
 * way it moves: the same thing the slider under the diagram is, and it moves
 * the same param. A point is its own place to grab, so it carries the arrows
 * alone. The arrows say what the cursor said on hover, ↔ ↕ or both, and go
 * when the cursor does: a drag frozen by a committed answer has no handle.
 *
 * Placed after everything has drawn, for the reason `LabelYields` is: a
 * curve's handle keeps clear of the points and labels in its panel, and they
 * are only where they are once their own updates have run this tick. It sits a
 * quarter of the way along the curve's visible length from its left-hand end,
 * the end away from where D and S are labelled, and slides along the curve to
 * the nearest place clear of a point, a label, another handle and, where it
 * can, another line: a curve, or a segment such as a dropline.
 */

/** The thumb: a disc this wide inside a ring this heavy, 16px across, as the sliders' is. */
const THUMB_RADIUS = 6, THUMB_RING = 4;

/** Each arrow's base and tip, out from the centre, and half its base. */
const ARROW_BASE = 11, ARROW_TIP = 18, ARROW_HALF = 5;

/** How far from its centre the handle draws anything. */
const REACH = ARROW_TIP;

/** Room kept between a handle and a point's edge, or a label's box. */
const GAP = 4;

/** Where along the curve's visible length a handle tries, in order: a quarter of the way, and then out from there. */
const ALONG = [0.25, 0.2, 0.3, 0.15, 0.35, 0.1, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9];

type Pt = [number, number];
type Directions = '' | 'x' | 'y' | 'xy';

/** The way each arrow points, for a drag's directions. */
const ARROWS: Record<string, Pt[]> = {
    x: [[-1, 0], [1, 0]],
    y: [[0, -1], [0, 1]],
    xy: [[-1, 0], [1, 0], [0, -1], [0, 1]]
};

/** The keyboard's ring, round all of the handle and a little past it. */
const FOCUS_RING = REACH + 5;

/**
 * Draw a handle's shapes into its group, in `colour`, centred on the group's
 * origin, with the ring keyboard focus shows round it (kgjs-theme.css).
 */
export function drawHandle(group, directions: Directions, colour: string, thumb: boolean) {
    group.selectAll('*').remove();
    group.append('circle')
        .attr('class', 'kg-focus-ring')
        .attr('r', FOCUS_RING);
    if (thumb) {
        group.append('circle')
            .attr('class', 'kg-handle-thumb')
            .attr('r', THUMB_RADIUS)
            .style('fill', 'white')
            .style('stroke', colour)
            .style('stroke-width', `${THUMB_RING}px`);
    }
    (ARROWS[directions] || []).forEach(function ([dx, dy]) {
        const tip: Pt = [dx * ARROW_TIP, dy * ARROW_TIP],
            left: Pt = [dx * ARROW_BASE - dy * ARROW_HALF, dy * ARROW_BASE - dx * ARROW_HALF],
            right: Pt = [dx * ARROW_BASE + dy * ARROW_HALF, dy * ARROW_BASE + dx * ARROW_HALF];
        // A white edge behind the fill, as a point's ring is, so an arrow
        // laid across a dropline or another curve keeps its shape.
        group.append('polygon')
            .attr('class', 'kg-handle-arrow')
            .attr('points', [tip, left, right].map(p => p.join(',')).join(' '))
            .style('fill', colour)
            .style('stroke', 'white')
            .style('stroke-width', '3px')
            .style('stroke-linejoin', 'round')
            .style('paint-order', 'stroke');
    });
}

/** What a handle avoids in one panel, in its pixels. */
interface Obstacles {
    points: { at: Pt, r: number }[];
    labels: { left: number, top: number, width: number, height: number }[];
    lines: { from: ViewObject, path: Pt[] }[];
    handles: Pt[];
}

export class Handles {

    private panels: { objects: ViewObject[] }[];

    /** The panels with something that can be dragged, or null when nothing can. */
    static over(viewObjects: ViewObject[]): Handles | null {
        const handled = viewObjects.filter(vo => !!vo.handleElement);
        if (handled.length === 0) return null;
        // A panel is a pair of scales, matched by identity, as `AxisMarks` does.
        const panels: { objects: ViewObject[] }[] = [];
        viewObjects.forEach(function (vo) {
            if (!vo.xScale || !vo.yScale) return;
            if (!handled.some(h => h.xScale === vo.xScale && h.yScale === vo.yScale)) return;
            let panel = panels.find(p => p.objects[0].xScale === vo.xScale && p.objects[0].yScale === vo.yScale);
            if (!panel) panels.push(panel = { objects: [] });
            panel.objects.push(vo);
        });
        return new Handles(panels);
    }

    constructor(panels: { objects: ViewObject[] }[]) {
        this.panels = panels;
    }

    update() {
        this.panels.forEach(panel => this.place(panel.objects));
        return this;
    }

    private place(objects: ViewObject[]) {
        // Which handles show, and what is drawn in each, first: a point's
        // arrows are in the way of a curve's handle only while they show.
        const on = objects.filter(function (vo) {
            if (!vo.handleElement) return false;
            const directions: Directions = (vo.interactionHandler && vo.interactionHandler.directions) || '';
            const showing = !!directions && !!vo.handle && displayed(vo);
            vo.handleElement.style('display', showing ? null : 'none');
            if (!showing) return false;
            const thumb = vo instanceof Curve,
                colour = thumb ? vo.stroke : vo.fill,
                drawn = `${directions} ${colour}`;
            if (vo.handleDrawn !== drawn) {
                drawHandle(vo.handleElement, directions, colour, thumb);
                vo.handleDrawn = drawn;
            }
            return true;
        });

        // A point's handle is drawn round it, in the group its point is
        // already moved to. A curve's is placed along it.
        on.filter((vo): vo is Point => vo instanceof Point).forEach(p => { p.handleAt = p.pixelCircle().at; });
        const curves = on.filter((vo): vo is Curve => vo instanceof Curve);
        if (curves.length > 0) placeAlong(curves, objects, on);

        // What shows a handle is what the keyboard can move.
        objects.forEach(function (vo) {
            if (vo.handleElement) asSlider(vo, vo.handleElement.style('display') !== 'none');
        });
    }
}

/** Place each curve's handle along it, clear of what else is in its panel. */
function placeAlong(curves: Curve[], objects: ViewObject[], on: ViewObject[]) {
    const shown = objects.filter(displayed);
    const obstacles: Obstacles = {
        // A point that can be dragged reaches as far as the arrows round it.
        points: shown.filter((vo): vo is Point => vo instanceof Point).map(function (p) {
            const { at, r } = p.pixelCircle();
            return { at, r: (on.indexOf(p) > -1 ? REACH : r) + GAP };
        }),
        labels: shown.filter((vo): vo is Label => vo instanceof Label).map(boxOf).filter(box => !!box),
        lines: shown.map(function (vo) {
            if (vo instanceof Curve) return { from: vo as ViewObject, path: vo.pixelPath() };
            if (!(vo instanceof Segment)) return null;
            const ends = vo.sampleGeometry() || [];
            return { from: vo as ViewObject, path: ends.map(e => [vo.xScale.scale(e.x), vo.yScale.scale(e.y)] as Pt) };
        }).filter(line => !!line),
        handles: []
    };

    curves.forEach(function (curve) {
        const at = along(curve, obstacles);
        curve.handleAt = at;
        if (!at) {
            curve.handleElement.style('display', 'none');
            return;
        }
        curve.handleElement.attr('transform', `translate(${at[0]} ${at[1]})`);
        obstacles.handles.push(at);
    });
}

/**
 * An object with a handle is a slider to the keyboard and a screen reader:
 * Tab reaches it, the arrow keys move it the ways its arrows point
 * (`InteractionHandler.keyed`), and it is read as its name and what it moves,
 * "Demand, slider, Demand for AUD 52". Where it has no handle it is none of
 * these, as it is not draggable: frozen, hidden, or in a panel too small to
 * read.
 *
 * Its value is the first param it moves, and its words every one, so a point
 * moved two ways says both: "Toasties at Z 40, Coffees at Z 120". A param is
 * said as its value alone where its label would only say the object's name
 * again, "Demand for AUD, slider, 50", or where it has no label of its own.
 */
function asSlider(vo: ViewObject, on: boolean) {
    const el = vo.rootElement;
    if (!on) {
        if (vo.sliderSaid) {
            ['tabindex', 'role', 'aria-label', 'aria-valuenow', 'aria-valuemin', 'aria-valuemax',
                'aria-valuetext', 'aria-orientation'].forEach(name => el.attr(name, null));
            vo.sliderSaid = null;
        }
        return;
    }
    const ih = vo.interactionHandler,
        params = ih.movedParams().map(name => vo.model.getParam(name)).filter(p => !!p);
    if (params.length === 0) return;
    const first = params[0],
        name = vo.srTitle || vo.title || vo.name || '',
        named = (p: any) => p.label && p.label !== p.name && p.label.toLowerCase() !== String(name).toLowerCase(),
        text = params.map(p => (named(p) ? p.label + ' ' : '') + p.formatted()).join(', '),
        said = [name, text, first.value, first.min, first.max, ih.directions].join('|');
    if (said === vo.sliderSaid) return;
    vo.sliderSaid = said;
    el.attr('tabindex', 0)
        .attr('role', 'slider')
        .attr('aria-label', name)
        .attr('aria-valuenow', first.value)
        .attr('aria-valuemin', first.min)
        .attr('aria-valuemax', first.max)
        .attr('aria-valuetext', text)
        .attr('aria-orientation', ih.directions === 'x' ? 'horizontal' : ih.directions === 'y' ? 'vertical' : null);
}

/** Whether an object is on screen now: shown, and not hidden for being off the plot. */
function displayed(vo: ViewObject): boolean {
    if (!vo.show || vo.inDef || !vo.rootElement) return false;
    const node = vo.rootElement.node() as HTMLElement | SVGElement;
    return !!node && node.style.display !== 'none';
}

/**
 * Where on a curve its handle goes: the first place in `ALONG` that is clear
 * of everything, or else the first clear of points, labels and handles, which
 * another line may run past: a question's start line lies on the curve until
 * the student moves it. With nothing clear even of those, the place that keeps
 * furthest from them. Null when too little of the curve is inside the plot to
 * hold a handle and still show as a curve either side of it.
 */
function along(curve: Curve, obstacles: Obstacles): Pt | null {
    const run = visibleRun(curve);
    if (!run) return null;

    const lengths = [0];
    for (let i = 1; i < run.length; i++) lengths.push(lengths[i - 1] + distance(run[i - 1], run[i]));
    const total = lengths[lengths.length - 1];
    if (total < 4 * REACH) return null;

    const places = ALONG.map(f => pointAlong(run, lengths, f * total));
    const hard = places.map(at => clearance(at, obstacles));
    const soft = places.map(at => obstacles.lines
        .filter(line => line.from !== curve)
        .reduce((least, line) => Math.min(least, distanceToPath(at, line.path) - REACH), Infinity));

    const clearOfAll = places.findIndex((_, i) => hard[i] >= 0 && soft[i] >= 0);
    if (clearOfAll > -1) return places[clearOfAll];
    const clearOfHard = places.findIndex((_, i) => hard[i] >= 0);
    if (clearOfHard > -1) return places[clearOfHard];
    let best = 0;
    hard.forEach((h, i) => { if (h > hard[best]) best = i; });
    return places[best];
}

/** How much room a handle at `at` has to spare: negative where it would touch something. */
function clearance(at: Pt, obstacles: Obstacles): number {
    let least = Infinity;
    obstacles.points.forEach(p => { least = Math.min(least, distance(at, p.at) - p.r - REACH); });
    obstacles.labels.forEach(box => {
        const dx = Math.max(box.left - at[0], 0, at[0] - (box.left + box.width)),
            dy = Math.max(box.top - at[1], 0, at[1] - (box.top + box.height));
        least = Math.min(least, Math.hypot(dx, dy) - REACH - GAP);
    });
    obstacles.handles.forEach(h => { least = Math.min(least, distance(at, h) - 2 * REACH - GAP); });
    return least;
}

/**
 * The longest stretch of a curve inside its plot, kept far enough in from the
 * edges that a handle on it is not cut off, in pixels, from its left-hand end.
 * Each piece is clipped to the plot rather than its samples filtered, so a
 * line drawn from two points, both on the plot's edge, still has a middle.
 */
function visibleRun(curve: Curve): Pt[] | null {
    const path = curve.pixelPath();
    const xs = [curve.xScale.scale(curve.xScale.domainMin), curve.xScale.scale(curve.xScale.domainMax)],
        ys = [curve.yScale.scale(curve.yScale.domainMin), curve.yScale.scale(curve.yScale.domainMax)];
    const box = {
        left: Math.min(...xs) + REACH, right: Math.max(...xs) - REACH,
        top: Math.min(...ys) + REACH, bottom: Math.max(...ys) - REACH
    };
    if (box.left >= box.right || box.top >= box.bottom) return null;

    const runs: Pt[][] = [];
    let run: Pt[] | null = null;
    for (let i = 1; i < path.length; i++) {
        const piece = clip(path[i - 1], path[i], box);
        if (!piece) { run = null; continue; }
        const [a, b] = piece;
        if (run && distance(run[run.length - 1], a) < 1e-6) {
            run.push(b);
        } else {
            run = [a, b];
            runs.push(run);
        }
        // A piece that left the box ends its run.
        if (b[0] !== path[i][0] || b[1] !== path[i][1]) run = null;
    }
    let longest: Pt[] | null = null, longestLength = 0;
    runs.forEach(r => {
        let length = 0;
        for (let i = 1; i < r.length; i++) length += distance(r[i - 1], r[i]);
        if (length > longestLength) { longest = r; longestLength = length; }
    });
    if (!longest) return null;
    const first = longest[0], last = longest[longest.length - 1];
    return (last[0] < first[0] || (last[0] === first[0] && last[1] < first[1])) ? longest.slice().reverse() : longest;
}

/** A segment cut to a box (Liang–Barsky), or null where none of it is inside. */
function clip(a: Pt, b: Pt, box: { left: number, right: number, top: number, bottom: number }): [Pt, Pt] | null {
    if (![a[0], a[1], b[0], b[1]].every(isFinite)) return null;
    const dx = b[0] - a[0], dy = b[1] - a[1];
    let t0 = 0, t1 = 1;
    const edges: [number, number][] = [
        [-dx, a[0] - box.left], [dx, box.right - a[0]],
        [-dy, a[1] - box.top], [dy, box.bottom - a[1]]
    ];
    for (const [p, q] of edges) {
        if (p === 0) {
            if (q < 0) return null;
        } else {
            const t = q / p;
            if (p < 0) { if (t > t1) return null; if (t > t0) t0 = t; }
            else { if (t < t0) return null; if (t < t1) t1 = t; }
        }
    }
    return [[a[0] + t0 * dx, a[1] + t0 * dy], [a[0] + t1 * dx, a[1] + t1 * dy]];
}

function pointAlong(run: Pt[], lengths: number[], s: number): Pt {
    for (let i = 1; i < run.length; i++) {
        if (lengths[i] >= s) {
            const piece = lengths[i] - lengths[i - 1], t = piece > 0 ? (s - lengths[i - 1]) / piece : 0;
            return [run[i - 1][0] + t * (run[i][0] - run[i - 1][0]), run[i - 1][1] + t * (run[i][1] - run[i - 1][1])];
        }
    }
    return run[run.length - 1];
}

function distance(a: Pt, b: Pt): number {
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function distanceToPath(at: Pt, path: Pt[]): number {
    let least = Infinity;
    for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i];
        if (![a[0], a[1], b[0], b[1]].every(isFinite)) continue;
        const dx = b[0] - a[0], dy = b[1] - a[1], length2 = dx * dx + dy * dy;
        const t = length2 > 0 ? Math.max(0, Math.min(1, ((at[0] - a[0]) * dx + (at[1] - a[1]) * dy) / length2)) : 0;
        least = Math.min(least, distance(at, [a[0] + t * dx, a[1] + t * dy]));
    }
    return least;
}

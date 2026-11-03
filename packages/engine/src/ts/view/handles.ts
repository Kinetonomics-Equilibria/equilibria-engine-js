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
 * are only where they are once their own updates have run this tick.
 *
 * It starts a quarter of the way along the curve's visible length from its
 * left-hand end, the end away from where D and S are labelled, or at the
 * nearest place to that clear of a point, a label, another handle and, where
 * it can, another line: a curve, or a segment such as a dropline. From there
 * it goes with its curve. It keeps the coordinate the drag leaves alone, its
 * height on a curve dragged sideways, so it moves as the pointer does and
 * stays under it, and a curve that is not moving keeps its handle still.
 *
 * It keeps clear of nothing while something is being moved. Placed afresh on
 * every update, a handle hopped: supply's ran down its line ahead of the
 * equilibrium in 20px jumps while demand was dragged, and demand's own leapt
 * 90px from under the pointer as the long-run line crossed it. Now the
 * equilibrium passes over supply's handle, which is drawn underneath it, and
 * once nothing has moved for a moment, with nothing held, a handle left
 * covered steps aside, once, to the nearest place along its curve that is
 * clear. A step of a lesson puts each back where it starts.
 */

/** The thumb: a disc this wide inside a ring this heavy, 16px across, as the sliders' is. */
const THUMB_RADIUS = 6, THUMB_RING = 4;

/** Each arrow's base and tip, out from the centre, and half its base. */
const ARROW_BASE = 11, ARROW_TIP = 18, ARROW_HALF = 5;

/** How far from its centre the handle draws anything. */
const REACH = ARROW_TIP;

/** Room kept between a handle and a point's edge, or a label's box. */
const GAP = 4;

/** Where along the curve's visible length a handle starts: a quarter of the way. */
const START = 0.25;

/** How much of the curve's visible length a handle keeps off at either end. */
const ENDS = 0.1;

/** How finely a handle looks along its curve for a clear place, in pixels. */
const STEP = 2;

/**
 * How long nothing has to move, with nothing held, before a handle left
 * covered steps aside, in milliseconds: longer than a held arrow key takes to
 * repeat, so a run of presses is one move, as a drag is.
 */
const SETTLE_AFTER = 300;

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
export function drawHandle(group, directions: Directions, colour: string, thumb: boolean, arrows = true) {
    group.selectAll('*').remove();
    // Nothing on it of its own, for the stylesheet to add to on focus. A copy
    // of the diagram can leave the stylesheet behind, as a saved picture does,
    // and a circle with no paint of its own is a solid black one.
    group.append('circle')
        .attr('class', 'kg-focus-ring')
        .attr('r', FOCUS_RING)
        .attr('fill', 'none')
        .attr('stroke', 'none');
    if (thumb) {
        group.append('circle')
            .attr('class', 'kg-handle-thumb')
            .attr('r', THUMB_RADIUS)
            .style('fill', 'white')
            .style('stroke', colour)
            .style('stroke-width', `${THUMB_RING}px`);
    }
    (arrows ? ARROWS[directions] || [] : []).forEach(function ([dx, dy]) {
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
    private model;
    /** The settle that waits for things to stop moving, while one does. */
    private waiting: ReturnType<typeof setTimeout> | null = null;

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
        return new Handles(panels, handled[0].model);
    }

    constructor(panels: { objects: ViewObject[] }[], model) {
        this.panels = panels;
        this.model = model;
    }

    /**
     * Every update takes the handles along with their curves. While a gesture
     * is open, a drag, a key press or a slider under the diagram, that is all
     * it does, and they settle once it has closed and nothing has moved for a
     * moment. Any other update, a scenario or a question set, settles them at
     * once, and a step of a lesson puts them back where they start.
     */
    update() {
        const handles = this, model = handles.model;
        if (model && model.arriving) {
            handles.panels.forEach(panel => panel.objects.forEach(vo => { vo.handleHome = null; }));
        }
        const moving = !!(model && model.inGesture);
                handles.panels.forEach(panel => handles.place(panel.objects, !moving));
        if (handles.waiting) clearTimeout(handles.waiting);
        handles.waiting = moving ? setTimeout(() => handles.settle(), SETTLE_AFTER) : null;
        return handles;
    }

    /** Settle once nothing is held: a drag held still is still a drag. */
    private settle() {
        const handles = this;
        handles.waiting = null;
        if (handles.model.inGesture) {
            handles.waiting = setTimeout(() => handles.settle(), SETTLE_AFTER);
            return;
        }
        // Not a diagram taken down while it waited.
        const attached = handles.panels.some(panel => panel.objects.some(function (vo) {
            const node = vo.rootElement && vo.rootElement.node();
            return !!node && node.isConnected;
        }));
        if (attached) handles.panels.forEach(panel => handles.place(panel.objects, true));
    }

    private place(objects: ViewObject[], settle: boolean) {
        // Which handles show, and what is drawn in each, first: a point's
        // arrows are in the way of a curve's handle only while they show.
        const on = objects.filter(function (vo) {
            if (!vo.handleElement) return false;
            const directions: Directions = (vo.interactionHandler && vo.interactionHandler.directions) || '';
            const showing = !!directions && !!vo.handle && displayed(vo);
            vo.handleElement.style('display', showing ? null : 'none');
            // A handle that comes back starts afresh.
            if (!showing) {
                vo.handleHome = null;
                return false;
            }
            // A curve's thumb drops its arrows where the panel says to; a
            // point's arrows are all of its handle, and stay.
            const thumb = vo instanceof Curve,
                colour = thumb ? vo.stroke : vo.fill,
                arrows = !thumb || !!vo.handleArrows,
                drawn = `${directions} ${colour} ${arrows}`;
            if (vo.handleDrawn !== drawn) {
                drawHandle(vo.handleElement, directions, colour, thumb, arrows);
                vo.handleDrawn = drawn;
            }
            return true;
        });

        // A point's handle is drawn round it, in the group its point is
        // already moved to. A curve's is placed along it.
        on.filter((vo): vo is Point => vo instanceof Point).forEach(p => { p.handleAt = p.pixelCircle().at; });
        const curves = on.filter((vo): vo is Curve => vo instanceof Curve);
        if (curves.length > 0) placeAlong(curves, objects, on, settle);

        // What has a handle is what the keyboard can move. Asked of what was
        // decided here, not of the element's style, which the print stylesheet
        // hides: a redraw while printing would stop it being a slider.
        objects.forEach(function (vo) {
            if (vo.handleElement) asSlider(vo, on.indexOf(vo) > -1 && !!vo.handleAt);
        });
    }
}

/** The stretch of a curve a handle can sit on, in pixels, and how far along it each sample is. */
interface Run {
    path: Pt[];
    lengths: number[];
    total: number;
}

/** What a handle keeps clear of in a panel, once its points, labels and lines have drawn. */
function obstaclesIn(objects: ViewObject[], on: ViewObject[]): Obstacles {
    const shown = objects.filter(displayed);
    return {
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
}

/**
 * Place each curve's handle along it: where it goes with its curve and, when
 * `settle`, clear of what else is in its panel. A handle with no place yet is
 * placed clear whatever is moving, as it has nowhere to go with its curve from.
 */
function placeAlong(curves: Curve[], objects: ViewObject[], on: ViewObject[], settle: boolean) {
    const runs = curves.map(runOf);
    // Where each goes with its curve, first, so that one settling keeps clear
    // of where the others are now rather than where they were.
    const riding = curves.map((curve, i) => runs[i] && curve.handleHome ? rideAlong(curve, runs[i]) : null);
    const ridingAt = riding.map((s, i) => s === null ? null : pointAlong(runs[i], s));
    const placed: Pt[] = [];
    let obstacles: Obstacles | null = null;

    curves.forEach(function (curve, i) {
        const run = runs[i];
        if (!run) {
            curve.handleHome = null;
            curve.handleAt = null;
            curve.handleElement.style('display', 'none');
            return;
        }
        let s = riding[i];
        if (s === null || settle) {
            obstacles = obstacles || obstaclesIn(objects, on);
            const around: Obstacles = {
                ...obstacles,
                handles: placed.concat(ridingAt.slice(i + 1).filter(at => !!at))
            };
            s = s === null ? clearOf(curve, run, START * run.total, around, true) : clearOf(curve, run, s, around, false);
        }
        const at = pointAlong(run, s);
        // Where it settles is where the next move takes it from, so a handle
        // slid along an edge as its curve went off the plot is dragged on from
        // there, under the pointer, and not from where it was before.
        if (settle || !curve.handleHome) {
            curve.handleHome = [curve.xScale.scale.invert(at[0]), curve.yScale.scale.invert(at[1])];
        }
        curve.handleAt = at;
        curve.handleElement.attr('transform', `translate(${at[0]} ${at[1]})`);
        placed.push(at);
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
 * The visible run of a curve, measured, or null when too little of it is
 * inside the plot to hold a handle and still show as a curve either side of it.
 */
function runOf(curve: Curve): Run | null {
    const path = visibleRun(curve);
    if (!path) return null;
    const lengths = [0];
    for (let i = 1; i < path.length; i++) lengths.push(lengths[i - 1] + distance(path[i - 1], path[i]));
    const total = lengths[lengths.length - 1];
    return total < 4 * REACH ? null : { path, lengths, total };
}

/**
 * How far along its run a handle is once its curve has moved: at the place
 * that keeps the coordinate its drag leaves alone, its height on a curve
 * dragged sideways and how far across on one dragged up and down, so it goes
 * as the pointer does. Where that place has gone off the plot, the end of the
 * run nearer it. A curve dragged any way, or one that no longer reaches that
 * coordinate at all, takes the place nearest where the handle was. Kept out
 * of the last tenth of the run at either end, by sliding along it.
 */
function rideAlong(curve: Curve, run: Run): number {
    const home: Pt = [curve.xScale.scale(curve.handleHome[0]), curve.yScale.scale(curve.handleHome[1])];
    const directions = curve.interactionHandler && curve.interactionHandler.directions;
    const kept = directions === 'x' ? 1 : directions === 'y' ? 0 : -1;
    let s: number | null = null;
    if (kept > -1) {
        const on = crossing(run.path, home, kept);
        if (on) {
            s = run.lengths[on.i - 1] + on.t * (run.lengths[on.i] - run.lengths[on.i - 1]);
        } else {
            const off = crossing(curve.pixelPath(), home, kept);
            if (off) s = distance(off.at, run.path[0]) <= distance(off.at, run.path[run.path.length - 1]) ? 0 : run.total;
        }
    }
    if (s === null) s = nearestAlong(run, home);
    return Math.min((1 - ENDS) * run.total, Math.max(ENDS * run.total, s));
}

/**
 * The nearest place to `s` along a run that is clear of everything, or else
 * of the points, labels and handles, which another line may run past: a
 * question's start line lies on the curve until the student moves it. With
 * nothing clear even of those, a handle already placed stays where it is, and
 * one being placed for the first time takes the place with the most room.
 */
function clearOf(curve: Curve, run: Run, s: number, obstacles: Obstacles, first: boolean): number {
    const lo = ENDS * run.total, hi = (1 - ENDS) * run.total;
    let clearOfHard: number | null = null, roomiest = s, room = -Infinity;
    for (let d = 0; s - d >= lo || s + d <= hi; d += STEP) {
        for (const at of d === 0 ? [s] : [s - d, s + d]) {
            if (at < lo || at > hi) continue;
            const p = pointAlong(run, at), hard = clearance(p, obstacles);
            if (hard > room) { room = hard; roomiest = at; }
            if (hard < 0) continue;
            if (lineClearance(curve, p, obstacles) >= 0) return at;
            if (clearOfHard === null) clearOfHard = at;
        }
    }
    if (clearOfHard !== null) return clearOfHard;
    return first ? roomiest : s;
}

/** How far a handle at `at` is from the other lines in its panel, past its reach: negative where it would touch one. */
function lineClearance(curve: Curve, at: Pt, obstacles: Obstacles): number {
    return obstacles.lines
        .filter(line => line.from !== curve)
        .reduce((least, line) => Math.min(least, distanceToPath(at, line.path) - REACH), Infinity);
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
    // An end the box did not cut is the sample itself, exactly: `a + 1 * (b - a)`
    // can be a rounding away from `b`, which read as the curve leaving the box
    // there and split it in two, and the handle jumped to the longer half.
    return [
        t0 === 0 ? a : [a[0] + t0 * dx, a[1] + t0 * dy],
        t1 === 1 ? b : [a[0] + t1 * dx, a[1] + t1 * dy]
    ];
}

function pointAlong(run: Run, s: number): Pt {
    const { path, lengths } = run;
    for (let i = 1; i < path.length; i++) {
        if (lengths[i] >= s) {
            const piece = lengths[i] - lengths[i - 1], t = piece > 0 ? (s - lengths[i - 1]) / piece : 0;
            return [path[i - 1][0] + t * (path[i][0] - path[i - 1][0]), path[i - 1][1] + t * (path[i][1] - path[i - 1][1])];
        }
    }
    return path[path.length - 1];
}

/**
 * Where a path crosses the line through `at` that keeps `at[axis]`, at the
 * crossing nearest `at`: on the piece ending at sample `i`, `t` of the way
 * along it. Null where it never does.
 */
function crossing(path: Pt[], at: Pt, axis: number): { i: number, t: number, at: Pt } | null {
    let best: { i: number, t: number, at: Pt } | null = null, least = Infinity;
    for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i], span = b[axis] - a[axis];
        if (!(span !== 0 && isFinite(span))) continue;
        const t = (at[axis] - a[axis]) / span;
        if (t < 0 || t > 1) continue;
        const p: Pt = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])], d = distance(at, p);
        if (d < least) { least = d; best = { i, t, at: p }; }
    }
    return best;
}

/** How far along a run its nearest place to `at` is. */
function nearestAlong(run: Run, at: Pt): number {
    const { path, lengths } = run;
    let best = 0, least = Infinity;
    for (let i = 1; i < path.length; i++) {
        const t = towards(at, path[i - 1], path[i]),
            a = path[i - 1], b = path[i],
            d = distance(at, [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
        if (d < least) { least = d; best = lengths[i - 1] + t * (lengths[i] - lengths[i - 1]); }
    }
    return best;
}

/** How far from `a` to `b` the nearest place on that piece to `at` is, from 0 to 1. */
function towards(at: Pt, a: Pt, b: Pt): number {
    const dx = b[0] - a[0], dy = b[1] - a[1], length2 = dx * dx + dy * dy;
    return length2 > 0 ? Math.max(0, Math.min(1, ((at[0] - a[0]) * dx + (at[1] - a[1]) * dy) / length2)) : 0;
}

function distance(a: Pt, b: Pt): number {
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function distanceToPath(at: Pt, path: Pt[]): number {
    let least = Infinity;
    for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i];
        if (![a[0], a[1], b[0], b[1]].every(isFinite)) continue;
        const t = towards(at, a, b);
        least = Math.min(least, distance(at, [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]));
    }
    return least;
}

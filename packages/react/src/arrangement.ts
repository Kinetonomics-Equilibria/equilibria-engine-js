/**
 * Where the panels go.
 *
 * Under one engine per screen (Fork 1 = A) the panels are not components. They
 * are regions of one SVG whose fractions someone has to compute, and this is
 * where that arithmetic lives — deliberately as a pure function of a box and a
 * list of keys, with no React and no DOM, because arithmetic is what the whole
 * focus-and-rail design rests on and it should be checkable without rendering
 * anything.
 *
 * It reports fractions, which is the engine's unit: `x`/`width` are fractions
 * of the canvas width, `y`/`height` of its height. It computes in a normalised
 * space where the canvas is 1 wide and `1 / aspectRatio` tall, so a square is a
 * square and **the result depends on the stage's shape but not on its size**: a
 * stage that doubles produces the same arrangement, and its panels keep their
 * proportions to each other at every size.
 *
 * That property used to carry more weight than it does now. While the rects
 * were compiled into the engine's config, a new arrangement meant a rebuilt
 * diagram, and being scale-free was what kept a window drag from rebuilding it
 * on every pixel. The rects are params now and a new arrangement is one
 * `relayout` (see `toCustomLayout`), so this is a property of the design rather
 * than a defence of it.
 *
 * Nothing here knows what a panel *contains*. No economics vocabulary belongs
 * in this file or in the component that consumes it; which panel is focal and
 * what its chip says are the application's decisions.
 *
 * **One exception to scale-free, on purpose: room.** A panel's tick labels and
 * axis titles are drawn *outside* its box, at fixed pixel offsets, and so is the
 * app's chrome. A gutter that was a fraction of the canvas reserved 18px for
 * furniture that needs 50, and the grid's rows ran into each other. So room is
 * asked for in pixels, because the thing it is for is pixels, and a stage that
 * reserves it gets fractions that depend on its size. Without room the result
 * is scale-free exactly as before.
 */

import { densityIndex, densityParamName, levelForSize } from 'equilibria-engine-js';
import type { DensityLevel } from 'equilibria-engine-js';

/** How the stage is arranged. `grid` is a toggle, never the landing state. */
export type StageMode = 'focus' | 'grid';

/**
 * What a panel is in the arrangement.
 *
 * Reported rather than left for a host to infer from a size, because two things
 * hang on it that have to agree: how much detail the panel draws, and where its
 * chrome can go without landing on that detail. A `rail` panel stacks beside
 * the focal one and a `strip` panel lies under it; they are the same glyph in
 * two places, and the chrome that fits under one does not fit under the other.
 *
 * A `shelf` panel lies under the focal one too, on a stage too narrow for a
 * strip. A strip keeps its caption beside its glyph, and a stage a phone wide,
 * or a tablet's beside an open navbar, has no width for both: the caption took
 * the slot and left the glyph a square of nothing. A shelf has its caption above
 * the glyph instead, and spends the stage's height on it, which a narrow stage
 * has to spare. It is offered only to a host that says what its chrome takes
 * there (`chrome.shelf`), since a host that has not has nothing to put above it.
 */
export type PanelRole = 'focal' | 'rail' | 'strip' | 'shelf' | 'grid';

/** Pixels on each side of a panel's box. */
export interface Room {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

/** Room asked for by role: whatever the host's chrome takes outside a panel of each. */
export type RoomByRole = Partial<Record<PanelRole, Partial<Room>>>;

/**
 * How far the engine's own furniture reaches outside a panel's box, per level.
 *
 * Measured on the default theme rather than derived, and rounded up a couple of
 * pixels. `full` is dominated by the axis titles, which the engine places 40px
 * past each axis (`KGAuthor/graphObjects/axis.ts`); `compact` by the tick labels
 * and a dropline's `P*`/`Q*`, which are wider than a tick; `indicator` draws no
 * text at all, only the axis line's end caps.
 */
export const FURNITURE: Record<DensityLevel, Room> = {
    full: { top: 8, right: 8, bottom: 52, left: 52 },
    compact: { top: 8, right: 8, bottom: 24, left: 26 },
    indicator: { top: 0, right: 0, bottom: 6, left: 6 }
};

/**
 * One panel's rect, as fractions of the canvas, plus what it is and the detail
 * it draws at.
 */
export interface PanelRect {
    key: string;
    x: number;
    y: number;
    width: number;
    height: number;
    role: PanelRole;
    level: DensityLevel;

    /**
     * The share of the stage the panel was given, before its square was fitted
     * into it with its room kept clear: the whole focal column, a rail slot, a
     * grid cell. The square is centred in it, so it always holds the panel and
     * its room. In the same fractions as the rect.
     *
     * For a host that draws something behind a panel and wants it to fill the
     * panel's share rather than hug the square — a card whose edges line up with
     * the stage's — since that share is otherwise arithmetic only this file knows.
     */
    slot: { x: number; y: number; width: number; height: number };
}

export interface Arrangement {
    /** The canvas shape. The engine derives its height from this and the container width. */
    aspectRatio: number;
    mode: StageMode;
    focused: string;
    panels: PanelRect[];
}

export interface ArrangeInput {
    /** The stage's box in CSS pixels — the container the engine mounts into. */
    width: number;
    height: number;
    /** Panel keys, in the order the author declared them. */
    panels: string[];
    /** Which key is focal. Defaults to the first. Ignored in `grid`. */
    focused?: string;
    mode?: StageMode;

    /**
     * Pixels the host's chrome takes outside a panel, by role — a caption above
     * the focal panel, say, and one under each rail panel.
     *
     * Naming `shelf` here is what offers one: a filmstrip too narrow for its
     * captions beside its glyphs puts them above instead, in this much room.
     */
    chrome?: RoomByRole;

    /**
     * Pixels the engine's furniture takes outside a panel, by level. Pass
     * `FURNITURE` when the panels will draw at the levels reported here; omit it
     * and no room is kept for axes at all.
     */
    furniture?: Record<DensityLevel, Room>;
}

/**
 * Below this stage width the rail becomes a horizontal filmstrip under the
 * focal panel.
 *
 * Measured on the *stage*, not the viewport: the navbar collapsing is the same
 * event to this function as the window narrowing, and it is the space the
 * panels actually have that decides whether a column of them can be read.
 */
export const FILMSTRIP_BELOW_PX = 900;

/**
 * Every measurement below is a fraction of the canvas *width*, including the
 * vertical ones — that is what "normalised" means here, and it is why they can
 * be compared with each other. On a 900px stage `PAD` is 16px.
 *
 * They are fractions rather than pixels so the arrangement is scale-free, and
 * the screen was tuned with them as they are. They became fractions to stop a
 * window drag rebuilding the diagram on every pixel, which a resize no longer
 * does whatever they are.
 */
const PAD = 0.018;
const GAP = 0.018;

/** The rail's share of the stage width. */
const RAIL_FRACTION = 0.2;

/**
 * The filmstrip's share of the stage height, at the least. It has more under a
 * focal panel too narrow to use its own (see `filmstrip` in `arrange`).
 */
const STRIP_FRACTION = 0.22;

/** A rect in normalised units, before it is expressed as fractions of the canvas. */
interface Box { x: number; y: number; width: number; height: number }

/** Centre a square of side `side` inside `box`. */
function square(box: Box, side: number): Box {
    return {
        x: box.x + (box.width - side) / 2,
        y: box.y + (box.height - side) / 2,
        width: side,
        height: side
    };
}

/** The largest square that fits in `box`, centred. */
function fitSquare(box: Box): Box {
    return square(box, Math.max(0, Math.min(box.width, box.height)));
}

/** The largest square that fits in `box` with `room` kept clear around it. */
function fitInRoom(box: Box, room: Room): Box {
    return fitSquare({
        x: box.x + room.left,
        y: box.y + room.top,
        width: box.width - room.left - room.right,
        height: box.height - room.top - room.bottom
    });
}

/**
 * Split `box` into `n` equal slots along one axis, packed from its start.
 *
 * The rail and the filmstrip are the same arrangement rotated, so they are the
 * same code: a stack of equal slots, each with a square in it. Squares because
 * a rail panel is a *smaller version of the same shape* — recognition is the
 * only job it has, and a glyph with different proportions from the diagram it
 * stands for does not do it.
 *
 * A slot is no longer along the stack than its square and `room` need. A rail
 * panel's square is usually as wide as the rail allows, so an equal share of
 * the rail's height left it centred in a tall slot: one rail panel floated half
 * way down the stage, beside a focal panel whose top was at the top. Packed
 * from the start, the stack lines up with the focal panel's top (in a
 * filmstrip, its left), every square is the size it was, and what is spare
 * is left at the end.
 */
function slots(box: Box, n: number, vertical: boolean, room: Room): Box[] {
    if (n <= 0) return [];
    const along = vertical ? box.height : box.width,
        share = (along - (n - 1) * GAP) / n,
        roomAlong = vertical ? room.top + room.bottom : room.left + room.right,
        roomAcross = vertical ? room.left + room.right : room.top + room.bottom,
        side = Math.max(0, Math.min((vertical ? box.width : box.height) - roomAcross, share - roomAlong)),
        slot = Math.min(share, side + roomAlong);

    const out: Box[] = [];
    for (let i = 0; i < n; i++) {
        const offset = i * (slot + GAP);
        out.push(vertical
            ? { x: box.x, y: box.y + offset, width: box.width, height: slot }
            : { x: box.x + offset, y: box.y, width: slot, height: box.height });
    }
    return out;
}

/** The cells of a `cols` by `rows` grid over `box`, in reading order. */
function cells(box: Box, cols: number, rows: number): Box[] {
    const cellW = (box.width - (cols - 1) * GAP) / cols,
        cellH = (box.height - (rows - 1) * GAP) / rows;

    const out: Box[] = [];
    for (let i = 0; i < cols * rows; i++) {
        const col = i % cols, row = Math.floor(i / cols);
        out.push({
            x: box.x + col * (cellW + GAP),
            y: box.y + row * (cellH + GAP),
            width: cellW,
            height: cellH
        });
    }
    return out;
}

/** A panel's square, the level it will draw at there, and the box it was fitted into. */
interface Placed { box: Box; level: DensityLevel; slot: Box }

/**
 * The grid whose cells hold the largest panels.
 *
 * `ceil(sqrt(n))` columns is the answer for a square stage and the wrong one
 * for a wide one: three panels came out two by two, with an empty cell, slack
 * either side of every square, and rows too short for the tick labels between
 * them. Trying every column count is n arrangements of n boxes, for n in single
 * figures. A tie goes to the squarer grid, which was the old answer.
 */
function bestGrid(box: Box, n: number, place: (cell: Box) => Placed): Placed[] {
    let best: { placed: Placed[]; side: number; skew: number } | null = null;
    for (let cols = 1; cols <= n; cols++) {
        const rows = Math.ceil(n / cols),
            placed = cells(box, cols, rows).slice(0, n).map(place),
            side = Math.min.apply(null, placed.map(p => p.box.width)),
            skew = Math.abs(cols - rows);
        if (!best || side > best.side + 1e-9 || (Math.abs(side - best.side) <= 1e-9 && skew < best.skew)) {
            best = { placed: placed, side: side, skew: skew };
        }
    }
    return best ? best.placed : [];
}

const NO_ROOM: Room = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * The arrangement for one focus and one mode.
 *
 * Deterministic and side-effect free: the same input always gives the same
 * rects, which is what lets the layout expressions in `toCustomLayout` be
 * generated from the same arithmetic the chrome positions from. If the two ever
 * disagree the chrome floats away from the panel it labels, and that is a bug
 * nobody enjoys finding by eye.
 */
export function arrange(input: ArrangeInput): Arrangement {
    const width = Math.max(1, input.width),
        pixelHeight = Math.max(1, input.height),
        aspectRatio = width / pixelHeight,
        keys = input.panels || [],
        mode: StageMode = input.mode || 'focus',
        focused = keys.indexOf(input.focused as string) > -1 ? (input.focused as string) : keys[0];

    // The canvas in normalised units: 1 wide, and as tall as its shape says.
    const height = 1 / aspectRatio;

    const inner: Box = { x: PAD, y: PAD, width: 1 - 2 * PAD, height: height - 2 * PAD };

    // Room arrives in pixels and everything here is in units of the canvas
    // width, so one division puts the two in the same space.
    const roomFor = function (role: PanelRole, level: DensityLevel): Room {
        const chrome = (input.chrome && input.chrome[role]) || {},
            furniture = input.furniture ? input.furniture[level] : NO_ROOM;
        return {
            top: ((chrome.top || 0) + furniture.top) / width,
            right: ((chrome.right || 0) + furniture.right) / width,
            bottom: ((chrome.bottom || 0) + furniture.bottom) / width,
            left: ((chrome.left || 0) + furniture.left) / width
        };
    };

    /**
     * A panel's square in `box`, and the level it draws at.
     *
     * The level follows the role, not the size. Choosing by size alone was
     * right while size and role were the same thing — the focal panel was large
     * *because* it was focal — and the grid is where they came apart: a grid
     * cell is a panel being read, at a size `auto` treated as barely worth
     * labelling. So the focal panel is drawn in full, a rail, strip or shelf
     * panel as a glyph, and a grid cell in full if it is still big enough once
     * the room for its axis titles is taken out, and compact otherwise — never
     * as a glyph, since the grid exists to read all of them at once.
     */
    const place = function (box: Box, role: PanelRole): Placed {
        if (role !== 'grid') {
            const level: DensityLevel = role === 'focal' ? 'full' : 'indicator';
            return { box: fitInRoom(box, roomFor(role, level)), level: level, slot: box };
        }
        const full = fitInRoom(box, roomFor(role, 'full'));
        if (levelForSize(full.width * width) === 'full') return { box: full, level: 'full', slot: box };
        return { box: fitInRoom(box, roomFor(role, 'compact')), level: 'compact', slot: box };
    };

    const placed: { [key: string]: Placed & { role: PanelRole } } = {};
    const put = function (key: string, box: Box, role: PanelRole) {
        placed[key] = { ...place(box, role), role: role };
    };

    /**
     * The filmstrip under the focal panel: how tall it is, what its `n` panels
     * are, and the box each is fitted into.
     *
     * Its height is a share of the stage's, and more on a narrow stage. There
     * the focal square is as wide as the stage allows and still shorter than
     * its column, and what it could not use was left as a band of nothing above
     * and below it while the glyphs under it were squeezed. So the strip takes
     * that height — as much of it as its squares can fill, and none the focal
     * square could use. Where the focal square is bounded by its height, as at
     * 1440×900 and on most stages, there is none to take, and the strip is the
     * share it always was.
     *
     * Its panels are strip panels, captioned beside, unless the host has room
     * for a shelf and a shelf holds the bigger glyph — which on a narrow stage it
     * does by a long way: at 356px across, a strip's caption column took every
     * pixel of its slot and the glyph came out nothing at all.
     *
     * The strip's panels are packed from the left by `slots`, like the rail's
     * from the top. A shelf's panels share the width out evenly instead, as a
     * caption across the top of a sheet has the sheet's width to work in, and
     * width is what a stage that needs a shelf is short of: packed, a shelf's
     * sheet was only as wide as its glyph, and the name was clipped to fit.
     */
    const filmstrip = function (n: number): { role: PanelRole; height: number; boxes: Box[] } {
        const focalRoom = roomFor('focal', 'full'),
            least = STRIP_FRACTION * height,
            // The column the focal square fills when it is as wide as it can be.
            focalUses = inner.width - focalRoom.left - focalRoom.right + focalRoom.top + focalRoom.bottom,
            most = Math.max(least, inner.height - GAP - focalUses);

        const lay = function (role: PanelRole) {
            const room = roomFor(role, 'indicator'),
                share = (inner.width - (n - 1) * GAP) / n,
                // Tall enough for a square as wide as its share allows, and no taller.
                wants = share - room.left - room.right + room.top + room.bottom,
                stripH = Math.min(most, Math.max(least, wants)),
                box: Box = { x: inner.x, y: inner.y + inner.height - stripH, width: inner.width, height: stripH },
                boxes = role === 'shelf' ? cells(box, n, 1) : slots(box, n, false, room);
            return { role: role, height: stripH, boxes: boxes, side: fitInRoom(boxes[0], room).width };
        };

        const strip = lay('strip');
        if (!(input.chrome && input.chrome.shelf)) return strip;
        const shelf = lay('shelf');
        return shelf.side > strip.side + 1e-9 ? shelf : strip;
    };

    if (keys.length === 0) {
        // Nothing to place. Reported rather than thrown: an app rendering a
        // stage before its data arrives is ordinary, not an error.
    } else if (keys.length === 1) {
        // One panel is the whole stage in either mode, and the whole stage is
        // where the student works — so it is focal, and nothing covers it.
        put(keys[0], inner, 'focal');
    } else if (mode === 'grid') {
        bestGrid(inner, keys.length, cell => place(cell, 'grid'))
            .forEach((p, i) => { placed[keys[i]] = { ...p, role: 'grid' } });
    } else if (width < FILMSTRIP_BELOW_PX) {
        // Filmstrip: the rail lies down under the focal panel. Same slots
        // function, rotated — one code path across the breakpoint, so a rule
        // that holds above it holds below it — until the stage is too narrow
        // for a caption beside each glyph, and the panels are a shelf.
        const strip = filmstrip(keys.length - 1);
        put(focused, { ...inner, height: inner.height - GAP - strip.height }, 'focal');
        keys.filter(k => k !== focused).forEach((k, i) => put(k, strip.boxes[i], strip.role));
    } else {
        const railW = RAIL_FRACTION;
        put(focused, { ...inner, width: inner.width - GAP - railW }, 'focal');
        const rail = slots(
            { x: inner.x + inner.width - railW, y: inner.y, width: railW, height: inner.height },
            keys.length - 1, true, roomFor('rail', 'indicator')
        );
        keys.filter(k => k !== focused).forEach((k, i) => put(k, rail[i], 'rail'));
    }

    return {
        aspectRatio: aspectRatio,
        mode: mode,
        focused: focused,
        // Reported in the author's declared order, not in visual order, so a
        // caller can zip this against its own panel list without a lookup.
        panels: keys.map(function (key) {
            const p = placed[key];
            return {
                key: key,
                x: p.box.x,
                y: p.box.y / height,
                width: p.box.width,
                height: p.box.height / height,
                role: p.role,
                level: p.level,
                slot: {
                    x: p.slot.x,
                    y: p.slot.y / height,
                    width: p.slot.width,
                    height: p.slot.height / height
                }
            };
        })
    };
}

// --- turning an arrangement into params ------------------------------------------

/**
 * The param that says which panel is focal. Its value is an index into `panels`.
 *
 * This, `MODE_PARAM` and `REVEALED_PARAM` say what the arrangement *is*, for an
 * author whose diagram wants to know — a `show` that reads `params.stageMode`.
 * They used to be what every rect was an expression of; the rects are params of
 * their own now (see `toCustomLayout`), and these three are written beside them
 * so they keep telling the truth.
 */
export const FOCUS_PARAM = 'stageFocus';

/** The param that says which mode the stage is in: 0 focus, 1 grid. */
export const MODE_PARAM = 'stageMode';

/**
 * The param that says how many panels have arrived, counted from the front of
 * the declared order.
 *
 * A lesson brings panels in one at a time (P10), and the arrangement has to
 * answer differently for two panels than for four — a rail of blank squares
 * reserving space for panels the student has not met is exactly the "four charts
 * at once" problem in a politer costume.
 *
 * Panels arrive in declared order. That is what lets one number carry the state:
 * the alternative is a set, and a host has to be able to say which one it means.
 */
export const REVEALED_PARAM = 'stageRevealed';

export const MODE_VALUE: { [m in StageMode]: number } = { focus: 0, grid: 1 };

/** One edge of a panel's rect, as `PanelRect` names them. */
export type RectProp = 'x' | 'y' | 'width' | 'height';

const RECT_PROPS: RectProp[] = ['x', 'y', 'width', 'height'];

/**
 * The param holding one edge of one panel's rect: `stageX0`, `stageWidth2`.
 *
 * By declared index rather than by key, because a key is the author's and need
 * not be a name mathjs can read: `supply-side` would parse as a subtraction.
 */
export function rectParamName(index: number, prop: RectProp): string {
    return 'stage' + prop.charAt(0).toUpperCase() + prop.slice(1) + index;
}

/**
 * The grid a rect param snaps to.
 *
 * A param has to have one, and a fraction of the canvas rounded to a millionth
 * is a thousandth of a pixel out on a 1000px stage — well under anything a
 * screen can draw — while the chrome is positioned from the unrounded numbers.
 */
const RECT_ROUND = 0.000001;

/** A param the stage writes, and what it holds. */
export interface StageParamValue {
    name: string;
    value: number;
}

/**
 * Every param that puts the panels where an arrangement says.
 *
 * Focus, mode and how many panels have arrived; each panel's rect, four
 * numbers; and the level each arrived panel draws at, unless its author set
 * one (`authoredDensity`). That is the whole of an arrangement as the engine
 * sees it, so a host that sends the ones that changed has told it everything —
 * and this is the function the chrome's arrangement and the diagram's both come
 * from, which is what keeps a caption over the panel it names.
 *
 * A panel that has not arrived is given the focal panel's box rather than a
 * rect of its own. It draws nothing — everything in it is hidden by the step
 * that will reveal it — so where it sits is arbitrary, and every arbitrary
 * choice except this one is worse: a zero-extent rect collapses its scales, and
 * a box outside the canvas is drawn outside the canvas, because the engine's
 * svg is deliberately `overflow: visible`. Parking it under the focal panel
 * keeps every scale sane and every fraction inside 0–1. Its level is left
 * where it was, since nothing it draws is on screen.
 */
export function layoutParams(
    keys: string[], arrangement: Arrangement, authoredDensity: string[] = []
): StageParamValue[] {
    if (keys.length === 0) return [];

    const byKey: { [key: string]: PanelRect } = {};
    arrangement.panels.forEach(function (p) { byKey[p.key] = p });
    const focal = byKey[arrangement.focused] || arrangement.panels[0];

    const out: StageParamValue[] = [
        { name: FOCUS_PARAM, value: Math.max(0, keys.indexOf(arrangement.focused)) },
        { name: MODE_PARAM, value: MODE_VALUE[arrangement.mode] },
        { name: REVEALED_PARAM, value: Math.max(1, arrangement.panels.length) }
    ];

    keys.forEach(function (key, i) {
        const rect = byKey[key] || focal;
        RECT_PROPS.forEach(function (prop) {
            out.push({ name: rectParamName(i, prop), value: rect ? rect[prop] : 0 });
        });
    });

    arrangement.panels.forEach(function (p) {
        if (authoredDensity.indexOf(p.key) > -1) return;
        out.push({ name: densityParamName(p.key), value: densityIndex(p.level) });
    });

    return out;
}

/** A panel def for `CustomLayout`, whose rect reads four params rather than holding numbers. */
export interface LayoutPanel {
    key: string;
    x: string;
    y: string;
    width: string;
    height: string;
    density: DensityLevel;
}

export interface StageLayout {
    aspectRatio: number;
    panels: LayoutPanel[];
    params: {
        name: string; value: number; min: number; max: number; round: number;
        /** Arrangement, not state; see `params` in `toCustomLayout`. */
        presentation: boolean;
    }[];
}

/** What `toCustomLayout` lays out: an arrangement's input, and how many panels have arrived. */
export interface LayoutInput extends ArrangeInput {
    /** How many panels have arrived, from the front of `panels`. Every one, by default. */
    arrived?: number;
}

/**
 * One layout for every arrangement the stage can be in: a `CustomLayout` whose
 * rects are params.
 *
 * This is what makes a promotion, a reveal and a resize *param changes*. P3
 * made a panel's rect an evaluated expression, and the stage used to spend that
 * on a ternary — every arrangement there could be, compiled into one string per
 * edge over which panel was focal, which mode, how many had arrived — so that
 * moving between them cost one param. What the ternary could not hold was the
 * stage changing *shape*: every number in it was computed for one canvas, so a
 * new shape was a new config and a rebuilt engine, and the rebuild threw away
 * the student's last move along with the old model's `prev`.
 *
 * So the rect is the variable now, not the state it is chosen from: each edge
 * reads its own param, the host computes the arrangement with `arrange` and
 * writes it with `layoutParams`, and the engine's `relayout` changes the
 * canvas's aspect ratio in the same redraw. Nothing about the stage needs a
 * rebuild — and nothing about it is compiled, so no expression grows with the
 * number of panels, modes and counts.
 *
 * The values declared here are the arrangement `input` describes, so the
 * engine's first frame is already right and a host has nothing to send until
 * something changes. Density is declared at each panel's level for the same
 * reason; a panel that has not arrived starts as an `indicator`, the cheapest
 * thing to hold for a panel nobody can see.
 */
export function toCustomLayout(input: LayoutInput): StageLayout {
    const keys = input.panels || [],
        arrived = Math.min(keys.length, Math.max(1, input.arrived === undefined ? keys.length : input.arrived)),
        arrangement = arrange({ ...input, panels: keys.slice(0, arrived) });

    const values: { [name: string]: number } = {};
    layoutParams(keys, arrangement).forEach(function (p) { values[p.name] = p.value });

    const levelOf = function (key: string): DensityLevel {
        const p = arrangement.panels.filter(r => r.key === key)[0];
        return p ? p.level : 'indicator';
    };

    // Declared as presentation params, and it matters: `prev.changed` gates
    // every ghost an author draws, and promoting a panel — or revealing one, or
    // resizing the window — is not the student moving anything. Without the
    // flag, clicking a rail panel would put a ghost and a shift arrow over a
    // diagram nobody had touched. It is also what `relayout` insists on before
    // it will write a param at all.
    const params: StageLayout['params'] = keys.length === 0 ? [] : [
        {
            name: FOCUS_PARAM, value: values[FOCUS_PARAM],
            min: 0, max: Math.max(0, keys.length - 1), round: 1, presentation: true
        },
        { name: MODE_PARAM, value: values[MODE_PARAM], min: 0, max: 1, round: 1, presentation: true },
        {
            name: REVEALED_PARAM, value: values[REVEALED_PARAM],
            min: 1, max: Math.max(1, keys.length), round: 1, presentation: true
        }
    ];
    keys.forEach(function (_, i) {
        RECT_PROPS.forEach(function (prop) {
            const name = rectParamName(i, prop);
            params.push({ name: name, value: values[name], min: 0, max: 1, round: RECT_ROUND, presentation: true });
        });
    });

    return {
        aspectRatio: keys.length > 0 ? arrangement.aspectRatio : 1,
        panels: keys.map((key, i) => ({
            key: key,
            x: 'params.' + rectParamName(i, 'x'),
            y: 'params.' + rectParamName(i, 'y'),
            width: 'params.' + rectParamName(i, 'width'),
            height: 'params.' + rectParamName(i, 'height'),
            density: levelOf(key)
        })),
        params: params
    };
}

/**
 * How many panels have arrived, from the keys a host says are revealed.
 *
 * The count is one past the *last* revealed panel in declared order, not the
 * size of the set: the stage arranges a prefix of the declared panels, which is
 * what lets `REVEALED_PARAM` be one number, so a set that skips one has to
 * resolve to something, and treating the gap as arrived keeps the chrome and
 * the diagram agreeing. `Stage` warns when it happens; this function is what
 * makes the two halves agree while it does.
 */
export function revealedCount(keys: string[], revealed?: string[]): number {
    if (!revealed) return Math.max(1, keys.length);
    let count = 0;
    keys.forEach(function (key, i) { if (revealed.indexOf(key) > -1) count = i + 1 });
    return Math.max(1, count);
}

/**
 * A panel's box in CSS pixels, for positioning chrome over it.
 *
 * The host computed the fractions, so it knows every panel's box without
 * reading anything back out of the SVG — which is the property that lets the
 * chrome be ordinary absolutely positioned DOM rather than foreign objects
 * inside the diagram.
 *
 * `canvasWidth` is the container's width; the engine derives the height from
 * the aspect ratio, so passing the width alone keeps this in step with what was
 * actually drawn.
 */
export function pixelBox(arrangement: Arrangement, key: string, canvasWidth: number): Box | null {
    const panel = arrangement.panels.filter(p => p.key === key)[0];
    if (!panel) return null;
    const canvasHeight = canvasWidth / arrangement.aspectRatio;
    return {
        x: panel.x * canvasWidth,
        y: panel.y * canvasHeight,
        width: panel.width * canvasWidth,
        height: panel.height * canvasHeight
    };
}

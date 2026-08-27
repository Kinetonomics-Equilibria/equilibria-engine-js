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
 * square and — the property that matters — **the result depends on the stage's
 * shape but not on its size**. A stage that doubles produces the same
 * arrangement, which is what lets a resize scale the canvas instead of
 * recomputing a layout and rebuilding the diagram.
 *
 * Nothing here knows what a panel *contains*. No economics vocabulary belongs
 * in this file or in the component that consumes it; which panel is focal and
 * what its chip says are the application's decisions.
 */

/** How the stage is arranged. `grid` is a toggle, never the landing state. */
export type StageMode = 'focus' | 'grid';

/** One panel's rect, as fractions of the canvas, plus the detail it draws at. */
export interface PanelRect {
    key: string;
    x: number;
    y: number;
    width: number;
    height: number;
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
 * They are fractions rather than pixels so the arrangement is scale-free. Pixel
 * padding would make the fractions a function of the stage's size, and every
 * pixel of a window drag would then be a new layout and a rebuilt diagram.
 */
const PAD = 0.018;
const GAP = 0.018;

/** The rail's share of the stage width. */
const RAIL_FRACTION = 0.2;

/** The filmstrip's share of the stage height. */
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

/**
 * Lay `n` boxes out along one axis of `box`, each holding a centred square.
 *
 * The rail and the filmstrip are the same arrangement rotated, so they are the
 * same code: a stack of equal slots, each with a square in it. Squares because
 * a rail panel is a *smaller version of the same shape* — recognition is the
 * only job it has, and a glyph with different proportions from the diagram it
 * stands for does not do it.
 */
function slots(box: Box, n: number, vertical: boolean): Box[] {
    if (n <= 0) return [];
    const along = vertical ? box.height : box.width,
        across = vertical ? box.width : box.height,
        slot = (along - (n - 1) * GAP) / n,
        side = Math.max(0, Math.min(slot, across));

    const out: Box[] = [];
    for (let i = 0; i < n; i++) {
        const offset = i * (slot + GAP);
        out.push(square(
            vertical
                ? { x: box.x, y: box.y + offset, width: box.width, height: slot }
                : { x: box.x + offset, y: box.y, width: slot, height: box.height },
            side
        ));
    }
    return out;
}

/** Rows and columns for a grid of `n` cells, as square as the count allows. */
function gridShape(n: number): { cols: number; rows: number } {
    const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
    return { cols: cols, rows: Math.max(1, Math.ceil(n / cols)) };
}

function gridBoxes(box: Box, n: number): Box[] {
    const { cols, rows } = gridShape(n),
        cellW = (box.width - (cols - 1) * GAP) / cols,
        cellH = (box.height - (rows - 1) * GAP) / rows;

    const out: Box[] = [];
    for (let i = 0; i < n; i++) {
        const col = i % cols, row = Math.floor(i / cols);
        out.push(fitSquare({
            x: box.x + col * (cellW + GAP),
            y: box.y + row * (cellH + GAP),
            width: cellW,
            height: cellH
        }));
    }
    return out;
}

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

    const boxes: { [key: string]: Box } = {};

    if (keys.length === 0) {
        // Nothing to place. Reported rather than thrown: an app rendering a
        // stage before its data arrives is ordinary, not an error.
    } else if (keys.length === 1) {
        boxes[keys[0]] = fitSquare(inner);
    } else if (mode === 'grid') {
        gridBoxes(inner, keys.length).forEach((b, i) => { boxes[keys[i]] = b });
    } else if (width < FILMSTRIP_BELOW_PX) {
        // Filmstrip: the rail lies down under the focal panel. Same slots
        // function, rotated — one code path across the breakpoint, so a rule
        // that holds above it holds below it.
        const stripH = STRIP_FRACTION * height;
        boxes[focused] = fitSquare({ ...inner, height: inner.height - GAP - stripH });
        const strip = slots(
            { x: inner.x, y: inner.y + inner.height - stripH, width: inner.width, height: stripH },
            keys.length - 1, false
        );
        keys.filter(k => k !== focused).forEach((k, i) => { boxes[k] = strip[i] });
    } else {
        const railW = RAIL_FRACTION;
        boxes[focused] = fitSquare({ ...inner, width: inner.width - GAP - railW });
        const rail = slots(
            { x: inner.x + inner.width - railW, y: inner.y, width: railW, height: inner.height },
            keys.length - 1, true
        );
        keys.filter(k => k !== focused).forEach((k, i) => { boxes[k] = rail[i] });
    }

    return {
        aspectRatio: aspectRatio,
        mode: mode,
        focused: focused,
        // Reported in the author's declared order, not in visual order, so a
        // caller can zip this against its own panel list without a lookup.
        panels: keys.map(function (key) {
            const b = boxes[key];
            return {
                key: key,
                x: b.x,
                y: b.y / height,
                width: b.width,
                height: b.height / height
            };
        })
    };
}

// --- turning a set of arrangements into one layout ------------------------------

/** The param that says which panel is focal. Its value is an index into `panels`. */
export const FOCUS_PARAM = 'stageFocus';

/** The param that says which mode the stage is in: 0 focus, 1 grid. */
export const MODE_PARAM = 'stageMode';

export const MODE_VALUE: { [m in StageMode]: number } = { focus: 0, grid: 1 };

/** A panel def for `CustomLayout`, whose rect is an expression rather than a number. */
export interface LayoutPanel {
    key: string;
    x: string;
    y: string;
    width: string;
    height: string;
    density: string;
}

export interface StageLayout {
    aspectRatio: number;
    panels: LayoutPanel[];
    params: { name: string; value: number; min: number; max: number; round: number }[];
}

/** `a == b ? t : f`, with both branches already parenthesised by their caller. */
const ternary = (test: string, t: string, f: string) => `(${test} ? ${t} : ${f})`;

const round6 = (n: number) => String(Math.round(n * 1e6) / 1e6);

/**
 * Every arrangement the stage can be in, compiled into one layout.
 *
 * This is what makes a promotion a *param change*. P3 made a panel's rect an
 * evaluated expression, so the whole set of positions can be written down once
 * — a ternary over which panel is focal and which mode the stage is in — and
 * moving between them costs one `updateParams` call and no remount. The
 * alternative is recomputing the numbers in JS and handing the engine a new
 * config, which is a rebuild: the diagram flashes and any drag in progress is
 * lost.
 *
 * The one thing it cannot absorb is the stage changing *shape*, because that
 * changes `aspectRatio` and every fraction with it. A resize within the same
 * aspect ratio is free — the engine scales the canvas and the fractions still
 * hold — so this is only paid when the container's proportions actually change.
 *
 * Density is `auto` on purpose, against P4's general recommendation that the
 * host should choose. P4's reason for that recommendation is that the engine
 * can see a panel is small but not *why*. Here the arrangement has made size
 * and role the same thing: the focal panel is large because it is focal. `auto`
 * is also the only setting that follows a promotion continuously, because the
 * engine re-picks a level from the panel's measured box in the same tick that
 * the box changes.
 */
export function toCustomLayout(input: ArrangeInput): StageLayout {
    const keys = input.panels || [],
        modes: StageMode[] = ['focus', 'grid'];

    // Every arrangement, indexed [mode][focusIndex]. The focus index is
    // irrelevant in grid mode, so that row is computed once.
    const byMode: { [m: string]: Arrangement[] } = {};
    modes.forEach(function (mode) {
        byMode[mode] = (mode === 'grid' ? [keys[0]] : keys).map(focused =>
            arrange({ ...input, mode: mode, focused: focused }));
    });

    const component = function (key: string, prop: 'x' | 'y' | 'width' | 'height'): string {
        const at = (mode: StageMode, focusIndex: number) => {
            const a = byMode[mode][mode === 'grid' ? 0 : focusIndex];
            const panel = a.panels.filter(p => p.key === key)[0];
            return round6(panel ? panel[prop] : 0);
        };

        // Innermost first: the focus chain, read right to left so the last key
        // is the fallthrough rather than a redundant test.
        let focusExpr = at('focus', keys.length - 1);
        for (let i = keys.length - 2; i >= 0; i--) {
            focusExpr = ternary(`params.${FOCUS_PARAM} == ${i}`, at('focus', i), focusExpr);
        }

        if (keys.length < 2) return focusExpr;
        return ternary(`params.${MODE_PARAM} == ${MODE_VALUE.grid}`, at('grid', 0), focusExpr);
    };

    return {
        aspectRatio: byMode.focus[0] ? byMode.focus[0].aspectRatio : 1,
        panels: keys.map(key => ({
            key: key,
            x: component(key, 'x'),
            y: component(key, 'y'),
            width: component(key, 'width'),
            height: component(key, 'height'),
            density: 'auto'
        })),
        params: [
            { name: FOCUS_PARAM, value: 0, min: 0, max: Math.max(0, keys.length - 1), round: 1 },
            { name: MODE_PARAM, value: MODE_VALUE.focus, min: 0, max: 1, round: 1 }
        ]
    };
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

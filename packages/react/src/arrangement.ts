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

/**
 * The param that says how many panels have arrived, counted from the front of
 * the declared order.
 *
 * A lesson brings panels in one at a time (P10), and the arrangement has to
 * answer differently for two panels than for four — a rail of blank squares
 * reserving space for panels the student has not met is exactly the "four charts
 * at once" problem in a politer costume. So the count joins focus and mode as a
 * thing every rect is an expression of, for the same reason and at the same
 * cost: a reveal moves panels without rebuilding the diagram.
 *
 * Panels arrive in declared order. That is what lets one number carry the state:
 * the alternative is a set, and a set means compiling every subset.
 */
export const REVEALED_PARAM = 'stageRevealed';

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
    params: {
        name: string; value: number; min: number; max: number; round: number;
        /** Arrangement, not state; see `params` in `toCustomLayout`. */
        presentation: boolean;
    }[];
}

/** `a == b ? t : f`, with both branches already parenthesised by their caller. */
const ternary = (test: string, t: string, f: string) => `(${test} ? ${t} : ${f})`;

/**
 * A chain of tests over one fallthrough, collapsed when it decides nothing.
 *
 * Three params now index the rect expressions, and most rects do not depend on
 * all three: a single-panel stage has no mode to test, and a panel's box under
 * `grid` is the same whichever panel is focal. Emitting the ternary anyway would
 * triple the length of an expression that mathjs re-evaluates on every param
 * change, which is the drag path. So a level that gives one answer emits one
 * answer.
 */
function chain(cases: { test: string; value: string }[], fallback: string): string {
    if (cases.every(c => c.value === fallback)) return fallback;
    let expr = fallback;
    for (let i = cases.length - 1; i >= 0; i--) {
        expr = ternary(cases[i].test, cases[i].value, expr);
    }
    return expr;
}

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
        modes: StageMode[] = ['focus', 'grid'],
        counts = keys.map((_, i) => i + 1);

    // Every arrangement, indexed [count][mode][focusIndex]. The focus index is
    // irrelevant in grid mode, so that row is computed once.
    const byCount: { [count: number]: { [m: string]: Arrangement[] } } = {};
    counts.forEach(function (count) {
        const arrived = keys.slice(0, count);
        const byMode: { [m: string]: Arrangement[] } = {};
        modes.forEach(function (mode) {
            byMode[mode] = (mode === 'grid' ? [arrived[0]] : keys).map(focused =>
                arrange({ ...input, panels: arrived, mode: mode, focused: focused }));
        });
        byCount[count] = byMode;
    });

    const component = function (key: string, prop: 'x' | 'y' | 'width' | 'height'): string {

        /**
         * One number, for one state of the three params.
         *
         * A panel that has not arrived yet is given the focal panel's box rather
         * than a rect of its own. It draws nothing — everything in it is hidden
         * by the step that will reveal it — so where it sits is arbitrary, and
         * every arbitrary choice except this one is worse: a zero-extent rect
         * collapses its scales, and a box outside the canvas is drawn outside
         * the canvas, because the engine's svg is deliberately `overflow:
         * visible`. Parking it under the focal panel keeps every scale sane and
         * every fraction inside 0–1.
         */
        const at = (count: number, mode: StageMode, focusIndex: number) => {
            const a = byCount[count][mode][mode === 'grid' ? 0 : focusIndex];
            const panel = a.panels.filter(p => p.key === key)[0]
                || a.panels.filter(p => p.key === a.focused)[0];
            return round6(panel ? panel[prop] : 0);
        };

        // Innermost first: the focus chain, with the last key as the
        // fallthrough rather than a redundant test. Then the mode, then how many
        // panels have arrived.
        const forCount = function (count: number): string {
            const focusExpr = chain(
                keys.slice(0, -1).map((_, i) => ({
                    test: `params.${FOCUS_PARAM} == ${i}`,
                    value: at(count, 'focus', i)
                })),
                at(count, 'focus', Math.max(0, keys.length - 1))
            );
            return chain(
                [{ test: `params.${MODE_PARAM} == ${MODE_VALUE.grid}`, value: at(count, 'grid', 0) }],
                focusExpr
            );
        };

        if (keys.length === 0) return '0';

        return chain(
            counts.slice(0, -1).map(count => ({
                test: `params.${REVEALED_PARAM} == ${count}`,
                value: forCount(count)
            })),
            forCount(keys.length)
        );
    };

    const full = byCount[keys.length];

    return {
        aspectRatio: full && full.focus[0] ? full.focus[0].aspectRatio : 1,
        panels: keys.map(key => ({
            key: key,
            x: component(key, 'x'),
            y: component(key, 'y'),
            width: component(key, 'width'),
            height: component(key, 'height'),
            density: 'auto'
        })),
        // Declared as presentation params, and it matters: `prev.changed` gates
        // every ghost an author draws, and promoting a panel — or revealing
        // one — is not the student moving anything. Without the flag, clicking a
        // rail panel would put a ghost and a shift arrow over a diagram nobody
        // had touched.
        //
        // `REVEALED_PARAM` starts at every panel, so a host that never mentions
        // reveal gets exactly the arrangement it got before this existed.
        params: [
            { name: FOCUS_PARAM, value: 0, min: 0, max: Math.max(0, keys.length - 1), round: 1, presentation: true },
            { name: MODE_PARAM, value: MODE_VALUE.focus, min: 0, max: 1, round: 1, presentation: true },
            {
                name: REVEALED_PARAM, value: Math.max(1, keys.length),
                min: 1, max: Math.max(1, keys.length), round: 1, presentation: true
            }
        ]
    };
}

/**
 * How many panels have arrived, from the keys a host says are revealed.
 *
 * The count is one past the *last* revealed panel in declared order, not the
 * size of the set: the compiled expressions index prefixes, so a set that skips
 * one has to resolve to something, and treating the gap as arrived keeps the
 * chrome and the diagram agreeing. `Stage` warns when it happens; this function
 * is what makes the two halves agree while it does.
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

/**
 * What moved, and which way.
 *
 * The narration strip is a three-clause sentence — `a 20.0 → 24.0` ·
 * `D shifts right` · `P* 11.0 → 13.0`. The first and third clauses come free
 * from params and calcs. The middle one needs to know that a *named* object
 * moved and how, and that is what this file computes.
 *
 * The engine does not write the sentence. It reports a movement the app can
 * phrase: phrasing, tense, tone and translation are product copy, and belong
 * where they can be revised without touching a diagram. So the descriptor is
 * `{ kind: 'shift', axis: 'x', sign: 1 }`, never "shifts right".
 *
 * Geometry is sampled in **domain units**, not pixels, so a movement means the
 * same thing whatever size the panel is drawn at — and so a panel sliding
 * across the canvas (P3) is not mistaken for its contents moving.
 */

export interface Sample {
    x: number;
    y: number;
}

export interface Movement {
    /**
     * `move` — a single point changed position.
     * `shift` — every sampled point translated by the same amount.
     * `rotate` — the shape pivoted: the points did not move together.
     */
    kind: 'move' | 'shift' | 'rotate';

    /** Mean change, in domain units. Signed. */
    dx: number;
    dy: number;

    /**
     * Which axis the movement is along, or `both`.
     *
     * A curve that moves up *and* right is one event described two ways, and
     * which description is right is a question about economics, not geometry —
     * for a demand curve the convention is horizontal. So `both` is reported as
     * `both` and the app decides. `sign` is 0 there, because there is no single
     * direction to sign.
     */
    axis: 'x' | 'y' | 'both';
    sign: 1 | -1 | 0;

    /** Only on `rotate`: whether the chord through the shape got steeper. */
    steeper?: boolean;
}

/**
 * How much change counts as none.
 *
 * Relative to the axis domain rather than absolute, because a diagram whose
 * prices run 0–20 and one whose quantities run 0–20,000 have nothing in common
 * on an absolute scale. This is the number that decides between the app saying
 * nothing and the app saying something wrong, so it is deliberately generous:
 * a tenth of a percent of the visible range is below a pixel on any panel a
 * student can see, and every param is snapped onto a `round` grid anyway.
 */
export const NOISE_FRACTION = 0.001;

function mean(xs: number[]): number {
    return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function span(xs: number[]): number {
    return Math.max(...xs) - Math.min(...xs);
}

/** The slope of the chord from the first sample to the last; null if vertical or degenerate. */
function chordSlope(points: Sample[]): number | null {
    if (points.length < 2) return null;
    const first = points[0], last = points[points.length - 1];
    const dx = last.x - first.x;
    if (dx === 0) return null;
    return (last.y - first.y) / dx;
}

function centroid(points: Sample[]): Sample {
    return { x: mean(points.map(p => p.x)), y: mean(points.map(p => p.y)) };
}

function allFinite(points: Sample[]): boolean {
    return points.every(p => isFinite(p.x) && isFinite(p.y));
}

/**
 * Compare an object's geometry before and after, and say what happened.
 *
 * Returns `null` for "nothing worth reporting" — no movement, or not enough
 * information to claim one. That case matters more than it looks: an app that
 * is told nothing says nothing, whereas an app told "shifted right" by rounding
 * noise says something confidently false to a student.
 *
 * `xNoise`/`yNoise` are absolute tolerances in domain units; see
 * `noiseFor()` for how they are derived from an axis.
 */
export function describeMovement(
    before: Sample[],
    after: Sample[],
    xNoise: number,
    yNoise: number
): Movement | null {

    if (!before || !after || before.length === 0 || after.length === 0) return null;
    if (!allFinite(before) || !allFinite(after)) return null;

    // A curve resampled over a different domain — the panel's axes changed under
    // it — has no point-to-point correspondence. Its centroid still does, so
    // report a translation from that rather than either lying or going silent.
    if (before.length !== after.length) {
        const b = centroid(before), a = centroid(after);
        return classify([a.x - b.x], [a.y - b.y], after.length, xNoise, yNoise, before, after);
    }

    const dxs = after.map((p, i) => p.x - before[i].x),
        dys = after.map((p, i) => p.y - before[i].y);

    return classify(dxs, dys, after.length, xNoise, yNoise, before, after);
}

function classify(
    dxs: number[],
    dys: number[],
    pointCount: number,
    xNoise: number,
    yNoise: number,
    before: Sample[],
    after: Sample[]
): Movement | null {

    const movedX = Math.max(...dxs.map(Math.abs)) > xNoise,
        movedY = Math.max(...dys.map(Math.abs)) > yNoise;

    if (!movedX && !movedY) return null;

    const dx = mean(dxs), dy = mean(dys);

    // Every sample moved together, within tolerance: a translation. A single
    // point is always "uniform", and is called a move rather than a shift —
    // points do not shift, curves do.
    const uniform = span(dxs) <= xNoise && span(dys) <= yNoise;

    if (!uniform) {
        const beforeSlope = chordSlope(before),
            afterSlope = chordSlope(after);
        return {
            kind: 'rotate',
            dx, dy,
            axis: axisOf(movedX, movedY),
            sign: signOf(axisOf(movedX, movedY), dx, dy),
            steeper: beforeSlope !== null && afterSlope !== null
                ? Math.abs(afterSlope) > Math.abs(beforeSlope)
                : undefined
        };
    }

    const axis = axisOf(movedX, movedY);
    return {
        kind: pointCount === 1 ? 'move' : 'shift',
        dx, dy,
        axis,
        sign: signOf(axis, dx, dy)
    };
}

function axisOf(movedX: boolean, movedY: boolean): 'x' | 'y' | 'both' {
    if (movedX && movedY) return 'both';
    return movedX ? 'x' : 'y';
}

function signOf(axis: 'x' | 'y' | 'both', dx: number, dy: number): 1 | -1 | 0 {
    if (axis === 'both') return 0;
    const d = axis === 'x' ? dx : dy;
    return d > 0 ? 1 : d < 0 ? -1 : 0;
}

/** The tolerance for one axis: a fixed fraction of the domain currently on screen. */
export function noiseFor(domainMin: number, domainMax: number): number {
    const range = Math.abs(domainMax - domainMin);
    return isFinite(range) && range > 0 ? range * NOISE_FRACTION : 0;
}

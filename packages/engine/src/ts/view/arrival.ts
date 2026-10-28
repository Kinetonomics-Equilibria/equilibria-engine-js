import * as d3 from "d3";

/**
 * How an object a lesson step brings in arrives on the chart.
 *
 * A point pops: it grows from nothing to its size, a little past it and back.
 * A segment is drawn out from one end, as a pen would, which for a dropline is
 * from its point to the axis: the way a student's eye reads the value off. The
 * dropline starts as the pop is nearly done, so the point arrives first and
 * the reading follows it.
 *
 * Only an object that says `arrive`, only when its `show` turns on, and only
 * in an update the host says is an arrival (`kg.update(config, { arrive:
 * true })`): a lesson step, not a link opening at step 3, a remount restoring
 * the view, a question being set or a drag. Never for a viewer who has asked
 * for less motion. Nothing waits on it: an object is where it belongs the
 * moment anything redraws it, and the next step can come at any time.
 */

export const POP_MS = 200;
export const DROP_DELAY_MS = 150;
export const DROP_MS = 300;

/** A pop: past full size and back. */
export const popEase = d3.easeBackOut;

/** A line drawn out, slowing as it reaches the far end. */
export const dropEase = d3.easeCubicOut;

/** The name the arrival's transition runs under, so a redraw can stop it. */
export const ARRIVAL = 'arrive';

/** Whether the viewer has asked their system for less motion. */
export function reducedMotion(): boolean {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

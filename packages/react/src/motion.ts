/**
 * How the stage gets from one arrangement to the next.
 *
 * A promotion used to be a cut: one frame the rail panel was a glyph, the next
 * it filled the stage, and the eye had to find it again. Now the stage plays
 * the move — every panel travels from where it was to where it is going,
 * diagram, sheet and caption together — so the student sees *which* panel came
 * forward and where the one it replaced went.
 *
 * It is a run of ordinary arrangements. Each frame is a set of rects the stage
 * lays the engine out at, exactly as it would a resting one, so the diagram is
 * drawn live at every size on the way: its text stays crisp and its axes
 * re-tick as they go, where a picture of the panel scaled up would blur. That
 * costs a redraw a frame, for a third of a second, on a click.
 *
 * Two panels trading places pass through each other, and in one SVG that
 * draws both diagrams over the same square. So a panel that is getting smaller
 * steps out of the way — it fades as it leaves and fades back in where it
 * lands — and the one coming forward stays solid the whole way: it is the one
 * the student asked to see.
 *
 * Pure arithmetic, like the arrangement it interpolates, so it can be checked
 * without a DOM or a clock.
 */

import type { DensityLevel } from 'equilibria-engine-js';
import type { Arrangement, PanelRect, Room } from './arrangement';

/**
 * How long a move takes. Short enough to read as a response to the click and
 * not as something to wait for; the ease puts most of the travel in its first
 * hundred milliseconds.
 */
export const MOVE_MS = 300;

/** One panel as drawn in one frame: its rect, and what goes with a rect on screen. */
export interface PanelFrame extends PanelRect {
    /**
     * Pixels kept clear around the box — the chrome's room and the furniture's.
     * At rest it is what the role and level ask for; in a move it travels with
     * the box, so a sheet drawn to it grows and shrinks with its panel instead
     * of jumping when the level changes.
     */
    room: Room;
    /** 1 at rest. Below it only while the panel steps out of another's way. */
    opacity: number;
}

/** An arrangement as drawn in one frame. */
export interface Frame extends Arrangement {
    panels: PanelFrame[];
}

/** A move under way: where it started, where it is going, and how far through it is in time. */
export interface Move {
    from: Frame;
    to: Frame;
    /** Elapsed time as a fraction of `MOVE_MS`, 0 to 1. */
    t: number;
}

/** An arrangement at rest, with each panel's room worked out. */
export function settle(arrangement: Arrangement, roomOf: (panel: PanelRect) => Room): Frame {
    return {
        ...arrangement,
        panels: arrangement.panels.map(p => ({ ...p, room: roomOf(p), opacity: 1 }))
    };
}

/**
 * Whether going from one arrangement to the other is a move worth playing.
 *
 * Only a change of focus or mode. A resize must land in the frame it happens
 * in, or the diagram trails the window; a panel arriving has nowhere to come
 * from; and a stage of a different shape is not the same stage.
 */
export function isMove(from: Frame, to: Frame): boolean {
    if (from.aspectRatio !== to.aspectRatio) return false;
    if (from.focused === to.focused && from.mode === to.mode) return false;
    if (from.panels.length !== to.panels.length) return false;
    return from.panels.every((p, i) => p.key === to.panels[i].key);
}

/**
 * Fast out, long settle. Sharp because it starts at four times the average
 * speed; calm because the last third of the time covers about one percent of
 * the distance.
 */
export function ease(t: number): number {
    const u = 1 - Math.max(0, Math.min(1, t));
    return 1 - u * u * u * u;
}

/**
 * Leaving: gone by this far through the move — two frames — because two panels
 * trading places are level with each other at about 0.16, and anything left of
 * the one leaving is drawn over the one arriving: a faint diagram over it reads
 * as its ghost, and two captions over each other read as neither…
 */
const FADE_OUT_BY = 0.12;
/** …and back from here, once the panel is all but in its new place. */
const FADE_IN_FROM = 0.5;

const LEVELS: DensityLevel[] = ['indicator', 'compact', 'full'];

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

const lerpBox = <B extends { x: number; y: number; width: number; height: number }>(a: B, b: B, p: number) => ({
    x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p),
    width: lerp(a.width, b.width, p), height: lerp(a.height, b.height, p)
});

/**
 * The frame a move is at.
 *
 * Rects, slots and room travel on the eased curve. Opacity runs on time, so a
 * panel stepping aside is out of the way before the two cross, whatever the
 * curve does. Everything a frame says *about* a panel — its role, which panel
 * is focal, the mode — is already the destination's: the chrome is for the
 * panel it is becoming, and a click mid-move promotes from there.
 *
 * The level changes once. A panel getting smaller drops its detail at the
 * start, while it is fading; one getting larger keeps its old level until it is
 * most of the way there, so its axis titles are never drawn crammed into a
 * glyph's square.
 */
export function frameOf(move: Move): Frame {
    const { from, to, t } = move;
    if (t >= 1) return to;
    const p = ease(t);

    return {
        ...to,
        panels: to.panels.map(function (end) {
            const start = from.panels.filter(q => q.key === end.key)[0];
            if (!start) return end;

            const shrinking = end.width * end.height < start.width * start.height - 1e-9;

            const opacity = !shrinking
                ? lerp(start.opacity, 1, Math.min(1, t / FADE_OUT_BY))
                : t < FADE_OUT_BY ? lerp(start.opacity, 0, t / FADE_OUT_BY)
                    : t < FADE_IN_FROM ? 0
                        : (t - FADE_IN_FROM) / (1 - FADE_IN_FROM);

            const lower = LEVELS.indexOf(start.level) < LEVELS.indexOf(end.level) ? start.level : end.level;

            return {
                ...end,
                ...lerpBox(start, end, p),
                slot: lerpBox(start.slot, end.slot, p),
                room: {
                    top: lerp(start.room.top, end.room.top, p),
                    right: lerp(start.room.right, end.room.right, p),
                    bottom: lerp(start.room.bottom, end.room.bottom, p),
                    left: lerp(start.room.left, end.room.left, p)
                },
                level: p < 0.5 ? lower : end.level,
                opacity: opacity
            };
        })
    };
}

import { useEffect, useRef } from 'react';
import type { StageMode } from 'equilibria-react';

/**
 * Links: a view of a lesson, written in its address.
 *
 * A link is the lesson, the open tab or the lesson's step, each param the
 * student moved off where the lesson puts it, the arrangement and the panel at
 * the front — as query params beside `?lesson=`, named after the params, so a
 * teacher can read what a link will open before sending it:
 *
 *     ?lesson=fx&step=7&arrange=grid&focus=mirror&supply=56
 *
 * The start of a lesson is `?lesson=fx` and nothing else. What the link means
 * is the screen's to say, since only the screen knows where the lesson puts
 * each param; this file reads the words and writes them, and nothing here
 * knows what a step is.
 */

/** A view, as an address names it. */
export interface Link {
    /** The lesson's step, 0 before the first. Not written while a tab is open. */
    step: number;
    /** The open instrument, or null for the lesson. */
    tab: string | null;
    arrange: StageMode;
    /** The panel at the front, or null for the one the lesson puts there. */
    focus: string | null;
    /** Each param the student moved, by name, in the order the diagram declares them. */
    params: Record<string, number>;
}

/** The address's own words. A lesson's param by one of these names could not be linked. */
export const LINK_KEYS = ['lesson', 'step', 'tab', 'arrange', 'focus'];

export const AT_THE_START: Link = { step: 0, tab: null, arrange: 'focus', focus: null, params: {} };

/**
 * The view an address names, as far as the words go.
 *
 * Forgiving, because links outlive lessons: a step that is not a number opens
 * at the start, and a param whose value is not a number is left out, as the
 * screen leaves out one the lesson no longer has. Nothing here fails.
 */
export function readLink(search: string): Link {
    const query = new URLSearchParams(search),
        step = Number(query.get('step')),
        params: Record<string, number> = {};
    query.forEach((value, name) => {
        const number = value.trim() === '' ? NaN : Number(value);
        if (LINK_KEYS.indexOf(name) < 0 && isFinite(number)) params[name] = number;
    });
    return {
        step: Number.isInteger(step) && step > 0 ? step : 0,
        tab: query.get('tab'),
        arrange: query.get('arrange') === 'grid' ? 'grid' : 'focus',
        focus: query.get('focus'),
        params
    };
}

/**
 * The address for a view of `lesson`: `?lesson=` first, then the step or the
 * tab, then the arrangement and the panel, then the params. Anything at the
 * lesson's own default is left out, so a link says only what it changes.
 */
export function writeLink(lesson: string, link: Link = AT_THE_START): string {
    const query = new URLSearchParams({ lesson });
    if (link.tab) query.set('tab', link.tab);
    else if (link.step > 0) query.set('step', String(link.step));
    if (link.arrange === 'grid') query.set('arrange', 'grid');
    if (link.focus) query.set('focus', link.focus);
    // A value is on its param's `round` grid already, give or take the float
    // dust of getting there: 26.000000000000004 is written 26.
    Object.keys(link.params).forEach(name => {
        query.set(name, String(Number(link.params[name].toPrecision(12))));
    });
    return '?' + query.toString();
}

/**
 * The least time between two writes to the address.
 *
 * Every commit is a write, and a held arrow key commits on every repeat. A
 * browser stops listening past a rate — Safari throws once a page passes a
 * hundred in a short span — and the address would then be left behind at
 * whatever it last took. So a write that comes sooner than this waits, and a
 * newer one replaces it while it waits: the address is never more than this
 * behind the view.
 */
const PACE_MS = 350;

/**
 * Write `search` to the address whenever it changes, paced.
 *
 * Null holds the address where it is: before the engine has said what its
 * params are, and while a gesture is in flight. That is the narration's
 * boundary — a drag is written once, when it is let go, rather than on every
 * frame of it. A write still waiting when the screen goes is dropped with it,
 * so it cannot land on the address of the lesson that replaced it.
 */
export function useAddressFollows(search: string | null, write: ((search: string) => void) | undefined) {
    const wrote = useRef(-Infinity);
    useEffect(() => {
        if (search === null || !write) return;
        const now = () => {
            wrote.current = Date.now();
            write(search);
        };
        const wait = wrote.current + PACE_MS - Date.now();
        if (wait <= 0) {
            now();
            return;
        }
        const timer = window.setTimeout(now, wait);
        return () => window.clearTimeout(timer);
    }, [search, write]);
}

import { useEffect, useRef } from 'react';
import type { StageMode } from 'equilibria-react';

/**
 * Links: a page and a view of it, written in its address.
 *
 * The page is the path — a lesson, a model in the playground, or a story in
 * the news — and the view is what follows the `?`: the lesson's step or the
 * playground's open tab, each param the student moved off where the page puts
 * it, the arrangement and the panel at the front, named after the params, so
 * a teacher can read what a link will open before sending it:
 *
 *     lessons/fx?step=7&arrange=grid&focus=mirror&supply=56
 *     playground/aud?tab=maths&supply=56
 *     news/2026-09-rba-cash-rate?demand=60
 *
 * The start of a lesson is `lessons/fx` and nothing else. What the view means
 * is the screen's to say, since only the screen knows where the page puts each
 * param; this file reads the words and writes them, and nothing here knows
 * what a step is.
 *
 * Addresses are written from the app's root, without it, so the app can be
 * served anywhere: `share.ts` makes one whole. An embed's address is the same
 * page and view under `embed/` (`writeEmbed`).
 */

/**
 * A page an address names: a lesson by its id, a model in the playground by
 * its, or a story in the news by its. Home is the root, and names none.
 */
export interface Place {
    kind: 'lesson' | 'playground' | 'news';
    id: string;
}

/** The path each kind of page is under. */
const UNDER: Record<Place['kind'], string> = { lesson: 'lessons', playground: 'playground', news: 'news' };

/** A view, as an address names it. */
export interface Link {
    /** A lesson's step, 0 before the first. A playground and a story have none. */
    step: number;
    /** The playground's open instrument, or null for its first. A lesson and a story have none. */
    tab: string | null;
    arrange: StageMode;
    /** The panel at the front, or null for the one the page puts there. */
    focus: string | null;
    /** Each param the student moved, by name, in the order the diagram declares them. */
    params: Record<string, number>;
}

/**
 * The address's own words. A param by one of these names could not be linked.
 * `lesson` is in the path now, and stays reserved, because old links carry it;
 * `layout` is an embed's.
 */
export const LINK_KEYS = ['lesson', 'layout', 'step', 'tab', 'arrange', 'focus'];

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
 * The address for a view of a page: its path, then the step or the tab, then
 * the arrangement and the panel, then the params. Anything at the page's own
 * default is left out, so a link says only what it changes.
 */
export function writeLink(place: Place, link: Link = AT_THE_START): string {
    return written(pathOf(place), new URLSearchParams(), link);
}

/** A page's path under the app's root: `lessons/fx`. */
const pathOf = (place: Place) => `${UNDER[place.kind]}/${encodeURIComponent(place.id)}`;

/**
 * A path and a view in its words, after whatever the query already holds:
 * nothing for a page, an embed's layout for an embed.
 */
function written(path: string, query: URLSearchParams, link: Link): string {
    if (link.tab) query.set('tab', link.tab);
    else if (link.step > 0) query.set('step', String(link.step));
    if (link.arrange === 'grid') query.set('arrange', 'grid');
    if (link.focus) query.set('focus', link.focus);
    // A value is on its param's `round` grid already, give or take the float
    // dust of getting there: 26.000000000000004 is written 26.
    Object.keys(link.params).forEach(name => {
        query.set(name, String(Number(link.params[name].toPrecision(12))));
    });
    const view = query.toString();
    return `${path}${view ? '?' + view : ''}`;
}

/**
 * The page an address names under the app's root, or null where it names
 * none: the root itself, or a path the app does not have.
 *
 * An address from before the pages, `?lesson=fx&…`, names the lesson and is
 * `old`: it carries a tab where it was a view of the instruments, and which
 * page that opens is the shell's to say, since only it knows a lesson's model.
 * Whether the id names anything is the shell's too.
 */
export function readPlace(
    address: { pathname: string; search: string }, root: string
): { place: Place; old: boolean } | null {
    const place = placeUnder(address.pathname, rootOf(root));
    if (place) return { place, old: false };
    const lesson = new URLSearchParams(address.search).get('lesson');
    return lesson ? { place: { kind: 'lesson', id: lesson }, old: true } : null;
}

/** The app's root, ending in a slash whether or not it was given one. */
const rootOf = (root: string) => root.replace(/\/?$/, '/');

/** The page a path names under `base`, or null where it names none. */
function placeUnder(pathname: string, base: string): Place | null {
    if (pathname.indexOf(base) !== 0) return null;
    const [under, id] = pathname.slice(base.length).split('/');
    const kind = (Object.keys(UNDER) as Place['kind'][]).filter(k => UNDER[k] === under)[0];
    return kind && id ? { kind, id: decoded(id) } : null;
}

/** A path's segment in words, or as it stands where it is not a percent-encoding. */
function decoded(segment: string): string {
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
}

/**
 * What an embed shows (`Embed.tsx`): the whole page less the rail, or the
 * diagram alone, which is the playground's stage whatever page it came from.
 */
export type EmbedLayout = 'full' | 'diagram';

/** A page in another site's page, as an embed's address names it. */
export interface Embedded {
    /** The page, or null where the address names none the app has. */
    place: Place | null;
    layout: EmbedLayout;
}

/**
 * An embed's address, from the app's root: the page's own path under
 * `embed/`, then the layout where it is the diagram alone, then the view in
 * the words a link uses.
 *
 *     embed/lessons/fx?step=7
 *     embed/playground/aud?layout=diagram&arrange=grid&supply=56
 *
 * The whole page is the layout an embed starts from, so it is left out, as a
 * link leaves out whatever is at the page's own default.
 */
export function writeEmbed(place: Place, layout: EmbedLayout = 'full', link: Link = AT_THE_START): string {
    const query = new URLSearchParams();
    if (layout === 'diagram') query.set('layout', 'diagram');
    return written(`embed/${pathOf(place)}`, query, link);
}

/**
 * The embed an address names under the app's root, or null where it is not
 * an embed's address and so the app's own.
 *
 * Forgiving, as a link is: a layout it does not know is the whole page. A
 * path under `embed/` that names no page is still an embed, of nothing, so
 * the frame can say so rather than open the whole app inside another site.
 */
export function readEmbed(address: { pathname: string; search: string }, root: string): Embedded | null {
    const base = rootOf(root) + 'embed/';
    if (address.pathname.indexOf(base) !== 0 && address.pathname !== base.slice(0, -1)) return null;
    return {
        place: placeUnder(address.pathname, base),
        layout: new URLSearchParams(address.search).get('layout') === 'diagram' ? 'diagram' : 'full'
    };
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
 * Write `address` (from `writeLink`) whenever it changes, paced.
 *
 * Null holds the address where it is: before the engine has said what its
 * params are, and while a gesture is in flight. That is the narration's
 * boundary — a drag is written once, when it is let go, rather than on every
 * frame of it. A write still waiting when the screen goes is dropped with it,
 * so it cannot land on the address of the page that replaced it.
 */
export function useAddressFollows(address: string | null, write: ((address: string) => void) | undefined) {
    const wrote = useRef(-Infinity);
    useEffect(() => {
        if (address === null || !write) return;
        const now = () => {
            wrote.current = Date.now();
            write(address);
        };
        const wait = wrote.current + PACE_MS - Date.now();
        if (wait <= 0) {
            now();
            return;
        }
        const timer = window.setTimeout(now, wait);
        return () => window.clearTimeout(timer);
    }, [address, write]);
}

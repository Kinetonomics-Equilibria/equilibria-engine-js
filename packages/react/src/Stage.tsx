import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { KG_CONTAINER_CLASS, densityIndex, densityParamName } from 'equilibria-engine-js';
import type { KineticGraph, KineticGraphOptions } from 'equilibria-engine-js';
import { useEquilibria } from './useEquilibria';
import type { UseEquilibriaEventCallbacks } from './useEquilibria';
import { arrange, layoutParams, pixelBox, revealedCount, toCustomLayout, FURNITURE } from './arrangement';
import type { Arrangement, PanelRect, PanelRole, Room, RoomByRole, StageMode } from './arrangement';

/**
 * One engine, several panels, chrome floating above them.
 *
 * The instinct this component exists to resist: under one engine per screen the
 * component tree does **not** own the panels. The panels are regions of one SVG.
 * What the tree owns is the arrangement policy and the chrome floating over it,
 * and a component that tried to own a panel would need its own engine — which
 * is the design this replaced, and which makes linkage between panels an
 * illusion the app maintains by hand.
 *
 * So `Stage` supplies mechanism only: measure the box, mount one engine whose
 * panels' rects are params, lay it out again whenever the arrangement changes,
 * position an overlay per panel (and, if asked, a backdrop under it), and turn
 * a click or an Enter on a rail panel into a promotion. What a panel is called,
 * what its chip says and which one should be focal are all the application's,
 * and arrive through `renderChrome` and `focused`. If economics
 * vocabulary appears in this file, the line has been crossed.
 *
 * **The stage needs a height.** It measures the element it renders, and that
 * element defaults to `height: 100%`; give its parent a definite height. A
 * stage whose height comes from its own content is measuring its own output.
 */

/** What `renderChrome` is handed for each panel, once per render. */
export interface StagePanel {
    key: string;
    focused: boolean;
    /**
     * What the panel is in the arrangement, which says where its chrome can go:
     * the room `chromeRoom` keeps for that role is on that side and no other.
     */
    role: PanelRole;
    /** The panel's box in CSS pixels, relative to the stage. */
    box: { x: number; y: number; width: number; height: number };
    /**
     * The share of the stage the panel was given, in CSS pixels relative to the
     * stage: the box was fitted into this, centred, with `room` kept clear
     * around it. A grid cell, a rail slot, the focal column.
     */
    slot: { x: number; y: number; width: number; height: number };
    /**
     * Pixels the stage kept clear on each side of the box: what `chromeRoom`
     * asked for this panel's role, plus what the engine's axes need at the
     * level the panel draws at. Box and room together are everything drawn for
     * the panel, which is what a backdrop has to cover.
     */
    room: Room;
    /**
     * Promote this panel. Set only where the stage puts no control of its own
     * over the panel — in the grid, where the panel is being read and dragged
     * like the focal one, so a button across it would swallow every drag. The
     * chrome is the only way to promote such a panel, so render a control that
     * calls this, or accept that it cannot be.
     */
    promote?: () => void;
}

export interface StageProps extends UseEquilibriaEventCallbacks {
    /**
     * One config for the whole stage, whose `layout` is a `CustomLayout`. Its
     * panels' rects are replaced by the arrangement; everything else — axes,
     * objects, params, calcs — is the author's and is left alone.
     */
    config: Record<string, unknown>;

    /** Which panel is focal. Defaults to the first the config declares. */
    focused?: string;

    /**
     * Which panels have arrived. Every panel the config declares, by default.
     *
     * A staged reveal (P10) is a claim about *arrangement*, not only about what
     * is drawn: a rail holding blank squares for panels the student has not met
     * reserves the space it was supposed to save. So the panels named here are
     * the ones the stage arranges and the only ones it puts chrome over, and the
     * rest are parked under the focal panel where the diagram's own `show`
     * predicates keep them invisible.
     *
     * Hiding their *contents* is the config's business, not the stage's — a
     * step's `reveal` does it. This is the half the stage owns.
     *
     * **Panels arrive in declared order.** The compiled layout indexes prefixes,
     * so a set with a gap in it is resolved by treating the gap as arrived, and
     * warned about.
     */
    revealed?: string[];

    /** `focus` (default) or `grid`. A toggle, and never the landing state. */
    mode?: StageMode;

    /** Called when a rail panel is clicked or activated from the keyboard. */
    onPromote?: (key: string) => void;

    /** The chrome for one panel: its name, a delta chip, whatever the app wants. */
    renderChrome?: (panel: StagePanel) => ReactNode;

    /**
     * Something drawn *behind* one panel: a card, a tint, a frame.
     *
     * The chrome floats above the diagram, so a background drawn there would
     * cover it. This layer is under the canvas instead — the diagram's own
     * background is transparent, so it shows through — and positioned at the
     * panel's box like the chrome is, so the same `box`, `slot` and `room`
     * place both. It takes no pointer events: everything here is to be looked
     * at, and the diagram and the chrome are where the student acts.
     */
    renderBackdrop?: (panel: StagePanel) => ReactNode;

    /**
     * Pixels the chrome takes outside a panel, by role — `{ focal: { top: 28 } }`
     * for a caption above the focal panel.
     *
     * The stage keeps this clear, on top of the room the engine's own axes need,
     * so a caption never lands on a tick label and a row of the grid never lands
     * on the one above it. Only the app knows how tall its chrome is, so only
     * the app can say; chrome that takes more than it asked for will overlap.
     */
    chromeRoom?: RoomByRole;

    /**
     * The accessible name of a rail panel's promote control. Defaults to
     * `Show <key>`, which is only right when a key is a word — an app with real
     * panel names should say so here.
     */
    promoteLabel?: (key: string) => string;

    /** Reported when the engine fails to mount. The stage renders no error UI of its own. */
    onError?: (error: Error) => void;

    /**
     * The engine, once it has mounted, and again after any rebuild.
     *
     * For the state a host needs *at rest* — `getCalcs()` for a value to put
     * beside a panel, `snapshot()` for a boundary only the app knows about.
     * Events cover what changes; this covers what is.
     *
     * A rebuild is now only a new `config` or `options` — the stage lays the
     * same engine out again for everything it owns, a change of shape included —
     * but a host should still treat a second call as an engine that has never
     * heard of what the first one was doing.
     */
    onReady?: (engine: KineticGraph) => void;

    options?: KineticGraphOptions;
    className?: string;
    style?: CSSProperties;
}

/** Panel keys, in declared order, from a config whose layout is a `CustomLayout`. */
function panelKeys(config: any): string[] {
    const layout = config && config.layout;
    const def = customLayoutDef(layout);
    if (!def || !Array.isArray(def.panels)) return [];
    return def.panels.map((p: any, i: number) => p.key || 'panel' + i);
}

/** Both spellings the engine accepts for a layout: `{ CustomLayout: … }` and `{ type, def }`. */
function customLayoutDef(layout: any): any {
    if (!layout) return null;
    if (layout.CustomLayout) return layout.CustomLayout;
    if (layout.type === 'CustomLayout') return layout.def;
    return null;
}

export function Stage({
    config,
    focused,
    revealed,
    mode = 'focus',
    onPromote,
    renderChrome,
    renderBackdrop,
    chromeRoom,
    promoteLabel,
    onError,
    onReady,
    options,
    className,
    style,
    ...events
}: StageProps) {

    const outerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<{ width: number; height: number } | null>(null);

    /**
     * Whether the stage has ever had an area to build at.
     *
     * Kept apart from `size`, and never set back: a stage that is hidden after
     * it was built — its box collapsing to nothing — has nothing to arrange,
     * but it still has an engine holding everything the student did, and
     * destroying it to build nothing would be the very loss this component is
     * arranged to avoid.
     */
    const [measurable, setMeasurable] = useState(false);

    // Measured rather than assumed, and measured on the *outer* element rather
    // than on the one the engine mounts into — the engine writes a height onto
    // its own container from the aspect ratio, so measuring that element would
    // be measuring this component's own output.
    useLayoutEffect(() => {
        const el = outerRef.current;
        if (!el) return;

        const read = () => {
            const next = { width: el.clientWidth, height: el.clientHeight };
            if (next.width > 0 && next.height > 0) setMeasurable(true);
            setSize(prev => (prev && prev.width === next.width && prev.height === next.height ? prev : next));
        };

        read();
        if (typeof ResizeObserver === 'undefined') return;

        // Rendered synchronously, inside the observer's callback. An observer
        // runs after layout and before paint, and so does the engine's own,
        // which redraws the canvas at its new width the moment the box changes —
        // at the *old* proportions, until it is told the new ones. Left to
        // React's scheduler, the stage's half arrived a frame later: the diagram
        // drawn at one shape and the captions placed for another, once for
        // every frame of a navbar sliding shut. Flushed here, the relayout below
        // lands in the same frame as the resize that caused it.
        const ro = new ResizeObserver(() => flushSync(read));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const keys = useMemo(() => panelKeys(config), [config]);
    const keysKey = keys.join(' ');

    useEffect(() => {
        if (keys.length === 0) {
            console.warn('Stage: the config\'s layout is not a CustomLayout with panels, so there is ' +
                'nothing to arrange and nothing was drawn. The stage places panels the author declared; ' +
                'a single diagram wants EquilibriaChart instead.');
        }
    }, [keys.length]);

    // A box with an area, or nothing to arrange in.
    const box = size && size.width > 0 && size.height > 0 ? size : null;

    // By value: an app writing its room as an object literal hands the stage a
    // new one every render, and the arrangement below is recomputed on identity.
    const roomKey = JSON.stringify(chromeRoom || {});
    const room = useMemo(() => JSON.parse(roomKey) as RoomByRole, [roomKey]);

    const focusIndex = Math.max(0, keys.indexOf(focused as string));

    // Joined rather than passed by identity: a host that recomputes the array
    // every render would otherwise re-arrange the stage on every render.
    const revealedKey = revealed ? revealed.join(' ') : '';
    const arrived = useMemo(
        () => revealedCount(keys, revealed),
        [keysKey, revealedKey]
    );

    useEffect(() => {
        if (!revealed) return;
        const skipped = keys.slice(0, arrived).filter(k => revealed.indexOf(k) < 0);
        if (skipped.length > 0) {
            console.warn(`Stage: "${skipped.join('", "')}" ${skipped.length === 1 ? 'is' : 'are'} not ` +
                `revealed, but a panel declared after ${skipped.length === 1 ? 'it' : 'them'} is. ` +
                `Panels arrive in the order the config declares them, because the arrangement is ` +
                `of how many have arrived — so ${skipped.length === 1 ? 'it was' : 'they were'} ` +
                `shown anyway. Reorder the panels in the config, or reveal them in declared order.`);
        }
    }, [keysKey, revealedKey, arrived]);

    /**
     * Where everything goes, at this size, for this focus, mode and reveal.
     *
     * Over the panels that have arrived, so a panel the lesson has not reached
     * has no name floating over it and no promote button to tab into. And at
     * the box the stage measures *now*, every pixel of it: the room the chrome
     * and the axes need is pixels, and an arrangement made at another width
     * keeps the wrong amount of it. That used to be the price of not rebuilding
     * — the box was re-read only when the shape changed by a hundredth, because
     * every new arrangement was a new engine — and it is not paid any more.
     *
     * The chrome is placed from this and the diagram is laid out from it, so
     * the two cannot disagree about which square is which.
     */
    const arrangement: Arrangement | null = useMemo(
        () => (box && keys.length > 0
            ? arrange({
                width: box.width, height: box.height,
                panels: keys.slice(0, arrived), focused: keys[focusIndex], mode,
                chrome: room, furniture: FURNITURE
            })
            : null),
        [box && box.width, box && box.height, keysKey, focusIndex, mode, arrived, room]
    );

    /**
     * The engine config, built once and laid out from then on.
     *
     * Its panels' rects are params (`toCustomLayout`), so nothing the stage
     * owns — promotion, the mode, a reveal, the box changing size or shape —
     * is allowed to cost a rebuild, and this memo's dependencies are the list
     * of things that still do: a new config, or a new set of panels in it.
     * `useEquilibria` remounts on this object's identity, and a remount is a
     * new model, which forgets `prev` and with it every ghost, delta and
     * sentence describing what the student just did.
     *
     * Built at the arrangement as it stands when it is built, so the engine's
     * first frame is already right — which is why `arrangement` is read here
     * and deliberately left out of the dependencies.
     */
    const stageConfig = useMemo(() => {
        if (!measurable || !arrangement || keys.length === 0) return null;

        const layout = toCustomLayout({
            width: box!.width, height: box!.height, panels: keys, focused: keys[focusIndex], mode,
            arrived: arrived, chrome: room, furniture: FURNITURE
        });
        const next: any = JSON.parse(JSON.stringify(config));
        const def = customLayoutDef(next.layout);

        def.aspectRatio = layout.aspectRatio;
        def.panels.forEach(function (panel: any, i: number) {
            const computed = layout.panels[i];
            panel.x = computed.x;
            panel.y = computed.y;
            panel.width = computed.width;
            panel.height = computed.height;
            // An author who set a density on a stage panel meant it, and the
            // stage knows nothing about that panel they do not.
            if (panel.density === undefined) panel.density = computed.density;
        });

        const params = next.params || (next.params = []);
        layout.params.forEach(function (p) {
            if (!params.some((existing: any) => existing.name === p.name)) params.push(p);
        });

        return next as Record<string, unknown>;
    }, [config, keysKey, measurable]);

    /**
     * The panels whose level the author set, which the stage leaves alone.
     *
     * Every other panel's level is the arrangement's, written each time the
     * arrangement changes; an author's own level is not the stage's to
     * overwrite.
     */
    const authoredDensity = useMemo(() => {
        const def = customLayoutDef((config as any).layout);
        return ((def && def.panels) || [])
            .map((p: any, i: number) => (p.density !== undefined ? p.key || 'panel' + i : null))
            .filter((k: string | null) => k !== null) as string[];
    }, [config]);

    /**
     * What a new engine holds before the stage has told it anything: the shape
     * and the values it was built with — the author's own, where they declared
     * a param the stage would otherwise have.
     */
    const built = useMemo(() => {
        if (!stageConfig) return null;
        const values: { [name: string]: number } = {};
        ((stageConfig as any).params || []).forEach((p: any) => { values[p.name] = p.value });
        const def = customLayoutDef((stageConfig as any).layout);
        ((def && def.panels) || []).forEach((p: any, i: number) => {
            const key = p.key || 'panel' + i;
            if (authoredDensity.indexOf(key) < 0) values[densityParamName(key)] = densityIndex(p.density);
        });
        return { aspectRatio: def.aspectRatio as number, values: values };
    }, [stageConfig, authoredDensity]);

    const { containerRef, instance, error, isReady } = useEquilibria(stageConfig, options, events);

    useEffect(() => { if (error && onError) onError(error) }, [error, onError]);
    useEffect(() => { if (isReady && instance && onReady) onReady(instance) }, [isReady, instance, onReady]);

    /**
     * The arrangement, told to the engine: one `relayout` with whatever moved.
     *
     * Every rect, the focus, the mode, the reveal and every stage-owned panel's
     * level are presentation params, and they travel together. That is what
     * keeps a promoted panel from drawing a frame at its new size with its old
     * furniture, and what keeps the room the arrangement kept and the furniture
     * the engine draws describing the same level. Only what changed is sent,
     * compared against what was last sent — or, for a new engine, against what
     * it was built with.
     *
     * The shape goes with them whenever the box changed at all, not only when
     * its proportions did: the room the arrangement keeps is pixels, so a box
     * that only grew still moves every rect a little, and the engine is told to
     * measure itself again in the same redraw rather than in a separate one.
     *
     * Nothing here snapshots. The engine's `prev` is the student's — the ghost
     * of the curve they moved, and the "before" of every delta and sentence on
     * the screen — and laying the diagram out again leaves it exactly where the
     * student's last move put it.
     *
     * A layout effect, so that a resize flushed by the observer above reaches
     * the engine before the browser paints.
     */
    const applied = useRef<{
        instance: unknown; width: number; height: number; values: { [name: string]: number };
    } | null>(null);
    useLayoutEffect(() => {
        if (!isReady || !instance || !arrangement || !built || !box) return;
        const last = applied.current && applied.current.instance === instance ? applied.current : null;
        const held = last ? last.values : built.values;

        const wanted = layoutParams(keys, arrangement, authoredDensity);
        const pending = wanted.filter(p => held[p.name] !== p.value);
        const reshaped = last
            ? last.width !== box.width || last.height !== box.height
            : arrangement.aspectRatio !== built.aspectRatio;

        const values = { ...held };
        wanted.forEach(p => { values[p.name] = p.value });
        applied.current = { instance: instance, width: box.width, height: box.height, values: values };

        if (pending.length > 0 || reshaped) {
            instance.relayout({
                aspectRatio: reshaped ? arrangement.aspectRatio : undefined,
                params: pending
            });
        }
    }, [isReady, instance, arrangement, built, authoredDensity, keysKey]);

    const promote = useCallback((key: string) => { onPromote?.(key) }, [onPromote]);

    /**
     * One panel in pixels, and what it is: what both layers are handed, and
     * where both put it.
     *
     * Positioned against the *measured* width: the arrangement's fractions
     * apply at whatever size the canvas actually came out.
     */
    const placeOf = function (layout: Arrangement, panel: PanelRect, width: number) {
        const height = width / layout.aspectRatio,
            pxBox = pixelBox(layout, panel.key, width)!,
            chrome = room[panel.role] || {},
            furniture = FURNITURE[panel.level];

        const info: StagePanel = {
            key: panel.key,
            // The role `arrange` resolved, not `keys[focusIndex]`: with a
            // staged reveal the focused key may not have arrived yet, and a
            // lone panel is focal in either mode. Reading the resolved answer
            // is what keeps the chrome and the diagram agreeing about which
            // square is which.
            focused: panel.role === 'focal',
            role: panel.role,
            box: pxBox,
            slot: {
                x: panel.slot.x * width,
                y: panel.slot.y * height,
                width: panel.slot.width * width,
                height: panel.slot.height * height
            },
            // The same sum `arrange` kept clear, so whatever is drawn to this
            // room fits exactly the space the panels were moved apart to leave.
            room: {
                top: (chrome.top || 0) + furniture.top,
                right: (chrome.right || 0) + furniture.right,
                bottom: (chrome.bottom || 0) + furniture.bottom,
                left: (chrome.left || 0) + furniture.left
            }
        };
        const position: CSSProperties = {
            position: 'absolute',
            left: pxBox.x, top: pxBox.y, width: pxBox.width, height: pxBox.height
        };
        return { info: info, position: position };
    };

    return (
        // Isolated, so the backdrop's negative z-index puts it under the canvas
        // and no further: without a stacking context of its own here, it would
        // sink under whatever the page paints behind the stage as well.
        <div
            ref={outerRef}
            className={className}
            style={{ position: 'relative', height: '100%', isolation: 'isolate', ...style }}
        >
            {arrangement && box && renderBackdrop ? (
                <div style={BACKDROP} data-testid="stage-backdrop" aria-hidden="true">
                    {arrangement.panels.map(function (panel) {
                        const { info, position } = placeOf(arrangement, panel, box.width);
                        // `data-backdrop` rather than `data-panel`: this layer
                        // comes first in the document, so a selector written for
                        // a panel's chrome would find its backdrop instead.
                        return (
                            <div key={panel.key} style={position} data-backdrop={panel.key}>
                                {renderBackdrop(info)}
                            </div>
                        );
                    })}
                </div>
            ) : null}
            <div ref={containerRef} className={KG_CONTAINER_CLASS} />
            {arrangement && box ? (
                <div style={OVERLAY} data-testid="stage-chrome">
                    {arrangement.panels.map(function (panel) {
                        const { info, position } = placeOf(arrangement, panel, box.width);
                        const isFocused = info.focused;

                        // The focal panel's overlay must not exist as far as the
                        // pointer is concerned: everything a student does to a
                        // diagram — dragging a curve, grabbing a point — happens
                        // underneath it. A grid panel is the same: it is being
                        // read and worked on like the focal one, and a button
                        // across it swallowed every drag in grid mode. Its
                        // chrome is handed `promote` instead.
                        if (isFocused || panel.role === 'grid') {
                            const content = renderChrome
                                ? renderChrome({
                                    ...info,
                                    promote: isFocused ? undefined : () => promote(panel.key)
                                })
                                : null;
                            return (
                                <div
                                    key={panel.key}
                                    style={position}
                                    data-panel={panel.key}
                                    data-focused={isFocused ? 'true' : 'false'}
                                    data-role={panel.role}
                                >
                                    {content}
                                </div>
                            );
                        }

                        const content = renderChrome ? renderChrome(info) : null;

                        // A real button, not a div with a click handler: Enter,
                        // Space, focus order and the accessible role all come
                        // with it, and none of them has to be re-implemented or
                        // re-tested here.
                        return (
                            <button
                                key={panel.key}
                                type="button"
                                style={{ ...position, ...PROMOTE_BUTTON }}
                                data-panel={panel.key}
                                data-focused="false"
                                data-role={panel.role}
                                aria-label={promoteLabel ? promoteLabel(panel.key) : `Show ${panel.key}`}
                                onClick={() => promote(panel.key)}
                            >
                                {content}
                            </button>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}

/**
 * The overlay is transparent to the pointer; its children opt back in.
 *
 * Get this wrong and the symptom is a curve that stops responding to a drag
 * somewhere near a chip, which is an unpleasant thing to diagnose by eye.
 */
const OVERLAY: CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none'
};

/**
 * Under the canvas, and out of the pointer's way.
 *
 * Under because the canvas comes after it and paints on top — but the canvas is
 * in normal flow and this is positioned, which on its own would paint it *over*
 * the canvas. The negative z-index is what keeps it beneath, and the stage's
 * `isolation` is what keeps it from going any further than that.
 */
const BACKDROP: CSSProperties = {
    position: 'absolute',
    inset: 0,
    zIndex: -1,
    pointerEvents: 'none'
};

/** A button with no opinion about how it looks. The app's chrome supplies that. */
const PROMOTE_BUTTON: CSSProperties = {
    pointerEvents: 'auto',
    // A button centres its content vertically and horizontally by default,
    // which put a panel's name across the middle of its diagram. The chrome
    // places itself; the button is only a hit area and a role.
    display: 'block',
    background: 'none',
    border: 0,
    padding: 0,
    margin: 0,
    font: 'inherit',
    color: 'inherit',
    textAlign: 'inherit',
    cursor: 'pointer'
};

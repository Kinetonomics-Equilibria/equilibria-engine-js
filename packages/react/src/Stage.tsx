import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { KG_CONTAINER_CLASS, densityIndex, densityParamName } from 'equilibria-engine-js';
import type { KineticGraph, KineticGraphOptions } from 'equilibria-engine-js';
import { useEquilibria } from './useEquilibria';
import type { UseEquilibriaEventCallbacks } from './useEquilibria';
import {
    arrange, pixelBox, revealedCount, toCustomLayout,
    FILMSTRIP_BELOW_PX, FOCUS_PARAM, FURNITURE, MODE_PARAM, MODE_VALUE, REVEALED_PARAM
} from './arrangement';
import type { Arrangement, PanelRole, RoomByRole, StageMode } from './arrangement';

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
 * So `Stage` supplies mechanism only: measure the box, compile every
 * arrangement into one layout, mount one engine, position an overlay per panel,
 * and turn a click or an Enter on a rail panel into a param change. What a
 * panel is called, what its chip says and which one should be focal are all the
 * application's, and arrive through `renderChrome` and `focused`. If economics
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

/**
 * The aspect ratio the layout is computed for, quantised.
 *
 * Every fraction in a `CustomLayout` is computed for one canvas shape, so a new
 * shape means a new layout and therefore a remount. `arrange` is scale-free, so
 * the *size* never matters — but a `ResizeObserver` reports every pixel of a
 * window drag, and an un-quantised ratio would rebuild the diagram each time
 * the proportions moved by a fraction of a percent. Rounding to a hundredth
 * makes that about once per percent, and a proportional resize costs nothing at
 * all.
 */
function quantiseRatio(width: number, height: number): number {
    if (!(width > 0) || !(height > 0)) return 0;
    return Math.round((width / height) * 100) / 100;
}

export function Stage({
    config,
    focused,
    revealed,
    mode = 'focus',
    onPromote,
    renderChrome,
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

    // Measured rather than assumed, and measured on the *outer* element rather
    // than on the one the engine mounts into — the engine writes a height onto
    // its own container from the aspect ratio, so measuring that element would
    // be measuring this component's own output.
    useLayoutEffect(() => {
        const el = outerRef.current;
        if (!el) return;

        const read = () => setSize(prev => {
            const next = { width: el.clientWidth, height: el.clientHeight };
            if (prev && prev.width === next.width && prev.height === next.height) return prev;
            return next;
        });

        read();
        if (typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(read);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const keys = useMemo(() => panelKeys(config), [config]);

    useEffect(() => {
        if (keys.length === 0) {
            console.warn('Stage: the config\'s layout is not a CustomLayout with panels, so there is ' +
                'nothing to arrange and nothing was drawn. The stage places panels the author declared; ' +
                'a single diagram wants EquilibriaChart instead.');
        }
    }, [keys.length]);

    const ratio = size ? quantiseRatio(size.width, size.height) : 0;

    // Whether the stage is wide enough for a rail beside the focal panel or has
    // to lay it out underneath. The one thing besides the ratio that changes the
    // fractions, so it is named here and used as a dependency below.
    const filmstrip = !!size && size.width < FILMSTRIP_BELOW_PX;

    /**
     * The box the arrangement is computed for: the quantised shape, at the
     * width the stage had when that shape was last new.
     *
     * The width matters only to room, which is pixels — everything else in
     * `arrange` is scale-free. So it is read when the shape changes and not
     * otherwise, deliberately leaving `size` out of the dependencies: a resize
     * that keeps the proportions still costs nothing, and the room scales with
     * the canvas until the next change of shape measures it again. Anything
     * that moves the width alone also moves the ratio, in practice, so the
     * drift this allows is the drift of a resize nobody makes.
     */
    const box = useMemo(
        () => {
            if (ratio <= 0 || !size) return null;
            return { width: size.width, height: size.width / ratio };
        },
        [ratio, filmstrip]
    );

    // By value: an app writing its room as an object literal hands the stage a
    // new one every render, and the config below is rebuilt on identity.
    const roomKey = JSON.stringify(chromeRoom || {});
    const room = useMemo(() => JSON.parse(roomKey) as RoomByRole, [roomKey]);

    /**
     * The engine config, rebuilt only when the diagram's *shape* changes.
     *
     * Deliberately not a function of `focused` or `mode`: those move through
     * params, and rebuilding here would remount the engine and undo the whole
     * design. `useEquilibria` remounts on config identity, so this memo's
     * dependency list is the list of things that are allowed to cost a rebuild.
     */
    const stageConfig = useMemo(() => {
        if (!box || keys.length === 0) return null;

        const layout = toCustomLayout({
            width: box.width, height: box.height, panels: keys, chrome: room, furniture: FURNITURE
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
    }, [config, keys.join(' '), box, room]);

    /**
     * The panels whose level the author set, which the stage leaves alone.
     *
     * Every other panel's level is the arrangement's, written as a param each
     * time the arrangement changes; an author's own level is not the stage's to
     * overwrite.
     */
    const authoredDensity = useMemo(() => {
        const def = customLayoutDef((config as any).layout);
        return ((def && def.panels) || [])
            .map((p: any, i: number) => (p.density !== undefined ? p.key || 'panel' + i : null))
            .filter((k: string | null) => k !== null) as string[];
    }, [config]);

    /** The level every stage-owned panel was built at, which a new engine holds until told otherwise. */
    const builtLevels = useMemo(() => {
        const out: { [key: string]: string } = {};
        const def = stageConfig ? customLayoutDef((stageConfig as any).layout) : null;
        ((def && def.panels) || []).forEach((p: any, i: number) => {
            const key = p.key || 'panel' + i;
            if (authoredDensity.indexOf(key) < 0) out[key] = p.density;
        });
        return out;
    }, [stageConfig, authoredDensity]);

    const { containerRef, instance, error, isReady, updateParams } =
        useEquilibria(stageConfig, options, events);

    useEffect(() => { if (error && onError) onError(error) }, [error, onError]);
    useEffect(() => { if (isReady && instance && onReady) onReady(instance) }, [isReady, instance, onReady]);

    const focusIndex = Math.max(0, keys.indexOf(focused as string));
    const modeValue = MODE_VALUE[mode];

    // Joined rather than passed by identity: a host that recomputes the array
    // every render would otherwise re-apply the param on every render.
    const revealedKey = revealed ? revealed.join(' ') : '';
    const arrived = useMemo(
        () => revealedCount(keys, revealed),
        [keys.join(' '), revealedKey]
    );

    useEffect(() => {
        if (!revealed) return;
        const skipped = keys.slice(0, arrived).filter(k => revealed.indexOf(k) < 0);
        if (skipped.length > 0) {
            console.warn(`Stage: "${skipped.join('", "')}" ${skipped.length === 1 ? 'is' : 'are'} not ` +
                `revealed, but a panel declared after ${skipped.length === 1 ? 'it' : 'them'} is. ` +
                `Panels arrive in the order the config declares them, because the arrangement is ` +
                `indexed by how many have arrived — so ${skipped.length === 1 ? 'it was' : 'they were'} ` +
                `shown anyway. Reorder the panels in the config, or reveal them in declared order.`);
        }
    }, [keys.join(' '), revealedKey, arrived]);

    // Over the panels that have arrived, so the chrome is placed against the
    // same arrangement the compiled expressions resolve to — and so a panel the
    // lesson has not reached has no name floating over it and no promote button
    // to tab into.
    const arrangement: Arrangement | null = useMemo(
        () => (box && keys.length > 0
            ? arrange({
                width: box.width, height: box.height,
                panels: keys.slice(0, arrived), focused: keys[focusIndex], mode,
                chrome: room, furniture: FURNITURE
            })
            : null),
        [box, keys.join(' '), focusIndex, mode, arrived, room]
    );

    /**
     * Promotion, the mode toggle, the reveal and every panel's level, as param
     * updates.
     *
     * Only what actually changed is sent. The params are independent, and a
     * multi-param update is applied one at a time and validated separately, so
     * sending a param that did not move is a rejection risk for no gain.
     *
     * The levels travel in the same update as the rects they belong to, which
     * is what keeps a promoted panel from drawing a frame at its new size with
     * its old furniture — and what keeps the room the arrangement kept and the
     * furniture the engine draws describing the same level.
     *
     * Keyed on the instance rather than on the config, because a rebuild
     * produces a new engine at the config's declared values and whatever was
     * applied to the previous one no longer holds.
     */
    const applied = useRef<{
        instance: unknown; focus: number; mode: number; arrived: number;
        levels: { [key: string]: string };
    } | null>(null);
    useEffect(() => {
        if (!isReady || !instance || !arrangement) return;
        const last = applied.current && applied.current.instance === instance ? applied.current : null;
        const pending: { name: string; value: number }[] = [];
        if (!last || last.focus !== focusIndex) pending.push({ name: FOCUS_PARAM, value: focusIndex });
        if (!last || last.mode !== modeValue) pending.push({ name: MODE_PARAM, value: modeValue });
        if (!last || last.arrived !== arrived) pending.push({ name: REVEALED_PARAM, value: arrived });

        // Compared against what the engine holds, which for a new engine is what
        // it was built with — so a level that is already right is not re-sent.
        const levels: { [key: string]: string } = { ...(last ? last.levels : builtLevels) };
        arrangement.panels.forEach(function (panel) {
            if (authoredDensity.indexOf(panel.key) > -1) return;
            if (levels[panel.key] !== panel.level) {
                pending.push({ name: densityParamName(panel.key), value: densityIndex(panel.level) });
                levels[panel.key] = panel.level;
            }
        });

        applied.current = { instance: instance, focus: focusIndex, mode: modeValue, arrived: arrived, levels: levels };
        if (pending.length > 0) updateParams(pending);
    }, [isReady, instance, focusIndex, modeValue, arrived, arrangement, authoredDensity, builtLevels, updateParams]);

    const promote = useCallback((key: string) => { onPromote?.(key) }, [onPromote]);

    return (
        <div ref={outerRef} className={className} style={{ position: 'relative', height: '100%', ...style }}>
            <div ref={containerRef} className={KG_CONTAINER_CLASS} />
            {arrangement && size ? (
                <div style={OVERLAY} data-testid="stage-chrome">
                    {arrangement.panels.map(function (panel) {
                        // Positioned against the *measured* width: the
                        // arrangement's fractions apply at whatever size the
                        // canvas actually came out.
                        const pxBox = pixelBox(arrangement, panel.key, size.width)!;
                        // The role `arrange` resolved, not `keys[focusIndex]`:
                        // with a staged reveal the focused key may not have
                        // arrived yet, and a lone panel is focal in either mode.
                        // Reading the resolved answer is what keeps the chrome
                        // and the diagram agreeing about which square is which.
                        const isFocused = panel.role === 'focal';
                        const position: CSSProperties = {
                            position: 'absolute',
                            left: pxBox.x, top: pxBox.y, width: pxBox.width, height: pxBox.height
                        };

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
                                    key: panel.key, focused: isFocused, role: panel.role, box: pxBox,
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

                        const content = renderChrome
                            ? renderChrome({ key: panel.key, focused: false, role: panel.role, box: pxBox })
                            : null;

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

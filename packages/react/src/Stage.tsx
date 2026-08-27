import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { KG_CONTAINER_CLASS } from 'equilibria-engine-js';
import type { KineticGraphOptions } from 'equilibria-engine-js';
import { useEquilibria } from './useEquilibria';
import type { UseEquilibriaEventCallbacks } from './useEquilibria';
import {
    arrange, pixelBox, toCustomLayout,
    FILMSTRIP_BELOW_PX, FOCUS_PARAM, MODE_PARAM, MODE_VALUE
} from './arrangement';
import type { Arrangement, StageMode } from './arrangement';

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
    /** The panel's box in CSS pixels, relative to the stage. */
    box: { x: number; y: number; width: number; height: number };
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

    /** `focus` (default) or `grid`. A toggle, and never the landing state. */
    mode?: StageMode;

    /** Called when a rail panel is clicked or activated from the keyboard. */
    onPromote?: (key: string) => void;

    /** The chrome for one panel: its name, a delta chip, whatever the app wants. */
    renderChrome?: (panel: StagePanel) => ReactNode;

    /**
     * The accessible name of a rail panel's promote control. Defaults to
     * `Show <key>`, which is only right when a key is a word — an app with real
     * panel names should say so here.
     */
    promoteLabel?: (key: string) => string;

    /** Reported when the engine fails to mount. The stage renders no error UI of its own. */
    onError?: (error: Error) => void;

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
    mode = 'focus',
    onPromote,
    renderChrome,
    promoteLabel,
    onError,
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
     * The box the arrangement is computed for.
     *
     * A *reference* box of the quantised shape rather than the measured one:
     * `arrange` is scale-free, so any box of this shape gives the same
     * fractions, and using a fixed one keeps the memo below from rebuilding on
     * every pixel of a resize. The width is chosen to sit on the correct side
     * of the filmstrip breakpoint.
     */
    const box = useMemo(
        () => {
            if (ratio <= 0) return null;
            const width = filmstrip ? FILMSTRIP_BELOW_PX - 1 : FILMSTRIP_BELOW_PX;
            return { width: width, height: width / ratio };
        },
        [ratio, filmstrip]
    );

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

        const layout = toCustomLayout({ width: box.width, height: box.height, panels: keys });
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
    }, [config, keys.join(' '), box]);

    const { containerRef, instance, error, isReady, updateParams } =
        useEquilibria(stageConfig, options, events);

    useEffect(() => { if (error && onError) onError(error) }, [error, onError]);

    const focusIndex = Math.max(0, keys.indexOf(focused as string));
    const modeValue = MODE_VALUE[mode];

    /**
     * Promotion, and the mode toggle, as param updates.
     *
     * Only what actually changed is sent. The two params are independent, and a
     * multi-param update is applied one at a time and validated separately, so
     * sending a param that did not move is a rejection risk for no gain.
     *
     * Keyed on the instance rather than on the config, because a rebuild
     * produces a new engine at the config's declared values and whatever was
     * applied to the previous one no longer holds.
     */
    const applied = useRef<{ instance: unknown; focus: number; mode: number } | null>(null);
    useEffect(() => {
        if (!isReady || !instance) return;
        const last = applied.current && applied.current.instance === instance ? applied.current : null;
        const pending: { name: string; value: number }[] = [];
        if (!last || last.focus !== focusIndex) pending.push({ name: FOCUS_PARAM, value: focusIndex });
        if (!last || last.mode !== modeValue) pending.push({ name: MODE_PARAM, value: modeValue });
        applied.current = { instance: instance, focus: focusIndex, mode: modeValue };
        if (pending.length > 0) updateParams(pending);
    }, [isReady, instance, focusIndex, modeValue, updateParams]);

    const arrangement: Arrangement | null = useMemo(
        () => (box && keys.length > 0
            ? arrange({ width: box.width, height: box.height, panels: keys, focused: keys[focusIndex], mode })
            : null),
        [box, keys.join(' '), focusIndex, mode]
    );

    const promote = useCallback((key: string) => { onPromote?.(key) }, [onPromote]);

    return (
        <div ref={outerRef} className={className} style={{ position: 'relative', height: '100%', ...style }}>
            <div ref={containerRef} className={KG_CONTAINER_CLASS} />
            {arrangement && size ? (
                <div style={OVERLAY} data-testid="stage-chrome">
                    {arrangement.panels.map(function (panel) {
                        // Positioned against the *measured* width: the
                        // arrangement is scale-free, so its fractions apply at
                        // whatever size the canvas actually came out.
                        const pxBox = pixelBox(arrangement, panel.key, size.width)!;
                        const isFocused = panel.key === keys[focusIndex] && mode === 'focus';
                        const content = renderChrome
                            ? renderChrome({ key: panel.key, focused: isFocused, box: pxBox })
                            : null;
                        const position: CSSProperties = {
                            position: 'absolute',
                            left: pxBox.x, top: pxBox.y, width: pxBox.width, height: pxBox.height
                        };

                        // The focal panel's overlay must not exist as far as the
                        // pointer is concerned: everything a student does to a
                        // diagram — dragging a curve, grabbing a point — happens
                        // underneath it.
                        if (isFocused) {
                            return (
                                <div key={panel.key} style={position} data-panel={panel.key} data-focused="true">
                                    {content}
                                </div>
                            );
                        }

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
    background: 'none',
    border: 0,
    padding: 0,
    margin: 0,
    font: 'inherit',
    color: 'inherit',
    textAlign: 'inherit',
    cursor: 'pointer'
};

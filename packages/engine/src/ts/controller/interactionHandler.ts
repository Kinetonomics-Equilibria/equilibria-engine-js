import { UpdateListenerDefinition, IUpdateListener, UpdateListener } from "../model/updateListener";
import { ViewObject } from "../view/viewObjects/viewObject";
import { ClickListener } from "./listeners/clickListener";
import { DragListener } from "./listeners/dragListener";
import { KG_EVENTS } from "../constants";
import * as d3 from "d3";



export interface InteractionHandlerDefinition extends UpdateListenerDefinition {
    viewObject: ViewObject;
    dragListeners: DragListener[];
    clickListeners: ClickListener[];
}

export interface IInteractionHandler extends IUpdateListener {
    addTrigger: (el: HTMLElement) => void;
}

export class InteractionHandler extends UpdateListener implements IInteractionHandler {

    private scope: { params: any, calcs: any, colors: any, drag: any };
    private viewObject: ViewObject;
    private dragListeners: DragListener[];
    private clickListeners: ClickListener[];
    private element;

    /** One gesture per drag, opened on first movement rather than on mousedown. */
    private gestureOpen: boolean = false;

    /**
     * What was last written to the element, so it is written only when it moves.
     *
     * These used to be recomputed behind `hasChanged`, which is the handler's own
     * updatables — and `dragListeners` is a *constant*, so a listener whose
     * `draggable` had just gone false never reached this code and the object went
     * on taking the pointer. Comparing the answer instead of guessing at the
     * question keeps the d3 writes off the drag path without missing the change.
     */
    private wrote: { pointerEvents: string; cursor: string } | null = null;

    /**
     * The ways the object can be dragged right now, as the cursor says them:
     * empty while every drag is frozen. Read by `view/handles.ts`, which draws
     * at rest what the cursor only shows on hover.
     */
    public directions: '' | 'x' | 'y' | 'xy' = '';

    /**
     * Announce something the student did to a specific object.
     *
     * `kg:curve_dragged` and `kg:node_hover` have been declared in `constants.ts`
     * and documented as fired since the fork, and the React bindings offer
     * `onCurveDragged` / `onNodeHover` props for them — but nothing in the engine
     * ever emitted either one. They say *which* object the student is working
     * on, which is exactly what a narration strip needs to lead with, so they
     * are emitted here rather than deleted.
     */
    private announce(event: string, extra?: any) {
        const vo = this.viewObject as any;
        const emitter = vo && vo.view && vo.view.emitter;
        if (!emitter || emitter.listenerCount(event) === 0) return;
        emitter.emit(event, { name: vo.name, title: vo.title, ...(extra || {}) });
    }

    constructor(def: InteractionHandlerDefinition) {
        def.dragListeners = def.dragListeners || [];
        def.clickListeners = def.clickListeners || [];
        def.constants = (def.constants || []).concat(["viewObject", "dragListeners", "clickListeners"]);
        super(def);
        this.dragListeners = def.dragListeners;
        this.clickListeners = def.clickListeners;
        this.viewObject = def.viewObject;
        this.update(true);
        this.scope = { params: {}, calcs: {}, colors: {}, drag: {} }
    }

    update(force) {
        let ih = super.update(force);

        // first update dragListeners
        if (ih.hasOwnProperty('dragListeners') && (ih.element != undefined)) {
            let xDrag = false,
                yDrag = false;
            ih.dragListeners.forEach(function (dul) {
                dul.update(force);
                // A listener that is not draggable right now contributes no
                // direction, so the object stops taking the pointer and the
                // cursor stops promising a drag. Without this a frozen curve
                // still looks and feels draggable and merely refuses, which
                // reads as a broken diagram rather than as an answer taken.
                if (!dul.draggable) {
                    return;
                }
                if (dul.directions == "x") {
                    xDrag = true;
                } else if (dul.directions == "y") {
                    yDrag = true;
                } else if (dul.directions == "xy") {
                    xDrag = true;
                    yDrag = true;
                }
            });
            ih.directions = (xDrag && yDrag) ? "xy" : xDrag ? "x" : yDrag ? "y" : "";
            const pointerEvents = (xDrag || yDrag) ? "all" : "none",
                cursor = (xDrag && yDrag) ? "move" : xDrag ? "ew-resize" : "ns-resize";
            if (!ih.wrote || ih.wrote.pointerEvents != pointerEvents || ih.wrote.cursor != cursor) {
                ih.wrote = { pointerEvents: pointerEvents, cursor: cursor };
                ih.element.style("pointer-events", pointerEvents);
                ih.element.style("cursor", cursor);
            }
        }

        if (ih.hasOwnProperty('clickListeners') && (ih.element != undefined)) {
            if (ih.clickListeners.length > 0) {
                ih.element.style("pointer-events", "all");
                ih.element.style("cursor", "pointer");
            }
        }

        return ih;
    }


    addTrigger(element) {

        let handler = this;
        handler.element = element;

        // add click listeners
        if (handler.clickListeners.length > 0) {
            element.on("click", function (event, d) {
                handler.clickListeners.forEach(function (c) { c.click() })
            })
        }

        // Hover reaches only objects that are interactive: pointer-events are
        // 'none' on everything else, so there is nothing to hover.
        if (handler.dragListeners.length > 0 || handler.clickListeners.length > 0) {
            element.on("mouseenter", function () { handler.announce(KG_EVENTS.NODE_HOVER, { hovering: true }) });
            element.on("mouseleave", function () { handler.announce(KG_EVENTS.NODE_HOVER, { hovering: false }) });
        }

        // add drag listeners
        if (handler.dragListeners.length > 0) {
            element.on("keydown", function (event) { handler.keyed(event) });
            element.call(d3.drag()
                .on('start', function (event, d) {
                    handler.scope.params = handler.model.currentParamValues;
                    handler.scope.calcs = handler.model.currentCalcValues;
                    handler.scope.colors = handler.model.currentColors;
                    handler.scope.drag.x0 = handler.viewObject.xScale.scale.invert(event.x);
                    handler.scope.drag.y0 = handler.viewObject.yScale.scale.invert(event.y);
                })
                .on('drag', function (event, d) {
                    // Opened here, not in `start`: d3.drag fires `start` on every
                    // mousedown, including ones where the pointer never moves, and
                    // snapshotting there would burn a render and a ghost on a stray
                    // click. At this instant no updateParam has run for this
                    // gesture, so currentParamValues is still the object frozen
                    // into scope.params at `start` — the snapshot is drag-start
                    // state exactly.
                    if (!handler.gestureOpen && handler.dragListeners.some(function (dl) { return dl.snapshot !== false })) {
                        handler.gestureOpen = true;
                        handler.model.beginGesture();
                    }

                    handler.announce(KG_EVENTS.CURVE_DRAGGED, { dragging: true });

                    let drag = handler.scope.drag;
                    drag.x = handler.viewObject.xScale.scale.invert(event.x);
                    drag.y = handler.viewObject.yScale.scale.invert(event.y);
                    drag.dx = drag.x - drag.x0;
                    drag.dy = drag.y - drag.y0;
                    handler.dragListeners.forEach(function (dListener) {
                        dListener.onChange(handler.scope)
                    });
                })
                .on('end', function (event, d) {
                    //handler.element.style("cursor","default");
                    if (handler.gestureOpen) {
                        handler.gestureOpen = false;
                        handler.model.endGesture();
                        handler.announce(KG_EVENTS.CURVE_DRAGGED, { dragging: false });
                    }
                })
            );
        }

        handler.update(true);
    }

    /** The params the object's drags move right now, each once, in the order the drags declare them. */
    movedParams(): string[] {
        const params: string[] = [];
        this.dragListeners.forEach(function (dl) {
            if (dl.draggable && params.indexOf(dl.param) === -1) params.push(dl.param);
        });
        return params;
    }

    /**
     * Move the object from the keyboard, as a drag of its handle.
     *
     * An arrow key moves the handle one step its way, and Shift five, and the
     * drag's own expressions say what that does: a curve dragged sideways
     * moves by the step, a point dragged along a curve goes where the step
     * projects onto it. So a key press does what the same move of the mouse
     * would, whatever the drag is, and nothing here knows which.
     *
     * Each key the arrows point, and on something that moves only one way the
     * other two keys as well, as on a slider: right and up are more. The step
     * is a fortieth of the axis, at a round number. Where that is too small to
     * move a param that snaps further, it is doubled until a param would land
     * somewhere new, or would be pushed past an end, which is the press the
     * engine refuses and says so. So no press does nothing in silence.
     *
     * Each press is a gesture of its own, as a slider's is (ParamSlider.tsx),
     * so the ghost shows where it was one press ago.
     */
    keyed(event) {
        const handler = this, vo = handler.viewObject as any;
        const way = keyWays(event.key, handler.directions);
        if (!way || event.altKey || event.ctrlKey || event.metaKey) return;
        event.preventDefault();

        const at = vo.handleAt;
        if (!at) return;
        const x0 = vo.xScale.scale.invert(at[0]), y0 = vo.yScale.scale.invert(at[1]),
            times = event.shiftKey ? 5 : 1,
            stepX = roundStep(Math.abs(vo.xScale.domainMax - vo.xScale.domainMin) / 40) * times,
            stepY = roundStep(Math.abs(vo.yScale.domainMax - vo.yScale.domainMin) / 40) * times;

        const model = handler.model, scope = handler.scope, drag = scope.drag,
            listeners = handler.dragListeners.filter(function (dl) { return dl.draggable });
        scope.params = model.currentParamValues;
        scope.calcs = model.currentCalcValues;
        scope.colors = model.currentColors;
        drag.x0 = x0;
        drag.y0 = y0;
        const goes = function (dl: DragListener) {
            const param = model.getParam(dl.param), requested = +dl.requested(scope);
            if (!param || !isFinite(requested)) return false;
            return requested < param.min || requested > param.max || param.landing(requested) !== param.value;
        };
        let found = false;
        for (let k = 1; k <= 32 && !found; k *= 2) {
            drag.x = x0 + way[0] * stepX * k;
            drag.y = y0 + way[1] * stepY * k;
            drag.dx = drag.x - x0;
            drag.dy = drag.y - y0;
            found = listeners.some(goes);
        }
        if (!found) return;

        const snapshot = handler.dragListeners.some(function (dl) { return dl.snapshot !== false });
        if (snapshot) model.beginGesture();
        listeners.forEach(function (dl) { dl.onChange(scope) });
        if (snapshot) model.endGesture();
        handler.announce(KG_EVENTS.CURVE_DRAGGED, { dragging: true });
        handler.announce(KG_EVENTS.CURVE_DRAGGED, { dragging: false });
    }

}

/**
 * Which way a key moves something dragged `directions`, in the axes' units, or
 * null for a key that does not move it. A thing that moves one way takes all
 * four arrows, as a slider does: right and up are more, left and down less.
 */
function keyWays(key: string, directions: string): [number, number] | null {
    const ways: Record<string, [number, number]> = {
        ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1]
    };
    const way = ways[key];
    if (!way || !directions) return null;
    if (directions === 'xy') return way;
    const more = way[0] + way[1];
    return directions === 'x' ? [more, 0] : [0, more];
}

/** A step at a round number, 1, 2 or 5 times a power of ten, at most `size`. */
function roundStep(size: number): number {
    if (!(size > 0) || !isFinite(size)) return 1;
    const power = Math.pow(10, Math.floor(Math.log10(size))), lead = size / power;
    return (lead >= 5 ? 5 : lead >= 2 ? 2 : 1) * power;
}

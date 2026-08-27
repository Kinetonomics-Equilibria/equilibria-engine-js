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
        if (ih.hasChanged && ih.hasOwnProperty('dragListeners') && (ih.element != undefined)) {
            let xDrag = false,
                yDrag = false;
            ih.dragListeners.forEach(function (dul) {
                dul.update(force);
                if (dul.directions == "x") {
                    xDrag = true;
                } else if (dul.directions == "y") {
                    yDrag = true;
                } else if (dul.directions == "xy") {
                    xDrag = true;
                    yDrag = true;
                }
            });
            ih.element.style("pointer-events", (xDrag || yDrag) ? "all" : "none");
            ih.element.style("cursor", (xDrag && yDrag) ? "move" : xDrag ? "ew-resize" : "ns-resize");
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

}

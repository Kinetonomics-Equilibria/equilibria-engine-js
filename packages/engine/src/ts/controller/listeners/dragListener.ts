import { setDefaults, setProperties } from "../../util";
import { ListenerDefinition, IListener, Listener } from "./listener";



    export interface DragListenerDefinition extends ListenerDefinition {
        draggable?: string;
        directions?: string;
        vertical?: string;
        horizontal?: string;
        /**
         * Whether dragging this opens a gesture, and so takes a `prev` snapshot.
         * Default true. Set false for a control whose movement is not something a
         * ghost should remember.
         */
        snapshot?: boolean;
    }

    export interface IDragListener extends IListener {
        draggable: boolean;
        directions: "" | "x" | "y" | "xy";
    }

    /*

        A DragListener is a special kind of Listener that listens for drag events.
        In addition to a param and an expression, it has properties for whether it is draggable
        and, if so, in which directions it is draggable.

     */

    export class DragListener extends Listener implements IDragListener {

        public directions;
        public draggable;
        public snapshot;

        constructor(def: DragListenerDefinition) {
            if(def.hasOwnProperty('vertical')) {
                def.directions = 'y';
                def.param = def.vertical;
                def.expression = `params.${def.vertical} + drag.dy`
            }
            if(def.hasOwnProperty('horizontal')) {
                def.directions = 'x';
                def.param = def.horizontal;
                def.expression = `params.${def.horizontal} + drag.dx`
            }
            setDefaults(def, {
                directions: "xy",
                snapshot: true
            });
            setProperties(def, 'updatables',['draggable', 'directions']);
            setProperties(def, 'constants', ['snapshot']);
            super(def);
        }

        update(force) {
            let dl = super.update(force);
            if(!dl.def.hasOwnProperty('draggable')) {
                dl.draggable = (dl.directions.length > 0);
            }
            return dl;
        }

        /**
         * Refuse the drag when `draggable` says so.
         *
         * The property was updatable, reported the right value, and was read by
         * nothing: `Listener.onChange` moved the param regardless, and the
         * interaction handler set `pointer-events` from `directions` alone. So
         * `draggable: 'not(params.submitted)'` froze the value of a field and
         * not the curve — measured, and it is the plans README's finding 6
         * again (the declaration is not the behaviour).
         *
         * P0 checked the property and concluded freeze-on-commit was authorable;
         * it read `dl.draggable` going true to false to true, which is the shape
         * rather than the effect. P11 needs the effect.
         */
        onChange(scope) {
            if (!this.draggable) return;
            super.onChange(scope);
        }

    


}

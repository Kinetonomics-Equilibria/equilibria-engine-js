import { setDefaults } from "../../util";
import { ListenerDefinition, IListener, Listener } from "./listener";



export interface ClickListenerDefinition extends ListenerDefinition {
    transitions: number[];
}

export interface IClickListener extends IListener {
    state: number;
}

export class ClickListener extends Listener implements IClickListener {

    public state: number
    public transitions: number[]

    constructor(def: ClickListenerDefinition) {
        setDefaults(def, { transitions: [1, 0] }); // default to toggle on/off
        super(def);
        this.transitions = def.transitions;
    }

    click() {
        const c = this;
        // trigger the click action
        const current = c.model.currentParamValues[c.param];
        const newvalue = c.transitions[current];
        c.model.updateParam(c.param, newvalue);
    }




}

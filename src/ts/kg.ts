import { View } from "./view/view";
import { KG_EVENTS } from "./constants";
import { EventEmitter } from "eventemitter3";
import "../css/kgjs-theme.css";

export { KG_EVENTS };

export class KineticGraph extends EventEmitter {
    private config: any;
    private container: HTMLElement | null = null;
    public view: View | null = null;

    constructor(config: any) {
        super();
        this.config = config;
    }

    public mount(containerElement: HTMLElement) {
        this.container = containerElement;
        // The View binds to the DOM and sets up D3 automatically 
        this.view = new View(this.container, this.config);

        // Let's pass the event emitter to the view or model so objects can emit
        // We will wire this up precisely during the interaction refactor
        (this.view as any).emitter = this;
    }

    public update(newConfig: any) {
        this.config = { ...this.config, ...newConfig };

        if (this.view) {
            // Update params explicitly if they were passed
            if (newConfig.params) {
                newConfig.params.forEach((param: any) => {
                    (this.view as any).model.updateParam(param.name, param.value);
                });
            } else {
                // Generic update if underlying structure changed
                // (In a true React flow, we'd diff the config and re-parse strings,
                // but for now we expect param interactions)
                (this.view as any).model.update(true);
            }
        }
    }

    public destroy() {
        // Wipe string/HTML completely
        if (this.container) {
            this.container.innerHTML = "";
        }
        this.view = null;
        this.container = null;
        this.removeAllListeners();
    }
}

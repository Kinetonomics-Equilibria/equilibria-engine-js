import { View } from "./view/view";
import { KG_EVENTS } from "./constants";
import { EventEmitter } from "eventemitter3";
import "../css/kgjs-theme.css";

export { KG_EVENTS };

export interface KineticGraphOptions {
    /** Enable legacy URL query param and div attribute overrides (default: false) */
    legacyUrlOverrides?: boolean;
}

export class KineticGraph extends EventEmitter {
    private config: any;
    private options: KineticGraphOptions;
    private container: HTMLElement | null = null;
    public view: View | null = null;
    private resizeObserver: ResizeObserver | null = null;

    constructor(config: any, options?: KineticGraphOptions) {
        super();
        this.config = config;
        this.options = options || {};
    }

    public mount(containerElement: HTMLElement) {
        this.container = containerElement;

        // Apply the .kg-container class for CSS custom property activation
        this.container.classList.add('kg-container');

        try {
            // The View binds to the DOM and sets up D3 automatically
            this.view = new View(this.container, this.config, {
                legacyUrlOverrides: !!this.options.legacyUrlOverrides
            });

            // Pass the event emitter to the view so objects can emit events
            (this.view as any).emitter = this;

            // Set up a ResizeObserver scoped to the container for responsive resizing
            this.resizeObserver = new ResizeObserver(() => {
                if (this.view) {
                    this.view.updateDimensions();
                }
            });
            this.resizeObserver.observe(containerElement);
        } catch (err) {
            this.emit('error', err);
        }
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
                (this.view as any).model.update(true);
            }
        }
    }

    public destroy() {
        // Disconnect the ResizeObserver to stop monitoring container size
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        // Remove the kg-container class we added
        if (this.container) {
            this.container.classList.remove('kg-container');
            this.container.innerHTML = "";
        }

        this.view = null;
        this.container = null;
        this.removeAllListeners();
    }
}

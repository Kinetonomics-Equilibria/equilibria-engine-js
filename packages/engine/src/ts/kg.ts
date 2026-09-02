import { View } from "./view/view";
import { StepDefinition } from "./KGAuthor/parsers/steps";
import { DensityLevel } from "./KGAuthor/parsers/density";
import { KG_EVENTS } from "./constants";
import type { ParamInfo } from "./model/param";
import { EventEmitter } from "eventemitter3";
import "../css/kgjs-theme.css";
// Labels are rendered by KaTeX (view/viewObjects/label.ts), which needs its own
// stylesheet to lay the maths out — without it the glyphs still appear but the
// spacing, sizing and alignment do not. This import used to live in the React
// package's index.ts, which meant a non-React consumer of the engine silently
// got unstyled maths. The engine uses KaTeX, so the engine asks for its CSS.
import "katex/dist/katex.min.css";

export { KG_EVENTS };
export type { DensityLevel };

/**
 * The param a declared build-up reads, so a host advancing one does not have to
 * spell `'step'` and hope. See `steps()`.
 */
export { STEP_PARAM } from "./KGAuthor/parsers/steps";

/**
 * The shape of what the engine tells a host about itself.
 *
 * Declared in the modules that compute them and re-exported here because
 * `kg.ts` is the package's only entry point: a host wiring a `kg:param_changed`
 * listener had no type for its own payload and typed it `unknown`, which is how
 * `payload.calcs` gets read as `any` and a typo in a calc name reaches the
 * screen as `undefined`.
 */
export type { ParamChangedEvent, AffectedObject } from "./view/view";
export type { Movement } from "./view/movement";
export type { ParamInfo } from "./model/param";
export type { StepDefinition } from "./KGAuthor/parsers/steps";

/**
 * The class the engine applies to its container, which the theme stylesheet
 * hangs the diagram's text and background colors on.
 *
 * `mount()` adds it, but the container belongs to the caller, and a framework
 * that renders `class`/`className` on that element overwrites the attribute on
 * its next render and drops it. Callers in that position should render this
 * class themselves rather than rely on the engine's `classList.add`.
 */
export const KG_CONTAINER_CLASS = 'kg-container';

export interface KineticGraphOptions {
    /** Enable legacy URL query param and div attribute overrides (default: false) */
    legacyUrlOverrides?: boolean;

    /**
     * When the engine captures the previous state that expressions read as `prev`.
     *
     * - `'gesture'` (default) — one snapshot per drag or host gesture, taken on
     *   the first actual movement. This is what makes a ghost sit where the curve
     *   was when the student grabbed it.
     * - `'change'` — one per accepted param change. Offered, but a trap for
     *   continuous input: a drag fires ~60 changes a second, so `prev` ends up one
     *   tick behind and the ghost hides under the live curve. A real gesture still
     *   coalesces even in this mode.
     * - `'never'` — only `snapshot()` moves it.
     *
     * Also settable as `snapshotOn` at the config root; this option wins.
     */
    snapshotOn?: 'gesture' | 'change' | 'never';
}

/** What `getSnapshot()` hands back — copies, never the model's live objects. */
export interface EquilibriaSnapshot {
    params: Record<string, number>;
    calcs: Record<string, any>;
    seq: number;
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
        this.container.classList.add(KG_CONTAINER_CLASS);

        try {
            // Deep-clone the config so View.parse() mutations don't
            // contaminate the caller's original object (avoids circular refs)
            const configClone = JSON.parse(JSON.stringify(this.config));

            // The View binds to the DOM and sets up D3 automatically
            this.view = new View(this.container, configClone, {
                legacyUrlOverrides: !!this.options.legacyUrlOverrides,
                snapshotOn: this.options.snapshotOn
            });

            // Pass the event emitter to the view so objects can emit events. The
            // view reads it back to decide whether describing a movement is worth
            // the work, so it must be installed before any interaction, not lazily.
            this.view.emitter = this;

            // Set up a ResizeObserver scoped to the container for responsive resizing
            this.resizeObserver = new ResizeObserver(() => {
                if (this.view) {
                    this.view.updateDimensions();
                }
            });
            this.resizeObserver.observe(containerElement);
        } catch (err) {
            this.view = null;
            this.reportFailure(err);
        }
    }

    /**
     * Surfaces a failure raised while building the view.
     *
     * Failures are reported through the 'error' event so callers can render their
     * own fallback UI. eventemitter3 - unlike Node's EventEmitter - does not throw
     * when an 'error' event has no listeners, so if nothing is listening the error
     * is re-thrown instead. Otherwise a failed mount would leave the caller with an
     * empty container and no diagnostic anywhere.
     */
    private reportFailure(err: any) {
        if (this.listenerCount('error') > 0) {
            this.emit('error', err);
            return;
        }
        throw err;
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

    /**
     * Mark the current state as the one expressions should read as `prev`.
     *
     * Use it for boundaries the engine cannot see: applying a scenario, revealing
     * a quiz answer, starting a lesson step. In-diagram drags snapshot themselves.
     */
    public snapshot() {
        (this.view as any)?.model?.snapshot();
    }

    /**
     * Declare the start of a host-driven gesture, so a continuous control takes
     * one snapshot rather than one per tick.
     *
     * The engine cannot infer this: a slider scrub reaches it as an
     * undifferentiated stream of `update({ params })` calls. Map these onto the
     * control's own gesture events — for a Mantine `Slider` that is
     * `onChangeStart` / `onChangeEnd`. Without it, a slider produces no usable
     * ghost.
     */
    public beginGesture() {
        (this.view as any)?.model?.beginGesture();
    }

    public endGesture() {
        (this.view as any)?.model?.endGesture();
    }

    /**
     * The build-up the config declared, in order, or `[]` if it declared none.
     *
     * Reveals are already compiled into the diagram — they are `show` predicates
     * on `params.step`, so advancing the build-up is `update({ params: [{ name:
     * 'step', value: n }] })` and nothing else. What is handed back here is what
     * the engine will *not* do for you: each step's `set` params, and how many
     * steps there are.
     *
     * The engine declines to apply a step's `set` on purpose. A multi-param
     * update is not atomic — each param is validated alone, so a legal
     * destination reached through an illegal interim is rejected halfway and
     * rolled back with no diagnostic. Which order to move them in is a decision
     * that has to be made with the diagram in view, so it is the host's, and it
     * is made visibly rather than quietly here.
     *
     * Generic in what a step *is*, because the engine reads two keys and carries
     * the rest untouched. A host that writes a lesson beside its reveals — a
     * sentence, a question — gets its own steps back with those keys on them,
     * which is what keeps a timeline one ordered list rather than an app-side
     * list shadowing an engine one.
     */
    public steps<T extends StepDefinition = StepDefinition>(): T[] {
        return (this.view?.parsedData?.steps as T[]) || [];
    }

    /**
     * Set how much detail one panel draws.
     *
     * Only a panel that declared a `density` can be set — declaring it is what
     * creates the level to move — and a panel declared `'auto'` is the engine's
     * to choose, so setting one warns rather than fighting it silently.
     *
     * This is a param update underneath, which is the point: a panel changes
     * level without a remount, so a rail panel being promoted to the stage can
     * gain its axis labels *as* it grows rather than after it arrives.
     */
    public setDensity(key: string, level: DensityLevel) {
        this.view?.setDensity(key, level);
    }

    /**
     * Every calc, as it now stands.
     *
     * `kg:param_changed` carries the same thing, but only once something has
     * changed — so a host putting a number beside a diagram had nothing to show
     * until the student moved something, and either left the space blank or
     * wrote the calc out a second time in its own code. This is the value at
     * rest.
     *
     * A shallow copy, matching `getSnapshot()`: nested calc objects are shared,
     * so treat what comes back as read-only.
     */
    public getCalcs(): Record<string, any> {
        return { ...((this.view as any)?.model?.currentCalcValues || {}) };
    }

    /**
     * Every param's declaration and current value, in declared order.
     *
     * The counterpart of `getCalcs()`: what the diagram *takes*, where that
     * gives what it *computes*. A host needs `precision` to print a value to the
     * same number of decimals the diagram does, `label`/`min`/`max`/`round` to
     * offer a control for it, and `presentation` to tell a param the student
     * moved from one describing how the diagram is shown — an undo built without
     * that last one restores a promoted panel along with the price.
     *
     * Copies, so mutating what comes back changes nothing; move a param with
     * `update({ params })`.
     */
    public getParams(): ParamInfo[] {
        return (this.view as any)?.model?.paramInfo() || [];
    }

    /**
     * The state at the last snapshot, or `null` if none has been taken.
     *
     * Returns copies. The engine must not hand a caller an object it will later
     * read back as authoritative.
     */
    public getSnapshot(): EquilibriaSnapshot | null {
        const model = (this.view as any)?.model;
        if (!model || model.snapshotSeq === 0) return null;
        return {
            params: { ...model.prevParamValues },
            calcs: { ...model.prevCalcValues },
            seq: model.snapshotSeq
        };
    }

    public destroy() {
        // Disconnect the ResizeObserver to stop monitoring container size
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        // Remove the kg-container class we added
        if (this.container) {
            this.container.classList.remove(KG_CONTAINER_CLASS);
            this.container.innerHTML = "";
        }

        this.view = null;
        this.container = null;
        this.removeAllListeners();
    }
}

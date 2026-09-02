import type { ReactNode } from 'react';
import type { ParamInfo } from 'equilibria-engine-js';

/**
 * What every instrument is handed, and nothing more.
 *
 * The narrowness is the point. An instrument that needs something not on this
 * list is telling you the contract is wrong — or that it is reaching for the
 * engine directly, which is how a dock panel and the diagram beside it end up
 * disagreeing about a number they both display.
 *
 * `params` is the engine's own `ParamInfo`, not an app-side restatement of it.
 * An instrument asking for a param's `precision` is asking the same question
 * the diagram asked, and there should be one answer.
 */
export interface InstrumentProps {
    /** Every param, as the engine declares it — presentation ones included. */
    params: ParamInfo[];

    /** What the diagram computes, right now. */
    calcs: Record<string, number | string>;

    /**
     * The calcs' own formulas, as the author wrote them.
     *
     * The Maths instrument is this map typeset. Passed rather than the whole
     * config because it is the only part of the config any instrument needs,
     * and a component handed a config will eventually read something else.
     */
    calcExpressions: Record<string, string>;

    /** Move params. Batched into one call, so the engine applies them in order. */
    updateParams(next: { name: string; value: number }[]): void;

    /**
     * Bracket a continuous control — a slider scrub, a drag.
     *
     * Two things happen, and both are needed. The engine takes one snapshot for
     * the whole gesture, so ghosts are drawn against where it started rather
     * than the previous frame. And the narration strip is told an interaction is
     * in flight, so it shows live values instead of rewriting its chain sixty
     * times a second — which it cannot work out for itself, because
     * `kg:curve_dragged` is raised only by dragging inside the diagram.
     */
    beginGesture(): void;
    endGesture(): void;

    /**
     * Declare a commit boundary the engine cannot see for itself.
     *
     * A drag brackets itself and a gesture is bracketed by the pair above, but a
     * discrete jump — applying a scenario, revealing an answer, starting a
     * lesson step — looks like nothing at all from inside the engine. Without
     * this the diagram's ghosts are drawn against one "before" and the narration
     * strip against another, which is the incoherence P8 is built to prevent:
     * the curve shows a movement and the sentence under it says nothing
     * happened.
     *
     * Call it *before* the change, since it marks where the state is now.
     */
    snapshot(): void;

    /** Set when an instrument is opened *at* something — P8's "why?". */
    focus?: InstrumentFocus;
}

export interface InstrumentFocus {
    /** A calc name, from the narration strip's `whyTarget`. */
    calc?: string;
}

export interface Instrument {
    id: string;
    /** The tab's word. Short: it sits in a row of them in a fixed-width column. */
    label: string;
    icon?: ReactNode;
    Component: (props: InstrumentProps) => ReactNode;
}

import { Slider } from '@mantine/core';
import type { ParamInfo } from 'equilibria-engine-js';
import classes from './ParamSlider.module.css';

/**
 * A slider bound to a param, wired to the engine's gesture contract correctly.
 *
 * The contract is two calls — `beginGesture` before the value moves and
 * `endGesture` after — and getting the *order* wrong is invisible: the diagram
 * still moves, the number still updates, and only the ghost and the narration
 * strip are quietly wrong. P9 got it wrong for the keyboard and shipped, and
 * P11 found it by needing a keyboard answer path.
 *
 * Two facts about Mantine's `Slider` make the naive wiring wrong, and both are
 * in its source rather than its docs:
 *
 * 1. Its keyboard handler is `onKeyDownCapture`, and it is attached to the root
 *    **after** `...others`, so a handler passed as a prop is overwritten rather
 *    than run alongside. It also calls `onChange` *and* `onChangeEnd`
 *    synchronously inside that one handler.
 * 2. The pointer path starts inside `useMove` on the track.
 *
 * So a bubble-phase `onKeyDown`/`onMouseDown` prop — which is what an ordinary
 * reading of the API suggests — runs *after* the value has already changed.
 * `Model.beginGesture` snapshots the instant it is called, so the "before" it
 * captures is the after: `prev` equals the current value, every ghost hides
 * itself, and the strip reads "drag a curve to see what it changes" about a
 * curve that has just moved. Worse, the gesture is opened and never closed —
 * `onChangeEnd` has already fired by then — so the strip stays stuck in its
 * live form for everything the student does afterwards.
 *
 * The fix is one element outward: a wrapper whose capture handlers necessarily
 * run before the Slider root's. Each keypress becomes its own complete gesture,
 * which is the right reading of a discrete press — the ghost shows where it was
 * one press ago.
 */

/** The keys Mantine's `Slider` moves on. Anything else must not open a gesture. */
const MOVES = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];

export interface ParamSliderProps {
    /** As the engine declares it: bounds, step and precision all come from here. */
    param: ParamInfo;

    /**
     * What the thumb is called.
     *
     * On the thumb rather than on the root, because the thumb is the element
     * carrying `role="slider"` and a label on the root leaves the control itself
     * nameless to a screen reader.
     */
    label: string;

    disabled?: boolean;
    onChange(value: number): void;
    beginGesture(): void;
    endGesture(): void;

    /** Enter, where the host has something for it to commit. */
    onEnter?(): void;
}

export function ParamSlider({
    param, label, disabled, onChange, beginGesture, endGesture, onEnter
}: ParamSliderProps) {

    const format = (value: number) => value.toFixed(param.precision);

    return (
        <div
            className={classes.wrap}
            onKeyDownCapture={event => {
                if (disabled) return;
                if (onEnter && event.key === 'Enter') {
                    event.preventDefault();
                    onEnter();
                    return;
                }
                if (MOVES.indexOf(event.key) > -1) beginGesture();
            }}
            onMouseDownCapture={() => { if (!disabled) beginGesture(); }}
            onTouchStartCapture={() => { if (!disabled) beginGesture(); }}
        >
            <Slider
                value={param.value}
                min={param.min}
                max={param.max}
                step={param.round}
                precision={param.precision}
                disabled={disabled}
                label={format}
                onChange={onChange}
                onChangeEnd={endGesture}
                thumbLabel={label}
                thumbValueText={format}
            />
        </div>
    );
}

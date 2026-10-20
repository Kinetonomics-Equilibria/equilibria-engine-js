import { useEffect, useRef } from 'react';
import { Slider } from '@mantine/core';
import type { ParamInfo } from 'equilibria-engine-js';
import classes from './ParamSlider.module.css';

/**
 * A slider bound to a param, wired to the engine's gesture contract correctly.
 *
 * The contract is two calls — `beginGesture` before the value moves and
 * `endGesture` after — and getting the *order* wrong is invisible: the diagram
 * still moves, the number still updates, and only the ghost and the narration
 * are quietly wrong. P9 got it wrong for the keyboard and shipped, and
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
 * itself, and the narration reads "drag a curve to see what it changes" about a
 * curve that has just moved. Worse, the gesture is opened and never closed —
 * `onChangeEnd` has already fired by then — so the narration stays stuck in its
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

    /**
     * The id of whatever says what the param stands for, read after its name.
     * On the thumb, for the same reason the label is.
     */
    describedBy?: string;

    disabled?: boolean;
    onChange(value: number): void;
    beginGesture(): void;
    endGesture(): void;

    /** Enter, where the host has something for it to commit. */
    onEnter?(): void;

    /**
     * Float the value over the thumb while it moves. On by default; off where
     * the value is already printed beside the slider's name, which is one
     * number in two places — and the bubble lands on whatever is above.
     */
    valueBubble?: boolean;

    /**
     * The colour of the curve the param moves, as a CSS value, where it has
     * one: the bar and the thumb's ring are drawn in it, so the slider is tied
     * to the line it shifts. The theme's own colour where it has none.
     */
    color?: string;
}

export function ParamSlider({
    param, label, describedBy, disabled, onChange, beginGesture, endGesture, onEnter,
    valueBubble = true, color
}: ParamSliderProps) {

    const format = (value: number) => value.toFixed(param.precision);

    // Mantine's thumb takes a fixed list of props and drops the rest — an
    // `aria-describedby` passed through `thumbProps` never reaches the element
    // carrying `role="slider"` — so the description is put on that element
    // once it exists. React leaves an attribute it did not set alone.
    const wrap = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const thumb = wrap.current ? wrap.current.querySelector('[role="slider"]') : null;
        if (!thumb) return;
        if (describedBy) thumb.setAttribute('aria-describedby', describedBy);
        else thumb.removeAttribute('aria-describedby');
    }, [describedBy]);

    return (
        <div
            ref={wrap}
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
                color={color}
                label={valueBubble ? format : null}
                onChange={onChange}
                onChangeEnd={endGesture}
                thumbLabel={label}
                thumbValueText={format}
            />
        </div>
    );
}

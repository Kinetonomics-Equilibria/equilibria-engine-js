import type { ParamInfo } from 'equilibria-engine-js';
import { ParamControl } from './ParamControl';
import type { LessonTry } from './track/track';
import classes from './TryRow.module.css';

/**
 * A "see what happens when" step's controls, on the lesson card under its words.
 *
 * The card holds no instruments: while a lesson runs it is the whole side
 * column, so a student moves what the step hands them and nothing else. This is
 * how a step hands them something. Each slider writes the param a drag writes,
 * through the same `updateParams` and the same gesture pair, so "What changed"
 * narrates it as it narrates any move of theirs — and each is the same control
 * the Explore instrument hands out, so moving one is learned once.
 *
 * Named by the step, not by the param: the first lesson's params are `a` and
 * `c`, which are the right names in a formula and the wrong ones over a slider
 * on a card written in plain words.
 */

export interface TryRowProps {
    /** What the step offers, in its order. */
    controls: LessonTry[];

    /** Every param, as the engine declares it; the ones offered are looked up here. */
    params: ParamInfo[];

    onChange(name: string, value: number): void;
    onGestureStart(): void;
    onGestureEnd(): void;
}

export function TryRow({ controls, params, onChange, onGestureStart, onGestureEnd }: TryRowProps) {
    const offered = controls
        .map(control => ({ control, param: params.filter(p => p.name === control.param)[0] }))
        .filter((o): o is { control: LessonTry; param: ParamInfo } => !!o.param);

    if (offered.length === 0) return null;

    return (
        <section className={classes.row} role="group" aria-label="Try it">
            {offered.map(({ control, param }) => (
                <ParamControl
                    key={param.name}
                    param={param}
                    label={control.label}
                    onChange={value => onChange(param.name, value)}
                    beginGesture={onGestureStart}
                    endGesture={onGestureEnd}
                />
            ))}
        </section>
    );
}

import { useId } from 'react';
import { Text } from '@mantine/core';
import type { ParamInfo } from 'equilibria-engine-js';
import { ParamSlider } from './ParamSlider';
import classes from './ParamControl.module.css';

/**
 * One thing a student can move: its name and its value on a line, what it
 * stands for under them, and the slider across the card's width.
 *
 * The same control wherever a param is handed over — the Explore instrument,
 * and a lesson step's "try it" — so a student who has used one has used them
 * all. The gesture wiring is `ParamSlider`'s and stays there.
 *
 * The name on screen is hidden from a screen reader, which hears it once, on
 * the slider, followed by `about`: "Demand for A$, slider, 50. People overseas
 * paying for Australian exports…".
 */

export interface ParamControlProps {
    param: ParamInfo;

    /** What it is called here: the param's own label, or a step's word for it. */
    label: string;

    /**
     * Who or what it stands for, in one short sentence. Optional: a step's
     * words above its controls already say it.
     */
    about?: string;

    onChange(value: number): void;
    beginGesture(): void;
    endGesture(): void;
}

export function ParamControl({ param, label, about, onChange, beginGesture, endGesture }: ParamControlProps) {
    const aboutId = useId();

    return (
        <div className={classes.control}>
            <Text component="span" size="sm" className={classes.name} aria-hidden="true">{label}</Text>
            {/* Tabular, or the readout jitters sideways through a scrub and the
              * eye follows the movement instead of the number. */}
            <Text component="span" size="sm" className={classes.value}>
                {param.value.toFixed(param.precision)}
            </Text>
            {about ? (
                <Text component="p" size="xs" className={classes.about} id={aboutId}>{about}</Text>
            ) : null}
            <div className={classes.slider}>
                <ParamSlider
                    param={param}
                    label={label}
                    describedBy={about ? aboutId : undefined}
                    valueBubble={false}
                    onChange={onChange}
                    beginGesture={beginGesture}
                    endGesture={endGesture}
                />
            </div>
        </div>
    );
}

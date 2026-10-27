import { useId } from 'react';
import { Stack, Switch, Text } from '@mantine/core';
import type { ParamInfo } from 'equilibria-engine-js';
import { ParamControl } from '../ParamControl';
import type { ParamWords } from '../lessons/content';
import type { InstrumentProps } from './types';
import classes from './Explore.module.css';

/**
 * A control for every param the student is allowed to move, each saying who
 * or what it stands for.
 *
 * Nothing here decides how a param should be displayed. `label`, `min`, `max`,
 * `round` and `precision` all come from the engine, because the diagram is
 * already showing the same numbers and two answers to "how many decimals is
 * this worth" is one too many. What a param *is* comes from the lesson, as
 * `about`: a slider called "Demand for A$" moves a number until something says
 * it is the world buying Australian exports.
 *
 * What a move did is not said here. It is said in "What changed", beside this
 * card rather than inside it, because a scenario or a drag on the diagram
 * changes the market just as much — and a chain that lived in this tab would be
 * gone the moment a student opened another.
 *
 * Presentation params are filtered out for the same reason the narration
 * ignores them: which panel is focal is something the *screen* does, and a
 * slider for it in among the economics would invite a student to think it was
 * part of the model.
 */

export interface ExploreProps extends InstrumentProps {
    /** What each param stands for, from the model. See `StudyModel.paramWords`. */
    words?: Record<string, ParamWords>;

    /** Open questions to answer by moving things. See `StudyModel.explorePrompts`. */
    prompts?: string[];

    /**
     * The colour of each param's curve, by param name, as the engine draws it.
     * Only the params whose lesson names a curve are in it; the rest keep the
     * theme's colour.
     */
    colors?: Record<string, string>;
}

function label(p: ParamInfo) {
    return p.label || p.name;
}

export function Explore({
    params, updateParams, beginGesture, endGesture, words = {}, prompts = [], colors = {}
}: ExploreProps) {
    const shown = params.filter(p => !p.presentation);
    const promptsId = useId();

    if (shown.length === 0) {
        return <Text size="sm" c="dimmed">This diagram has nothing to move.</Text>;
    }

    return (
        <Stack gap="lg">
            {shown.map(p => p.isBoolean ? (
                // A boolean reaches the app as 0 or 1 with numeric bounds —
                // `min: 0, max: 100` in the engine's own coercion — so without
                // `isBoolean` this would be a hundred-step slider for a thing
                // with two states. There is no gesture to bracket: a switch
                // commits once.
                <Switch
                    key={p.name}
                    label={label(p)}
                    description={words[p.name] ? words[p.name].about : undefined}
                    checked={p.value >= 0.5}
                    color={colors[p.name]}
                    onChange={event => updateParams([{ name: p.name, value: event.currentTarget.checked ? 1 : 0 }])}
                />
            ) : (
                // The two halves of a scrub, and their *ordering*, live in
                // `ParamSlider`: `beginGesture` has to run before the value
                // moves or the engine snapshots the state it was supposed to
                // remember. This instrument shipped with them the wrong way
                // round for the keyboard, which is exactly the kind of thing
                // one place can be right about and two cannot.
                <ParamControl
                    key={p.name}
                    param={p}
                    label={label(p)}
                    about={words[p.name] ? words[p.name].about : undefined}
                    color={colors[p.name]}
                    onChange={value => updateParams([{ name: p.name, value }])}
                    beginGesture={beginGesture}
                    endGesture={endGesture}
                />
            ))}

            {/* Under the controls they are answered with, and after them: a
              * student reaches for a slider first, and a question is for when
              * they wonder what to do with it. Not marked and not ticked off —
              * the answer is on the diagram and in "What changed". */}
            {prompts.length > 0 ? (
                <section className={classes.prompts} aria-labelledby={promptsId}>
                    <h3 className={classes.eyebrow} id={promptsId}>Try this</h3>
                    <ul className={classes.list}>
                        {prompts.map(prompt => <li key={prompt}>{prompt}</li>)}
                    </ul>
                </section>
            ) : null}
        </Stack>
    );
}

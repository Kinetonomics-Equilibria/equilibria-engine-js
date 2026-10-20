import { useEffect, useMemo, useRef } from 'react';
import { Code, Stack, Text } from '@mantine/core';
import katex from 'katex';
import type { InstrumentProps } from './types';
import { calcPrecision, formatValue } from '../narration/narrate';
import type { NarratedCalc } from '../narration/narrate';
import {
    isTypesettable, lessonSymbols, referencesOf, toResultTex, toSubstitutedTex, toSymbolicTex, toWorkingTex
} from './mathsText';
import type { Places, Symbols } from './mathsText';
import classes from './Maths.module.css';

/**
 * The calc, typeset, with today's numbers in it.
 *
 * Three lines — the formula, the formula with values substituted, the result —
 * and the middle one is the whole instrument. The other two are its endpoints.
 * They are set as one derivation, `P* = (a + c)/2 = (24.0 + 2.0)/2 = $13.00`,
 * in the diagram's own letters and the caption's own units, because a student
 * reads it beside both and should not have to translate between them.
 *
 * This is the clearest place the product's reframe pays off: nobody writes this
 * content. `calcs` already hold their formulas as strings because the engine
 * needs them to compute anything, so an explainer is those strings rendered.
 * A curriculum's worth of maths explanations, and the marginal cost of the next
 * one is zero.
 */

function Tex({ tex, display = false }: { tex: string; display?: boolean }) {
    const ref = useRef<HTMLSpanElement | null>(null);

    useEffect(() => {
        if (!ref.current) return;
        try {
            katex.render(tex, ref.current, { throwOnError: false, displayMode: display });
        } catch {
            // `throwOnError: false` already renders the error inline in red, so
            // reaching here means KaTeX failed structurally. The raw string is
            // more use to whoever has to fix it than an empty box.
            ref.current.textContent = tex;
        }
    }, [tex, display]);

    return <span ref={ref} />;
}

function Row({ name, expression, calcs, params, prevCalcs, places, symbols, narrated, highlighted }: {
    name: string;
    expression: string;
    calcs: Record<string, number | string>;
    params: Record<string, number>;
    prevCalcs: Record<string, unknown> | null;
    places: Places;
    symbols: Symbols;
    narrated: NarratedCalc | undefined;
    highlighted: boolean;
}) {
    const value = calcs[name];

    const symbolic = useMemo(() => toSymbolicTex(expression, symbols), [expression, symbols]);
    const substituted = useMemo(
        () => toSubstitutedTex(expression, calcs, params, prevCalcs, places),
        [expression, calcs, params, prevCalcs, places]
    );

    // Parsing is not the test — `colors.demand` parses fine and typesets into
    // confident nonsense. What separates a formula from a color name is whether
    // the engine got a number out of it.
    const working = isTypesettable(value) && symbolic !== null
        ? toWorkingTex(symbols('calcs', name), [
            symbolic,
            substituted,
            toResultTex(value as number, places('calcs', name), narrated && narrated.unit)
        ])
        : null;

    // The words, where the lesson has them. The letters are the first thing
    // in the working underneath, so a heading that repeated them would say the
    // same thing twice in the same few pixels.
    const heading = narrated ? narrated.meaning || narrated.label : name;

    return (
        <div className={highlighted ? classes.rowFocused : classes.row} data-calc={name}>
            <Text component="div" size="xs" fw={600} className={classes.name}>{heading}</Text>

            {working ? (
                <div className={classes.lines}><Tex tex={working} display /></div>
            ) : (
                // Honest and still useful. A calc that is a color, a label or a
                // forward reference is not broken, and rendering it as maths
                // would be a confident lie about what it is.
                <Code className={classes.raw}>{expression}</Code>
            )}
        </div>
    );
}

/**
 * What the letters in the formulas stand for, and what they are now.
 *
 * Once, above every formula, rather than under each: `a` means the same thing
 * in all three of the formulas it appears in, and three copies of one sentence
 * would cost the height that lets every calc be read without scrolling.
 */
function Key({ entries }: { entries: { name: string; tex: string; meaning: string }[] }) {
    return (
        <dl className={classes.key}>
            {entries.map(entry => (
                <div key={entry.name} className={classes.entry}>
                    <dt><Tex tex={entry.tex} /></dt>
                    <dd>{entry.meaning}</dd>
                </div>
            ))}
        </dl>
    );
}

export interface MathsProps extends InstrumentProps {
    /**
     * What the lesson calls each calc: its label, unit and decimals, and the
     * symbol and words the formulas use for it.
     *
     * The decimals are the app's one answer, shared with the narration and the
     * panel captions, because a result that read "= 13.0" beside a caption
     * reading "$13.00" would be two answers to one question. The symbol is the
     * same argument made about letters: the diagram labels the equilibrium P*,
     * and a formula calling it `Pe` is a second name for a thing a student was
     * only just taught the first one of. A calc the lesson does not name is
     * written as its own name, to one decimal.
     */
    narrated?: Record<string, NarratedCalc>;
    /** What a param means, where its label does not say. See `StudyContent`. */
    paramMeanings?: Record<string, string>;
    /**
     * The `prev` calc values, so a calc over `prev` substitutes the same numbers
     * the ghosts are drawn from. `unknown` because a calc is not always a
     * number — a color is a calc too — and pretending otherwise here would just
     * move the check somewhere less honest.
     */
    prevCalcs?: Record<string, unknown> | null;
}

const NONE: Record<string, never> = {};

export function Maths({
    calcs, calcExpressions, params, focus, narrated = NONE, paramMeanings = NONE, prevCalcs = null
}: MathsProps) {
    const paramValues = useMemo(() => {
        const out: Record<string, number> = {};
        params.forEach(p => { out[p.name] = p.value });
        return out;
    }, [params]);

    // A param is printed at the engine's own precision for it, which is what
    // the narration and the Explore sliders print it at; a calc at the app's.
    const places = useMemo<Places>(() => {
        const declared: Record<string, number> = {};
        params.forEach(p => { declared[p.name] = p.precision });
        return (scope, name) => scope === 'params' ? declared[name] : calcPrecision(narrated[name]);
    }, [params, narrated]);

    const symbols = useMemo(() => lessonSymbols(narrated), [narrated]);

    // Opened *at* something, by P8's "why?". The named calc goes first — the
    // student asked about that one, and making them find it in a list is a way
    // of not answering.
    const names = useMemo(() => {
        const all = Object.keys(calcExpressions);
        if (!focus?.calc || all.indexOf(focus.calc) === -1) return all;
        return [focus.calc].concat(all.filter(n => n !== focus.calc));
    }, [calcExpressions, focus]);

    // Every param a typeset formula uses, in the order the diagram declares
    // them, and only those with something to say. A param with no label is
    // labelled with its own name, and "a = 20.0: a" is not a key.
    const key = useMemo(() => {
        const used: Record<string, boolean> = {};
        names
            .filter(name => isTypesettable(calcs[name]))
            .forEach(name => referencesOf(calcExpressions[name]).forEach(ref => {
                if (ref.scope === 'params' && !ref.isPrev) used[ref.name] = true;
            }));
        return params
            .filter(p => used[p.name])
            .map(p => ({
                name: p.name,
                tex: symbols('params', p.name) + ' = ' + formatValue(p.value, p.precision),
                meaning: paramMeanings[p.name] || (p.label !== p.name ? p.label : '')
            }))
            .filter(entry => entry.meaning);
    }, [names, calcs, calcExpressions, params, paramMeanings, symbols]);

    if (names.length === 0) {
        return <Text size="sm" c="dimmed">This diagram computes nothing to explain.</Text>;
    }

    return (
        // Spaced to fit. Four calcs, each a heading and three lines of display
        // maths, fill the tab at 1440×900, and every gap here is four of them;
        // the headings are what separate one calc from the next, and the row's
        // own tint the focused one — the space does not have to.
        <Stack gap={4}>
            {key.length > 0 ? <Key entries={key} /> : null}
            {names.map(name => (
                <Row
                    key={name}
                    name={name}
                    expression={calcExpressions[name]}
                    calcs={calcs}
                    params={paramValues}
                    prevCalcs={prevCalcs}
                    places={places}
                    symbols={symbols}
                    narrated={narrated[name]}
                    highlighted={focus?.calc === name}
                />
            ))}
        </Stack>
    );
}

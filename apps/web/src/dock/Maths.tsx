import { useEffect, useMemo, useRef } from 'react';
import { Code, Stack, Text } from '@mantine/core';
import katex from 'katex';
import type { InstrumentProps } from './types';
import { isTypesettable, toSubstitutedTex, toSymbolicTex } from './mathsText';
import type { Places } from './mathsText';
import classes from './Maths.module.css';

/**
 * The calc, typeset, with today's numbers in it.
 *
 * Three lines — the formula, the formula with values substituted, the result —
 * and the middle one is the whole instrument. The other two are its endpoints.
 *
 * This is the clearest place the product's reframe pays off: nobody writes this
 * content. `calcs` already hold their formulas as strings because the engine
 * needs them to compute anything, so an explainer is those strings rendered.
 * A curriculum's worth of maths explanations, and the marginal cost of the next
 * one is zero.
 */

function Tex({ tex }: { tex: string }) {
    const ref = useRef<HTMLSpanElement | null>(null);

    useEffect(() => {
        if (!ref.current) return;
        try {
            katex.render(tex, ref.current, { throwOnError: false, displayMode: false });
        } catch {
            // `throwOnError: false` already renders the error inline in red, so
            // reaching here means KaTeX failed structurally. The raw string is
            // more use to whoever has to fix it than an empty box.
            ref.current.textContent = tex;
        }
    }, [tex]);

    return <span ref={ref} />;
}

function Row({ name, expression, calcs, params, prevCalcs, places, highlighted }: {
    name: string;
    expression: string;
    calcs: Record<string, number | string>;
    params: Record<string, number>;
    prevCalcs: Record<string, unknown> | null;
    places: Places;
    highlighted: boolean;
}) {
    const value = calcs[name];

    const symbolic = useMemo(() => toSymbolicTex(expression), [expression]);
    const substituted = useMemo(
        () => toSubstitutedTex(expression, calcs, params, prevCalcs, places),
        [expression, calcs, params, prevCalcs, places]
    );

    // Parsing is not the test — `colors.demand` parses fine and typesets into
    // confident nonsense. What separates a formula from a color name is whether
    // the engine got a number out of it.
    const showable = isTypesettable(value) && symbolic !== null;

    return (
        <div className={highlighted ? classes.rowFocused : classes.row}>
            <Text component="div" size="sm" fw={600} className={classes.name}>{name}</Text>

            {showable ? (
                <div className={classes.lines}>
                    <div><Tex tex={symbolic!} /></div>
                    {substituted ? (
                        <div className={classes.substituted}><Tex tex={substituted} /></div>
                    ) : null}
                    <div className={classes.result}>
                        = {(value as number).toFixed(places('calcs', name))}
                    </div>
                </div>
            ) : (
                // Honest and still useful. A calc that is a color, a label or a
                // forward reference is not broken, and rendering it as maths
                // would be a confident lie about what it is.
                <Code className={classes.raw}>{expression}</Code>
            )}
        </div>
    );
}

export interface MathsProps extends InstrumentProps {
    /**
     * Decimal places for a calc's value — the app's one answer, shared with the
     * strip and the panel captions. Per calc, because money is printed to the
     * cent and a quantity is not, and a result that read "= 13.0" beside a
     * caption reading "$13.00" would be two answers to one question.
     */
    precision(calc: string): number;
    /**
     * The `prev` calc values, so a calc over `prev` substitutes the same numbers
     * the ghosts are drawn from. `unknown` because a calc is not always a
     * number — a color is a calc too — and pretending otherwise here would just
     * move the check somewhere less honest.
     */
    prevCalcs?: Record<string, unknown> | null;
}

export function Maths({ calcs, calcExpressions, params, focus, precision, prevCalcs = null }: MathsProps) {
    const paramValues = useMemo(() => {
        const out: Record<string, number> = {};
        params.forEach(p => { out[p.name] = p.value });
        return out;
    }, [params]);

    // A param is printed at the engine's own precision for it, which is what
    // the strip and the Explore sliders print it at; a calc at the app's.
    const places = useMemo<Places>(() => {
        const declared: Record<string, number> = {};
        params.forEach(p => { declared[p.name] = p.precision });
        return (scope, name) => scope === 'params' ? declared[name] : precision(name);
    }, [params, precision]);

    // Opened *at* something, by P8's "why?". The named calc goes first — the
    // student asked about that one, and making them find it in a list is a way
    // of not answering.
    const names = useMemo(() => {
        const all = Object.keys(calcExpressions);
        if (!focus?.calc || all.indexOf(focus.calc) === -1) return all;
        return [focus.calc].concat(all.filter(n => n !== focus.calc));
    }, [calcExpressions, focus]);

    if (names.length === 0) {
        return <Text size="sm" c="dimmed">This diagram computes nothing to explain.</Text>;
    }

    return (
        <Stack gap="lg">
            {names.map(name => (
                <Row
                    key={name}
                    name={name}
                    expression={calcExpressions[name]}
                    calcs={calcs}
                    params={paramValues}
                    prevCalcs={prevCalcs}
                    places={places}
                    highlighted={focus?.calc === name}
                />
            ))}
        </Stack>
    );
}

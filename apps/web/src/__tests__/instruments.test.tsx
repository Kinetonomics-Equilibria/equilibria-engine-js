import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import type { ReactElement } from 'react';
import type { ParamInfo } from 'equilibria-engine-js';
import { Explore } from '../dock/Explore';
import { Maths } from '../dock/Maths';
import { Scenarios } from '../dock/Scenarios';
import type { InstrumentProps } from '../dock/types';
import { theme } from '../theme';

const view = (ui: ReactElement) =>
    render(<MantineProvider theme={theme} env="test">{ui}</MantineProvider>);

const param = (over: Partial<ParamInfo> = {}): ParamInfo => ({
    name: 'a', label: 'Demand intercept', value: 20, min: 5, max: 28, round: 0.1,
    precision: 1, presentation: false, isBoolean: false, ...over
});

const base = (over: Partial<InstrumentProps> = {}): InstrumentProps => ({
    params: [param()],
    calcs: { Pe: 11, Qe: 9 },
    calcExpressions: { Pe: '(params.a + params.c)/2' },
    updateParams: vi.fn(),
    beginGesture: vi.fn(),
    endGesture: vi.fn(),
    snapshot: vi.fn(),
    ...over
});

describe('Explore', () => {
    it('renders a slider from the engine metadata, not from guesses', () => {
        const props = base();
        view(<Explore {...props} />);

        const slider = screen.getByRole('slider', { name: 'Demand intercept' });
        expect(slider.getAttribute('aria-valuemin')).toBe('5');
        expect(slider.getAttribute('aria-valuemax')).toBe('28');
        expect(slider.getAttribute('aria-valuenow')).toBe('20');
        // Printed to the decimals the diagram uses, from `precision`.
        expect(screen.getByText('20.0')).toBeDefined();
    });

    // A promotion is not economics, and a slider for it among the params would
    // invite a student to think it was part of the model.
    it('leaves presentation params out', () => {
        view(<Explore {...base({
            params: [param(), param({ name: 'stageFocus', label: 'Focus', presentation: true })]
        })} />);

        expect(screen.getByRole('slider', { name: 'Demand intercept' })).toBeDefined();
        expect(screen.queryByRole('slider', { name: 'Focus' })).toBeNull();
    });

    // The engine coerces a boolean to 0/1 with `min: 0, max: 100`, so without
    // `isBoolean` this would be a hundred-step slider for a thing with two
    // states — and no amount of inspecting the bounds could tell.
    it('gives a boolean param a switch rather than a hundred-step slider', () => {
        view(<Explore {...base({
            params: [param({ name: 'showGhost', label: 'Show ghost', value: 1, min: 0, max: 100, round: 1, precision: 0, isBoolean: true })]
        })} />);

        expect(screen.getByRole('switch', { name: 'Show ghost' })).toBeDefined();
        expect(screen.queryByRole('slider')).toBeNull();
    });

    it('moves the param it was given', async () => {
        const user = userEvent.setup();
        const updateParams = vi.fn();
        view(<Explore {...base({ updateParams })} />);

        screen.getByRole('slider', { name: 'Demand intercept' }).focus();
        await user.keyboard('{ArrowRight}');

        expect(updateParams).toHaveBeenCalledTimes(1);
        expect(updateParams.mock.calls[0][0][0].name).toBe('a');
    });

    /**
     * The strobe guard, at the level this component owns.
     *
     * A slider raises no `kg:curve_dragged`, so the narration strip cannot tell
     * a scrub from sixty separate interactions on its own. These two calls are
     * the only thing that tells it — and the engine, which uses them to take one
     * snapshot for the whole gesture rather than one per frame.
     */
    it('opens a gesture when a scrub starts and closes it when it ends', async () => {
        const user = userEvent.setup();
        const beginGesture = vi.fn();
        view(<Explore {...base({ beginGesture })} />);

        const slider = screen.getByRole('slider', { name: 'Demand intercept' });
        slider.focus();
        await user.keyboard('{ArrowRight}');

        expect(beginGesture).toHaveBeenCalled();
    });
});

describe('Scenarios', () => {
    const scenarios = [
        { id: 'shock', label: 'Demand shock', description: 'Buyers want more.', params: { a: 26 } },
        { id: 'both', label: 'Both', params: { a: 26, c: 6 } }
    ];

    it('applies every param in the set as one call', async () => {
        const user = userEvent.setup();
        const updateParams = vi.fn();
        const snapshot = vi.fn();
        view(<Scenarios {...base({ updateParams, snapshot, params: [param(), param({ name: 'c' })] })} scenarios={scenarios} />);

        await user.click(screen.getByRole('button', { name: 'Both' }));

        // Declared *before* the change, or the ghosts are drawn against the
        // state the scenario produced and the strip reports nothing moving —
        // a diagram showing a shift under a sentence saying it did not.
        expect(snapshot).toHaveBeenCalledTimes(1);
        expect(snapshot.mock.invocationCallOrder[0])
            .toBeLessThan(updateParams.mock.invocationCallOrder[0]);

        // One call, not one per param: the ordering of a multi-param move is a
        // decision, and splitting it scatters that decision across the app.
        expect(updateParams).toHaveBeenCalledTimes(1);
        expect(updateParams.mock.calls[0][0]).toEqual([
            { name: 'a', value: 26 }, { name: 'c', value: 6 }
        ]);
    });

    // Applying half a scenario silently is worse than refusing it: the diagram
    // ends up in a state the author never described.
    it('refuses a scenario that names a param the diagram does not have', () => {
        view(<Scenarios {...base()} scenarios={scenarios} />);

        // `c` is not in this diagram's params, so "Both" cannot be applied.
        expect(screen.getByRole('button', { name: 'Both' }).hasAttribute('disabled')).toBe(true);
        expect(screen.getByText(/Unknown param: c/)).toBeDefined();
        expect(screen.getByRole('button', { name: 'Demand shock' }).hasAttribute('disabled')).toBe(false);
    });
});

describe('Maths', () => {
    const props = () => base({
        calcs: { Qe: 11, Pe: 13, TR: 143, band: '#ff0000' },
        calcExpressions: {
            Qe: '(params.a - params.c)/2',
            Pe: '(params.a + params.c)/2',
            TR: 'calcs.Pe * calcs.Qe',
            band: 'colors.demand'
        },
        params: [param({ name: 'a', value: 24 }), param({ name: 'c', label: 'c', value: 2 })]
    });

    /** What the lesson calls them: P* in dollars to the cent, Q* to the default tenth. */
    const NARRATED = {
        Pe: { name: 'Pe', label: 'P*', meaning: 'Equilibrium price', unit: '$', precision: 2 },
        Qe: { name: 'Qe', label: 'Q*', meaning: 'Equilibrium quantity' }
    };

    /** A row's maths as it is seen, without KaTeX's spacing or its MathML copy. */
    const seen = (calc: string) => {
        const row = document.querySelector(`[data-calc="${calc}"] .katex-html`);
        return (row ? row.textContent || '' : '').replace(/[\s\u200b]/g, '');
    };

    /** The TeX a row was set from. */
    const source = (calc: string) =>
        document.querySelector(`[data-calc="${calc}"] annotation`)?.textContent || '';

    const order = () => Array.from(document.querySelectorAll('[data-calc]')).map(n => n.getAttribute('data-calc'));

    // Per calc, because the app prints money to the cent and a quantity to a
    // tenth — and the result line has to agree with the caption beside it.
    it('ends each calc on its result, at the lesson\'s precision and in its unit', () => {
        view(<Maths {...props()} narrated={NARRATED} />);
        expect(seen('Qe')).toMatch(/=11\.0$/);
        expect(seen('Pe')).toMatch(/=\$13\.00$/);
    });

    // The diagram's dropline says P*. `Pe` is the engine's key for it, and
    // typeset as it was it read as P times e.
    it('writes each calc in the lesson\'s symbol, wherever it appears', () => {
        view(<Maths {...props()} narrated={NARRATED} />);
        expect(source('Pe')).toMatch(/^\\begin\{aligned\}P\^\* &=/);
        expect(source('TR')).toContain('P^*');
        expect(source('TR')).toContain('Q^*');
        expect(source('TR')).not.toMatch(/Pe|Qe/);
    });

    it('heads each calc with its plain words, or its name when there are none', () => {
        view(<Maths {...props()} narrated={NARRATED} />);
        const heading = (calc: string) => document.querySelector(`[data-calc="${calc}"]`)!.firstElementChild!.textContent;
        expect(heading('Pe')).toBe('Equilibrium price');
        expect(heading('TR')).toBe('TR');
    });

    // `displayMode: false` set a fraction in text style, at the height of the
    // text beside it.
    it('sets the maths in display style', () => {
        const { container } = view(<Maths {...props()} narrated={NARRATED} />);
        expect(container.querySelectorAll('[data-calc] .katex-display')).toHaveLength(3);
    });

    // Parsing is not the test — `colors.demand` parses fine and would typeset
    // into confident nonsense. What separates a formula from a color is whether
    // the engine got a number out of it.
    it('falls back to the plain expression when a calc is not a number', () => {
        view(<Maths {...props()} />);
        expect(screen.getByText('colors.demand')).toBeDefined();
    });

    // `a` and `c` were letters in a formula with nothing anywhere saying what
    // they are. `c` here has no label of its own, so it is in the key only
    // when the lesson says what it means.
    it('keys the letters it uses, with what they mean and what they are now', () => {
        view(<Maths {...props()} narrated={NARRATED} />);
        const key = screen.getByRole('definition').closest('dl')!;
        expect(key.textContent).toContain('Demand intercept');
        expect(key.querySelector('annotation')!.textContent).toBe('a = 24.0');
        expect(screen.getAllByRole('definition')).toHaveLength(1);
    });

    it('takes a lesson\'s words for a param over its label', () => {
        view(<Maths {...props()} narrated={NARRATED} paramMeanings={{ c: 'where supply meets the P axis' }} />);
        expect(screen.getAllByRole('definition').map(d => d.textContent))
            .toEqual(['Demand intercept', 'where supply meets the P axis']);
    });

    it('has no key when no letter has a meaning', () => {
        view(<Maths {...props()} params={[param({ name: 'a', label: 'a' }), param({ name: 'c', label: 'c' })]} />);
        expect(screen.queryByRole('definition')).toBeNull();
    });

    // A student who asked "why?" about P* should not have to find it in a list.
    it('puts the calc it was opened at first, and marks it', () => {
        const { container } = view(<Maths {...props()} narrated={NARRATED} focus={{ calc: 'Pe' }} />);
        expect(order()[0]).toBe('Pe');
        expect(container.querySelector('[class*="rowFocused"]')!.getAttribute('data-calc')).toBe('Pe');
    });

    it('lists calcs in declaration order when opened at nothing', () => {
        view(<Maths {...props()} />);
        expect(order()).toEqual(['Qe', 'Pe', 'TR', 'band']);
    });
});

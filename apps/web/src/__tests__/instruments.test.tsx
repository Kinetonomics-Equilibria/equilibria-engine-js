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
        calcs: { Qe: 11, Pe: 13, band: '#ff0000' },
        calcExpressions: {
            Qe: '(params.a - params.c)/2',
            Pe: '(params.a + params.c)/2',
            band: 'colors.demand'
        },
        params: [param({ name: 'a', value: 24 }), param({ name: 'c', value: 2 })]
    });

    it('shows the result of each calc at the app precision', () => {
        view(<Maths {...props()} precision={1} />);
        expect(screen.getByText('= 11.0')).toBeDefined();
        expect(screen.getByText('= 13.0')).toBeDefined();
    });

    // Parsing is not the test — `colors.demand` parses fine and would typeset
    // into confident nonsense. What separates a formula from a color is whether
    // the engine got a number out of it.
    it('falls back to the plain expression when a calc is not a number', () => {
        view(<Maths {...props()} precision={1} />);
        expect(screen.getByText('colors.demand')).toBeDefined();
    });

    // A student who asked "why?" about P* should not have to find it in a list.
    it('puts the calc it was opened at first', () => {
        view(<Maths {...props()} precision={1} focus={{ calc: 'Pe' }} />);
        const names = screen.getAllByText(/^(Qe|Pe|band)$/).map(n => n.textContent);
        expect(names[0]).toBe('Pe');
    });

    it('lists calcs in declaration order when opened at nothing', () => {
        view(<Maths {...props()} precision={1} />);
        const names = screen.getAllByText(/^(Qe|Pe|band)$/).map(n => n.textContent);
        expect(names).toEqual(['Qe', 'Pe', 'band']);
    });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import type { ReactElement } from 'react';
import { NarrationCard } from '../NarrationCard';
import { NarrationStrip } from '../NarrationStrip';
import { narrate } from '../narration/narrate';
import type { NarrateInput, NarrationLine, Snapshot } from '../narration/narrate';
import { theme } from '../theme';

/**
 * "What changed" as a component: the chain in the order it happened, in the
 * lesson's words where it has them; controls that exist only when they lead
 * somewhere; and one sentence for a screen reader — the same one the strip
 * says, since the two stand in for each other.
 *
 * Lines are built by `narrate`, as the strip's tests build theirs, so these
 * cannot drift from what the screen will hand the card.
 */

const view = (ui: ReactElement) =>
    render(<MantineProvider theme={theme} env="test">{ui}</MantineProvider>);

const PARAMS = [{ name: 'a', label: 'a', precision: 1, rise: 'Demand increases', fall: 'Demand decreases' }];
const CALCS = [
    { name: 'Pe', label: 'P*', unit: '$', rise: 'The price rises', fall: 'The price falls' },
    { name: 'Qe', label: 'Q*' }
];

const market = (a: number): Snapshot => ({
    params: { a }, calcs: { Pe: (a + 2) / 2, Qe: (a - 2) / 2 }
});

const chain = (over: Partial<NarrateInput> = {}): NarrationLine => narrate({
    before: market(20),
    after: market(24),
    affected: [{
        name: 'demand_market', title: 'demand',
        movement: { kind: 'shift', dx: 0, dy: 4, axis: 'y', sign: 1 }
    }],
    params: PARAMS,
    calcs: CALCS,
    ...over
});

const REST = narrate({ before: null, after: market(20), params: PARAMS, calcs: CALCS });

const card = () => screen.getByRole('region', { name: 'What changed' });
const part = (name: string) => card().querySelector(`[data-part="${name}"]`);
const announced = () => card().querySelector('[role="status"]')!.textContent;

describe('the chain', () => {
    it('reads top to bottom in the order it happened: what moved, the curves, what followed', () => {
        view(<NarrationCard line={chain()} />);

        const parts = [...card().querySelectorAll('[data-part]')].map(p => p.getAttribute('data-part'));
        expect(parts).toEqual(['cause', 'movement', 'effect']);
    });

    it('says each clause in the lesson\'s words, with its numbers', () => {
        view(<NarrationCard line={chain()} />);

        expect(part('cause')!.textContent).toBe('Demand increases20.0→24.0');
        expect(part('movement')!.textContent).toBe('demand shifts up');
        expect(part('effect')!.textContent).toBe('The price rises$11.0→$13.0Q*9.0→11.0');
    });

    // Words are optional: a clause without them is called what it is called,
    // so a lesson that has written none reads as the strip always has.
    it('falls back to the label where the lesson has no words', () => {
        view(<NarrationCard line={chain()} />);
        expect(part('effect')!.lastElementChild!.textContent).toBe('Q*9.0→11.0');
    });

    it('lists what moved one object to a line', () => {
        const line = narrate({
            before: market(20), after: market(24), params: PARAMS, calcs: CALCS,
            affected: [
                { name: 'd', title: 'demand', movement: { kind: 'shift', dx: 0, dy: 4, axis: 'y', sign: 1 } },
                { name: 's', title: 'supply', movement: { kind: 'shift', dx: 0, dy: 1, axis: 'y', sign: 1 } }
            ]
        });
        view(<NarrationCard line={line} />);

        expect([...part('movement')!.children].map(row => row.textContent))
            .toEqual(['demand shifts up', 'supply shifts up']);
    });

    it('leaves out a part it does not have, rather than a marker with nothing beside it', () => {
        view(<NarrationCard line={narrate({ before: market(20), after: market(24), params: PARAMS, calcs: CALCS })} />);
        expect(part('movement')).toBeNull();
    });

    it('drops the arrows and the words mid-gesture, and keeps the values', () => {
        view(<NarrationCard line={chain({ live: true })} />);

        expect(part('cause')!.textContent).toBe('a24.0');
        expect(part('movement')).toBeNull();
        expect(part('effect')!.textContent).toBe('P*$13.0Q*11.0');
    });

    it('shows the rest hint when nothing has moved', () => {
        view(<NarrationCard line={REST} restHint="Drag something." />);
        expect(screen.getByText('Drag something.')).toBeDefined();
        expect(card().getAttribute('data-kind')).toBe('rest');
    });
});

/**
 * The markers: what moved, and the curves it moved, in the colour those curves
 * are drawn in; what followed in its own. Read from the `--curve` each part
 * hands its marker, because jsdom applies no stylesheet — the browser suite
 * checks the colour that lands on screen against the curve's stroke.
 */
describe('the markers', () => {
    const BLUE = '#1f77b4', ORANGE = '#ff7f0e';
    const blue = [{ ...PARAMS[0], color: BLUE }];
    const coloured = (over: { live?: boolean } = {}) => chain({ ...over, params: blue });
    const curveOf = (name: string) => (part(name) as HTMLElement).style.getPropertyValue('--curve');

    it('draws what moved, and the curves it moved, in their colour', () => {
        view(<NarrationCard line={coloured()} />);
        expect(curveOf('cause')).toBe(BLUE);
        expect(curveOf('movement')).toBe(BLUE);
    });

    it('leaves what followed in its own', () => {
        view(<NarrationCard line={coloured()} />);
        expect(curveOf('effect')).toBe('');
    });

    it('keeps the colour mid-gesture, so letting go does not repaint it', () => {
        view(<NarrationCard line={coloured({ live: true })} />);
        expect(curveOf('cause')).toBe(BLUE);
    });

    it('keeps today\'s grey where the lesson names no colour', () => {
        view(<NarrationCard line={chain()} />);
        expect(curveOf('cause')).toBe('');
        expect(curveOf('movement')).toBe('');
    });

    // Demand and supply together: one marker cannot be both, and either one
    // would tie the other cause to the wrong curve.
    it('keeps today\'s grey where the causes are curves of two colours', () => {
        const line = narrate({
            before: { params: { a: 20, c: 2 }, calcs: { Pe: 11 } },
            after: { params: { a: 24, c: 4 }, calcs: { Pe: 14 } },
            params: [...blue, { name: 'c', label: 'c', precision: 1, color: ORANGE }],
            calcs: CALCS
        });
        view(<NarrationCard line={line} />);
        expect(part('cause')!.children).toHaveLength(2);
        expect(curveOf('cause')).toBe('');
    });
});

describe('the live region', () => {
    it('announces the settled chain once, as one polite sentence in the lesson\'s words', () => {
        view(<NarrationCard line={chain()} />);

        const region = card().querySelector('[role="status"]')!;
        expect(region.getAttribute('aria-live')).toBe('polite');
        expect(region.getAttribute('aria-atomic')).toBe('true');
        expect(region.textContent).toBe(
            'Demand increases from 20.0 to 24.0; demand shifts up; ' +
            'the price rises from $11.0 to $13.0, Q* from 9.0 to 11.0.'
        );
    });

    it('says nothing during a gesture, or at rest', () => {
        const { unmount } = view(<NarrationCard line={chain({ live: true })} />);
        expect(announced()).toBe('');
        unmount();

        view(<NarrationCard line={REST} />);
        expect(announced()).toBe('');
    });

    // The rows are read once, as the sentence: element by element they would
    // be a dozen fragments, and a student hears rubble.
    it('hides the rows from assistive technology, since the sentence says them', () => {
        view(<NarrationCard line={chain()} />);
        expect(card().querySelector('[data-chain]')!.getAttribute('aria-hidden')).toBe('true');
    });

    // Either can be on screen, at different widths, for the same event.
    it('says what the strip says for the same event', () => {
        const refusal = 'a is at the top of its range (28.0) in this diagram.';
        const { unmount } = view(<NarrationStrip line={chain()} refusal={refusal} />);
        const strip = document.querySelector('[role="status"]')!.textContent;
        unmount();

        view(<NarrationCard line={chain()} refusal={refusal} />);
        expect(announced()).toBe(strip);
    });
});

describe('the controls', () => {
    it('offers undo on a settled chain, in the card\'s head, and calls back', async () => {
        const onUndo = vi.fn();
        view(<NarrationCard line={chain()} onUndo={onUndo} />);

        await userEvent.setup().click(screen.getByRole('button', { name: 'Undo' }));
        expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('offers no undo at rest or mid-gesture', () => {
        const { unmount } = view(<NarrationCard line={REST} onUndo={vi.fn()} />);
        expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
        unmount();

        view(<NarrationCard line={chain({ live: true })} onUndo={vi.fn()} />);
        expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    });

    it('hands "why?" the calc the chain ranks first', async () => {
        const onWhy = vi.fn();
        view(<NarrationCard line={chain()} onWhy={onWhy} />);

        await userEvent.setup().click(screen.getByRole('button', { name: /^Why\?/ }));
        expect(onWhy).toHaveBeenCalledWith('Pe');
    });

    it('offers no "why?" when there is nowhere for it to go', () => {
        view(<NarrationCard line={chain()} />);
        expect(screen.queryByRole('button', { name: /^Why\?/ })).toBeNull();
    });
});

describe('a refusal on the card', () => {
    const refusal = 'a is at the top of its range (28.0) in this diagram.';

    // The strip has one line, so a refusal takes it from the chain. The card
    // has room for both, and the curve did move as far as it could.
    it('is said above the chain, and the chain stays', () => {
        view(<NarrationCard line={chain()} refusal={refusal} />);

        expect(card().getAttribute('data-refusal')).toBe('true');
        expect(screen.getAllByText(refusal)[0]).toBeDefined();
        expect(part('cause')!.textContent).toBe('Demand increases20.0→24.0');
    });

    it('takes the place of the rest hint when nothing moved at all', () => {
        view(<NarrationCard line={REST} refusal={refusal} restHint="Drag something." />);
        expect(screen.queryByText('Drag something.')).toBeNull();
        expect(announced()).toBe(refusal);
    });
});

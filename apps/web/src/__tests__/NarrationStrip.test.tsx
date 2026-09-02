import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import type { ReactElement } from 'react';
import { NarrationStrip } from '../NarrationStrip';
import { narrate } from '../narration/narrate';
import type { NarrationLine, Snapshot } from '../narration/narrate';
import { theme } from '../theme';

/**
 * The strip as a component: that it renders the chain it is handed, that its
 * controls exist only when they lead somewhere, and that a screen reader is
 * told the whole thing once rather than a hundred fragments of it.
 *
 * The lines under test are built by `narrate` rather than written by hand, so
 * these tests cannot drift from what the app will actually put in front of the
 * component.
 */

const view = (ui: ReactElement) =>
    render(<MantineProvider theme={theme} env="test">{ui}</MantineProvider>);

const PARAMS = [{ name: 'a', label: 'a', precision: 1 }];
const CALCS = [{ name: 'Pe', label: 'P*', unit: '$' }, { name: 'Qe', label: 'Q*' }];

const market = (a: number): Snapshot => ({
    params: { a }, calcs: { Pe: (a + 2) / 2, Qe: (a - 2) / 2 }
});

const chain = (over: { live?: boolean } = {}): NarrationLine => narrate({
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

/** The chain as a reader sees it, with the fragments joined the way the eye joins them. */
const visibleChain = () =>
    document.querySelector('[data-kind] > div[aria-hidden="true"]')!.textContent;

describe('the chain', () => {
    it('renders cause, mechanism and effect in that order', () => {
        view(<NarrationStrip line={chain()} />);
        expect(visibleChain()).toBe('a20.0→24.0demand shifts upP*$11.0→$13.0Q*9.0→11.0');
    });

    it('shows the rest hint when nothing has moved', () => {
        view(<NarrationStrip line={REST} restHint="Drag something." />);
        expect(screen.getByText('Drag something.')).toBeDefined();
    });

    it('drops the arrows mid-gesture, and keeps the values', () => {
        view(<NarrationStrip line={chain({ live: true })} />);
        expect(visibleChain()).toBe('a24.0P*$13.0Q*11.0');
    });
});

describe('the live region', () => {
    it('announces the settled chain as one polite utterance', () => {
        view(<NarrationStrip line={chain()} />);

        const region = document.querySelector('[role="status"]')!;
        expect(region.getAttribute('aria-live')).toBe('polite');
        expect(region.getAttribute('aria-atomic')).toBe('true');
        expect(region.textContent)
            .toBe('You changed a from 20.0 to 24.0; demand shifts up; P* from $11.0 to $13.0, Q* from 9.0 to 11.0.');
    });

    it('says nothing during a gesture', () => {
        // A live region fed at 60Hz reads a hundred fragments at a student who
        // asked for one sentence.
        view(<NarrationStrip line={chain({ live: true })} />);
        expect(document.querySelector('[role="status"]')!.textContent).toBe('');
    });

    it('says nothing at rest', () => {
        view(<NarrationStrip line={REST} />);
        expect(document.querySelector('[role="status"]')!.textContent).toBe('');
    });

    it('is the only thing announced — the chips are not read twice', () => {
        view(<NarrationStrip line={chain()} />);
        expect(document.querySelector('[data-kind] > div')!.getAttribute('aria-hidden')).toBe('true');
    });
});

describe('the controls', () => {
    it('offers undo on a settled chain, and calls back', async () => {
        const onUndo = vi.fn();
        view(<NarrationStrip line={chain()} onUndo={onUndo} />);

        await userEvent.click(screen.getByRole('button', { name: 'undo' }));
        expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('offers no undo at rest or mid-gesture', () => {
        const { unmount } = view(<NarrationStrip line={REST} onUndo={() => { }} />);
        expect(screen.queryByRole('button', { name: 'undo' })).toBeNull();
        unmount();

        view(<NarrationStrip line={chain({ live: true })} onUndo={() => { }} />);
        expect(screen.queryByRole('button', { name: 'undo' })).toBeNull();
    });

    it('hands "why?" the calc the chain named', async () => {
        const onWhy = vi.fn();
        view(<NarrationStrip line={chain()} onWhy={onWhy} />);

        await userEvent.click(screen.getByRole('button', { name: 'why?' }));
        expect(onWhy).toHaveBeenCalledWith('Pe');
    });

    it('offers no "why?" when there is nowhere for it to go', () => {
        // The destination is the maths instrument (P9). Until it exists the app
        // passes no handler, and a control that opens nothing must not appear.
        view(<NarrationStrip line={chain()} />);
        expect(screen.queryByRole('button', { name: 'why?' })).toBeNull();
    });

    it('gives both controls real button semantics', () => {
        view(<NarrationStrip line={chain()} onUndo={() => { }} onWhy={() => { }} />);

        // Not divs with click handlers: Enter, Space and focus order come with
        // the element rather than having to be re-implemented and re-tested.
        expect(screen.getByRole('button', { name: 'undo' }).tagName).toBe('BUTTON');
        expect(screen.getByRole('button', { name: 'why?' }).tagName).toBe('BUTTON');
    });
});

/**
 * Three things want the one line, and only one of them can have it (P12).
 *
 * The order is newest-and-most-surprising first: a refusal, then a lesson's
 * sentence, then the chain. A refusal outranks even a step's sentence because a
 * curve that stopped dead has already raised the question it answers — but only
 * the eye is rationed. A screen reader gets the refusal *and* the chain, by the
 * same argument that already gives it an authored sentence and the chain: the
 * sighted student watched the diagram refuse, and there is nothing to watch if
 * you cannot see it.
 */
describe('a refusal on the strip', () => {
    const REFUSAL = 'a will not go above 28.0.';

    it('takes the line from the chain', () => {
        view(<NarrationStrip line={chain()} refusal={REFUSAL} />);

        expect(visibleChain()).toBe(REFUSAL);
        expect(visibleChain()).not.toContain('20.0');
    });

    it('takes the line from a lesson\'s sentence too', () => {
        view(<NarrationStrip line={REST} authored="Incomes rise." refusal={REFUSAL} />);

        expect(visibleChain()).toBe(REFUSAL);
        expect(document.querySelector('[data-refusal]')).toBeTruthy();
        // The strip stops calling itself authored, so nothing keys off both.
        expect(document.querySelector('[data-kind]')!.getAttribute('data-authored')).toBeNull();
    });

    it('announces the refusal and the chain, in that order', () => {
        view(<NarrationStrip line={chain()} refusal={REFUSAL} />);

        const said = screen.getByRole('status').textContent!;
        expect(said.startsWith(REFUSAL)).toBe(true);
        expect(said).toContain('P*');
    });

    it('leaves undo reachable, since the move that was refused may still be undone', () => {
        view(<NarrationStrip line={chain()} refusal={REFUSAL} onUndo={vi.fn()} />);
        expect(screen.getByRole('button', { name: 'undo' })).toBeTruthy();
    });
});

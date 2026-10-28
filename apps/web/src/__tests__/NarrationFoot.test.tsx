import { describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import type { ReactElement } from 'react';
import { NarrationFoot, NarrationPrinted } from '../NarrationFoot';
import { NarrationStrip } from '../NarrationStrip';
import { narrate } from '../narration/narrate';
import type { NarrateInput, NarrationLine, Snapshot } from '../narration/narrate';
import { theme } from '../theme';

/**
 * "What changed" as a component: the chain's two ends at the foot of the
 * card, the whole chain a press away in the order it happened, in the lesson's
 * words where it has them; controls that exist only when they lead somewhere;
 * and one sentence for a screen reader — the same one the strip says, since
 * the two stand in for each other.
 *
 * Lines are built by `narrate`, as the strip's tests build theirs, so these
 * cannot drift from what the screen will hand the foot.
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

const foot = () => screen.getByRole('region', { name: 'What changed' });
const part = (name: string) => foot().querySelector(`[data-part="${name}"]`);
const announced = () => foot().querySelector('[role="status"]')!.textContent;

const seeAll = () => screen.getByRole('button', { name: /^See / });
const showLess = () => screen.getByRole('button', { name: /^Show less/ });
const sheet = () => document.getElementById(showLess().getAttribute('aria-controls')!)!;
const inSheet = (name: string) => sheet().querySelector(`[data-part="${name}"]`);

/** The foot with its sheet up, as a press on "See all" leaves it. */
const opened = async (ui: ReactElement) => {
    const result = view(ui);
    await userEvent.setup().click(seeAll());
    return result;
};

/**
 * The sheet's way back down, which a test's DOM has no animations to play:
 * a stand-in on the sheet while it goes, that lands when `land` is called.
 * Returns the way to take the stand-in away again.
 */
const goingDown = () => {
    let land!: () => void;
    const finished = new Promise<void>(resolve => { land = resolve; });
    const had = Object.getOwnPropertyDescriptor(Element.prototype, 'getAnimations');
    Object.defineProperty(Element.prototype, 'getAnimations', {
        configurable: true,
        value(this: Element) {
            return this.matches('[data-closing] > [data-sheet]') ? [{ finished } as unknown as Animation] : [];
        }
    });
    const restore = () => {
        if (had) Object.defineProperty(Element.prototype, 'getAnimations', had);
        else Reflect.deleteProperty(Element.prototype, 'getAnimations');
    };
    return { land: () => act(async () => { land(); await finished; }), restore };
};

const sheetDrawn = () => foot().querySelector('[data-sheet]');

describe('the foot', () => {
    it('says the chain\'s two ends: what moved, and what followed first', () => {
        view(<NarrationFoot line={chain()} />);

        const parts = [...foot().querySelectorAll('[data-part]')].map(p => p.getAttribute('data-part'));
        expect(parts).toEqual(['cause', 'effect']);
        expect(part('effect')!.children).toHaveLength(1);
    });

    // The cause's numbers are the slider's own, and the effect's are what the
    // student moved something to see.
    it('says the cause in words, and what followed with its numbers', () => {
        view(<NarrationFoot line={chain()} />);

        expect(part('cause')!.textContent).toBe('Demand increases');
        expect(part('effect')!.textContent).toBe('The price rises$11.0→$13.0');
    });

    it('keeps the cause\'s number where it has no words to say instead', () => {
        view(<NarrationFoot line={chain({ live: true })} />);

        expect(part('cause')!.textContent).toBe('a24.0');
        expect(part('effect')!.textContent).toBe('P*$13.0');
    });

    it('offers the whole chain, counting what it says', () => {
        view(<NarrationFoot line={chain()} />);
        expect(seeAll().textContent).toBe('See all 4 changes');
        expect(seeAll().getAttribute('aria-expanded')).toBe('false');
    });

    it('offers the numbers where the ends are all there is', () => {
        view(<NarrationFoot line={narrate({
            before: market(20), after: market(24), params: PARAMS, calcs: CALCS.slice(0, 1)
        })} />);
        expect(seeAll().textContent).toBe('See the numbers');
    });

    it('offers nothing more at rest or mid-gesture', () => {
        const { unmount } = view(<NarrationFoot line={REST} />);
        expect(screen.queryByRole('button', { name: /^See / })).toBeNull();
        unmount();

        view(<NarrationFoot line={chain({ live: true })} />);
        expect(screen.queryByRole('button', { name: /^See / })).toBeNull();
    });

    it('shows the rest hint when nothing has moved', () => {
        view(<NarrationFoot line={REST} restHint="Drag something." />);
        expect(screen.getByText('Drag something.')).toBeDefined();
        expect(foot().getAttribute('data-kind')).toBe('rest');
    });

    // After a move made all at once the rest of the chain comes in turn; a
    // drag has already unfolded under the student's hand.
    it('has what followed come in turn after a move made at once, and not after a drag', () => {
        const { rerender } = view(<NarrationFoot line={REST} />);
        const again = (line: NarrationLine) =>
            rerender(<MantineProvider theme={theme} env="test"><NarrationFoot line={line} /></MantineProvider>);
        const arriving = () => foot().querySelector('ol')!.getAttribute('data-arrive');

        again(chain());
        expect(arriving()).toBe('true');

        again(chain({ live: true }));
        again(chain());
        expect(arriving()).toBeNull();
    });
});

describe('the whole chain', () => {
    it('opens over the card, and "Show less" takes it down', async () => {
        await opened(<NarrationFoot line={chain()} />);

        expect(foot().getAttribute('data-open')).toBe('true');
        expect(showLess().getAttribute('aria-expanded')).toBe('true');

        await userEvent.setup().click(showLess());
        expect(foot().getAttribute('data-open')).toBeNull();
        expect(screen.queryByRole('button', { name: /^Show less/ })).toBeNull();
    });

    // Where it moves, it slides back into the foot before it goes: still
    // drawn, and out of reach, with the card's words back and focus on "See
    // all" as it starts down.
    it('slides back down into the foot before it goes, out of reach', async () => {
        const { land, restore } = goingDown();
        try {
            await opened(<NarrationFoot line={chain()} />);
            await userEvent.setup().click(showLess());

            expect(foot().getAttribute('data-open')).toBeNull();
            expect(foot().getAttribute('data-closing')).toBe('true');
            expect(sheetDrawn()!.hasAttribute('inert')).toBe(true);
            expect(screen.queryByRole('button', { name: /^Show less/ })).toBeNull();
            expect(document.activeElement).toBe(seeAll());

            await land();
            expect(sheetDrawn()).toBeNull();
        } finally {
            restore();
        }
    });

    it('comes back up if "See all" is pressed on its way down', async () => {
        const { land, restore } = goingDown();
        try {
            await opened(<NarrationFoot line={chain()} />);
            await userEvent.setup().click(showLess());
            await userEvent.setup().click(seeAll());

            expect(foot().getAttribute('data-open')).toBe('true');
            expect(foot().getAttribute('data-closing')).toBeNull();

            // The way down it was on lands, and the sheet stays up.
            await land();
            expect(sheetDrawn()).not.toBeNull();
            expect(showLess().getAttribute('aria-expanded')).toBe('true');
        } finally {
            restore();
        }
    });

    // The two are in the same place, so a keyboard keeps its place too.
    it('hands focus from "See all" to "Show less" and back', async () => {
        await opened(<NarrationFoot line={chain()} />);
        expect(document.activeElement).toBe(showLess());

        await userEvent.setup().click(showLess());
        expect(document.activeElement).toBe(seeAll());
    });

    it('goes down on Escape', async () => {
        await opened(<NarrationFoot line={chain()} />);
        await userEvent.setup().keyboard('{Escape}');
        expect(foot().getAttribute('data-open')).toBeNull();
    });

    it('goes down when the student moves on to another place', async () => {
        const { rerender } = await opened(<NarrationFoot line={chain()} place={1} />);
        rerender(<MantineProvider theme={theme} env="test"><NarrationFoot line={chain()} place={2} /></MantineProvider>);
        expect(foot().getAttribute('data-open')).toBeNull();
    });

    // A drag on the diagram goes through rest as it starts, then readings,
    // then a chain. A student who opened the sheet is reading what the next
    // move does, so it stays up through all of it and says each.
    it('stays up through a drag on the diagram, and says each part of it', async () => {
        const { rerender } = await opened(<NarrationFoot line={chain()} restHint="Drag something." />);
        const again = (line: NarrationLine) => rerender(
            <MantineProvider theme={theme} env="test"><NarrationFoot line={line} restHint="Drag something." /></MantineProvider>
        );

        again(REST);
        expect(foot().getAttribute('data-open')).toBe('true');
        expect(sheet().textContent).toContain('Drag something.');

        again(chain({ live: true }));
        expect(foot().getAttribute('data-open')).toBe('true');
        expect(inSheet('cause')!.textContent).toBe('a24.0');

        again(chain());
        expect(foot().getAttribute('data-open')).toBe('true');
        expect(inSheet('movement')!.textContent).toBe('demand shifts up');
    });

    it('stays up after Undo, and says what it is waiting for', async () => {
        const onUndo = vi.fn();
        const { rerender } = await opened(<NarrationFoot line={chain()} onUndo={onUndo} restHint="Drag something." />);
        await userEvent.setup().click(screen.getByRole('button', { name: 'Undo' }));
        expect(onUndo).toHaveBeenCalledTimes(1);

        rerender(<MantineProvider theme={theme} env="test"><NarrationFoot line={REST} restHint="Drag something." /></MantineProvider>);
        expect(foot().getAttribute('data-open')).toBe('true');
        expect(sheet().textContent).toContain('Drag something.');
    });

    // With no "See all" to come back to, focus goes to the foot rather than
    // to nowhere.
    it('hands focus to the foot when it goes down at rest', async () => {
        const { rerender } = await opened(<NarrationFoot line={chain()} />);
        rerender(<MantineProvider theme={theme} env="test"><NarrationFoot line={REST} /></MantineProvider>);
        await userEvent.setup().click(showLess());
        expect(foot().getAttribute('data-open')).toBeNull();
        expect(document.activeElement).toBe(foot());
    });

    it('reads top to bottom in the order it happened: what moved, the curves, what followed', async () => {
        await opened(<NarrationFoot line={chain()} />);

        const parts = [...sheet().querySelectorAll('[data-part]')].map(p => p.getAttribute('data-part'));
        expect(parts).toEqual(['cause', 'movement', 'effect']);
    });

    it('says each clause in the lesson\'s words, with its numbers', async () => {
        await opened(<NarrationFoot line={chain()} />);

        expect(inSheet('cause')!.textContent).toBe('Demand increases20.0→24.0');
        expect(inSheet('movement')!.textContent).toBe('demand shifts up');
        expect(inSheet('effect')!.textContent).toBe('The price rises$11.0→$13.0Q*9.0→11.0');
    });

    // Words are optional: a clause without them is called what it is called,
    // so a lesson that has written none reads as the strip always has.
    it('falls back to the label where the lesson has no words', async () => {
        await opened(<NarrationFoot line={chain()} />);
        expect(inSheet('effect')!.lastElementChild!.textContent).toBe('Q*9.0→11.0');
    });

    it('lists what moved one object to a line', async () => {
        const line = narrate({
            before: market(20), after: market(24), params: PARAMS, calcs: CALCS,
            affected: [
                { name: 'd', title: 'demand', movement: { kind: 'shift', dx: 0, dy: 4, axis: 'y', sign: 1 } },
                { name: 's', title: 'supply', movement: { kind: 'shift', dx: 0, dy: 1, axis: 'y', sign: 1 } }
            ]
        });
        await opened(<NarrationFoot line={line} />);

        expect([...inSheet('movement')!.children].map(row => row.textContent))
            .toEqual(['demand shifts up', 'supply shifts up']);
    });

    it('leaves out a part it does not have, rather than a marker with nothing beside it', async () => {
        await opened(<NarrationFoot line={narrate({ before: market(20), after: market(24), params: PARAMS, calcs: CALCS })} />);
        expect(inSheet('movement')).toBeNull();
    });

    // Opening it is the same news, so it does not come in again.
    it('does not come in turn again for being opened', async () => {
        const { rerender } = view(<NarrationFoot line={REST} />);
        rerender(<MantineProvider theme={theme} env="test"><NarrationFoot line={chain()} /></MantineProvider>);
        await userEvent.setup().click(seeAll());
        expect(sheet().querySelector('ol')!.getAttribute('data-arrive')).toBeNull();
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
    const curveOf = (el: Element | null) => (el as HTMLElement).style.getPropertyValue('--curve');

    it('draws what moved, and the curves it moved, in their colour', async () => {
        await opened(<NarrationFoot line={coloured()} />);
        expect(curveOf(part('cause'))).toBe(BLUE);
        expect(curveOf(inSheet('cause'))).toBe(BLUE);
        expect(curveOf(inSheet('movement'))).toBe(BLUE);
    });

    it('leaves what followed in its own', () => {
        view(<NarrationFoot line={coloured()} />);
        expect(curveOf(part('effect'))).toBe('');
    });

    it('keeps the colour mid-gesture, so letting go does not repaint it', () => {
        view(<NarrationFoot line={coloured({ live: true })} />);
        expect(curveOf(part('cause'))).toBe(BLUE);
    });

    it('keeps today\'s grey where the lesson names no colour', () => {
        view(<NarrationFoot line={chain()} />);
        expect(curveOf(part('cause'))).toBe('');
    });

    // Demand and supply together: one marker cannot be both, and either one
    // would tie the other cause to the wrong curve.
    it('keeps today\'s grey where the causes are curves of two colours', async () => {
        const line = narrate({
            before: { params: { a: 20, c: 2 }, calcs: { Pe: 11 } },
            after: { params: { a: 24, c: 4 }, calcs: { Pe: 14 } },
            params: [...blue, { name: 'c', label: 'c', precision: 1, color: ORANGE }],
            calcs: CALCS
        });
        await opened(<NarrationFoot line={line} />);
        expect(part('cause')!.children).toHaveLength(1);
        expect(inSheet('cause')!.children).toHaveLength(2);
        expect(curveOf(inSheet('cause'))).toBe('');
    });
});

describe('the live region', () => {
    it('announces the settled chain once, as one polite sentence in the lesson\'s words', () => {
        view(<NarrationFoot line={chain()} />);

        const region = foot().querySelector('[role="status"]')!;
        expect(region.getAttribute('aria-live')).toBe('polite');
        expect(region.getAttribute('aria-atomic')).toBe('true');
        expect(region.textContent).toBe(
            'Demand increases from 20.0 to 24.0; demand shifts up; ' +
            'the price rises from $11.0 to $13.0, Q* from 9.0 to 11.0.'
        );
    });

    it('says nothing during a gesture, or at rest', () => {
        const { unmount } = view(<NarrationFoot line={chain({ live: true })} />);
        expect(announced()).toBe('');
        unmount();

        view(<NarrationFoot line={REST} />);
        expect(announced()).toBe('');
    });

    // The rows are read once, as the sentence: element by element they would
    // be a dozen fragments, and a student hears rubble.
    it('hides the rows from assistive technology, since the sentence says them', async () => {
        await opened(<NarrationFoot line={chain()} />);
        const chains = [...foot().querySelectorAll('[data-chain]')];
        expect(chains).toHaveLength(2);
        chains.forEach(c => expect(c.getAttribute('aria-hidden')).toBe('true'));
    });

    // Either can be on screen, at different widths, for the same event.
    it('says what the strip says for the same event', () => {
        const refusal = 'At these costs nothing would trade.';
        const { unmount } = view(<NarrationStrip line={chain()} refusal={refusal} />);
        const strip = document.querySelector('[role="status"]')!.textContent;
        unmount();

        view(<NarrationFoot line={chain()} refusal={refusal} />);
        expect(announced()).toBe(strip);
    });
});

describe('the controls', () => {
    it('offers undo on a settled chain, in the foot\'s head, and calls back', async () => {
        const onUndo = vi.fn();
        view(<NarrationFoot line={chain()} onUndo={onUndo} />);

        await userEvent.setup().click(screen.getByRole('button', { name: 'Undo' }));
        expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('offers no undo at rest or mid-gesture', () => {
        const { unmount } = view(<NarrationFoot line={REST} onUndo={vi.fn()} />);
        expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
        unmount();

        view(<NarrationFoot line={chain({ live: true })} onUndo={vi.fn()} />);
        expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    });

    it('hands "why?" the calc the chain ranks first, from the whole chain', async () => {
        const onWhy = vi.fn();
        view(<NarrationFoot line={chain()} onWhy={onWhy} />);
        expect(screen.queryByRole('button', { name: /^Why\?/ })).toBeNull();

        const user = userEvent.setup();
        await user.click(seeAll());
        await user.click(screen.getByRole('button', { name: /^Why\?/ }));
        expect(onWhy).toHaveBeenCalledWith('Pe');
    });

    it('offers no "why?" when there is nowhere for it to go', async () => {
        await opened(<NarrationFoot line={chain()} />);
        expect(screen.queryByRole('button', { name: /^Why\?/ })).toBeNull();
    });
});

describe('a refusal', () => {
    const refusal = 'At these costs nothing would trade.';

    // The foot has a few lines, so the newer news takes the chain's place
    // there, and the chain is a press away.
    it('takes the chain\'s place on the foot, which still offers it', () => {
        view(<NarrationFoot line={chain()} refusal={refusal} />);

        expect(foot().getAttribute('data-refusal')).toBe('true');
        expect(screen.getByText(refusal)).toBeDefined();
        expect(part('cause')).toBeNull();
        expect(seeAll()).toBeDefined();
    });

    // The sheet has room for both, and the chain still describes the last move
    // that landed.
    it('is said above the whole chain, and the chain stays', async () => {
        await opened(<NarrationFoot line={chain()} refusal={refusal} />);

        expect(sheet().textContent).toContain(refusal);
        expect(inSheet('cause')!.textContent).toBe('Demand increases20.0→24.0');
    });

    it('takes the place of the rest hint when nothing moved at all', () => {
        view(<NarrationFoot line={REST} refusal={refusal} restHint="Drag something." />);
        expect(screen.queryByText('Drag something.')).toBeNull();
        expect(announced()).toBe(refusal);
    });
});

describe('on paper', () => {
    it('is the whole chain, with nothing to press or hear', () => {
        view(<NarrationPrinted line={chain()} />);

        const printed = document.querySelector('[aria-hidden="true"]')!;
        const parts = [...printed.querySelectorAll('[data-part]')].map(p => p.getAttribute('data-part'));
        expect(parts).toEqual(['cause', 'movement', 'effect']);
        expect(printed.querySelector('button')).toBeNull();
    });

    it('is left off at rest and mid-gesture', () => {
        const { container, unmount } = view(<NarrationPrinted line={REST} />);
        expect(container.querySelector('[data-part]')).toBeNull();
        unmount();

        const live = view(<NarrationPrinted line={chain({ live: true })} />);
        expect(live.container.querySelector('[data-part]')).toBeNull();
    });
});

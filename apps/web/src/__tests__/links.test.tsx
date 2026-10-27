import { describe, it, expect, beforeAll, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { App } from '../App';
import { LESSONS } from '../lessons';
import { LINK_KEYS, readLink, writeLink } from '../links';
import { theme } from '../theme';

/**
 * Links: the address follows the view, and a pasted address opens it.
 *
 * The whole app, because the address is the shell's, on the shipped market
 * lesson with a real engine underneath: a link's claims are about where the
 * curves are when it opens, and about what it never carries — an answer.
 */

/** jsdom performs no layout, so the stage would measure 0x0 and mount nothing. */
beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {
        get() { return 1200 }, configurable: true
    });
    Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
        get() { return 800 }, configurable: true
    });
});

/** Open the app at an address, as pasting it would. */
const open = (search = '') => {
    window.history.replaceState(null, '', '/' + search);
    return render(<MantineProvider theme={theme} env="test"><App /></MantineProvider>);
};

const address = () => window.location.search;
/** The address, once the screen has written it: writes are paced, so a second can wait a moment. */
const settles = (search: string) => waitFor(() => expect(address()).toBe(search));
/** Longer than a write is ever held back. */
const pause = () => act(() => new Promise(resolve => setTimeout(resolve, 500)));

const marker = (position: number) =>
    within(screen.getByRole('group', { name: 'Lesson steps' })).getAllByRole('button')[position - 1];
const reset = () => screen.getByRole('button', { name: 'Reset' });
const marketCaption = () =>
    document.querySelector('[data-testid="stage-chrome"] [data-panel="market"]')!.textContent || '';
const changed = () => screen.getByRole('region', { name: 'What changed' });
const trySlider = () =>
    within(screen.getByRole('group', { name: 'Try it' })).getByRole('slider', { name: 'Demand' });

/** "Incomes rise": the step that moves demand up, a = 26. */
const MOVES = 5;
/** "What sellers earn": the step that hands the student demand to try. */
const TRIES = 6;
/** "Back to the start", with all three panels on screen. */
const ALL_THREE = 7;
/** The question: "move demand to where it belongs", from a = 20. */
const ASK = 8;

describe('The address follows the view', () => {

    it('is the lesson alone at its start', async () => {
        open();
        await settles('?lesson=market');
    });

    it('follows the lesson, replacing rather than pushing', async () => {
        const user = userEvent.setup();
        open('?lesson=market');
        const entries = window.history.length;

        await user.click(marker(MOVES));

        // The step put demand at 26, so there is nothing else to say.
        await settles('?lesson=market&step=5');
        expect(window.history.length).toBe(entries);
    });

    it('names a param once the student has moved it off where the lesson puts it', async () => {
        const user = userEvent.setup();
        open('?lesson=market');
        await user.click(marker(TRIES));
        trySlider().focus();
        fireEvent.keyDown(trySlider(), { key: 'End' });
        await settles('?lesson=market&step=6&a=28');

        await user.click(reset());
        await settles('?lesson=market&step=6');
    });

    it('names the open instrument rather than the step', async () => {
        const user = userEvent.setup();
        open('?lesson=market');
        await user.click(marker(MOVES));
        await user.click(screen.getByRole('tab', { name: 'Scenarios' }));

        // Measured from the diagram's own market, which is what an
        // instrument opened at the start would be handed.
        await settles('?lesson=market&tab=scenarios&a=26');
    });

    it('names the arrangement, and the panel brought to the front', async () => {
        const user = userEvent.setup();
        open('?lesson=market');
        await user.click(marker(ALL_THREE));
        await user.click(screen.getByRole('button', { name: 'Show Revenue' }));
        await settles('?lesson=market&step=7&focus=revenue');

        await user.click(screen.getByRole('button', { name: 'Switch to Grid' }));
        await settles('?lesson=market&step=7&arrange=grid&focus=revenue');
    });

    // A held arrow key commits on every repeat. Each is written, but no
    // faster than the browser will take them, and the last one always lands.
    it('keeps up with a held key without writing every press', async () => {
        const user = userEvent.setup();
        open('?lesson=market');
        await user.click(marker(TRIES));
        await settles('?lesson=market&step=6');
        const replace = window.history.replaceState.bind(window.history), written: number[] = [];
        vi.spyOn(window.history, 'replaceState').mockImplementation((state, unused, url) => {
            written.push(Date.now());
            replace(state, unused, url);
        });

        trySlider().focus();
        for (let press = 0; press < 10; press++) fireEvent.keyDown(trySlider(), { key: 'ArrowRight' });

        await settles('?lesson=market&step=6&a=27');
        expect(written.length).toBeLessThan(10);
        // A third of a second apart at least, however long the presses took.
        written.slice(1).forEach((at, i) => expect(at - written[i]).toBeGreaterThanOrEqual(340));
    });

    it('pushes a lesson change, and Back opens the last lesson where it was left', async () => {
        const user = userEvent.setup();
        open('?lesson=market');
        await user.click(marker(TRIES));
        trySlider().focus();
        fireEvent.keyDown(trySlider(), { key: 'End' });
        await settles('?lesson=market&step=6&a=28');
        const entries = window.history.length;

        // The rail is out of the accessibility tree in jsdom, which matches no
        // media query and so has it collapsed as on a phone.
        await user.click(screen.getByRole('button', { name: 'Lessons', hidden: true }));
        await user.click(screen.getByRole('button', { name: /International economics/, hidden: true }));
        await user.click(screen.getByRole('link', { name: 'Exchange rates (AUD)', hidden: true }));
        expect(address()).toBe('?lesson=fx');
        expect(window.history.length).toBe(entries + 1);

        act(() => window.history.back());

        await screen.findByRole('heading', { name: 'A market, and what it does to everything else' });
        // The caption reads the engine, which draws a beat after the heading is up.
        await waitFor(() => expect(marketCaption()).toContain('Price $15.00'));
        expect(screen.getByRole('group', { name: 'Try it' })).toBeTruthy();
    });
});

describe('A pasted link', () => {

    it('opens at its step and market, with nothing drawn or said for a move nobody made', async () => {
        const user = userEvent.setup();
        open('?lesson=market&step=6&a=28');
        await settles('?lesson=market&step=6&a=28');

        expect(trySlider().getAttribute('aria-valuenow')).toBe('28');
        expect(marketCaption()).toContain('Price $15.00');
        // No change chip on the caption, and "What changed" at rest.
        expect(marketCaption()).not.toMatch(/[▲▼]/);
        expect(changed().getAttribute('data-kind')).toBe('rest');

        // The step's own market is a Reset away, as it was for whoever sent it.
        await user.click(reset());
        expect(marketCaption()).toContain('Price $14.00');
    });

    it('opens a question unanswered, with its curve where the lesson puts it', async () => {
        const user = userEvent.setup();
        open('?lesson=market&step=8&a=26');
        await settles('?lesson=market&step=8');

        const answer = screen.getByRole('slider', { name: /Your answer/ });
        expect(answer.getAttribute('aria-valuenow')).toBe('20');
        expect(screen.getByRole('button', { name: 'Check' })).toBeTruthy();

        // And answering it puts nothing in the address.
        answer.focus();
        fireEvent.keyDown(answer, { key: 'End' });
        await user.click(screen.getByRole('button', { name: 'Check' }));
        await pause();
        expect(address()).toBe('?lesson=market&step=8');
    });

    // Past a question is after its answer, and the market there can be it.
    it('to a step past a question opens at the question, as the lesson puts it', async () => {
        open('?lesson=market&step=9&a=26');
        await settles('?lesson=market&step=8');

        expect(marker(ASK).getAttribute('aria-current')).toBe('step');
        expect(screen.getByRole('slider', { name: /Your answer/ }).getAttribute('aria-valuenow')).toBe('20');
        expect(screen.getByRole('button', { name: 'Check' })).toBeTruthy();
    });

    it('opens without a param the lesson does not have, or one that is not the student\'s', async () => {
        open('?lesson=market&step=6&a=28&gone=3&revealed=1&asking=1');
        await settles('?lesson=market&step=6&a=28');

        expect(marketCaption()).toContain('Price $15.00');
        expect(screen.getByRole('group', { name: 'Try it' })).toBeTruthy();
    });

    it('opens at an instrument, with that market as the one it was handed', async () => {
        const user = userEvent.setup();
        open('?lesson=market&tab=scenarios&a=26');
        await settles('?lesson=market&tab=scenarios&a=26');

        expect(screen.getByRole('tab', { name: 'Scenarios' }).getAttribute('aria-selected')).toBe('true');
        expect(marketCaption()).toContain('Price $14.00');
        expect(reset()).toHaveProperty('disabled', true);

        await user.click(screen.getByRole('button', { name: 'Input costs rise' }));
        await user.click(reset());
        expect(marketCaption()).toContain('Price $14.00');
    });

    it('opens in its arrangement, with its panel at the front', async () => {
        const user = userEvent.setup();
        open('?lesson=market&step=7&arrange=grid&focus=revenue');
        await settles('?lesson=market&step=7&arrange=grid&focus=revenue');
        // In the grid, so the toggle offers Focus.
        await user.click(screen.getByRole('button', { name: 'Switch to Focus' }));

        // Revenue is in front, so it is the one panel with no button to bring it there.
        expect(screen.queryByRole('button', { name: 'Show Revenue' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Show Market' })).toBeTruthy();
    });

    it('to a lesson there is not opens the first lesson at its start', async () => {
        open('?lesson=gone&step=6&a=28');
        await settles('?lesson=market');
        expect(screen.getByRole('button', { name: 'Start lesson' })).toBeTruthy();
    });
});

describe('The words of a link', () => {

    it('read back what was written', () => {
        const link = { step: 7, tab: null, arrange: 'grid' as const, focus: 'mirror', params: { supply: 56 } };
        const search = writeLink('fx', link);
        expect(search).toBe('?lesson=fx&step=7&arrange=grid&focus=mirror&supply=56');
        expect(readLink(search)).toEqual(link);
    });

    it('write a value without the dust of getting there', () => {
        expect(writeLink('market', { step: 6, tab: null, arrange: 'focus', focus: null, params: { a: 0.1 * 3 } }))
            .toBe('?lesson=market&step=6&a=0.3');
    });

    it('leave out what is not a number, rather than fail', () => {
        expect(readLink('?lesson=fx&step=two&demand=&supply=lots&rate=Infinity&a=26')).toEqual(
            { step: 0, tab: null, arrange: 'focus', focus: null, params: { a: 26 } }
        );
        expect(readLink('?step=-3').step).toBe(0);
    });

    // A param by one of the address's own names could not be linked at all.
    it('are never a name a lesson gives a param', () => {
        LESSONS.forEach(lesson => {
            const names = (lesson.model.diagram as { params: { name: string; presentation?: boolean }[] }).params
                .filter(p => !p.presentation).map(p => p.name);
            expect(names.filter(name => LINK_KEYS.indexOf(name) > -1), lesson.id).toEqual([]);
        });
    });
});

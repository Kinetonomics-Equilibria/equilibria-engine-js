import { describe, it, expect, beforeAll, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { App } from '../App';
import { MODELS } from '../lessons';
import { LINK_KEYS, readLink, readPlace, writeLink } from '../links';
import { theme } from '../theme';

/**
 * Links: the address follows the page and the view, and a pasted address
 * opens them.
 *
 * The whole app, because the address is the shell's, on the shipped market
 * lesson and its model with a real engine underneath: a link's claims are
 * about where the curves are when it opens, and about what it never carries —
 * an answer.
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

/** Open the app at an address, from the site's root, as pasting it would. */
const open = (address = '') => {
    window.history.replaceState(null, '', '/' + address);
    return render(<MantineProvider theme={theme} env="test"><App /></MantineProvider>);
};

const address = () => window.location.pathname + window.location.search;
/** The address, once the screen has written it: writes are paced, so a second can wait a moment. */
const settles = (expected: string) => waitFor(() => expect(address()).toBe(expected));
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
/** "Over to you", the last step. */
const LAST = 9;

/** The rail is out of the accessibility tree in jsdom, which matches no
 * media query and so has it collapsed as on a phone. */
const rail = (name: string) => screen.getByRole('button', { name, hidden: true });

describe('The address follows the view', () => {

    it('is the lesson\'s path alone at its start', async () => {
        open('lessons/market');
        await settles('/lessons/market');
    });

    it('follows the lesson, replacing rather than pushing', async () => {
        const user = userEvent.setup();
        open('lessons/market');
        const entries = window.history.length;

        await user.click(marker(MOVES));

        // The step put demand at 26, so there is nothing else to say.
        await settles('/lessons/market?step=5');
        expect(window.history.length).toBe(entries);
    });

    it('names a param once the student has moved it off where the lesson puts it', async () => {
        const user = userEvent.setup();
        open('lessons/market');
        await user.click(marker(TRIES));
        trySlider().focus();
        fireEvent.keyDown(trySlider(), { key: 'End' });
        await settles('/lessons/market?step=6&a=28');

        await user.click(reset());
        await settles('/lessons/market?step=6');
    });

    // Measured from the model's own market. The first tab is the one the
    // playground opens on, so it is left out.
    it('names the playground\'s open tab, and each param off where the model puts it', async () => {
        const user = userEvent.setup();
        open('playground/market');
        await settles('/playground/market');

        await user.click(screen.getByRole('tab', { name: 'Scenarios' }));
        await settles('/playground/market?tab=scenarios');
        await user.click(screen.getByRole('button', { name: 'Input costs rise' }));
        await settles('/playground/market?tab=scenarios&c=6');

        await user.click(screen.getByRole('tab', { name: 'Explore' }));
        await settles('/playground/market?c=6');
    });

    it('names the arrangement, and the panel brought to the front', async () => {
        const user = userEvent.setup();
        open('lessons/market');
        await user.click(marker(ALL_THREE));
        await user.click(screen.getByRole('button', { name: 'Show Revenue' }));
        await settles('/lessons/market?step=7&focus=revenue');

        await user.click(screen.getByRole('button', { name: 'Switch to Grid' }));
        await settles('/lessons/market?step=7&arrange=grid&focus=revenue');
    });

    // A held arrow key commits on every repeat. Each is written, but no
    // faster than the browser will take them, and the last one always lands.
    it('keeps up with a held key without writing every press', async () => {
        const user = userEvent.setup();
        open('lessons/market');
        await user.click(marker(TRIES));
        await settles('/lessons/market?step=6');
        const replace = window.history.replaceState.bind(window.history), written: number[] = [];
        vi.spyOn(window.history, 'replaceState').mockImplementation((state, unused, url) => {
            written.push(Date.now());
            replace(state, unused, url);
        });

        trySlider().focus();
        for (let press = 0; press < 10; press++) fireEvent.keyDown(trySlider(), { key: 'ArrowRight' });

        await settles('/lessons/market?step=6&a=27');
        expect(written.length).toBeLessThan(10);
        // A third of a second apart at least, however long the presses took.
        written.slice(1).forEach((at, i) => expect(at - written[i]).toBeGreaterThanOrEqual(340));
    });

    it('pushes a lesson change, and Back opens the last lesson where it was left', async () => {
        const user = userEvent.setup();
        open('lessons/market');
        await user.click(marker(TRIES));
        trySlider().focus();
        fireEvent.keyDown(trySlider(), { key: 'End' });
        await settles('/lessons/market?step=6&a=28');
        const entries = window.history.length;

        await user.click(rail('Lessons'));
        await user.click(screen.getByRole('button', { name: /International economics/, hidden: true }));
        await user.click(screen.getByRole('link', { name: 'Exchange rates (AUD)', hidden: true }));
        expect(address()).toBe('/lessons/fx');
        expect(window.history.length).toBe(entries + 1);

        act(() => window.history.back());

        await screen.findByRole('heading', { name: 'A market, and what it does to everything else' });
        // The caption reads the engine, which draws a beat after the heading is up.
        await waitFor(() => expect(marketCaption()).toContain('Price $15.00'));
        expect(screen.getByRole('group', { name: 'Try it' })).toBeTruthy();
    });

    // The Playground panel lists the models under the lessons' topics, and a
    // model chosen there opens at its start. Pushed, so Back is the lesson.
    it('pushes a model chosen from the Playground panel', async () => {
        const user = userEvent.setup();
        open('lessons/market');
        await settles('/lessons/market');

        await user.click(rail('Playground'));
        await user.click(screen.getByRole('button', { name: /International economics/, hidden: true }));
        await user.click(screen.getByRole('link', { name: 'The market for the Australian dollar', hidden: true }));

        expect(address()).toBe('/playground/aud');
        await screen.findByRole('heading', { name: 'The market for the Australian dollar' });

        act(() => window.history.back());
        await screen.findByRole('heading', { name: 'A market, and what it does to everything else' });
        expect(address()).toBe('/lessons/market');
    });

    // Finish is pushed, as opening any page is, so Back returns to where the
    // lesson ended — with its question still answered, which the lesson's
    // history entry remembers and its link never says.
    it('pushes Finish into the playground, and Back returns to the end with its answer kept', async () => {
        const user = userEvent.setup();
        open('lessons/market');
        await user.click(marker(ASK));
        await user.click(screen.getByRole('button', { name: 'Check' }));
        await user.click(screen.getByRole('button', { name: 'Show me' }));
        await user.click(screen.getByRole('button', { name: 'Next' }));

        await user.click(screen.getByRole('button', { name: 'Finish' }));

        expect(address()).toBe('/playground/market');
        await screen.findByRole('heading', { name: 'A market, its surplus and its revenue' });

        act(() => window.history.back());

        await screen.findByRole('heading', { name: 'A market, and what it does to everything else' });
        expect(address()).toBe('/lessons/market?step=9');
        expect(marker(LAST).getAttribute('aria-current')).toBe('step');
        expect(screen.getByRole('button', { name: 'Finish' })).toBeTruthy();
    });
});

describe('A pasted link', () => {

    it('opens at its step and market, with nothing drawn or said for a move nobody made', async () => {
        const user = userEvent.setup();
        open('lessons/market?step=6&a=28');
        await settles('/lessons/market?step=6&a=28');

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
        open('lessons/market?step=8&a=26');
        await settles('/lessons/market?step=8');

        const answer = screen.getByRole('slider', { name: /Your answer/ });
        expect(answer.getAttribute('aria-valuenow')).toBe('20');
        expect(screen.getByRole('button', { name: 'Check' })).toBeTruthy();

        // And answering it puts nothing in the address.
        answer.focus();
        fireEvent.keyDown(answer, { key: 'End' });
        await user.click(screen.getByRole('button', { name: 'Check' }));
        await pause();
        expect(address()).toBe('/lessons/market?step=8');
    });

    // Past a question is after its answer, and the market there can be it.
    it('to a step past a question opens at the question, as the lesson puts it', async () => {
        open('lessons/market?step=9&a=26');
        await settles('/lessons/market?step=8');

        expect(marker(ASK).getAttribute('aria-current')).toBe('step');
        expect(screen.getByRole('slider', { name: /Your answer/ }).getAttribute('aria-valuenow')).toBe('20');
        expect(screen.getByRole('button', { name: 'Check' })).toBeTruthy();
    });

    it('opens without a param the lesson does not have, or one that is not the student\'s', async () => {
        open('lessons/market?step=6&a=28&gone=3&revealed=1&asking=1');
        await settles('/lessons/market?step=6&a=28');

        expect(marketCaption()).toContain('Price $15.00');
        expect(screen.getByRole('group', { name: 'Try it' })).toBeTruthy();
    });

    it('opens the playground at its tab, with that market as the one it was handed', async () => {
        const user = userEvent.setup();
        open('playground/market?tab=scenarios&a=26');
        await settles('/playground/market?tab=scenarios&a=26');

        expect(screen.getByRole('tab', { name: 'Scenarios' }).getAttribute('aria-selected')).toBe('true');
        expect(marketCaption()).toContain('Price $14.00');
        expect(reset()).toHaveProperty('disabled', true);

        await user.click(screen.getByRole('button', { name: 'Input costs rise' }));
        await user.click(reset());
        expect(marketCaption()).toContain('Price $14.00');
    });

    it('opens in its arrangement, with its panel at the front', async () => {
        const user = userEvent.setup();
        open('lessons/market?step=7&arrange=grid&focus=revenue');
        await settles('/lessons/market?step=7&arrange=grid&focus=revenue');
        // In the grid, so the toggle offers Focus.
        await user.click(screen.getByRole('button', { name: 'Switch to Focus' }));

        // Revenue is in front, so it is the one panel with no button to bring it there.
        expect(screen.queryByRole('button', { name: 'Show Revenue' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Show Market' })).toBeTruthy();
    });

    // The first in the course: the economic problem's.
    it('to a lesson there is not opens the first lesson at its start', async () => {
        open('lessons/gone?step=6&a=28');
        await settles('/lessons/ppc');
        expect(screen.getByRole('button', { name: 'Start lesson' })).toBeTruthy();
    });

    it('to a model there is not opens the first model at its start', async () => {
        open('playground/gone?tab=maths&a=26');
        await settles('/playground/cafe');
        expect(screen.getByRole('heading', { name: 'Toasties and coffees at a café' })).toBeTruthy();
        expect(screen.getByRole('tab', { name: 'Explore' }).getAttribute('aria-selected')).toBe('true');
    });
});

/** Links handed out last term, before the pages, still open what they opened. */
describe('A link from before the pages', () => {

    it('opens the lesson at its step and market, at its path', async () => {
        open('?lesson=market&step=6&a=28');
        await settles('/lessons/market?step=6&a=28');
        expect(trySlider().getAttribute('aria-valuenow')).toBe('28');
    });

    it('opens the playground at the lesson\'s model where it named a tab', async () => {
        open('?lesson=market&tab=scenarios&a=26');
        await settles('/playground/market?tab=scenarios&a=26');
        expect(screen.getByRole('tab', { name: 'Scenarios' }).getAttribute('aria-selected')).toBe('true');
        expect(marketCaption()).toContain('Price $14.00');
    });

    it('opens the first lesson at its start where its lesson has gone', async () => {
        open('?lesson=gone&tab=scenarios&a=26');
        await settles('/lessons/ppc');
    });
});

describe('The words of a link', () => {

    /** The view a written address names, read back. */
    const viewOf = (written: string) => readLink(new URL(written, 'https://example.org/').search);

    it('read back what was written', () => {
        const link = { step: 7, tab: null, arrange: 'grid' as const, focus: 'mirror', params: { supply: 56 } };
        const written = writeLink({ kind: 'lesson', id: 'fx' }, link);
        expect(written).toBe('lessons/fx?step=7&arrange=grid&focus=mirror&supply=56');
        expect(viewOf(written)).toEqual(link);
    });

    it('put a model under the playground, with its tab', () => {
        const link = { step: 0, tab: 'maths', arrange: 'focus' as const, focus: null, params: { supply: 56 } };
        const written = writeLink({ kind: 'playground', id: 'aud' }, link);
        expect(written).toBe('playground/aud?tab=maths&supply=56');
        expect(viewOf(written)).toEqual(link);
    });

    it('are the path alone at a page\'s start', () => {
        expect(writeLink({ kind: 'lesson', id: 'fx' })).toBe('lessons/fx');
        expect(writeLink({ kind: 'playground', id: 'aud' })).toBe('playground/aud');
    });

    it('write a value without the dust of getting there', () => {
        expect(writeLink({ kind: 'lesson', id: 'market' },
            { step: 6, tab: null, arrange: 'focus', focus: null, params: { a: 0.1 * 3 } }))
            .toBe('lessons/market?step=6&a=0.3');
    });

    it('leave out what is not a number, rather than fail', () => {
        expect(readLink('?lesson=fx&step=two&demand=&supply=lots&rate=Infinity&a=26')).toEqual(
            { step: 0, tab: null, arrange: 'focus', focus: null, params: { a: 26 } }
        );
        expect(readLink('?step=-3').step).toBe(0);
    });

    it('name a page by its path under the app\'s root, and an old one by its query', () => {
        const at = (pathname: string, search = '', root = '/') => readPlace({ pathname, search }, root);
        expect(at('/lessons/fx')).toEqual({ place: { kind: 'lesson', id: 'fx' }, old: false });
        expect(at('/playground/aud', '?tab=maths')).toEqual({ place: { kind: 'playground', id: 'aud' }, old: false });
        expect(at('/app/lessons/fx', '', '/app/')).toEqual({ place: { kind: 'lesson', id: 'fx' }, old: false });
        expect(at('/', '?lesson=fx&step=7')).toEqual({ place: { kind: 'lesson', id: 'fx' }, old: true });
        expect(at('/')).toBeNull();
        expect(at('/elsewhere/fx')).toBeNull();
        expect(at('/lessons/')).toBeNull();
        // A path that is not a percent-encoding is read as it stands.
        expect(at('/lessons/%E0%A4%A')).toEqual({ place: { kind: 'lesson', id: '%E0%A4%A' }, old: false });
    });

    // A param by one of the address's own names could not be linked at all.
    it('are never a name a model gives a param', () => {
        MODELS.forEach(model => {
            const names = (model.diagram as { params: { name: string; presentation?: boolean }[] }).params
                .filter(p => !p.presentation).map(p => p.name);
            expect(names.filter(name => LINK_KEYS.indexOf(name) > -1), model.id).toEqual([]);
        });
    });
});

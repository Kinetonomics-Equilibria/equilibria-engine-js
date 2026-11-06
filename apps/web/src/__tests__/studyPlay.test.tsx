import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { PLAY_MS, StudyScreen } from '../StudyScreen';
import { SHORTAGES_AND_SURPLUSES, SHORTAGE_LESSON } from '../lessons/shortage-surplus';
import { theme } from '../theme';

/**
 * A step's move, played.
 *
 * Whichever way a student arrives at a step, the diagram starts where the
 * lesson had it at the step before, that is where the ghost is, and the
 * step's move glides from there to where the step puts it. Next is a play
 * button for what the step's words say happens. "What changed" tells the
 * move once it has landed, and a question is asked from there.
 *
 * Every other test of the study screen reads a step where it lands, under
 * the reduced motion the setup reports. These ask for motion, since motion
 * is what they are about.
 */

beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {
        get() { return 1200 }, configurable: true
    });
    Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
        get() { return 800 }, configurable: true
    });
});

const lessMotion = window.matchMedia;
beforeEach(() => {
    window.matchMedia = ((query: string) => ({
        matches: false, media: query, onchange: null,
        addListener: () => { }, removeListener: () => { },
        addEventListener: () => { }, removeEventListener: () => { },
        dispatchEvent: () => false
    })) as unknown as typeof window.matchMedia;
});
afterEach(() => { window.matchMedia = lessMotion; });

const mount = (content?: typeof SHORTAGES_AND_SURPLUSES) => render(
    <MantineProvider theme={theme} env="test"><StudyScreen {...(content ? { content } : {})} /></MantineProvider>
);

const marker = (position: number) =>
    within(screen.getByRole('group', { name: 'Lesson steps' })).getAllByRole('button')[position - 1];
const next = () => screen.getByRole('button', { name: /^(Next|Start lesson)$/ });
const reset = () => screen.getByRole('button', { name: 'Reset' });
const caption = () =>
    document.querySelector('[data-testid="stage-chrome"] [data-panel="market"]')!.textContent || '';
const changed = () => screen.getByRole('region', { name: 'What changed' });
const chain = () => {
    const all = within(changed()).queryByRole('button', { name: /^See (why|all)/ });
    if (all) fireEvent.click(all);
    return changed().textContent || '';
};

/** Long enough for any move to have landed, the engine's backstop included. */
const LANDED = { timeout: PLAY_MS * 4 };

/** The market lesson. "What buyers gain" moves nothing; "Incomes rise" moves demand, a = 20 to 26. */
const STILL = 4;
const MOVES = 5;
/** "What sellers earn": hands the student demand, and is still about Incomes rise. */
const TRIES = 6;
/** "Back to the start": a = 20 again. */
const BACK = 7;

describe('a step\'s move', () => {

    it('glides from where the lesson had the market, and is told once it lands', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(STILL));
        expect(caption()).toContain('Price $11.00');

        await user.click(next());

        // On its way: not yet where the step puts it, and nothing told yet.
        expect(caption()).not.toContain('Price $14.00');
        expect(changed().getAttribute('data-kind')).not.toBe('settled');
        // Somewhere between the two, and Reset greyed while it is.
        await waitFor(() => expect(caption()).toMatch(/Price \$1[1-3]\.\d\d/), { interval: 10, timeout: PLAY_MS });
        await waitFor(() => expect(caption()).not.toContain('Price $11.00'), { interval: 10, timeout: PLAY_MS });
        if (!caption().includes('Price $14.00')) expect(reset()).toHaveProperty('disabled', true);

        // a = 26 and c = 2: P* = 14.
        await waitFor(() => expect(caption()).toContain('Price $14.00'), LANDED);
        await waitFor(() => expect(changed().getAttribute('data-kind')).toBe('settled'), LANDED);
        expect(chain()).toContain('20.0→26.0');
        expect(reset()).toHaveProperty('disabled', true);
    });

    it('starts from the lesson\'s market, not from where the student left the curve', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(TRIES));
        const demand = within(screen.getByRole('group', { name: 'Try it' })).getByRole('slider', { name: 'Demand' });
        demand.focus();
        fireEvent.keyDown(demand, { key: 'End' });
        expect(caption()).toContain('Price $15.00');

        await user.click(next());

        // From a = 26, where the lesson had it, and never from 28.
        expect(caption()).not.toContain('Price $15.00');
        await waitFor(() => expect(caption()).toContain('Price $11.00'), LANDED);
        await waitFor(() => expect(changed().getAttribute('data-kind')).toBe('settled'), LANDED);
        const told = chain();
        expect(told).toContain('26.0→20.0');
        expect(told).not.toContain('28.0');
    });

    it('lands at once when the student moves on before it has', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(STILL));
        await user.click(next());
        await user.click(next());

        // At "What sellers earn", which moves nothing and is about Incomes
        // rise: there at once, with that move told.
        expect(caption()).toContain('Price $14.00');
        expect(changed().getAttribute('data-kind')).toBe('settled');
        expect(chain()).toContain('20.0→26.0');
    });

    it('plays again when the student goes back to its step', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(MOVES));
        await waitFor(() => expect(caption()).toContain('Price $14.00'), LANDED);
        await user.click(marker(BACK));
        await waitFor(() => expect(caption()).toContain('Price $11.00'), LANDED);

        await user.click(marker(MOVES));

        expect(caption()).not.toContain('Price $14.00');
        await waitFor(() => expect(caption()).toContain('Price $14.00'), LANDED);
        await waitFor(() => expect(changed().getAttribute('data-kind')).toBe('settled'), LANDED);
        expect(chain()).toContain('20.0→26.0');
    });
});

describe('a question after a step\'s move', () => {

    const FIRST_QUESTION = SHORTAGE_LESSON.findIndex(step => !!step.ask) + 1;
    const check = () => screen.queryByRole('button', { name: 'Check' });

    it('is asked once the move has landed, from where the step put the market', async () => {
        const user = userEvent.setup();
        mount(SHORTAGES_AND_SURPLUSES);
        await user.click(marker(FIRST_QUESTION - 1));

        await user.click(next());

        // The stalls open at $4.50, from $3.50 and Christmas demand.
        expect(check()).toBeNull();
        await waitFor(() => expect(check()).not.toBeNull(), LANDED);
        const row = screen.getByRole('group', { name: 'Question' });
        expect(within(row).getByRole('slider', { name: 'The price' }).getAttribute('aria-valuenow')).toBe('4.5');
    });
});

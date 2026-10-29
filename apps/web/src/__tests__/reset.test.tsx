import { describe, it, expect, beforeAll } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { StudyScreen } from '../StudyScreen';
import { SUPPLY_AND_DEMAND } from '../lessons/market';
import { theme } from '../theme';

/**
 * Reset, on the title's line: the diagram back where the step began, or
 * where the playground opened.
 *
 * A move like any other, which is the claim most of these are about: it is
 * reported in "What changed", Undo takes it back, and it moves the market and
 * nothing else — not the lesson's place, and not an answer. The shipped lesson
 * and a real engine underneath, since every claim is about where the curves
 * end up.
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

const mount = () => render(
    <MantineProvider theme={theme} env="test"><StudyScreen /></MantineProvider>
);

const marker = (position: number) =>
    within(screen.getByRole('group', { name: 'Lesson steps' })).getAllByRole('button')[position - 1];
const next = () => screen.getByRole('button', { name: /^(Next|Start lesson)$/ });
const reset = () => screen.getByRole('button', { name: 'Reset' });
const marketCaption = () =>
    document.querySelector('[data-testid="stage-chrome"] [data-panel="market"]')!.textContent || '';
const changed = () => screen.getByRole('region', { name: 'What changed' });
const open = (user: ReturnType<typeof userEvent.setup>, name: string) =>
    user.click(screen.getByRole('tab', { name }));

/** "Incomes rise": the step that moves demand up, a = 26. */
const MOVES = 5;
/** "What sellers earn": the step that hands the student demand to try. */
const TRIES = 6;
/** The question: "move demand to where it belongs". */
const ASK = 8;

describe('Reset', () => {

    it('is on the title\'s line, greyed and not hidden under the cover', () => {
        mount();
        const line = screen.getByRole('heading', { level: 2 }).parentElement!.parentElement!;
        expect(within(line).getByRole('button', { name: 'Reset' })).toBe(reset());
        expect(reset()).toHaveProperty('disabled', true);
    });

    it('is greyed until something has moved', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(next());
        expect(reset()).toHaveProperty('disabled', true);
        await user.click(marker(MOVES));
        expect(reset()).toHaveProperty('disabled', true);
    });

    it('puts the step\'s market back, says so, and Undo brings the student\'s back', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(TRIES));
        const demand = within(screen.getByRole('group', { name: 'Try it' })).getByRole('slider', { name: 'Demand' });
        demand.focus();
        fireEvent.keyDown(demand, { key: 'End' });
        expect(marketCaption()).toContain('Price $15.00');

        await user.click(reset());

        // a = 26 and c = 2, as "Incomes rise" left them: P* = 14.
        expect(marketCaption()).toContain('Price $14.00');
        expect(changed().getAttribute('data-kind')).toBe('settled');
        // The cause's numbers are on the whole chain, a press away.
        await user.click(within(changed()).getByRole('button', { name: /^See all/ }));
        expect(changed().textContent).toContain('28.0→26.0');
        expect(reset()).toHaveProperty('disabled', true);
        // Still the step the student was at.
        expect(screen.getByRole('group', { name: 'Try it' })).toBeTruthy();

        await user.click(within(changed()).getByRole('button', { name: 'Undo' }));
        expect(marketCaption()).toContain('Price $15.00');
        expect(reset()).toHaveProperty('disabled', false);
    });

    // Going back un-draws and leaves the student's values alone, so this is
    // how a step's own market comes back — including a curve no step up to
    // here has set, which goes back where the diagram drew it.
    it('puts back the market of a step scrubbed back to', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(MOVES));
        await user.click(marker(MOVES - 1));
        expect(marketCaption()).toContain('Price $14.00');

        await user.click(reset());

        // a = 20 and c = 2, the diagram's own: P* = 11.
        expect(marketCaption()).toContain('Price $11.00');
    });

    it('puts a question\'s curve back where the question found it, and keeps asking', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(ASK));
        const answer = screen.getByRole('slider', { name: /Your answer/ });
        answer.focus();
        fireEvent.keyDown(answer, { key: 'End' });

        await user.click(reset());

        expect(answer.getAttribute('aria-valuenow')).toBe('20');
        expect(screen.getByRole('button', { name: 'Check' })).toBeTruthy();
    });

    // Not the model's own market: the one the playground was handed, which
    // here is a link's — as a lesson's Finish hands it one — with demand up.
    it('in the playground, puts back the market it opened with', async () => {
        const user = userEvent.setup();
        render(
            <MantineProvider theme={theme} env="test">
                <StudyScreen
                    playground={SUPPLY_AND_DEMAND.model}
                    link={{ step: 0, tab: null, arrange: 'focus', focus: null, params: { a: 26 } }}
                />
            </MantineProvider>
        );
        expect(marketCaption()).toContain('Price $14.00');
        await open(user, 'Scenarios');
        expect(reset()).toHaveProperty('disabled', true);
        await user.click(screen.getByRole('button', { name: 'Input costs rise' }));
        expect(marketCaption()).toContain('Price $16.00');

        await user.click(reset());

        expect(marketCaption()).toContain('Price $14.00');
        expect(reset()).toHaveProperty('disabled', true);
    });
});

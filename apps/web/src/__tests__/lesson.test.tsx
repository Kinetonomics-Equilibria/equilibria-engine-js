import { describe, it, expect, beforeAll } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { StudyScreen } from '../StudyScreen';
import { theme } from '../theme';

/**
 * The shipped lesson, held to what it says.
 *
 * "Back where we started" was false for a while, and nothing could have caught
 * it but a student: the lesson's own steps only ever move demand, so walking
 * through it as written never left supply anywhere but its start. Move supply
 * on the way — the dock offers that at every step — and the sentence went on
 * claiming a baseline the diagram was not at.
 *
 * So these move supply first and then ask the lesson to keep its word, with a
 * real engine underneath: the claim is about the numbers the diagram solves to,
 * and a fixture lesson would only be testing itself.
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

const marker = (position: number) => screen.getAllByRole('button')
    .filter(b => b.hasAttribute('data-kinds'))[position];

/** "Incomes rise": the step that moves demand up. */
const MOVES = 5;
/** "Back where we started". */
const BACK = 7;
/** The question: "move demand to where it belongs". */
const ASK = 8;

/** What the market panel's caption says, name and number. */
const marketCaption = () =>
    document.querySelector('[data-testid="stage-chrome"] [data-panel="market"]')!.textContent || '';

/** Supply up, the way a student would do it from the dock. */
async function inputCostsRise(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('tab', { name: 'Scenarios' }));
    await user.click(screen.getByRole('button', { name: 'Input costs rise' }));
}

/** A param's value, as its Explore slider holds it. */
async function valueOf(user: ReturnType<typeof userEvent.setup>, name: string) {
    await user.click(screen.getByRole('tab', { name: 'Explore' }));
    return Number(screen.getByRole('slider', { name }).getAttribute('aria-valuenow'));
}

describe('where the lesson says the market is', () => {

    it('is back where it started when it says so, supply included', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(MOVES));
        await inputCostsRise(user);

        // a = 26 and c = 6: P* = 16. The caption is the witness a student sees.
        expect(marketCaption()).toContain('P* $16.00');

        await user.click(marker(BACK));

        // a = 20 and c = 2 again: P* = 11. With `a` alone it read 13.00 here.
        expect(marketCaption()).toContain('P* $11.00');
        expect(await valueOf(user, 'c')).toBe(2);
        expect(await valueOf(user, 'a')).toBe(20);
    });

    it('hands the student back the baseline at the end, too', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(ASK));
        // Past the question the shortest way: commit without moving, then ask
        // to be shown, which resolves it.
        await user.click(screen.getByRole('button', { name: 'Check' }));
        await user.click(screen.getByRole('button', { name: 'Show me' }));
        await inputCostsRise(user);
        await user.click(screen.getByLabelText('Next step'));

        expect(marketCaption()).toContain('P* $11.00');
        expect(await valueOf(user, 'c')).toBe(2);
    });
});

describe('the question, after supply has been moved', () => {

    /** Arrive at the question with supply raised on the way. */
    const askAfterMovingSupply = async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(MOVES));
        await inputCostsRise(user);
        await user.click(marker(ASK));
        return user;
    };

    const row = () => screen.getByRole('group', { name: 'Question' });
    const verdict = () => row().querySelector('[role="status"]')!.textContent || '';

    it('starts from the baseline, with supply back where it was', async () => {
        const user = await askAfterMovingSupply();

        expect(marketCaption()).toContain('P* $11.00');
        expect(await valueOf(user, 'c')).toBe(2);
    });

    // The step put `c` back while the screen was arriving at the question. Had
    // that been read as the student's move, the attempt would have begun before
    // they touched anything — and "did not move" is the verdict that says it was
    // not.
    it('does not count the step putting supply back as an attempt', async () => {
        const user = await askAfterMovingSupply();
        await user.click(screen.getByRole('button', { name: 'Check' }));

        expect(verdict()).toContain('did not move');
    });

    it('marks the answer on demand alone', async () => {
        const user = await askAfterMovingSupply();

        // From the top of `a`'s range down to the target, by the keyboard —
        // the only way to move a curve in jsdom.
        const control = screen.getByRole('slider', { name: /Your answer/ });
        control.focus();
        fireEvent.keyDown(control, { key: 'End' });
        for (let i = 0; i < 20; i++) fireEvent.keyDown(control, { key: 'ArrowDown' });
        await user.click(screen.getByRole('button', { name: 'Check' }));

        expect(verdict()).toContain('Correct');
    });
});

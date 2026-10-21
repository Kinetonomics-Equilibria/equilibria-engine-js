import { describe, it, expect, beforeAll } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { StudyScreen } from '../StudyScreen';
import { theme } from '../theme';

/**
 * The shipped lesson, held to what it says — and to the rule that the side
 * column holds the lesson or the instruments, never both. They are tabs on one
 * card, and only the open one is mounted.
 *
 * With both on screen a student could apply a scenario before the lesson had
 * drawn a curve, and watch the strip announce new prices over empty axes; or
 * move supply halfway through, and read a step claiming a baseline the diagram
 * was not at. So while the lesson runs, the only controls are the ones a step
 * hands the student, and the instruments get the whole diagram when they leave.
 *
 * A real engine underneath: every claim here is about the numbers the diagram
 * solves to, and a fixture lesson would only be testing itself.
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

/** The progress bar's marker for a step, by position (the first step is 1). */
const marker = (position: number) =>
    within(screen.getByRole('group', { name: 'Lesson steps' })).getAllByRole('button')[position - 1];

/** The lesson card's way on: "Start lesson" on its first page, "Next" after. */
const next = () => screen.getByRole('button', { name: /^(Next|Start lesson)$/ });

/** "Incomes rise": the step that moves demand up. */
const MOVES = 5;
/** "What sellers earn": the step that hands the student demand to try. */
const TRIES = 6;
/** "Back where we started". */
const BACK = 7;
/** The question: "move demand to where it belongs". */
const ASK = 8;

/** What the market panel's caption says, name and number. */
const marketCaption = () =>
    document.querySelector('[data-testid="stage-chrome"] [data-panel="market"]')!.textContent || '';

/** The panels the stage offers to promote: every one on it but the focal one. */
const promotable = () => document.querySelectorAll('button[data-panel]');

/** The open instrument, if one is: a tab's panel other than the lesson's. */
const instruments = () => screen.queryByRole('tabpanel', { name: /^(Explore|Scenarios|Maths)$/ });

/** A tab beside the stage, pressed. */
const open = (user: ReturnType<typeof userEvent.setup>, name: string) =>
    user.click(screen.getByRole('tab', { name }));
const words = () =>
    (screen.getByRole('region', { name: 'Lesson' }).querySelector('[aria-live="polite"]') as HTMLElement)
        .textContent || '';
const strip = () => document.querySelector('[data-kind]') as HTMLElement;

/** Supply up, the way a student would do it from the instruments. */
async function inputCostsRise(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('tab', { name: 'Scenarios' }));
    await user.click(screen.getByRole('button', { name: 'Input costs rise' }));
}

/** A param's value, as its Explore slider holds it. */
async function valueOf(user: ReturnType<typeof userEvent.setup>, name: string) {
    await user.click(screen.getByRole('tab', { name: 'Explore' }));
    return Number(screen.getByRole('slider', { name }).getAttribute('aria-valuenow'));
}

/** Past the question the shortest way: commit without moving, then ask to be shown. */
async function pastTheQuestion(user: ReturnType<typeof userEvent.setup>) {
    await user.click(marker(ASK));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    await user.click(screen.getByRole('button', { name: 'Show me' }));
}

/** The sheet over the stage before the first step, if it is up. */
const cover = () => screen.queryByRole('region', { name: 'About this lesson' });

describe('the cover', () => {

    // Before the first step the diagram is an empty frame, which says nothing
    // about what is coming; the cover says what the lesson asks, and how long
    // it is. The diagram is still there under it, inert, at its size.
    it('stands in for the empty diagram until the lesson starts', () => {
        mount();
        const sheet = cover()!;
        expect(within(sheet).getByRole('heading', { name: 'Why do prices go up and down?' })).toBeTruthy();
        expect(document.querySelector('.kg-container')!.closest('[inert]')).toBeTruthy();
        expect(screen.getByRole('radio', { name: 'Grid' })).toHaveProperty('disabled', true);
    });

    it("lays out the lesson's parts the way the track will", () => {
        mount();
        const parts = within(within(cover()!).getByRole('list', { name: "The lesson's parts" }))
            .getAllByRole('listitem').map(item => item.textContent);
        expect(parts).toHaveLength(3);
        expect(parts[parts.length - 1]).toMatch(/1 question$/);
    });

    it('gives way to the diagram at the first step, and comes back before it', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(next());
        expect(cover()).toBeNull();
        expect(document.querySelector('[inert]')).toBeNull();

        await user.click(screen.getByRole('button', { name: 'Back' }));
        expect(cover()).toBeTruthy();
    });

    it('is never over the instruments', async () => {
        const user = userEvent.setup();
        mount();
        await open(user, 'Explore');
        expect(cover()).toBeNull();
        expect(document.querySelector('[inert]')).toBeNull();
    });
});

describe('the lesson or the instruments', () => {

    it('opens on the lesson, with no instruments beside it', () => {
        mount();
        expect(screen.getByRole('region', { name: 'Lesson' })).toBeTruthy();
        expect(screen.getByRole('tab', { name: 'Lesson' }).getAttribute('aria-selected')).toBe('true');
        expect(instruments()).toBeNull();
        expect(screen.queryAllByRole('slider')).toHaveLength(0);
    });

    // The tabs are the way out, so the card has no close beside them.
    it('is a tab ahead of the instruments\', with no close of its own', () => {
        mount();
        expect(screen.getAllByRole('tab').map(t => t.textContent))
            .toEqual(['Lesson', 'Explore', 'Scenarios', 'Maths']);
        expect(screen.queryByRole('button', { name: /^(Skip|Leave) lesson$/ })).toBeNull();
    });

    // Not the lesson's half-built diagram: a scenario applied to curves the
    // lesson had not drawn moved nothing anyone could see.
    it('hands over the instruments and the whole diagram when the lesson is skipped', async () => {
        const user = userEvent.setup();
        mount();
        expect(promotable()).toHaveLength(0);

        await open(user, 'Explore');

        expect(instruments()).toBeTruthy();
        expect(screen.queryByRole('region', { name: 'Lesson' })).toBeNull();
        expect(promotable()).toHaveLength(2);
        expect(marketCaption()).toContain('Price $11.00');
    });

    // From one instrument to another is only a change of tab: the lesson is
    // not taken up and put away again on the way, which would reset the market.
    it('moves between instruments without the lesson', async () => {
        const user = userEvent.setup();
        mount();
        await open(user, 'Scenarios');
        await user.click(screen.getByRole('button', { name: 'Input costs rise' }));
        await open(user, 'Maths');

        expect(instruments()).toBeTruthy();
        expect(marketCaption()).toContain('Price $13.00');
    });

    it('puts the instruments away again when the lesson is opened', async () => {
        const user = userEvent.setup();
        mount();
        await open(user, 'Explore');
        await open(user, 'Lesson');

        expect(instruments()).toBeNull();
        expect(words()).toContain('In this lesson');
        // The lesson's own diagram again: nothing drawn before its first step.
        expect(promotable()).toHaveLength(0);
    });

    it('finishes into the instruments, with the market back at its baseline', async () => {
        const user = userEvent.setup();
        mount();
        await pastTheQuestion(user);
        await user.click(next());
        await user.click(screen.getByRole('button', { name: 'Finish' }));

        expect(instruments()).toBeTruthy();
        expect(screen.getByRole('tab', { name: 'Explore' }).getAttribute('aria-selected')).toBe('true');
        expect(marketCaption()).toContain('Price $11.00');
        expect(await valueOf(user, 'a')).toBe(20);
        expect(await valueOf(user, 'c')).toBe(2);
    });

    // Exploring starts at rest: the lesson's last move is the lesson's, and a
    // ghost of it under the instruments would be a movement nobody made there.
    it('starts the instruments at rest', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(MOVES));
        expect(strip().getAttribute('data-kind')).toBe('settled');

        await open(user, 'Explore');
        expect(strip().getAttribute('data-kind')).toBe('rest');
    });
});

describe('coming back to the lesson', () => {

    it('finds the market where the step left it, whatever was done meanwhile', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(MOVES));
        // a = 26 and c = 2: P* = 14.
        expect(marketCaption()).toContain('Price $14.00');

        await open(user, 'Explore');
        await inputCostsRise(user);
        expect(marketCaption()).toContain('Price $16.00');

        await open(user, 'Lesson');

        expect(instruments()).toBeNull();
        expect(words()).toContain('Incomes rise');
        expect(marketCaption()).toContain('Price $14.00');
    });

    // The step's words point at its move — "watch the price change" — so the
    // move comes back too: its ghost, and the strip saying what it did.
    it('says again what the step did', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(MOVES));
        await open(user, 'Explore');
        await inputCostsRise(user);
        await open(user, 'Lesson');

        expect(strip().getAttribute('data-kind')).toBe('settled');
        // Demand's move, 20 → 26, and not supply's 2 → 6 from the detour.
        expect(strip().textContent).toContain('20.0→26.0');
        expect(strip().textContent).not.toContain('2.0→6.0');
    });

    it('asks a question again from where it started', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(ASK));
        const control = screen.getByRole('slider', { name: /Your answer/ });
        control.focus();
        fireEvent.keyDown(control, { key: 'End' });

        await open(user, 'Explore');
        expect(screen.queryByRole('group', { name: 'Question' })).toBeNull();

        await open(user, 'Lesson');
        const row = screen.getByRole('group', { name: 'Question' });
        expect(row.getAttribute('data-phase')).toBe('prompt');
        expect(within(row).getByRole('slider', { name: /Your answer/ }).getAttribute('aria-valuenow')).toBe('20');
        expect(marketCaption()).toContain('Price $11.00');
    });
});

describe('what a step hands the student', () => {

    const tryIt = () => screen.queryByRole('group', { name: 'Try it' });

    it('is on the card at the step that offers it, and nowhere else', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(MOVES));
        expect(tryIt()).toBeNull();
        expect(screen.queryByRole('slider')).toBeNull();

        await user.click(next());
        expect(within(tryIt()!).getAllByRole('slider')).toHaveLength(1);
        expect(screen.getAllByRole('slider')).toHaveLength(1);

        await user.click(next());
        expect(tryIt()).toBeNull();
    });

    it('moves the curve it names', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(TRIES));
        expect(marketCaption()).toContain('Price $14.00');

        const demand = within(tryIt()!).getByRole('slider', { name: 'Demand' });
        demand.focus();
        fireEvent.keyDown(demand, { key: 'End' });

        // a = 28 and c = 2: P* = 15.
        expect(marketCaption()).toContain('Price $15.00');
    });
});

describe('where the lesson says the market is', () => {

    // The step after the one that hands demand over sets both params, so the
    // student can leave demand anywhere and "back to the start" still is.
    it('is back where it started when it says so, wherever the student left demand', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(TRIES));
        const demand = within(screen.getByRole('group', { name: 'Try it' })).getByRole('slider', { name: 'Demand' });
        demand.focus();
        fireEvent.keyDown(demand, { key: 'Home' });

        await user.click(marker(BACK));

        // a = 20 and c = 2 again: P* = 11.
        expect(marketCaption()).toContain('Price $11.00');
    });
});

describe('the question, after demand has been moved', () => {

    /** Arrive at the question from the step that raised demand. */
    const askAfterMovingDemand = async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(MOVES));
        await user.click(marker(ASK));
        return user;
    };

    const row = () => screen.getByRole('group', { name: 'Question' });
    const verdict = () => row().querySelector('[role="status"]')!.textContent || '';

    it('starts from the baseline', async () => {
        await askAfterMovingDemand();
        expect(marketCaption()).toContain('Price $11.00');
    });

    // The step put `a` back while the screen was arriving at the question. Had
    // that been read as the student's move, the attempt would have begun before
    // they touched anything — and "did not move" is the verdict that says it was
    // not.
    it('does not count the step putting demand back as an attempt', async () => {
        const user = await askAfterMovingDemand();
        await user.click(screen.getByRole('button', { name: 'Check' }));

        expect(verdict()).toContain('haven\'t moved');
    });

    it('marks the answer', async () => {
        const user = await askAfterMovingDemand();

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

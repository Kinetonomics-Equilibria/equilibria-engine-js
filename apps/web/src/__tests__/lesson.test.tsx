import { describe, it, expect, beforeAll, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { StudyScreen } from '../StudyScreen';
import { SUPPLY_AND_DEMAND } from '../lessons/market';
import { theme } from '../theme';

/**
 * The shipped lesson, held to what it says — and to the rule that a page
 * holds the lesson or the instruments, never both: a lesson's page has the
 * lesson, and its model's page in the playground has the instruments.
 *
 * With both on screen a student could apply a scenario before the lesson had
 * drawn a curve, and watch the strip announce new prices over empty axes; or
 * move supply halfway through, and read a step claiming a baseline the diagram
 * was not at. So beside the lesson the only controls are the ones a step hands
 * the student, and the playground has the whole diagram.
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

/** The lesson's model, as the playground's page. */
const play = () => render(
    <MantineProvider theme={theme} env="test"><StudyScreen playground={SUPPLY_AND_DEMAND.model} /></MantineProvider>
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

/** The open instrument, if one is. */
const instruments = () => screen.queryByRole('tabpanel', { name: /^(Explore|Scenarios|Maths)$/ });

/** A tab beside the stage, pressed. */
const open = (user: ReturnType<typeof userEvent.setup>, name: string) =>
    user.click(screen.getByRole('tab', { name }));
const words = () =>
    (screen.getByRole('region', { name: 'Lesson' }).querySelector('[aria-live="polite"]') as HTMLElement)
        .textContent || '';
const strip = () => document.querySelector('[data-kind]') as HTMLElement;

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
        expect(screen.getByRole('button', { name: 'Switch to Grid' })).toHaveProperty('disabled', true);
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

    it('is never over the playground', () => {
        play();
        expect(cover()).toBeNull();
        expect(document.querySelector('[inert]')).toBeNull();
    });
});

describe('a lesson\'s page', () => {

    // Nothing on it leads out of the lesson but the rail, and Finish at the end.
    it('has the lesson beside the stage, and no instruments or tabs', () => {
        mount();
        expect(screen.getByRole('region', { name: 'Lesson' })).toBeTruthy();
        expect(instruments()).toBeNull();
        expect(screen.queryAllByRole('tab')).toHaveLength(0);
        expect(screen.queryAllByRole('slider')).toHaveLength(0);
        expect(screen.queryByRole('button', { name: /^(Skip|Leave) lesson$/ })).toBeNull();
    });

    // The view it leaves goes with it, so the shell can leave the lesson's
    // history entry there: Back returns to the step Finish was pressed at.
    it('finishes into the playground, at the lesson\'s model and the market it ended on', async () => {
        const user = userEvent.setup();
        const onFinish = vi.fn();
        render(<MantineProvider theme={theme} env="test"><StudyScreen onFinish={onFinish} /></MantineProvider>);
        await pastTheQuestion(user);
        await user.click(next());
        await user.click(screen.getByRole('button', { name: 'Finish' }));

        // The last step puts the market back at the model's own, so the
        // playground's address names no param.
        expect(onFinish).toHaveBeenCalledWith('playground/market', 'lessons/market?step=9');
    });

    // What the history entry remembers is not a link: past an answered question
    // the lesson opens where it was left, with the market it was left at, and
    // that market is what Finish hands the playground.
    it('opens past a question its history entry remembers answering, and finishes with that market', async () => {
        const user = userEvent.setup();
        const onFinish = vi.fn();
        render(
            <MantineProvider theme={theme} env="test">
                <StudyScreen
                    link={{ step: 9, tab: null, arrange: 'focus', focus: null, params: { c: 4 } }}
                    answered={{ lesson: 'market', resolved: [ASK - 1], outcomes: { [ASK - 1]: { how: 'first' } } }}
                    onFinish={onFinish}
                />
            </MantineProvider>
        );
        expect(words()).toContain('Over to you');
        await user.click(screen.getByRole('button', { name: 'Finish' }));
        expect(onFinish).toHaveBeenCalledWith('playground/market?c=4', 'lessons/market?step=9&c=4');
    });
});

describe('the playground', () => {

    // Not a lesson's half-built diagram: the model, whole, from the start.
    it('draws every panel from the start, with the instruments beside it and no lesson', () => {
        play();
        expect(screen.queryByRole('region', { name: 'Lesson' })).toBeNull();
        expect(screen.getAllByRole('tab').map(t => t.textContent)).toEqual(['Explore', 'Scenarios', 'Maths']);
        expect(screen.getByRole('tab', { name: 'Explore' }).getAttribute('aria-selected')).toBe('true');
        expect(promotable()).toHaveLength(2);
        expect(marketCaption()).toContain('Price $11.00');
    });

    it('is titled by the model, not by a lesson', () => {
        play();
        expect(screen.getByRole('heading', { name: 'A market, its surplus and its revenue' })).toBeTruthy();
    });

    // From one instrument to another is only a change of tab.
    it('moves between instruments, keeping the market', async () => {
        const user = userEvent.setup();
        play();
        await open(user, 'Scenarios');
        await user.click(screen.getByRole('button', { name: 'Input costs rise' }));
        await open(user, 'Maths');

        expect(instruments()).toBeTruthy();
        expect(marketCaption()).toContain('Price $13.00');
    });

    it('starts at rest', () => {
        play();
        expect(strip().getAttribute('data-kind')).toBe('rest');
    });
});

describe('what a step hands the student', () => {

    const tryIt = () => screen.queryByRole('group', { name: 'Try it' });
    // The diagram's curves are sliders as well, to the keyboard (the engine's
    // view/handles.ts); these are the ones off it.
    const offTheDiagram = () => screen.queryAllByRole('slider').filter(el => !el.closest('svg'));

    it('is on the card at the step that offers it, and nowhere else', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(MOVES));
        expect(tryIt()).toBeNull();
        expect(offTheDiagram()).toEqual([]);

        await user.click(next());
        expect(within(tryIt()!).getAllByRole('slider')).toHaveLength(1);
        expect(offTheDiagram()).toHaveLength(1);

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

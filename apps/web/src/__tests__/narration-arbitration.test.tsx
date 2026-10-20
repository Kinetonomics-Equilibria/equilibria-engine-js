import { describe, it, expect, beforeAll } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { StudyScreen } from '../StudyScreen';
import { theme } from '../theme';

/**
 * Where the lesson speaks and where the student's moves are reported, now that
 * those are two places.
 *
 * They used to share the strip under the stage, with one rule deciding who got
 * it: the student's own action wins, and a step's sentence stands until they
 * act. It held, and it cost the lesson its words at exactly the wrong moments —
 * a student who dragged a curve to see what the step meant, or who pushed one
 * to the end of its range, lost the explanation they were exploring. So the
 * step's words moved to the lesson card, where nothing the student does
 * displaces them, and the strip kept the numbers. Beside the stage the numbers
 * have since moved too, to "What changed" under the lesson card: still a place
 * of their own, and now with the room to say what each one means.
 *
 * These mount the whole screen, engine included: the sharp edge is still that a
 * step which sets params fires the very event a student's move fires, and only
 * a real engine shows which of the two places each one reaches.
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

/** "What changed": what it shows, and what it announces. */
const narration = () => document.querySelector('[data-kind]') as HTMLElement;
const announced = () => (narration().querySelector('[role="status"]') as HTMLElement).textContent || '';

/** The lesson card, and what it announces. */
const card = () => screen.getByRole('region', { name: 'Lesson' });
const words = () => (card().querySelector('[aria-live="polite"]') as HTMLElement).textContent || '';

/** The progress bar's marker for a step, by position (the first step is 1). */
const marker = (position: number) =>
    within(screen.getByRole('group', { name: 'Lesson steps' })).getAllByRole('button')[position - 1];

/** The step that moves the diagram, and the one after it. */
const MOVES = 5;
const MOVES_TITLE = 'Incomes rise';
const NEXT_TITLE = 'What sellers earn';

describe('the lesson speaks on its card, and "What changed" reports the numbers', () => {

    // At the start nothing is drawn, so nothing can change: the card says what
    // the lesson is for and how to start it, and "What changed" waits rather
    // than repeat the Start button.
    it('starts on what the lesson is for, with nothing yet to report', () => {
        mount();
        expect(words()).toContain('In this lesson');
        expect(screen.getByRole('button', { name: 'Start lesson' })).toBeTruthy();
        expect(narration()).toBeNull();
    });

    it('shows a step\'s words on the card when the step fires', async () => {
        mount();
        await userEvent.setup().click(marker(1));

        expect(within(card()).getByRole('heading', { name: 'Demand: what buyers want' })).toBeTruthy();
        // And not in "What changed", which carries no lesson's words.
        expect(narration().textContent).not.toContain('Demand: what buyers want');
    });

    /**
     * The edge. Step 5 sets `a`, which is a param the narration reports, so the
     * change the step causes arrives as `kg:param_changed` — the same event a
     * student's drag raises. The card keeps the step's words and "What
     * changed" reports what the step moved, in the lesson's own words for it.
     */
    it('reports the step\'s own move in "What changed", under the step\'s words', async () => {
        mount();
        await userEvent.setup().click(marker(MOVES));

        expect(words()).toContain(MOVES_TITLE);
        expect(narration().getAttribute('data-kind')).toBe('settled');
        expect(announced()).toContain('Demand increases from 20.0 to 26.0');
    });

    // A screen reader hears both, each from its own place: the words when the
    // step changes, the numbers when the diagram does.
    it('announces the step\'s words from the card, and the numbers from "What changed"', async () => {
        mount();
        await userEvent.setup().click(marker(MOVES));

        expect(words()).toContain('they want more at every price');
        expect(announced()).toContain('the price rises');
        expect(announced()).not.toContain('want more at every price');
    });

    /**
     * The defect this layout exists for: a student who moved something to see
     * what the step meant used to lose the step's words for it.
     */
    it('keeps the step\'s words when the student moves something', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(MOVES + 1));

        // The step hands the student demand to move: one `updateParams` call,
        // exactly like a drag as far as the screen is concerned.
        const demand = within(screen.getByRole('group', { name: 'Try it' }))
            .getByRole('slider', { name: 'Demand' });
        demand.focus();
        fireEvent.keyDown(demand, { key: 'ArrowDown' });

        expect(words()).toContain(NEXT_TITLE);
        expect(within(narration()).getByText('Demand decreases')).toBeTruthy();
    });

    it('moves to the next step\'s words at the next step', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(MOVES));
        await user.click(screen.getByRole('button', { name: 'Next' }));

        expect(words()).toContain(NEXT_TITLE);
        expect(words()).not.toContain(MOVES_TITLE);
    });

    // Going back to the start puts the card back on its first page.
    it('goes back to what the lesson is for at the start', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(1));
        await user.click(screen.getByRole('button', { name: 'Back' }));

        expect(words()).toContain('In this lesson');
    });
});

/**
 * The other half of a step firing: the diagram, and whether it agrees.
 *
 * These are the two failures P9 found by looking at a screen rather than at a
 * suite — a diagram that moves while the words say nothing happened, and ghosts
 * appearing over a diagram nobody has touched.
 */
describe('what a step does to the diagram', () => {

    it('reveals only what the lesson has reached', async () => {
        const { container } = mount();
        const promotes = () => container.querySelectorAll('button[data-panel]');

        // One panel has arrived, and it is focal, so there is no promote button
        // for anything — the other two are not on the stage at all.
        expect(promotes()).toHaveLength(0);

        await userEvent.setup().click(marker(4));
        expect(promotes()).toHaveLength(1);
    });

    it('leaves the ghosts alone for a step that only reveals', async () => {
        mount();
        await userEvent.setup().click(marker(3));

        // `prev.changed` gates every ghost, and a reveal is not the student
        // moving anything — so the narration reads rest and the chain is empty.
        expect(narration().getAttribute('data-kind')).toBe('rest');
    });

    it('narrates the move a step makes, against where it started', async () => {
        mount();
        await userEvent.setup().click(marker(MOVES));

        // 20 → 26 on `a`, which the diagram solves to P* 11.00 → 14.00.
        expect(announced()).toContain('Demand increases from 20.0 to 26.0');
        expect(announced()).toContain('the price rises from $11.00 to $14.00');
    });
});

import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { StudyScreen } from '../StudyScreen';
import { theme } from '../theme';

/**
 * Who gets the strip, when a lesson and a student both want to speak.
 *
 * The rule is one sentence — the student's own action always wins, and a step's
 * sentence stands until they act — and it has one sharp edge that only shows up
 * with a real engine underneath: **a step that sets params fires the very event
 * that would clear the step's sentence.** So this test mounts the whole screen,
 * engine included, rather than the strip in isolation. A unit test of the rule
 * would pass against the naive implementation, which puts a sentence on screen
 * and wipes it in the same tick.
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

/** What the strip shows, and what it announces. */
const strip = () => document.querySelector('[data-kind]') as HTMLElement;
const announced = () => (strip().querySelector('[role="status"]') as HTMLElement).textContent || '';

const marker = (position: number) => screen.getAllByRole('button')
    .filter(b => b.hasAttribute('data-kinds'))[position];

/** The step that moves the diagram, and the one after it. */
const MOVES = 5;
const MOVES_SAY = 'Incomes rise, so buyers want more at every price. Watch both panels.';
const NEXT_SAY = 'And the money that changes hands: the price times the quantity sold.';

describe('a lesson and a student, one strip', () => {

    // And the hint is about the lesson, not about dragging a curve: at the
    // start of a build-up there is no curve to drag.
    it('starts on a hint rather than a sentence, since no step has spoken', () => {
        mount();
        expect(strip().getAttribute('data-authored')).toBeNull();
        expect(strip().textContent).toContain('Step forward to begin');
    });

    it('shows a step\'s sentence when the step fires', async () => {
        mount();
        await userEvent.setup().click(marker(1));

        expect(strip().getAttribute('data-authored')).toBe('true');
        expect(strip().textContent).toContain('Demand slopes down');
    });

    /**
     * The edge. Step 5 sets `a`, which is a param the strip narrates, so the
     * change the step *causes* arrives as `kg:param_changed` before the sentence
     * is set — and a rule that cleared on any narrated change would clear it
     * again immediately, leaving a lesson that silently refuses to speak
     * whenever it has something to show.
     */
    it('keeps the sentence through the step\'s own param change', async () => {
        mount();
        await userEvent.setup().click(marker(MOVES));

        expect(strip().getAttribute('data-authored')).toBe('true');
        expect(strip().textContent).toContain('Incomes rise');
    });

    // A screen reader gets both: the eye reads the sentence and watches the
    // diagram move, and there is nothing to watch if you cannot see it.
    it('announces the sentence and the numbers it caused', async () => {
        mount();
        await userEvent.setup().click(marker(MOVES));

        expect(announced()).toContain(MOVES_SAY);
        expect(announced()).toContain('P*');
    });

    it('gives the strip back to the student the moment they move something', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(MOVES));
        expect(strip().textContent).toContain('Incomes rise');

        // A scenario is the student acting through the dock — one `updateParams`
        // call, exactly like a slider or a drag as far as the strip is concerned.
        await user.click(screen.getByRole('tab', { name: 'Scenarios' }));
        await user.click(screen.getByRole('button', { name: 'Back to baseline' }));

        expect(strip().getAttribute('data-authored')).toBeNull();
        expect(strip().textContent).not.toContain('Incomes rise');
        expect(within(strip()).getByText('a')).toBeTruthy();
    });

    it('speaks again at the next step', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(MOVES));
        await user.click(screen.getByRole('tab', { name: 'Scenarios' }));
        await user.click(screen.getByRole('button', { name: 'Back to baseline' }));

        await user.click(screen.getByLabelText('Next step'));

        expect(strip().getAttribute('data-authored')).toBe('true');
        expect(strip().textContent).toContain(NEXT_SAY);
    });

    // A step with nothing to say leaves the strip to the chain rather than
    // holding the previous step's sentence up over an unrelated diagram.
    it('stands down at a step that says nothing', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(1));
        await user.click(marker(0));

        expect(strip().getAttribute('data-authored')).toBeNull();
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
        // moving anything — so the strip reads rest and the chain is empty.
        expect(strip().getAttribute('data-kind')).toBe('rest');
    });

    it('narrates the move a step makes, against where it started', async () => {
        mount();
        await userEvent.setup().click(marker(MOVES));

        // 20 → 26 on `a`, which the diagram solves to P* 11.0 → 14.0.
        expect(announced()).toContain('a from 20.0 to 26.0');
        expect(announced()).toContain('P* from $11.0 to $14.0');
    });
});

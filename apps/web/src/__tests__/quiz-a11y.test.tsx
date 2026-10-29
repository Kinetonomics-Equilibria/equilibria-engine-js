import { describe, it, expect, beforeAll } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { StudyScreen } from '../StudyScreen';
import { FOREIGN_EXCHANGE, FX_LESSON } from '../lessons/fx';
import { theme } from '../theme';

/**
 * Answering without a mouse, and being told the answer without being able to
 * see the diagram.
 *
 * A question answered by dragging a curve is unusable from the keyboard unless
 * something else writes the same param, and P11's position is that the slider
 * is not a lesser path: it moves the same param the drag moves, so the two
 * answers are the same answer by construction rather than by agreement. That is
 * the claim this file exists to hold — plus the two ways a live region goes
 * wrong, which are saying nothing and saying everything twice.
 */

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

/** The question step in `lessons/supplyAndDemand.ts`. */
const ASK = 8;

const row = () => screen.getByRole('group', { name: 'Question' });
const slider = () => screen.getByRole('slider', { name: /Your answer/ });
const announcement = () => row().querySelector('[role="status"]') as HTMLElement;

const ask = async () => {
    const user = userEvent.setup();
    mount();
    await user.click(marker(ASK));
    return user;
};

describe('the keyboard answers the question', () => {

    it('names the control, and says its value in the units the diagram draws', async () => {
        await ask();
        const control = slider();

        // `aria-valuetext` and not `aria-valuenow`: the raw value comes off a
        // rounding grid, so it reads as "12.100000000000001" where the diagram
        // and the strip both say 12.1.
        expect(control.getAttribute('aria-valuetext')).toBe('20.0');
        expect(control.getAttribute('aria-valuemin')).toBe('12');
        expect(control.getAttribute('aria-valuemax')).toBe('28');
    });

    it('adjusts by the param\'s own step, and by its bounds', async () => {
        await ask();
        const control = slider();
        control.focus();

        fireEvent.keyDown(control, { key: 'ArrowUp' });
        expect(control.getAttribute('aria-valuetext')).toBe('20.1');

        fireEvent.keyDown(control, { key: 'ArrowDown' });
        expect(control.getAttribute('aria-valuetext')).toBe('20.0');

        fireEvent.keyDown(control, { key: 'End' });
        expect(control.getAttribute('aria-valuetext')).toBe('28.0');
    });

    /**
     * Enter commits, so a whole answer can be given without leaving the control.
     * The Check button is still there for anyone who wants it; what it must not
     * be is the *only* way to submit.
     */
    it('commits from the control itself', async () => {
        await ask();
        const control = slider();
        control.focus();
        fireEvent.keyDown(control, { key: 'End' });
        fireEvent.keyDown(control, { key: 'Enter' });

        expect(announcement().textContent).toContain('the right direction');
        expect(screen.queryByRole('button', { name: 'Check' })).toBeNull();
    });

    /**
     * Reading order is the tab order, and the question sits where it looks like
     * it sits: on the lesson card, after the step's words that ask it and
     * before the Back and Next that move the lesson on. Nothing here is a `div`
     * with a click handler, so Enter, Space and focus order come free.
     */
    it('sits on the lesson card between the words and the way on, with its controls in the tab order', async () => {
        await ask();
        const card = screen.getByRole('region', { name: 'Lesson' }),
            words = card.querySelector('[aria-live="polite"]') as HTMLElement,
            onward = within(card).getByRole('button', { name: 'Next' });

        expect(card.contains(row())).toBe(true);
        expect(words.compareDocumentPosition(row()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(row().compareDocumentPosition(onward) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

        expect(slider().getAttribute('tabindex')).toBe('0');
        expect(screen.getByRole('button', { name: 'Check' }).tagName).toBe('BUTTON');
    });
});

describe('the verdict reaches a student who cannot see the diagram', () => {

    it('is announced from a live region that was already there', async () => {
        const user = await ask();

        // Present and empty before the answer: a region created at the moment
        // it is filled is a region the screen reader was not watching.
        const region = announcement();
        expect(region.getAttribute('aria-live')).toBe('polite');
        expect(region.textContent).toBe('');

        await user.click(screen.getByRole('button', { name: 'Check' }));
        expect(announcement()).toBe(region);
        expect(region.textContent).toContain('haven\'t moved');
    });

    /**
     * One thought in two clauses.
     *
     * Without `aria-atomic` the region is read a changed node at a time, so
     * "Right direction. A bit too far." arrives as two verdicts with a pause between
     * them — which is exactly the impression the separate reporting is meant to
     * avoid giving.
     */
    it('announces the two clauses as one verdict', async () => {
        const user = await ask();
        const control = slider();
        control.focus();
        fireEvent.keyDown(control, { key: 'End' });
        await user.click(screen.getByRole('button', { name: 'Check' }));

        expect(announcement().getAttribute('aria-atomic')).toBe('true');
        expect(announcement().textContent).toContain('the right direction');
        expect(announcement().textContent).toContain('too far');
    });

    /**
     * And announced once. "What changed" has a live region of its own, and a
     * verdict repeated into both is heard twice — which is why the prompt and
     * the verdict live here and the narration keeps reporting the diagram.
     */
    it('does not repeat the verdict into the narration', async () => {
        const user = await ask();
        const control = slider();
        control.focus();
        fireEvent.keyDown(control, { key: 'End' });
        await user.click(screen.getByRole('button', { name: 'Check' }));

        const strip = document.querySelector('[data-kind]') as HTMLElement;
        const stripSays = (strip.querySelector('[role="status"]') as HTMLElement).textContent || '';
        expect(stripSays).not.toContain('the right direction');
        // It is doing its own job instead: saying what moved and what followed.
        expect(stripSays).toContain('Demand increases from 20.0 to 28.0');
    });
});

describe('focus is the student\'s', () => {

    it('is not stolen when the question arrives', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(ASK));

        // The marker they pressed still has it. A question that grabbed focus
        // would take the track's keyboard navigation away mid-lesson.
        expect(document.activeElement).toBe(marker(ASK));
    });

    it('is not stolen mid-attempt', async () => {
        await ask();
        const control = slider();
        control.focus();

        fireEvent.keyDown(control, { key: 'ArrowUp' });
        fireEvent.keyDown(control, { key: 'ArrowUp' });
        expect(document.activeElement).toBe(control);
    });

    /**
     * Committing does move focus, and has to: the control the student was on is
     * about to stop working, and leaving focus on a dead slider strands them.
     * It goes to the nearest live thing in the same row rather than to the top
     * of the page.
     */
    it('moves to the controls that replace it when the answer is taken', async () => {
        const user = await ask();
        const control = slider();
        control.focus();
        fireEvent.keyDown(control, { key: 'End' });
        await user.click(screen.getByRole('button', { name: 'Check' }));

        // Not left on a control that has stopped working, and not dropped to
        // the top of the document — one step, to the first thing that replaced
        // it. A student who answers by keyboard should not be sent back to the
        // page heading for having answered.
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Try again' }));
    });

    it('lands on the way onward when the answer is right', async () => {
        const user = await ask();
        const control = slider();
        control.focus();
        // 26 is the answer; from the top that is twenty steps down.
        fireEvent.keyDown(control, { key: 'End' });
        for (let i = 0; i < 20; i++) fireEvent.keyDown(control, { key: 'ArrowDown' });
        await user.click(screen.getByRole('button', { name: 'Check' }));

        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Continue' }));
    });
});

/**
 * Choosing a curve without a mouse (P14).
 *
 * A question that asks which curve moves offers a slider per curve, and
 * choosing a slider is choosing the curve — as grabbing one is with the mouse.
 * So each needs a name that says which, on screen as well as to a reader; Enter
 * on either has to take the whole answer; and the verdict, which can no longer
 * lean on a prompt naming the curve, has to name it itself.
 */
describe('choosing a curve by keyboard', () => {

    const FIRST = FX_LESSON.findIndex(step => !!step.ask) + 1;

    const askFx = async () => {
        const user = userEvent.setup();
        render(<MantineProvider theme={theme} env="test"><StudyScreen content={FOREIGN_EXCHANGE} /></MantineProvider>);
        await user.click(marker(FIRST));
        return user;
    };

    /** In the row: the dock's Explore sliders carry the same names. */
    const named = (name: string) => within(row()).getByRole('slider', { name });

    it('names each slider by its curve, where it can be seen and where it is read', async () => {
        await askFx();
        expect(within(row()).getAllByRole('slider').map(s => s.getAttribute('aria-label')))
            .toEqual(['Demand for AUD', 'Supply of AUD']);

        // On screen, and hidden from the reader, who has it as the slider's
        // own name: heard once, not twice.
        const visible = within(row()).getByText('Supply of AUD');
        expect(visible.getAttribute('aria-hidden')).toBe('true');

        expect(named('Demand for AUD').getAttribute('tabindex')).toBe('0');
        expect(named('Supply of AUD').getAttribute('tabindex')).toBe('0');
    });

    it('commits from either slider, and names the curve in what it announces', async () => {
        await askFx();
        const supply = named('Supply of AUD');
        supply.focus();
        fireEvent.keyDown(supply, { key: 'ArrowRight' });
        fireEvent.keyDown(supply, { key: 'Enter' });

        expect(announcement().textContent)
            .toContain('This change moves demand for AUD, so supply of AUD should stay where it was.');
        expect(screen.queryByRole('button', { name: 'Check' })).toBeNull();
        // Off the slider that stopped working, onto the first thing that replaced it.
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Try again' }));
    });

    it('freezes both sliders when the answer is taken', async () => {
        await askFx();
        const demand = named('Demand for AUD');
        demand.focus();
        fireEvent.keyDown(demand, { key: 'ArrowRight' });
        fireEvent.keyDown(demand, { key: 'Enter' });
        expect(announcement().textContent).toContain('You moved demand for AUD right, which is the right direction.');

        ['Demand for AUD', 'Supply of AUD'].forEach(name => {
            const control = named(name), before = control.getAttribute('aria-valuetext');
            fireEvent.keyDown(control, { key: 'Home' });
            expect(control.getAttribute('aria-valuetext'), name).toBe(before);
        });
    });

    it('lets the student move between the two without focus being taken', async () => {
        await askFx();
        const demand = named('Demand for AUD'), supply = named('Supply of AUD');
        supply.focus();
        fireEvent.keyDown(supply, { key: 'ArrowRight' });
        demand.focus();
        fireEvent.keyDown(demand, { key: 'ArrowRight' });
        expect(document.activeElement).toBe(demand);
    });

    it('announces a wrong curve in the question row, and not again in the narration', async () => {
        await askFx();
        const supply = named('Supply of AUD');
        supply.focus();
        fireEvent.keyDown(supply, { key: 'ArrowLeft' });
        fireEvent.keyDown(supply, { key: 'Enter' });

        const strip = document.querySelector('[data-kind]') as HTMLElement;
        const stripSays = (strip.querySelector('[role="status"]') as HTMLElement).textContent || '';
        expect(announcement().textContent).toContain('should stay where it was');
        expect(stripSays).not.toContain('should stay where it was');
        // It goes on doing its own job: saying what moved.
        expect(stripSays).toContain('supply of AUD');
    });
});

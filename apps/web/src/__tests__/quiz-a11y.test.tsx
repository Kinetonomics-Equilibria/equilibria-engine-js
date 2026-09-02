import { describe, it, expect, beforeAll } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { StudyScreen } from '../StudyScreen';
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

const marker = (position: number) => screen.getAllByRole('button')
    .filter(b => b.hasAttribute('data-kinds'))[position];

/** The question step in `studyDiagram.ts`. */
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

        expect(announcement().textContent).toContain('Right direction');
        expect(screen.queryByRole('button', { name: 'Check' })).toBeNull();
    });

    /**
     * Reading order is the tab order, and the question sits where it looks like
     * it sits: under the line that narrates the diagram, above the track that
     * moves the lesson. Nothing here is a `div` with a click handler, so Enter,
     * Space and focus order come free.
     */
    it('sits between the strip and the track, with its controls in the tab order', async () => {
        await ask();
        const strip = document.querySelector('[data-kind]') as HTMLElement,
            track = document.querySelector('[aria-label="Lesson steps"]') as HTMLElement;

        expect(strip.compareDocumentPosition(row()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(row().compareDocumentPosition(track) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

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
        expect(region.textContent).toContain('did not move');
    });

    /**
     * One thought in two clauses.
     *
     * Without `aria-atomic` the region is read a changed node at a time, so
     * "Right direction. Too far." arrives as two verdicts with a pause between
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
        expect(announcement().textContent).toContain('Right direction');
        expect(announcement().textContent).toContain('Too far');
    });

    /**
     * And announced once. The strip below the stage has a live region of its
     * own, and a verdict repeated into both is heard twice — which is why the
     * prompt and the verdict live here and the strip keeps narrating the
     * diagram.
     */
    it('does not repeat the verdict into the narration strip', async () => {
        const user = await ask();
        const control = slider();
        control.focus();
        fireEvent.keyDown(control, { key: 'End' });
        await user.click(screen.getByRole('button', { name: 'Check' }));

        const strip = document.querySelector('[data-kind]') as HTMLElement;
        const stripSays = (strip.querySelector('[role="status"]') as HTMLElement).textContent || '';
        expect(stripSays).not.toContain('Right direction');
        // It is doing its own job instead: saying what moved and what followed.
        expect(stripSays).toContain('a from 20.0 to 28.0');
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

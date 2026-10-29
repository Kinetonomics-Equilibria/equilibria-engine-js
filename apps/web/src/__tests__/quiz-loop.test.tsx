import { describe, it, expect, beforeAll } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { StudyScreen } from '../StudyScreen';
import { theme } from '../theme';

/**
 * Prompt, attempt, verdict, reveal — with a real engine underneath.
 *
 * The pure tests already say what a grade is and what the machine refuses. What
 * only a mounted screen can say is whether the question, the diagram and the
 * track agree: that arriving at an `ask` step stops the lesson and arms the
 * apparatus, that the value being marked is the one the *engine* holds after
 * its own rounding and bounds, that committing actually freezes the param
 * against every path that could move it, and that answering releases the track.
 *
 * The lesson under test is the shipped one, on purpose. A fixture would let the
 * screen and the lesson drift apart, and the lesson is the only place a question
 * currently exists.
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

/** The question step in `lessons/market/steps.ts`: "move demand to where it belongs". */
const ASK = 8;

const row = () => screen.queryByRole('group', { name: 'Question' });
const slider = () => screen.getByRole('slider', { name: /Your answer/ });
const check = () => screen.getByRole('button', { name: 'Check' });
const verdict = () => row()!.querySelector('[role="status"]')!.textContent || '';

/**
 * Answer with the keyboard, which is the only way to move a curve in jsdom —
 * and, not incidentally, the path P11 requires to be equal to dragging.
 *
 * `End` and `Home` jump to the param's bounds; the arrows step by its `round`.
 * `fireEvent` rather than `userEvent` because sixty round trips through the
 * engine at userEvent's pace is a slow test for no extra coverage.
 */
function answer(target: number) {
    const control = slider();
    control.focus();

    // From whichever bound is nearer. Every arrow press is a round trip through
    // the engine and a render, so 12 to 26 the long way is a slow test.
    const down = Math.round((28 - target) / 0.1), up = Math.round((target - 12) / 0.1);
    fireEvent.keyDown(control, { key: down <= up ? 'End' : 'Home' });
    for (let i = 0; i < Math.min(down, up); i++) {
        fireEvent.keyDown(control, { key: down <= up ? 'ArrowDown' : 'ArrowUp' });
    }
    return control;
}

/** What the thumb is announcing, which is the value formatted as it is drawn. */
const shown = (control: HTMLElement) => control.getAttribute('aria-valuetext');

describe('a question arrives', () => {

    it('is not on screen until the lesson reaches it', async () => {
        mount();
        expect(row()).toBeNull();
        await userEvent.setup().click(marker(ASK - 1));
        expect(row()).toBeNull();
    });

    it('shows the prompt on the lesson card, above the question, and not on the strip', async () => {
        mount();
        await userEvent.setup().click(marker(ASK));

        const card = screen.getByRole('region', { name: 'Lesson' });
        const words = card.querySelector('[aria-live="polite"]') as HTMLElement;
        expect(words.textContent).toContain('Move the demand curve to where it goes');
        expect(words.compareDocumentPosition(row()!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        // The student's own move wins the strip, so a prompt there would vanish
        // the moment they moved something to answer it.
        const strip = document.querySelector('[data-kind]') as HTMLElement;
        expect(strip.textContent).not.toContain('where it goes');
    });

    it('stops the track until it is answered', async () => {
        mount();
        await userEvent.setup().click(marker(ASK));

        expect(screen.getByText('Answer the question to unlock the next step.')).toBeTruthy();
        expect(next()).toHaveProperty('disabled', true);
    });

    /**
     * Nothing on screen to aim at, which is the design decision the whole
     * feature turns on: with a target visible the task stops being economics
     * and becomes aiming.
     */
    it('shows no target while the student is answering', async () => {
        mount();
        await userEvent.setup().click(marker(ASK));

        expect(row()!.textContent).not.toContain('26');
        expect(verdict()).toBe('');
    });
});

describe('the verdict names direction and magnitude separately', () => {

    const ask = async () => {
        mount();
        await userEvent.setup().click(marker(ASK));
    };

    it('marks committing without moving as its own mistake', async () => {
        await ask();
        await userEvent.setup().click(check());

        expect(verdict()).toContain('haven\'t moved');
        expect(screen.getByText('Answer the question to unlock the next step.')).toBeTruthy();
    });

    it('marks the wrong direction as wrong, and says which way it went', async () => {
        await ask();
        const control = slider();
        control.focus();
        fireEvent.keyDown(control, { key: 'Home' });     // 12: down, and a long way
        await userEvent.setup().click(check());

        expect(verdict()).toContain('but this change moves it up');
        expect(verdict()).toContain('It goes to 26.0');
    });

    /**
     * The sentence this whole split exists to make possible, and the reason a
     * single boolean would not do: the student understood the mechanism and got
     * the size wrong, and being told only "incorrect" hides the half they had.
     */
    it('marks the right direction right while marking the magnitude wrong', async () => {
        await ask();
        answer(28);                                       // up, but past the answer
        await userEvent.setup().click(check());

        expect(verdict()).toContain('the right direction');
        expect(verdict()).toContain('too far');
        expect(verdict()).toContain('Almost');
    });

    it('marks an answer inside the tolerance correct', async () => {
        await ask();
        answer(25.5);                                     // target 26, tolerance 1
        await userEvent.setup().click(check());

        expect(verdict()).toContain('Correct');
        expect(verdict()).toContain('the right direction');
    });
});

describe('committing takes the answer out of the student\'s hands', () => {

    const committed = async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(ASK));
        answer(28);
        await user.click(check());
        return user;
    };

    // The effect, not the attribute: a disabled-looking control that still
    // moves is the defect, and this whole plan exists because a property that
    // said "not draggable" was read by nothing.
    it('stops the answer control moving, and takes the Check button away', async () => {
        await committed();
        const control = slider();
        const before = shown(control);
        fireEvent.keyDown(control, { key: 'Home' });

        expect(shown(control)).toBe(before);
        expect(screen.queryByRole('button', { name: 'Check' })).toBeNull();
    });

    /**
     * The half `draggable` cannot cover.
     *
     * The engine's freeze stops the *diagram's* drag and knows nothing about a
     * host control, and P11 makes that host control the equal answer path — so
     * a committed answer another slider could still edit is not frozen at all.
     * The instruments are put away while a lesson runs — their tabs are
     * there, and pressing one leaves the lesson and stands the question down —
     * so the question's own control is the only one on screen; the screen's
     * guard, at the one place every host param write goes, is behind it for
     * anything that slips past.
     */
    it('leaves no other control on screen that could move it', async () => {
        await committed();

        expect(screen.getAllByRole('slider')).toEqual([slider()]);
        expect(screen.queryByRole('tabpanel', { name: /^(Explore|Scenarios|Maths)$/ })).toBeNull();
    });

    // Reset puts the market back where the step began, and an answer is not
    // part of that: the frozen curve is all that has moved, so there is
    // nothing left for it to do.
    it('leaves Reset nothing to move', async () => {
        await committed();
        const before = shown(slider()), reset = screen.getByRole('button', { name: 'Reset' });

        expect(reset).toHaveProperty('disabled', true);
        fireEvent.click(reset);
        expect(shown(slider())).toBe(before);
    });

    it('gives the control back on a retry', async () => {
        const user = await committed();
        await user.click(screen.getByRole('button', { name: 'Try again' }));

        const control = slider();
        fireEvent.keyDown(control, { key: 'Home' });
        expect(shown(control)).toBe('12.0');

        expect(screen.getByRole('button', { name: 'Check' })).toBeTruthy();
        expect(verdict()).toBe('');
    });
});

describe('getting past the question', () => {

    it('releases the track on a correct answer', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(ASK));
        answer(26);
        await user.click(check());

        expect(screen.queryByText('Answer the question to unlock the next step.')).toBeNull();
        expect(next()).toHaveProperty('disabled', false);
    });

    /**
     * Unlimited retries with the answer withheld measure persistence rather
     * than recall, which is the better thing to measure — but only if nobody
     * can be stuck. So asking to be shown finishes the question too.
     */
    it('releases the track when the student asks to be shown', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(ASK));
        answer(14);
        await user.click(check());
        expect(screen.getByText('Answer the question to unlock the next step.')).toBeTruthy();

        await user.click(screen.getByRole('button', { name: 'Show me' }));

        expect(screen.queryByText('Answer the question to unlock the next step.')).toBeNull();
        // And there is nothing left to press: the answer is on the diagram and
        // the way on is the track's own forward arrow, not a second one here.
        expect(screen.queryByRole('button', { name: 'Show me' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    });

    it('takes the question off the screen when the lesson moves on', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(ASK));
        answer(26);
        await user.click(check());
        await user.click(next());

        expect(row()).toBeNull();
    });

    /**
     * Coming back asks it again rather than showing a recorded verdict beside a
     * curve that has since moved. The record that survives is the track's, which
     * is why it does not re-block.
     */
    it('asks again on a return visit, without blocking the track', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(ASK));
        answer(26);
        await user.click(check());
        await user.click(next());
        await user.click(marker(ASK));

        expect(verdict()).toBe('');
        expect(screen.queryByText('Answer the question to unlock the next step.')).toBeNull();
    });
});

/**
 * A question that names its curve is what it was before P14.
 *
 * P14 lets a question offer a choice of curve. This lesson's does not, so it
 * has one candidate: one slider, under the name it always had, and nothing on
 * screen to move supply with. The rest of this file is the proof it marks as
 * before; this is the proof nothing new reached it.
 */
describe('a question that names its curve', () => {

    it('offers one slider, under the name it always had', async () => {
        mount();
        await userEvent.setup().click(marker(ASK));

        const sliders = within(row()!).getAllByRole('slider');
        expect(sliders).toHaveLength(1);
        expect(sliders[0].getAttribute('aria-label')).toBe('Your answer');
        expect(screen.getAllByRole('slider')).toEqual(sliders);
    });
});

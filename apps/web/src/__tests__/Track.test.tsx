import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import type { ReactElement } from 'react';
import { Track } from '../Track';
import type { LessonStep, TrackState } from '../track/track';
import { theme } from '../theme';

/**
 * The track as a control: typed markers, reachable from the keyboard, and a
 * position it reports rather than owns.
 *
 * What is deliberately not asserted here is where the position ends up. The
 * component reports where the student wants to go and the reducer decides — so
 * the clamping is tested against the reducer, once, in `track.test.ts`, and this
 * file tests that the request is made.
 */

const view = (ui: ReactElement) =>
    render(<MantineProvider theme={theme} env="test">{ui}</MantineProvider>);

const STEPS: LessonStep[] = [
    { reveal: ['demand'], say: 'Demand slopes down.' },
    { reveal: ['supply'] },
    { set: { a: 26 }, say: 'Incomes rise.' },
    { ask: { prompt: 'What happened to the price?' } }
];

const at = (position: number, resolved: number[] = []): TrackState => ({ position, resolved });

function mount(over: { state?: TrackState; steps?: LessonStep[]; onReset?: () => void } = {}) {
    const onGoTo = vi.fn();
    const result = view(
        <Track
            steps={over.steps ?? STEPS}
            state={over.state ?? at(0)}
            onGoTo={onGoTo}
            onReset={over.onReset}
        />
    );
    return { onGoTo, result };
}

/** The markers, in order, including the start. */
const markers = () => screen.getAllByRole('button')
    .filter(b => b.hasAttribute('data-kinds'));

describe('the track renders the lesson', () => {

    it('renders a marker for the start and one per step', () => {
        mount();
        expect(markers()).toHaveLength(STEPS.length + 1);
    });

    // The ordering is real information, and a step that brings a panel in is
    // not the same event as one that asks a question.
    it('types each marker by what its step does', () => {
        mount();
        const kinds = markers().map(m => m.getAttribute('data-kinds'));
        expect(kinds).toEqual(['', 'reveal say', 'reveal', 'set say', 'ask']);
    });

    it('says where the student is', () => {
        mount({ state: at(2) });
        expect(screen.getByText('2 / 4')).toBeTruthy();
        expect(markers()[2].getAttribute('aria-current')).toBe('step');
        expect(markers()[1].getAttribute('aria-current')).toBeNull();
    });

    it('marks the steps already passed', () => {
        mount({ state: at(2) });
        expect(markers().map(m => m.getAttribute('data-reached')))
            .toEqual(['true', 'true', 'true', 'false', 'false']);
    });

    // A screen reader gets the sentence the author wrote, not a description of
    // the machinery, whenever there is one to give.
    it('names a marker by its sentence where the step has one', () => {
        mount();
        expect(screen.getByLabelText('Step 1: Demand slopes down.')).toBeTruthy();
        expect(screen.getByLabelText('Step 2, adds to the diagram')).toBeTruthy();
    });

    it('renders nothing at all for a diagram with no lesson', () => {
        const { container } = view(<Track steps={[]} state={at(0)} onGoTo={vi.fn()} />);
        expect(container.querySelector('[role="group"]')).toBeNull();
    });
});

describe('moving along it', () => {

    it('steps forward and back', async () => {
        const { onGoTo } = mount({ state: at(2) });
        const user = userEvent.setup();

        await user.click(screen.getByLabelText('Next step'));
        expect(onGoTo).toHaveBeenLastCalledWith(3);

        await user.click(screen.getByLabelText('Previous step'));
        expect(onGoTo).toHaveBeenLastCalledWith(1);
    });

    it('jumps to a step that is clicked', async () => {
        const { onGoTo } = mount({ state: at(0) });
        await userEvent.setup().click(markers()[3]);
        expect(onGoTo).toHaveBeenCalledWith(3);
    });

    // A build-up you cannot return to the beginning of is a one-way animation
    // with extra steps.
    it('offers the start as a position', async () => {
        const { onGoTo } = mount({ state: at(3) });
        await userEvent.setup().click(markers()[0]);
        expect(onGoTo).toHaveBeenCalledWith(0);
    });

    it('is operable from the keyboard, markers included', async () => {
        const { onGoTo } = mount({ state: at(1) });
        const user = userEvent.setup();

        markers()[3].focus();
        await user.keyboard('{Enter}');
        expect(onGoTo).toHaveBeenCalledWith(3);

        await user.tab();               // reaches the next control in order
        await user.keyboard(' ');
        expect(onGoTo).toHaveBeenCalledWith(4);
    });

    it('cannot go back from the start or forward from the end', () => {
        mount({ state: at(0) });
        expect(screen.getByLabelText('Previous step').hasAttribute('disabled')).toBe(true);

        const done = STEPS.slice(0, 3);
        view(<Track steps={done} state={at(3)} onGoTo={vi.fn()} />);
        expect(screen.getAllByLabelText('Next step')[1].hasAttribute('disabled')).toBe(true);
    });
});

describe('a question stops it', () => {

    const QUIZ: LessonStep[] = [
        { reveal: ['demand'] },
        { ask: { prompt: 'What happened to the price?' } },
        { reveal: ['supply'] }
    ];

    const quiz = (state: TrackState) =>
        view(<Track steps={QUIZ} state={state} onGoTo={vi.fn()} />);

    it('will not advance past an unanswered question, and says so', () => {
        quiz(at(2));
        expect(screen.getByLabelText('Next step').hasAttribute('disabled')).toBe(true);
        expect(screen.getByText('Answer to continue.')).toBeTruthy();
    });

    it('dims the steps it cannot reach yet', () => {
        quiz(at(2));
        expect(markers().map(m => m.getAttribute('data-reachable')))
            .toEqual(['true', 'true', 'true', 'false']);
    });

    it('says nothing about answering once the question is answered', () => {
        quiz(at(2, [1]));
        expect(screen.queryByText('Answer to continue.')).toBeNull();
        expect(screen.getByLabelText('Next step').hasAttribute('disabled')).toBe(false);
    });

    // Nothing is being blocked when there is nothing after the question, so the
    // track says nothing. A lesson that ends on a question ends.
    it('says nothing when the question is the last step', () => {
        mount({ state: at(4) });
        expect(screen.queryByText('Answer to continue.')).toBeNull();
    });
});

describe('reset to this step', () => {

    // The escape hatch the scrub-back rule requires: going back leaves the
    // student's own values alone, so restoring the authored ones is a choice.
    it('is offered where a step established something', () => {
        mount({ state: at(3), onReset: vi.fn() });
        expect(screen.getByText('reset to this step')).toBeTruthy();
    });

    it('is absent where nothing up to here set anything', () => {
        mount({ state: at(2), onReset: vi.fn() });
        expect(screen.queryByText('reset to this step')).toBeNull();
    });

    it('is absent when the screen offers no handler', () => {
        mount({ state: at(3) });
        expect(screen.queryByText('reset to this step')).toBeNull();
    });

    it('calls back when pressed', async () => {
        const onReset = vi.fn();
        mount({ state: at(3), onReset });
        await userEvent.setup().click(screen.getByText('reset to this step'));
        expect(onReset).toHaveBeenCalled();
    });
});

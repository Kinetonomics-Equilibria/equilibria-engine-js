import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import type { ReactElement } from 'react';
import { LessonCard, LessonResume } from '../LessonCard';
import type { LessonStep, TrackState } from '../track/track';
import { partsOf } from '../track/track';
import { theme } from '../theme';

/**
 * The lesson card as a control: what it says at each step, the parts it groups
 * the steps into, and a position it reports rather than owns.
 *
 * What is deliberately not asserted here is where the position ends up. The
 * card reports where the student wants to go and the reducer decides — so the
 * clamping is tested against the reducer, once, in `track.test.ts`, and this
 * file tests that the request is made.
 */

const view = (ui: ReactElement) =>
    render(<MantineProvider theme={theme} env="test">{ui}</MantineProvider>);

/** The narrowest question P11 will grade: a param and a direction. */
const ASK = { param: 'a', direction: 'up' } as const;

const STEPS: LessonStep[] = [
    {
        part: 'Meet the market', reveal: ['demand'], title: 'Demand',
        say: 'Demand slopes down.\n\nWhen the price rises, people buy less.',
        term: { word: 'Demand', meaning: 'How much buyers want at each price.' }
    },
    { reveal: ['supply'], title: 'Supply' },
    { part: 'When it moves', set: { a: 26 }, title: 'Incomes rise', say: 'Incomes rise.' },
    { ask: ASK, title: 'Your turn', say: 'What happened to the price?' }
];

const GOALS = ['How a price is set', 'What moves it'];

const at = (position: number, resolved: number[] = []): TrackState => ({ position, resolved, outcomes: {} });

function mount(over: { state?: TrackState; steps?: LessonStep[] } = {}) {
    const onGoTo = vi.fn();
    const result = view(
        <LessonCard
            steps={over.steps ?? STEPS}
            state={over.state ?? at(0)}
            goals={GOALS}
            onGoTo={onGoTo}
        />
    );
    return { onGoTo, result };
}

/** The progress bar's markers, one per step, in order. */
const markers = () => within(screen.getByRole('group', { name: 'Lesson steps' })).getAllByRole('button');

const card = () => screen.getByRole('region', { name: 'Lesson' });
const back = () => screen.getByRole('button', { name: 'Back' });
const next = () => screen.getByRole('button', { name: /^(Next|Start lesson)$/ });

describe('the parts of a lesson', () => {

    it('runs each part from the step that names it to the step before the next', () => {
        expect(partsOf(STEPS)).toEqual([
            { title: 'Meet the market', first: 1, last: 2 },
            { title: 'When it moves', first: 3, last: 4 }
        ]);
    });

    // Every step belongs to one part, so a lesson that names none is one
    // untitled part rather than a lesson with no parts.
    it('puts steps before the first name in a part with no title', () => {
        expect(partsOf([{ title: 'x' }, { title: 'y', part: 'Two' }])).toEqual([
            { title: '', first: 1, last: 1 },
            { title: 'Two', first: 2, last: 2 }
        ]);
    });
});

describe('what the card says', () => {

    // Before the first step there is nothing drawn to talk about, so the card
    // says what the lesson is for: somewhere for the steps to go.
    it('opens on what the lesson is for, and a way to start', () => {
        mount();
        expect(within(card()).getByText('Before you start')).toBeTruthy();
        expect(within(card()).getByRole('heading', { name: 'In this lesson' })).toBeTruthy();
        GOALS.forEach(goal => expect(within(card()).getByText(goal)).toBeTruthy());
        expect(next().textContent).toBe('Start lesson');
    });

    it('shows the step\'s title, its words a paragraph at a time, and its key term', () => {
        mount({ state: at(1) });
        expect(within(card()).getByRole('heading', { name: 'Demand' })).toBeTruthy();
        const words = card().querySelector('[aria-live="polite"]')!;
        const paragraphs = [...words.querySelectorAll('p')].map(p => p.textContent);
        expect(paragraphs).toEqual(['Demand slopes down.', 'When the price rises, people buy less.']);
        expect(within(card()).getByText('Key term')).toBeTruthy();
        expect(within(card()).getByText('How much buyers want at each price.')).toBeTruthy();
    });

    it('says which part the student is in, and where they are within it', () => {
        mount({ state: at(3) });
        expect(within(card()).getByText('Part 2 of 2 · When it moves')).toBeTruthy();
        expect(within(card()).getByText('1 of 2')).toBeTruthy();
        expect(next().textContent).toBe('Next');
    });

    // The words are announced when they change, which is when the student moves
    // along: the step changes under the button they pressed, and this is the
    // same news for someone who cannot see it change.
    it('says each step\'s words from a live region', () => {
        mount({ state: at(1) });
        const live = card().querySelector('[aria-live="polite"]')!;
        expect(live.getAttribute('aria-atomic')).toBe('true');
        expect(live.textContent).toContain('Demand slopes down.');
    });

    it('shows the question it is handed under the step\'s words', () => {
        view(
            <LessonCard steps={STEPS} state={at(4)} goals={GOALS} onGoTo={vi.fn()}>
                <div role="group" aria-label="Question">answer here</div>
            </LessonCard>
        );
        expect(within(card()).getByText('What happened to the price?')).toBeTruthy();
        expect(within(card()).getByRole('group', { name: 'Question' }).textContent).toBe('answer here');
    });

    it('renders nothing at all for a diagram with no lesson', () => {
        const { container } = view(<LessonCard steps={[]} state={at(0)} goals={[]} onGoTo={vi.fn()} />);
        expect(container.querySelector('section')).toBeNull();
    });
});

describe('the progress bar', () => {

    it('has a marker for every step, grouped by part', () => {
        mount();
        expect(markers()).toHaveLength(STEPS.length);
        const groups = screen.getByRole('group', { name: 'Lesson steps' }).children;
        expect([...groups].map(g => g.querySelectorAll('button').length)).toEqual([2, 2]);
    });

    it('says where the student is', () => {
        mount({ state: at(2) });
        expect(markers()[1].getAttribute('aria-current')).toBe('step');
        expect(markers()[0].getAttribute('aria-current')).toBeNull();
    });

    it('marks the steps already passed', () => {
        mount({ state: at(2) });
        expect(markers().map(m => m.getAttribute('data-reached')))
            .toEqual(['true', 'true', 'false', 'false']);
    });

    // A question is the one kind of step that stops the lesson, so its marker
    // is the one that is told apart.
    it('tells a question\'s marker apart', () => {
        mount();
        expect(markers()[3].getAttribute('data-kinds')).toContain('ask');
        expect(markers()[2].getAttribute('data-kinds')).not.toContain('ask');
    });

    // The title, not the step's words: those are two paragraphs now, and would
    // be a long thing to hear on every marker.
    it('names each marker by its step\'s number and title', () => {
        mount();
        expect(screen.getByLabelText('Step 1 of 4: Demand')).toBeTruthy();
        expect(screen.getByLabelText('Step 4 of 4: Your turn')).toBeTruthy();
    });
});

describe('moving along', () => {

    it('steps forward and back', async () => {
        const { onGoTo } = mount({ state: at(2) });
        const user = userEvent.setup();

        await user.click(next());
        expect(onGoTo).toHaveBeenLastCalledWith(3);

        await user.click(back());
        expect(onGoTo).toHaveBeenLastCalledWith(1);
    });

    it('starts the lesson from the first page', async () => {
        const { onGoTo } = mount({ state: at(0) });
        await userEvent.setup().click(screen.getByRole('button', { name: 'Start lesson' }));
        expect(onGoTo).toHaveBeenCalledWith(1);
    });

    it('jumps to a step whose marker is clicked', async () => {
        const { onGoTo } = mount({ state: at(0) });
        await userEvent.setup().click(markers()[2]);
        expect(onGoTo).toHaveBeenCalledWith(3);
    });

    it('is operable from the keyboard, markers included', async () => {
        const { onGoTo } = mount({ state: at(1) });
        const user = userEvent.setup();

        markers()[2].focus();
        await user.keyboard('{Enter}');
        expect(onGoTo).toHaveBeenCalledWith(3);

        await user.tab();               // reaches the next control in order
        await user.keyboard(' ');
        expect(onGoTo).toHaveBeenCalledWith(4);
    });

    it('cannot go back from the start or forward from the end', () => {
        mount({ state: at(0) });
        expect(back().hasAttribute('disabled')).toBe(true);

        const done = STEPS.slice(0, 3);
        view(<LessonCard steps={done} state={at(3)} goals={GOALS} onGoTo={vi.fn()} />);
        expect(screen.getAllByRole('button', { name: 'Next' })[0].hasAttribute('disabled')).toBe(true);
    });
});

describe('a question stops it', () => {

    const QUIZ: LessonStep[] = [
        { reveal: ['demand'], title: 'Demand' },
        { ask: ASK, title: 'A question', say: 'What happened to the price?' },
        { reveal: ['supply'], title: 'Supply' }
    ];

    const quiz = (state: TrackState) =>
        view(<LessonCard steps={QUIZ} state={state} goals={GOALS} onGoTo={vi.fn()} />);

    const UNLOCK = 'Answer the question to unlock the next step.';

    it('will not advance past an unanswered question, and says what unlocks it', () => {
        quiz(at(2));
        expect(next().hasAttribute('disabled')).toBe(true);
        expect(screen.getByText(UNLOCK)).toBeTruthy();
    });

    // Marked out rather than greyed, and said in the name: a screen reader
    // otherwise hears a step it can press, and that then lands somewhere else.
    it('locks the steps it cannot reach yet, and says so', () => {
        quiz(at(2));
        expect(markers().map(m => m.getAttribute('data-reachable')))
            .toEqual(['true', 'true', 'false']);

        const locked = markers()[2];
        expect(locked.getAttribute('aria-label'))
            .toBe('Step 3 of 3: Supply (locked until the question before it is answered)');

        // Still a button, still pressable: it moves as far as the track will go.
        expect(locked.hasAttribute('disabled')).toBe(false);
    });

    it('unlocks them once the question is answered, and says nothing more about it', () => {
        quiz(at(2, [1]));
        expect(markers()[2].getAttribute('aria-label')).toBe('Step 3 of 3: Supply');
        expect(screen.queryByText(UNLOCK)).toBeNull();
        expect(next().hasAttribute('disabled')).toBe(false);
    });

    // Nothing is being blocked when there is nothing after the question, so the
    // card says nothing. A lesson that ends on a question ends.
    it('says nothing when the question is the last step', () => {
        mount({ state: at(4) });
        expect(screen.queryByText(UNLOCK)).toBeNull();
    });
});

/**
 * While a lesson runs the instruments are put away, and they come back when
 * the student leaves it. The card only asks; what leaving does to the diagram
 * is the screen's.
 */
describe('leaving the lesson', () => {

    function leaving(state: TrackState) {
        const onLeave = vi.fn(), onGoTo = vi.fn();
        view(<LessonCard steps={STEPS} state={state} goals={GOALS} onGoTo={onGoTo} onLeave={onLeave} />);
        return { onLeave, onGoTo };
    }

    it('is offered at every step, and asks the screen', async () => {
        const { onLeave } = leaving(at(2));
        await userEvent.setup().click(screen.getByRole('button', { name: 'Leave lesson' }));
        expect(onLeave).toHaveBeenCalled();
    });

    it('is a skip before the lesson has started', () => {
        leaving(at(0));
        expect(screen.getByRole('button', { name: 'Skip lesson' })).toBeTruthy();
    });

    // The last step's way on is out of the lesson: Next would have nowhere to go.
    it('finishes at the last step, in place of Next', async () => {
        const { onLeave, onGoTo } = leaving(at(STEPS.length, [3]));
        const finish = screen.getByRole('button', { name: 'Finish' });
        expect(finish.hasAttribute('disabled')).toBe(false);
        await userEvent.setup().click(finish);
        expect(onLeave).toHaveBeenCalled();
        expect(onGoTo).not.toHaveBeenCalled();
    });

    it('does not finish past a last question still waiting for its answer', () => {
        leaving(at(STEPS.length));
        expect(screen.getByRole('button', { name: 'Finish' }).hasAttribute('disabled')).toBe(true);
    });

    // Under the side column's tabs the instruments' tabs are the way out, so
    // the close goes; Finish stays, as the last step's way on.
    it('has no close under the tabs, and still finishes', () => {
        view(<LessonCard steps={STEPS} state={at(STEPS.length, [3])} goals={GOALS} onGoTo={vi.fn()} onLeave={vi.fn()} tabbed />);
        expect(screen.queryByRole('button', { name: /lesson$/ })).toBeNull();
        expect(screen.getByRole('button', { name: 'Finish' })).toBeTruthy();
    });

    it('offers neither without a handler', () => {
        mount({ state: at(STEPS.length, [3]) });
        expect(screen.queryByRole('button', { name: /lesson$/ })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Finish' })).toBeNull();
    });
});

describe('the lesson put away', () => {

    function resting(state: TrackState) {
        const onResume = vi.fn();
        view(<LessonResume steps={STEPS} state={state} onResume={onResume} />);
        return onResume;
    }

    it('says where the student left it, and takes them back', async () => {
        const onResume = resting(at(3));
        expect(within(card()).getByText('Step 3 of 4: Incomes rise')).toBeTruthy();
        await userEvent.setup().click(screen.getByRole('button', { name: 'Resume' }));
        expect(onResume).toHaveBeenCalled();
    });

    it('offers to start a lesson not yet begun', () => {
        resting(at(0));
        expect(within(card()).getByText('Not started')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Start lesson' })).toBeTruthy();
    });

    it('offers a finished lesson for review', () => {
        resting(at(STEPS.length, [3]));
        expect(within(card()).getByText('Finished')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Review' })).toBeTruthy();
    });
});

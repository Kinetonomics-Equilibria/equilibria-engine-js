import { describe, it, expect, beforeAll } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { StudyScreen } from '../StudyScreen';
import { DEMAND_LESSON, DEMAND_SHIFTERS } from '../lessons/demand';
import { theme } from '../theme';

/**
 * The Air Jordans lesson, held to what it says — with a real engine underneath.
 *
 * Its sentences quote quantities: "you buy 2", "fans want 250,000 pairs a
 * year". Those are claims about numbers the diagram solves to, so the check
 * is to walk the lesson and read the two charts' captions at each step, as
 * the café lesson's test does. Then what this lesson adds: the market taking
 * the front of the stage when it arrives, and questions where the price and
 * the curve are both on offer.
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
    <MantineProvider theme={theme} env="test"><StudyScreen content={DEMAND_SHIFTERS} /></MantineProvider>
);

/** The progress bar's marker for a step, by position (the first step is 1). */
const marker = (position: number) =>
    within(screen.getByRole('group', { name: 'Lesson steps' })).getAllByRole('button')[position - 1];

const next = () => screen.getByRole('button', { name: /^(Next|Start lesson)$/ });

/** A panel's chrome: its caption, name and number, and its role on the stage. */
const chrome = (key: string) =>
    document.querySelector(`[data-testid="stage-chrome"] [data-panel="${key}"]`) as HTMLElement | null;

const caption = (key: string) => (chrome(key) && chrome(key)!.textContent) || '';

/**
 * "What changed" with its whole chain open, as "See all" leaves it: the foot
 * says only the chain's two ends, and these steps are held to every clause.
 */
const chain = () => {
    const all = screen.queryByRole('button', { name: /^See (why|all \d+ changes|the numbers)/ });
    if (all) fireEvent.click(all);
    return screen.getByRole('region', { name: 'What changed' }).textContent || '';
};

const at = (title: string) => DEMAND_LESSON.findIndex(step => step.title === title) + 1;
const FIRST_QUESTION = DEMAND_LESSON.findIndex(step => !!step.ask) + 1;

const row = () => screen.getByRole('group', { name: 'Question' });
const verdict = () => row().querySelector('[role="status"]')!.textContent || '';

/** Move a param by the keyboard, on its slider in `within` — the only way to move one in jsdom. */
function press(scope: HTMLElement, name: string, key: 'ArrowRight' | 'ArrowLeft', times: number) {
    const control = within(scope).getByRole('slider', { name });
    control.focus();
    for (let i = 0; i < times; i++) fireEvent.keyDown(control, { key });
}

describe('the cover', () => {

    it('asks its question, and shows its parts as the track will draw them', () => {
        mount();
        const sheet = screen.getByRole('region', { name: 'About this lesson' });
        expect(within(sheet).getByRole('img').getAttribute('alt')).toMatch(/sneaker wall/);
        expect(within(sheet).getByRole('heading', { name: /want more Air Jordans\?$/ })).toBeTruthy();
        const parts = within(within(sheet).getByRole('list')).getAllByRole('listitem');
        expect(parts.map(part => part.textContent)).toEqual([
            '1 · Why demand slopes down5 steps',
            '2 · From you to the market3 steps',
            '3 · PETPIG: what shifts demand8 steps',
            '4 · Your turn4 questions'
        ]);
    });
});

describe('what each step says', () => {

    it('is what the two charts solve to, at every step before the questions', async () => {
        const user = userEvent.setup();
        mount();

        for (let position = 1; position < FIRST_QUESTION; position++) {
            await user.click(next());
            const said = DEMAND_LESSON[position - 1].say || '', where = `step ${position}: "${said}"`;

            // "so you buy 2", "You still buy 2".
            const mine = /[Yy]ou (?:still )?buy (\d)/.exec(said);
            if (mine) expect(caption('you'), where).toContain('Pairs you buy ' + mine[1]);

            // "fans want 250,000 pairs a year", "150,000 pairs at $300".
            const wanted = /(\d+),000 pairs/.exec(said);
            if (wanted) expect(caption('market'), where).toContain('Quantity demanded ' + wanted[1]);
        }
    });

    it('says nothing of the pairs bought until the price is on the chart', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(next());
        expect(caption('you')).not.toContain('Pairs you buy');

        await user.click(marker(at('Nike sets the price')));
        expect(caption('you')).toContain('Pairs you buy 2');
    });

    // The point slides along the curve, and the chain says so without a
    // word about the curve: the price moved, and the quantity followed.
    it('moves along the curve when the price changes, and shifts it for anything else', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(at('Quantity demanded')));
        await user.click(next());
        expect(chain()).toMatch(/Nike cuts its price\s*300\s*→\s*250/);
        expect(chain()).toMatch(/Quantity demanded rises\s*200\s*→\s*250/);
        expect(chain()).not.toMatch(/shifts/);

        await user.click(next());
        await user.click(next());
        expect(chain()).toMatch(/Demand for Air Jordans decreases\s*200\s*→\s*150/);
        expect(chain()).toMatch(/[Dd]emand shifts to the left/);
        expect(chain()).toMatch(/Quantity demanded falls\s*200\s*→\s*150/);
    });

    // More fans move the market's curve and none of the student's points:
    // the step says so, and the student's chart has to agree with it.
    it('leaves the student\'s own pairs where they were when the population grows', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(at('T: tastes and preferences')));
        const before = caption('you');
        await user.click(next());
        expect(DEMAND_LESSON[at('P: population') - 1].say).toContain('Your own points don\'t move');
        expect(caption('market')).toContain('Quantity demanded 250');
        expect(caption('you')).toBe(before);
    });
});

describe('the stage', () => {

    const role = (key: string) => chrome(key) && chrome(key)!.getAttribute('data-role');

    it('puts the student\'s chart at the front until the market arrives, then the market', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(next());
        expect(role('you')).toBe('focal');
        expect(chrome('market')).toBeNull();

        await user.click(marker(at('Nike sets the price')));
        await user.click(next());
        expect(role('market')).toBe('focal');
        expect(role('you')).toBe('rail');
    });

    it('puts the market at the front for a student who jumps straight to a question', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));
        expect(role('market')).toBe('focal');
    });

    // The student promoted their own chart; stepping on is not a reason to
    // take it away from them.
    it('leaves a panel the student promoted at the front as the lesson goes on', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(at('Quantity demanded')));
        await user.click(screen.getByRole('button', { name: 'Show You' }));
        expect(role('you')).toBe('focal');

        await user.click(next());
        expect(role('you')).toBe('focal');
    });
});

describe('the questions', () => {

    /** Answer the first question, so the track lets the student past it. */
    async function pastTheFirst(user: ReturnType<typeof userEvent.setup>) {
        await user.click(marker(FIRST_QUESTION));
        press(row(), 'Demand for Air Jordans', 'ArrowRight', 5);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        expect(verdict()).toContain('Correct');
        await user.click(screen.getByRole('button', { name: 'Continue' }));
    }

    it('offers the price and the curve, in the same order every time', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));
        expect(document.querySelector('[data-host-panel="wageNews"]')!.textContent)
            .toContain('Junior wages rise from 1 July');
        expect(within(row()).getAllByRole('slider').map(s => s.getAttribute('aria-label')))
            .toEqual(['The price', 'Demand for Air Jordans']);
    });

    it('marks Nike\'s own price cut as the price going down, with the curve left alone', async () => {
        const user = userEvent.setup();
        mount();
        await pastTheFirst(user);

        press(row(), 'The price', 'ArrowLeft', 5);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        expect(verdict()).toContain('Correct');
        expect(verdict()).toContain('You moved the price down, which is the right direction.');
        expect(caption('market')).toContain('Quantity demanded 250');
    });

    // The trap the question is for: a sale with a price in it, on another
    // brand. Moving the price is moving the wrong thing.
    it('tells a student who moves the price for New Balance\'s sale which one moves', async () => {
        const user = userEvent.setup();
        mount();
        await pastTheFirst(user);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        await user.click(screen.getByRole('button', { name: 'Show me' }));
        await user.click(screen.getByRole('button', { name: 'Continue' }));

        press(row(), 'The price', 'ArrowLeft', 5);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        expect(verdict()).toContain('This change moves demand for Air Jordans, so the price should stay where it was.');
    });
});

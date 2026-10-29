import { describe, it, expect, beforeAll } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { StudyScreen } from '../StudyScreen';
import { SUPPLY_LESSON, SUPPLY_SHIFTERS } from '../lessons/supply';
import { theme } from '../theme';

/**
 * The plane tickets lesson, held to what it says — with a real engine underneath.
 *
 * Its sentences quote quantities: "so you run 3", "airlines offer 250,000
 * seats a week". Those are claims about numbers the diagram solves to, so the
 * check is to walk the lesson and read the two charts' captions at each step,
 * as the Air Jordans lesson's test does. Then what this lesson adds: the
 * student's airline moving with the market's costs through PEANUT, and
 * staying put for a new airline and everywhere else.
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
    <MantineProvider theme={theme} env="test"><StudyScreen content={SUPPLY_SHIFTERS} /></MantineProvider>
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
    const all = screen.queryByRole('button', { name: /^See (all \d+ changes|the numbers)/ });
    if (all) fireEvent.click(all);
    return screen.getByRole('region', { name: 'What changed' }).textContent || '';
};

const at = (title: string) => SUPPLY_LESSON.findIndex(step => step.title === title) + 1;
const FIRST_QUESTION = SUPPLY_LESSON.findIndex(step => !!step.ask) + 1;

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
        expect(within(sheet).getByRole('img').getAttribute('alt')).toMatch(/departures board/);
        expect(within(sheet).getByRole('heading', { name: /offer more seats\?$/ })).toBeTruthy();
        const parts = within(within(sheet).getByRole('list')).getAllByRole('listitem');
        expect(parts.map(part => part.textContent)).toEqual([
            '1 · Why supply slopes up5 steps',
            '2 · From you to the market3 steps',
            '3 · PEANUT: what shifts supply8 steps',
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
            const said = SUPPLY_LESSON[position - 1].say || '', where = `step ${position}: "${said}"`;

            // "so you run 3", "And you now run 4".
            const mine = /[Yy]ou (?:now )?run (\d)/.exec(said);
            if (mine) expect(caption('you'), where).toContain('Flights you run ' + mine[1]);

            // "airlines offer 250,000 seats a week", "150,000 seats at $200".
            const offered = /(\d+),000 seats/.exec(said);
            if (offered) expect(caption('market'), where).toContain('Quantity supplied ' + offered[1]);
        }
    });

    it('says nothing of the flights run until the fare is on the chart', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(next());
        expect(caption('you')).not.toContain('Flights you run');

        await user.click(marker(at('The going fare')));
        expect(caption('you')).toContain('Flights you run 3');
    });

    // The point slides along the curve, and the chain says so without a
    // word about the curve: the fare moved, and the quantity followed.
    it('moves along the curve when the fare changes, and shifts it for anything else', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(at('Quantity supplied')));
        await user.click(next());
        expect(chain()).toMatch(/Fares rise\s*200\s*→\s*250/);
        expect(chain()).toMatch(/Quantity supplied rises\s*200\s*→\s*250/);
        expect(chain()).not.toMatch(/shifts/);

        await user.click(next());
        await user.click(next());
        expect(chain()).toMatch(/Supply of seats decreases\s*200\s*→\s*150/);
        expect(chain()).toMatch(/[Ss]upply shifts to the left/);
        expect(chain()).toMatch(/Quantity supplied falls\s*200\s*→\s*150/);
    });

    // Dearer fuel is dearer for the student's airline too: its flights need
    // more a seat, and the chain says it runs fewer.
    it('moves the student\'s own flights with the costs every airline pays', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(at('What shifts the whole curve')));
        expect(caption('you')).toContain('Flights you run 3');

        await user.click(next());
        expect(caption('you')).toContain('Flights you run 2');
        expect(chain()).toMatch(/You run fewer flights\s*3\s*→\s*2/);
    });

    // More airlines move the market's curve and none of the student's
    // points: the step says so, and the student's chart has to agree.
    it('leaves the student\'s own flights where they were when a new airline joins', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(at('A: a complement pays more')));
        const before = caption('you');
        await user.click(next());
        expect(SUPPLY_LESSON[at('N: number of sellers') - 1].say).toContain('Your own points don\'t move');
        expect(caption('market')).toContain('Quantity supplied 250');
        expect(caption('you')).toBe(before);
    });

    // The tax step says the curve rises by the tax: a shift of 50 thousand
    // seats is $50 on this curve, and each of the student's flights needs
    // $50 more a seat than it did a step before.
    it('lifts the curve by the tax', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(at('U: upgraded technology')));
        expect(caption('you')).toContain('Flights you run 4');
        await user.click(next());
        expect(caption('market')).toContain('Quantity supplied 250');
        expect(caption('you')).toContain('Flights you run 3');
    });

    // In the questions the student's chart is the one they met in part 1:
    // a curve moved there could be any letter, and only five are costs.
    it('puts the student\'s flights back at their own costs for the questions', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(at('T: taxes and subsidies')));
        await user.click(marker(FIRST_QUESTION));
        expect(caption('you')).toContain('Flights you run 3');
        press(row(), 'Supply of seats', 'ArrowLeft', 5);
        expect(caption('you')).toContain('Flights you run 3');
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

        await user.click(marker(at('The going fare')));
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
});

describe('the questions', () => {

    /** Answer the first question, so the track lets the student past it. */
    async function pastTheFirst(user: ReturnType<typeof userEvent.setup>) {
        await user.click(marker(FIRST_QUESTION));
        press(row(), 'Supply of seats', 'ArrowLeft', 5);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        expect(verdict()).toContain('Correct');
        await user.click(screen.getByRole('button', { name: 'Continue' }));
    }

    it('offers the fare and the curve, in the same order every time', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));
        expect(document.querySelector('[data-host-panel="airlineNews"]')!.textContent)
            .toContain('Budget airline grounds its planes');
        expect(within(row()).getAllByRole('slider').map(s => s.getAttribute('aria-label')))
            .toEqual(['The fare', 'Supply of seats']);
    });

    it('marks a rise in the fare as the fare going up, with the curve left alone', async () => {
        const user = userEvent.setup();
        mount();
        await pastTheFirst(user);

        press(row(), 'The fare', 'ArrowRight', 5);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        expect(verdict()).toContain('Correct');
        expect(verdict()).toContain('You moved the fare up, which is the right direction.');
        expect(caption('market')).toContain('Quantity supplied 250');
    });

    // The trap the question is for: a pay rise is a price rising, but not
    // the fare. Moving the fare is moving the wrong thing.
    it('tells a student who moves the fare for the pilots\' pay rise which one moves', async () => {
        const user = userEvent.setup();
        mount();
        await pastTheFirst(user);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        await user.click(screen.getByRole('button', { name: 'Show me' }));
        await user.click(screen.getByRole('button', { name: 'Continue' }));

        press(row(), 'The fare', 'ArrowRight', 5);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        expect(verdict()).toContain('This change moves supply of seats, so the fare should stay where it was.');
    });
});

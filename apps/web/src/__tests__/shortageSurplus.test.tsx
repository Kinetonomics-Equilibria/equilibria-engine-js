import { describe, it, expect, beforeAll } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { StudyScreen } from '../StudyScreen';
import { SHORTAGE_LESSON, SHORTAGES_AND_SURPLUSES } from '../lessons/shortage-surplus';
import { theme } from '../theme';

/**
 * The mangoes lesson, held to what it says — with a real engine underneath.
 *
 * Its sentences quote what buyers want and growers bring at a price, the gap
 * between them, and the price itself: claims about numbers the diagram
 * solves to, read here off the plot at each step, where the student reads
 * them. The two points' quantities are dropline values on the quantity axis,
 * the price is the price line's value or the equilibrium's on the price axis,
 * and the gap is the words between the two points.
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
    <MantineProvider theme={theme} env="test"><StudyScreen content={SHORTAGES_AND_SURPLUSES} /></MantineProvider>
);

/** The progress bar's marker for a step, by position (the first step is 1). */
const marker = (position: number) =>
    within(screen.getByRole('group', { name: 'Lesson steps' })).getAllByRole('button')[position - 1];

const next = () => screen.getByRole('button', { name: /^(Next|Start lesson)$/ });

const caption = () =>
    (document.querySelector('[data-testid="stage-chrome"] [data-panel="market"]') as HTMLElement | null)
        ?.textContent || '';

/** Whether anything between an element and the document hides it. */
function hidden(node: Element | null): boolean {
    for (; node; node = node.parentElement) {
        if ((node as HTMLElement).style && (node as HTMLElement).style.display === 'none') return true;
    }
    return false;
}

/** Every label the diagram is showing: the curves', the droplines' values on the axes, the gap's. */
const labels = () => [...document.querySelectorAll('.kg-container div[class^="rootElement-"]')]
    .filter(label => !hidden(label))
    .map(label => (label.textContent || '').trim());

/** The gap's words, if the plot is showing one. */
const gap = () => labels().filter(label => /^(Surplus|Shortage) of/.test(label));

/**
 * "What changed" with its whole chain open, as "See all" leaves it: the foot
 * says only the chain's two ends, and these steps are held to every clause.
 */
const chain = () => {
    const all = screen.queryByRole('button', { name: /^See (why|all \d+ changes|the numbers)/ });
    if (all) fireEvent.click(all);
    return screen.getByRole('region', { name: 'What changed' }).textContent || '';
};

const at = (title: string) => SHORTAGE_LESSON.findIndex(step => step.title === title) + 1;
const FIRST_QUESTION = SHORTAGE_LESSON.findIndex(step => !!step.ask) + 1;

const row = () => screen.getByRole('group', { name: 'Question' });
const verdict = () => row().querySelector('[role="status"]')!.textContent || '';

/** Move a param by the keyboard, on its slider in `within` — the only way to move one in jsdom. */
function press(scope: HTMLElement, name: string, key: 'ArrowRight' | 'ArrowLeft', times: number) {
    const control = within(scope).getByRole('slider', { name });
    control.focus();
    for (let i = 0; i < times; i++) fireEvent.keyDown(control, { key });
}

/** Every match of a pattern's first group in a step's words. */
const all = (pattern: RegExp, said: string) =>
    [...said.matchAll(new RegExp(pattern.source, 'g'))].map(match => match[1]);

describe('the cover', () => {

    it('asks its question, and shows its parts as the track will draw them', () => {
        mount();
        const sheet = screen.getByRole('region', { name: 'About this lesson' });
        expect(within(sheet).getByRole('heading', { name: 'What happens when the price is too high or too low?' }))
            .toBeTruthy();
        const parts = within(within(sheet).getByRole('list')).getAllByRole('listitem');
        expect(parts.map(part => part.textContent)).toEqual([
            '1 · When the price is too high5 steps',
            '2 · When the price is too low5 steps',
            '3 · When demand changes3 steps',
            '4 · Your turn4 questions'
        ]);
    });
});

describe('what each step says', () => {

    it('is what the plot shows, at every step before the questions', async () => {
        const user = userEvent.setup();
        mount();

        for (let position = 1; position < FIRST_QUESTION; position++) {
            await user.click(next());
            const said = SHORTAGE_LESSON[position - 1].say || '', where = `step ${position}: "${said}"`;
            const shown = labels();

            // "$4.00 a mango", "until the price reaches $3.00": the price
            // line's value, or the equilibrium's where it clears the market.
            all(/\$(\d\.\d\d)/, said).forEach(price => expect(shown, where).toContain(price));

            // "buyers want only 200 mangoes, but growers bring 400": the two
            // points' values on the quantity axis.
            all(/[Bb]uyers (?:now )?want (?:only )?(\d+) mangoes/, said)
                .concat(all(/growers bring (?:only )?(\d+)(?! more| fewer)/, said))
                .forEach(quantity => expect(shown, where).toContain(quantity));

            // "200 mangoes are left over", "the surplus shrinks to 350 − 250 =
            // 100 mangoes", "there is a shortage of 100".
            all(/(\d+) more mangoes than buyers want/, said)
                .concat(all(/surplus shrinks to \d+ − \d+ = (\d+)/, said))
                .forEach(n => expect(gap(), where).toEqual([`Surplus of ${n} mangoes`]));
            all(/(\d+) more mangoes than growers bring/, said)
                .concat(all(/shortage shrinks to \d+ − \d+ = (\d+)/, said))
                .concat(all(/a shortage of (\d+)/, said))
                .forEach(n => expect(gap(), where).toEqual([`Shortage of ${n} mangoes`]));

            // "nothing is left over", "the shortage is gone".
            if (/nothing is left over|is gone/.test(said)) expect(gap(), where).toEqual([]);

            // "the equilibrium price of $3.00", which the caption headlines.
            const clears = /equilibrium price of \$(\d\.\d\d)/.exec(said);
            if (clears) expect(caption(), where).toContain('Equilibrium price $' + clears[1]);
        }
    });

    // Each gap is named at a step of its own, after the price that makes it
    // is on the chart: until then the line runs on to the further point.
    it('draws a surplus and a shortage from the steps that name them', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(at('A surplus') - 1));
        await user.click(next());
        expect(gap()).toEqual(['Surplus of 200 mangoes']);

        await user.click(marker(at('The stalls open at $4.00')));
        expect(gap()).toEqual([]);

        await user.click(marker(at('A shortage') - 1));
        await user.click(next());
        expect(gap()).toEqual(['Shortage of 200 mangoes']);
    });

    // The price moved, and the two quantities and the gap followed: no
    // curve moved, so the chain says nothing about one.
    it('moves both sides along their curves when the price changes', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(next());
        await user.click(next());
        expect(chain()).toMatch(/The price rises\s*3\.00\s*→\s*4\.00/);
        expect(chain()).toMatch(/Quantity demanded falls\s*300\s*→\s*200/);
        expect(chain()).toMatch(/Quantity supplied rises\s*300\s*→\s*400/);
        expect(chain()).toMatch(/The surplus grows\s*0\s*→\s*200/);
        expect(chain()).not.toMatch(/shifts/);
    });

    // The market lesson's "the price is pushed up until the two match
    // again", stepped out: the shift leaves a shortage at the old price, and
    // the price that closes it is the new equilibrium.
    it('leaves a shortage at the old price when demand increases', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(at('Christmas is coming') - 1));
        await user.click(next());
        expect(chain()).toMatch(/Demand for mangoes increases\s*300\s*→\s*400/);
        expect(chain()).toMatch(/The shortage grows\s*0\s*→\s*100/);
        expect(chain()).toMatch(/The equilibrium price rises\s*\$3\.00\s*→\s*\$3\.50/);
        expect(caption()).toContain('Equilibrium price $3.50');

        await user.click(next());
        expect(chain()).toMatch(/The shortage shrinks\s*100\s*→\s*0/);
        expect(gap()).toEqual([]);
    });
});

describe('the questions', () => {

    it('offers the price and both curves, in the same order every time', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));
        expect(within(row()).getAllByRole('slider').map(s => s.getAttribute('aria-label')))
            .toEqual(['The price', 'Demand for mangoes', 'Supply of mangoes']);
        expect(gap()).toEqual(['Surplus of 300 mangoes']);
    });

    it('marks the price falling to where the surplus is gone', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));
        press(row(), 'The price', 'ArrowLeft', 3);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        expect(verdict()).toContain('Correct');
        expect(gap()).toEqual([]);
    });

    // A price pushed down past equilibrium swaps a surplus for a shortage.
    // Direction alone would mark it right; the target does not.
    it('does not mark a price pushed past equilibrium as right', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));
        press(row(), 'The price', 'ArrowLeft', 4);
        expect(gap()).toEqual(['Shortage of 100 mangoes']);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        expect(verdict()).not.toContain('Correct');
        expect(verdict()).toContain('You moved the price down, which is the right direction.');
    });

    // The trap the questions are for: a surplus is met by the price, not by
    // a curve. Growers bringing fewer is a shift nothing in the question
    // caused.
    it('tells a student who shifts supply to clear the surplus which one moves', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));
        press(row(), 'Supply of mangoes', 'ArrowLeft', 1);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        expect(verdict()).not.toContain('Correct');
        expect(verdict()).toMatch(/supply of mangoes should stay where it was/i);
    });
});

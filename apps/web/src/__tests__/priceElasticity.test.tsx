import { describe, it, expect, beforeAll } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { StudyScreen } from '../StudyScreen';
import { ELASTICITY_LESSON, PRICE_ELASTICITY } from '../lessons/elasticity';
import { firstQuestion, stepTitled } from '../lessons/kit/lesson';
import { formatValue } from '../narration/narrate';
import { theme } from '../theme';

/**
 * The price elasticity lesson, held to what it says — with a real engine
 * underneath.
 *
 * Its sentences quote numbers: "190 a day", "10% ÷ 20% = 0.50", "its revenue
 * rises by $100.00". Each is a claim about what the diagram solves to, so the
 * check is to walk the lesson and read the two charts' captions and "What
 * changed" at each step, as the Jordans lesson's test does. Then what this
 * lesson adds: a curve that pivots rather than shifts, the revenue panel
 * taking the front, and questions that ask for more revenue.
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
    <MantineProvider theme={theme} env="test"><StudyScreen content={PRICE_ELASTICITY} /></MantineProvider>
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

/** Where "What changed" says a number went: the "now" of its clause, or null before anything has moved. */
const now = (clause: RegExp) => {
    const found = new RegExp(clause.source + String.raw`\s*\$?(-?[\d.]+)\s*→\s*\$?(-?[\d.]+)`).exec(chain());
    return found && { was: found[1], is: found[2] };
};

const at = (title: string) => stepTitled(ELASTICITY_LESSON, title);
const FIRST_QUESTION = firstQuestion(ELASTICITY_LESSON);

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
        expect(within(sheet).getByRole('heading', { name: /bring the canteen more money\?$/ })).toBeTruthy();
        const parts = within(within(sheet).getByRole('list')).getAllByRole('listitem');
        expect(parts.map(part => part.textContent)).toEqual([
            '1 · How much buyers respond5 steps',
            '2 · Elasticity and revenue2 steps',
            '3 · When students have a choice5 steps',
            '4 · Your turn3 questions'
        ]);
    });
});

describe('what each step says', () => {

    it('is what the two charts solve to, at every step before the questions', async () => {
        const user = userEvent.setup();
        mount();

        // A number said before anything has moved is where the first move
        // starts from.
        let unmoved: string[] = [];

        for (let position = 1; position < FIRST_QUESTION; position++) {
            await user.click(next());
            const step = ELASTICITY_LESSON[position - 1];
            const said = step.say || '', where = `step ${position}: "${said}"`;

            const sold = now(/Quantity demanded (?:rises|falls)/);
            unmoved.forEach(n => expect(sold && sold.was, where).toBe(n));
            unmoved = [];

            // "students buy 210 a day", "it sells just 140 a day".
            (said.match(/(?<![\d.$])\d+(?= a day)/g) || []).forEach(n => {
                if (sold) expect(sold.is, where).toBe(n);
                else unmoved.push(n);
            });

            // "up to $5.50", "Back at $4.50": the price the step sets, as
            // "What changed" prints it.
            const price = (step.set as Record<string, number> | undefined || {}).price;
            if (price !== undefined) {
                const cents = formatValue(price, 2);
                expect(said, where).toContain('$' + cents);
                expect(now(/its price/)!.is, where).toBe(cents);
            }

            // "The price rose 20%, and quantity demanded fell 10%": each the
            // size of one of the two changes, which fell as it says.
            (said.match(/\d+(?=%)/g) || []).forEach(n => {
                const ofPrice = now(/% change in price/), ofQuantity = now(/% change in quantity demanded/);
                expect([ofPrice && ofPrice.is, ofQuantity && ofQuantity.is.replace(/^-/, '')], where).toContain(n);
            });

            // "10% ÷ 20% = 0.50".
            const elasticity = /= (\d\.\d\d)/.exec(said);
            if (elasticity) expect(caption('canteen'), where).toContain('Price elasticity ' + elasticity[1]);

            // "= $945.00 a day", "rises by $100.00", "falls by $175.00".
            const takes = /= \$(\d+\.\d\d)/.exec(said);
            if (takes) expect(caption('revenue'), where).toContain('Revenue$' + takes[1]);
            const by = /(rises|falls) by \$(\d+\.\d\d)/.exec(said);
            if (by) expect(caption('revenue'), where).toContain(`${by[1] === 'rises' ? '▲' : '▼'} $${by[2]}`);

            // "each dollar on the price now loses 70 sales, not 20".
            const loses = /loses (\d+) sales, not (\d+)/.exec(said);
            if (loses) expect(chain(), where).toMatch(new RegExp(`loses more sales\\s*${loses[2]}\\s*→\\s*${loses[1]}`));
        }
    });

    it('says nothing of the elasticity until the step that teaches it', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(at('Changes as percentages')));
        expect(caption('canteen')).not.toContain('Price elasticity');

        await user.click(next());
        expect(caption('canteen')).toContain('Price elasticity 0.50');
    });

    // The bakery pivots the curve about where the canteen starts: at $4.50 it
    // sells as many as before, and "What changed" says the curve got flatter,
    // not that it shifted.
    it('pivots the curve when the bakery opens, and leaves the start where it was', async () => {
        const user = userEvent.setup();
        mount();
        // From the step before, where the curve is on the chart: from the
        // cover, where it is not yet drawn, there is nothing to measure the
        // turn against.
        await user.click(marker(at('A bakery opens across the road') - 1));
        await user.click(next());
        expect(chain()).toMatch(/demand gets flatter/);
        expect(chain()).not.toMatch(/shifts/);
        expect(caption('revenue')).toContain('Revenue$945.00');
    });
});

describe('the stage', () => {

    const role = (key: string) => chrome(key) && chrome(key)!.getAttribute('data-role');

    it('puts the canteen at the front until revenue arrives, then revenue', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(next());
        expect(role('canteen')).toBe('focal');
        expect(chrome('revenue')).toBeNull();

        await user.click(marker(at('The canteen\'s revenue')));
        expect(role('revenue')).toBe('focal');
        expect(role('canteen')).toBe('rail');
    });

    it('puts revenue at the front for a student who jumps straight to a question', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));
        expect(role('revenue')).toBe('focal');
    });
});

describe('the questions', () => {

    /** Answer the first question, so the track lets the student past it. */
    async function pastTheFirst(user: ReturnType<typeof userEvent.setup>) {
        await user.click(marker(FIRST_QUESTION));
        press(row(), 'Sales lost per $1', 'ArrowLeft', 5);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        expect(verdict()).toContain('Correct');
        await user.click(screen.getByRole('button', { name: 'Continue' }));
    }

    it('offers the price and the curve, in the same order every time', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));
        expect(within(row()).getAllByRole('slider').map(s => s.getAttribute('aria-label')))
            .toEqual(['The price', 'Sales lost per $1']);
    });

    it('marks keeping students in as the curve getting steeper, with the price left alone', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));
        press(row(), 'Sales lost per $1', 'ArrowLeft', 5);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        expect(verdict()).toContain('Correct');
        expect(verdict()).toContain('You moved sales lost per $1 down, which is the right direction.');
    });

    // With the bakery open a cut brings in more, and the explanation's
    // numbers are the ones the diagram reaches at the cut "Show me" draws.
    it('marks a price cut right with the bakery open, at the numbers its explanation gives', async () => {
        const user = userEvent.setup();
        mount();
        await pastTheFirst(user);

        press(row(), 'The price', 'ArrowLeft', 5);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        expect(verdict()).toContain('Correct');
        expect(verdict()).toContain('You moved the price down, which is the right direction.');
        const explain = ELASTICITY_LESSON[at('More money, with the bakery open') - 1].ask!.explain!;
        expect(explain).toContain('at $4.00 the canteen sells 245 a day and takes $980.00');
        expect(caption('revenue')).toContain('Revenue$980.00');
        expect(now(/Quantity demanded (?:rises|falls)/)!.is).toBe('245');
    });

    // The trap: a seller after more revenue raises its price. With elastic
    // demand that is the wrong way.
    it('tells a student who raises the price with the bakery open that it goes the other way', async () => {
        const user = userEvent.setup();
        mount();
        await pastTheFirst(user);

        press(row(), 'The price', 'ArrowRight', 5);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        expect(verdict()).not.toContain('Correct');
        expect(verdict()).toMatch(/price/);
    });

    it('marks a price rise right with no bakery, at the numbers its explanation gives', async () => {
        const user = userEvent.setup();
        mount();
        await pastTheFirst(user);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        await user.click(screen.getByRole('button', { name: 'Show me' }));
        await user.click(screen.getByRole('button', { name: 'Continue' }));

        // "$100.00 more" than the question starts at. The chip says only the
        // last of ten presses, so the two captions are read instead.
        expect(caption('revenue')).toContain('Revenue$945.00');
        press(row(), 'The price', 'ArrowRight', 10);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        expect(verdict()).toContain('Correct');
        const explain = ELASTICITY_LESSON[at('More money, with no bakery') - 1].ask!.explain!;
        expect(explain).toContain('at $5.50 the canteen sells 190 a day and takes $100.00 more');
        expect(caption('revenue')).toContain('Revenue$1045.00');
        expect(now(/Quantity demanded (?:rises|falls)/)!.is).toBe('190');
    });
});

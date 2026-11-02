import { describe, it, expect, beforeAll } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { StudyScreen } from '../StudyScreen';
import { TERMS_OF_TRADE, TERMS_OF_TRADE_LESSON } from '../lessons/terms-of-trade';
import { firstQuestion, stepTitled } from '../lessons/kit/lesson';
import { theme } from '../theme';

/**
 * The terms of trade lesson, held to what it says — with a real engine
 * underneath.
 *
 * Its sentences quote numbers: "100 ÷ 125 × 100 = 80", "the price falls to
 * 140", "export revenue rises to 224". Each is a claim about what the diagram
 * solves to, so the check is to walk the lesson and read the three charts'
 * captions and "What changed" at each step, as the elasticity lesson's test
 * does. Then what this lesson adds: a line that three params turn, the panel
 * at the front following the move, and a question that asks how far.
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
    <MantineProvider theme={theme} env="test"><StudyScreen content={TERMS_OF_TRADE} /></MantineProvider>
);

/** The progress bar's marker for a step, by position (the first step is 1). */
const marker = (position: number) =>
    within(screen.getByRole('group', { name: 'Lesson steps' })).getAllByRole('button')[position - 1];

const next = () => screen.getByRole('button', { name: /^(Next|Start lesson)$/ });

/** A panel's chrome: its caption, name and number, and its role on the stage. */
const chrome = (key: string) =>
    document.querySelector(`[data-testid="stage-chrome"] [data-panel="${key}"]`) as HTMLElement | null;

const caption = (key: string) => (chrome(key) && chrome(key)!.textContent) || '';

/** The number a caption headlines, up to its chip: "Terms of trade180▲ 80". */
const headline = (key: string, name: string) => {
    const found = new RegExp(name + String.raw`\s*(\d+)`).exec(caption(key));
    return found && found[1];
};

const role = (key: string) => chrome(key) && chrome(key)!.getAttribute('data-role');

/**
 * "What changed" with its whole chain open, as "See all" leaves it: the foot
 * says only the chain's two ends, and these steps are held to every clause.
 */
const chain = () => {
    const all = screen.queryByRole('button', { name: /^See (why|all \d+ changes|the numbers)/ });
    if (all) fireEvent.click(all);
    return screen.getByRole('region', { name: 'What changed' }).textContent || '';
};

/** Where "What changed" says a number went: the "now" of its clause, or null before anything has moved. */
const now = (clause: RegExp) => {
    const found = new RegExp(clause.source + String.raw`\s*(\d+)\s*→\s*(\d+)`).exec(chain());
    return found && found[2];
};

const at = (title: string) => stepTitled(TERMS_OF_TRADE_LESSON, title);
const FIRST_QUESTION = firstQuestion(TERMS_OF_TRADE_LESSON);

const row = () => screen.getByRole('group', { name: 'Question' });
const verdict = () => row().querySelector('[role="status"]')!.textContent || '';

/** Move a param by the keyboard, on its slider in `within` — the only way to move one in jsdom. */
function press(scope: HTMLElement, name: string, key: 'ArrowRight' | 'ArrowLeft', times: number) {
    const control = within(scope).getByRole('slider', { name });
    control.focus();
    for (let i = 0; i < times; i++) fireEvent.keyDown(control, { key });
}

/** Finish `questions` questions by having each shown, so the track lets the student past them. */
async function past(user: ReturnType<typeof userEvent.setup>, questions: number) {
    await user.click(marker(FIRST_QUESTION));
    for (let i = 0; i < questions; i++) {
        await user.click(screen.getByRole('button', { name: 'Check' }));
        await user.click(screen.getByRole('button', { name: 'Show me' }));
        await user.click(screen.getByRole('button', { name: 'Continue' }));
    }
}

describe('the cover', () => {

    it('asks its question, and shows its parts as the track will draw them', () => {
        mount();
        const sheet = screen.getByRole('region', { name: 'About this lesson' });
        expect(within(sheet).getByRole('img').getAttribute('alt')).toMatch(/ore carrier/);
        expect(within(sheet).getByRole('heading', { name: /shipload of iron ore buy\?$/ })).toBeTruthy();
        const parts = within(within(sheet).getByRole('list')).getAllByRole('listitem');
        expect(parts.map(part => part.textContent)).toEqual([
            '1 · What the terms of trade are7 steps',
            '2 · The boom5 steps',
            '3 · After the boom4 steps',
            '4 · Your turn4 questions'
        ]);
    });
});

describe('what each step says', () => {

    it('is what the three charts solve to, at every step before the questions', async () => {
        const user = userEvent.setup();
        mount();

        for (let position = 1; position < FIRST_QUESTION; position++) {
            await user.click(next());
            const said = TERMS_OF_TRADE_LESSON[position - 1].say || '', where = `step ${position}: "${said}"`;

            // "100 ÷ 125 × 100 = 80": export prices, import prices, the answer.
            const sum = /(\d+) ÷ (\d+) × 100 = (\d+)/.exec(said);
            if (sum) {
                expect(Number(sum[3]), where).toBe(Math.round(100 * Number(sum[1]) / Number(sum[2])));
                expect(headline('market', 'Export prices'), where).toBe(sum[1]);
                expect(headline('trade', 'Terms of trade'), where).toBe(sum[3]);
            }

            // "rise to 125", "fall to 80", "settle back at 100".
            const imports = /[Ii]mport prices (?:rise to|fall to|settle back at) (\d+)/.exec(said);
            if (imports) expect(now(/Import prices (?:rise|fall)/), where).toBe(imports[1]);

            // "now buy 80", "now buy 180 baskets of imports".
            const buys = /100 baskets of exports (?:now )?buy(?:ing)? (\d+)/.exec(said);
            if (buys) expect(headline('trade', 'Terms of trade'), where).toBe(buys[1]);

            // "The terms of trade fall to 140", "settle at 120".
            const terms = /[Tt]erms of trade (?:fall to|settle at) (\d+)/.exec(said);
            if (terms) expect(headline('trade', 'Terms of trade'), where).toBe(terms[1]);

            // "the price nearly doubles to 180", "The price falls to 140".
            const price = /[Pp]rice (?:nearly doubles|falls) to (\d+)/.exec(said);
            if (price) expect(headline('market', 'Export prices'), where).toBe(price[1]);

            // "Volume edges up to 120", "volume jumps to 160".
            const volume = /[Vv]olume (?:edges up|jumps) to (\d+)/.exec(said);
            if (volume) expect(now(/Export volume (?:rises|falls)/), where).toBe(volume[1]);

            // "Now it's 216", "export revenue rises to 224".
            const revenue = /(?:Now it's|revenue rises to) (\d+)/.exec(said);
            if (revenue) expect(headline('revenue', 'Export revenue'), where).toBe(revenue[1]);
        }
    });

    // The turn of the cycle: the one move in the lesson where the two numbers
    // go opposite ways, which is the step's whole point.
    it('has the terms of trade fall as export revenue rises, once the mines open', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(at('New mines open') - 1));
        await user.click(next());
        expect(chain()).toMatch(/The terms of trade fall\s*180\s*→\s*140/);
        expect(chain()).toMatch(/Export revenue rises\s*216\s*→\s*224/);
    });

    // A step that quotes "the peak" and "where they began" does so in words,
    // because neither is on the screen by then. So each has to be true.
    it('settles above where it began and below the peak', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(at('A new normal')));
        const settled = Number(headline('trade', 'Terms of trade'));
        expect(settled).toBeGreaterThan(100);
        expect(settled).toBeLessThan(180);
    });

    // Three params turn one line, and "What changed" says it turned, not
    // that anything shifted, beside the curve that did.
    it('turns the line for import prices, and for the market', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(at('Imports get dearer') - 1));
        await user.click(next());
        expect(chain()).toMatch(/terms of trade line gets flatter/);
        expect(chain()).not.toMatch(/shifts/);

        await user.click(marker(at('China starts building') - 1));
        await user.click(next());
        expect(chain()).toMatch(/demand shifts to the right/);
        expect(chain()).toMatch(/terms of trade line gets steeper/);
    });

    // The student gets the slider for a step, and the next step puts import
    // prices back, whatever they did with it.
    it('hands the student import prices, and takes them back', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(at('Imports get cheaper')));
        press(document.body, 'Import prices', 'ArrowRight', 2);
        await user.click(next());
        expect(headline('trade', 'Terms of trade')).toBe('100');
    });
});

describe('the stage', () => {

    it('keeps the terms of trade and export revenue off it until the steps that bring them', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(at('What Australia buys')));
        expect(chrome('trade')).toBeNull();

        await user.click(next());
        expect(role('trade')).toBe('focal');
        expect(role('market')).toBe('rail');
        expect(chrome('revenue')).toBeNull();
    });

    it('brings to the front the chart each step is about', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(at('China starts building')));
        expect(role('market')).toBe('focal');
        await user.click(marker(at('The terms of trade soar')));
        expect(role('trade')).toBe('focal');
        await user.click(marker(at('More money coming in')));
        expect(role('revenue')).toBe('focal');
        await user.click(marker(at('New mines open')));
        expect(role('market')).toBe('focal');
    });

    // At the front for all of them, so where the eye is sent gives nothing away.
    it('puts the market at the front for every question', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));
        expect(role('market')).toBe('focal');
        await past(user, 1);
        expect(role('market')).toBe('focal');
    });
});

describe('the questions', () => {

    it('offers all three, in the same order every time', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));
        expect(within(row()).getAllByRole('slider').map(s => s.getAttribute('aria-label')))
            .toEqual(['Demand for commodities', 'Supply of commodities', 'Import prices']);
    });

    it('marks a cyclone as supply shifting left, and lifts the terms of trade', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));
        press(row(), 'Supply of commodities', 'ArrowLeft', 4);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        expect(verdict()).toContain('Correct');
        expect(verdict()).toContain('You moved supply of commodities left, which is the right direction.');
        expect(headline('trade', 'Terms of trade')).toBe('116');
    });

    // The report never says "import prices", so a student reaching for the
    // market is told which one it was.
    it('tells a student who moves demand for dearer phones that it was import prices', async () => {
        const user = userEvent.setup();
        mount();
        await past(user, 1);
        press(row(), 'Demand for commodities', 'ArrowRight', 4);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        expect(verdict()).not.toContain('Correct');
        expect(verdict()).toMatch(/import prices/);
    });

    it('shows the report beside the question it is part of, and no other', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));
        expect(screen.queryByText(/Phones, laptops and cars cost more/)).toBeNull();
        await past(user, 1);
        expect(screen.getByText(/Phones, laptops and cars cost more/)).toBeTruthy();
        expect(screen.getByText(/A made-up report/)).toBeTruthy();
    });

    it('marks dearer imports as lowering the terms of trade', async () => {
        const user = userEvent.setup();
        mount();
        await past(user, 1);
        press(row(), 'Import prices', 'ArrowRight', 5);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        expect(verdict()).toContain('Correct');
        expect(headline('trade', 'Terms of trade')).toBe('80');
    });

    // The one that asks how far: the explanation's sum is the diagram's.
    it('starts the last at 120 and wants import prices at 120, which is back to 100', async () => {
        const user = userEvent.setup();
        mount();
        await past(user, 3);
        expect(headline('trade', 'Terms of trade')).toBe('120');
        expect(TERMS_OF_TRADE_LESSON[at('Prices catch up') - 1].ask!.explain).toContain('120 ÷ 120 × 100 = 100');

        press(row(), 'Import prices', 'ArrowRight', 4);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        expect(verdict()).toContain('Correct');
        expect(headline('trade', 'Terms of trade')).toBe('100');
    });

    it('does not take a move part of the way there', async () => {
        const user = userEvent.setup();
        mount();
        await past(user, 3);
        press(row(), 'Import prices', 'ArrowRight', 2);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        expect(verdict()).not.toContain('Correct');
    });
});

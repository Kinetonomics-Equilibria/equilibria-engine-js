import { describe, it, expect, beforeAll } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { StudyScreen } from '../StudyScreen';
import { PPC_LESSON, PRODUCTION_POSSIBILITIES } from '../lessons/productionPossibilities';
import { theme } from '../theme';

/**
 * The café lesson, held to what it says — with a real engine underneath.
 *
 * Its sentences quote what things cost: "gives up 40 coffees", "6 coffees a
 * toastie", "up to 250 coffees". Those are claims about numbers the diagram
 * solves to, so the check is to walk the lesson and read the diagram's own
 * caption, readout and labels at each step, as the A$ lesson's test does.
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
    <MantineProvider theme={theme} env="test"><StudyScreen content={PRODUCTION_POSSIBILITIES} /></MantineProvider>
);

/** The progress bar's marker for a step, by position (the first step is 1). */
const marker = (position: number) =>
    within(screen.getByRole('group', { name: 'Lesson steps' })).getAllByRole('button')[position - 1];

const next = () => screen.getByRole('button', { name: /^(Next|Start lesson)$/ });

/** The panel's caption, name and number. */
const caption = () =>
    document.querySelector('[data-testid="stage-chrome"] [data-panel="cafe"]')!.textContent || '';

/** Whether anything between an element and the document hides it. */
function hidden(node: Element | null): boolean {
    for (; node; node = node.parentElement) {
        if ((node as HTMLElement).style && (node as HTMLElement).style.display === 'none') return true;
    }
    return false;
}

/** Every label the diagram is showing: the readout, the step's legs, Z's, the letters. */
const labels = () => [...document.querySelectorAll('.kg-container div[class^="rootElement-"]')]
    .filter(label => !hidden(label))
    .map(label => label.textContent || '');

const chain = () => screen.getByRole('region', { name: 'What changed' }).textContent || '';

const at = (title: string) => PPC_LESSON.findIndex(step => step.title === title) + 1;
const FIRST_QUESTION = PPC_LESSON.findIndex(step => !!step.ask) + 1;

const row = () => screen.getByRole('group', { name: 'Question' });
const verdict = () => row().querySelector('[role="status"]')!.textContent || '';

/** Move a param by the keyboard, on its slider in `within` — the only way to move one in jsdom. */
function press(scope: HTMLElement, name: string, key: 'ArrowRight' | 'ArrowLeft', times: number) {
    const control = within(scope).getByRole('slider', { name });
    control.focus();
    for (let i = 0; i < times; i++) fireEvent.keyDown(control, { key });
}

describe('the cover', () => {

    it('shows the café, its question, and its parts as the track will draw them', () => {
        mount();
        const sheet = screen.getByRole('region', { name: 'About this lesson' });
        expect(within(sheet).getByRole('img').getAttribute('alt')).toMatch(/café counter/);
        expect(within(sheet).getByRole('heading', { name: /less of another\?$/ })).toBeTruthy();
        const parts = within(within(sheet).getByRole('list')).getAllByRole('listitem');
        expect(parts.map(part => part.textContent)).toEqual([
            '1 · What the café can make5 steps',
            '2 · What each choice costs5 steps',
            '3 · What the curve assumes5 steps',
            '4 · Your turn4 questions'
        ]);
    });
});

describe('what each step says it costs', () => {

    /** The cost of a toastie at each step that quotes one, as the caption prints it. */
    const COSTS: Record<string, string> = {
        'Twenty more toasties': '2.0',
        'The cost of one toastie': '2.0',
        'The first toasties are cheap': '0.2',
        'The last toasties are dear': '6.0',
        'If everyone were equally good': '2.0',
        'Every model simplifies': '2.0'
    };

    /** Where Z is against the curve at each step that shows it. */
    const Z_IS: Record<string, string> = {
        'Inside the curve': 'Z · inefficient',
        'On the curve': 'Z · efficient',
        'Outside the curve': 'Z · unattainable',
        'Full employment': 'Z · inefficient'
    };

    it('is what the diagram solves to, at every step before the questions', async () => {
        const user = userEvent.setup();
        mount();

        for (let position = 1; position < FIRST_QUESTION; position++) {
            await user.click(next());
            const step = PPC_LESSON[position - 1], said = step.say || '', where = `step ${position}: "${said}"`;

            if (COSTS[step.title!]) {
                expect(caption(), where).toContain('Coffees per toastie ' + COSTS[step.title!]);
                expect(labels(), where).toContain(`1 more toastie costs ${COSTS[step.title!]} coffees`);
            }

            // "A: 60 toasties and 160 coffees", and B the same.
            const a = /A: (\d+) toasties and (\d+) coffees/.exec(said),
                b = /B: (\d+) toasties and (\d+) coffees/.exec(said);
            if (a && b) {
                expect(labels(), where).toContain(`A (${a[1]}, ${a[2]}) → B (${b[1]}, ${b[2]})`);
            }

            // "gives up 40 coffees": the step's leg says the same.
            const given = /gives up (?:just )?(\d+) coffees/.exec(said);
            if (given) expect(labels(), where).toContain(`−${given[1]} coffees`);

            const z = labels().filter(label => /^Z · /.test(label));
            expect(z, where).toEqual(Z_IS[step.title!] ? [Z_IS[step.title!]] : []);
        }
    });

    it('says the curve reaches as far as the step says it does', async () => {
        const user = userEvent.setup();
        mount();

        await user.click(marker(at('Every model simplifies')));
        await user.click(next());
        expect(PPC_LESSON[at('Fixed resources') - 1].say).toContain('up to 250 coffees or 125 toasties');
        expect(chain()).toMatch(/more coffees\s*200\s*→\s*250/);
        expect(chain()).toMatch(/more toasties\s*100\s*→\s*125/);

        await user.click(next());
        expect(PPC_LESSON[at('Fixed technology') - 1].say).toContain('up to 300 coffees, but still only 100 toasties');
        expect(chain()).toMatch(/more coffees\s*250\s*→\s*300/);
        expect(chain()).toMatch(/fewer toasties\s*125\s*→\s*100/);
    });

    // A step whose params are already where it puts them raises no change of
    // its own, and the chain used to stay on the step before's move: here,
    // Z going outside the curve, at a step where Z has been put away.
    it('says nothing has changed at a step that changed nothing', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(at('On the curve')));
        await user.click(next());
        expect(chain()).toMatch(/Toasties at Z\s*60\s*→\s*100/);

        await user.click(next());
        expect(chain()).not.toContain('Toasties at Z');
    });
});

describe('the move from A to B', () => {

    /** Put the lesson away, as Finish or the Explore tab does. */
    async function explore(user: ReturnType<typeof userEvent.setup>) {
        await user.click(screen.getByRole('tab', { name: 'Explore' }));
        return screen.getByRole('tabpanel', { name: 'Explore' });
    }

    it('starts apart for a student who goes straight to the instruments', async () => {
        const user = userEvent.setup();
        mount();
        await explore(user);
        expect(labels()).toContain('A (60, 160) → B (80, 120)');
        expect(caption()).toContain('Coffees per toastie 2.0');
    });

    // Going left the café gains coffees, so the cost is a coffee's, in toasties.
    it('costs a coffee in toasties when B is left of A', async () => {
        const user = userEvent.setup();
        mount();
        press(await explore(user), 'Toasties at B', 'ArrowLeft', 10);

        expect(labels()).toContain('A (60, 160) → B (30, 191)');
        expect(labels()).toContain('−30 toasties');
        expect(labels()).toContain('+31 coffees');
        expect(labels()).toContain('1 more coffee costs 1.0 toasties');
        expect(labels().some(label => /toastie costs/.test(label))).toBe(false);
    });

    // 29 coffees for 20 toasties is 1.45, a tie at a tenth. The caption and
    // the readout are printed by two formatters that break a tie differently,
    // and said 1.4 and 1.5 side by side until the cost was rounded once.
    it('says the same cost in the caption and on the diagram, even on a tie', async () => {
        const user = userEvent.setup();
        mount();
        await explore(user);
        await user.click(screen.getByRole('tab', { name: 'Scenarios' }));
        await user.click(screen.getByRole('button', { name: /Customers order on an app/ }));

        expect(labels()).toContain('A (60, 208) → B (80, 179)');
        expect(caption()).toContain('Coffees per toastie 1.5');
        expect(labels()).toContain('1 more toastie costs 1.5 coffees');
    });
});

describe('the questions', () => {

    it('puts A, B and Z away, and offers the same three changes every time', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));

        expect(labels().filter(label => /^(A|B|Z)\b/.test(label))).toEqual([]);
        expect(caption()).not.toContain('Coffees per toastie');
        expect(document.querySelector('[data-host-panel="noticeboard"]')!.textContent)
            .toContain('New sandwich press arrives Friday');
        expect(within(row()).getAllByRole('slider').map(s => s.getAttribute('aria-label')))
            .toEqual(['Work hours', 'Coffees an hour', 'Toasties an hour']);
    });

    it('marks a faster press as toasties an hour going up', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));

        press(row(), 'Toasties an hour', 'ArrowRight', 2);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        expect(verdict()).toContain('Correct');
        expect(verdict()).toContain('You moved toasties an hour up, which is the right direction.');
        expect(chain()).toMatch(/Toastie-making gets faster/);
    });

    it('tells a student who slows the coffee for staff off sick which one moves', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));
        await user.click(screen.getByRole('button', { name: 'Check' }));
        await user.click(screen.getByRole('button', { name: 'Show me' }));
        await user.click(screen.getByRole('button', { name: 'Continue' }));

        press(row(), 'Coffees an hour', 'ArrowLeft', 3);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        expect(verdict()).toContain('This change moves work hours, so coffees an hour should stay where it was.');
    });
});

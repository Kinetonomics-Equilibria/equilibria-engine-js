import { describe, it, expect, beforeAll } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { StudyScreen } from '../StudyScreen';
import { FOREIGN_EXCHANGE, FX_LESSON } from '../lessons/foreignExchange';
import { theme } from '../theme';

/**
 * The A$ lesson, held to what it says — with a real engine underneath.
 *
 * Its sentences quote exchange rates: "A$1 now buys US$0.70", "US$1 costs
 * A$1.43". Those are claims about numbers the diagram solves to, and the only
 * honest check is to walk the lesson and read the diagram's own captions at
 * each step. A fixture would be testing itself.
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
    <MantineProvider theme={theme} env="test"><StudyScreen content={FOREIGN_EXCHANGE} /></MantineProvider>
);

const marker = (position: number) => screen.getAllByRole('button')
    .filter(b => b.hasAttribute('data-kinds'))[position];

/** What a panel's caption says, name and number. Empty before it has arrived. */
const caption = (panel: 'market' | 'mirror') => {
    const node = document.querySelector(`[data-testid="stage-chrome"] [data-panel="${panel}"]`);
    return node ? node.textContent || '' : '';
};

/** The first question: the RBA, and demand for A$. */
const FIRST_QUESTION = FX_LESSON.findIndex(step => !!step.ask) + 1;

const row = () => screen.getByRole('group', { name: 'Question' });
const verdict = () => row().querySelector('[role="status"]')!.textContent || '';

type Curve = 'Demand for A$' | 'Supply of A$';

/**
 * A curve's slider in the question row, by its name.
 *
 * In the row, because the dock's Explore sliders carry the same names: the
 * question's are the ones inside the group called "Question".
 */
const sliderFor = (curve: Curve) => within(row()).getByRole('slider', { name: curve });

/** Move a curve by the keyboard — the only way to move one in jsdom. */
function press(curve: Curve, key: 'ArrowRight' | 'ArrowLeft', times: number) {
    const control = sliderFor(curve);
    control.focus();
    for (let i = 0; i < times; i++) fireEvent.keyDown(control, { key });
}

/** Whether anything between an element and the document hides it. */
function hidden(node: Element | null): boolean {
    for (; node; node = node.parentElement) {
        if ((node as HTMLElement).style && (node as HTMLElement).style.display === 'none') return true;
    }
    return false;
}

/**
 * The curves the diagram is drawing, with what tells them apart.
 *
 * The line style is the apparatus's signature — solid for a live curve, dashed
 * for where a question found it, dotted for its answer — and the first two
 * points say which way it slopes (in SVG, y grows downwards, so a curve whose x
 * grows with y is one that slopes down: demand) and where it starts.
 */
function drawnCurves() {
    return [...document.querySelectorAll('svg path[class^="path-"]')]
        .filter(path => !hidden(path))
        .map(path => {
            const dash = /stroke-dasharray:\s*([^;]+)/.exec(path.getAttribute('style') || ''),
                xy = (path.getAttribute('d') || '').match(/-?\d+(\.\d+)?/g)!.map(Number);
            return {
                stroke: path.getAttribute('stroke'),
                style: !dash ? 'solid' : dash[1].trim() === '1,2' ? 'dotted'
                    : dash[1].trim() === '10,10' ? 'dashed' : 'solid',
                from: { x: xy[0], y: xy[1] },
                slopesDown: xy[2] > xy[0]
            };
        });
}

describe('what the lesson says the A$ is worth', () => {

    it('opens at A$1 = US$0.65, with the US$ side still to come', () => {
        mount();
        expect(caption('market')).toContain('A$1 = US$0.65');
        expect(caption('mirror')).toBe('');
    });

    it('is what the diagram solves to, at every step that says a rate', async () => {
        const user = userEvent.setup();
        mount();

        for (let position = 1; position < FIRST_QUESTION; position++) {
            await user.click(screen.getByLabelText('Next step'));
            const said = FX_LESSON[position - 1].say || '';

            // A US$ amount to the cent is the price of A$1; an A$ amount to the
            // cent is the price of US$1. Every sentence that quotes a rate
            // quotes one of those two, and each panel's caption headlines one.
            (said.match(/US\$\d+\.\d\d/g) || []).forEach(rate => {
                expect(caption('market'), `step ${position}: "${said}"`).toContain(rate);
            });
            (said.match(/(?<!US)A\$\d+\.\d\d/g) || []).forEach(rate => {
                expect(caption('mirror'), `step ${position}: "${said}"`).toContain(rate);
            });
        }
    });

    it('calls a rise in the A$ an appreciation only where the A$ rose', async () => {
        const user = userEvent.setup();
        mount();

        for (let position = 1; position < FIRST_QUESTION; position++) {
            await user.click(screen.getByLabelText('Next step'));
            const said = FX_LESSON[position - 1].say || '';
            // The chip is the diagram's own record of which way the rate went
            // at this step, against the snapshot the step took.
            if (/the A\$ has appreciated/.test(said)) expect(caption('market')).toContain('▲');
            if (/the A\$ has depreciated/.test(said)) expect(caption('market')).toContain('▼');
        }
    });
});

describe('the questions', () => {

    it('marks demand moved right as right, and says so in those words', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));

        press('Demand for A$', 'ArrowRight', 5);
        await user.click(screen.getByRole('button', { name: 'Check' }));

        expect(verdict()).toContain('Correct');
        // The prompt no longer names the curve, so the verdict does.
        expect(verdict()).toContain('Right direction — you moved demand for A$ right.');
        // Five steps of two is ten, and ten is five US cents on the rate.
        expect(caption('market')).toContain('A$1 = US$0.70');
    });

    it('says which way a wrong answer went, sideways, and which way it should have', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));
        press('Demand for A$', 'ArrowRight', 1);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        await user.click(screen.getByRole('button', { name: 'Continue' }));

        // Relative prices: supply of A$ should go right. Move it left.
        expect(row().textContent).toContain('Australians switch to imports');
        press('Supply of A$', 'ArrowLeft', 3);
        await user.click(screen.getByRole('button', { name: 'Check' }));

        expect(verdict()).toContain('Wrong direction — you moved supply of A$ left, and it should go right.');
    });

    it('starts each question from A$1 = US$0.65, whatever was moved on the way', async () => {
        const user = userEvent.setup();
        mount();
        // The step that shifts supply, and then the question after it.
        await user.click(marker(FIRST_QUESTION - 1));
        expect(caption('market')).toContain('A$1 = US$0.60');

        await user.click(marker(FIRST_QUESTION));
        expect(caption('market')).toContain('A$1 = US$0.65');
        expect(caption('mirror')).toContain('US$1 = A$1.54');
    });
});

/**
 * Which curve moves (P14) — the third of the slides' practice the prompts used
 * to give away by naming the curve.
 */
describe('choosing the curve', () => {

    it('offers both curves on every question, in the same order whichever is asked', async () => {
        const user = userEvent.setup();
        mount();
        const names = () => within(row()).getAllByRole('slider').map(s => s.getAttribute('aria-label'));

        await user.click(marker(FIRST_QUESTION));                     // about demand
        expect(names()).toEqual(['Demand for A$', 'Supply of A$']);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        await user.click(screen.getByRole('button', { name: 'Show me' }));
        await user.click(screen.getByRole('button', { name: 'Continue' }));

        expect(row().textContent).toContain('Australians switch to imports');   // about supply
        expect(names()).toEqual(['Demand for A$', 'Supply of A$']);
    });

    it('counts moving the other curve as an attempt', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));
        expect(row().getAttribute('data-phase')).toBe('prompt');

        press('Supply of A$', 'ArrowRight', 1);
        expect(row().getAttribute('data-phase')).toBe('attempt');
    });

    /**
     * The defect this exists for. A student who reached for supply on a demand
     * question was told "You did not move it", which was false.
     */
    it('tells a student who moves supply on a demand question so, in words', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));

        press('Supply of A$', 'ArrowRight', 2);
        await user.click(screen.getByRole('button', { name: 'Check' }));

        expect(verdict()).toContain('Not yet');
        expect(verdict()).toContain('This one works through demand for A$ — supply of A$ should stay where it was.');
        expect(verdict()).not.toContain('did not move');
        expect(screen.getByText('Answer to continue.')).toBeTruthy();
    });

    it('freezes both curves once the answer is taken, from the question and from the dock', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));
        press('Supply of A$', 'ArrowRight', 1);
        await user.click(screen.getByRole('button', { name: 'Check' }));

        (['Demand for A$', 'Supply of A$'] as Curve[]).forEach(curve => {
            const inRow = sliderFor(curve);
            const inDock = screen.getAllByRole('slider', { name: curve }).filter(s => s !== inRow)[0];
            [inRow, inDock].forEach(control => {
                const before = control.getAttribute('aria-valuetext');
                fireEvent.keyDown(control, { key: 'End' });
                expect(control.getAttribute('aria-valuetext'), curve).toBe(before);
            });
        });
        expect(caption('market')).toContain('A$1 = US$0.64');
    });

    /**
     * What "Try again" does with the curve that should not have moved: puts it
     * back where the question found it. Left out, the retry is a question about
     * a different market, and a student who then moves the right curve the
     * right way is marked wrong again. Their move of the asked curve is kept.
     */
    it('puts supply back on a retry, and leaves demand where the student put it', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));
        press('Demand for A$', 'ArrowRight', 2);                   // 54: right, as asked
        press('Supply of A$', 'ArrowRight', 3);                    // 56: and supply too
        await user.click(screen.getByRole('button', { name: 'Check' }));
        expect(verdict()).toContain('supply of A$ should stay where it was');
        expect(verdict()).toContain('Right direction — you moved demand for A$ right.');

        await user.click(screen.getByRole('button', { name: 'Try again' }));

        expect(sliderFor('Supply of A$').getAttribute('aria-valuetext')).toBe('50');
        expect(sliderFor('Demand for A$').getAttribute('aria-valuetext')).toBe('54');
        // 0.65 + (54 − 50)/200: the market with only demand moved.
        expect(caption('market')).toContain('A$1 = US$0.67');
        // The reset was the screen's move, not the student's, so it is not
        // narrated as theirs: the strip is at rest rather than reporting supply
        // shifting left.
        expect(document.querySelector('[data-kind]')!.getAttribute('data-kind')).toBe('rest');

        await user.click(screen.getByRole('button', { name: 'Check' }));
        expect(verdict()).toContain('Correct');
    });
});

/**
 * "Show me" on a question with no target (P14).
 *
 * It used to draw nothing — a direction-only question has no correct position
 * — so the verdict named the right way and the diagram went on showing the
 * student's wrong one. Now it draws the right curve shifted the right way, by
 * the question's `illustrate`. Which curve and which way are read off the
 * drawing itself here; how far needs the axes, and is in `fx.spec.ts`.
 */
describe('showing a direction-only answer', () => {

    it('draws the asked curve shifted the asked way, on every question', async () => {
        const user = userEvent.setup();
        mount();

        const asks = FX_LESSON.map((step, i) => ({ step, position: i + 1 })).filter(s => !!s.step.ask);
        expect(asks).toHaveLength(4);

        for (const { step, position } of asks) {
            await user.click(marker(position));
            const ask = step.ask!;

            await user.click(screen.getByRole('button', { name: 'Check' }));
            const before = drawnCurves();
            expect(before.filter(c => c.style === 'dotted'), `step ${position}, before`).toEqual([]);

            await user.click(screen.getByRole('button', { name: 'Show me' }));
            const after = drawnCurves();
            const answer = after.filter(c => c.style === 'dotted');
            expect(after, `step ${position}: one line more`).toHaveLength(before.length + 1);
            expect(answer, `step ${position}`).toHaveLength(1);

            // The right curve: it slopes the way the asked curve does, in its colour.
            const start = after.filter(c => c.style === 'dashed' && c.slopesDown === (ask.param === 'demand'))[0];
            expect(answer[0].slopesDown, `step ${position}`).toBe(ask.param === 'demand');
            expect(answer[0].stroke).toBe(start.stroke);

            // The right way: right of where the question found it for a rise,
            // left for a fall, at the same height.
            expect(answer[0].from.y).toBeCloseTo(start.from.y, 3);
            if (ask.direction === 'up') expect(answer[0].from.x).toBeGreaterThan(start.from.x + 1);
            else expect(answer[0].from.x).toBeLessThan(start.from.x - 1);

            await user.click(screen.getByRole('button', { name: 'Continue' }));
        }
    });

    /**
     * Beside a right answer the first lesson draws its target, so the student
     * sees where "close enough" sat. An illustration is not a position anybody
     * is aiming for, and drawn ten along from a student who moved two it would
     * say "not far enough" under the word "Correct".
     */
    it('draws nothing beside a right answer', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));
        press('Demand for A$', 'ArrowRight', 1);
        await user.click(screen.getByRole('button', { name: 'Check' }));

        expect(verdict()).toContain('Correct');
        expect(drawnCurves().filter(c => c.style === 'dotted')).toEqual([]);
    });
});

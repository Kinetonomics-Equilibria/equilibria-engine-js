import { describe, it, expect, beforeAll } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

/** Move the asked curve by the keyboard — the only way to move one in jsdom. */
function press(key: 'ArrowRight' | 'ArrowLeft', times: number) {
    const control = screen.getByRole('slider', { name: /Your answer/ });
    control.focus();
    for (let i = 0; i < times; i++) fireEvent.keyDown(control, { key });
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

        press('ArrowRight', 5);
        await user.click(screen.getByRole('button', { name: 'Check' }));

        expect(verdict()).toContain('Correct');
        expect(verdict()).toContain('you moved it right');
        // Five steps of two is ten, and ten is five US cents on the rate.
        expect(caption('market')).toContain('A$1 = US$0.70');
    });

    it('says which way a wrong answer went, sideways, and which way it should have', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));
        press('ArrowRight', 1);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        await user.click(screen.getByRole('button', { name: 'Continue' }));

        // The Fed: supply of A$ should go right. Move it left.
        expect(row().textContent).toContain('Move supply of A$');
        press('ArrowLeft', 3);
        await user.click(screen.getByRole('button', { name: 'Check' }));

        expect(verdict()).toContain('Wrong direction — you moved it left, and it should go right.');
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

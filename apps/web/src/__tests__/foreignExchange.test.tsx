import { describe, it, expect, beforeAll } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { StudyScreen } from '../StudyScreen';
import { FOREIGN_EXCHANGE, FX_LESSON } from '../lessons/foreignExchange';
import { theme } from '../theme';

/**
 * The AUD lesson, held to what it says — with a real engine underneath.
 *
 * Its sentences quote exchange rates: "AUD 1 now buys USD 0.70", "USD 1 costs
 * AUD 1.43". Those are claims about numbers the diagram solves to, and the only
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

/** The progress bar's marker for a step, by position (the first step is 1). */
const marker = (position: number) =>
    within(screen.getByRole('group', { name: 'Lesson steps' })).getAllByRole('button')[position - 1];

/** The lesson card's way on: "Start lesson" on its first page, "Next" after. */
const next = () => screen.getByRole('button', { name: /^(Next|Start lesson)$/ });

/** What a panel's caption says, name and number. Empty before it has arrived. */
const caption = (panel: 'market' | 'mirror') => {
    const node = document.querySelector(`[data-testid="stage-chrome"] [data-panel="${panel}"]`);
    return node ? node.textContent || '' : '';
};

/** The cover's parts row: each part's name and how it is counted. */
const FX_PARTS = [
    ['1 · Meet the market', '5 steps'],
    ['2 · When the AUD moves', '5 steps'],
    ['3 · Your turn', '4 questions']
];

/** The first question: the RBA, and demand for AUD. */
const FIRST_QUESTION = FX_LESSON.findIndex(step => !!step.ask) + 1;

const row = () => screen.getByRole('group', { name: 'Question' });

/** What the lesson card says at this step: its title and words, the prompt at a question. */
const words = () =>
    (screen.getByRole('region', { name: 'Lesson' }).querySelector('[aria-live="polite"]') as HTMLElement)
        .textContent || '';
const verdict = () => row().querySelector('[role="status"]')!.textContent || '';

type Curve = 'Demand for AUD' | 'Supply of AUD';

/**
 * A curve's slider in the question row, by its name.
 *
 * In the row, because the Explore instrument's sliders carry the same names
 * once the lesson is put away: the question's are the ones inside the group
 * called "Question".
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
                // Dotted is round dots: a dash of no length, every two widths.
                style: !dash ? 'solid' : /^0,/.test(dash[1].replace(/\s/g, '')) ? 'dotted'
                    : dash[1].trim() === '10,10' ? 'dashed' : 'solid',
                from: { x: xy[0], y: xy[1] },
                slopesDown: xy[2] > xy[0]
            };
        });
}

describe('the cover', () => {

    // The parts are counted the way a student will meet them: the last part
    // asks four questions, and the step after them that sends the student on
    // is not counted as a fifth.
    it('shows its picture, its question, and its parts as the track will draw them', () => {
        mount();
        const sheet = screen.getByRole('region', { name: 'About this lesson' });
        expect(within(sheet).getByRole('img').getAttribute('alt')).toMatch(/ore carrier/);
        expect(within(sheet).getByRole('heading', { name: /rise and fall\?$/ })).toBeTruthy();
        const parts = within(within(sheet).getByRole('list')).getAllByRole('listitem');
        expect(parts.map(part => part.textContent)).toEqual(
            FX_PARTS.map(([name, count]) => name + count)
        );
        expect(parts[parts.length - 1].querySelectorAll('[data-kinds~="ask"]')).toHaveLength(4);
    });
});

describe('the picture step', () => {

    /** A matchMedia that says the student has asked for less motion, or has not. */
    function motion(reduced: boolean) {
        const original = window.matchMedia;
        window.matchMedia = ((query: string) => ({
            matches: reduced && query.indexOf('prefers-reduced-motion') > -1,
            media: query, onchange: null,
            addListener: () => { }, removeListener: () => { },
            addEventListener: () => { }, removeEventListener: () => { },
            dispatchEvent: () => false
        })) as unknown as typeof window.matchMedia;
        return () => { window.matchMedia = original };
    }

    const picture = () => screen.queryByRole('region', { name: 'Who needs AUD' });

    it('shows who needs AUD across the stage, with the diagram under it', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(next());

        const sheet = picture()!;
        expect(within(sheet).getByRole('img').getAttribute('alt')).toMatch(/demand for AUD/);
        expect(document.querySelector('.kg-container')!.closest('[inert]')).toBeTruthy();
        // The step's words are the card's, and only the card's.
        expect(words()).toContain('Who wants Australian dollars?');
        expect(sheet.textContent).not.toContain('People overseas need AUD');
    });

    it('pauses on its still, and plays again', async () => {
        const restore = motion(false);
        try {
            const user = userEvent.setup();
            mount();
            await user.click(next());
            const image = () => within(picture()!).getByRole('img').getAttribute('src') || '';

            expect(image()).not.toMatch(/still/);
            await user.click(screen.getByRole('button', { name: 'Pause the animation' }));
            expect(image()).toMatch(/still/);
            await user.click(screen.getByRole('button', { name: 'Play the animation' }));
            expect(image()).not.toMatch(/still/);
        } finally {
            restore();
        }
    });

    it('starts on its still for a student who has asked for less motion', async () => {
        const restore = motion(true);
        try {
            const user = userEvent.setup();
            mount();
            await user.click(next());
            expect(within(picture()!).getByRole('img').getAttribute('src')).toMatch(/still/);
            expect(screen.getByRole('button', { name: 'Play the animation' })).toBeTruthy();
        } finally {
            restore();
        }
    });

    it('gives way to the demand curve at the next step', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(next());
        await user.click(next());
        expect(picture()).toBeNull();
        expect(document.querySelector('[inert]')).toBeNull();
        expect(words()).toContain('Demand for AUD slopes down');
    });
});

describe('the recap', () => {

    const recap = () => screen.queryByRole('region', { name: 'How you went' });
    const cases = () => within(within(recap()!).getByRole('list', { name: 'The questions' }))
        .getAllByRole('listitem');

    /**
     * The four questions answered four ways: right, wrong and then right,
     * shown, and right. The recap says each as it went, in the chain's words
     * for its cause — and a question answered again after it was shown is
     * still one the student was shown.
     */
    it('says how each question went, in the words the chain uses', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));

        // Interest rates rise: demand right, first time.
        press('Demand for AUD', 'ArrowRight', 5);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        await user.click(screen.getByRole('button', { name: 'Continue' }));

        // Prices rise faster here: supply left (wrong), then right.
        press('Supply of AUD', 'ArrowLeft', 3);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        await user.click(screen.getByRole('button', { name: 'Try again' }));
        press('Supply of AUD', 'ArrowRight', 8);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        await user.click(screen.getByRole('button', { name: 'Continue' }));

        // China buys less ore: shown.
        await user.click(screen.getByRole('button', { name: 'Check' }));
        await user.click(screen.getByRole('button', { name: 'Show me' }));
        await user.click(screen.getByRole('button', { name: 'Continue' }));

        // Australians spend less overseas: supply left, first time.
        press('Supply of AUD', 'ArrowLeft', 5);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        await user.click(screen.getByRole('button', { name: 'Continue' }));

        expect(recap()).toBeTruthy();
        const read = () => cases().map(item => [
            item.querySelector('h4')!.textContent,
            item.querySelector('[data-how]')!.textContent
        ]);
        expect(read()).toEqual([
            ['Interest rates rise', 'Right first time'],
            ['Prices rise faster in Australia', 'Right on the second go'],
            ['China buys less iron ore', 'You used Show me'],
            ['Australians spend less overseas', 'Right first time']
        ]);
        expect(cases()[0].textContent).toContain('Demand for AUD increases');
        expect(cases()[3].textContent).toContain('Supply of AUD decreases');
        expect(within(recap()!).getByText(/more demand or less supply and the AUD appreciates/)).toBeTruthy();

        // Back to the question that was shown, and right this time.
        const shown = FX_LESSON.findIndex(step => step.title === 'China buys less iron ore') + 1;
        await user.click(marker(shown));
        press('Demand for AUD', 'ArrowLeft', 5);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        await user.click(marker(FX_LESSON.length));
        expect(read()[2]).toEqual(['China buys less iron ore', 'You used Show me']);
    });
});

describe('the report beside the first question', () => {

    const report = () => document.querySelector('[data-host-panel="rbaReport"]');

    // The event is the report's: the card asks the question and nothing else.
    it('is beside the diagram at its question, and tells the story the card does not', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));

        expect(report()!.textContent).toContain('The RBA lifts the cash rate above US interest rates');
        expect(report()!.textContent).toContain('A made-up report');
        expect(words()).toContain('Read the news report next to the diagram.');
        expect(words()).not.toContain('RBA');
        expect(screen.getByRole('button', { name: 'Show the news report' })).toBeTruthy();
    });

    it('is gone at the next question, and was never there before', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION - 1));
        expect(report()).toBeNull();

        await user.click(marker(FIRST_QUESTION));
        await user.click(screen.getByRole('button', { name: 'Check' }));
        await user.click(screen.getByRole('button', { name: 'Show me' }));
        await user.click(screen.getByRole('button', { name: 'Continue' }));
        expect(report()).toBeNull();
    });

    // Promoted, it is read at the front; left behind, the market comes back
    // to the front rather than whichever panel the stage would fall back on.
    it('can be brought to the front, and gives it back to the market when it goes', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));
        await user.click(screen.getByRole('button', { name: 'Show the news report' }));
        expect(screen.getByRole('button', { name: 'Show AUD market' })).toBeTruthy();

        await user.click(screen.getByRole('button', { name: 'Check' }));
        await user.click(screen.getByRole('button', { name: 'Show me' }));
        await user.click(screen.getByRole('button', { name: 'Continue' }));

        expect(screen.queryByRole('button', { name: 'Show AUD market' })).toBeNull();
        expect(document.querySelector('[data-testid="stage-chrome"] [data-panel="market"]')!
            .getAttribute('data-role')).toBe('focal');
    });
});

describe('what the lesson says the AUD is worth', () => {

    it('opens at AUD 1 = USD 0.65, with the USD side still to come', () => {
        mount();
        expect(caption('market')).toContain('AUD 1 = USD 0.65');
        expect(caption('mirror')).toBe('');
    });

    it('is what the diagram solves to, at every step that says a rate', async () => {
        const user = userEvent.setup();
        mount();

        for (let position = 1; position < FIRST_QUESTION; position++) {
            await user.click(next());
            const said = FX_LESSON[position - 1].say || '';

            // A USD amount to the cent is the price of AUD 1; an AUD amount to the
            // cent is the price of USD 1. Every sentence that quotes a rate
            // quotes one of those two, and each panel's caption headlines one.
            (said.match(/USD \d+\.\d\d/g) || []).forEach(rate => {
                expect(caption('market'), `step ${position}: "${said}"`).toContain(rate);
            });
            (said.match(/AUD \d+\.\d\d/g) || []).forEach(rate => {
                expect(caption('mirror'), `step ${position}: "${said}"`).toContain(rate);
            });
        }
    });

    it('calls a rise in the AUD an appreciation only where the AUD rose', async () => {
        const user = userEvent.setup();
        mount();

        for (let position = 1; position < FIRST_QUESTION; position++) {
            await user.click(next());
            const said = FX_LESSON[position - 1].say || '';
            // The chip is the diagram's own record of which way the rate went
            // at this step, against the snapshot the step took.
            if (/the AUD has appreciated/.test(said)) expect(caption('market')).toContain('▲');
            if (/the AUD has depreciated/.test(said)) expect(caption('market')).toContain('▼');
        }
    });
});

describe('the questions', () => {

    it('marks demand moved right as right, and says so in those words', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));

        press('Demand for AUD', 'ArrowRight', 5);
        await user.click(screen.getByRole('button', { name: 'Check' }));

        expect(verdict()).toContain('Correct');
        // The prompt no longer names the curve, so the verdict does.
        expect(verdict()).toContain('You moved demand for AUD right, which is the right direction.');
        // Five steps of two is ten, and ten is five US cents on the rate.
        expect(caption('market')).toContain('AUD 1 = USD 0.70');
    });

    it('says which way a wrong answer went, sideways, and which way it should have', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));
        press('Demand for AUD', 'ArrowRight', 1);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        await user.click(screen.getByRole('button', { name: 'Continue' }));

        // Relative prices: supply of AUD should go right. Move it left.
        expect(words()).toContain('Australians switch to imports');
        press('Supply of AUD', 'ArrowLeft', 3);
        await user.click(screen.getByRole('button', { name: 'Check' }));

        expect(verdict()).toContain('You moved supply of AUD left, but this change moves it right.');
    });

    it('starts each question from AUD 1 = USD 0.65, whatever was moved on the way', async () => {
        const user = userEvent.setup();
        mount();
        // The step that shifts supply, and then the question after it.
        await user.click(marker(FIRST_QUESTION - 1));
        expect(caption('market')).toContain('AUD 1 = USD 0.60');

        await user.click(marker(FIRST_QUESTION));
        expect(caption('market')).toContain('AUD 1 = USD 0.65');
        expect(caption('mirror')).toContain('USD 1 = AUD 1.54');
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
        expect(names()).toEqual(['Demand for AUD', 'Supply of AUD']);
        await user.click(screen.getByRole('button', { name: 'Check' }));
        await user.click(screen.getByRole('button', { name: 'Show me' }));
        await user.click(screen.getByRole('button', { name: 'Continue' }));

        expect(words()).toContain('Australians switch to imports');   // about supply
        expect(names()).toEqual(['Demand for AUD', 'Supply of AUD']);
    });

    it('counts moving the other curve as an attempt', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));
        expect(row().getAttribute('data-phase')).toBe('prompt');

        press('Supply of AUD', 'ArrowRight', 1);
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

        press('Supply of AUD', 'ArrowRight', 2);
        await user.click(screen.getByRole('button', { name: 'Check' }));

        expect(verdict()).toContain('Not yet');
        expect(verdict()).toContain('This change moves demand for AUD, so supply of AUD should stay where it was.');
        expect(verdict()).not.toContain('haven\'t moved');
        expect(screen.getByText('Answer the question to unlock the next step.')).toBeTruthy();
    });

    // The question's sliders are the only controls on screen for either curve:
    // the instruments are put away while a lesson runs.
    it('freezes both curves once the answer is taken, with nothing else on screen to move them', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));
        press('Supply of AUD', 'ArrowRight', 1);
        await user.click(screen.getByRole('button', { name: 'Check' }));

        (['Demand for AUD', 'Supply of AUD'] as Curve[]).forEach(curve => {
            const control = sliderFor(curve);
            const before = control.getAttribute('aria-valuetext');
            fireEvent.keyDown(control, { key: 'End' });
            expect(control.getAttribute('aria-valuetext'), curve).toBe(before);
            expect(screen.getAllByRole('slider', { name: curve }), curve).toEqual([control]);
        });
        expect(caption('market')).toContain('AUD 1 = USD 0.64');
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
        press('Demand for AUD', 'ArrowRight', 2);                   // 54: right, as asked
        press('Supply of AUD', 'ArrowRight', 3);                    // 56: and supply too
        await user.click(screen.getByRole('button', { name: 'Check' }));
        expect(verdict()).toContain('supply of AUD should stay where it was');
        expect(verdict()).toContain('You moved demand for AUD right, which is the right direction.');

        await user.click(screen.getByRole('button', { name: 'Try again' }));

        expect(sliderFor('Supply of AUD').getAttribute('aria-valuetext')).toBe('50');
        expect(sliderFor('Demand for AUD').getAttribute('aria-valuetext')).toBe('54');
        // 0.65 + (54 − 50)/200: the market with only demand moved.
        expect(caption('market')).toContain('AUD 1 = USD 0.67');
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
        press('Demand for AUD', 'ArrowRight', 1);
        await user.click(screen.getByRole('button', { name: 'Check' }));

        expect(verdict()).toContain('Correct');
        expect(drawnCurves().filter(c => c.style === 'dotted')).toEqual([]);
    });
});

/**
 * "What changed" marks a move in the colour of the curves it moved, with the
 * engine's own value for it — so the claim is held against the strokes the
 * diagram drew, not against a colour written out a second time here.
 */
describe('the colour of what changed', () => {

    /** The live curves, each by its path, so a move shows as the ones whose path changed. */
    const liveCurves = () => [...document.querySelectorAll('svg path[class^="path-"]')]
        .filter(path => !hidden(path))
        .filter(path => {
            const dash = /stroke-dasharray:\s*([^;]+)/.exec(path.getAttribute('style') || '');
            return !dash || dash[1].replace(/\s/g, '') === '10,0';
        })
        .map(path => ({ path, d: path.getAttribute('d'), stroke: path.getAttribute('stroke') }));

    /** Move a curve, and say what it shifted and how the chain is marked. */
    function move(curve: Curve) {
        const before = new Map(liveCurves().map(c => [c.path, c.d]));
        press(curve, 'ArrowRight', 2);
        const card = screen.getByRole('region', { name: 'What changed' });
        const curveOf = (part: string) =>
            (card.querySelector(`[data-part="${part}"]`) as HTMLElement).style.getPropertyValue('--curve');
        return {
            strokes: liveCurves().filter(c => before.has(c.path) && before.get(c.path) !== c.d).map(c => c.stroke),
            cause: curveOf('cause'),
            movement: curveOf('movement')
        };
    }

    // Demand is blue and supply orange in both panels, so each param moves one
    // curve of each colour: demand for AUD moves the supply of USD it is on the
    // other side. Its clause is marked in the AUD market curve's colour, and so
    // are the movements, whose first line is that curve.
    it('marks demand for AUD in the colour of its AUD market curve', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));

        const { strokes, cause, movement } = move('Demand for AUD');
        expect(cause).toMatch(/^#[0-9a-f]{6}$/i);
        expect(strokes).toHaveLength(2);
        expect(strokes[0]).toBe(cause);
        expect(strokes[1]).not.toBe(cause);
        expect(movement).toBe(cause);
    });

    it('marks supply of AUD in its own', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));

        const { strokes, cause, movement } = move('Supply of AUD');
        expect(cause).toMatch(/^#[0-9a-f]{6}$/i);
        expect(strokes).toHaveLength(2);
        expect(strokes[0]).toBe(cause);
        expect(strokes[1]).not.toBe(cause);
        expect(movement).toBe(cause);
    });

    // The slider that moves a curve is drawn in the curve's colour, so a
    // student choosing between two can match each to its line.
    it('draws each slider in the colour of the AUD market curve it moves', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(marker(FIRST_QUESTION));

        const colourOf = (curve: Curve) => (sliderFor(curve).closest('.mantine-Slider-root') as HTMLElement)
            .style.getPropertyValue('--slider-color');
        const demand = move('Demand for AUD'), supply = move('Supply of AUD');
        expect(colourOf('Demand for AUD')).toBe(demand.strokes[0]);
        expect(colourOf('Supply of AUD')).toBe(supply.strokes[0]);
        expect(colourOf('Demand for AUD')).not.toBe(colourOf('Supply of AUD'));
        // One colour to a kind of curve, in both panels: the blue that demand
        // moved in the AUD market is the blue supply moved in the USD market.
        expect(demand.strokes).toEqual([...supply.strokes].reverse());
    });
});

import { describe, it, expect, beforeAll } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { App } from '../App';
import { CURRICULUM, MODELS } from '../lessons';
import { ON_HOME, STORIES, dateWords, monthWords, storiesByMonth, storyById, topicOfStory } from '../news';
import { readPlace, writeLink } from '../links';
import { theme } from '../theme';

/**
 * In the news and Home: the stories, a story's page and its address, the
 * rail's In the news panel, and the page the app opens on.
 *
 * The whole app for the pages, as `links.test.tsx` has it, with a real engine
 * underneath: a story's claims are about what its move does to the market.
 */

beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {
        get() { return 1200 }, configurable: true
    });
    Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
        get() { return 800 }, configurable: true
    });
});

const open = (address = '') => {
    window.history.replaceState(null, '', '/' + address);
    return render(<MantineProvider theme={theme} env="test"><App /></MantineProvider>);
};

const address = () => window.location.pathname + window.location.search;
const settles = (expected: string) => waitFor(() => expect(address()).toBe(expected));

/** The rail is out of the accessibility tree in jsdom, which has it collapsed as on a phone. */
const rail = (name: string) => screen.getByRole('button', { name, hidden: true });
const changed = () => screen.getByRole('region', { name: 'What changed' });
const report = () => document.querySelector('[data-host-panel="story"]') as HTMLElement | null;
const marketCaption = () =>
    document.querySelector('[data-testid="stage-chrome"] [data-panel="market"]')!.textContent || '';

const RBA = storyById('2026-09-rba-cash-rate')!;

describe('The stories', () => {

    it('are listed newest first', () => {
        const dates = STORIES.map(story => story.date);
        expect(dates).toEqual(dates.slice().sort().reverse());
    });

    it('are each addressed by a key of their own', () => {
        const ids = STORIES.map(story => story.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it.each(STORIES.map(story => [story.id, story] as const))('"%s" is dated, sourced and told on a model', (_id, story) => {
        // The day it happened, in digits, and the address starts with its month.
        expect(story.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(story.id.indexOf(story.date.slice(0, 7))).toBe(0);
        expect(dateWords(story.date, 'long')).toMatch(/^\d{1,2} [A-Z][a-z]+ \d{4}$/);

        // Plain words: a headline in sentence case and no full stop; one
        // sentence of what happened.
        expect(story.headline.charAt(0)).toBe(story.headline.charAt(0).toUpperCase());
        expect(story.headline).not.toMatch(/\.$/);
        expect(story.body).toMatch(/\.$/);
        expect(story.body.split(/\. [A-Z]/).length).toBe(1);

        // Linked to where it can be read.
        expect(story.source.outlet).toBeTruthy();
        expect(story.source.href).toMatch(/^https:\/\//);

        // Told on a model the playground has, under a topic.
        expect(MODELS.map(m => m.id)).toContain(story.model.id);
        expect(topicOfStory(story)).not.toBeNull();
    });

    it.each(STORIES.map(story => [story.id, story] as const))('"%s" moves params its model has, inside their ranges', (_id, story) => {
        const params = (story.model.diagram.params as { name: string; value: number; min: number; max: number }[]);
        Object.keys(story.move).forEach(name => {
            const param = params.filter(p => p.name === name)[0];
            expect(param, `${name} is a param of ${story.model.id}`).toBeTruthy();
            expect(story.move[name]).toBeGreaterThanOrEqual(param.min);
            expect(story.move[name]).toBeLessThanOrEqual(param.max);
            // It moves: the move is a way the market goes, not where it is.
            expect(story.move[name]).not.toBe(param.value);
        });
        // Who, which curve, which way, as a scenario's reasoning ends.
        expect(story.reasoning).toMatch(/: [^:]+\.$/);
    });

    it('are listed under the month each happened in', () => {
        const months = storiesByMonth();
        expect(months.map(m => m.month)).toEqual(
            STORIES.map(s => monthWords(s.date)).filter((m, i, all) => all.indexOf(m) === i));
        expect(months.flatMap(m => m.stories)).toEqual(STORIES);
    });

    it('name no story where an id names none', () => {
        expect(storyById('2026-09-rba-cash-rate')).toBe(RBA);
        expect(storyById('nonsense')).toBeNull();
    });
});

describe('A story\'s address', () => {

    it('is the story under news', () => {
        expect(writeLink({ kind: 'news', id: RBA.id })).toBe('news/2026-09-rba-cash-rate');
        expect(readPlace({ pathname: '/news/2026-09-rba-cash-rate', search: '' }, '/'))
            .toEqual({ place: { kind: 'news', id: '2026-09-rba-cash-rate' }, old: false });
    });

    it('opens the story, with its report at the front', async () => {
        open('news/2026-09-rba-cash-rate');
        await settles('/news/2026-09-rba-cash-rate');

        // Its topic and its date over its headline.
        const heading = screen.getByRole('heading', { name: RBA.headline });
        const line = heading.parentElement!;
        expect(line.textContent).toContain('International economics');
        expect(line.textContent).toContain('29 September 2026');

        // The report, at the front: what happened, its source, and that the
        // diagram's numbers are the model's.
        await waitFor(() => expect(report()).not.toBeNull());
        expect(report()!.textContent).toContain(RBA.body);
        const source = within(report()!).getByRole('link', { name: 'Reserve Bank of Australia' });
        expect(source.getAttribute('href')).toBe(RBA.source.href);
        expect(source.getAttribute('target')).toBe('_blank');
        expect(report()!.textContent).toContain('shows which way this moves the market, not how far');
        expect(document.querySelector('[data-testid="stage-chrome"] [data-panel="story"]')!
            .getAttribute('data-focused')).toBe('true');
    });

    it('opens Home where its story is not there, and says so', async () => {
        open('news/2026-01-nothing-happened');
        await settles('/');
        expect(screen.getByRole('heading', { name: 'Learn it, play with it, see it happen' })).toBeTruthy();
    });
});

describe('A story\'s page', () => {

    it('makes its move as a scenario does, and "What changed" tells the chain', async () => {
        const user = userEvent.setup();
        open('news/2026-09-rba-cash-rate');
        await waitFor(() => expect(marketCaption()).toContain('USD 0.65'));
        expect(changed().getAttribute('data-kind')).toBe('rest');

        const card = screen.getByRole('region', { name: 'What it moves' });
        const move = within(card).getByRole('button', { name: 'Show it on the diagram' });
        expect(move.getAttribute('aria-describedby')).toBeTruthy();
        expect(document.getElementById(move.getAttribute('aria-describedby')!)!.textContent).toBe(RBA.reasoning);
        await user.click(move);

        expect(changed().textContent).toContain('Demand for AUD increases');
        expect(changed().textContent).toContain('The AUD appreciates');
        expect(marketCaption()).toContain('USD 0.70');
        // Made, so a press would change nothing; and the address follows the view.
        expect(move).toHaveProperty('disabled', true);
        await settles('/news/2026-09-rba-cash-rate?demand=60');

        // Undo takes it back, as it does a scenario.
        await user.click(within(changed()).getByRole('button', { name: /Undo/ }));
        expect(marketCaption()).toContain('USD 0.65');
        expect(move).toHaveProperty('disabled', false);
    });

    it('opens the market the move made in the Playground, pushed, and Back is the story', async () => {
        const user = userEvent.setup();
        open('news/2026-09-us-fed-rate');
        await settles('/news/2026-09-us-fed-rate');

        const playground = screen.getByRole('link', { name: 'Open in the Playground' });
        expect(playground.getAttribute('href')).toBe(window.location.origin + '/playground/aud?supply=60');
        await user.click(playground);

        expect(address()).toBe('/playground/aud?supply=60');
        await screen.findByRole('heading', { name: 'The market for the Australian dollar' });
        await waitFor(() => expect(marketCaption()).toContain('USD 0.60'));

        act(() => window.history.back());
        await screen.findByRole('heading', { name: 'The US Federal Reserve raises its interest rate' });
        expect(address()).toBe('/news/2026-09-us-fed-rate');
    });

    it('has no instruments, and its Reset puts back the market it opened with', async () => {
        const user = userEvent.setup();
        open('news/2026-09-petrol-price?c=4');
        await waitFor(() => expect(marketCaption()).toContain('Price $12.00'));
        expect(screen.queryByRole('tab', { name: 'Explore' })).toBeNull();

        await user.click(screen.getByRole('button', { name: 'Show it on the diagram' }));
        expect(marketCaption()).toContain('Price $13.00');
        expect(changed().textContent).toContain('Sellers\' costs rise');

        await user.click(screen.getByRole('button', { name: 'Reset' }));
        expect(marketCaption()).toContain('Price $12.00');
    });

    it('shares the story itself, whatever the view', async () => {
        const user = userEvent.setup();
        open('news/2026-09-rba-cash-rate?demand=60&arrange=grid');
        await user.click(screen.getByRole('button', { name: 'Share' }));
        await user.click(screen.getByRole('menuitem', { name: /^Show a QR code/ }));
        const sheet = screen.getByRole('region', { name: 'QR code' });
        expect(within(sheet).getByRole('img', { name: /^QR code\. Opens the story/ })).toBeTruthy();
        expect(sheet.textContent).toMatch(/\/news\/2026-09-rba-cash-rate(?!\?)/);
        expect(sheet.textContent).not.toContain('demand=60');
    });
});

describe('The In the news panel', () => {

    it('lists every story newest first, under each month, with the open one marked', async () => {
        const user = userEvent.setup();
        open('news/2026-09-rba-cash-rate');
        await user.click(rail('In the news'));

        const panel = screen.getByRole('region', { name: 'In the news', hidden: true });
        const months = storiesByMonth().map(m => m.month);
        months.forEach(month => expect(within(panel).getByText(month)).toBeTruthy());

        const links = within(panel).getAllByRole('link', { hidden: true });
        expect(links.map(l => l.getAttribute('href'))).toEqual(STORIES.map(s => '/news/' + s.id));
        // Each its day, its topic for a screen reader in place of its dot, and its headline.
        expect(links[1].textContent).toBe('29 SepInternational economics:The RBA raises the cash rate to 4.60%');
        expect(links[1].getAttribute('aria-current')).toBe('page');
        expect(links[0].getAttribute('aria-current')).toBeNull();
    });

    it('opens the story chosen, pushed, and puts itself away', async () => {
        const user = userEvent.setup();
        open('lessons/fx');
        await settles('/lessons/fx');

        await user.click(rail('In the news'));
        await user.click(screen.getByRole('link', { name: /Petrol passes \$2 a litre again/, hidden: true }));

        expect(address()).toBe('/news/2026-09-petrol-price');
        await screen.findByRole('heading', { name: 'Petrol passes $2 a litre again' });
        expect(screen.queryByRole('region', { name: 'In the news', hidden: true })).toBeNull();

        act(() => window.history.back());
        await screen.findByRole('heading', { name: 'The Australian dollar, and what moves it' });
    });

    it('lights In the news on the rail while a story is open', async () => {
        open('news/2026-10-iron-ore-price');
        await settles('/news/2026-10-iron-ore-price');
        expect(rail('In the news').hasAttribute('data-active')).toBe(true);
        expect(rail('Lessons').hasAttribute('data-active')).toBe(false);
    });
});

describe('Home', () => {

    it('is where the app opens, and lights Home on the rail', async () => {
        open();
        expect(screen.getByRole('heading', { level: 1, name: 'Learn it, play with it, see it happen' })).toBeTruthy();
        expect(address()).toBe('/');
        expect(rail('Home').hasAttribute('data-active')).toBe(true);
    });

    it('is where a path the app does not have opens, and the address says so', async () => {
        open('somewhere/else?step=3');
        await settles('/');
        expect(screen.getByRole('heading', { name: 'Learn it, play with it, see it happen' })).toBeTruthy();
    });

    it('lists the three places, each with a line saying what is in it', () => {
        open();
        const places = screen.getByRole('region', { name: 'Where to go' });
        const rows = within(places).getAllByRole('button');
        expect(rows.map(r => r.getAttribute('aria-label'))).toEqual(['Lessons', 'Playground', 'In the news']);
        rows.forEach(row => expect(document.getElementById(row.getAttribute('aria-describedby')!)!.textContent)
            .toBeTruthy());
    });

    it('brings out a place\'s panel, opened where a course starts', async () => {
        const user = userEvent.setup();
        open();
        await user.click(within(screen.getByRole('region', { name: 'Where to go' })).getByRole('button', { name: 'Lessons' }));

        const panel = screen.getByRole('region', { name: 'Lessons', hidden: true });
        const first = CURRICULUM[0].topics[0];
        expect(within(panel).getByRole('button', { name: new RegExp(first.label), hidden: true })
            .getAttribute('aria-expanded')).toBe('true');
        await user.click(within(panel).getByRole('link', { name: first.lessons[0].label, hidden: true }));
        expect(address()).toBe('/lessons/' + first.lessons[0].id);
    });

    it('feeds the newest stories, each a way into the story itself', async () => {
        const user = userEvent.setup();
        open();
        const feed = screen.getByRole('region', { name: 'Latest in the news' });
        const links = within(feed).getAllByRole('link');
        expect(links.map(l => l.getAttribute('href'))).toEqual(STORIES.slice(0, ON_HOME).map(s => '/news/' + s.id));
        expect(links[0].textContent).toContain(dateWords(STORIES[0].date, 'short'));
        expect(links[0].textContent).toContain(STORIES[0].headline);

        await user.click(links[1]);
        expect(address()).toBe('/news/' + STORIES[1].id);
        await screen.findByRole('heading', { name: STORIES[1].headline });

        act(() => window.history.back());
        await screen.findByRole('heading', { name: 'Learn it, play with it, see it happen' });
        expect(address()).toBe('/');
    });

    it('is a press away on the rail, pushed, and Back returns', async () => {
        const user = userEvent.setup();
        open('lessons/fx');
        await settles('/lessons/fx');
        await user.click(rail('Home'));
        expect(address()).toBe('/');
        await screen.findByRole('heading', { name: 'Learn it, play with it, see it happen' });

        act(() => window.history.back());
        await screen.findByRole('heading', { name: 'The Australian dollar, and what moves it' });
        expect(address()).toBe('/lessons/fx');
    });
});

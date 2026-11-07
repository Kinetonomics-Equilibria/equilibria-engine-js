import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { Embed } from '../Embed';
import { readEmbed, readLink, writeEmbed } from '../links';
import { embedCode } from '../share';
import { theme } from '../theme';

/**
 * Embeds: a page of the app in another site's page, as the whole page less
 * the rail or as the diagram alone, from an address under `embed/`.
 *
 * The frame as `main.tsx` mounts it, on the shipped market lesson and its
 * model and on a story, with a real engine underneath: what an embed claims is
 * what it draws, where its ways out go, and what it never does — write to an
 * address whose history is the other site's.
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

let opened: string[] = [];
beforeEach(() => {
    opened = [];
    vi.spyOn(window, 'open').mockImplementation((url?: string | URL) => {
        opened.push(String(url));
        return null;
    });
});

/** Open an embed at an address, from the site's root, as a frame's `src` would. */
const embed = (address: string) => {
    window.history.replaceState(null, '', '/' + address);
    const embedded = readEmbed(window.location, '/')!;
    return render(<MantineProvider theme={theme} env="test"><Embed {...embedded} /></MantineProvider>);
};

const href = (address: string) => window.location.origin + '/' + address;
const address = () => window.location.pathname + window.location.search;
/** Longer than a write to the address is ever held back. */
const pause = () => act(() => new Promise(resolve => setTimeout(resolve, 500)));
const panels = () => Array.from(document.querySelectorAll('[data-testid="stage-chrome"] [data-panel]'))
    .map(panel => panel.getAttribute('data-panel'));

describe('The words of an embed', () => {

    it('are the page\'s path under embed/, then the layout where it is the diagram, then the view', () => {
        expect(writeEmbed({ kind: 'lesson', id: 'fx' })).toBe('embed/lessons/fx');
        expect(writeEmbed({ kind: 'lesson', id: 'fx' }, 'full',
            { step: 7, tab: null, arrange: 'focus', focus: null, params: { supply: 56 } }))
            .toBe('embed/lessons/fx?step=7&supply=56');
        expect(writeEmbed({ kind: 'playground', id: 'aud' }, 'diagram',
            { step: 0, tab: null, arrange: 'grid', focus: null, params: { supply: 56 } }))
            .toBe('embed/playground/aud?layout=diagram&arrange=grid&supply=56');
        expect(writeEmbed({ kind: 'news', id: '2026-09-rba-cash-rate' }))
            .toBe('embed/news/2026-09-rba-cash-rate');
    });

    it('read back the page and the layout, forgivingly', () => {
        const at = (pathname: string, search = '', root = '/') => readEmbed({ pathname, search }, root);
        expect(at('/embed/lessons/fx', '?step=7')).toEqual({ place: { kind: 'lesson', id: 'fx' }, layout: 'full' });
        expect(at('/embed/playground/aud', '?layout=diagram'))
            .toEqual({ place: { kind: 'playground', id: 'aud' }, layout: 'diagram' });
        expect(at('/app/embed/news/x', '', '/app/')).toEqual({ place: { kind: 'news', id: 'x' }, layout: 'full' });
        // A layout it does not know is the whole page.
        expect(at('/embed/lessons/fx', '?layout=poster')!.layout).toBe('full');
        // Under embed/ but naming nothing: still an embed, of nothing.
        expect(at('/embed/fx')).toEqual({ place: null, layout: 'full' });
        expect(at('/embed/')).toEqual({ place: null, layout: 'full' });
        expect(at('/embed')).toEqual({ place: null, layout: 'full' });
        // Not under embed/: the app's own.
        expect(at('/lessons/fx')).toBeNull();
        expect(at('/')).toBeNull();
        expect(at('/embedded/lessons/fx')).toBeNull();
    });

    it('leave the layout out of the view, as an address\'s own word', () => {
        expect(readLink('?layout=diagram&supply=56').params).toEqual({ supply: 56 });
    });

    it('are pasted as a frame named for what it shows, at its size', () => {
        const full = embedCode('https://econ.example/embed/lessons/fx?step=7&supply=56', 'Prices & "quotes"', 'full');
        expect(full).toBe('<iframe src="https://econ.example/embed/lessons/fx?step=7&amp;supply=56" ' +
            'title="Prices &amp; &quot;quotes&quot;" width="1000" height="640" style="border:0;max-width:100%" ' +
            'allow="fullscreen" allowfullscreen loading="lazy"></iframe>');
        // The diagram alone has no Present, so it asks for no full screen.
        const diagram = embedCode('https://econ.example/embed/playground/aud?layout=diagram', 'AUD', 'diagram');
        expect(diagram).toContain('width="640" height="480"');
        expect(diagram).not.toContain('fullscreen');
    });
});

describe('The whole page, embedded', () => {

    it('is the study screen less the rail, with Open in Kinetonomics in Share\'s place', async () => {
        embed('embed/lessons/market?step=6&a=28');
        await screen.findByRole('heading', { name: 'Supply, demand and market equilibrium' });

        expect(screen.queryByRole('navigation')).toBeNull();
        expect(screen.queryByRole('button', { name: 'Toggle navigation' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Share' })).toBeNull();
        expect(screen.getByRole('group', { name: 'Lesson steps' })).toBeTruthy();
        expect(screen.getByRole('region', { name: 'What changed' })).toBeTruthy();

        // A real link, to the app at this view, in a tab of its own.
        const open = screen.getByRole('link', { name: 'Open in Kinetonomics' });
        await waitFor(() => expect(open.getAttribute('href')).toBe(href('lessons/market?step=6&a=28')));
        expect(open.getAttribute('target')).toBe('_blank');
    });

    it('writes nothing to its address, whose history is the other site\'s', async () => {
        const user = userEvent.setup();
        const replaced = vi.spyOn(window.history, 'replaceState'),
            pushed = vi.spyOn(window.history, 'pushState');
        embed('embed/lessons/market?step=5');
        replaced.mockClear();
        await screen.findByRole('heading', { name: 'Supply, demand and market equilibrium' });

        await user.click(screen.getByRole('button', { name: 'Next' }));
        await pause();
        expect(address()).toBe('/embed/lessons/market?step=5');
        expect(replaced).not.toHaveBeenCalled();
        expect(pushed).not.toHaveBeenCalled();
        // The way to the app follows the view, though.
        await waitFor(() => expect(screen.getByRole('link', { name: 'Open in Kinetonomics' }).getAttribute('href'))
            .toBe(href('lessons/market?step=6')));
    });

    it('opens the Playground in a tab of its own, and leaves the page where it was', async () => {
        const user = userEvent.setup();
        embed('embed/news/2026-09-us-fed-rate');
        await screen.findByRole('heading', { name: 'The US Federal Reserve raises its interest rate' });

        await user.click(screen.getByRole('link', { name: 'Open in the Playground' }));
        expect(opened).toEqual([href('playground/aud?supply=60')]);
        expect(window.open).toHaveBeenCalledWith(href('playground/aud?supply=60'), '_blank', 'noopener');
        expect(address()).toBe('/embed/news/2026-09-us-fed-rate');
        expect(screen.getByRole('heading', { name: 'The US Federal Reserve raises its interest rate' })).toBeTruthy();
    });

    it('opens the first lesson at its start where its lesson has gone, as a link does', async () => {
        embed('embed/lessons/gone?step=4');
        await screen.findByRole('heading', { name: /./, level: 2 });
        const open = screen.getByRole('link', { name: 'Open in Kinetonomics' });
        await waitFor(() => expect(open.getAttribute('href')).toMatch(/\/lessons\/[^?]+$/));
    });
});

describe('The diagram only, embedded', () => {

    it('is the playground\'s stage, with the arrangement and Reset under it and the Playground at the end', async () => {
        embed('embed/playground/market?layout=diagram&arrange=grid&a=26');
        await waitFor(() => expect(panels()).toEqual(['market', 'surplus', 'revenue']));

        // No title, no tabs, no lesson and no "What changed".
        expect(screen.queryByRole('heading')).toBeNull();
        expect(screen.queryByRole('tab')).toBeNull();
        expect(screen.queryByRole('region', { name: 'What changed' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Share' })).toBeNull();

        // In the grid the link named, and the market it opened with is Reset's.
        expect(screen.getByRole('button', { name: 'Switch to Focus' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Reset' })).toHaveProperty('disabled', true);

        const playground = screen.getByRole('link', { name: 'Open in the Playground' });
        await waitFor(() => expect(playground.getAttribute('href'))
            .toBe(href('playground/market?arrange=grid&a=26')));
        expect(playground.getAttribute('target')).toBe('_blank');
    });

    it('draws a lesson\'s model whole, without its step or a tab', async () => {
        embed('embed/lessons/market?layout=diagram&step=2&tab=maths');
        await waitFor(() => expect(panels()).toEqual(['market', 'surplus', 'revenue']));
        expect(screen.queryByRole('group', { name: 'Lesson steps' })).toBeNull();
        await waitFor(() => expect(screen.getByRole('link', { name: 'Open in the Playground' }).getAttribute('href'))
            .toBe(href('playground/market')));
    });

    it('follows the arrangement into the way out, and writes nothing to its own address', async () => {
        const user = userEvent.setup();
        embed('embed/playground/market?layout=diagram');
        await waitFor(() => expect(panels()).toEqual(['market', 'surplus', 'revenue']));

        await user.click(screen.getByRole('button', { name: 'Switch to Grid' }));
        await waitFor(() => expect(screen.getByRole('link', { name: 'Open in the Playground' }).getAttribute('href'))
            .toBe(href('playground/market?arrange=grid')));
        await pause();
        expect(address()).toBe('/embed/playground/market?layout=diagram');
    });
});

describe('An embed of nothing', () => {

    it('says so in the frame, with the way to the app', async () => {
        embed('embed/news/2026-01-nothing-happened');
        expect(screen.getByText('There is no lesson, model or story at this address.')).toBeTruthy();
        const open = screen.getByRole('link', { name: /Open Kinetonomics/ });
        expect(open.getAttribute('href')).toBe(href(''));
        expect(open.getAttribute('target')).toBe('_blank');
    });

    it('says so for a path the app does not have', () => {
        embed('embed/fx');
        expect(screen.getByText('There is no lesson, model or story at this address.')).toBeTruthy();
    });
});

describe('Embed… in Share', () => {

    // The app itself, where Share is.
    const app = async (address: string) => {
        const { App } = await import('../App');
        window.history.replaceState(null, '', '/' + address);
        return render(<MantineProvider theme={theme} env="test"><App /></MantineProvider>);
    };
    const dialog = () => screen.getByRole('dialog', { name: 'Embed' });
    const code = () => within(dialog()).getByRole('textbox', { name: 'Code for the page' }) as HTMLTextAreaElement;
    const src = () => /src="([^"]+)"/.exec(code().value)![1].replace(/&amp;/g, '&');
    const choose = (user: ReturnType<typeof userEvent.setup>, name: string) =>
        user.click(within(dialog()).getByRole('radio', { name }));

    const openDialog = async (user: ReturnType<typeof userEvent.setup>) => {
        await user.click(screen.getByRole('button', { name: 'Share' }));
        await user.click(screen.getByRole('menuitem', { name: 'Embed…' }));
        return dialog();
    };

    it('gives the whole lesson at its start, and this view where asked', async () => {
        const user = userEvent.setup();
        await app('lessons/market?step=6&a=28');
        await waitFor(() => expect(window.location.search).toBe('?step=6&a=28'));
        await openDialog(user);

        expect(within(dialog()).getByRole('radio', { name: 'The whole lesson' })).toHaveProperty('checked', true);
        expect(within(dialog()).getByRole('radio', { name: 'The start of the lesson' })).toHaveProperty('checked', true);
        expect(src()).toBe(href('embed/lessons/market'));
        expect(code().value).toContain('title="Supply, demand and market equilibrium" width="1000" height="640"');
        // This view is said in words, with what the student moved.
        expect(dialog().textContent).toContain('Step 6 of');
        expect(dialog().textContent).toContain('Step 6 of 9 · What sellers earn · a 26.0 → 28.0');

        await choose(user, 'This view');
        expect(src()).toBe(href('embed/lessons/market?step=6&a=28'));
    });

    it('gives the diagram only as the model\'s, at its own market or at the one on screen', async () => {
        const user = userEvent.setup();
        await app('lessons/market?step=6&a=28');
        await waitFor(() => expect(window.location.search).toBe('?step=6&a=28'));
        await openDialog(user);

        await choose(user, 'The diagram only');
        expect(src()).toBe(href('embed/playground/market?layout=diagram'));
        expect(code().value).toContain('title="A market, its surplus and its revenue" width="640" height="480"');

        await choose(user, 'This view');
        expect(src()).toBe(href('embed/playground/market?layout=diagram&a=28'));
    });

    it('opens at this view in the playground, as its link does', async () => {
        const user = userEvent.setup();
        await app('playground/market?tab=scenarios&a=26');
        await waitFor(() => expect(window.location.search).toBe('?tab=scenarios&a=26'));
        await openDialog(user);

        expect(within(dialog()).getByRole('radio', { name: 'This view' })).toHaveProperty('checked', true);
        expect(src()).toBe(href('embed/playground/market?tab=scenarios&a=26'));
        // The diagram alone has no tabs.
        await choose(user, 'The diagram only');
        expect(src()).toBe(href('embed/playground/market?layout=diagram&a=26'));
    });

    it('copies the code and says it has, and a new choice is code not yet copied', async () => {
        const user = userEvent.setup();
        await app('lessons/market');
        await openDialog(user);

        await user.click(within(dialog()).getByRole('button', { name: 'Copy code' }));
        await waitFor(() => expect(within(dialog()).getByRole('button', { name: 'Copied' })).toBeTruthy());
        expect(await navigator.clipboard.readText()).toBe(code().value);

        await choose(user, 'The diagram only');
        expect(within(dialog()).getByRole('button', { name: 'Copy code' })).toBeTruthy();
    });

    it('previews the embed in a tab of its own', async () => {
        const user = userEvent.setup();
        await app('lessons/market');
        await openDialog(user);
        const preview = within(dialog()).getByRole('link', { name: 'Preview' });
        expect(preview.getAttribute('href')).toBe(href('embed/lessons/market'));
        expect(preview.getAttribute('target')).toBe('_blank');
    });
});

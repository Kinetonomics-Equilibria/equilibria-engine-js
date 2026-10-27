import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import jsQR from 'jsqr';
import { App } from '../App';
import { theme } from '../theme';

/**
 * Share: the menu at the far end of the title line, for everything that leaves
 * the screen — the link, a QR code, a picture of the diagram, a printed page.
 *
 * The whole app on the shipped market lesson, since what Share hands out is
 * the address's view. The browser's halves are stood in for where jsdom has
 * none — the clipboard, drawing a picture, the print dialog — and the QR code
 * is read back from what is drawn, as a camera would.
 */

vi.mock('html-to-image', () => ({ toPng: vi.fn() }));
import { toPng } from 'html-to-image';

/** jsdom performs no layout, so the stage would measure 0x0 and mount nothing. */
beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {
        get() { return 1200 }, configurable: true
    });
    Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
        get() { return 800 }, configurable: true
    });
});

// user-event puts a clipboard of its own on the page for each test, which is
// read back here as a paste would read it.
const pasted = () => navigator.clipboard.readText();

let saved: string[] = [];
beforeEach(() => {
    saved = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        saved.push(this.download);
    });
    vi.mocked(toPng).mockResolvedValue('data:image/png;base64,iVBORw0KGgo=');
    window.print = vi.fn();
});

/** Open the app at an address, as pasting it would. */
const open = (search = '') => {
    window.history.replaceState(null, '', '/' + search);
    return render(<MantineProvider theme={theme} env="test"><App /></MantineProvider>);
};

const href = (search: string) => window.location.origin + '/' + search;
const share = () => screen.getByRole('button', { name: 'Share' });
const item = (name: RegExp) => screen.getByRole('menuitem', { name });
const qrSheet = () => screen.queryByRole('region', { name: 'QR code' });

/**
 * What a QR code drawn on the page says, read off its modules as a camera
 * would read them off the board: each dark module of the drawing painted
 * black into an image, and the image decoded.
 */
function scan(code: Element): string | null {
    const size = Number(code.getAttribute('viewBox')!.split(' ')[2]),
        scale = 4, width = size * scale,
        pixels = new Uint8ClampedArray(width * width * 4).fill(255),
        modules = /M(\d+) (\d+)h1v1h-1z/g,
        d = code.querySelector('path')!.getAttribute('d')!;
    for (let m = modules.exec(d); m; m = modules.exec(d)) {
        for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
                const at = ((Number(m[2]) * scale + dy) * width + Number(m[1]) * scale + dx) * 4;
                pixels[at] = pixels[at + 1] = pixels[at + 2] = 0;
            }
        }
    }
    const read = jsQR(pixels, width, width);
    return read ? read.data : null;
}

describe('Share', () => {

    it('is at the far end of the title line, says its name, and works under the cover', () => {
        open();
        const line = screen.getByRole('heading', { level: 2 }).parentElement!;
        const names = within(line).getAllByRole('button').map(b => b.getAttribute('aria-label') || b.textContent);
        expect(names[names.length - 1]).toBe('Share');
        expect(share()).toHaveProperty('disabled', false);
        expect(screen.getByRole('button', { name: 'Reset' })).toHaveProperty('disabled', true);
    });

    it('copies the link to this view, or to the start of the lesson, and says it has', async () => {
        const user = userEvent.setup();
        open('?lesson=market&step=6&a=28');
        await user.click(share());
        await user.click(item(/^Copy link/));

        await waitFor(() => expect(item(/^Copy link/).textContent).toContain('Copied'));
        expect(await pasted()).toBe(href('?lesson=market&step=6&a=28'));

        await user.click(screen.getByRole('radio', { name: 'The start of the lesson' }));
        expect(item(/^Copy link/).textContent).not.toContain('Copied');
        await user.click(item(/^Copy link/));
        await waitFor(() => expect(item(/^Copy link/).textContent).toContain('Copied'));
        expect(await pasted()).toBe(href('?lesson=market'));
    });

    it('copies the older way where the clipboard is refused, and gives the link where both are', async () => {
        const user = userEvent.setup();
        vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Refused'));
        const copied = vi.fn(() => true);
        document.execCommand = copied;
        open('?lesson=market&step=6');
        await user.click(share());
        await user.click(item(/^Copy link/));
        await waitFor(() => expect(item(/^Copy link/).textContent).toContain('Copied'));
        expect(copied).toHaveBeenCalledWith('copy');

        copied.mockReturnValue(false);
        await user.click(item(/^Copy link/));
        await waitFor(() => expect(item(/^Copy link/).textContent)
            .toContain(`would not copy it. It is ${href('?lesson=market&step=6').replace(/^https?:\/\//, '')}`));
    });

    it('shows a QR code over the stage that scans as the link, and Done or Esc puts it away', async () => {
        const user = userEvent.setup();
        open('?lesson=market&step=6&a=28');
        await user.click(share());
        await user.click(item(/^Show a QR code/));

        const sheet = qrSheet()!;
        expect(scan(within(sheet).getByRole('img', { name: /^QR code\. Opens this view/ })))
            .toBe(href('?lesson=market&step=6&a=28'));
        expect(sheet.textContent).toContain('localhost');
        // A sheet over the stage, so its tools are put away; Share is not.
        expect(screen.getByRole('button', { name: 'Reset' })).toHaveProperty('disabled', true);
        expect(screen.getByRole('radio', { name: 'Grid' })).toHaveProperty('disabled', true);
        expect(share()).toHaveProperty('disabled', false);

        await user.click(within(sheet).getByRole('button', { name: 'Done' }));
        expect(qrSheet()).toBeNull();

        await user.click(share());
        await user.click(screen.getByRole('radio', { name: 'The start of the lesson' }));
        await user.click(item(/^Show a QR code/));
        expect(scan(within(qrSheet()!).getByRole('img', { name: /Opens the lesson at its start/ })))
            .toBe(href('?lesson=market'));
        await user.keyboard('{Escape}');
        expect(qrSheet()).toBeNull();
    });

    it('offers the picture and the page only where the diagram is on screen', async () => {
        const user = userEvent.setup();
        open();
        await user.click(share());
        expect(item(/^Download the diagram/)).toHaveProperty('disabled', true);
        expect(item(/^Print or save as PDF/)).toHaveProperty('disabled', true);
        expect(item(/^Download the diagram/).textContent).toContain('When the diagram is back on screen');
        await user.keyboard('{Escape}');

        await user.click(screen.getByRole('button', { name: 'Start lesson' }));
        await user.click(share());
        expect(item(/^Download the diagram/)).toHaveProperty('disabled', false);
        expect(item(/^Print or save as PDF/)).toHaveProperty('disabled', false);
    });

    it('downloads the stage as a picture named for where the lesson is', async () => {
        const user = userEvent.setup();
        open('?lesson=market&step=6&a=28');
        await user.click(share());
        await user.click(item(/^Download the diagram/));

        await waitFor(() => expect(saved).toEqual(['Supply and demand, step 6.png']));
        // Of the stage as drawn: its sheets, curves and captions, and not the column beside it.
        const drawn = vi.mocked(toPng).mock.calls[0][0];
        expect(drawn.querySelector('.kg-container svg')).toBeTruthy();
        expect(drawn.querySelector('[data-testid="stage-chrome"] [data-panel="market"]')).toBeTruthy();
        expect(drawn.contains(screen.getByRole('region', { name: 'What changed' }))).toBe(false);
        await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    });

    it('says so, and stays open, when the browser will not draw the picture', async () => {
        const user = userEvent.setup();
        vi.mocked(toPng).mockRejectedValue(new Error('Tainted canvas'));
        open('?lesson=market&step=6');
        await user.click(share());
        await user.click(item(/^Download the diagram/));

        await waitFor(() => expect(item(/^Download the diagram/).textContent).toContain('would not draw it'));
        expect(saved).toEqual([]);
    });

    it('prints the view, with its settings in words and a code back to it', async () => {
        const user = userEvent.setup();
        open('?lesson=market&step=7&focus=revenue&a=26.5');
        await user.click(share());
        await user.click(item(/^Print or save as PDF/));
        expect(window.print).toHaveBeenCalled();

        const printed = screen.getByText('Moved from where the lesson puts it').parentElement!;
        expect(printed.textContent).toContain('Step 7 of 9: Back to the start');
        expect(printed.textContent).toContain('Revenue at the front');
        expect(printed.textContent).toContain('a 20.0 → 26.5');
        expect(scan(screen.getByRole('img', { name: /back to this view, for the printed page/ })))
            .toBe(href('?lesson=market&step=7&focus=revenue&a=26.5'));
    });
});

describe('Share on a phone', () => {

    const matchMedia = window.matchMedia;
    beforeAll(() => {
        window.matchMedia = ((query: string) => ({
            matches: query.indexOf('max-width: 899px') > -1,
            media: query,
            onchange: null,
            addListener: () => { },
            removeListener: () => { },
            addEventListener: () => { },
            removeEventListener: () => { },
            dispatchEvent: () => false
        })) as unknown as typeof window.matchMedia;
    });
    afterAll(() => { window.matchMedia = matchMedia; });

    /** The ⋯'s items, by their names: each says what it does under its name. */
    const menu = async (user: ReturnType<typeof userEvent.setup>) => {
        await user.click(await screen.findByRole('button', { name: 'More' }));
        const names = /^(Reset|Copy link|Send with…|Show a QR code|Download the diagram|Print or save as PDF)/;
        return (await screen.findAllByRole('menuitem')).map(i => (names.exec(i.textContent || '') || [i.textContent])[0]);
    };

    it('is in the ⋯ with Reset: the link, the picture and the page, and no QR code', async () => {
        const user = userEvent.setup();
        open('?lesson=market&step=6&a=28');
        expect(await menu(user)).toEqual(['Reset', 'Copy link', 'Download the diagram', 'Print or save as PDF']);
        expect(screen.queryByRole('button', { name: 'Share' })).toBeNull();

        await user.click(item(/^Copy link/));
        await waitFor(() => expect(item(/^Copy link/).textContent).toContain('Copied'));
        expect(await pasted()).toBe(href('?lesson=market&step=6&a=28'));
    });

    it('hands the link to the phone\'s own share sheet where it has one', async () => {
        const user = userEvent.setup();
        const sent = vi.fn(() => Promise.resolve());
        Object.defineProperty(navigator, 'share', { value: sent, configurable: true });
        try {
            open('?lesson=market&step=6&a=28');
            await menu(user);
            await user.click(item(/^Send with/));
            expect(sent).toHaveBeenCalledWith({
                title: 'A market, and what it does to everything else',
                url: href('?lesson=market&step=6&a=28')
            });
        } finally {
            delete (navigator as { share?: unknown }).share;
        }
    });
});

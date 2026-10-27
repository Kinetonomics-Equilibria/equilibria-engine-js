import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { App } from '../App';
import { theme } from '../theme';

/**
 * Present, on the title's line: the page full screen with the rail put away,
 * for a classroom projector, and Esc to come back.
 *
 * jsdom has no full screen, so the browser's half is stood in for here: a
 * request makes the page the full-screen element and says so, as a browser
 * does, and Esc is the browser saying it has stopped — which is all a page
 * ever hears of Esc in full screen. The whole app, because the rail is the
 * shell's.
 */

let enabled = true;
let fullscreen: Element | null = null;

/** The browser's notice, which is the only one the page gets either way. */
function becomes(element: Element | null) {
    fullscreen = element;
    document.dispatchEvent(new Event('fullscreenchange'));
}

beforeAll(() => {
    // jsdom performs no layout, so the stage would measure 0x0 and mount nothing.
    Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {
        get() { return 1200 }, configurable: true
    });
    Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
        get() { return 800 }, configurable: true
    });
    Object.defineProperty(document, 'fullscreenEnabled', { get: () => enabled, configurable: true });
    Object.defineProperty(document, 'fullscreenElement', { get: () => fullscreen, configurable: true });
    document.documentElement.requestFullscreen = function (this: Element) {
        becomes(this);
        return Promise.resolve();
    };
    document.exitFullscreen = () => {
        becomes(null);
        return Promise.resolve();
    };
});

beforeEach(() => {
    enabled = true;
    fullscreen = null;
});

const mount = () => render(<MantineProvider theme={theme} env="test"><App /></MantineProvider>);

const present = () => screen.getByRole('button', { name: 'Present to a class' });

/** The rail's Lessons button, wherever the rail is. */
const rail = () => screen.getByRole('button', { name: 'Lessons', hidden: true });

describe('Present', () => {

    it('is on the title\'s line between Reset and Share, and works under the cover', () => {
        mount();
        const line = screen.getByRole('heading', { level: 2 }).parentElement!;
        const names = within(line).getAllByRole('button').map(b => b.getAttribute('aria-label') || b.textContent);
        expect(names.slice(-3)).toEqual(['Reset', 'Present to a class', 'Share']);
        expect(present()).toHaveProperty('disabled', false);
        expect(present().getAttribute('aria-pressed')).toBe('false');
    });

    it('puts the whole page full screen, and the rail away', async () => {
        mount();
        expect(rail().closest('[inert]')).toBeNull();

        await userEvent.setup().click(present());

        expect(fullscreen).toBe(document.documentElement);
        expect(rail().closest('[inert]')).toBeTruthy();
        expect(present().getAttribute('aria-pressed')).toBe('true');
    });

    it('comes back on Esc, with the rail', async () => {
        mount();
        await userEvent.setup().click(present());

        act(() => becomes(null));

        expect(rail().closest('[inert]')).toBeNull();
        expect(present().getAttribute('aria-pressed')).toBe('false');
    });

    it('comes back when pressed again', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(present());
        await user.click(present());

        expect(fullscreen).toBeNull();
        expect(rail().closest('[inert]')).toBeNull();
    });

    // The lesson goes on underneath: presenting is a change of size, and the
    // stage arranges itself for that as it does for a wider window.
    it('leaves the lesson where it was', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(screen.getByRole('button', { name: 'Start lesson' }));
        await user.click(present());

        expect(screen.getByRole('button', { name: 'Next' })).toBeTruthy();
        expect(screen.queryByRole('region', { name: 'About this lesson' })).toBeNull();
    });

    it('is not offered where the browser cannot present', () => {
        enabled = false;
        mount();
        expect(screen.queryByRole('button', { name: 'Present to a class' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Reset' })).toBeTruthy();
    });
});

describe('Present on a phone', () => {

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

    it('is not offered, on the line or in its menu', async () => {
        const user = userEvent.setup();
        mount();
        await user.click(await screen.findByRole('button', { name: 'More' }));

        expect(await screen.findByRole('menuitem', { name: 'Reset' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Present to a class' })).toBeNull();
        expect(screen.queryByRole('menuitem', { name: /Present/ })).toBeNull();
    });
});

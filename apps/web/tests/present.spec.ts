import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { test } from './helpers';

/**
 * Present, in a real browser: the page full screen, the rail put away and the
 * stage given its width, and back to the page as it was.
 *
 * Only a browser can say it, because full screen is the browser's: jsdom has
 * none, and the unit tests stand in for it with a page that says it has gone
 * full screen. Here the browser decides.
 *
 * Esc cannot be pressed from here. The browser takes it for itself before the
 * page hears anything, and Playwright's keys are delivered to the page — so a
 * pressed Escape reaches the page and leaves full screen alone. What Esc looks
 * like from the page is full screen ending, with no full-screen element and a
 * `fullscreenchange`, and that the page can ask for itself.
 */

const fullScreen = (page: Page) => page.evaluate(() => document.fullscreenElement === document.documentElement);

test('Present puts the page full screen with the rail away, and comes back', async ({ page }) => {
    await page.goto('/?lesson=fx');
    await page.locator('.kg-container svg').waitFor();

    const present = page.getByRole('button', { name: 'Present to a class' });
    const rail = page.locator('nav').first();
    const stage = page.locator('[class*="stageBox"]');
    const width = async () => (await stage.boundingBox())!.width;
    const before = await width();

    const presenting = async () => {
        await expect.poll(() => fullScreen(page)).toBe(true);
        await expect(present).toHaveAttribute('aria-pressed', 'true');
        await expect(rail).toHaveAttribute('inert', '');
        await expect(rail).not.toBeInViewport();
        // The rail's width is the stage's, and the stage arranged itself for it.
        await expect.poll(width).toBeGreaterThan(before + 60);
    };
    const back = async () => {
        await expect.poll(() => fullScreen(page)).toBe(false);
        await expect(present).toHaveAttribute('aria-pressed', 'false');
        await expect(rail).not.toHaveAttribute('inert', '');
        await expect(rail).toBeInViewport();
        await expect.poll(width).toBe(before);
    };

    await present.click();
    await presenting();
    await present.click();
    await back();

    // And as Esc does it: the browser ends full screen, and says so.
    await present.click();
    await presenting();
    await page.evaluate(() => document.exitFullscreen());
    await back();
});

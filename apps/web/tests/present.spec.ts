import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { test } from './helpers';

/**
 * Present, in a real browser: the page full screen, the rail put away and its
 * room given to the stage, the side column drawn 1.5 times as large, and back
 * to the page as it was.
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
    await page.goto('/lessons/fx');
    await page.locator('.kg-container svg').waitFor();

    const present = page.getByRole('button', { name: 'Present to a class' });
    const rail = page.locator('nav').first();
    const stage = page.locator('[class*="stageBox"]');
    const column = page.locator('[class*="lessonBeside"]').locator('..');
    const where = async () => {
        const [s, c] = [(await stage.boundingBox())!, (await column.boundingBox())!];
        return { left: s.x, right: s.x + s.width, width: s.width, column: c.width, gap: c.x - (s.x + s.width) };
    };
    const before = await where();

    const presenting = async () => {
        await expect.poll(() => fullScreen(page)).toBe(true);
        await expect(present).toHaveAttribute('aria-pressed', 'true');
        await expect(rail).toHaveAttribute('inert', '');
        await expect(rail).not.toBeInViewport();
        // The rail's room is the stage's: it starts where the rail was.
        await expect.poll(async () => (await where()).left).toBeLessThan(before.left - 60);
        // The column is drawn 1.5 times as large, its width with it, and the
        // stage takes what is left beside it, at the same gap as before. So
        // the stage can come out narrower than it went in: the column grows by
        // more than the rail gave back (docs/design.md, "Present").
        const now = await where();
        expect(now.column).toBeCloseTo(before.column * 1.5, 0);
        expect(now.gap).toBeCloseTo(before.gap, 0);
    };
    const back = async () => {
        await expect.poll(() => fullScreen(page)).toBe(false);
        await expect(present).toHaveAttribute('aria-pressed', 'false');
        await expect(rail).not.toHaveAttribute('inert', '');
        await expect(rail).toBeInViewport();
        await expect.poll(async () => (await where()).width).toBe(before.width);
        expect((await where()).left).toBe(before.left);
        expect((await where()).column).toBe(before.column);
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

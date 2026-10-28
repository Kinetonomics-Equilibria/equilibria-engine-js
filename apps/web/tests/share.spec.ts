import { readFileSync } from 'node:fs';
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { test } from './helpers';

/**
 * Share, in a real browser: what only a browser has — its clipboard, a file
 * saved to the downloads, a code drawn as large as the stage, and the page as
 * it prints.
 */

const VIEW = '/lessons/fx?step=7&supply=56';

async function opened(page: Page, address: string) {
    await page.goto(address);
    await page.locator('.kg-container svg').waitFor();
}

const share = (page: Page) => page.getByRole('button', { name: 'Share' });
const item = (page: Page, name: RegExp) => page.getByRole('menuitem', { name });
const stageWidth = (page: Page) => page.locator('[class*="stageBox"]').evaluate(el => el.getBoundingClientRect().width);

// The lesson's link at its start, whatever the view: Copy link is named
// "Copied" once it has.
test('Copy link puts the lesson\'s address on the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await opened(page, VIEW);
    await share(page).click();
    await item(page, /^Copy link/).click();

    await expect(item(page, /^(Copy link|Copied)/)).toContainText('Copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(new URL('/lessons/fx', page.url()).href);
});

test('Download saves the stage as drawn, at twice its pixels, named for the view', async ({ page, pageErrors }) => {
    await opened(page, VIEW);
    const width = await page.locator('[class*="stageLayer"]').evaluate(el => el.getBoundingClientRect().width);
    await share(page).click();

    const [download] = await Promise.all([
        page.waitForEvent('download'),
        item(page, /^Download the diagram/).click()
    ]);

    expect(download.suggestedFilename()).toBe('Exchange rates (AUD), step 7.png');
    const png = readFileSync((await download.path())!);
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    // The image's width, from its header.
    expect(Math.abs(png.readUInt32BE(16) - 2 * width)).toBeLessThanOrEqual(2);
    await expect(page.getByRole('menu')).toBeHidden();
    expect(pageErrors).toEqual([]);
});

test('the QR code is as large as the stage allows, and Esc puts it away', async ({ page }) => {
    await opened(page, VIEW);
    const stage = (await page.locator('[class*="stageBox"]').boundingBox())!;
    await share(page).click();
    await item(page, /^Show a QR code/).click();

    const code = page.getByRole('img', { name: /^QR code\. Opens the lesson at its start/ });
    const box = (await code.boundingBox())!;
    expect(Math.min(box.width, box.height)).toBeGreaterThan(0.6 * Math.min(stage.width, stage.height));
    await expect(page.getByRole('region', { name: 'QR code' })).toContainText('localhost');

    await page.keyboard.press('Escape');
    await expect(code).toBeHidden();
});

test('on paper: the title, the view in words, the diagram fitted to the page, and the chain', async ({ page }) => {
    await opened(page, VIEW);
    // A move, so the chain has something to say.
    await page.getByRole('button', { name: 'Next' }).click();
    const onScreen = await stageWidth(page);

    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    await page.emulateMedia({ media: 'print' });

    await expect(page.getByRole('heading', { name: 'The Australian dollar, and what moves it' })).toBeVisible();
    await expect(page.getByText('Step 8 of 15: Up is stronger, down is weaker')).toBeVisible();
    await expect(page.getByText('Supply of AUD 50 → 56')).toBeVisible();
    await expect(page.getByRole('img', { name: /back to this view, for the printed page/ })).toBeVisible();
    // The whole chain, since paper has no "See all" to press.
    await expect(page.locator('[data-printed] [data-part="effect"]')).toBeVisible();
    await expect(page.getByRole('region', { name: 'What changed' })).toBeHidden();
    // Nothing to press: no rail, no tools, no tabs.
    await expect(page.locator('nav').first()).toBeHidden();
    await expect(share(page)).toBeHidden();
    await expect(page.getByRole('tab', { name: 'Lesson' })).toBeHidden();
    expect(await stageWidth(page)).toBeLessThanOrEqual(681);

    await page.emulateMedia({ media: 'screen' });
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await expect.poll(() => stageWidth(page)).toBe(onScreen);
});

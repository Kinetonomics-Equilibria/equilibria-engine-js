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

/**
 * What a saved picture is drawn from leaves the stylesheet behind for what is
 * inside an `<svg>` (`readyForPicture`), so these read the picture's own
 * pixels: nothing about the page says what came out. At two pixels to one, and
 * from the top left of the stage.
 */
const DRAGGABLE = '/playground/aud';
const thumbs = (page: Page) => page.locator('.kg-handle-thumb:visible');

interface Box { x: number; y: number; width: number; height: number }

async function savedPicture(page: Page) {
    await share(page).click();
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        item(page, /^Download the diagram/).click()
    ]);
    return readFileSync((await download.path())!).toString('base64');
}

/** The red of each pixel in a box of the picture, row by row: how light a grey or a black is. */
const redsIn = (page: Page, png: string, box: Box) =>
    page.evaluate(async ({ png, x, y, width, height }) => {
        const image = new Image();
        image.src = `data:image/png;base64,${png}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const paper = canvas.getContext('2d')!;
        paper.drawImage(image, 0, 0);
        const { data } = paper.getImageData(x, y, width, height);
        const rows: number[][] = [];
        for (let row = 0; row < height; row++) {
            rows.push(Array.from({ length: width }, (_, column) => data[4 * (row * width + column)]));
        }
        return rows;
    }, { png, ...box });

const onThePicture = async (page: Page, box: Box): Promise<Box> => {
    const stage = (await page.locator('[class*="stageLayer"]').boundingBox())!;
    return {
        x: Math.round(2 * (box.x - stage.x)), y: Math.round(2 * (box.y - stage.y)),
        width: Math.ceil(2 * box.width), height: Math.ceil(2 * box.height)
    };
};

test('the picture has no handles, only the curve where one was', async ({ page }) => {
    await opened(page, DRAGGABLE);
    const thumb = (await thumbs(page).first().boundingBox())!;
    // The thumb's middle, white on screen: the curve's blue, running on through.
    const middle = await onThePicture(page, { x: thumb.x + thumb.width / 2, y: thumb.y + thumb.height / 2, width: 0.5, height: 0.5 });
    const [[red]] = await redsIn(page, await savedPicture(page), middle);
    expect(red).toBeLessThan(120);
});

test('the picture has the axes as they are drawn, not as d3 writes them', async ({ page }) => {
    await opened(page, DRAGGABLE);
    const domains = await page.locator('g.axis path.domain:visible').evaluateAll(all => all.map(path => {
        const { x, y, width, height } = path.getBoundingClientRect();
        return { x, y, width, height };
    }));
    const quantity = domains.find(box => box.width > box.height)!;
    const number = await page.locator('g.axis text:visible', { hasText: /^100$/ }).first().evaluate(text => {
        const { x, y, width, height } = text.getBoundingClientRect();
        return { x, y, width, height };
    });

    // A column down through the quantity axis, between two ticks.
    const column = await onThePicture(page, { x: quantity.x + 0.3 * quantity.width, y: quantity.y - 6, width: 0.5, height: 16 });
    const digits = await onThePicture(page, number);
    const png = await savedPicture(page);

    const down = (await redsIn(page, png, column)).map(([red]) => red);
    const line = down.filter(red => red < 128);
    // 1.5px is three of the picture's, where d3's 1px would be two, and in the
    // axis colour, #333, where d3's would be black.
    expect(line.length).toBeGreaterThanOrEqual(3);
    expect(line.length).toBeLessThanOrEqual(4);
    expect(Math.min(...down)).toBeGreaterThan(40);

    // 14px type has digits 10px tall, so twenty here, where d3's 10px has fourteen.
    const inked = (await redsIn(page, png, digits)).filter(row => row.some(red => red < 128));
    expect(inked.length).toBeGreaterThanOrEqual(18);
});

test('the paper has no handles, and the keyboard can still move a curve after it', async ({ page }) => {
    await opened(page, DRAGGABLE);
    const demand = page.locator('g[role="slider"][aria-label="Demand for AUD"]');
    await expect(thumbs(page)).toHaveCount(2);
    await demand.focus();

    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    await page.emulateMedia({ media: 'print' });
    await expect(thumbs(page)).toHaveCount(0);
    // A redraw with the handles hidden by the stylesheet, which is not the
    // same as there being none to drag.
    await page.keyboard.press('ArrowRight');

    await page.emulateMedia({ media: 'screen' });
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await expect(thumbs(page)).toHaveCount(2);
    await expect(demand).toHaveAttribute('tabindex', '0');
    await expect(demand).toHaveAttribute('aria-valuetext', '52');
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
    const onScreen = await stageWidth(page);
    const toPaper = async () => {
        await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
        await page.emulateMedia({ media: 'print' });
    };
    const toScreen = async () => {
        await page.emulateMedia({ media: 'screen' });
        await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    };

    // The view in words: the step, and what the link moved from where the
    // lesson puts it.
    await toPaper();
    await expect(page.getByRole('heading', { name: 'The Australian dollar exchange rate' })).toBeVisible();
    await expect(page.getByText('Step 7 of 15 · The AUD appreciates')).toBeVisible();
    await expect(page.getByText('Supply of AUD 50 → 56')).toBeVisible();
    await toScreen();

    // A step's move, so the chain has something to say. It plays from where
    // the lesson had the market, so the supply the link moved goes back.
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('region', { name: 'What changed' })).toHaveAttribute('data-kind', 'settled');

    await toPaper();
    await expect(page.getByText('Step 8 of 15 · Up is stronger, down is weaker')).toBeVisible();
    await expect(page.getByText('Supply of AUD 50 → 56')).toBeHidden();
    await expect(page.getByRole('img', { name: /back to this view, for the printed page/ })).toBeVisible();
    // The whole chain, since paper has no "See all" to press.
    await expect(page.locator('[data-printed] [data-part="effect"]')).toBeVisible();
    await expect(page.getByRole('region', { name: 'What changed' })).toBeHidden();
    // Nothing to press: no rail, no tools, no tabs.
    await expect(page.locator('nav').first()).toBeHidden();
    await expect(share(page)).toBeHidden();
    await expect(page.getByRole('tab', { name: 'Lesson' })).toBeHidden();
    expect(await stageWidth(page)).toBeLessThanOrEqual(681);

    await toScreen();
    await expect.poll(() => stageWidth(page)).toBe(onScreen);
});

import { expect } from '@playwright/test';
import type { FrameLocator, Page } from '@playwright/test';
import { test } from './helpers';

/**
 * Embeds, in a real browser and in a real frame: the code Share's Embed…
 * gives, pasted into a page on another site, as a class page would have it.
 *
 * What only a browser can say: that each layout fits the size its code asks
 * for without a scrollbar, that the whole lesson takes a phone's layout in a
 * narrow column, that Present is offered only where the frame may go full
 * screen, and that the diagram can be moved and opens the Playground at the
 * market it was moved to, all without the frame's address changing.
 */

/**
 * The other site: a page of its own with the frames in it, written straight
 * into the browser. Not served from an address of its own, because Chrome
 * will not load a private address such as `localhost` into a frame on a page
 * it takes for a public one, and a page the test serves itself is one.
 */
async function host(
    page: Page, base: string, frames: { id: string; src: string; width: number; height: number; full?: boolean }[]
) {
    await page.setContent('<!doctype html><body style="margin:0;padding:16px">' + frames.map(f =>
        `<iframe id="${f.id}" src="${new URL(f.src, base).href}" title="${f.id}" width="${f.width}" ` +
        `height="${f.height}" style="border:0;max-width:100%"${f.full ? ' allow="fullscreen"' : ''}></iframe>`
    ).join('') + '</body>');
}

/** A frame's own page, once its diagram is drawn. */
async function drawn(page: Page, id: string): Promise<FrameLocator> {
    const frame = page.frameLocator(`#${id}`);
    await frame.locator('.kg-container svg').first().waitFor();
    return frame;
}

/** How much of a frame's own page would scroll, across and down. */
const overflow = (frame: FrameLocator) => frame.locator('html').evaluate(el =>
    ({ x: el.scrollWidth - el.clientWidth, y: el.scrollHeight - el.clientHeight }));

test('the whole lesson fits its frame, with the lesson beside the stage and Present offered', async ({ page, baseURL, pageErrors }) => {
    await host(page, baseURL!, [{ id: 'lesson', src: '/embed/lessons/fx?step=7&supply=56', width: 1000, height: 640, full: true }]);
    const frame = await drawn(page, 'lesson');

    await expect(frame.getByRole('heading', { name: 'The Australian dollar exchange rate' })).toBeVisible();
    await expect(frame.getByRole('group', { name: 'Lesson steps' })).toBeVisible();
    await expect(frame.getByRole('button', { name: 'Present to a class' })).toBeVisible();
    await expect(frame.getByRole('button', { name: 'Share' })).toHaveCount(0);
    await expect(frame.getByRole('link', { name: 'Open in Kinetonomics' }))
        .toHaveAttribute('href', /\/lessons\/fx\?step=7&supply=56$/);

    // Nothing to scroll: the screen is the frame's height and width.
    expect(await overflow(frame)).toEqual({ x: 0, y: 0 });
    expect(pageErrors).toEqual([]);
});

test('the whole lesson takes a phone\'s layout in a narrow column, and no Present without full screen', async ({ page, baseURL }) => {
    await host(page, baseURL!, [{ id: 'narrow', src: '/embed/lessons/fx?step=7', width: 600, height: 640 }]);
    const frame = await drawn(page, 'narrow');

    // The lesson under the stage, and the tools in the ⋯.
    const stage = await frame.locator('[class*="stageBox"]').boundingBox(),
        lesson = await frame.getByRole('group', { name: 'Lesson steps' }).boundingBox();
    expect(lesson!.y).toBeGreaterThan(stage!.y + stage!.height);
    await frame.getByRole('button', { name: 'More' }).click();
    await expect(frame.getByRole('menuitem', { name: 'Open in Kinetonomics' })).toBeVisible();
    // This frame may not go full screen, so Present is not offered.
    await expect(frame.getByRole('button', { name: 'Present to a class' })).toHaveCount(0);
});

test('the diagram alone moves, and opens the Playground at the market it was moved to', async ({ page, baseURL, pageErrors }) => {
    await host(page, baseURL!, [{ id: 'diagram', src: '/embed/playground/aud?layout=diagram', width: 640, height: 480 }]);
    const frame = await drawn(page, 'diagram');

    const playground = frame.getByRole('link', { name: 'Open in the Playground' });
    await expect(playground).toHaveAttribute('href', /\/playground\/aud$/);
    await expect(frame.getByRole('button', { name: 'Reset' })).toBeDisabled();
    expect(await overflow(frame)).toEqual({ x: 0, y: 0 });

    // A handle is a slider: the keyboard moves it as a drag would.
    await frame.getByRole('slider').first().focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(playground).toHaveAttribute('href', /\/playground\/aud\?\w+=[\d.]+$/);
    await expect(frame.getByRole('button', { name: 'Reset' })).toBeEnabled();

    // The frame's own address never changes, and the page it is on stays put.
    expect(page.frames().find(f => f.url().includes('/embed/'))!.url()).toMatch(/\/embed\/playground\/aud\?layout=diagram$/);
    const [tab] = await Promise.all([page.context().waitForEvent('page'), playground.click()]);
    await tab.waitForURL(/\/playground\/aud/);
    expect(new URL(tab.url()).pathname).toBe('/playground/aud');
    expect(page.url()).toBe('about:blank');

    await frame.getByRole('button', { name: 'Reset' }).click();
    await expect(playground).toHaveAttribute('href', /\/playground\/aud$/);
    expect(pageErrors).toEqual([]);
});

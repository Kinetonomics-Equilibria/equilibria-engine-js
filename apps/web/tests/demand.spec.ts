import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { arrange, test, textCollisions } from './helpers';

/**
 * The Air Jordans lesson, in a real browser.
 *
 * What only a browser can say: that the two charts, one buyer's and the
 * market's, draw without an error, and that their words — P on two price
 * axes, Q_d, D and D₀ beside each other, the captions — never land on one
 * another wherever the lesson's scenarios put the price and the curve.
 */

/**
 * Through the lesson and out of it, into the instruments and the whole diagram.
 *
 * Every question is direction only, so the shortest way past one is to be shown.
 */
async function toTheEnd(page: Page) {
    const markers = page.locator('button[data-kinds]');
    const last = (await markers.count()) - 1;
    const question = page.getByRole('group', { name: 'Question' });

    for (let guard = 0; guard < 10; guard++) {
        await markers.nth(last).click();
        if (!(await question.isVisible())) break;
        await question.getByRole('button', { name: 'Check' }).click();
        await question.getByRole('button', { name: 'Show me' }).click();
    }
    await expect(markers.nth(last)).toHaveAttribute('aria-current', 'step');
    await page.getByRole('button', { name: 'Finish' }).click();
    await expect(page.getByRole('tab', { name: 'Explore' })).toHaveAttribute('aria-selected', 'true');
}

test.beforeEach(async ({ page }) => {
    await page.goto('/?lesson=demand');
});

test('opens the Air Jordans lesson from its address, without an error', async ({ page, pageErrors }) => {
    await expect(page.getByRole('heading', { name: 'Air Jordans, and what shifts demand' })).toBeVisible();
    await page.getByRole('button', { name: 'Start lesson' }).click();
    await expect(page.getByText('Your first pair', { exact: true })).toBeVisible();
    expect(pageErrors).toEqual([]);
});

test('no text on the stage lands on other text', async ({ page }) => {
    await toTheEnd(page);
    await page.getByRole('tab', { name: 'Scenarios' }).click();

    for (const arrangement of ['Focus', 'Grid'] as const) {
        await arrange(page, arrangement);
        for (const scenario of ['Back to the start', 'Part-time shifts dry up', 'Wages rise', 'Nike takes $50 off']) {
            // Exact: a progress marker is named by its step's title, and a
            // title could share words with a scenario.
            await page.getByRole('button', { name: scenario, exact: true }).click();
            await expect.poll(() => textCollisions(page), { message: `${arrangement}, ${scenario}` }).toEqual([]);
        }
    }
});

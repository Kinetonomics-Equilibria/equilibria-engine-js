import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { arrange, test, textCollisions } from './helpers';

/**
 * The plane tickets lesson, in a real browser.
 *
 * What only a browser can say: that the two charts, one airline's and the
 * market's, draw without an error, and that their words — P on two price
 * axes, Q_s, S and S₀ beside each other, the captions — never land on one
 * another wherever the lesson's scenarios and its PEANUT steps put the fare
 * and the curve.
 */

/**
 * Through the lesson and out of it, into the playground and the whole diagram.
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
    await page.goto('/lessons/supply');
});

test('opens the plane tickets lesson from its address, without an error', async ({ page, pageErrors }) => {
    await expect(page.getByRole('heading', { name: 'Plane tickets, and what shifts supply' })).toBeVisible();
    await page.getByRole('button', { name: 'Start lesson' }).click();
    await expect(page.getByText('Your first flight', { exact: true })).toBeVisible();
    expect(pageErrors).toEqual([]);
});

// The PEANUT steps are the one place the student's own flights move, so
// their chart is looked at there as well as the market's.
test('no text lands on other text through PEANUT', async ({ page }) => {
    for (const arrangement of ['', '&arrange=grid']) {
        for (let step = 9; step <= 16; step++) {
            await page.goto(`/lessons/supply?step=${step}${arrangement}`);
            await expect(page.getByRole('region', { name: 'What changed' })).toBeVisible();
            await expect.poll(() => textCollisions(page), { message: `step ${step}${arrangement}` }).toEqual([]);
        }
    }
});

test('no text on the stage lands on other text', async ({ page }) => {
    await toTheEnd(page);
    await page.getByRole('tab', { name: 'Scenarios' }).click();

    for (const arrangement of ['Focus', 'Grid'] as const) {
        await arrange(page, arrangement);
        for (const scenario of ['Back to the start', 'Jet fuel gets dearer', 'Airlines get new planes',
            'Holiday fares rise $50']) {
            // Exact: a progress marker is named by its step's title, and a
            // title could share words with a scenario.
            await page.getByRole('button', { name: scenario, exact: true }).click();
            await expect.poll(() => textCollisions(page), { message: `${arrangement}, ${scenario}` }).toEqual([]);
        }
    }
});

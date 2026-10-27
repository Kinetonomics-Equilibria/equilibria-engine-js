import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { arrange, test, textCollisions } from './helpers';

/**
 * In the news and Home, in a real browser: the page the app opens on, a
 * story's page with its report at the front and its move beside it, and the
 * rail's In the news panel — on a laptop and on a phone.
 *
 * What only a browser can say: where things land, that nothing lands on
 * anything else, and that the move draws its ghost.
 */

const address = (page: Page) => {
    const url = new URL(page.url());
    return url.pathname + url.search;
};
const caption = (page: Page, key: string) => page.locator(`[data-testid="stage-chrome"] [data-panel="${key}"]`);
const changed = (page: Page) => page.getByRole('region', { name: 'What changed' });
const report = (page: Page) => page.locator('[data-host-panel="story"]');
const HOME = 'Learn it, play with it, see it happen';
const RBA = '/news/2026-09-rba-cash-rate';

test('the app opens on Home: the places, and the newest stories', async ({ page, pageErrors }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: HOME })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Home' })).toHaveAttribute('data-active', 'true');

    const places = page.getByRole('region', { name: 'Where to go' });
    await expect(places.getByRole('button')).toHaveText([/^Lessons/, /^Playground/, /^In the news/]);
    const feed = page.getByRole('region', { name: 'Latest in the news' }).getByRole('link');
    await expect(feed).toHaveCount(3);
    await expect(feed.first()).toContainText('Iron ore falls to its lowest price in two years');

    // Side by side on a laptop, the places first.
    const where = (await places.boundingBox())!,
        news = (await page.getByRole('region', { name: 'Latest in the news' }).boundingBox())!;
    expect(news.x).toBeGreaterThan(where.x + where.width);
    expect(Math.abs(news.y - where.y)).toBeLessThan(1);
    expect(pageErrors).toEqual([]);
});

test('a place on Home brings out its panel beside the rail, as the rail does', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('region', { name: 'Where to go' }).getByRole('button', { name: 'Playground' }).click();

    const panel = page.getByRole('region', { name: 'Playground' });
    await expect(panel).toBeVisible();
    await expect(page.getByRole('button', { name: 'Playground', exact: true }).first())
        .toHaveAttribute('aria-expanded', 'true');
    // Where a course starts, open.
    await panel.getByRole('link', { name: 'Toasties and coffees at a café' }).click();
    await expect.poll(() => address(page)).toBe('/playground/cafe');
    await expect(panel).toBeHidden();
});

test('a story opens with its report at the front, and its move tells the chain', async ({ page, pageErrors }) => {
    await page.goto('/');
    await page.getByRole('region', { name: 'Latest in the news' })
        .getByRole('link', { name: /The RBA raises the cash rate/ }).click();
    await expect.poll(() => address(page)).toBe(RBA);
    await page.locator('.kg-container svg').waitFor();

    // Topic and date over the headline, and the report read at the front.
    await expect(page.getByRole('heading', { name: 'The RBA raises the cash rate to 4.60%' })).toBeVisible();
    await expect(page.getByText('29 September 2026', { exact: true })).toBeVisible();
    await expect(caption(page, 'story')).toHaveAttribute('data-focused', 'true');
    await expect(report(page)).toContainText('its fourth rise this year');
    await expect(report(page).getByRole('link', { name: 'Reserve Bank of Australia' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'In the news' })).toHaveAttribute('data-active', 'true');
    await expect(changed(page)).toHaveAttribute('data-kind', 'rest');

    await page.getByRole('button', { name: 'Show it on the diagram' }).click();
    await expect(caption(page, 'market')).toContainText('USD 0.70');
    await expect(caption(page, 'market')).toContainText('▲');
    await expect(changed(page)).toContainText('Demand for AUD increases');
    await expect(changed(page)).toContainText('The AUD appreciates');
    await expect(page.getByRole('button', { name: 'Show it on the diagram' })).toBeDisabled();
    await expect.poll(() => address(page)).toBe(RBA + '?demand=60');
    expect(pageErrors).toEqual([]);
});

test('Open in the Playground opens the market the move made, and Back is the story', async ({ page }) => {
    await page.goto(RBA);
    await page.locator('.kg-container svg').waitFor();
    await page.getByRole('link', { name: 'Open in the Playground' }).click();

    await expect.poll(() => address(page)).toBe('/playground/aud?demand=60');
    await expect(page.getByRole('tab', { name: 'Explore' })).toHaveAttribute('aria-selected', 'true');
    await expect(caption(page, 'market')).toContainText('USD 0.70');

    await page.goBack();
    await expect(page.getByRole('heading', { name: 'The RBA raises the cash rate to 4.60%' })).toBeVisible();
    expect(address(page)).toBe(RBA);
});

test('no text lands on other text on a story\'s page', async ({ page }) => {
    for (const [width, height] of [[1440, 900], [1800, 1000], [1024, 768]]) {
        await page.setViewportSize({ width, height });
        await page.goto(RBA);
        await page.locator('.kg-container svg').waitFor();
        for (const arrangement of ['Focus', 'Grid'] as const) {
            await arrange(page, arrangement);
            await expect(report(page)).toBeVisible();
            await expect.poll(() => textCollisions(page), { message: `${width}x${height}, ${arrangement}` })
                .toEqual([]);
        }
    }
});

test('the In the news panel lists every story newest first, under each month', async ({ page }) => {
    await page.goto('/lessons/fx');
    await page.getByRole('button', { name: 'In the news' }).click();

    const panel = page.getByRole('region', { name: 'In the news', exact: true });
    await expect(panel).toBeVisible();
    await expect(panel.getByText(/^(October|September|March) 2026$/)).toHaveText(
        ['October 2026', 'September 2026', 'March 2026']);
    const rows = panel.getByRole('link');
    await expect(rows).toHaveCount(5);
    await expect(rows.nth(0)).toContainText('15 Oct');
    await expect(rows.nth(4)).toContainText('Fuel excise is halved for three months');

    // Beside the rail, floating over the page as the other panels do, once
    // it has slid out.
    const rail = (await page.getByRole('button', { name: 'Home' }).boundingBox())!;
    await expect.poll(async () => (await panel.boundingBox())!.x).toBeGreaterThan(rail.x + rail.width);

    await rows.nth(3).click();
    await expect.poll(() => address(page)).toBe('/news/2026-09-petrol-price');
    await expect(page.getByRole('heading', { name: 'Petrol passes $2 a litre again' })).toBeVisible();
    await expect(panel).toBeHidden();
});

test.describe('on a phone', () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
    });

    test('Home stacks its cards, and its title stops short of the burger', async ({ page }) => {
        await page.goto('/');
        const title = (await page.getByRole('heading', { level: 1, name: HOME }).boundingBox())!,
            burger = (await page.getByRole('button', { name: 'Toggle navigation' }).boundingBox())!;
        expect(title.x + title.width).toBeLessThanOrEqual(burger.x);

        const where = (await page.getByRole('region', { name: 'Where to go' }).boundingBox())!,
            news = (await page.getByRole('region', { name: 'Latest in the news' }).boundingBox())!;
        expect(news.y).toBeGreaterThanOrEqual(where.y + where.height);
        expect(where.x + where.width).toBeLessThanOrEqual(390);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

        // A place opens the overlay at its panel.
        await page.getByRole('region', { name: 'Where to go' }).getByRole('button', { name: 'In the news' }).click();
        await expect(page.getByRole('region', { name: 'In the news', exact: true })).toBeVisible();
    });

    // A story on the market model has three panels under its report, too many
    // for a caption beside each glyph: they are a shelf, each captioned in
    // its share of the width.
    test('no text lands on other text on a story\'s page, on either model', async ({ page }) => {
        for (const story of [RBA, '/news/2026-09-petrol-price']) {
            await page.goto(story);
            await page.locator('.kg-container svg').waitFor();
            await expect(report(page)).toBeVisible();
            await expect.poll(() => textCollisions(page), { message: story }).toEqual([]);
        }
        await expect(caption(page, 'surplus')).toHaveAttribute('data-role', 'shelf');
    });

    test('a story puts its card under the stage, and the chain in the strip', async ({ page }) => {
        await page.goto(RBA);
        await page.locator('.kg-container svg').waitFor();

        const stage = (await page.locator('.kg-container svg').first().boundingBox())!,
            card = (await page.getByRole('region', { name: 'What it moves' }).boundingBox())!;
        expect(card.y).toBeGreaterThan(stage.y);
        await expect(page.getByRole('region', { name: 'What changed' })).toHaveCount(0);

        const strip = page.locator('[data-chain]');
        await expect(strip).toContainText('Press Show it on the diagram, below.');
        await page.getByRole('button', { name: 'Show it on the diagram' }).click();
        await expect(strip).toContainText('Demand for AUD');
        await expect(page.getByRole('status')).toContainText('the AUD appreciates');
        await expect.poll(() => textCollisions(page)).toEqual([]);

        // The burger opens at the In the news panel, the story's place.
        await page.getByRole('button', { name: 'Toggle navigation' }).click();
        await expect(page.getByRole('region', { name: 'In the news', exact: true })).toBeVisible();
    });
});

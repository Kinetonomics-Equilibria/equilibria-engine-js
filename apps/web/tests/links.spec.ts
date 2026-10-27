import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { RENDERED, test } from './helpers';

/**
 * Links, in a real browser: a pasted address opens the view it names, and the
 * address follows the view — a drag written when it is let go, not on every
 * frame of it, and replaced rather than pushed.
 *
 * What only a browser can say: that a linked move draws no ghost, which is the
 * engine's drawing rather than anything the app renders, and that a real
 * drag holds the address still until the pointer is released.
 */

const search = (page: Page) => new URL(page.url()).search;
const caption = (page: Page, key: string) => page.locator(`[data-testid="stage-chrome"] [data-panel="${key}"]`);
const changed = (page: Page) => page.getByRole('region', { name: 'What changed' });

async function opened(page: Page, address: string) {
    await page.goto(address);
    await page.locator('.kg-container svg').waitFor();
}

test('a pasted link opens its step and market, with no ghost of a move nobody made', async ({ page, pageErrors }) => {
    // "The AUD appreciates": demand for AUD at 60 since the step before.
    await opened(page, '/?lesson=fx&step=7');
    await expect(caption(page, 'market')).toContainText('USD 0.70');
    const curves = await page.locator(RENDERED.visibleCurve).count();

    // Supply at 56 as well: AUD 1 = 0.65 + (60 − 56)/200 = USD 0.67.
    await opened(page, '/?lesson=fx&step=7&supply=56');
    await expect(caption(page, 'market')).toContainText('USD 0.67');
    await expect(caption(page, 'market')).not.toContainText('▼');
    await expect(page.locator(RENDERED.visibleCurve)).toHaveCount(curves);
    await expect(changed(page)).toHaveAttribute('data-kind', 'rest');
    expect(search(page)).toBe('?lesson=fx&step=7&supply=56');
    expect(pageErrors).toEqual([]);
});

test('the address follows a drag when it is let go, replacing the last one', async ({ page }) => {
    await opened(page, '/?lesson=fx&tab=explore');
    await expect.poll(() => search(page)).toBe('?lesson=fx&tab=explore');
    const entries = await page.evaluate(() => history.length);

    // Demand for AUD, in the focal panel, runs down to the right: grab it a
    // quarter of the way along, clear of supply, and pull it right.
    const index = await page.evaluate(() => {
        const axes = [...document.querySelectorAll('g.axis')]
            .filter(axis => axis.querySelectorAll('g.tick').length >= 2)
            .map(axis => axis.getBoundingClientRect());
        const left = Math.min(...axes.map(b => b.x)), right = Math.max(...axes.map(b => b.x + b.width)),
            top = Math.min(...axes.map(b => b.y)), bottom = Math.max(...axes.map(b => b.y + b.height));
        return [...document.querySelectorAll('.kg-container path[class^="dragPath"]')].findIndex(p => {
            const path = p as SVGPathElement, b = path.getBoundingClientRect(),
                cx = b.x + b.width / 2, cy = b.y + b.height / 2;
            if (getComputedStyle(path).pointerEvents !== 'all') return false;
            if (cx < left || cx > right || cy < top || cy > bottom) return false;
            const a = path.getPointAtLength(0), z = path.getPointAtLength(path.getTotalLength());
            return (z.x - a.x) * (z.y - a.y) > 0;
        });
    });
    const box = (await page.locator('.kg-container path[class^="dragPath"]').nth(index).boundingBox())!;
    const x = box.x + box.width * 0.25, y = box.y + box.height * 0.25;

    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 60, y, { steps: 12 });
    // Held: the curve has moved and the address has not.
    await expect(caption(page, 'market')).toContainText('▲');
    await page.waitForTimeout(500);
    expect(search(page)).toBe('?lesson=fx&tab=explore');

    await page.mouse.up();
    await expect.poll(() => search(page)).toMatch(/^\?lesson=fx&tab=explore&demand=\d+$/);
    expect(await page.evaluate(() => history.length)).toBe(entries);
});

test('a link past a question opens at the question, unanswered, and says so', async ({ page }) => {
    await opened(page, '/?lesson=fx&step=15&demand=70');

    const question = page.getByRole('group', { name: 'Question' });
    await expect(question.getByRole('button', { name: 'Check' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Interest rates rise' })).toBeVisible();
    // Both curves where the question puts them: AUD 1 = USD 0.65.
    await expect(caption(page, 'market')).toContainText('USD 0.65');
    await expect.poll(() => search(page)).toBe('?lesson=fx&step=11');
});

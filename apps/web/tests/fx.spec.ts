import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { focalPointCoordinates, test, textCollisions } from './helpers';

/**
 * The A$ lesson, in a real browser.
 *
 * What only a browser can say: that the A$ market and the US$ market are two
 * regions of one SVG drawn by one engine, that a curve written as quantity in
 * terms of the rate is dragged *sideways* and narrated as moving right, and that
 * the rate the diagram draws is the rate the lesson's sentences quote.
 */

// The market in src/lessons/foreignExchange.ts: demand for A$ is
// Q = demand − 100(e − 0.65) and supply is Q = supply + 100(e − 0.65), both at
// 50, so it clears at Q* = 50 and e* = US$0.65 — and the US$ side at A$1/0.65.
const EQUILIBRIUM = { Q: 50, rate: 0.65 };

// Read back through the tick labels. The rate axis runs 0.40 to 0.90 over the
// panel's height, so a pixel is a few thousandths of a dollar; half a cent is
// still far tighter than any defect worth catching here.
const TOLERANCE = { Q: 0.5, rate: 0.005 };

/** Every question is direction only, so the shortest way past one is to be shown. */
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
}

/**
 * A curve in the focal panel that takes a pointer, by which way it slopes.
 *
 * Demand for A$ runs down to the right and supply up to the right, and that is
 * the one thing that tells the two apart from outside: both are hit-areas the
 * size of the panel's diagonal. Read from the path's own ends rather than its
 * box, which is the same for both.
 */
async function curveSloping(page: Page, way: 'down' | 'up') {
    const index = await page.evaluate((wanted) => {
        const ticked = [...document.querySelectorAll('g.axis')]
            .filter((axis) => axis.querySelectorAll('g.tick').length >= 2)
            .map((axis) => axis.getBoundingClientRect());
        const left = Math.min(...ticked.map((b) => b.x)), top = Math.min(...ticked.map((b) => b.y)),
            right = Math.max(...ticked.map((b) => b.x + b.width)),
            bottom = Math.max(...ticked.map((b) => b.y + b.height));

        const paths = [...document.querySelectorAll('.kg-container path[class^="dragPath"]')] as SVGPathElement[];
        return paths.findIndex((p) => {
            const b = p.getBoundingClientRect(), cx = b.x + b.width / 2, cy = b.y + b.height / 2;
            if (getComputedStyle(p).pointerEvents !== 'all') return false;
            if (cx < left || cx > right || cy < top || cy > bottom) return false;
            const a = p.getPointAtLength(0), z = p.getPointAtLength(p.getTotalLength());
            // SVG y grows downwards: a curve sloping down has its higher-x end lower.
            const falls = (z.x - a.x) * (z.y - a.y) > 0;
            return wanted === 'down' ? falls : !falls;
        });
    }, way);
    if (index < 0) throw new Error(`No draggable curve sloping ${way} in the focal panel`);
    return page.locator('.kg-container path[class^="dragPath"]').nth(index);
}

/**
 * Pull a curve sideways, by a point a quarter of the way along it.
 *
 * Not by its middle. The two curves cross at the equilibrium, and with both at
 * their baseline that crossing is the middle of *each* curve's box — so a grab
 * there takes whichever was drawn last, which is supply, and "drag demand
 * right" dragged supply right and the rate fell. A quarter of the way along is
 * still on the line, since each is straight, and well clear of the other one.
 */
async function dragSideways(page: Page, way: 'down' | 'up', dx: number) {
    const box = (await (await curveSloping(page, way)).boundingBox())!;
    const x = box.x + box.width * 0.25,
        y = way === 'down' ? box.y + box.height * 0.25 : box.y + box.height * 0.75;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y, { steps: 12 });
    await page.mouse.up();
}

const caption = (page: Page, key: string) => page.locator(`[data-testid="stage-chrome"] [data-panel="${key}"]`);

test.beforeEach(async ({ page }) => {
    await page.goto('/?lesson=fx');
    await page.locator('.kg-container svg').waitFor();
});

test('opens the A$ lesson from its address', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'The Australian dollar, and what moves it' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Exchange rates (A$)' })).toHaveAttribute('aria-current', 'page');
});

test('draws both currencies in one engine', async ({ page, pageErrors }) => {
    await toTheEnd(page);

    await expect(page.locator('.kg-container')).toHaveCount(1);
    await expect(page.locator('.kg-container svg')).toHaveCount(1);
    // Two panels, two axes each.
    await expect(page.locator('.kg-container g.axis')).toHaveCount(4);
    expect(await page.locator('.kg-container').innerHTML()).not.toContain('NaN');

    expect(pageErrors).toEqual([]);
});

test('clears at the rate the lesson quotes, on both sides', async ({ page }) => {
    await toTheEnd(page);

    const market = await focalPointCoordinates(page);
    expect(Math.abs(market.x - EQUILIBRIUM.Q), `Q* drawn at ${market.x}`).toBeLessThan(TOLERANCE.Q);
    expect(Math.abs(market.y - EQUILIBRIUM.rate), `e* drawn at ${market.y}`).toBeLessThan(TOLERANCE.rate);
    await expect(caption(page, 'market')).toContainText('A$1 = US$0.65');

    // The same trades from the US side: the same quantity, at the reciprocal.
    await page.getByRole('button', { name: 'Show US$ market' }).click();
    const mirror = await focalPointCoordinates(page);
    expect(Math.abs(mirror.x - EQUILIBRIUM.Q), `Q* drawn at ${mirror.x}`).toBeLessThan(TOLERANCE.Q);
    expect(Math.abs(mirror.y - 1 / EQUILIBRIUM.rate), `1/e* drawn at ${mirror.y}`).toBeLessThan(0.02);
    await expect(caption(page, 'mirror')).toContainText('US$1 = A$1.54');
});

test('demand for A$ is dragged right, and the A$ appreciates', async ({ page, pageErrors }) => {
    await toTheEnd(page);
    const before = await focalPointCoordinates(page);

    await dragSideways(page, 'down', 60);

    const after = await focalPointCoordinates(page);
    expect(after.y, 'the A$ should have risen').toBeGreaterThan(before.y + 0.01);
    expect(after.x, 'more A$ should change hands').toBeGreaterThan(before.x);

    // Sideways, said sideways — and the US$ side said with it.
    await expect(page.getByText('demand for A$ shifts to the right and supply of US$ shifts to the right',
        { exact: true })).toBeVisible();
    await expect(caption(page, 'market')).toContainText('▲');
    await expect(caption(page, 'mirror')).toContainText('▼');
    expect(pageErrors).toEqual([]);
});

test('supply of A$ is dragged right, and the A$ depreciates', async ({ page }) => {
    await toTheEnd(page);
    const before = await focalPointCoordinates(page);

    await dragSideways(page, 'up', 60);

    const after = await focalPointCoordinates(page);
    expect(after.y, 'the A$ should have fallen').toBeLessThan(before.y - 0.01);
    await expect(page.getByText('supply of A$ shifts to the right and demand for US$ shifts to the right',
        { exact: true })).toBeVisible();
    await expect(caption(page, 'market')).toContainText('▼');
});

test('a question about demand is answered by dragging it, and marked in its own words', async ({ page }) => {
    const markers = page.locator('button[data-kinds]');
    const kinds = await markers.evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-kinds') || ''));
    await markers.nth(kinds.findIndex((k) => k.includes('ask'))).click();

    const question = page.getByRole('group', { name: 'Question' });
    await expect(question).toContainText('Move demand for A$');

    await dragSideways(page, 'down', 50);
    await question.getByRole('button', { name: 'Check' }).click();

    await expect(question.getByRole('status')).toContainText('Right direction — you moved it right.');
});

test('no text on the stage lands on other text', async ({ page }) => {
    await toTheEnd(page);
    await page.getByRole('tab', { name: 'Scenarios' }).click();

    for (const arrangement of ['Focus', 'Grid']) {
        await page.getByText(arrangement, { exact: true }).click();
        for (const scenario of ['Back to A$1 = US$0.65', 'Iron ore prices soar', 'Australians holiday abroad']) {
            // Exact: a track marker is named by its step's sentence, and one of
            // those ends with the same words as the baseline scenario.
            await page.getByRole('button', { name: scenario, exact: true }).click();
            await expect.poll(() => textCollisions(page), { message: `${arrangement}, ${scenario}` }).toEqual([]);
        }
    }
});

test('the navbar moves between lessons, and the back button returns', async ({ page }) => {
    await page.getByRole('link', { name: 'Supply and demand' }).click();
    await expect(page.getByRole('heading', { name: 'A market, and what it does to everything else' }))
        .toBeVisible();
    expect(new URL(page.url()).searchParams.get('lesson')).toBe('market');

    await page.goBack();
    await expect(page.getByRole('heading', { name: 'The Australian dollar, and what moves it' })).toBeVisible();
});

import { expect } from '@playwright/test';
import { RENDERED, dataCoordinates, test } from './helpers';

// The market in src/App.tsx: demand P = a - Q and supply P = c + Q, with
// a = 20 and c = 2, so the market clears at Q* = 9, P* = 11. Change the params
// there and these numbers move with them.
const EQUILIBRIUM = { Q: 9, P: 11 };

// Reading a point back through the axes costs a little precision — the tick
// line has width and the point has a radius. A tenth of a unit is far tighter
// than any wrong-answer defect this is here to catch.
const TOLERANCE = 0.1;

test.beforeEach(async ({ page }) => {
    await page.goto('/');
});

test('renders the page and the card around the diagram', async ({ page }) => {
    await expect(page).toHaveTitle('Equilibria');
    await expect(page.getByRole('heading', { name: 'Equilibria', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Market equilibrium' })).toBeVisible();
});

test('mounts the engine and draws the market', async ({ page, pageErrors }) => {
    // The card renders its container before the engine mounts into it, so wait
    // for the drawing itself rather than for the element that will hold it.
    await expect(page.locator('.kg-container svg')).toBeVisible();

    // Demand and supply, each drawn once.
    await expect(page.locator(RENDERED.curve)).toHaveCount(2);
    await expect(page.locator(RENDERED.point)).toHaveCount(1);

    // An unresolved param or calc reaches the DOM as a NaN in a coordinate
    // attribute, which draws as nothing at all rather than as an error.
    expect(await page.locator('.kg-container').innerHTML()).not.toContain('NaN');

    expect(pageErrors).toEqual([]);
});

test('solves the equilibrium its config describes', async ({ page }) => {
    const point = page.locator(RENDERED.point);
    await expect(point).toBeVisible();

    // Not just "a point was drawn": the point is where the supply and demand
    // params say the market clears.
    const { x, y } = await dataCoordinates(point);
    expect(Math.abs(x - EQUILIBRIUM.Q), `Q* rendered at ${x}`).toBeLessThan(TOLERANCE);
    expect(Math.abs(y - EQUILIBRIUM.P), `P* rendered at ${y}`).toBeLessThan(TOLERANCE);
});

test('labels the axes and the equilibrium', async ({ page }) => {
    // Labels are TeX rendered by KaTeX, which splits the visible text across
    // spans but keeps the source the config asked for in an annotation element.
    // That is both steadier to match on and closer to what the config says.
    await expect(page.locator('.kg-container .katex annotation')).toHaveCount(4);

    const labels = await page.locator('.kg-container .katex annotation').allTextContents();
    expect(labels).toEqual(
        expect.arrayContaining(['\\text{Q}', '\\text{P}', 'Q^*', 'P^*'])
    );
});

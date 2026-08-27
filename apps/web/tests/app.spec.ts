import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { RENDERED, focalDragPathIndex, focalPointCoordinates, test } from './helpers';

/**
 * The study screen, in a real browser.
 *
 * What jsdom cannot check and this can: that three panels really are regions of
 * *one* SVG, that promoting one keeps that SVG alive rather than rebuilding the
 * page's diagram, and that the diagram is still draggable afterwards. Those are
 * the claims P7 is built on, and every one of them is invisible to a unit test
 * that mounts a mock.
 */

// The market in src/studyDiagram.ts: demand P = a - Q and supply P = c + Q,
// with a = 20 and c = 2, so it clears at Q* = 9, P* = 11 and consumer surplus
// is 0.5 x 9 x 9 = 40.5. Change the params there and these move with them.
const EQUILIBRIUM = { Q: 9, P: 11 };

// Reading a point back through the axes costs a little precision — the tick
// line has width and the point has a radius. A tenth of a unit is far tighter
// than any wrong-answer defect this is here to catch.
const TOLERANCE = 0.1;

const panel = (name: string) => `[aria-label="Show ${name}"]`;

/** A label is a positioned div, not an SVG node — KaTeX needs HTML to lay out. */
const LABEL = '.kg-container div[class^="rootElement-"]';

/** Two axis titles, the two curve names, and the equilibrium's two droplines. */
const LABELS_PER_PANEL = 6;

/**
 * Pull the focal panel's demand curve down by its transparent hit area.
 *
 * The focal panel's overlay is pointer-transparent, so the drag has to reach the
 * SVG underneath it — which is the thing most easily broken by getting
 * `pointer-events` wrong, and the reason this is a browser test.
 */
async function dragDemandDown(page: Page) {
    const dragPath = page.locator('.kg-container path[class^="dragPath"]')
        .nth(await focalDragPathIndex(page));
    const box = (await dragPath.boundingBox())!;
    const startX = box.x + box.width * 0.45, startY = box.y + box.height * 0.45;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 60, { steps: 12 });
    await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.kg-container svg').waitFor();
});

test('renders the study screen', async ({ page }) => {
    await expect(page).toHaveTitle('Equilibria');
    await expect(
        page.getByRole('heading', { name: 'A market, and what it does to everything else' })
    ).toBeVisible();
    await expect(page.getByRole('radiogroup', { name: 'Panel arrangement' })).toBeVisible();
});

test('draws every panel in one engine', async ({ page, pageErrors }) => {
    // One container and one SVG for the whole stage. Three containers would
    // mean three engines, which is the design this replaced — and with it any
    // hope of the panels sharing state without the app synchronising them.
    await expect(page.locator('.kg-container')).toHaveCount(1);
    await expect(page.locator('.kg-container svg')).toHaveCount(1);

    // Three panels, two axes each.
    await expect(page.locator('.kg-container g.axis')).toHaveCount(6);

    // An unresolved param or calc reaches the DOM as a NaN in a coordinate
    // attribute, which draws as nothing at all rather than as an error.
    expect(await page.locator('.kg-container').innerHTML()).not.toContain('NaN');

    expect(pageErrors).toEqual([]);
});

test('draws the focal panel in full and the rail panels as indicators', async ({ page }) => {
    // Density, seen from outside. Every panel's labels are in the DOM — hidden
    // rather than absent, which is what lets a promotion reveal them without a
    // rebuild — so the count that says anything is the *visible* one.
    const labels = page.locator(`${LABEL}:visible`);
    await expect(labels).toHaveCount(LABELS_PER_PANEL);
    await expect(page.locator(LABEL)).toHaveCount(LABELS_PER_PANEL * 3);

    // Ticks tell the same story from the other side: only the focal panel has
    // any, while the curves — two per panel — are all still drawn.
    expect(await page.locator('.kg-container g.axis g.tick').count()).toBeGreaterThan(6);
    await expect(page.locator(RENDERED.visibleCurve)).toHaveCount(6);
});

test('solves the equilibrium its config describes', async ({ page }) => {
    // `dataCoordinates` reads the scale back off the tick labels, and only the
    // focal panel has any — so this is the focal panel's equilibrium, read in
    // the units the config was written in.
    await expect(page.locator(RENDERED.visiblePoint).first()).toBeVisible();

    const { x, y } = await focalPointCoordinates(page);
    expect(Math.abs(x - EQUILIBRIUM.Q), `Q* rendered at ${x}`).toBeLessThan(TOLERANCE);
    expect(Math.abs(y - EQUILIBRIUM.P), `P* rendered at ${y}`).toBeLessThan(TOLERANCE);
});

test('puts each panel\'s headline number beside it, from the diagram\'s own calcs', async ({ page }) => {
    await expect(page.getByText('Market', { exact: true })).toBeVisible();
    await expect(page.getByText('$11.0')).toBeVisible();
    // Consumer surplus is 0.5 * Q* * (a - P*). It read $0.5 until Model.evaluate
    // stopped truncating an expression to the number it happens to start with.
    await expect(page.getByText('$40.5')).toBeVisible();
    await expect(page.getByText('$99.0')).toBeVisible();
});

test('promotes a rail panel without rebuilding the diagram', async ({ page }) => {
    // Mark the live SVG. A rebuild empties the container, so the mark is the
    // simplest possible witness that the same engine is still running.
    await page.locator('.kg-container svg').evaluate(el => el.setAttribute('data-witness', '1'));

    await expect(page.locator(panel('Consumer surplus'))).toBeVisible();
    await page.locator(panel('Consumer surplus')).click();

    // The promoted panel is no longer a button, and the demoted one now is.
    await expect(page.locator(panel('Consumer surplus'))).toHaveCount(0);
    await expect(page.locator(panel('Market'))).toBeVisible();

    // Same SVG, still there.
    await expect(page.locator('.kg-container svg[data-witness="1"]')).toHaveCount(1);
});

test('the promoted panel gains the detail the demoted one loses', async ({ page }) => {
    await page.locator(panel('Consumer surplus')).click();

    // The detail moved with the focus rather than accumulating: still one
    // panel's worth of labels on the stage, and they are the new panel's.
    await expect(page.locator(`${LABEL}:visible`)).toHaveCount(LABELS_PER_PANEL);

    // And the equilibrium the focal panel now draws is still the right one.
    const { x, y } = await focalPointCoordinates(page);
    expect(Math.abs(x - EQUILIBRIUM.Q), `Q* rendered at ${x}`).toBeLessThan(TOLERANCE);
    expect(Math.abs(y - EQUILIBRIUM.P), `P* rendered at ${y}`).toBeLessThan(TOLERANCE);
});

test('stays interactive after a promotion', async ({ page, pageErrors }) => {
    await page.locator(panel('Consumer surplus')).click();

    const before = await focalPointCoordinates(page);

    await dragDemandDown(page);

    const after = await focalPointCoordinates(page);
    expect(after.y, 'the equilibrium price should have fallen').toBeLessThan(before.y);

    expect(pageErrors).toEqual([]);
});

test('shows a delta once something has moved, and not before', async ({ page }) => {
    // Nothing has moved yet, so nothing claims anything has.
    await expect(page.getByText(/^[+−]\d/)).toHaveCount(0);

    await dragDemandDown(page);

    // A delta on every panel: they are one market, so all three moved.
    await expect(page.getByText(/^[+−]\d/)).toHaveCount(3);
});

test('the grid toggle rearranges the same panels, and is not the landing state', async ({ page }) => {
    // Focus is what the screen opens on: one panel large, the others small.
    const focal = (await page.locator('.kg-container g.axis').first().boundingBox())!;

    // The radio itself is visually hidden, as a segmented control's always is;
    // the label is the thing a student clicks.
    await page.getByText('Grid', { exact: true }).click();

    // In the grid nothing is a rail panel any more, so every panel carries the
    // promote affordance and none is the focal one.
    await expect(page.locator('[aria-label^="Show "]')).toHaveCount(3);

    // Every panel is now drawn at `compact` — ticks everywhere, axis titles
    // nowhere — which is the level the arrangement's cell size asks for.
    expect(await page.locator('.kg-container g.axis g.tick').count()).toBeGreaterThan(12);

    // And the cells are all the same size, which the focus arrangement never is.
    const widths = await page.locator('.kg-container g.axis').evaluateAll(nodes =>
        nodes.map(n => Math.round((n as SVGGraphicsElement).getBBox().width)));
    const distinct = new Set(widths.filter(w => w > 40));
    expect(distinct.size, `axis widths: ${widths}`).toBe(1);
    expect(focal.width).toBeGreaterThan(0);
});

test('promotes from the keyboard', async ({ page }) => {
    const target = page.locator(panel('Revenue'));
    await target.focus();
    await page.keyboard.press('Enter');

    await expect(page.locator(panel('Revenue'))).toHaveCount(0);
    await expect(page.locator(panel('Market'))).toBeVisible();
});

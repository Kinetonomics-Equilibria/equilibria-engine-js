import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { RENDERED, focalDragPathIndex, focalPointCoordinates, test, textCollisions } from './helpers';

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

/**
 * A panel's change chip: a direction and an amount in the panel's unit.
 *
 * Matched on the arrow rather than on a sign, and on the unit after it. The
 * chips used to read "+2.0" in teal and "−2.0" in red, which put a verdict on a
 * price falling and left the reader to guess what the number was in.
 */
const CHIP = /^[▲▼] \$\d/;

/** A label is a positioned div, not an SVG node — KaTeX needs HTML to lay out. */
const LABEL = '.kg-container div[class^="rootElement-"]';

/** Two axis titles, the two curve names, and the equilibrium's two droplines. */
const LABELS_PER_PANEL = 6;

/**
 * The one label that belongs to no panel's own furniture: the reveal curve's.
 *
 * P11's question apparatus draws the correct position in the market panel, and
 * it is in the DOM from the first frame like every other hidden thing — which
 * is the point, since showing it must not cost a rebuild.
 */
const QUESTION_LABELS = 1;

/**
 * The ghost of the market panel's demand curve carries a label of its own.
 *
 * `ghost` copies the label along with everything else, and the study diagram
 * gives the ghost a qualifier, so the dashed twin reads `D₀` and the live curve
 * stays `D` in every panel. The hand-written ghost this replaced had no label
 * at all, which is why the count moved.
 */
const GHOST_LABELS = 1;

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

/**
 * Pull demand up until it stops, and then keep pulling.
 *
 * `a` is declared `min: 12, max: 28` against a panel drawn 0..20, so the top of
 * the range is above the top of the panel and the curve visibly refuses to
 * follow the pointer. This is the only route to a refusal in the whole app: the
 * dock's sliders take their own ends from the param, so a control can never
 * *ask* for a value out of range — only a drag can.
 */
async function dragDemandOffTheTop(page: Page) {
    const dragPath = page.locator('.kg-container path[class^="dragPath"]')
        .nth(await focalDragPathIndex(page));
    const box = (await dragPath.boundingBox())!;
    const startX = box.x + box.width * 0.45, startY = box.y + box.height * 0.45;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // 0..20 over the panel's height, so 45% of it is nine units — past 28 and
    // then some, which is what makes this a refusal rather than a long drag.
    await page.mouse.move(startX, startY - box.height * 0.75, { steps: 15 });
    await page.mouse.up();
}

/**
 * Run the lesson out to its end, which is where free exploration lives.
 *
 * P10 claims free exploration is not a mode beside the lesson but the track at
 * its last position — everything revealed, every control still there. This file
 * is the test of that claim, and it makes it in the strongest available way: it
 * is the suite that was written before the track existed, describing a screen
 * with three panels and no lesson, and it passes unchanged from here on. If the
 * end of the track were a different place from "no lesson at all", these would
 * start failing and say so.
 */
async function toTheEnd(page: Page) {
    const markers = page.locator('button[data-kinds]');
    const last = (await markers.count()) - 1;
    if (last < 1) return;
    await markers.nth(last).click();

    // The lesson now ends with a question (P11), and the track deliberately
    // stops one past an unanswered one — so getting to the end means getting
    // past it. Committed without moving and then shown, which is the shortest
    // deterministic way through and needs no drag: what these tests are about
    // is the far side of it.
    //
    // The assertions below this helper are unchanged, which is the claim P10
    // made and this keeps making: the end of the track is the same place as
    // "no lesson at all".
    const question = page.getByRole('group', { name: 'Question' });
    if (await question.isVisible()) {
        await question.getByRole('button', { name: 'Check' }).click();
        await question.getByRole('button', { name: 'Show me' }).click();
        await markers.nth(last).click();
    }

    await expect(markers.nth(last)).toHaveAttribute('aria-current', 'step');
}

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.kg-container svg').waitFor();
    await toTheEnd(page);
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
    await expect(page.locator(LABEL)).toHaveCount(LABELS_PER_PANEL * 3 + QUESTION_LABELS + GHOST_LABELS);

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
    // Each number says what it is, in the strip's own words for it, and money
    // is to the cent. "Market $11.0" left a student to work out that the figure
    // was the clearing price.
    await expect(page.getByText('P* $11.00', { exact: true })).toBeVisible();
    // Consumer surplus is 0.5 * Q* * (a - P*). It read $0.5 until Model.evaluate
    // stopped truncating an expression to the number it happens to start with.
    await expect(page.getByText('CS $40.50', { exact: true })).toBeVisible();
    await expect(page.getByText('TR $99.00', { exact: true })).toBeVisible();
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
    await expect(page.getByText(CHIP)).toHaveCount(0);

    await dragDemandDown(page);

    // A delta on every panel: they are one market, so all three moved — and
    // all three fell, so all three say so the same way, in the same grey.
    await expect(page.getByText(CHIP)).toHaveCount(3);
    await expect(page.getByText(/^▼ \$\d/)).toHaveCount(3);
});

/**
 * The `ghost` shorthand (P13), from outside.
 *
 * There is no unit-level version of this: a drag cannot be synthesised in
 * jsdom — `d3.pointer` falls back to `getBoundingClientRect`, which returns
 * zeros there, so the param is asked for the value it already has — and a
 * shorthand that only ever moves a param through `update()` is not being asked
 * the question a student asks.
 */

test('a drag leaves a ghost of where the curve was', async ({ page }) => {
    // Six curves — demand and supply in each of the three panels — and the
    // focal panel's own six labels. The ghost and its label are in the DOM
    // already, hidden, because `prev.changed` is 0.
    await expect(page.locator(RENDERED.visibleCurve)).toHaveCount(6);
    await expect(page.locator(`${LABEL}:visible`)).toHaveCount(LABELS_PER_PANEL);

    await dragDemandDown(page);

    // One more of each: the dashed twin, and the `D₀` it carries — the live
    // curve stays `D`. The labelling itself is pinned in the engine's
    // ghosts.test.ts; what only a browser can say is that a real drag is what
    // brings them out.
    await expect(page.locator(RENDERED.visibleCurve)).toHaveCount(7);
    await expect(page.locator(`${LABEL}:visible`)).toHaveCount(LABELS_PER_PANEL + GHOST_LABELS);
});

/**
 * NOTES issue D, closed by looking at a screenshot of P13's work.
 *
 * A dragged curve takes focus, and the browser's default ring outlines the
 * element's *unclipped* bounding box — the curve's `d` spans the whole domain
 * and is cropped by a clip path, not by geometry — so the ring is a rectangle
 * the size of the panel and whichever edge falls inside is drawn as a flat line
 * right across the diagram. It was recorded at two unrelated heights and never
 * matched to any element, because it is an outline rather than a shape.
 */
test('a dragged curve does not draw a line across the panel', async ({ page }) => {
    await dragDemandDown(page);

    const ring = await page.evaluate(() => {
        const focused = document.activeElement;
        if (!focused || !focused.closest('.kg-container')) return 'nothing in the diagram has focus';
        return getComputedStyle(focused).outlineStyle;
    });

    expect(ring).toBe('none');
});

test('the grid toggle rearranges the same panels, and is not the landing state', async ({ page }) => {
    // Focus is what the screen opens on: one panel large, the others small.
    const focal = (await page.locator('.kg-container g.axis').first().boundingBox())!;

    // The radio itself is visually hidden, as a segmented control's always is;
    // the label is the thing a student clicks.
    await page.getByText('Grid', { exact: true }).click();

    // In the grid nothing is a rail panel any more, so every panel can be
    // promoted and none is the focal one — from its caption, since nothing is
    // laid across the panel itself.
    await expect(page.locator('[aria-label^="Show "]')).toHaveCount(3);

    // Every panel is read in the grid, so none is drawn as a glyph: ticks
    // everywhere, and at this size no axis titles, which is `compact`.
    expect(await page.locator('.kg-container g.axis g.tick').count()).toBeGreaterThan(12);

    // And the cells are all the same size, which the focus arrangement never is.
    const widths = await page.locator('.kg-container g.axis').evaluateAll(nodes =>
        nodes.map(n => Math.round((n as SVGGraphicsElement).getBBox().width)));
    const distinct = new Set(widths.filter(w => w > 40));
    expect(distinct.size, `axis widths: ${widths}`).toBe(1);
    expect(focal.width).toBeGreaterThan(0);
});

/**
 * No text on the stage lands on other text, in any arrangement.
 *
 * In the grid every caption used to be printed in the band where its panel's
 * tick labels go — "Market" across the `0`, the price across `Q*`, the delta
 * chip across `10` — and the rows sat so close that the next row's top tick
 * shared the line. And inside every panel the equilibrium's `Q*` could sit on
 * the tick label at the same value. Checked in all four arrangements, since each
 * puts the captions somewhere different and draws the axes at a different size,
 * and at three markets: the one the config declares, one where supply has
 * shifted (and its label has had to slide back onto the plot), and one where
 * the market clears at exactly Q* = 10, on top of a tick.
 */
const MARKETS = ['Back to baseline', 'Input costs rise', 'Boom and cost squeeze'];

async function noTextCollides(page: Page, arrangement: string) {
    for (const market of MARKETS) {
        await page.getByRole('button', { name: market }).click();
        await expect.poll(() => textCollisions(page), { message: `${arrangement}, ${market}` }).toEqual([]);
    }
}

test('no text on the stage lands on other text, in any arrangement', async ({ page }) => {
    await page.getByRole('tab', { name: 'Scenarios' }).click();

    // At the suite's own size the stage is under the filmstrip breakpoint.
    await expect(page.locator('[data-role="strip"]')).toHaveCount(2);
    await noTextCollides(page, 'focus, with a strip');

    // The boom leaves the market clearing at Q* = 10, so the check above passed
    // because the 10 gave way rather than because nothing was near it.
    const withheld = await page.locator('.kg-container g.tick text').evaluateAll(texts =>
        texts.filter(t => t.textContent === '10' && getComputedStyle(t).visibility === 'hidden').length);
    expect(withheld, 'the 10 under Q*').toBeGreaterThan(0);

    await page.getByText('Grid', { exact: true }).click();
    await expect(page.locator('[data-role="grid"]')).toHaveCount(3);
    await noTextCollides(page, 'grid');

    // Wide enough for the rail to stand beside the focal panel.
    await page.getByText('Focus', { exact: true }).click();
    await page.setViewportSize({ width: 1800, height: 950 });
    await expect(page.locator('[data-role="rail"]')).toHaveCount(2);
    await noTextCollides(page, 'focus, with a rail');

    await page.getByText('Grid', { exact: true }).click();
    await expect(page.locator('[data-role="grid"]')).toHaveCount(3);
    await noTextCollides(page, 'grid, wide');
});

/**
 * The ghost's label and the live one, after a move too small to separate them.
 *
 * One arrow-key press on the dock's slider is a gesture of its own, so the ghost
 * is a tenth of a unit from the live curve — and both labels used to be placed
 * at the same x on it, `D₀` printed underneath `D`. The engine now slides the
 * ghost's along its own line until it clears; this asks for the effect.
 */
test("a nudge keeps the ghost's label off the live one", async ({ page }) => {
    await page.getByRole('slider', { name: 'a' }).focus();
    await page.keyboard.press('ArrowRight');

    // The ghost is up, label and all — otherwise there is nothing to collide.
    await expect(page.locator(`${LABEL}:visible`)).toHaveCount(LABELS_PER_PANEL + GHOST_LABELS);
    await expect.poll(() => textCollisions(page)).toEqual([]);
});

test('a curve can be dragged in the grid', async ({ page }) => {
    await page.getByText('Grid', { exact: true }).click();
    await expect(page.locator('[data-role="grid"]')).toHaveCount(3);

    // The market panel's demand curve: the hit-area inside that panel's box
    // that takes a pointer. A promote button laid across the panel used to
    // take it first, so the drag promoted a panel the grid then ignored.
    const market = (await page.locator('[data-panel="market"]').boundingBox())!;
    const index = await page.evaluate(box => {
        const paths = [...document.querySelectorAll('.kg-container path[class^="dragPath"]')];
        return paths.findIndex(p => {
            const b = p.getBoundingClientRect(), cx = b.x + b.width / 2, cy = b.y + b.height / 2;
            return getComputedStyle(p).pointerEvents === 'all' &&
                cx >= box.x && cx <= box.x + box.width && cy >= box.y && cy <= box.y + box.height;
        });
    }, market);
    expect(index).toBeGreaterThan(-1);

    const target = (await page.locator('.kg-container path[class^="dragPath"]').nth(index).boundingBox())!;
    const startX = target.x + target.width * 0.45, startY = target.y + target.height * 0.45;
    const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)!.tagName, [startX, startY]);
    expect(hit, 'what is under the pointer').not.toBe('BUTTON');

    const before = await page.locator('[data-panel="market"]').textContent();
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 40, { steps: 10 });
    await page.mouse.up();

    await expect(page.locator('[data-panel="market"]')).not.toHaveText(before!);
    // Still the grid: a drag is not a promotion.
    await expect(page.locator('[data-role="grid"]')).toHaveCount(3);
});

// The grid ignores which panel is focal, so a promotion that stayed in the
// grid changed nothing a student could see.
test('a grid caption brings its panel to the front, and leaves the grid', async ({ page }) => {
    await page.getByText('Grid', { exact: true }).click();
    await page.locator(panel('Revenue')).click();

    await expect(page.locator('[data-panel="revenue"]')).toHaveAttribute('data-role', 'focal');
    await expect(page.locator('[data-role="grid"]')).toHaveCount(0);
});

/**
 * A grid panel too narrow for a name and a number says the number.
 *
 * A grid caption is one line and its number never gives way, so at a small
 * window the name was squeezed to an ellipsis — "C… · CS $40.50" — which names
 * nothing. Below a width the caption leaves the name out instead; the button
 * still carries it as its accessible name, which is how this finds the panels.
 */
test('a narrow grid drops its names before its numbers', async ({ page }) => {
    await page.getByText('Grid', { exact: true }).click();

    // At the suite's size every grid caption has room for both.
    await expect(page.locator(panel('Consumer surplus'))).toContainText('Consumer surplus');

    await page.setViewportSize({ width: 1101, height: 800 });
    await expect(page.locator('[data-role="grid"]')).toHaveCount(3);

    await expect(page.locator(panel('Market'))).toHaveText('P* $11.00');
    await expect(page.locator(panel('Consumer surplus'))).toHaveText('CS $40.50');
    await expect(page.locator(panel('Revenue'))).toHaveText('TR $99.00');
    await expect.poll(() => textCollisions(page)).toEqual([]);
});

// Early in the lesson, with the grid on: one panel is the whole stage, and it
// is where the student works.
test('a lone panel stays workable in the grid', async ({ page }) => {
    await page.getByText('Grid', { exact: true }).click();
    await page.locator('button[data-kinds]').nth(2).click();

    await expect(page.locator('[data-panel="market"]')).toHaveAttribute('data-role', 'focal');
    await expect(page.locator('[data-testid="stage-chrome"] button')).toHaveCount(0);
});

test('a panel arrives without rebuilding the diagram', async ({ page }) => {
    // Back to the step before the surplus panel exists, then forward again.
    // A reveal changes what the stage arranges, which is the one thing that
    // used to mean a new engine and a flash.
    const markers = page.locator('button[data-kinds]');
    await markers.nth(3).click();
    await expect(page.locator(panel('Consumer surplus'))).toHaveCount(0);

    await page.locator('.kg-container svg').evaluate(el => el.setAttribute('data-witness', '1'));

    await markers.nth(4).click();
    await expect(page.locator(panel('Consumer surplus'))).toBeVisible();
    await expect(page.locator('.kg-container svg[data-witness="1"]')).toHaveCount(1);
});

test('a panel that has not arrived is neither drawn nor reachable', async ({ page }) => {
    const markers = page.locator('button[data-kinds]');
    await markers.nth(0).click();

    // Nothing to promote, because nothing else is on the stage; and the market
    // panel is drawn as a frame with nothing in it yet.
    await expect(page.locator('[aria-label^="Show "]')).toHaveCount(0);
    await expect(page.locator(RENDERED.visibleCurve)).toHaveCount(0);

    // The whole stage is the one panel that has arrived, rather than a focal
    // square with two empty slots beside it.
    const wide = (await page.locator('[data-panel="market"]').boundingBox())!;
    await markers.nth(4).click();
    const narrower = (await page.locator('[data-panel="market"]').boundingBox())!;
    expect(wide.width).toBeGreaterThan(narrower.width);
});

test('promotes from the keyboard', async ({ page }) => {
    const target = page.locator(panel('Revenue'));
    await target.focus();
    await page.keyboard.press('Enter');

    await expect(page.locator(panel('Revenue'))).toHaveCount(0);
    await expect(page.locator(panel('Market'))).toBeVisible();
});

/**
 * The narration strip (P8).
 *
 * Two of its claims only exist in a browser. The first is that it narrates on
 * *commit*: a drag fires ~60 param changes a second, and the difference between
 * a line that rewrites per frame and one that rewrites per interaction cannot be
 * seen by a test that calls the reducer twice. The second is that the strip and
 * the diagram's own ghosts agree about what "before" means — two components with
 * two ideas of it is a bug the student experiences as incoherence.
 */
const STRIP = '[data-kind]';

/** The strip's chain, with the whitespace the flex gaps supply rather than the markup. */
const chainText = (page: Page) =>
    page.locator(`${STRIP} > div[aria-hidden="true"]`).textContent();

test('the strip is at rest until something moves', async ({ page }) => {
    // At rest, and — since the lesson has just finished — carrying its closing
    // line rather than the generated chain. Nothing has moved, so there is
    // nothing to undo and no chain to read.
    await expect(page.locator(STRIP)).toHaveAttribute('data-kind', 'rest');
    await expect(page.locator(STRIP)).toHaveAttribute('data-authored', 'true');
    // Twice over, and on purpose: once in the chain area for the eye, and once
    // in the live region for a screen reader.
    await expect(page.getByText('The market is yours now.', { exact: false })).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'undo' })).toHaveCount(0);
});

test('before the lesson begins, the strip offers the lesson rather than a curve', async ({ page }) => {
    // The default hint says to drag a curve; at the start of a build-up there
    // is no curve to drag. A fresh load, because `beforeEach` runs the lesson
    // out to its end.
    await page.goto('/');
    await page.locator('.kg-container svg').waitFor();

    await expect(page.locator(STRIP)).toHaveAttribute('data-kind', 'rest');
    await expect(page.getByText('Step forward to begin the lesson.')).toBeVisible();

    await expect(page.getByRole('button', { name: 'undo' })).toHaveCount(0);
    expect(await page.locator(`${STRIP} [role="status"]`).textContent()).toBe('');
});

test('the strip narrates once per interaction, not once per frame', async ({ page }) => {
    const dragPath = page.locator('.kg-container path[class^="dragPath"]')
        .nth(await focalDragPathIndex(page));
    const box = (await dragPath.boundingBox())!;
    const startX = box.x + box.width * 0.45, startY = box.y + box.height * 0.45;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY - 40, { steps: 10 });

    // Mid-drag: live values and no arrows. "20.0 → 20.1" is a frame, not a
    // mechanism, and a line rewritten at 60Hz is unreadable either way.
    await expect(page.locator(STRIP)).toHaveAttribute('data-kind', 'live');
    expect(await chainText(page)).not.toContain('→');
    expect(await page.locator(`${STRIP} [role="status"]`).textContent()).toBe('');

    await page.mouse.up();

    // Let go, and the whole interaction is one chain.
    await expect(page.locator(STRIP)).toHaveAttribute('data-kind', 'settled');
    const chain = (await chainText(page))!;
    expect(chain).toContain('a20.0→');
    expect(chain, 'the middle clause names what the engine said moved').toContain('demand shifts up');
    expect(chain).toMatch(/P\*\$11\.00→\$\d/);

    // And one utterance, once.
    expect(await page.locator(`${STRIP} [role="status"]`).textContent())
        .toMatch(/^You changed a from 20\.0 to .*; demand shifts up; P\* from \$11\.00 to /);
});

test('the strip and the panel chips agree about "before"', async ({ page }) => {
    await dragDemandDown(page);

    // The chip's delta is `calcs.Pe - prev.calcs.Pe`, computed by the engine
    // from the snapshot the ghosts are drawn from. The strip's arrow is
    // computed by the app from `getSnapshot()`. If those were two different
    // "before"s — the failure the plan warns about — these two numbers would
    // disagree.
    const chain = (await chainText(page))!;
    const prices = chain.match(/P\*\$(\d+\.\d\d)→\$(\d+\.\d\d)/)!;
    const narrated = Number(prices[2]) - Number(prices[1]);

    // The market's chip is the first: "▼ $1.50" is a fall of a dollar fifty.
    const chip = (await page.getByText(CHIP).first().textContent())!;
    const charted = (chip.startsWith('▼') ? -1 : 1) * Number(chip.replace(/^[▲▼] \$/, ''));

    // A cent, because both sides print to two decimals and they round at
    // different points: the strip rounds each end of the move and this test
    // subtracts them, while the chip rounds a delta the diagram computed. A
    // true delta of -1.255 is "-1.25" one way and "-1.26" the other, and that is
    // the whole of the disagreement this tolerance admits. Reading a *different*
    // snapshot — the failure the test exists for — is not a cent out.
    expect(Math.abs(narrated - charted), `strip said ${narrated}, chip said ${chip}`).toBeLessThan(0.011);
});

test('undo puts the market back, and the diagram stands down with it', async ({ page }) => {
    const before = await focalPointCoordinates(page);

    await dragDemandDown(page);
    // The ghosts are the diagram's own account of the same interaction.
    await expect(page.locator(RENDERED.visibleCurve)).toHaveCount(7);

    await page.getByRole('button', { name: 'undo' }).click();

    const after = await focalPointCoordinates(page);
    expect(Math.abs(after.x - before.x), 'Q* should be back where it started').toBeLessThan(TOLERANCE);
    expect(Math.abs(after.y - before.y), 'P* should be back where it started').toBeLessThan(TOLERANCE);

    // Nothing told the ghost to hide: the params equal the snapshot again, so
    // `prev.changed` is false and the strip reads rest for the same reason.
    await expect(page.locator(RENDERED.visibleCurve)).toHaveCount(6);
    await expect(page.locator(STRIP)).toHaveAttribute('data-kind', 'rest');
    await expect(page.getByText(CHIP)).toHaveCount(0);
});

/**
 * A move the diagram would not make, said out loud (P12).
 *
 * Before this, dragging a curve past the end of its range stopped it dead and
 * the app was told nothing at all: the first tick past the end reported that the
 * curve had *moved* (as far as it could), and every tick after it reported
 * nothing. A student pushing against an invisible ceiling could not tell a limit
 * from a broken diagram.
 *
 * In a browser rather than in jsdom because a drag is the only way to reach it —
 * jsdom performs no layout, so a synthesised drag moves the pointer nowhere and
 * asks for nothing out of range.
 */
test('says why the curve stopped, when it stops', async ({ page }) => {
    await dragDemandOffTheTop(page);

    await expect(page.locator(STRIP)).toHaveAttribute('data-refusal', 'true');
    await expect(page.getByText('a will not go above 28.0.')).toHaveCount(2);

    // The chain is displaced on screen and kept in the announcement: the eye
    // watched the curve stop, and a screen reader did not.
    expect(await chainText(page)).toBe('a will not go above 28.0.');
    expect(await page.locator(`${STRIP} [role="status"]`).textContent())
        .toMatch(/^a will not go above 28\.0\..*P\*/);
});

test('says it once, however long the drag pushes against the end', async ({ page }) => {
    await dragDemandOffTheTop(page);

    // Twice is the eye and the live region; a third would be the strip having
    // grown a second line, and a hundred would be a refusal per pointer move.
    await expect(page.getByText('a will not go above 28.0.')).toHaveCount(2);
});

test('gives the strip back the moment something moves again', async ({ page }) => {
    await dragDemandOffTheTop(page);
    await expect(page.locator(STRIP)).toHaveAttribute('data-refusal', 'true');

    await dragDemandDown(page);

    await expect(page.locator(STRIP)).not.toHaveAttribute('data-refusal', 'true');
    await expect(page.locator(STRIP)).toHaveAttribute('data-kind', 'settled');
    expect(await chainText(page)).toContain('demand shifts down');
});

test('promoting a panel does not rewrite what the student was told', async ({ page }) => {
    await dragDemandDown(page);
    const chain = await chainText(page);

    // A promotion is a param change like any other, and it carries no `affected`
    // — so a strip that narrated it would drop the middle clause from a sentence
    // that was already correct, and claim the student had moved something.
    await page.locator(panel('Consumer surplus')).click();
    await expect(page.locator(panel('Market'))).toBeVisible();

    expect(await chainText(page)).toBe(chain);
});

/**
 * The dock (P9), and the one claim about it that a unit test cannot make.
 *
 * A slider raises no `kg:curve_dragged` — that event comes only from dragging
 * inside the diagram — so the narration strip cannot tell a scrub from sixty
 * separate interactions on its own. The wire that tells it runs from the
 * instrument, through `StudyScreen`, to both the strip and the engine, and a
 * component test of either end is exactly what misses a wire.
 */

test('the dock switches instruments without moving the stage', async ({ page }) => {
    const stage = page.locator('.kg-container').first();
    const before = (await stage.boundingBox())!;

    await page.getByRole('tab', { name: 'Maths' }).click();
    await expect(page.getByRole('tab', { name: 'Maths' })).toHaveAttribute('aria-selected', 'true');

    const after = (await stage.boundingBox())!;
    // The dock's width does not depend on what is open, so the stage — which
    // measures its own box — has nothing to react to.
    expect(Math.abs(after.width - before.width)).toBeLessThan(1);
    expect(Math.abs(after.height - before.height)).toBeLessThan(1);
});

test('a slider scrub is one interaction, not one per frame', async ({ page }) => {
    const slider = page.getByRole('slider', { name: 'a' });
    const box = (await slider.boundingBox())!;

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 10 });

    // Mid-scrub the strip is live: values without arrows, and nothing announced.
    // Without `beginGesture` every one of those ten moves would have been a
    // settled chain, and the live region would have read all ten.
    await expect(page.locator(STRIP)).toHaveAttribute('data-kind', 'live');
    expect(await chainText(page)).not.toContain('→');
    expect(await page.locator(`${STRIP} [role="status"]`).textContent()).toBe('');

    await page.mouse.up();

    // And the whole scrub is one chain, measured from where it began — not from
    // the frame before last, which is what a per-change snapshot would give.
    await expect(page.locator(STRIP)).toHaveAttribute('data-kind', 'settled');
    expect(await chainText(page)).toContain('a20.0→');
});

test('the maths instrument shows the calc the strip named', async ({ page }) => {
    await dragDemandDown(page);
    await page.getByRole('button', { name: 'why?' }).click();

    // "Why?" is answered by the instrument the strip pointed at, opened on the
    // calc it named — not by a list the student has to search.
    await expect(page.getByRole('tab', { name: 'Maths' })).toHaveAttribute('aria-selected', 'true');

    const rows = page.getByRole('tabpanel').locator('[data-calc]');
    await expect(rows.first()).toHaveAttribute('data-calc', 'Pe');
    await expect(page.locator('[class*="rowFocused"]')).toHaveAttribute('data-calc', 'Pe');
});

/** A row of the Maths instrument as it reads: KaTeX's text, without its spacing. */
async function workingOf(page: Page, calc: string) {
    const seen = await page.getByRole('tabpanel').locator(`[data-calc="${calc}"] .katex-html`).innerText();
    return seen.replace(/[\s\u200b]/g, '');
}

test('the maths instrument prints the same numbers as the diagram', async ({ page }) => {
    await page.getByRole('tab', { name: 'Maths' }).click();

    // The whole reframe: the explainer is the calc string typeset, so it cannot
    // hold a number the diagram disagrees with. If these two differed, one of
    // them would be doing its own arithmetic. In the same unit, too: the result
    // is typeset now, and carries the caption's dollar sign rather than a bare
    // number in a different typeface.
    expect(await workingOf(page, 'Pe')).toMatch(/^P∗=2a\+c=220\.0\+2\.0=\$11\.00$/);

    const caption = (await page.getByText('P* $11.00').first().textContent())!;
    expect(caption).toContain('$11.00');
});

/**
 * The Maths instrument at the height the audit measured it at.
 *
 * At 1440×833 its four calcs overflowed the dock by fourteen pixels, so a
 * scrollbar stood beside them for good — and that was with every fraction set
 * at the height of the text beside it. Now they are set in display style, which
 * is taller, and the spacing between calcs is what paid for it.
 */
test('the maths instrument fits beside the stage at a laptop\'s height', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 833 });
    await page.getByRole('tab', { name: 'Maths' }).click();

    const open = page.getByRole('tabpanel');
    await expect(open.locator('[data-calc]')).toHaveCount(4);

    const box = await open.locator('.mantine-ScrollArea-viewport')
        .evaluate(el => ({ client: el.clientHeight, scroll: el.scrollHeight }));
    expect(box.scroll, `content ${box.scroll}px in ${box.client}px`).toBeLessThanOrEqual(box.client);

    // And pointing at it raises no scrollbar, because there is nothing to scroll.
    await open.hover();
    await expect(open.locator('.mantine-ScrollArea-scrollbar[data-state="visible"]')).toHaveCount(0);

    // A display fraction is two lines of maths tall. In text style — which is
    // what `displayMode: false` gave — it was squeezed into one and a half.
    const fraction = await open.locator('[data-calc="Pe"] .mfrac').first().evaluate(el => {
        let top = Infinity, bottom = -Infinity;
        el.querySelectorAll('span').forEach(s => {
            if (s.children.length || !(s.textContent || '').trim()) return;
            const r = s.getBoundingClientRect();
            top = Math.min(top, r.top);
            bottom = Math.max(bottom, r.bottom);
        });
        return { height: bottom - top, font: parseFloat(getComputedStyle(el.closest('.katex')!).fontSize) };
    });
    expect(fraction.height).toBeGreaterThan(2 * fraction.font);
});

/** Where the dock is too short for its maths, it scrolls — and says so only when asked. */
test('the maths instrument scrolls when it must, with a bar only on hover', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 700 });
    await page.getByRole('tab', { name: 'Maths' }).click();

    const open = page.getByRole('tabpanel');
    const viewport = open.locator('.mantine-ScrollArea-viewport');
    const box = await viewport.evaluate(el => ({ client: el.clientHeight, scroll: el.scrollHeight }));
    expect(box.scroll).toBeGreaterThan(box.client);

    const bar = open.locator('.mantine-ScrollArea-scrollbar[data-state="visible"]');
    await expect(bar).toHaveCount(0);

    await open.hover();
    await expect(bar).toHaveCount(1);
    await page.mouse.wheel(0, 200);
    await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
});

test('a scenario applies every param it names', async ({ page }) => {
    await page.getByRole('tab', { name: 'Scenarios' }).click();
    await page.getByRole('button', { name: 'Boom and cost squeeze' }).click();

    // Both params move, and the strip reports both as causes.
    const chain = (await chainText(page))!;
    expect(chain).toContain('a20.0→26.0');
    expect(chain).toContain('c2.0→6.0');
});

/**
 * The longest chain keeps the strip to one line, and the diagram with it.
 *
 * A scenario moving both params narrates two causes, two shifting curves and
 * four effects, and with money to the cent that is wider than the strip at the
 * suite's own size. The chain used to wrap, and the second line took its height
 * from the stage: the stage's shape changed, the engine was rebuilt, and the
 * chain and every chip were wiped a tenth of a second after they appeared. The
 * test above caught it as a chain reading "Drag a curve to see what it changes".
 */
test('the longest chain keeps the strip to one line, and the diagram with it', async ({ page }) => {
    const strip = page.locator(STRIP);
    const height = (await strip.boundingBox())!.height;
    await page.locator('.kg-container svg').evaluate(el => el.setAttribute('data-witness', '1'));

    await page.getByRole('tab', { name: 'Scenarios' }).click();
    await page.getByRole('button', { name: 'Boom and cost squeeze' }).click();
    await expect(page.getByText(CHIP)).toHaveCount(3);

    // A rebuild follows a resize within a frame or two, unthrottled; give it ten.
    await page.evaluate(() => new Promise<void>(resolve => {
        let frames = 10;
        const tick = () => (--frames > 0 ? requestAnimationFrame(tick) : resolve());
        requestAnimationFrame(tick);
    }));

    expect((await strip.boundingBox())!.height).toBe(height);
    await expect(page.locator('.kg-container svg[data-witness="1"]')).toHaveCount(1);
    await expect(page.getByText(CHIP)).toHaveCount(3);
    await expect(strip).toHaveAttribute('data-kind', 'settled');
});

/**
 * The quiz loop, answered the way it is meant to be answered (P11).
 *
 * The unit tests answer with the slider, because jsdom performs no layout and a
 * curve cannot be dragged in it. These are the claims that needs a browser: that
 * the answer can be given by moving the curve itself, that committing really
 * does stop the curve moving, and that the reveal draws a line where the answer
 * belongs. None of the three is visible to a test that mounts a mock.
 *
 * These run from a fresh load rather than from `beforeEach`'s end position,
 * since that helper's whole job is to get *past* the question.
 */

/** The question step in `src/studyDiagram.ts`. */
const ASK_MARKER = 8;

async function toTheQuestion(page: Page) {
    await page.goto('/');
    await page.locator('.kg-container svg').waitFor();
    await page.locator('button[data-kinds]').nth(ASK_MARKER).click();
    const question = page.getByRole('group', { name: 'Question' });
    await expect(question).toBeVisible();
    return question;
}

/** Drag the focal panel's demand curve, in graph units (positive is up). */
async function dragDemand(page: Page, units: number) {
    const dragPath = page.locator('.kg-container path[class^="dragPath"]')
        .nth(await focalDragPathIndex(page));
    const box = (await dragPath.boundingBox())!;
    const startX = box.x + box.width * 0.45, startY = box.y + box.height * 0.45;

    // The market's y axis runs 0..20 over the panel's height. Read from the
    // ticks rather than assumed, so this stays true if the panel is resized.
    const perUnit = await page.evaluate(() => {
        const ticks = [...document.querySelectorAll('g.axis')]
            .map(a => [...a.querySelectorAll('g.tick')].map(t => ({
                value: Number(t.textContent),
                y: (t.querySelector('line') ?? t).getBoundingClientRect().y
            })))
            .filter(t => t.length >= 2 && t.every(x => Number.isFinite(x.value)))
            .find(t => Math.abs(t[0].y - t[t.length - 1].y) > 20);
        if (!ticks) throw new Error('No vertical axis to measure against');
        const sorted = [...ticks].sort((a, b) => a.value - b.value);
        return (sorted[0].y - sorted[sorted.length - 1].y) / (sorted[sorted.length - 1].value - sorted[0].value);
    });

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY - units * perUnit, { steps: 12 });
    await page.mouse.up();
}

test('the question is answered by moving the curve, and marked on where it lands', async ({ page }) => {
    const question = await toTheQuestion(page);

    // Nothing on screen to aim at: two curves per panel and the dashed ghost of
    // where demand started, and no third line saying where it should go.
    await expect(page.locator(RENDERED.visibleCurve)).toHaveCount(7);

    await dragDemand(page, 6);
    await question.getByRole('button', { name: 'Check' }).click();

    // Dragging is imprecise, and the tolerance is what makes that fair: the
    // question asks for 26 from 20 and accepts a unit either side.
    await expect(question.getByText(/Right direction/)).toBeVisible();
});

test('committing stops the curve moving, and retrying lets it go again', async ({ page }) => {
    const question = await toTheQuestion(page);

    await dragDemand(page, 2);
    const answered = await focalPointCoordinates(page);
    await question.getByRole('button', { name: 'Check' }).click();

    // The freeze is the engine's `draggable`, and this is the assertion that
    // says it does something: before P11 the property reported false and the
    // curve went on dragging, because nothing read it.
    await dragDemand(page, 4);
    const frozen = await focalPointCoordinates(page);
    expect(frozen.y).toBeCloseTo(answered.y, 1);

    await question.getByRole('button', { name: 'Try again' }).click();
    await dragDemand(page, 4);
    const thawed = await focalPointCoordinates(page);
    expect(thawed.y).toBeGreaterThan(answered.y + 0.5);
});

test('the reveal draws the answer beside the student\'s, and takes it away again', async ({ page }) => {
    const question = await toTheQuestion(page);

    await dragDemand(page, -4);
    await question.getByRole('button', { name: 'Check' }).click();
    await expect(question.getByText(/Wrong direction/)).toBeVisible();

    // Still nothing drawn where the answer is: a wrong answer is not a reason
    // to give it away, only a reason to offer it.
    await expect(page.locator(RENDERED.visibleCurve)).toHaveCount(7);

    await question.getByRole('button', { name: 'Show me' }).click();
    await expect(page.locator(RENDERED.visibleCurve)).toHaveCount(8);

    // And it goes with the question, rather than being left on the diagram for
    // the rest of the lesson.
    await question.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('group', { name: 'Question' })).toHaveCount(0);
    await expect(page.locator(RENDERED.visibleCurve)).toHaveCount(6);
});

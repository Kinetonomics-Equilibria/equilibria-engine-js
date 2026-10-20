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

/** The lesson card's marker for a step, by position (the first step is 1). */
const stepMarker = (page: Page, position: number) =>
    page.getByRole('group', { name: 'Lesson steps' }).getByRole('button').nth(position - 1);

/**
 * Run the lesson out to its end and finish it, which is where free exploration
 * lives.
 *
 * The side column holds the lesson or the instruments, never both — they are
 * tabs on one card — and Finish at the last step opens Explore. What the instruments get is the
 * diagram as the track's end draws it — everything revealed, the market at its
 * baseline — so this suite, which was written before the track existed and
 * describes a screen with three panels and no lesson, still describes it from
 * here on. If the instruments were handed anything other than "no lesson at
 * all", these would start failing and say so.
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
    await page.getByRole('button', { name: 'Finish' }).click();
    await expect(page.getByRole('tab', { name: 'Explore' })).toHaveAttribute('aria-selected', 'true');
}

/** From the instruments back into the finished lesson, at its last step. */
async function backToTheLesson(page: Page) {
    await page.getByRole('tab', { name: 'Lesson' }).click();
    await expect(page.getByRole('group', { name: 'Lesson steps' })).toBeVisible();
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

/**
 * A promotion travels, where the student has not asked for less motion.
 *
 * The rest of this suite asks for less, so every check above and below sees a
 * promotion land in one frame. This one watches it go: the panel passes
 * through the sizes between the rail and the stage, ends exactly where the cut
 * puts it, and leaves nothing faded and the same diagram running.
 */
test.describe('with motion', () => {
    test.use({ contextOptions: { reducedMotion: 'no-preference' } });

    test('a promotion travels from the rail to the stage, and lands', async ({ page, pageErrors }) => {
        await page.locator('.kg-container svg').evaluate(el => el.setAttribute('data-witness', '1'));
        const focal = (await page.locator('[data-panel="market"]').boundingBox())!;
        const rail = (await page.locator('[data-panel="surplus"]').boundingBox())!;

        // Sampled in the page, a frame at a time, from the click on: anything
        // read back through Playwright would arrive a few frames late.
        const widths = await page.evaluate(() => new Promise<number[]>(resolve => {
            const seen: number[] = [];
            const begun = performance.now();
            (document.querySelector('button[data-panel="surplus"]') as HTMLElement).click();
            requestAnimationFrame(function sample(now) {
                const el = document.querySelector('[data-panel="surplus"]') as HTMLElement;
                seen.push(el.getBoundingClientRect().width);
                if (now - begun < 600) requestAnimationFrame(sample);
                else resolve(seen);
            });
        }));

        const between = widths.filter(w => w > rail.width + 1 && w < focal.width - 1);
        expect(between.length, `widths: ${widths.map(Math.round)}`).toBeGreaterThan(0);
        expect(widths[widths.length - 1]).toBeCloseTo(focal.width, 0);

        const faded = await page.locator('.kg-container *').evaluateAll(nodes =>
            nodes.filter(n => (n as HTMLElement).style && (n as HTMLElement).style.opacity !== '').length);
        expect(faded).toBe(0);
        await expect(page.locator('.kg-container svg[data-witness="1"]')).toHaveCount(1);
        expect(pageErrors).toEqual([]);
    });
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
 * What is wrong with the small panels on screen, if anything: a glyph too small
 * to be one, a word of a caption outside its own sheet or over its own glyph,
 * or two sheets that meet.
 *
 * The glyph is the stage's promote button, which covers exactly the panel's
 * box, and its caption is the words inside that button. A span 1px across is a
 * screen reader's word for the chip's arrow, and nothing anyone sees.
 */
async function smallPanelProblems(page: Page): Promise<string[]> {
    return page.evaluate(() => {
        const inside = (a: DOMRect, b: DOMRect) =>
            a.left >= b.left - 0.5 && a.right <= b.right + 0.5 && a.top >= b.top - 0.5 && a.bottom <= b.bottom + 0.5;
        const meet = (a: DOMRect, b: DOMRect) =>
            Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 &&
            Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;

        const sheets = [...document.querySelectorAll('[data-backdrop]')].map(el => ({
            key: el.getAttribute('data-backdrop'), box: el.firstElementChild!.getBoundingClientRect()
        }));
        const problems: string[] = [];

        document.querySelectorAll('[data-testid="stage-chrome"] button[data-role]').forEach(panel => {
            const key = panel.getAttribute('data-panel'),
                glyph = panel.getBoundingClientRect(),
                sheet = sheets.filter(s => s.key === key)[0].box;

            if (glyph.width < 80) problems.push(`${key}: a glyph ${Math.round(glyph.width)}px across`);
            panel.querySelectorAll('span').forEach(span => {
                const text = (span.textContent || '').trim(), box = span.getBoundingClientRect();
                if (span.children.length > 0 || text === '' || box.width <= 1) return;
                if (!inside(box, sheet)) problems.push(`${key}: "${text}" outside its sheet`);
                if (meet(box, glyph)) problems.push(`${key}: "${text}" over its glyph`);
            });
        });

        for (let i = 0; i < sheets.length; i++) {
            for (let j = i + 1; j < sheets.length; j++) {
                if (meet(sheets[i].box, sheets[j].box)) problems.push(`${sheets[i].key}'s sheet meets ${sheets[j].key}'s`);
            }
        }
        return problems;
    });
}

/**
 * The small panels on a stage too narrow for a caption beside each.
 *
 * At 1024×768 with the navbar open the stage is 356px across, and the strip's
 * caption column took the whole of each slot: a sheet 30px tall holding the
 * equilibrium dot and the promote icon, with "Consumer surplus / CS $40.50"
 * across its top edge. The panels are a shelf there, captioned above their
 * glyphs, and this asks every small panel what was wrong with it — in the
 * instruments and in the lesson, with a chip and without, and with the navbar
 * folded, where there is room for a strip again.
 */
test('a narrow stage captions its small panels inside their sheets', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(page.locator('[data-role="shelf"]')).toHaveCount(2);

    const fits = async (where: string) => {
        await expect.poll(() => smallPanelProblems(page), { message: where }).toEqual([]);
        await expect.poll(() => textCollisions(page), { message: where }).toEqual([]);
    };
    await fits('a shelf, at rest');

    // The widest numbers the lesson has, each with its chip under it.
    await page.getByRole('tab', { name: 'Scenarios' }).click();
    await page.getByRole('button', { name: 'Boom and cost squeeze' }).click();
    await expect(page.getByText(CHIP)).toHaveCount(3);
    await fits('a shelf, with chips');
    await expect(page.locator(panel('Consumer surplus'))).toContainText('Consumer surplus');

    await page.getByRole('button', { name: 'Hide links' }).click();
    await expect(page.locator('[data-role="strip"]')).toHaveCount(2);
    await fits('the navbar folded, a strip');

    await page.getByRole('button', { name: 'Show links' }).click();
    await backToTheLesson(page);
    await expect(page.locator('[data-role="shelf"]')).toHaveCount(2);
    await fits('a shelf, in the lesson');
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
    await backToTheLesson(page);
    await page.getByText('Grid', { exact: true }).click();
    await stepMarker(page, 2).click();

    await expect(page.locator('[data-panel="market"]')).toHaveAttribute('data-role', 'focal');
    await expect(page.locator('[data-testid="stage-chrome"] button')).toHaveCount(0);
});

test('a panel arrives without rebuilding the diagram', async ({ page }) => {
    // Back to the step before the surplus panel exists, then forward again.
    // A reveal changes what the stage arranges, which is the one thing that
    // used to mean a new engine and a flash.
    await backToTheLesson(page);
    await stepMarker(page, 3).click();
    await expect(page.locator(panel('Consumer surplus'))).toHaveCount(0);

    await page.locator('.kg-container svg').evaluate(el => el.setAttribute('data-witness', '1'));

    await stepMarker(page, 4).click();
    await expect(page.locator(panel('Consumer surplus'))).toBeVisible();
    await expect(page.locator('.kg-container svg[data-witness="1"]')).toHaveCount(1);
});

test('a panel that has not arrived is neither drawn nor reachable', async ({ page }) => {
    // Before the first step, which is where a fresh load starts.
    await page.goto('/');
    await page.locator('.kg-container svg').waitFor();

    // Nothing to promote, because nothing else is on the stage; and the market
    // panel is drawn as a frame with nothing in it yet.
    await expect(page.locator('[aria-label^="Show "]')).toHaveCount(0);
    await expect(page.locator(RENDERED.visibleCurve)).toHaveCount(0);

    // The whole stage is the one panel that has arrived, rather than a focal
    // square with two empty slots beside it.
    const wide = (await page.locator('[data-panel="market"]').boundingBox())!;
    await stepMarker(page, 4).click();
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
 * The narration (P8): "What changed" beside the stage, the strip under it on a
 * phone. At this suite's size it is the card.
 *
 * Two of its claims only exist in a browser. The first is that it narrates on
 * *commit*: a drag fires ~60 param changes a second, and the difference between
 * a chain that rewrites per frame and one that rewrites per interaction cannot
 * be seen by a test that calls the reducer twice. The second is that the
 * narration and the diagram's own ghosts agree about what "before" means — two
 * components with two ideas of it is a bug the student experiences as
 * incoherence.
 */
const STRIP = '[data-kind]';

/** The chain, with the whitespace the layout supplies rather than the markup. */
const chainText = (page: Page) =>
    page.locator(`${STRIP} [data-chain]`).textContent();

test('"What changed" is at rest until something moves', async ({ page }) => {
    // At rest. The lesson has just finished and been put away for Explore.
    // Nothing has moved, so there is nothing to undo and no chain — and, with
    // the instruments out, every way of moving something is named.
    const card = page.getByRole('region', { name: 'What changed' });
    await expect(card).toHaveAttribute('data-kind', 'rest');
    await expect(card).toContainText('Drag a curve, move a slider or try a scenario to see what it changes.');
    await expect(page.getByRole('button', { name: 'Undo' })).toHaveCount(0);
});

test('before the lesson begins, nothing offers a curve to drag', async ({ page }) => {
    // The default hint says to drag a curve; at the start of a build-up there
    // is no curve to drag. A fresh load, because `beforeEach` runs the lesson
    // out to its end.
    await page.goto('/');
    await page.locator('.kg-container svg').waitFor();

    // Beside the stage "What changed" holds its third of the column, and says
    // what it is waiting for.
    await expect(page.getByRole('button', { name: 'Start lesson' })).toBeVisible();
    await expect(page.locator(STRIP)).toHaveAttribute('data-kind', 'rest');
    await expect(page.locator(STRIP)).toContainText('Start the lesson, and what each step changes will show here.');

    // On a phone the strip holds its line under the stage whatever it says,
    // and says that instead.
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(STRIP)).toHaveAttribute('data-kind', 'rest');
    await expect(page.getByText('Press Start lesson when you\'re ready.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Undo' })).toHaveCount(0);
    expect(await page.locator(`${STRIP} [role="status"]`).textContent()).toBe('');
});

test('the narration narrates once per interaction, not once per frame', async ({ page }) => {
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

    // Let go, and the whole interaction is one chain, in the lesson's words.
    await expect(page.locator(STRIP)).toHaveAttribute('data-kind', 'settled');
    const chain = (await chainText(page))!;
    expect(chain).toContain('Demand increases20.0→');
    expect(chain, 'the middle clause names what the engine said moved').toContain('demand shifts up');
    expect(chain).toMatch(/The price rises\$11\.00→\$\d/);

    // And one utterance, once.
    expect(await page.locator(`${STRIP} [role="status"]`).textContent())
        .toMatch(/^Demand increases from 20\.0 to .*; demand shifts up; the price rises from \$11\.00 to /);
});

test('the narration and the panel chips agree about "before"', async ({ page }) => {
    await dragDemandDown(page);

    // The chip's delta is `calcs.Pe - prev.calcs.Pe`, computed by the engine
    // from the snapshot the ghosts are drawn from. The narration's arrow is
    // computed by the app from `getSnapshot()`. If those were two different
    // "before"s — the failure the plan warns about — these two numbers would
    // disagree.
    const chain = (await chainText(page))!;
    const prices = chain.match(/The price (?:rises|falls)\$(\d+\.\d\d)→\$(\d+\.\d\d)/)!;
    const narrated = Number(prices[2]) - Number(prices[1]);

    // The market's chip is the first: "▼ $1.50" is a fall of a dollar fifty.
    const chip = (await page.getByText(CHIP).first().textContent())!;
    const charted = (chip.startsWith('▼') ? -1 : 1) * Number(chip.replace(/^[▲▼] \$/, ''));

    // A cent, because both sides print to two decimals and they round at
    // different points: the chain rounds each end of the move and this test
    // subtracts them, while the chip rounds a delta the diagram computed. A
    // true delta of -1.255 is "-1.25" one way and "-1.26" the other, and that is
    // the whole of the disagreement this tolerance admits. Reading a *different*
    // snapshot — the failure the test exists for — is not a cent out.
    expect(Math.abs(narrated - charted), `chain said ${narrated}, chip said ${chip}`).toBeLessThan(0.011);
});

test('undo puts the market back, and the diagram stands down with it', async ({ page }) => {
    const before = await focalPointCoordinates(page);

    await dragDemandDown(page);
    // The ghosts are the diagram's own account of the same interaction.
    await expect(page.locator(RENDERED.visibleCurve)).toHaveCount(7);

    await page.getByRole('button', { name: 'Undo' }).click();

    const after = await focalPointCoordinates(page);
    expect(Math.abs(after.x - before.x), 'Q* should be back where it started').toBeLessThan(TOLERANCE);
    expect(Math.abs(after.y - before.y), 'P* should be back where it started').toBeLessThan(TOLERANCE);

    // Nothing told the ghost to hide: the params equal the snapshot again, so
    // `prev.changed` is false and the narration reads rest for the same reason.
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
    // In the lesson, so that there are words on the card for the refusal to
    // leave alone.
    await backToTheLesson(page);
    await dragDemandOffTheTop(page);

    await expect(page.locator(STRIP)).toHaveAttribute('data-refusal', 'true');
    await expect(page.getByText('a is at the top of its range (28.0) in this diagram.')).toHaveCount(2);

    // Said above the chain, and the chain stays: the curve did move, as far as
    // it could. The strip had one line and had to choose; the card has room.
    expect(await chainText(page)).toContain('Demand increases20.0→28.0');
    expect(await page.locator(`${STRIP} [role="status"]`).textContent())
        .toMatch(/^a is at the top of its range \(28\.0\) in this diagram\..*the price rises/);

    // And the lesson keeps its words. When it shared the strip, reaching the
    // end of a range took the step's explanation off the screen.
    await expect(page.getByRole('region', { name: 'Lesson' })).toContainText('Over to you');
});

test('says it once, however long the drag pushes against the end', async ({ page }) => {
    await dragDemandOffTheTop(page);

    // Twice is the eye and the live region; a hundred would be a refusal per
    // pointer move.
    await expect(page.getByText('a is at the top of its range (28.0) in this diagram.')).toHaveCount(2);
});

test('drops the refusal the moment something moves again', async ({ page }) => {
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
    // — so a narration that reported it would drop the middle clause from a
    // sentence that was already correct, and claim the student had moved
    // something.
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

    // Mid-scrub the narration is live: values without arrows, and nothing
    // announced. Without `beginGesture` every one of those ten moves would have
    // been a settled chain, and the live region would have read all ten.
    await expect(page.locator(STRIP)).toHaveAttribute('data-kind', 'live');
    expect(await chainText(page)).not.toContain('→');
    expect(await page.locator(`${STRIP} [role="status"]`).textContent()).toBe('');

    await page.mouse.up();

    // And the whole scrub is one chain, measured from where it began — not from
    // the frame before last, which is what a per-change snapshot would give.
    await expect(page.locator(STRIP)).toHaveAttribute('data-kind', 'settled');
    expect(await chainText(page)).toContain('Demand increases20.0→');
});

/**
 * Nothing moves under the pointer that is holding it.
 *
 * "What changed" is the bottom third of the column whatever its chain says,
 * so a scrub that settles fills it without growing it, and the slider that
 * moved it stays where the student is holding it.
 */
test('"What changed" keeps its height, and the slider that moved it stays put', async ({ page }) => {
    const slider = page.getByRole('slider', { name: 'a' });
    const card = page.locator(STRIP);
    const before = (await slider.boundingBox())!;
    const resting = (await card.boundingBox())!;

    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await expect(card).toHaveAttribute('data-kind', 'settled');

    // Vertically. The thumb moves along its track, which is the point of it.
    const after = (await slider.boundingBox())!;
    expect(after.y).toBeCloseTo(before.y, 0);
    expect((await card.boundingBox())!.height).toBeCloseTo(resting.height, 0);
});

test('the maths instrument shows the calc the strip named', async ({ page }) => {
    await dragDemandDown(page);
    await page.getByRole('button', { name: 'Why?' }).click();

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
 * The Maths instrument where the screen has the height for it.
 *
 * The audit measured it at 1440×833, where its four calcs overflowed the dock
 * by fourteen pixels and a scrollbar stood beside them for good — and that was
 * with every fraction set at the height of the text beside it. They are set in
 * display style now, which is taller, and the spacing between calcs paid for it.
 *
 * The tabs' card is two thirds of the column whatever is in it, so at 833 and
 * at 900 the maths now scrolls inside its tab (see the test after this one);
 * from 1000 it fits, to the pixel. This holds the fit, and that pointing at it
 * raises no bar, a little above that.
 */
test('the maths instrument fits beside the stage when there is the height for it', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1050 });
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

/**
 * Where the dock is too short for its maths, it scrolls — and says so only when
 * asked. 600 tall, well short of the 1000 where the maths fits.
 */
test('the maths instrument scrolls when it must, with a bar only on hover', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 600 });
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

    // Both params move, and the narration reports both as causes, each in
    // the lesson's words for it.
    const chain = (await chainText(page))!;
    expect(chain).toContain('Demand increases20.0→26.0');
    expect(chain).toContain('Sellers\' costs rise2.0→6.0');
});

/**
 * The longest chain is read whole, and the diagram does not move for it.
 *
 * A scenario moving both params narrates two causes, two shifting curves and
 * four effects. On the strip that was wider than its one line, which clipped
 * it from the end — and the end is the effects, what the student moved
 * something to find out. Before that, the chain wrapped, the second line took
 * its height from the stage, and the engine was rebuilt under it. In "What
 * changed" it is read whole, in a column whose width the stage already gave
 * up, so the stage neither changes shape nor rebuilds.
 */
test('the longest chain is read whole, and the diagram does not move for it', async ({ page }) => {
    const stage = await stageBox(page);
    await page.locator('.kg-container svg').evaluate(el => el.setAttribute('data-witness', '1'));

    await page.getByRole('tab', { name: 'Scenarios' }).click();
    await page.getByRole('button', { name: 'Boom and cost squeeze' }).click();
    await expect(page.getByText(CHIP)).toHaveCount(3);

    // A rebuild followed a resize within a frame or two, unthrottled; give it ten.
    await frames(page);

    const card = page.locator(STRIP);
    await expect(card).toHaveAttribute('data-kind', 'settled');
    await expect(card.locator('[data-part="cause"] > *')).toHaveCount(2);
    await expect(card.locator('[data-part="movement"] > *')).toHaveCount(2);
    await expect(card.locator('[data-part="effect"] > *')).toHaveCount(4);

    // With room to spare at this size: nothing scrolls inside the card.
    const body = await card.locator('[data-chain]').evaluate(el => ({
        client: el.parentElement!.clientHeight, scroll: el.parentElement!.scrollHeight
    }));
    expect(body.scroll, `chain ${body.scroll}px in ${body.client}px`).toBeLessThanOrEqual(body.client);

    const after = await stageBox(page);
    expect(after.width).toBeCloseTo(stage.width, 0);
    expect(after.height).toBeCloseTo(stage.height, 0);
    await expect(page.locator('.kg-container svg[data-witness="1"]')).toHaveCount(1);
    await expect(page.getByText(CHIP)).toHaveCount(3);
});

/** Let the page draw a few frames, which is longer than a resize takes to reach the diagram. */
async function frames(page: Page, count = 10) {
    await page.evaluate((n) => new Promise<void>(resolve => {
        let left = n;
        const tick = () => (--left > 0 ? requestAnimationFrame(tick) : resolve());
        requestAnimationFrame(tick);
    }), count);
}

/**
 * A change of the stage's shape keeps the student's last move.
 *
 * The stage used to rebuild the engine whenever its proportions changed — the
 * navbar folding away, the window resized, a question row arriving under the
 * stage — and the screen then had to put the lesson back onto an engine that
 * had never heard of it. It put back the values, and snapshotted so that the
 * restore would not be drawn as a move; and the snapshot was exactly what
 * forgot the move the student *had* made. The ghost of the curve they had just
 * dragged went, every delta chip went, and the strip went back to rest.
 *
 * Now the same engine is laid out again, and nothing about that is a move. So
 * this drags demand, crosses the filmstrip breakpoint in both directions and
 * makes an ordinary change of proportions, and asks after all three every time.
 */
test('a change of shape keeps the last move: its ghost, its deltas and its chain', async ({ page }) => {
    // At the suite's own size, with the navbar open, the stage is under the
    // filmstrip breakpoint.
    await expect(page.locator('[data-role="strip"]')).toHaveCount(2);

    await dragDemandDown(page);
    await expect(page.locator(RENDERED.visibleCurve)).toHaveCount(7);
    await expect(page.getByText(CHIP)).toHaveCount(3);
    await expect(page.locator(STRIP)).toHaveAttribute('data-kind', 'settled');

    const chain = (await chainText(page))!;
    expect(chain).toContain('demand shifts down');
    const chips = await page.getByText(CHIP).allTextContents();
    await page.locator('.kg-container svg').evaluate(el => el.setAttribute('data-witness', '1'));

    const remembered = async (where: string) => {
        await frames(page);
        await expect(page.locator(RENDERED.visibleCurve), `${where}: the ghost`).toHaveCount(7);
        await expect(page.locator(`${LABEL}:visible`), `${where}: the ghost's label`)
            .toHaveCount(LABELS_PER_PANEL + GHOST_LABELS);
        expect(await page.getByText(CHIP).allTextContents(), `${where}: the deltas`).toEqual(chips);
        await expect(page.locator(STRIP), `${where}: the strip`).toHaveAttribute('data-kind', 'settled');
        expect(await chainText(page), `${where}: the chain`).toBe(chain);
        await expect(page.locator('.kg-container svg[data-witness="1"]'), `${where}: the same diagram`).toHaveCount(1);
    };

    // The navbar's second column folds away, the stage passes 900px, and the
    // strip stands up beside the focal panel as a rail.
    await page.getByRole('button', { name: 'Hide links' }).click();
    await expect(page.locator('[data-role="rail"]')).toHaveCount(2);
    await remembered('navbar folded, rail');

    await page.getByRole('button', { name: 'Show links' }).click();
    await expect(page.locator('[data-role="strip"]')).toHaveCount(2);
    await remembered('navbar back, filmstrip');

    // A shorter window: new proportions, and no breakpoint anywhere near.
    await page.setViewportSize({ width: 1440, height: 760 });
    await expect(page.locator('[data-role="strip"]')).toHaveCount(2);
    await remembered('a shorter window');

    // And undo still puts the market back, because `prev` is still the market
    // as it was before the drag rather than as it was at the last resize.
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.locator(RENDERED.visibleCurve)).toHaveCount(6);
    await expect(page.getByText(CHIP)).toHaveCount(0);
    await expect(page.locator(STRIP)).toHaveAttribute('data-kind', 'rest');
});

/**
 * The diagram and its captions take a new shape in the same frame.
 *
 * The engine redraws its canvas as soon as its box changes, at the proportions
 * it was last given. When the stage rebuilt the engine for a new shape, that
 * left a frame — in practice about a second, while the new one was built — with
 * the old drawing stretched to the new width and the captions placed for the
 * new arrangement, each describing a different diagram. A relayout delivered
 * in the stage's own resize callback lands before the browser paints.
 *
 * Read from an observer registered after the stage's and the engine's, so each
 * sample is the state the next paint shows, through every frame of the navbar
 * sliding shut.
 */
test('the diagram and its captions change shape in the same frame', async ({ page }) => {
    await page.evaluate(() => {
        const outer = document.querySelector('[data-testid="stage-chrome"]')!.parentElement!;
        const samples: { stage: number; canvas: number; caption: number; axis: number }[] = [];
        (window as unknown as { samples: typeof samples }).samples = samples;
        new ResizeObserver(() => {
            const svg = document.querySelector('.kg-container svg')!;
            const caption = document.querySelector('[data-testid="stage-chrome"] [data-focused="true"]')!;
            // The focal panel is the one whose axes have ticks; its x axis runs
            // the panel's whole width.
            const axis = [...document.querySelectorAll('.kg-container g.axis')]
                .filter(a => a.querySelectorAll('g.tick').length >= 2)
                .map(a => a.querySelector('path.domain')!.getBoundingClientRect());
            samples.push({
                stage: outer.clientHeight,
                canvas: Number(svg.getAttribute('height')),
                caption: caption.getBoundingClientRect().right,
                axis: Math.max(...axis.map(b => b.right))
            });
        }).observe(outer);
    });

    await page.getByRole('button', { name: 'Hide links' }).click();
    await expect(page.locator('[data-role="rail"]')).toHaveCount(2);
    await frames(page);

    const samples = await page.evaluate(() =>
        (window as unknown as { samples: { stage: number; canvas: number; caption: number; axis: number }[] }).samples);
    // The first is the observer's own first look; the rest are the slide.
    expect(samples.length, 'frames of the navbar sliding shut').toBeGreaterThan(3);
    samples.forEach((s, i) => {
        expect(Math.abs(s.canvas - s.stage), `frame ${i}: canvas ${s.canvas}px in a ${s.stage}px stage`)
            .toBeLessThan(1.5);
        expect(Math.abs(s.caption - s.axis), `frame ${i}: caption ends at ${s.caption}, panel at ${s.axis}`)
            .toBeLessThan(1.5);
    });
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
    await stepMarker(page, ASK_MARKER).click();
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
    await expect(question.getByText(/the right direction/)).toBeVisible();
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
    await expect(question.getByText(/but this change moves it/)).toBeVisible();

    // Still nothing drawn where the answer is: a wrong answer is not a reason
    // to give it away, only a reason to offer it.
    await expect(page.locator(RENDERED.visibleCurve)).toHaveCount(7);

    await question.getByRole('button', { name: 'Show me' }).click();
    await expect(page.locator(RENDERED.visibleCurve)).toHaveCount(8);

    // And it goes with the question, rather than being left on the diagram for
    // the rest of the lesson.
    await question.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('group', { name: 'Question' })).toHaveCount(0);
    const dotted = () => page.locator(RENDERED.visibleCurve).evaluateAll(nodes => nodes
        .filter(n => (n as SVGElement).style.strokeDasharray.replace(/\s|px/g, '') === '1,2').length);
    await expect.poll(dotted, 'the answer line').toBe(0);

    // What stays is the student's own move. The question's faint start line
    // stands down with it, and demand's ghost — off while a question is asked —
    // takes its place at the same height: `D₀`, where the question found the
    // curve, beside the curve where they left it. A forward step that only
    // reveals does not re-base. This used to count six, because the question
    // row leaving changed the stage's shape, the engine was rebuilt, and the
    // rebuilt one had forgotten the move (NOTES.md, issue 19).
    await expect(page.locator(RENDERED.visibleCurve)).toHaveCount(7);
    const labels = await page.locator(`${LABEL}:visible`).allTextContents();
    expect(labels.filter(t => t.includes('D_0')), `labels: ${labels.join(' | ')}`).toHaveLength(1);
});

/**
 * The lesson card's progress bar.
 *
 * What a unit test cannot see here is the cascade. The old track's current
 * marker lost to two other rules on specificity, and on most steps nothing
 * marked the student's place; the bar's states are written so that cannot
 * happen, and only a computed style shows whether it did. A marker draws its
 * bar in `::before`, so that is what these read.
 */

/** Every marker's bar as drawn: its height and fill, and which is current. */
const markerBars = (page: Page) => page.getByRole('group', { name: 'Lesson steps' }).getByRole('button')
    .evaluateAll(nodes => nodes.map(node => {
        const bar = getComputedStyle(node, '::before');
        return {
            current: node.getAttribute('aria-current') === 'step',
            fill: bar.backgroundColor,
            height: parseFloat(bar.height)
        };
    }));

test('the current step is the one taller, darker marker, whatever kind of step it is', async ({ page }) => {
    // The bars ease between states. A reader who asks for less motion gets the
    // end state at once, and so does this.
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // The first step; a move already passed; the question; and the very end.
    for (const scheme of ['light', 'dark']) {
        await page.evaluate(s => document.documentElement.setAttribute('data-mantine-color-scheme', s), scheme);

        if (scheme === 'light') await backToTheLesson(page);
        for (const position of [1, 7, ASK_MARKER, 9]) {
            const where = `${scheme}, at step ${position}`;
            await stepMarker(page, position).click();
            await expect(stepMarker(page, position)).toHaveAttribute('aria-current', 'step');

            const bars = await markerBars(page);
            const current = bars.filter(m => m.current);
            expect(current, where).toHaveLength(1);
            expect(bars.filter(m => !m.current).map(m => m.fill), where).not.toContain(current[0].fill);

            // Carried by shape as well as hue: taller than every other bar, so
            // it reads in greyscale and to someone who cannot tell blue apart.
            const others = bars.filter(m => !m.current).map(m => m.height);
            expect(current[0].height, where).toBeGreaterThan(Math.max(...others));
        }
    }
});

test('a step past an unanswered question looks locked, not disabled', async ({ page }) => {
    await toTheQuestion(page);

    const locked = page.locator('button[data-step][data-reachable="false"]');
    await expect(locked).toHaveCount(1);
    expect(await locked.evaluate(el => {
        const style = getComputedStyle(el), bar = getComputedStyle(el, '::before');
        return { opacity: style.opacity, border: bar.borderTopStyle };
    })).toEqual({ opacity: '1', border: 'dashed' });
});

/**
 * Where the lesson sits, and what it costs the diagram: nothing.
 *
 * The lesson used to speak from the strip under the stage, one line that could
 * not grow, because growing would shrink the diagram. The card can say two
 * paragraphs, a key term and a whole question because it is beside the stage,
 * in a column whose width is fixed, and the stage's height does not depend on
 * it. These hold that true in a browser, where boxes are real.
 */
const stageBox = async (page: Page) => (await page.locator('.kg-container svg').first().boundingBox())!;

test('moving through the lesson never changes the diagram\'s size', async ({ page }) => {
    await page.goto('/');
    await page.locator('.kg-container svg').waitFor();
    await stepMarker(page, 1).click();
    const before = await stageBox(page);

    // A short step, then the question with its sliders, then a verdict: the
    // card grows each time, beside the stage and not above or below it.
    await stepMarker(page, 7).click();
    await stepMarker(page, ASK_MARKER).click();
    const question = page.getByRole('group', { name: 'Question' });
    await question.getByRole('button', { name: 'Check' }).click();

    const after = await stageBox(page);
    expect(after.height).toBeCloseTo(before.height, 0);
    expect(after.width).toBeCloseTo(before.width, 0);
});

/**
 * The lesson and the instruments are tabs on one card, so switching between
 * them is as still as moving through either: the card is the top two thirds of
 * the column and "What changed" the rest, whichever tab is open and whatever
 * either holds. At the end of the lesson the two draw the same diagram, so the
 * stage has nothing at all to rearrange.
 */
test('the lesson is a tab beside the instruments, and switching moves nothing', async ({ page }) => {
    const tabs = page.getByRole('complementary', { name: 'Lesson and instruments' });
    const changed = page.getByRole('region', { name: 'What changed' });
    const column = async () => {
        const [top, bottom] = [(await tabs.boundingBox())!, (await changed.boundingBox())!];
        return { top, bottom, whole: bottom.y + bottom.height - top.y };
    };

    const exploring = await column();
    const stage = await stageBox(page);
    expect(exploring.top.x).toBeGreaterThan(stage.x + stage.width);
    // Two thirds of the column, less two thirds of the gap between the cards.
    expect(exploring.top.height).toBeCloseTo((exploring.whole - 12) * 2 / 3, 0);
    expect(exploring.bottom.y).toBeGreaterThan(exploring.top.y + exploring.top.height);

    await backToTheLesson(page);
    await expect(page.getByRole('tabpanel', { name: 'Lesson' })).toBeVisible();
    await expect(page.getByRole('tabpanel', { name: /^(Explore|Scenarios|Maths)$/ })).toHaveCount(0);

    // And in the lesson, at its end and at its longest: the question with its
    // verdict.
    const finished = await column();
    await stepMarker(page, ASK_MARKER).click();
    await page.getByRole('group', { name: 'Question' }).getByRole('button', { name: 'Check' }).click();
    const asking = await column();

    for (const at of [finished, asking]) {
        expect(at.top.height).toBeCloseTo(exploring.top.height, 0);
        expect(at.bottom.height).toBeCloseTo(exploring.bottom.height, 0);
        expect(at.top.x).toBeCloseTo(exploring.top.x, 0);
    }

    const after = await stageBox(page);
    expect(after.width).toBeCloseTo(stage.width, 0);
    expect(after.height).toBeCloseTo(stage.height, 0);
});

test('on a phone the lesson goes under the diagram, at a height that does not change', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('.kg-container svg').waitFor();

    const lesson = page.getByRole('region', { name: 'Lesson' });
    await stepMarker(page, 1).click();
    const short = (await lesson.boundingBox())!;
    const stage = await stageBox(page);
    expect(short.y).toBeGreaterThan(stage.y + stage.height);

    // A step with more to say scrolls inside the card rather than growing it,
    // which would shrink the diagram above.
    await stepMarker(page, ASK_MARKER).click();
    const long = (await lesson.boundingBox())!;
    expect(long.height).toBeCloseTo(short.height, 0);
    expect((await stageBox(page)).height).toBeCloseTo(stage.height, 0);

    // And it stays on the page.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

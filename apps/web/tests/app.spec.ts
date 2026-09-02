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
 * The one label that belongs to no panel's own furniture: the reveal curve's.
 *
 * P11's question apparatus draws the correct position in the market panel, and
 * it is in the DOM from the first frame like every other hidden thing — which
 * is the point, since showing it must not cost a rebuild.
 */
const QUESTION_LABELS = 1;

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
    await expect(page.locator(LABEL)).toHaveCount(LABELS_PER_PANEL * 3 + QUESTION_LABELS);

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
    expect(chain).toMatch(/P\*\$11\.0→\$\d/);

    // And one utterance, once.
    expect(await page.locator(`${STRIP} [role="status"]`).textContent())
        .toMatch(/^You changed a from 20\.0 to .*; demand shifts up; P\* from \$11\.0 to /);
});

test('the strip and the panel chips agree about "before"', async ({ page }) => {
    await dragDemandDown(page);

    // The chip's delta is `calcs.Pe - prev.calcs.Pe`, computed by the engine
    // from the snapshot the ghosts are drawn from. The strip's arrow is
    // computed by the app from `getSnapshot()`. If those were two different
    // "before"s — the failure the plan warns about — these two numbers would
    // disagree.
    const chain = (await chainText(page))!;
    const prices = chain.match(/P\*\$(\d+\.\d)→\$(\d+\.\d)/)!;
    const narrated = Number(prices[2]) - Number(prices[1]);

    const chip = (await page.getByText(/^[+−]\d/).first().textContent())!;
    const charted = Number(chip.replace('−', '-').replace('+', ''));

    // A tenth, because both sides print to one decimal and they round at
    // different points: the strip rounds each end of the move and this test
    // subtracts them, while the chip rounds a delta the diagram computed. A
    // true delta of -1.25 is "-1.2" one way and "-1.3" the other, and that is
    // the whole of the disagreement this tolerance admits. Reading a *different*
    // snapshot — the failure the test exists for — is not a tenth out.
    expect(Math.abs(narrated - charted), `strip said ${narrated}, chip said ${chip}`).toBeLessThan(0.11);
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
    await expect(page.getByText(/^[+−]\d/)).toHaveCount(0);
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

    const names = await page.locator('[class*="rowFocused"]').first().textContent();
    expect(names).toContain('Pe');
});

test('the maths instrument prints the same numbers as the diagram', async ({ page }) => {
    await page.getByRole('tab', { name: 'Maths' }).click();

    // The whole reframe: the explainer is the calc string typeset, so it cannot
    // hold a number the diagram disagrees with. If these two differed, one of
    // them would be doing its own arithmetic.
    const open = page.getByRole('tabpanel');
    await expect(open.getByText('= 11.0')).toBeVisible();

    const chip = (await page.getByText('$11.0').first().textContent())!;
    expect(chip).toContain('11.0');
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

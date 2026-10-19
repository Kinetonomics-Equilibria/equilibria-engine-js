import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { dataCoordinates, focalPointCoordinates, RENDERED, test, textCollisions } from './helpers';

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

/** The first question — the RBA, which works through demand for A$ — from a fresh load. */
async function toTheFirstQuestion(page: Page) {
    const markers = page.locator('button[data-kinds]');
    const kinds = await markers.evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-kinds') || ''));
    await markers.nth(kinds.findIndex((k) => k.includes('ask'))).click();
    const question = page.getByRole('group', { name: 'Question' });
    await expect(question).toContainText('RBA');
    return question;
}

/**
 * The dotted lines on the stage, read back through the axes.
 *
 * Dotted is the answer line's style and nothing else's in this lesson — a live
 * curve is solid and a question's start is dashed — so these are what "Show me"
 * drew. Each comes back as where its box is centred, in the axes' own units, and
 * which way it slopes: the rate axis runs US$0.40 to US$0.90, so the centre of a
 * straight line spanning it is where it crosses US$0.65, the rate every question
 * starts from, and the slope says whether it is a demand curve or a supply one —
 * which the centre alone cannot, since demand and supply shifted right by the
 * same amount cross US$0.65 at the same quantity.
 */
async function dottedLines(page: Page) {
    const drawn = page.locator(`.kg-container ${RENDERED.visibleCurve}`);
    const dotted = await drawn.evaluateAll((nodes) => nodes
        .map((node, i) => (node as SVGElement).style.strokeDasharray.replace(/\s|px/g, '') === '1,2' ? i : -1)
        .filter((i) => i > -1));
    return Promise.all(dotted.map(async (i) => {
        const line = drawn.nth(i);
        const slopesDown = await line.evaluate((node) => {
            const path = node as SVGPathElement,
                a = path.getPointAtLength(0), z = path.getPointAtLength(path.getTotalLength());
            // SVG y grows downwards: a curve sloping down has its higher-x end lower.
            return (z.x - a.x) * (z.y - a.y) > 0;
        });
        return { ...(await dataCoordinates(line)), slopesDown };
    }));
}

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
    const question = await toTheFirstQuestion(page);
    // The prompt asks which curve, and does not say.
    await expect(question).toContainText('Which curve moves, and which way?');
    await expect(question).not.toContainText('demand for A$');

    await dragSideways(page, 'down', 50);
    await question.getByRole('button', { name: 'Check' }).click();

    await expect(question.getByRole('status')).toContainText('Right direction — you moved demand for A$ right.');
});

/**
 * Which curve moves (P14), chosen the two ways a student can choose it.
 *
 * With the mouse, a student who grabs supply on a demand question has moved
 * supply, and is told so — where they used to be told they had moved nothing.
 * With the keyboard, choosing a slider is choosing the curve. The two must be
 * the same choice, so they get the same sentence.
 */
test('dragging supply on a demand question is told so, in words', async ({ page, pageErrors }) => {
    const question = await toTheFirstQuestion(page);

    await dragSideways(page, 'up', 50);
    await question.getByRole('button', { name: 'Check' }).click();

    await expect(question.getByRole('status'))
        .toContainText('This one works through demand for A$ — supply of A$ should stay where it was.');
    await expect(question.getByRole('status')).not.toContainText('did not move');
    expect(pageErrors).toEqual([]);
});

test('the keyboard chooses a curve as the mouse does', async ({ page }) => {
    const question = await toTheFirstQuestion(page);

    const supply = question.getByRole('slider', { name: 'Supply of A$' });
    await supply.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');

    await expect(question.getByRole('status'))
        .toContainText('This one works through demand for A$ — supply of A$ should stay where it was.');
    // The supply curve really moved: two steps of two is two US cents off the rate.
    await expect(caption(page, 'market')).toContainText('A$1 = US$0.63');
});

/**
 * "Show me" on a question with no target (P14) used to draw nothing. It now
 * draws the right curve shifted the right way by the question's `illustrate`,
 * and this is the one place that can say *how far*: read back through the
 * axes, demand for A$ shifted ten to the right crosses US$0.65 at 60.
 */
test('"Show me" draws demand for A$ shifted ten to the right', async ({ page, pageErrors }) => {
    const question = await toTheFirstQuestion(page);
    await question.getByRole('button', { name: 'Check' }).click();
    await expect(question.getByRole('status')).toContainText('You moved neither');

    // A wrong answer is a reason to offer the answer, not to show it.
    expect(await dottedLines(page)).toEqual([]);

    await question.getByRole('button', { name: 'Show me' }).click();
    await expect.poll(async () => (await dottedLines(page)).length).toBe(1);

    const [answer] = await dottedLines(page);
    expect(answer.slopesDown, 'the answer should be a demand curve').toBe(true);
    expect(Math.abs(answer.x - 60), `crosses US$0.65 at ${answer.x}`).toBeLessThan(TOLERANCE.Q);
    expect(Math.abs(answer.y - EQUILIBRIUM.rate), `centred at ${answer.y}`).toBeLessThan(TOLERANCE.rate);

    // And it goes with the question.
    await question.getByRole('button', { name: 'Continue' }).click();
    await expect.poll(async () => (await dottedLines(page)).length).toBe(0);
    expect(pageErrors).toEqual([]);
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

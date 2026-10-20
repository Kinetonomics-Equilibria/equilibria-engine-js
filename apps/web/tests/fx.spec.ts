import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
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

/**
 * Through the lesson and out of it, into the instruments and the whole diagram.
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

/**
 * What the lesson card says at this step: its title and words, the prompt at a
 * question. The first live region on the card; the question's verdict is the
 * second, under it.
 */
const lessonWords = (page: Page) =>
    page.getByRole('region', { name: 'Lesson' }).locator('[aria-live="polite"]').first();

/** The first question — the RBA, which moves demand for A$ — from a fresh load. */
async function toTheFirstQuestion(page: Page) {
    const markers = page.locator('button[data-kinds]');
    const kinds = await markers.evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-kinds') || ''));
    await markers.nth(kinds.findIndex((k) => k.includes('ask'))).click();
    const question = page.getByRole('group', { name: 'Question' });
    await expect(question).toBeVisible();
    await expect(lessonWords(page)).toContainText('RBA');
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

/**
 * The Maths instrument, in this lesson's letters and currencies.
 *
 * Its labels are written to sit in front of a number — "A$1 =" — so the
 * formulas take the diagram's own symbols instead: `e*` from the market's
 * dropline and `1/e*` from the mirror's. And every result is in the currency
 * the caption quotes it in, because the caption is beside it.
 */
test('the maths instrument writes the rate as the diagram does', async ({ page }) => {
    await toTheEnd(page);
    await page.getByRole('tab', { name: 'Maths' }).click();
    const open = page.getByRole('tabpanel');
    const working = async (calc: string) =>
        (await open.locator(`[data-calc="${calc}"] .katex-html`).innerText()).replace(/[\s\u200b]/g, '');

    await expect(open.locator('[data-calc]')).toHaveCount(3);
    await expect(open.locator('.katex-error')).toHaveCount(0);

    expect(await working('rate')).toMatch(/^e∗=0\.65\+200demand−supply=0\.65\+20050−50=US\$0\.65$/);
    await expect(caption(page, 'market')).toContainText('A$1 = US$0.65');

    // `1/e*` is the whole of its formula, so it is said once, not twice.
    expect(await working('inverse')).toMatch(/^e∗1=0\.651=A\$1\.54$/);
    await page.getByRole('button', { name: 'Show US$ market' }).click();
    await expect(caption(page, 'mirror')).toContainText('US$1 = A$1.54');

    expect(await working('Qe')).toMatch(/^Q∗=2demand\+supply=250\+50=50$/);

    // The words, upright and explained, rather than d·e·m·a·n·d in italics.
    await expect(open.getByRole('definition')).toHaveText(['A$ demanded at US$0.65', 'A$ supplied at US$0.65']);
});

test('demand for A$ is dragged right, and the A$ appreciates', async ({ page, pageErrors }) => {
    await toTheEnd(page);
    const before = await focalPointCoordinates(page);

    await dragSideways(page, 'down', 60);

    const after = await focalPointCoordinates(page);
    expect(after.y, 'the A$ should have risen').toBeGreaterThan(before.y + 0.01);
    expect(after.x, 'more A$ should change hands').toBeGreaterThan(before.x);

    // Sideways, said sideways — and the US$ side said with it, a line each.
    const moved = page.getByRole('region', { name: 'What changed' }).locator('[data-part="movement"] > *');
    await expect(moved).toHaveText(['demand for A$ shifts to the right', 'supply of US$ shifts to the right']);
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
    const card = page.getByRole('region', { name: 'What changed' });
    await expect(card.locator('[data-part="movement"] > *'))
        .toHaveText(['supply of A$ shifts to the right', 'demand for US$ shifts to the right']);
    // And what that is called, in the words the lesson taught.
    await expect(card.locator('[data-part="effect"] > *').first()).toContainText('The A$ depreciates');
    await expect(caption(page, 'market')).toContainText('▼');
});

/**
 * The colour a curve is drawn in: its visible path's. The path a pointer takes
 * hold of is a transparent copy, named with the same engine id.
 */
async function strokeOf(dragPath: Locator) {
    const id = (await dragPath.getAttribute('class'))!.replace(/^dragPath-/, '');
    return dragPath.page().locator(`.kg-container path.path-${id}`).evaluate((p) => getComputedStyle(p).stroke);
}

/** The colour of a part's marker on "What changed": a ring for what moved, a dot for the curves. */
const markerColour = (page: Page, part: 'cause' | 'movement') =>
    page.getByRole('region', { name: 'What changed' }).locator(`[data-part="${part}"]`).evaluate((li, which) => {
        const marker = getComputedStyle(li, '::before');
        return which === 'cause' ? marker.borderTopColor : marker.backgroundColor;
    }, part);

test('the chain is marked in the colour of the curve that moved', async ({ page }) => {
    await toTheEnd(page);

    for (const way of ['down', 'up'] as const) {
        await dragSideways(page, way, 40);
        const stroke = await strokeOf(await curveSloping(page, way));
        expect(await markerColour(page, 'cause'), `the curve sloping ${way}`).toBe(stroke);
        expect(await markerColour(page, 'movement'), `the curve sloping ${way}`).toBe(stroke);
        await page.getByRole('button', { name: 'Undo' }).click();
    }

    // Two curves, two colours: the blue of demand and the orange of supply.
    expect(await strokeOf(await curveSloping(page, 'down')))
        .not.toBe(await strokeOf(await curveSloping(page, 'up')));
});

test('a question about demand is answered by dragging it, and marked in its own words', async ({ page }) => {
    const question = await toTheFirstQuestion(page);
    // The prompt asks which curve, and does not say.
    await expect(lessonWords(page)).toContainText('Which curve moves, and which way?');
    await expect(lessonWords(page)).not.toContainText(/demand for A\$/i);

    await dragSideways(page, 'down', 50);
    await question.getByRole('button', { name: 'Check' }).click();

    await expect(question.getByRole('status')).toContainText('You moved demand for A$ right, which is the right direction.');
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
        .toContainText('This change moves demand for A$, so supply of A$ should stay where it was.');
    await expect(question.getByRole('status')).not.toContainText('haven\'t moved');
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
        .toContainText('This change moves demand for A$, so supply of A$ should stay where it was.');
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
    await expect(question.getByRole('status')).toContainText('You haven\'t moved demand for A$ or supply of A$ yet.');

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

/**
 * A change of the stage's shape keeps the student's last move, here as in the
 * market lesson: the ghost of the curve they dragged, the change beside each
 * panel, and the chain under the stage. It used to rebuild the engine, and the
 * rebuilt one remembered none of them. See the market lesson's test of the same
 * name for the history.
 */
test('a change of shape keeps the last move: its ghost, its deltas and its chain', async ({ page }) => {
    await toTheEnd(page);
    await expect(page.locator('[data-role="strip"]')).toHaveCount(1);
    const curves = await page.locator(RENDERED.visibleCurve).count();

    await dragSideways(page, 'down', 60);
    const strip = page.locator('[data-kind]');
    await expect(strip).toHaveAttribute('data-kind', 'settled');
    // A ghost in each panel: the market's demand for A$ and, linked to it, the
    // mirror's supply of US$.
    const ghosted = await page.locator(RENDERED.visibleCurve).count();
    expect(ghosted).toBeGreaterThan(curves);
    const chips = [await caption(page, 'market').innerText(), await caption(page, 'mirror').innerText()];
    expect(chips[0]).toContain('▲');
    expect(chips[1]).toContain('▼');
    const chain = await strip.locator('[data-chain]').textContent();
    expect(chain).toContain('demand for A$ shifts to the right');
    await page.locator('.kg-container svg').evaluate(el => el.setAttribute('data-witness', '1'));

    const remembered = async (where: string) => {
        // Longer than a resize takes to reach the diagram.
        await page.evaluate(() => new Promise<void>(resolve => {
            let left = 10;
            const tick = () => (--left > 0 ? requestAnimationFrame(tick) : resolve());
            requestAnimationFrame(tick);
        }));
        await expect(page.locator(RENDERED.visibleCurve), `${where}: the ghosts`).toHaveCount(ghosted);
        expect([await caption(page, 'market').innerText(), await caption(page, 'mirror').innerText()],
            `${where}: the deltas`).toEqual(chips);
        await expect(strip, `${where}: the strip`).toHaveAttribute('data-kind', 'settled');
        expect(await strip.locator('[data-chain]').textContent(), `${where}: the chain`).toBe(chain);
        await expect(page.locator('.kg-container svg[data-witness="1"]'), `${where}: the same diagram`).toHaveCount(1);
    };

    // Across the filmstrip breakpoint, as the navbar's second column folds away.
    await page.getByRole('button', { name: 'Hide links' }).click();
    await expect(page.locator('[data-role="rail"]')).toHaveCount(1);
    await remembered('navbar folded, rail');

    // And a change of proportions that crosses nothing.
    await page.setViewportSize({ width: 1440, height: 760 });
    await expect(page.locator('[data-role="rail"]')).toHaveCount(1);
    await remembered('a shorter window');
});

test('no text on the stage lands on other text', async ({ page }) => {
    await toTheEnd(page);
    await page.getByRole('tab', { name: 'Scenarios' }).click();

    for (const arrangement of ['Focus', 'Grid']) {
        await page.getByText(arrangement, { exact: true }).click();
        for (const scenario of ['Back to A$1 = US$0.65', 'Iron ore prices soar', 'Australians holiday abroad']) {
            // Exact: a progress marker is named by its step's title, and a
            // title could share words with a scenario.
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

    // Choosing a lesson puts the list away, and the rail's toggle brings it back.
    await expect(page.getByRole('link', { name: 'Exchange rates (A$)' })).toBeHidden();
    await page.getByRole('button', { name: 'Show links' }).click();
    await expect(page.getByRole('link', { name: 'Exchange rates (A$)' })).toBeVisible();

    await page.goBack();
    await expect(page.getByRole('heading', { name: 'The Australian dollar, and what moves it' })).toBeVisible();
});

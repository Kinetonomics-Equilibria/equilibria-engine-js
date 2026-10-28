import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { arrange, test, textCollisions } from './helpers';

/**
 * The Air Jordans lesson, in a real browser.
 *
 * What only a browser can say: that the two charts, one buyer's and the
 * market's, draw without an error, and that their words — P on two price
 * axes, Q_d, D and D₀ beside each other, the captions — never land on one
 * another wherever the lesson's scenarios put the price and the curve.
 */

/**
 * Through the lesson and out of it, into the playground and the whole diagram.
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

test.beforeEach(async ({ page }) => {
    await page.goto('/lessons/demand');
});

test('opens the Air Jordans lesson from its address, without an error', async ({ page, pageErrors }) => {
    await expect(page.getByRole('heading', { name: 'Air Jordans, and what shifts demand' })).toBeVisible();
    await page.getByRole('button', { name: 'Start lesson' }).click();
    await expect(page.getByText('Your first pair', { exact: true })).toBeVisible();
    expect(pageErrors).toEqual([]);
});

test('no text on the stage lands on other text', async ({ page }) => {
    await toTheEnd(page);
    await page.getByRole('tab', { name: 'Scenarios' }).click();

    for (const arrangement of ['Focus', 'Grid'] as const) {
        await arrange(page, arrangement);
        for (const scenario of ['Back to the start', 'Part-time shifts dry up', 'Wages rise', 'Nike takes $50 off']) {
            // Exact: a progress marker is named by its step's title, and a
            // title could share words with a scenario.
            await page.getByRole('button', { name: scenario, exact: true }).click();
            await expect.poll(() => textCollisions(page), { message: `${arrangement}, ${scenario}` }).toEqual([]);
        }
    }
});

/**
 * Each of the student's pairs arrives at its step: the point pops in, then its
 * droplines are drawn out from it to the axes.
 *
 * Every other check asks for less motion, so it sees each pair land in one
 * frame. These ask for motion back, and sample in the page a frame at a time,
 * since anything read back through Playwright arrives a few frames late.
 */
test.describe('with motion', () => {
    test.use({ contextOptions: { reducedMotion: 'no-preference' } });

    test('a pair pops in at its step, and its droplines are drawn out from it', async ({ page, pageErrors }) => {
        await page.getByRole('button', { name: 'Start lesson' }).click();
        await expect(page.getByText('Your first pair', { exact: true })).toBeVisible();

        const frames = await page.evaluate(() => new Promise<{ r: number; lengths: number[] }[]>(resolve => {
            const seen: { r: number; lengths: number[] }[] = [];
            // The dotted lines on screen: the newest pair's droplines, and
            // nothing else this early in the lesson.
            const droplines = () => Array.from(document.querySelectorAll<SVGLineElement>('line[class^="line-"]'))
                .filter(l => (l.closest('g') as SVGGElement).style.display !== 'none'
                    && l.style.strokeDasharray.startsWith('0'))
                .map(l => Math.hypot(+l.getAttribute('x2')! - +l.getAttribute('x1')!,
                    +l.getAttribute('y2')! - +l.getAttribute('y1')!));
            const begun = performance.now();
            Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Next')!.click();
            // Found by its title once the step has drawn it: a point not yet
            // on the chart has not been given one.
            const pair = Array.from(document.querySelectorAll('circle'))
                .find(c => (c.querySelector('title')?.textContent || '').startsWith('Pair 2,'))!;
            requestAnimationFrame(function sample(now) {
                seen.push({ r: +pair.getAttribute('r')!, lengths: droplines() });
                if (now - begun < 800) requestAnimationFrame(sample);
                else resolve(seen);
            });
        }));

        const first = frames[0], last = frames[frames.length - 1];
        const radii = frames.map(f => Math.round(f.r * 10) / 10);
        expect(first.r, `radii: ${radii}`).toBeLessThan(last.r);
        expect(frames.some(f => f.r > first.r && f.r < last.r), `radii: ${radii}`).toBe(true);

        // Both droplines, starting at the point and ending at the axes.
        expect(last.lengths).toHaveLength(2);
        expect(first.lengths).toEqual([0, 0]);
        const drawing = frames.filter(f => f.lengths.every((length, i) => length > 0 && length < last.lengths[i]));
        expect(drawing.length, `lengths: ${frames.map(f => f.lengths.map(Math.round).join('/'))}`).toBeGreaterThan(0);
        expect(pageErrors).toEqual([]);
    });

    // A link to a step, or the view put back after a remount, is not the
    // student moving through the lesson: everything is simply there.
    test('a link to a step draws its pair in place', async ({ page }) => {
        await page.addInitScript(() => {
            const radii: string[] = [];
            (window as any).pairRadii = radii;
            requestAnimationFrame(function watch() {
                const pair = Array.from(document.querySelectorAll('circle'))
                    .find(c => (c.querySelector('title')?.textContent || '').startsWith('Pair 2,'));
                if (pair && (pair.closest('g') as SVGGElement).style.display !== 'none') {
                    radii.push(pair.getAttribute('r')!);
                }
                requestAnimationFrame(watch);
            });
        });
        await page.goto('/lessons/demand?step=2');
        await expect(page.getByText('Your second pair', { exact: true })).toBeVisible();
        await page.waitForTimeout(800);

        const radii: string[] = await page.evaluate(() => (window as any).pairRadii);
        expect(radii.length).toBeGreaterThan(0);
        expect(new Set(radii)).toEqual(new Set([radii[radii.length - 1]]));
    });
});

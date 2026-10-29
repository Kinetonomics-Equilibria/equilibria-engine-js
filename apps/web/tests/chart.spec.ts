import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { test } from './helpers';

/**
 * The chart holds still (docs/chart-design.md, principle 5): its axes cover
 * the whole range the sliders can reach, and a label stays on the plot across
 * all of it. "Labels on the plot" says so of every curve's label, and
 * "Annotations" of every word drawn on the plot.
 *
 * The one rule in the doc that needs an engine: where a label lands is the
 * engine's sum, in pixels, from a position the config gives as a calc. So
 * each model is opened in its playground, which draws everything the model
 * has — what its lesson's last step draws — and each param a student can move
 * is taken to each end of its range in turn, with every panel brought to the
 * front to be read. One param at a time, not every corner at once: the café
 * lets two params at the top together run its curve off the axes, and says
 * so beside its config.
 *
 * The models are listed here because a spec cannot import a lesson (they
 * import their pictures); `chartRules.test.ts` holds this list to the models
 * there are.
 */
const MODELS = ['cafe', 'air-jordans', 'plane-tickets', 'market', 'canteen', 'aud'];

/** Two frames: the engine has redrawn for the param, and the labels are placed. */
const settled = (page: Page) =>
    page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));

/**
 * Every label in the panel at the front that is off its plot, by what it says.
 *
 * The plot is the panel's clip rectangle, which is exactly the region the
 * engine draws curves into. A label is on it when its box is inside it. The
 * two exceptions sit on an axis by design: an axis title, and a dropline's
 * label among the tick numbers, which is in the band just past the plot's
 * left or bottom edge and within that axis's length.
 */
const offThePlot = (page: Page) => page.evaluate(() => {
    const svg = document.querySelector('.kg-container svg') as SVGSVGElement;
    const m = svg.getScreenCTM()!;
    const plots = [...svg.querySelectorAll('clipPath rect')].map(r => {
        const x = Number(r.getAttribute('x')), y = Number(r.getAttribute('y'));
        const w = Number(r.getAttribute('width')), h = Number(r.getAttribute('height'));
        return { left: m.a * x + m.e, top: m.d * y + m.f, right: m.a * (x + w) + m.e, bottom: m.d * (y + h) + m.f };
    });
    const area = (b: { left: number; top: number; right: number; bottom: number }) =>
        (b.right - b.left) * (b.bottom - b.top);
    const plot = plots.sort((a, b) => area(b) - area(a))[0];

    // The panel's sheet: the plot and its axes' furniture, so a label in a
    // panel on the rail is not read against the one at the front.
    const BAND_LEFT = 64, BAND_BELOW = 48, SLACK = 2;
    const inSheet = (b: DOMRect) =>
        b.right > plot.left - BAND_LEFT && b.left < plot.right + BAND_LEFT &&
        b.bottom > plot.top - BAND_BELOW && b.top < plot.bottom + BAND_BELOW;
    const onPlot = (b: DOMRect) =>
        b.left >= plot.left - SLACK && b.right <= plot.right + SLACK &&
        b.top >= plot.top - SLACK && b.bottom <= plot.bottom + SLACK;
    const onAnAxis = (b: DOMRect) => {
        const x = b.left + b.width / 2, y = b.top + b.height / 2;
        const byPrices = x >= plot.left - BAND_LEFT && x <= plot.left + SLACK && y >= plot.top && y <= plot.bottom;
        const byQuantities = y >= plot.bottom - SLACK && y <= plot.bottom + BAND_BELOW && x >= plot.left && x <= plot.right;
        return byPrices || byQuantities;
    };

    const visible = (el: Element) => {
        for (let node: Element | null = el; node && node !== document.body; node = node.parentElement) {
            const style = getComputedStyle(node);
            if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
        }
        const box = el.getBoundingClientRect();
        return box.width > 0 && box.height > 0;
    };

    return [...document.querySelectorAll('.kg-container div[class^="rootElement-"]')]
        .filter(el => !el.classList.contains('kg-axis-title') && visible(el) && (el.textContent || '').trim() !== '')
        .filter(el => inSheet(el.getBoundingClientRect()))
        .filter(el => !onPlot(el.getBoundingClientRect()) && !onAnAxis(el.getBoundingClientRect()))
        .map(el => ((el.querySelector('.katex-html') || el).textContent || '').trim().slice(0, 40));
});

/** Each panel on the rail, by the name on its promote button. */
const railPanels = async (page: Page) =>
    (await page.locator('[aria-label^="Show "]').evaluateAll(buttons =>
        buttons.map(b => b.getAttribute('aria-label')!))).filter(name => !!name);

for (const id of MODELS) {
    test(`every label in the "${id}" playground stays on the plot at both ends of every slider`, async ({ page, pageErrors }) => {
        await page.goto(`/playground/${id}`);
        const sliders = page.getByRole('tabpanel', { name: 'Explore' }).getByRole('slider');
        await expect(sliders.first()).toBeVisible();
        const names = await sliders.evaluateAll(all => all.map(s => s.getAttribute('aria-label') || ''));
        expect(names.length, 'the playground offers a slider').toBeGreaterThan(0);

        const off: string[] = [];
        for (const name of names) {
            for (const end of ['Home', 'End']) {
                // From the model as it is declared, so one param is at its end
                // and every other is where the model starts.
                await page.goto(`/playground/${id}`);
                await page.getByRole('tabpanel', { name: 'Explore' }).getByRole('slider', { name, exact: true }).focus();
                await page.keyboard.press(end);
                await settled(page);

                const read = async (panel: string) =>
                    (await offThePlot(page)).forEach(label =>
                        off.push(`${name} at its ${end === 'Home' ? 'least' : 'most'}: "${label}" in ${panel}`));
                await read('the panel at the front');
                for (const shown of await railPanels(page)) {
                    await page.locator(`[aria-label="${shown}"]`).click();
                    await settled(page);
                    await read(shown.replace(/^Show /, ''));
                }
            }
        }
        expect(off).toEqual([]);
        expect(pageErrors).toEqual([]);
    });
}

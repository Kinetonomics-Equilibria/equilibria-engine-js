import { test as base, type Locator } from '@playwright/test';

/**
 * The engine's rendered elements, by the class prefixes it names them with.
 *
 * Every view object draws twice: a visible element (`circle-<id>`, `path-<id>`)
 * and a fatter invisible one behind it (`dragCircle-`, `dragPath-`) that widens
 * the drag target. Only the first pair says anything about what a student sees,
 * so tests select on the prefix rather than counting elements.
 */
export const RENDERED = {
    point: 'svg circle[class^="circle-"]',
    curve: 'svg path[class^="path-"]'
} as const;

/**
 * A `test` that also collects whatever the page logged to console.error or threw.
 *
 * This is the failure mode a screenshot hides: the engine throws during mount,
 * the React card catches it into its error state, and the page still looks like
 * a page. Ask for `pageErrors` in a test and assert it came back empty.
 */
export const test = base.extend<{ pageErrors: string[] }>({
    pageErrors: async ({ page }, use) => {
        const errors: string[] = [];

        page.on('console', (message) => {
            if (message.type() === 'error') errors.push(message.text());
        });
        page.on('pageerror', (error) => errors.push(String(error)));

        await use(errors);
    }
});

interface TickPosition {
    value: number;
    x: number;
    y: number;
}

/**
 * Reads the centre of a rendered element back in graph coordinates.
 *
 * The engine draws in pixels, so a test that only asserts an SVG exists cannot
 * tell a diagram that solves the right system from one that solves the wrong
 * one — the gap NOTES.md blames for every econ defect that passed CI. The tick
 * labels each carry their own data value, which is enough to invert the
 * engine's scale and read a point back in the units the config was written in
 * (Q and P here), so a browser test can assert the answer and not just the
 * shape.
 */
export async function dataCoordinates(target: Locator): Promise<{ x: number; y: number }> {
    return target.evaluate((element) => {
        const centre = (node: Element) => {
            const box = node.getBoundingClientRect();
            return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        };

        // d3 renders an axis as g.axis > g.tick, where the tick's line sits
        // exactly on the value its label names — the label itself is offset.
        const axes: TickPosition[][] = [...document.querySelectorAll('g.axis')]
            .map((axis) =>
                [...axis.querySelectorAll('g.tick')].map((tick) => ({
                    value: Number(tick.textContent),
                    ...centre(tick.querySelector('line') ?? tick)
                }))
            )
            .filter((ticks) => ticks.length >= 2 && ticks.every((tick) => Number.isFinite(tick.value)));

        // The axis whose ticks march sideways measures x; the other measures y.
        const spread = (ticks: TickPosition[], along: 'x' | 'y') =>
            Math.max(...ticks.map((tick) => tick[along])) - Math.min(...ticks.map((tick) => tick[along]));
        const xAxis = axes.find((ticks) => spread(ticks, 'x') > spread(ticks, 'y'));
        const yAxis = axes.find((ticks) => spread(ticks, 'y') > spread(ticks, 'x'));
        if (!xAxis || !yAxis) {
            throw new Error('No pair of axes to read coordinates from — is the graph rendered?');
        }

        // Two ticks pin a linear scale; the extremes give the longest baseline
        // and so the least rounding error.
        const scale = (ticks: TickPosition[], along: 'x' | 'y') => {
            const sorted = [...ticks].sort((a, b) => a.value - b.value);
            const low = sorted[0];
            const high = sorted[sorted.length - 1];
            const pixelsPerUnit = (high[along] - low[along]) / (high.value - low.value);
            return (pixels: number) => low.value + (pixels - low[along]) / pixelsPerUnit;
        };

        const point = centre(element);
        return { x: scale(xAxis, 'x')(point.x), y: scale(yAxis, 'y')(point.y) };
    });
}

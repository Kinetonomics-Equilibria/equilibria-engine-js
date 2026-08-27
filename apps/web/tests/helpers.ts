import { test as base, type Locator, type Page } from '@playwright/test';

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
    curve: 'svg path[class^="path-"]',

    // The `prev` ghosts are in the DOM from the first frame — they are ordinary
    // objects whose `show` is bound to `prev.changed`, so the engine hides them with
    // display:none until the student moves something. Counting elements therefore
    // counts the ghosts too; counting *visible* ones is what says what is on screen.
    visiblePoint: 'svg circle[class^="circle-"]:visible',
    visibleCurve: 'svg path[class^="path-"]:visible'
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
 * The equilibrium point in whichever panel is focal, in graph coordinates.
 *
 * On a stage there are several panels drawing several equilibria, all against
 * the same one-canvas SVG, so "the first visible circle" is whichever panel
 * happens to be first in the DOM — not the one being read. Only the focal panel
 * carries tick labels (the rail draws at `indicator`), so the ticked axes both
 * give the scale *and* say which box to look in.
 */
export async function focalPointCoordinates(page: Page): Promise<{ x: number; y: number }> {
    return page.evaluate(() => {
        const centre = (node: Element) => {
            const box = node.getBoundingClientRect();
            return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        };

        const ticked = [...document.querySelectorAll('g.axis')]
            .map((axis) => ({
                axis,
                ticks: [...axis.querySelectorAll('g.tick')].map((tick) => ({
                    value: Number(tick.textContent),
                    ...centre(tick.querySelector('line') ?? tick)
                }))
            }))
            .filter((a) => a.ticks.length >= 2 && a.ticks.every((t) => Number.isFinite(t.value)));

        const spread = (ticks: TickPosition[], along: 'x' | 'y') =>
            Math.max(...ticks.map((t) => t[along])) - Math.min(...ticks.map((t) => t[along]));
        const xAxis = ticked.find((a) => spread(a.ticks, 'x') > spread(a.ticks, 'y'));
        const yAxis = ticked.find((a) => spread(a.ticks, 'y') > spread(a.ticks, 'x'));
        if (!xAxis || !yAxis) throw new Error('No ticked pair of axes — is a panel drawn at full detail?');

        const scale = (ticks: TickPosition[], along: 'x' | 'y') => {
            const sorted = [...ticks].sort((a, b) => a.value - b.value);
            const low = sorted[0], high = sorted[sorted.length - 1];
            const pixelsPerUnit = (high[along] - low[along]) / (high.value - low.value);
            return (pixels: number) => low.value + (pixels - low[along]) / pixelsPerUnit;
        };
        const toX = scale(xAxis.ticks, 'x'), toY = scale(yAxis.ticks, 'y');

        // The focal panel's box, from the two axes that frame it.
        const xBox = xAxis.axis.getBoundingClientRect(), yBox = yAxis.axis.getBoundingClientRect();
        const inside = (p: { x: number; y: number }) =>
            p.x >= yBox.x - 4 && p.x <= xBox.x + xBox.width + 4 &&
            p.y >= yBox.y - 4 && p.y <= yBox.y + yBox.height + 4;

        const point = [...document.querySelectorAll('svg circle[class^="circle-"]')]
            .map(centre)
            .find(inside);
        if (!point) throw new Error('No point drawn inside the focal panel');

        return { x: toX(point.x), y: toY(point.y) };
    });
}

/**
 * Which drag hit-area belongs to the focal panel.
 *
 * Every panel draws its own, and the first in DOM order belongs to whichever
 * panel the author declared first — not to the one on the stage. Dragging the
 * wrong one lands on a rail panel's promote button and silently promotes it
 * instead, which looks exactly like a drag that did nothing.
 */
export async function focalDragPathIndex(page: Page): Promise<number> {
    return page.evaluate(() => {
        const ticked = [...document.querySelectorAll('g.axis')]
            .filter((axis) => axis.querySelectorAll('g.tick').length >= 2)
            .map((axis) => axis.getBoundingClientRect());
        if (ticked.length === 0) throw new Error('No panel is drawn at full detail');

        const left = Math.min(...ticked.map((b) => b.x)),
            top = Math.min(...ticked.map((b) => b.y)),
            right = Math.max(...ticked.map((b) => b.x + b.width)),
            bottom = Math.max(...ticked.map((b) => b.y + b.height));

        const paths = [...document.querySelectorAll('.kg-container path[class^="dragPath"]')];
        const index = paths.findIndex((p) => {
            const b = p.getBoundingClientRect();
            const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
            return cx >= left && cx <= right && cy >= top && cy <= bottom;
        });
        if (index === -1) throw new Error('No drag target inside the focal panel');
        return index;
    });
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

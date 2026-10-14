import { describe, it, expect } from 'vitest';
import {
    arrange, toCustomLayout, pixelBox, revealedCount,
    FILMSTRIP_BELOW_PX, FOCUS_PARAM, FURNITURE, MODE_PARAM, MODE_VALUE, REVEALED_PARAM
} from '../arrangement';
import type { ArrangeInput } from '../arrangement';

/**
 * The arrangement arithmetic, with no DOM in sight.
 *
 * This is the file the whole focus-and-rail design rests on: every claim the
 * layout discussion made — a readable focal square, a rail small enough to fit
 * beside it and large enough to recognise — is a claim about these numbers. It
 * is tested without React on purpose, because a layout bug found by looking at
 * a browser is a layout bug found late.
 *
 * The assertions are mostly on *properties* rather than on exact pixels. The
 * constants are design choices and will be tuned; that the focal panel is
 * square, that nothing leaves the canvas, and that a promotion is a swap and
 * not a reshuffle, are not.
 */

const KEYS = ['market', 'firm', 'cost', 'welfare'];

/** A laptop stage: 1280x800 less the app's navbar and page chrome. */
const STAGE = { width: 900, height: 714 };

/** Every panel's box in pixels, for an arrangement made at `STAGE`. */
function boxes(a: any) {
    const out: any = {};
    a.panels.forEach((p: any) => { out[p.key] = pixelBox(a, p.key, STAGE.width) });
    return out;
}

const isSquare = (b: any) => Math.abs(b.width - b.height) < 0.5;

describe('focus and rail', () => {

    const a = arrange({ ...STAGE, panels: KEYS, focused: 'market' });
    const b = boxes(a);

    it('gives the focal panel a square', () => {
        expect(isSquare(b.market)).toBe(true);
    });

    it('makes the focal panel readable and the rail panels recognisable', () => {
        // The numbers the layout discussion assumed: a focal panel in the 600s
        // and rail panels around 190. Both are consequences of the constants at
        // the top of arrangement.ts, so this is a pin on the design, not a law.
        expect(b.market.width).toBeGreaterThan(600);
        expect(b.firm.width).toBeGreaterThan(140);
        expect(b.firm.width).toBeLessThan(240);
    });

    it('gives every rail panel the same size', () => {
        expect(b.cost.width).toBeCloseTo(b.firm.width, 6);
        expect(b.welfare.height).toBeCloseTo(b.firm.height, 6);
    });

    it('stacks the rail down the right of the focal panel', () => {
        expect(b.firm.x).toBeGreaterThan(b.market.x + b.market.width);
        expect(b.cost.y).toBeGreaterThan(b.firm.y);
        expect(b.welfare.y).toBeGreaterThan(b.cost.y);
    });

    it('keeps the rail in the author\'s declared order', () => {
        expect(a.panels.map((p: any) => p.key)).toEqual(KEYS);
    });

    it('never puts a panel outside the canvas', () => {
        a.panels.forEach((p: any) => {
            expect(p.x).toBeGreaterThanOrEqual(0);
            expect(p.y).toBeGreaterThanOrEqual(0);
            expect(p.x + p.width).toBeLessThanOrEqual(1);
            expect(p.y + p.height).toBeLessThanOrEqual(1);
        });
    });

    it('takes its aspect ratio from the stage box', () => {
        expect(a.aspectRatio).toBeCloseTo(STAGE.width / STAGE.height, 6);
    });
});

describe('promotion swaps two panels and leaves the rest alone', () => {

    const before = boxes(arrange({ ...STAGE, panels: KEYS, focused: 'market' }));
    const after = boxes(arrange({ ...STAGE, panels: KEYS, focused: 'firm' }));

    it('the promoted panel takes the focal box', () => {
        expect(after.firm).toEqual(before.market);
    });

    it('the demoted panel takes the promoted one\'s rail slot', () => {
        expect(after.market).toEqual(before.firm);
    });

    it('the panels that moved in neither direction do not move', () => {
        // The rail is ordered by the author's declaration with the focal panel
        // removed, so promoting the *first* rail panel is a straight exchange.
        // This is what makes a promotion read as two panels trading places
        // rather than as the whole rail reshuffling.
        expect(after.cost).toEqual(before.cost);
        expect(after.welfare).toEqual(before.welfare);
    });
});

describe('grid', () => {

    const a = arrange({ ...STAGE, panels: KEYS, mode: 'grid' });
    const b = boxes(a);

    it('gives four panels four equal cells', () => {
        const sizes = KEYS.map(k => Math.round(b[k].width));
        expect(new Set(sizes).size).toBe(1);
    });

    it('lays them out two by two', () => {
        expect(b.firm.x).toBeGreaterThan(b.market.x);
        expect(b.cost.y).toBeGreaterThan(b.market.y);
        expect(b.cost.x).toBeCloseTo(b.market.x, 6);
        expect(b.welfare.x).toBeCloseTo(b.firm.x, 6);
    });

    it('makes every cell bigger than a rail panel and smaller than the focal one', () => {
        const focus = boxes(arrange({ ...STAGE, panels: KEYS, focused: 'market' }));
        expect(b.market.width).toBeGreaterThan(focus.firm.width);
        expect(b.market.width).toBeLessThan(focus.market.width);
    });

    it('ignores which panel was focused', () => {
        const other = arrange({ ...STAGE, panels: KEYS, mode: 'grid', focused: 'welfare' });
        expect(other.panels).toEqual(a.panels);
    });
});

/**
 * The grid's shape is chosen, not assumed.
 *
 * Three panels used to come out two by two whatever the stage looked like: an
 * empty cell, slack either side of every square, and rows too short for the tick
 * labels between them — on a stage that would have held three larger panels in
 * a row.
 */
describe('the grid takes the shape that holds the largest panels', () => {

    const THREE = ['a', 'b', 'c'];

    it('lays three panels out in one row on a wide stage', () => {
        const a = arrange({ width: 1016, height: 607, panels: THREE, mode: 'grid' });
        const [first, second, third] = THREE.map(k => pixelBox(a, k, 1016)!);

        expect(second.y).toBeCloseTo(first.y, 6);
        expect(third.y).toBeCloseTo(first.y, 6);
        expect(second.x).toBeGreaterThan(first.x + first.width);

        // And larger than the two-by-two they used to get.
        const cell = (1016 * (1 - 2 * 0.018) - 0.018 * 1016) / 2,
            row = ((607 - 2 * 0.018 * 1016) - 0.018 * 1016) / 2;
        expect(first.width).toBeGreaterThan(Math.min(cell, row));
    });

    it('and two by two on a square one, where a row would be thinner', () => {
        const a = arrange({ width: 800, height: 800, panels: THREE, mode: 'grid' });
        const [first, second, third] = THREE.map(k => pixelBox(a, k, 800)!);

        expect(second.y).toBeCloseTo(first.y, 6);
        expect(third.y).toBeGreaterThan(first.y + first.height);
    });
});

/**
 * What each panel is, and the detail it draws at.
 *
 * The level follows the role. It used to follow the size, which was the same
 * thing until the grid made a panel that is read the size of a panel that is
 * only recognised.
 */
describe('roles and levels', () => {

    it('draws the focal panel in full and the rail as glyphs', () => {
        const a = arrange({ ...STAGE, panels: KEYS, focused: 'firm' });
        expect(a.panels.map(p => [p.key, p.role, p.level])).toEqual([
            ['market', 'rail', 'indicator'],
            ['firm', 'focal', 'full'],
            ['cost', 'rail', 'indicator'],
            ['welfare', 'rail', 'indicator']
        ]);
    });

    it('calls the panels under the focal one a strip, below the breakpoint', () => {
        const a = arrange({ width: FILMSTRIP_BELOW_PX - 100, height: 900, panels: KEYS });
        expect(a.panels.map(p => p.role)).toEqual(['focal', 'strip', 'strip', 'strip']);
    });

    // Small enough that `auto` would have drawn every cell as a glyph.
    it('never draws a grid cell as a glyph, however small, since the grid is for reading', () => {
        const a = arrange({ width: 500, height: 400, panels: KEYS, mode: 'grid' });
        a.panels.forEach(p => {
            expect(p.role).toBe('grid');
            expect(p.level).toBe('compact');
        });
    });

    it('draws a grid cell in full once it is big enough with its axis titles\' room taken out', () => {
        const a = arrange({ width: 2000, height: 1000, panels: ['a', 'b'], mode: 'grid', furniture: FURNITURE });
        a.panels.forEach(p => expect(p.level).toBe('full'));
        expect(pixelBox(a, 'a', 2000)!.width).toBeGreaterThanOrEqual(420);
    });

    // A lone panel is the whole stage in either mode, and the stage is where
    // the student works — so nothing may be laid across it.
    it('makes a lone panel focal in the grid too', () => {
        const a = arrange({ ...STAGE, panels: ['only'], mode: 'grid' });
        expect(a.panels[0].role).toBe('focal');
        expect(a.panels[0].level).toBe('full');
    });
});

/**
 * Room: pixels kept clear outside a panel, for what is drawn there.
 *
 * Tick labels and axis titles are drawn outside a panel's box at fixed pixel
 * offsets, and so is the app's chrome. The gutters between panels were a
 * fraction of the canvas, which came to 18px on a laptop, and the grid's rows
 * overlapped: one row's tick labels, the next row's caption and its top tick
 * label in the same band.
 */
describe('room', () => {

    const CHROME = { focal: { top: 28 }, grid: { top: 28 }, rail: { bottom: 46 }, strip: { right: 150 } };

    it('keeps one grid row\'s tick labels and the next row\'s caption apart', () => {
        const a = arrange({ width: 900, height: 900, panels: KEYS, mode: 'grid', chrome: CHROME, furniture: FURNITURE });
        const upper = pixelBox(a, 'market', 900)!, lower = pixelBox(a, 'cost', 900)!,
            level = a.panels[0].level;

        expect(lower.y - (upper.y + upper.height))
            .toBeGreaterThanOrEqual(FURNITURE[level].bottom + CHROME.grid.top + FURNITURE[level].top);
    });

    it('keeps the focal panel\'s axis title off the strip under it', () => {
        const a = arrange({ width: 736, height: 563, panels: KEYS.slice(0, 3), chrome: CHROME, furniture: FURNITURE });
        const focal = pixelBox(a, 'market', 736)!, strip = pixelBox(a, 'firm', 736)!;

        expect(strip.y - (focal.y + focal.height)).toBeGreaterThanOrEqual(FURNITURE.full.bottom);
    });

    it('keeps a rail panel\'s caption clear of the panel under it', () => {
        const a = arrange({ ...STAGE, panels: KEYS, chrome: CHROME, furniture: FURNITURE });
        const firm = pixelBox(a, 'firm', STAGE.width)!, cost = pixelBox(a, 'cost', STAGE.width)!;

        expect(cost.y - (firm.y + firm.height)).toBeGreaterThanOrEqual(CHROME.rail.bottom);
    });

    it('keeps the strip\'s captions beside each panel, inside the stage', () => {
        const width = 736;
        const a = arrange({ width: width, height: 563, panels: KEYS.slice(0, 3), chrome: CHROME, furniture: FURNITURE });
        const last = pixelBox(a, 'cost', width)!;

        expect(last.x + last.width + CHROME.strip.right).toBeLessThanOrEqual(width);
    });

    // Room is pixels, so it is the one input that does not scale: the same
    // forty pixels are a smaller share of a larger stage.
    it('takes a smaller share of a larger stage', () => {
        const small = arrange({ width: 900, height: 714, panels: KEYS, furniture: FURNITURE });
        const large = arrange({ width: 1800, height: 1428, panels: KEYS, furniture: FURNITURE });

        expect(large.panels[0].width).toBeGreaterThan(small.panels[0].width);
    });

    it('changes nothing when none is asked for', () => {
        expect(arrange({ ...STAGE, panels: KEYS, chrome: {} })).toEqual(arrange({ ...STAGE, panels: KEYS }));
    });
});

describe('below the filmstrip breakpoint', () => {

    const narrow = { width: FILMSTRIP_BELOW_PX - 100, height: 900 };
    const a = arrange({ ...narrow, panels: KEYS, focused: 'market' });

    function narrowBoxes() {
        const out: any = {};
        a.panels.forEach((p: any) => { out[p.key] = pixelBox(a, p.key, narrow.width) });
        return out;
    }

    it('lays the rail out under the focal panel instead of beside it', () => {
        const b = narrowBoxes();
        expect(b.firm.y).toBeGreaterThan(b.market.y + b.market.height);
        expect(b.cost.x).toBeGreaterThan(b.firm.x);
        expect(b.cost.y).toBeCloseTo(b.firm.y, 6);
    });

    it('keeps the focal panel square', () => {
        expect(isSquare(narrowBoxes().market)).toBe(true);
    });

    it('still fits inside the canvas', () => {
        a.panels.forEach((p: any) => {
            expect(p.x + p.width).toBeLessThanOrEqual(1);
            expect(p.y + p.height).toBeLessThanOrEqual(1);
        });
    });

    it('switches at the breakpoint and not before', () => {
        const wide = arrange({ width: FILMSTRIP_BELOW_PX, height: 700, panels: KEYS, focused: 'market' });
        const wideBoxes: any = {};
        wide.panels.forEach((p: any) => { wideBoxes[p.key] = pixelBox(wide, p.key, FILMSTRIP_BELOW_PX) });
        expect(wideBoxes.firm.x).toBeGreaterThan(wideBoxes.market.x + wideBoxes.market.width);
    });
});

describe('degenerate inputs', () => {

    it('places a single panel over the whole stage', () => {
        const a = arrange({ ...STAGE, panels: ['only'] });
        const b = pixelBox(a, 'only', STAGE.width)!;
        expect(isSquare(b)).toBe(true);
        // The whole stage less its padding, which is a fraction of the width.
        expect(b.height).toBeCloseTo(STAGE.height - 2 * 0.018 * STAGE.width, 4);
    });

    it('returns an empty arrangement rather than throwing on no panels', () => {
        const a = arrange({ ...STAGE, panels: [] });
        expect(a.panels).toEqual([]);
        expect(a.aspectRatio).toBeCloseTo(STAGE.width / STAGE.height, 6);
    });

    it('falls back to the first panel when the focused key is not one of them', () => {
        const a = arrange({ ...STAGE, panels: KEYS, focused: 'nonesuch' });
        expect(a.focused).toBe('market');
        expect(a.panels).toEqual(arrange({ ...STAGE, panels: KEYS, focused: 'market' }).panels);
    });

    it('survives a stage with no area', () => {
        const a = arrange({ width: 0, height: 0, panels: KEYS });
        a.panels.forEach((p: any) => {
            expect(Number.isFinite(p.x)).toBe(true);
            expect(p.width).toBeGreaterThanOrEqual(0);
        });
    });
});

// --- the compiled layout ---------------------------------------------------------

describe('every arrangement compiles into one layout', () => {

    const layout = toCustomLayout({ ...STAGE, panels: KEYS });

    it('declares the three params the expressions read', () => {
        expect(layout.params.map(p => p.name)).toEqual([FOCUS_PARAM, MODE_PARAM, REVEALED_PARAM]);
        expect(layout.params[0].max).toBe(KEYS.length - 1);
    });

    // So a host that never mentions reveal gets the arrangement it always got.
    it('starts with every panel arrived', () => {
        const arrived = layout.params.filter(p => p.name === REVEALED_PARAM)[0];
        expect(arrived.value).toBe(KEYS.length);
        expect(arrived.min).toBe(1);
        expect(arrived.max).toBe(KEYS.length);
    });

    it('declares them as presentation, so a promotion is not a student action', () => {
        // `prev.changed` gates every ghost in a diagram. Promoting a panel is
        // the host rearranging the screen, not the student moving a curve.
        expect(layout.params.every(p => p.presentation)).toBe(true);
    });

    it('gives every panel an expression rather than a number', () => {
        layout.panels.forEach(p => {
            expect(typeof p.x).toBe('string');
            expect(p.x).toContain(`params.${FOCUS_PARAM}`);
            expect(p.x).toContain(`params.${MODE_PARAM}`);
        });
    });

    // The state the params start in: every panel arrived, the first one focal.
    it('starts each panel at the level its role draws at', () => {
        expect(layout.panels.map(p => p.density)).toEqual(['full', 'indicator', 'indicator', 'indicator']);
    });

    it('keeps the panels in declared order, so a key indexes the focus param', () => {
        expect(layout.panels.map(p => p.key)).toEqual(KEYS);
    });

    /**
     * The point of the whole exercise: the expressions have to agree with
     * `arrange` for every state, because the chrome is positioned from one and
     * the diagram is drawn from the other. Evaluated here the way mathjs would,
     * with a scope rather than by string comparison.
     */
    const evaluate = (expr: string, scope: { [k: string]: number }) => {
        const body = expr.replace(
            new RegExp(`params\\.(${FOCUS_PARAM}|${MODE_PARAM}|${REVEALED_PARAM})`, 'g'), 's.$1');
        // eslint-disable-next-line no-new-func
        return Function('s', `return ${body}`)(scope) as number;
    };

    const agrees = (input: ArrangeInput) => {
        const compiled = toCustomLayout(input);
        KEYS.forEach(function (_, i) {
            const arrived = i + 1;
            (['focus', 'grid'] as const).forEach(function (mode) {
                KEYS.forEach(function (focused, focusIndex) {
                    const expected = arrange({
                        ...input, panels: KEYS.slice(0, arrived), focused: focused, mode: mode
                    });
                    const scope = {
                        [FOCUS_PARAM]: focusIndex,
                        [MODE_PARAM]: MODE_VALUE[mode],
                        [REVEALED_PARAM]: arrived
                    };

                    expected.panels.forEach(function (want) {
                        const p = compiled.panels.filter(e => e.key === want.key)[0];
                        (['x', 'y', 'width', 'height'] as const).forEach(function (prop) {
                            expect(evaluate(p[prop], scope)).toBeCloseTo(want[prop], 5);
                        });
                    });
                });
            });
        });
    };

    it('resolves to exactly what arrange() computed, in every state', () => {
        agrees({ ...STAGE, panels: KEYS });
    });

    // Room is the one input that makes the fractions depend on more than the
    // shape, so it is the one most likely to reach one side and not the other.
    it('and still does with room kept for chrome and furniture', () => {
        agrees({
            ...STAGE, panels: KEYS, furniture: FURNITURE,
            chrome: { focal: { top: 28 }, grid: { top: 28 }, rail: { bottom: 46 }, strip: { right: 150 } }
        });
    });

    /**
     * A panel the lesson has not reached is parked on the focal panel's box.
     *
     * Where it sits is arbitrary — everything in it is hidden by the step that
     * will reveal it — but *which* arbitrary answer matters. A zero-extent rect
     * collapses the panel's scales, and a box outside the canvas is drawn
     * outside the canvas, since the engine's svg is `overflow: visible`.
     */
    it('parks a panel that has not arrived on the focal box', () => {
        const scope = { [FOCUS_PARAM]: 0, [MODE_PARAM]: MODE_VALUE.focus, [REVEALED_PARAM]: 2 };
        const boxAt = (key: string) => (['x', 'y', 'width', 'height'] as const)
            .map(prop => evaluate(layout.panels.filter(p => p.key === key)[0][prop], scope));

        expect(boxAt('cost')).toEqual(boxAt('market'));
        expect(boxAt('welfare')).toEqual(boxAt('market'));
        expect(boxAt('firm')).not.toEqual(boxAt('market'));
    });

    // Three params index these expressions and most rects do not vary with all
    // three. Emitting the ternary anyway triples the length of something mathjs
    // re-evaluates on every param change, which is the drag path.
    it('does not test a param the answer does not depend on', () => {
        const one = toCustomLayout({ ...STAGE, panels: ['only'] });
        expect(one.panels[0].x).not.toContain('?');
    });

});

/**
 * How many panels have arrived, from the set a host says are revealed.
 *
 * A count rather than a set because the compiled expressions index prefixes.
 * A set with a gap has to resolve to something; this is where that is decided,
 * so the chrome and the diagram cannot decide it differently.
 */
describe('revealedCount', () => {

    it('is every panel when the host says nothing', () => {
        expect(revealedCount(KEYS)).toBe(KEYS.length);
    });

    it('counts a prefix', () => {
        expect(revealedCount(KEYS, ['market', 'firm'])).toBe(2);
    });

    it('counts to the last revealed panel, gaps included', () => {
        expect(revealedCount(KEYS, ['market', 'cost'])).toBe(3);
    });

    it('never falls below one, so a stage always has something to place', () => {
        expect(revealedCount(KEYS, [])).toBe(1);
    });
});

describe('the arrangement depends on the stage\'s shape, not its size', () => {

    it('gives identical fractions for two stages of the same shape', () => {
        const small = arrange({ width: 900, height: 714, panels: KEYS, focused: 'market' });
        const large = arrange({ width: 1800, height: 1428, panels: KEYS, focused: 'market' });

        expect(large.panels).toEqual(small.panels);
    });

    it('gives different fractions for a different shape', () => {
        const wide = arrange({ width: 1400, height: 700, panels: KEYS, focused: 'market' });
        const tall = arrange({ width: 900, height: 714, panels: KEYS, focused: 'market' });

        expect(wide.panels).not.toEqual(tall.panels);
    });

    /**
     * This is what the property is *for*: a `CustomLayout`'s fractions are
     * computed for one canvas shape, so anything that changes them means a new
     * config and a rebuilt diagram. Being scale-free means a resize that keeps
     * the shape costs nothing at all.
     */
    it('so a stage that only scales needs no new layout', () => {
        const small = toCustomLayout({ width: 900, height: 714, panels: KEYS });
        const large = toCustomLayout({ width: 1800, height: 1428, panels: KEYS });

        expect(large.panels).toEqual(small.panels);
    });
});

describe('pixelBox', () => {

    it('scales with the container, so a resize needs no new arrangement', () => {
        const a = arrange({ ...STAGE, panels: KEYS, focused: 'market' });
        const small = pixelBox(a, 'market', 450)!;
        const large = pixelBox(a, 'market', 900)!;

        expect(large.width).toBeCloseTo(small.width * 2, 6);
        expect(large.y).toBeCloseTo(small.y * 2, 6);
    });

    it('returns null for a key that is not in the arrangement', () => {
        const a = arrange({ ...STAGE, panels: KEYS });
        expect(pixelBox(a, 'nonesuch', 900)).toBeNull();
    });
});

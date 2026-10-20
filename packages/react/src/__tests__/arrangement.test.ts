import { describe, it, expect } from 'vitest';
import { densityIndex } from 'equilibria-engine-js';
import {
    arrange, layoutParams, rectParamName, toCustomLayout, pixelBox, revealedCount,
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

/**
 * Each panel's slot: the share it was given, before its square was fitted.
 *
 * A host drawing a card behind a panel needs to know how far the card can go,
 * and the answer is arithmetic only this file does. What has to hold is that a
 * slot holds its panel *and* the room kept around it, and that no two overlap.
 */
describe('slots', () => {

    const CHROME = {
        focal: { top: 40 }, grid: { top: 40 }, rail: { top: 60 }, strip: { right: 150 }, shelf: { top: 76 }
    };
    const ARRANGEMENTS = [
        { name: 'focus and rail', input: { ...STAGE } },
        { name: 'filmstrip', input: { width: 736, height: 563 } },
        { name: 'shelf', input: { width: 356, height: 599 } },
        { name: 'grid', input: { ...STAGE, mode: 'grid' as const } }
    ];

    it('names each arrangement truly', () => {
        ARRANGEMENTS.forEach(({ name, input }) => {
            const a = arrange({ ...input, panels: KEYS, chrome: CHROME, furniture: FURNITURE });
            const small = a.panels.filter(p => p.role !== 'focal').map(p => p.role);
            const expected = { 'focus and rail': 'rail', filmstrip: 'strip', shelf: 'shelf', grid: 'grid' }[name];
            small.forEach(role => expect(role, name).toBe(expected));
        });
    });

    ARRANGEMENTS.forEach(({ name, input }) => {
        const a = arrange({ ...input, panels: KEYS, chrome: CHROME, furniture: FURNITURE });
        const h = 1 / a.aspectRatio;

        it(`holds each panel and its room, in ${name}`, () => {
            a.panels.forEach(p => {
                const chrome = (CHROME as any)[p.role], furniture = FURNITURE[p.level];
                const room = (side: 'top' | 'right' | 'bottom' | 'left') =>
                    ((chrome[side] || 0) + furniture[side]) / input.width;
                const eps = 1e-9;

                expect(p.x - room('left')).toBeGreaterThanOrEqual(p.slot.x - eps);
                expect(p.x + p.width + room('right')).toBeLessThanOrEqual(p.slot.x + p.slot.width + eps);
                expect((p.y - p.slot.y) * h).toBeGreaterThanOrEqual(room('top') - eps);
                expect((p.slot.y + p.slot.height - p.y - p.height) * h).toBeGreaterThanOrEqual(room('bottom') - eps);
            });
        });

        it(`gives no two panels overlapping slots, in ${name}`, () => {
            const s = a.panels.map(p => p.slot);
            for (let i = 0; i < s.length; i++) {
                for (let j = i + 1; j < s.length; j++) {
                    const apart = s[i].x + s[i].width <= s[j].x || s[j].x + s[j].width <= s[i].x ||
                        s[i].y + s[i].height <= s[j].y || s[j].y + s[j].height <= s[i].y;
                    expect(apart, `${a.panels[i].key} and ${a.panels[j].key}`).toBe(true);
                }
            }
        });
    });

    // A lone rail panel used to be centred in the whole height of the rail,
    // floating half way down beside a focal panel that starts at the top.
    it('packs the rail from the top, level with the focal panel', () => {
        const a = arrange({ ...STAGE, panels: KEYS.slice(0, 2), chrome: CHROME, furniture: FURNITURE });
        const [focal, rail] = a.panels;

        expect(rail.role).toBe('rail');
        expect(rail.slot.y).toBeCloseTo(focal.slot.y, 9);
        expect(rail.slot.height).toBeLessThan(focal.slot.height / 2);
    });

    it('packs the strip from the left, under the focal panel\'s left edge', () => {
        const a = arrange({ width: 736, height: 563, panels: KEYS.slice(0, 2), chrome: CHROME, furniture: FURNITURE });
        const [focal, strip] = a.panels;

        expect(strip.role).toBe('strip');
        expect(strip.slot.x).toBeCloseTo(focal.slot.x, 9);
        expect(strip.slot.width).toBeLessThan(focal.slot.width / 2);
    });

    // Packing moves the squares and does not resize them: a rail panel is as
    // big as it was when its slot was an equal share of the rail.
    it('keeps every rail panel the size an equal share gave it', () => {
        const a = arrange({ ...STAGE, panels: KEYS, chrome: CHROME, furniture: FURNITURE });
        const rail = a.panels.filter(p => p.role === 'rail');
        const share = (1 / a.aspectRatio - 2 * 0.018 - (rail.length - 1) * 0.018) / rail.length;
        const room = (CHROME.rail.top + FURNITURE.indicator.top + FURNITURE.indicator.bottom) / STAGE.width;
        const across = 0.2 - (FURNITURE.indicator.left + FURNITURE.indicator.right) / STAGE.width;

        rail.forEach(p => expect(p.width).toBeCloseTo(Math.min(across, share - room), 9));
    });

    it('swaps with its panel on a promotion', () => {
        const before = arrange({ ...STAGE, panels: KEYS, focused: 'market' });
        const after = arrange({ ...STAGE, panels: KEYS, focused: 'firm' });
        const slotOf = (a: any, key: string) => a.panels.filter((p: any) => p.key === key)[0].slot;

        expect(slotOf(after, 'firm')).toEqual(slotOf(before, 'market'));
        expect(slotOf(after, 'market')).toEqual(slotOf(before, 'firm'));
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

/**
 * A filmstrip too narrow for its captions.
 *
 * The study screen at 1024×768, with the navbar open, has a stage 356px across
 * and 599px down. Its strip's caption column is 152px, and each of two slots
 * was 168px, so the glyph beside the column came out 0px square: a sheet 30px
 * tall holding a dot, under a caption that ran off its top. These are that
 * stage's numbers and the app's room.
 */
describe('a filmstrip too narrow for its captions', () => {

    const NARROW = { width: 356, height: 599 };
    const CHROME = {
        focal: { top: 40, right: 12, bottom: 12, left: 12 },
        strip: { top: 12, right: 152, bottom: 12, left: 12 },
        shelf: { top: 76, right: 12, bottom: 12, left: 12 }
    };
    const PANELS = ['market', 'surplus', 'revenue'];
    const at = (stage: { width: number; height: number }, chrome: any = CHROME, panels = PANELS) =>
        arrange({ ...stage, panels: panels, chrome: chrome, furniture: FURNITURE });
    const px = (a: any, key: string, stage: { width: number }) => pixelBox(a, key, stage.width)!;

    it('was a strip of nothing, and is a shelf of glyphs', () => {
        const { shelf, ...noShelf } = CHROME;
        const strip = at(NARROW, noShelf);
        expect(strip.panels[1].role).toBe('strip');
        expect(px(strip, 'surplus', NARROW).width).toBeLessThan(1);

        const a = at(NARROW);
        expect(a.panels.map(p => p.role)).toEqual(['focal', 'shelf', 'shelf']);
        expect(px(a, 'surplus', NARROW).width).toBeGreaterThan(100);
        expect(isSquare(px(a, 'revenue', NARROW))).toBe(true);
    });

    // Only a host that has said what its chrome takes above a glyph has
    // anything to put there.
    it('offers no shelf to a host that has not given it room', () => {
        const { shelf, ...noShelf } = CHROME;
        at(NARROW, noShelf).panels.slice(1).forEach(p => expect(p.role).toBe('strip'));
    });

    it('keeps the strip where its glyphs are the bigger beside their captions', () => {
        // The same screen at 1440×900, and at 1024×768 with the navbar folded.
        [{ width: 772, height: 773 }, { width: 596, height: 599 }].forEach(stage => {
            at(stage).panels.slice(1).forEach(p => expect(p.role, `${stage.width}`).toBe('strip'));
        });
    });

    it('gives the strip the height the focal panel cannot use, and none it can', () => {
        const a = at(NARROW), focal = px(a, 'market', NARROW), shelf = a.panels[1];
        const pad = 0.018 * NARROW.width;
        const room = (side: 'top' | 'right' | 'bottom' | 'left') => CHROME.focal[side] + FURNITURE.full[side];

        // As wide as the stage allows: the width bounds it, as it did before.
        expect(focal.width).toBeCloseTo(NARROW.width - 2 * pad - room('left') - room('right'), 6);
        // And the strip starts where the focal panel's room ends, a gap below.
        expect(shelf.slot.y * NARROW.height)
            .toBeCloseTo(focal.y + focal.height + room('bottom') + pad, 6);
        // Which is more than the strip's share of the stage's height.
        expect(shelf.slot.height).toBeGreaterThan(0.22);
    });

    it('takes nothing where the focal panel is bounded by its height, as at 1440×900', () => {
        const stage = { width: 772, height: 773 };
        const a = at(stage);
        expect(a.panels[1].slot.height * stage.height).toBeCloseTo(0.22 * stage.height, 6);
    });

    // One shelf panel has the whole width to itself, which a caption beside a
    // glyph fits in: it is a strip, and a bigger one than its share would make.
    it('makes a lone panel under the focal one a strip, as big as the height allows', () => {
        const a = at(NARROW, CHROME, PANELS.slice(0, 2)), strip = a.panels[1];
        expect(strip.role).toBe('strip');
        expect(px(a, 'surplus', NARROW).width).toBeGreaterThan(0.22 * NARROW.height - 30);
    });

    it('shares the stage\'s width evenly, edge to edge with the focal panel\'s share', () => {
        const a = at(NARROW), [focal, surplus, revenue] = a.panels;
        expect(surplus.slot.x).toBeCloseTo(focal.slot.x, 9);
        expect(revenue.slot.x + revenue.slot.width).toBeCloseTo(focal.slot.x + focal.slot.width, 9);
        expect(revenue.slot.width).toBeCloseTo(surplus.slot.width, 9);
    });

    // Promoting the first of them, as with the rail: a straight exchange.
    it('swaps with its panel on a promotion', () => {
        const before = at(NARROW), after = arrange({
            ...NARROW, panels: PANELS, focused: 'surplus', chrome: CHROME, furniture: FURNITURE
        });
        const of = (a: any, key: string) => a.panels.filter((p: any) => p.key === key)[0];

        expect(of(after, 'surplus')).toEqual({ ...of(before, 'market'), key: 'surplus' });
        expect(of(after, 'market')).toEqual({ ...of(before, 'surplus'), key: 'market' });
        expect(of(after, 'revenue')).toEqual(of(before, 'revenue'));
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

// --- the layout, and the params that place it -------------------------------------

describe('one layout, whose rects are params', () => {

    const layout = toCustomLayout({ ...STAGE, panels: KEYS });
    const rectNames = KEYS.flatMap((_, i) =>
        (['x', 'y', 'width', 'height'] as const).map(prop => rectParamName(i, prop)));

    it('declares the focus, the mode, the reveal and four edges for every panel', () => {
        expect(layout.params.map(p => p.name)).toEqual([FOCUS_PARAM, MODE_PARAM, REVEALED_PARAM, ...rectNames]);
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
        // the host rearranging the screen, not the student moving a curve —
        // and `relayout` will write nothing else.
        expect(layout.params.every(p => p.presentation)).toBe(true);
    });

    // An edge used to be a ternary over every state the stage could be in, and
    // it could not hold a new shape: every number in it was for one canvas.
    it('gives every edge a param of its own, and compiles nothing into it', () => {
        layout.panels.forEach((p, i) => {
            expect(p.x).toBe(`params.${rectParamName(i, 'x')}`);
            expect(p.y).toBe(`params.${rectParamName(i, 'y')}`);
            expect(p.width).toBe(`params.${rectParamName(i, 'width')}`);
            expect(p.height).toBe(`params.${rectParamName(i, 'height')}`);
        });
    });

    it('names the params by position, since a key need not be a name mathjs can read', () => {
        const odd = toCustomLayout({ ...STAGE, panels: ['supply-side', 'demand side'] });
        expect(odd.panels[0].x).toBe('params.stageX0');
        expect(odd.panels[1].height).toBe('params.stageHeight1');
    });

    // The state the params start in: every panel arrived, the first one focal.
    it('starts each panel at the level its role draws at', () => {
        expect(layout.panels.map(p => p.density)).toEqual(['full', 'indicator', 'indicator', 'indicator']);
    });

    it('keeps the panels in declared order, so a key indexes the focus param', () => {
        expect(layout.panels.map(p => p.key)).toEqual(KEYS);
    });

    const declared = (l: ReturnType<typeof toCustomLayout>, name: string) =>
        l.params.filter(p => p.name === name)[0].value;

    /**
     * The point of the whole exercise: the diagram is drawn from these numbers
     * and the chrome is positioned from `arrange`, so they have to be the same
     * numbers — in every state, and with the room that makes them depend on
     * more than the shape.
     */
    const agrees = (input: ArrangeInput) => {
        KEYS.forEach(function (_, i) {
            const arrived = i + 1;
            (['focus', 'grid'] as const).forEach(function (mode) {
                KEYS.slice(0, arrived).forEach(function (focused) {
                    const compiled = toCustomLayout({ ...input, focused, mode, arrived });
                    const expected = arrange({ ...input, panels: KEYS.slice(0, arrived), focused, mode });

                    expected.panels.forEach(function (want) {
                        const index = KEYS.indexOf(want.key);
                        (['x', 'y', 'width', 'height'] as const).forEach(function (prop) {
                            expect(declared(compiled, rectParamName(index, prop))).toBeCloseTo(want[prop], 9);
                        });
                    });
                    expect(declared(compiled, FOCUS_PARAM)).toBe(KEYS.indexOf(focused));
                    expect(declared(compiled, MODE_PARAM)).toBe(MODE_VALUE[mode]);
                    expect(declared(compiled, REVEALED_PARAM)).toBe(arrived);
                });
            });
        });
    };

    it('starts at exactly what arrange() computes, in every state', () => {
        agrees({ ...STAGE, panels: KEYS });
    });

    it('and still does with room kept for chrome and furniture', () => {
        agrees({
            ...STAGE, panels: KEYS, furniture: FURNITURE,
            chrome: { focal: { top: 28 }, grid: { top: 28 }, rail: { bottom: 46 }, strip: { right: 150 } }
        });
    });

    // Nothing it draws is on screen, so the cheapest level there is.
    it('starts a panel that has not arrived as a glyph', () => {
        const early = toCustomLayout({ ...STAGE, panels: KEYS, arrived: 1 });
        expect(early.panels.map(p => p.density)).toEqual(['full', 'indicator', 'indicator', 'indicator']);
    });
});

/**
 * What a host sends to move the stage from one arrangement to another — and
 * the only description of an arrangement the engine ever gets.
 */
describe('layoutParams', () => {

    const valuesOf = (params: { name: string; value: number }[]) => {
        const out: { [name: string]: number } = {};
        params.forEach(p => { out[p.name] = p.value });
        return out;
    };

    const boxAt = (values: { [name: string]: number }, key: string) =>
        (['x', 'y', 'width', 'height'] as const).map(prop => values[rectParamName(KEYS.indexOf(key), prop)]);

    it('puts each panel where the arrangement does', () => {
        const a = arrange({ ...STAGE, panels: KEYS, focused: 'cost' });
        const values = valuesOf(layoutParams(KEYS, a));

        a.panels.forEach(p => expect(boxAt(values, p.key)).toEqual([p.x, p.y, p.width, p.height]));
        expect(values[FOCUS_PARAM]).toBe(2);
        expect(values[MODE_PARAM]).toBe(MODE_VALUE.focus);
        expect(values[REVEALED_PARAM]).toBe(KEYS.length);
    });

    it('sets each panel\'s level, and leaves an author\'s own alone', () => {
        const a = arrange({ ...STAGE, panels: KEYS, focused: 'firm' });
        const values = valuesOf(layoutParams(KEYS, a, ['cost']));

        expect(values.density_firm).toBe(densityIndex('full'));
        expect(values.density_market).toBe(densityIndex('indicator'));
        expect(values.density_cost).toBeUndefined();
    });

    /**
     * A panel the lesson has not reached is parked on the focal panel's box.
     *
     * Where it sits is arbitrary — everything in it is hidden by the step that
     * will reveal it — but *which* arbitrary answer matters. A zero-extent rect
     * collapses the panel's scales, and a box outside the canvas is drawn
     * outside the canvas, since the engine's svg is `overflow: visible`.
     */
    it('parks a panel that has not arrived on the focal box, and leaves its level alone', () => {
        const a = arrange({ ...STAGE, panels: KEYS.slice(0, 2), focused: 'market' });
        const values = valuesOf(layoutParams(KEYS, a));

        expect(boxAt(values, 'cost')).toEqual(boxAt(values, 'market'));
        expect(boxAt(values, 'welfare')).toEqual(boxAt(values, 'market'));
        expect(boxAt(values, 'firm')).not.toEqual(boxAt(values, 'market'));
        expect(values.density_cost).toBeUndefined();
        expect(values[REVEALED_PARAM]).toBe(2);
    });

    // The focal key may be a panel the lesson has not reached. The engine is
    // told the panel that is actually focal, which is the one the chrome names.
    it('reports the panel arrange made focal, not the one it was asked for', () => {
        const a = arrange({ ...STAGE, panels: KEYS.slice(0, 1), focused: 'cost' });
        expect(valuesOf(layoutParams(KEYS, a))[FOCUS_PARAM]).toBe(0);
    });

    it('has nothing to say about no panels', () => {
        expect(layoutParams([], arrange({ ...STAGE, panels: [] }))).toEqual([]);
    });
});

/**
 * How many panels have arrived, from the set a host says are revealed.
 *
 * A count rather than a set because the stage arranges a prefix of the
 * declared panels.
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
     * A new arrangement used to be a new config and a rebuilt diagram, and this
     * property was what kept a window drag from paying for one per pixel. It
     * is cheaper than that now — a `relayout` — but a resize that keeps the
     * shape, with no room asked for, still has no panel to move.
     */
    it('so a stage that only scales has nothing to move', () => {
        const small = layoutParams(KEYS, arrange({ width: 900, height: 714, panels: KEYS }));
        const large = layoutParams(KEYS, arrange({ width: 1800, height: 1428, panels: KEYS }));

        expect(large).toEqual(small);
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

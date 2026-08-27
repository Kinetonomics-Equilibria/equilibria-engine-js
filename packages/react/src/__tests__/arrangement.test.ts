import { describe, it, expect } from 'vitest';
import {
    arrange, toCustomLayout, pixelBox,
    FILMSTRIP_BELOW_PX, FOCUS_PARAM, MODE_PARAM, MODE_VALUE
} from '../arrangement';

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

    it('declares the two params the expressions read', () => {
        expect(layout.params.map(p => p.name)).toEqual([FOCUS_PARAM, MODE_PARAM]);
        expect(layout.params[0].max).toBe(KEYS.length - 1);
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

    it('leaves the levels to the engine', () => {
        expect(layout.panels.map(p => p.density)).toEqual(KEYS.map(() => 'auto'));
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
        const body = expr.replace(new RegExp(`params\\.(${FOCUS_PARAM}|${MODE_PARAM})`, 'g'), 's.$1');
        // eslint-disable-next-line no-new-func
        return Function('s', `return ${body}`)(scope) as number;
    };

    it('resolves to exactly what arrange() computed, in every state', () => {
        (['focus', 'grid'] as const).forEach(function (mode) {
            KEYS.forEach(function (focused, focusIndex) {
                const expected = arrange({ ...STAGE, panels: KEYS, focused: focused, mode: mode });
                const scope = { [FOCUS_PARAM]: focusIndex, [MODE_PARAM]: MODE_VALUE[mode] };

                layout.panels.forEach(function (p) {
                    const want = expected.panels.filter(e => e.key === p.key)[0];
                    (['x', 'y', 'width', 'height'] as const).forEach(function (prop) {
                        expect(evaluate(p[prop], scope)).toBeCloseTo(want[prop], 5);
                    });
                });
            });
        });
    });

    it('does not test the mode when there is only one panel to place', () => {
        const one = toCustomLayout({ ...STAGE, panels: ['only'] });
        expect(one.panels[0].x).not.toContain('?');
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

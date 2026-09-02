import { describe, it, expect, beforeAll } from 'vitest';
import { Model } from '../ts/model/model';
import { mountObjects, mountConfig, stubContainerLayout, captureWarnings } from './helpers';

/**
 * Contracts the plans in docs/plans build on, pinned so a refactor cannot quietly
 * remove the foundation of three of them. Established by the P0 spike; the evidence
 * and the reasoning are in docs/plans/P0-findings.md.
 *
 * Two of these document *defects* rather than desirable behaviour, and say so. They
 * are here because the plans depending on them need the real behaviour written down,
 * not the intended one.
 */

beforeAll(() => stubContainerLayout());

/** A view object's visibility is carried by `display` on its rootElement group. */
function hidden(container: HTMLElement, selector: string): boolean[] {
    return Array.from(container.querySelectorAll(selector)).map(el => {
        const root = el.closest('g[class^="rootElement"]');
        return (root?.getAttribute('style') || '').includes('display: none');
    });
}

/**
 * The one that got away for longest, and the plainest instance of the failure
 * this whole suite exists to catch: an expression that produced a number, and
 * the wrong one, with nothing on screen or in the console to say so.
 *
 * `Model.evaluate` opened with `if (!isNaN(parseFloat(name))) return
 * parseFloat(name)`, meant as a fast path for a value that *is* a number.
 * parseFloat reads a prefix, so any expression beginning with a numeric literal
 * never reached mathjs at all: it was replaced by its own first token. Found by
 * putting a consumer-surplus figure on a study screen and reading `$0.5` where
 * `$40.5` belonged.
 */
describe('an expression is not its first number', () => {

    const values = (calcs: Record<string, string>) => {
        const r = mountObjects([{ type: 'Point', def: { coordinates: [1, 1] } }], {
            params: [{ name: 'a', value: 20, min: 0, max: 30, round: 0.1 }],
            calcs: calcs
        });
        const out = r.calcs;
        r.destroy();
        return out;
    };

    it('evaluates a product that starts with a literal', () => {
        expect(values({ x: '2 * params.a' }).x).toBe(40);
    });

    it('evaluates one that starts with a decimal', () => {
        expect(values({ x: '0.5 * params.a' }).x).toBe(10);
    });

    it('evaluates a difference and a sum that start with a literal', () => {
        const v = values({ x: '30 - params.a', y: '5 + params.a' });
        expect(v.x).toBe(10);
        expect(v.y).toBe(25);
    });

    it('composes through other calcs, which is where it was found', () => {
        // Consumer surplus for demand P = a - Q against supply P = 2 + Q:
        // Q* = 9, P* = 11, CS = 0.5 * 9 * (20 - 11) = 40.5.
        const v = values({
            Qe: '(params.a - 2)/2',
            Pe: '(params.a + 2)/2',
            CS: '0.5 * calcs.Qe * (params.a - calcs.Pe)'
        });
        expect(v.CS).toBeCloseTo(40.5, 6);
    });

    it('still reads a bare number as a number, in every spelling', () => {
        const v = values({ a: '42', b: ' 7 ', c: '-3.5', d: '.25', e: '1e3' });
        expect([v.a, v.b, v.c, v.d, v.e]).toEqual([42, 7, -3.5, 0.25, 1000]);
    });
});

/**
 * The same failure in its other costume: an expression that *did* parse, into
 * something nobody wanted. mathjs knows units and constants, so a one-letter
 * label collides with them — and the label then draws nothing at all, while the
 * curve it belongs to is drawn perfectly.
 */
describe('a label\'s text is text', () => {

    const drawn = (text: string) => {
        const r = mountObjects([
            { type: 'Label', def: { x: 5, y: 5, text: text } }
        ], { params: [] });
        const divs = Array.from(r.container.querySelectorAll('div[class^="rootElement-"]'))
            .map(d => (d.textContent || ''));
        r.destroy();
        return divs.join('|');
    };

    it('draws a supply curve labelled S, which mathjs reads as siemens', () => {
        expect(drawn('S')).toContain('S');
    });

    it('draws an equilibrium labelled E, which mathjs reads as Euler\'s number', () => {
        const out = drawn('E');
        expect(out).toContain('E');
        expect(out).not.toContain('2.718');
    });

    it('still draws ordinary LaTeX', () => {
        expect(drawn('Q^*')).toContain('Q^*');
    });
});

describe('authored ghosts (P5)', () => {
    it('draws a pinned dashed line alongside a live one', () => {
        const r = mountObjects([
            { type: 'Line', def: { slope: -1, yIntercept: 'params.a', color: 'colors.blue' } },
            { type: 'Line', def: { slope: -1, yIntercept: 20, color: 'colors.blue', lineStyle: 'dashed', strokeOpacity: 0.35 } },
        ], { params: [{ name: 'a', value: 20, min: 5, max: 28 }] });

        const styles = Array.from(r.container.querySelectorAll('path[class^="path-"]'))
            .map(p => p.getAttribute('style') || '');

        expect(styles).toHaveLength(2);
        expect(styles[0]).toContain('stroke-dasharray: 10,0');
        expect(styles[0]).toContain('stroke-opacity: 1');
        expect(styles[1]).toContain('stroke-dasharray: 10,10');
        expect(styles[1]).toContain('stroke-opacity: 0.35');

        r.destroy();
    });

    it('gates a ghost on a param without remounting', () => {
        const r = mountObjects([
            { type: 'Line', def: { slope: -1, yIntercept: 20, color: 'colors.blue', lineStyle: 'dashed', show: 'params.showGhost' } },
        ], { params: [{ name: 'showGhost', value: 0, min: 0, max: 1, round: 1 }] });

        expect(hidden(r.container, 'path[class^="path-"]')).toEqual([true]);

        r.kg.update({ params: [{ name: 'showGhost', value: 1 }] });
        expect(hidden(r.container, 'path[class^="path-"]')).toEqual([false]);

        // and it comes back — a ghost can be dismissed and recalled
        r.kg.update({ params: [{ name: 'showGhost', value: 0 }] });
        expect(hidden(r.container, 'path[class^="path-"]')).toEqual([true]);

        r.destroy();
    });
});

describe('shift arrows (P5, P8)', () => {
    it('tracks a live endpoint and mints a marker in the object colour', () => {
        const r = mountObjects([
            { type: 'Arrow', def: { begin: [5, 5], end: ['params.a', 'params.a'], color: 'colors.red' } },
        ], { params: [{ name: 'a', value: 20, min: 5, max: 28 }] });

        // An Arrow is a <line>, not a <path>; the <path>s inside the <marker> are the
        // arrowhead glyph and never move.
        const line = () => r.container.querySelector('line[class^="line-"]')!;
        const at = () => ({ x1: line().getAttribute('x1'), x2: line().getAttribute('x2') });

        expect(line().getAttribute('marker-end')).toMatch(/^url\(#/);
        const before = at();

        r.kg.update({ params: [{ name: 'a', value: 26 }] });
        const after = at();

        expect(after.x1).toBe(before.x1);                            // begin is pinned
        expect(Number(after.x2)).toBeGreaterThan(Number(before.x2));  // end follows the param

        expect(r.container.querySelector('marker path[class^="arrowElement"]')?.getAttribute('fill'))
            .toBe('#d62728');

        r.destroy();
    });
});

describe('predicates (P11)', () => {
    it('resolves a well-formed predicate to a real boolean', () => {
        const model = new Model({
            params: [{ name: 'a', value: 24, min: 0, max: 40 }],
            calcs: { correct: 'abs(params.a - 24) <= 0.5' },
            colors: {}, idioms: {}
        });

        expect(model.currentCalcValues['correct']).toBe(true);
        expect(typeof model.currentCalcValues['correct']).toBe('boolean');

        model.updateParam('a', 30);
        expect(model.currentCalcValues['correct']).toBe(false);
    });

    /**
     * DEFECT, pinned deliberately. A predicate the author mistyped is returned as its
     * own source text (model.ts:180-188), which is a non-empty string, which is truthy —
     * so a wrong answer renders as correct, with no warning anywhere. This test exists to
     * make the trap visible and to fail loudly if someone fixes it without telling the
     * plans that depend on it. It is not a contract worth keeping.
     */
    it('DEFECT: a mistyped predicate is a truthy string and shows the object anyway', () => {
        const { result: model, warnings } = captureWarnings(() => new Model({
            params: [{ name: 'a', value: 30, min: 0, max: 40 }],
            calcs: { correct: 'abs(params.aa - 24) <= 0.5' },   // 'aa' does not exist
            colors: {}, idioms: {}
        }));

        expect(model.currentCalcValues['correct']).toBe('abs(params.aa - 24) <= 0.5');
        expect(typeof model.currentCalcValues['correct']).toBe('string');
        expect(Boolean(model.currentCalcValues['correct'])).toBe(true);   // ← the trap
        expect(warnings).toEqual([]);                                     // ← and it is silent

        // and it reaches the screen: a label gated on it renders for a wrong answer
        const r = mountObjects([
            { type: 'Label', def: { x: 15, y: 15, text: 'CORRECT', show: 'calcs.correct' } },
        ], { params: [{ name: 'a', value: 30, min: 0, max: 40 }], calcs: { correct: 'abs(params.aa - 24) <= 0.5' } });

        expect(r.container.innerHTML).toContain('CORRECT');
        r.destroy();
    });
});

describe('staged reveal (P6, P10)', () => {
    it('reveals objects in order and hides them again on the way back', () => {
        const objects = [1, 2, 3].map(n => ({
            type: 'Point',
            def: { x: 6 * n, y: 10, color: 'colors.blue', show: `params.step >= ${n}` }
        }));
        const r = mountObjects(objects, { params: [{ name: 'step', value: 0, min: 0, max: 3, round: 1 }] });

        // two circles per Point: the drawn one and its drag hit area
        const shown = () => hidden(r.container, 'circle[class^="circle-"]').map(h => !h);

        expect(shown()).toEqual([false, false, false]);

        r.kg.update({ params: [{ name: 'step', value: 2 }] });
        expect(shown()).toEqual([true, true, false]);

        r.kg.update({ params: [{ name: 'step', value: 3 }] });
        expect(shown()).toEqual([true, true, true]);

        // scrubbing back must un-reveal, or a timeline cannot rewind
        r.kg.update({ params: [{ name: 'step', value: 1 }] });
        expect(shown()).toEqual([true, false, false]);

        r.destroy();
    });
});

describe('drag constraints and freeze-on-commit (P11)', () => {
    function dragListeners(kg: any) {
        return (kg.view.model as any).updateListeners
            .filter((u: any) => u.constructor.name === 'DragListener');
    }

    it('constrains a drag to one axis and re-reads draggable after mount', () => {
        const r = mountConfig({
            schema: 'EconSchema',
            params: [
                { name: 'a', value: 20, min: 5, max: 28 },
                { name: 'submitted', value: 0, min: 0, max: 1, round: 1 },
            ],
            layout: {
                OneGraph: {
                    graph: {
                        xAxis: { title: 'x', min: 0, max: 30 },
                        yAxis: { title: 'y', min: 0, max: 30 },
                        objects: [{
                            type: 'Line',
                            def: {
                                slope: -1, yIntercept: 'params.a', color: 'colors.blue',
                                drag: [{ horizontal: 'a', draggable: 'not(params.submitted)' }]
                            }
                        }]
                    }
                }
            }
        });

        const [dl] = dragListeners(r.kg);
        expect(dl.directions).toBe('x');
        expect(dl.param).toBe('a');
        expect(dl.expression).toBe('params.a + drag.dx');
        expect(dl.draggable).toBe(true);

        // the claim most likely to be wrong, and it holds: draggable updates without a remount
        r.kg.update({ params: [{ name: 'submitted', value: 1 }] });
        expect(dragListeners(r.kg)[0].draggable).toBe(false);

        r.kg.update({ params: [{ name: 'submitted', value: 0 }] });
        expect(dragListeners(r.kg)[0].draggable).toBe(true);

        r.destroy();
    });

    /**
     * The half the test above could not see, and P11 needed.
     *
     * `draggable` reported the right value from the moment it was authored, and
     * nothing consulted it: `Listener.onChange` moved the param unconditionally
     * and the interaction handler set `pointer-events` from `directions` alone.
     * So a curve bound to `not(params.submitted)` went on dragging after commit,
     * with a field on a listener recording that it should not have.
     *
     * This asserts the effect rather than the property — which is the habit
     * NOTES.md names for exactly this class of defect — by calling what the drag
     * handler calls, with the scope it builds.
     */
    it('refuses the drag itself, not merely the property', () => {
        const r = mountConfig({
            schema: 'EconSchema',
            params: [
                { name: 'a', value: 20, min: 5, max: 28, round: 0.1 },
                { name: 'submitted', value: 0, min: 0, max: 1, round: 1 }
            ],
            layout: {
                OneGraph: {
                    graph: {
                        xAxis: { title: 'x', min: 0, max: 30 },
                        yAxis: { title: 'y', min: 0, max: 30 },
                        objects: [{
                            type: 'Line',
                            def: {
                                slope: -1, yIntercept: 'params.a', color: 'colors.blue',
                                drag: [{ vertical: 'a', draggable: 'not(params.submitted)' }]
                            }
                        }]
                    }
                }
            }
        });

        const model: any = (r.kg as any).view.model;
        const [dl] = dragListeners(r.kg);
        // exactly what interactionHandler's d3 'drag' handler passes
        const drag = (dy: number) => dl.onChange({
            params: model.currentParamValues,
            calcs: model.currentCalcValues,
            colors: model.currentColors,
            drag: { x0: 0, y0: 0, x: 0, y: dy, dx: 0, dy: dy }
        });

        drag(3);
        expect(model.currentParamValues.a).toBe(23);

        r.kg.update({ params: [{ name: 'submitted', value: 1 }] });
        drag(3);
        expect(model.currentParamValues.a).toBe(23);

        r.kg.update({ params: [{ name: 'submitted', value: 0 }] });
        drag(3);
        expect(model.currentParamValues.a).toBe(26);

        r.destroy();
    });

    /**
     * And it stops *looking* draggable, which is the other half of a commit.
     *
     * A frozen curve that still takes the pointer and still shows a resize
     * cursor reads as a diagram that has broken, not as an answer that has been
     * taken.
     */
    it('takes the hit area out of the pointer path while frozen', () => {
        const r = mountConfig({
            schema: 'EconSchema',
            params: [
                { name: 'a', value: 20, min: 5, max: 28, round: 0.1 },
                { name: 'submitted', value: 0, min: 0, max: 1, round: 1 }
            ],
            layout: {
                OneGraph: {
                    graph: {
                        xAxis: { title: 'x', min: 0, max: 30 },
                        yAxis: { title: 'y', min: 0, max: 30 },
                        objects: [{
                            type: 'Line',
                            def: {
                                slope: -1, yIntercept: 'params.a', color: 'colors.blue',
                                drag: [{ vertical: 'a', draggable: 'not(params.submitted)' }]
                            }
                        }]
                    }
                }
            }
        });

        // The handler is attached to the object's root group, not to the hit
        // area inside it (`viewObject.ts:263`), so that is what carries it.
        const style = () => (r.container.querySelector('g[class^="rootElement"]')
            ?.getAttribute('style') || '');

        expect(style()).toContain('pointer-events: all');

        r.kg.update({ params: [{ name: 'submitted', value: 1 }] });
        expect(style()).toContain('pointer-events: none');

        r.kg.update({ params: [{ name: 'submitted', value: 0 }] });
        expect(style()).toContain('pointer-events: all');

        r.destroy();
    });

    it('toggles a 0/1 param through the default click transitions', () => {
        const r = mountConfig({
            schema: 'EconSchema',
            params: [{ name: 'submitted', value: 0, min: 0, max: 1, round: 1 }],
            layout: {
                OneGraph: {
                    graph: {
                        xAxis: { title: 'x', min: 0, max: 30 },
                        yAxis: { title: 'y', min: 0, max: 30 },
                        objects: [{ type: 'Point', def: { x: 10, y: 10, color: 'colors.blue', click: [{ param: 'submitted' }] } }]
                    }
                }
            }
        });

        const model: any = (r.kg as any).view.model;
        const [cl] = model.updateListeners.filter((u: any) => u.constructor.name === 'ClickListener');

        // transitions is a lookup table indexed by the param's current value, not a toggle.
        // For a 0/1 param the default [1, 0] behaves as one.
        expect(cl.transitions).toEqual([1, 0]);

        cl.click();
        expect(model.currentParamValues['submitted']).toBe(1);
        cl.click();
        expect(model.currentParamValues['submitted']).toBe(0);

        r.destroy();
    });
});

describe('multi-param updates (P10, P11)', () => {
    function scenario() {
        return mountConfig({
            schema: 'EconSchema',
            params: [
                { name: 'a', value: 26, min: 5, max: 28 },
                { name: 'c', value: 9, min: 0, max: 10 },
            ],
            restrictions: [{ expression: 'params.a - params.c', min: 10 }],
            layout: {
                OneGraph: {
                    graph: {
                        xAxis: { title: 'x', min: 0, max: 30 },
                        yAxis: { title: 'y', min: 0, max: 30 },
                        objects: [{ type: 'Line', def: { slope: -1, yIntercept: 'params.a', color: 'colors.blue' } }]
                    }
                }
            }
        });
    }

    it('applies both params when no interim state violates a restriction', () => {
        const r = scenario();
        const model: any = (r.kg as any).view.model;

        // c first: interim a=26,c=5 has difference 21, legal throughout
        r.kg.update({ params: [{ name: 'c', value: 5 }, { name: 'a', value: 15 }] });

        expect(model.currentParamValues['a']).toBe(15);
        expect(model.currentParamValues['c']).toBe(5);
        r.destroy();
    });

    /**
     * DEFECT, pinned deliberately. kg.update() applies params one at a time (kg.ts:86-99)
     * and each is validated alone (model.ts:231-262), so a legal destination reached through
     * an illegal interim is rejected halfway — silently. The caller is left in a state that is
     * neither where it started nor where it asked to go, and nothing says so.
     * Scenarios need an all-or-nothing batched update; see docs/plans/P0-findings.md §7.
     */
    it('DEFECT: rejects a legal destination reached through an illegal interim, silently', () => {
        const r = scenario();
        const model: any = (r.kg as any).view.model;

        // target a=15, c=5 → difference 10, legal.
        // a first: interim a=15, c=9 → difference 6, rejected and rolled back.
        const { warnings } = captureWarnings(() =>
            r.kg.update({ params: [{ name: 'a', value: 15 }, { name: 'c', value: 5 }] }));

        expect(model.currentParamValues['a']).toBe(26);   // ← never moved
        expect(model.currentParamValues['c']).toBe(5);    // ← did move
        expect(warnings).toEqual([]);                     // ← and the caller is told nothing

        r.destroy();
    });
});

import { describe, it, expect, beforeAll } from 'vitest';
import { mountConfig, stubContainerLayout, captureWarnings } from './helpers';

/**
 * `setPanelOpacity` — one panel faded, and only that one.
 *
 * A host moving two panels past each other needs one of them out of the way
 * while they cross, and the panels are regions of one SVG whose layers
 * interleave them: a curve of one sits beside an axis of the other. So the
 * claims are that every kind of thing a panel draws fades with it — the SVG
 * and the HTML labels over it — that nothing in the other panel does, and that
 * a redraw does not quietly undo it.
 */

beforeAll(() => stubContainerLayout(800, 400));

const rect = (name: string, value: number) =>
    ({ name, value, min: 0, max: 1, round: 0.000001, presentation: true });

const panel = (key: string, x: string) => ({
    key,
    x: 'params.' + x, y: 0.1, width: 0.4, height: 0.8,
    xAxis: { title: 'Q', min: 0, max: 20 },
    yAxis: { title: 'P', min: 0, max: 20 },
    objects: [{ type: 'Line', def: { yIntercept: 15, slope: -1, label: { text: 'D', x: 5 } } }]
});

const stage = () => mountConfig({
    schema: 'EconSchema',
    params: [rect('ax', 0.05), rect('bx', 0.55)],
    layout: { CustomLayout: { aspectRatio: 2, panels: [panel('market', 'ax'), panel('firm', 'bx')] } }
});

/** The root element of everything a panel draws, by its scale. */
function drawnIn(r: any, key: string): HTMLElement[] {
    return (r.kg as any).view.viewObjects
        .filter((vo: any) => !vo.inDef && vo.rootElement && vo.xScale && vo.xScale.name === key + '_x')
        .map((vo: any) => vo.rootElement.node());
}

describe('fading one panel', () => {

    it('fades everything the panel draws, labels included', () => {
        const r = stage();
        expect(r.error).toBeNull();
        r.kg.setPanelOpacity('market', 0.25);

        const market = drawnIn(r, 'market');
        expect(market.some(el => el.tagName === 'DIV')).toBe(true);
        expect(market.some(el => el.tagName !== 'DIV')).toBe(true);
        expect(market.every(el => el.style.opacity === '0.25')).toBe(true);
        r.destroy();
    });

    it('leaves the other panel alone', () => {
        const r = stage();
        r.kg.setPanelOpacity('market', 0);
        expect(drawnIn(r, 'firm').every(el => el.style.opacity === '')).toBe(true);
        r.destroy();
    });

    // The host sets it once per frame of a move and lays the diagram out in
    // the same frame; if the redraw reset it the panel would flicker back in.
    it('holds through a relayout', () => {
        const r = stage();
        r.kg.setPanelOpacity('firm', 0.5);
        r.kg.relayout({ params: [{ name: 'bx', value: 0.5 }] });
        expect(drawnIn(r, 'firm').every(el => el.style.opacity === '0.5')).toBe(true);
        r.destroy();
    });

    it('clears the style at 1, rather than writing it', () => {
        const r = stage();
        r.kg.setPanelOpacity('market', 0.4);
        r.kg.setPanelOpacity('market', 1);
        expect(drawnIn(r, 'market').every(el => el.style.opacity === '')).toBe(true);
        r.destroy();
    });

    it('names the panels it has when asked for one it does not', () => {
        const r = stage();
        const { warnings } = captureWarnings(() => r.kg.setPanelOpacity('cost', 0.5));
        expect(warnings).toHaveLength(1);
        expect(warnings[0]).toContain('"cost"');
        expect(warnings[0]).toContain('"market", "firm"');
        r.destroy();
    });

    it('refuses something that is not a number', () => {
        const r = stage();
        const { warnings } = captureWarnings(() => r.kg.setPanelOpacity('market', NaN));
        expect(warnings).toHaveLength(1);
        expect(drawnIn(r, 'market').every(el => el.style.opacity === '')).toBe(true);
        r.destroy();
    });
});

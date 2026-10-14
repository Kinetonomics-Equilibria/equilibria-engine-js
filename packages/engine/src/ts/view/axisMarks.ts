import * as d3 from "d3";
import { Axis } from "./viewObjects/axis";
import { Label } from "./viewObjects/label";
import { ViewObject } from "./viewObjects/viewObject";

/**
 * A tick label gives way to a label placed on its axis.
 *
 * An equilibrium's droplines end in `P^*` and `Q^*`, printed on the axes at the
 * values they name, and nothing kept them off the tick labels already printed
 * there. On the study screen `Q^*` sat on top of the `10` whenever the market
 * cleared near ten — exactly, under "Boom and cost squeeze" — so the axis read
 * as a smear of two numbers in the place a student is meant to read one.
 *
 * Of the two, the tick is the one that can go. It is one of a regular series,
 * and its neighbours still give the scale; the dropline label is the only thing
 * on the axis saying where *this* market is. So a tick label whose box meets the
 * box of an axis label in the same panel is hidden, and shown again once the
 * label has moved off it. The tick mark itself stays, so the series is still
 * visibly regular where its number has been withheld.
 *
 * It has to be decided after everything has been drawn, from boxes rather than
 * from values: a dropline label is typeset by KaTeX and a tick label by the
 * browser, so neither knows how wide the other is until both are on screen. That
 * is why this is an update listener registered *after* every view object rather
 * than a step inside either class — the model updates its listeners in the order
 * they registered, so by the time this runs, each axis and label has redrawn for
 * this tick.
 *
 * Visibility rather than removal, and only when it changes. d3's axis re-joins
 * its ticks on every redraw and resets their opacity, but not their visibility,
 * so a hidden tick stays hidden across redraws that do not move it — and every
 * box is read before any style is written, so the pass costs one layout rather
 * than one per tick.
 */
export class AxisMarks {

    private panels: { axes: Axis[], marks: Label[] }[];

    /** The panels with at least one axis label, or null when there are none to watch. */
    static over(viewObjects: ViewObject[]): AxisMarks | null {
        const marks = viewObjects.filter((vo): vo is Label => vo instanceof Label && vo.axisMark);
        if (marks.length === 0) return null;

        const axes = viewObjects.filter((vo): vo is Axis => vo instanceof Axis);
        const panels: { axes: Axis[], marks: Label[] }[] = [];

        // A panel is a pair of scales. Matched by identity, which is what the
        // view hands every object in a panel, so two panels with equal domains
        // are still two panels.
        marks.forEach(function (mark) {
            let panel = panels.find(p => p.marks[0].xScale === mark.xScale && p.marks[0].yScale === mark.yScale);
            if (!panel) {
                panel = {
                    axes: axes.filter(a => a.xScale === mark.xScale && a.yScale === mark.yScale),
                    marks: []
                };
                panels.push(panel);
            }
            panel.marks.push(mark);
        });

        const watched = panels.filter(p => p.axes.length > 0);
        return watched.length > 0 ? new AxisMarks(watched) : null;
    }

    constructor(panels: { axes: Axis[], marks: Label[] }[]) {
        this.panels = panels;
    }

    update() {
        const decisions: [Element, boolean][] = [];

        this.panels.forEach(function (panel) {
            const boxes = panel.marks
                .filter(mark => mark.rootElement && mark.rootElement.node().style.display !== 'none')
                .map(mark => (mark.rootElement.node() as Element).getBoundingClientRect())
                .filter(box => box.width > 0 && box.height > 0);

            panel.axes.forEach(function (axis) {
                if (!axis.rootElement) return;
                axis.rootElement.selectAll('g.tick text').each(function (this: Element) {
                    const box = this.getBoundingClientRect();
                    decisions.push([this, boxes.some(mark => overlaps(mark, box))]);
                });
            });
        });

        decisions.forEach(function ([text, hide]) {
            const wanted = hide ? 'hidden' : '';
            if ((text as HTMLElement).style.visibility !== wanted) {
                d3.select(text).style('visibility', hide ? 'hidden' : null);
            }
        });

        return this;
    }
}

/** Overlapping by more than half a pixel each way; touching is not overlapping. */
function overlaps(a: DOMRect, b: DOMRect): boolean {
    return Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5
        && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
}

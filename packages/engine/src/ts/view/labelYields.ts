import { Label, LabelBox } from "./viewObjects/label";
import { ViewObject } from "./viewObjects/viewObject";

/**
 * A ghost's label keeps clear of the live object's label.
 *
 * The `ghost` shorthand copies a curve's label along with everything else, so
 * the twin's `D₀` is placed at the same coordinate as the live `D` — on a curve
 * that is, after a small move, only a fraction of a unit away. Every nudge of a
 * slider printed the two names one on top of the other, and the pairing they
 * replaced (`D` under `D′`) did exactly the same.
 *
 * The live label stays where the author put it: it names the thing the student
 * is looking at. The ghost's slides along its own curve to the nearest place
 * that clears it, which after a small move is just past it on the dashed line —
 * where a textbook would print it — and after a large one is no move at all.
 *
 * Decided after everything has drawn, for the reason `AxisMarks` is: the ghost
 * is drawn first (it belongs underneath), so when its own update runs the live
 * label has not yet been placed for this tick. Reading the box the live label
 * was *just* given is the only way not to be a frame behind it.
 */
export class LabelYields {

    private pairs: { yielding: Label, to: Label }[];

    /** The labels that give way to another, or null when there are none. */
    static over(viewObjects: ViewObject[]): LabelYields | null {
        const labels = viewObjects.filter((vo): vo is Label => vo instanceof Label);
        const pairs = labels
            .filter(label => label.yieldsTo)
            .map(label => ({ yielding: label, to: labels.find(other => other.labelId === label.yieldsTo) }))
            .filter(pair => pair.to);
        return pairs.length > 0 ? new LabelYields(pairs) : null;
    }

    constructor(pairs: { yielding: Label, to: Label }[]) {
        this.pairs = pairs;
    }

    update() {
        this.pairs.forEach(function ({ yielding, to }) {
            yielding.giveWay(boxOf(to));
        });
        return this;
    }
}

/** Where a label was drawn, in its panel's pixels, or null if it is not on screen. */
function boxOf(label: Label): LabelBox | null {
    const node = label.rootElement && label.rootElement.node() as HTMLElement;
    if (!node || node.style.display === 'none') return null;
    const left = parseFloat(node.style.left), top = parseFloat(node.style.top);
    if (!isFinite(left) || !isFinite(top)) return null;
    return { left, top, width: node.clientWidth, height: node.clientHeight };
}

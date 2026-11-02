import { KG_HANDLE_CLASS } from "../constants";

/**
 * Get a diagram ready to be copied into a picture, and say how to put it back.
 *
 * A picture of a page is drawn from a copy of it, and a copy of an `<svg>`
 * leaves the page's stylesheets behind: what html-to-image's `toPng` does for
 * everything else, writing each element's computed style onto its copy, it
 * does not do inside an `<svg>`, which it takes whole. Almost everything a
 * diagram draws is written on the element, so this is two things:
 *
 * - The axes, whose weight, colour and type are `kgjs-theme.css`'s. Without it
 *   they came out as d3 writes them, 1px and 10px, where the chart's rules ask
 *   for 2px and 14px so they read from the back of a classroom. Written as
 *   computed values, since a custom property has nothing to resolve against in
 *   the copy. A new rule there that draws inside the `<svg>` goes in `AXES` too.
 * - The handles, which say what can be dragged, and nothing on a picture can.
 *
 * On the page itself, for as long as the picture takes, since there is no
 * other way into what is copied. The axes look as they did, and the handles
 * blink off. Only what was written is put back, so a redraw in the meantime
 * keeps whatever else it changed.
 */
const AXES: [string, string[]][] = [
    ['g.axis', ['font-family', 'font-size', 'font-variant-numeric']],
    ['g.axis line, g.axis path', ['stroke', 'stroke-width']]
];

export function readyForPicture(node: Element): () => void {
    const undo: (() => void)[] = [];
    const write = (element: SVGElement, property: string, value: string) => {
        const before = element.style.getPropertyValue(property);
        element.style.setProperty(property, value);
        undo.push(() => {
            if (before) element.style.setProperty(property, before);
            else element.style.removeProperty(property);
        });
    };

    AXES.forEach(function ([selector, properties]) {
        node.querySelectorAll<SVGElement>(selector).forEach(function (element) {
            const computed = getComputedStyle(element);
            properties.forEach(property => write(element, property, computed.getPropertyValue(property)));
        });
    });
    node.querySelectorAll<SVGElement>(`.${KG_HANDLE_CLASS}`).forEach(handle => write(handle, 'display', 'none'));

    return () => undo.forEach(put => put());
}

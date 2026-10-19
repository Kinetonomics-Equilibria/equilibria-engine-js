import { setDefaults, setProperties } from "../../util";
import { ViewObjectDefinition, ViewObject } from "./viewObject";
import { UnivariateFunction, UnivariateFunctionDefinition } from "../../math/univariateFunction";
import * as katex from "katex";
import * as d3 from "d3";



export interface LabelDefinition extends ViewObjectDefinition {
    x: any;
    y: any;
    text: string;

    plainText?: boolean;
    /** Points. An expression now, not only a number — see the constructor. */
    fontSize?: any;
    xPixelOffset?: number;
    yPixelOffset?: number;
    align?: string;
    valign?: string;
    rotate?: number;
    bgcolor?: string;
    /**
     * The curve this label names, as a function of the coordinate it was placed
     * by — set by `Curve` in the authoring layer, never by hand. See `slide`.
     */
    along?: UnivariateFunctionDefinition;
    /** See `Label.labelId` and `Label.yieldsTo`. */
    labelId?: string;
    yieldsTo?: string;
}

/** How finely `slide` looks along a curve before narrowing down on the edge. */
const SLIDE_SAMPLES = 64;
const SLIDE_REFINEMENTS = 16;

/** Pixels kept between a label and the one it gives way to. */
const LABEL_GAP = 2;

/** A label's box in its panel's pixels — the coordinates `left` and `top` are written in. */
export interface LabelBox { left: number; top: number; width: number; height: number; }

/**
 * A label whose text is a bare name draws that name.
 *
 * `text` is evaluated like any other updatable, and mathjs knows more names
 * than an author expects: `S` is siemens, `E` and `e` are Euler's number, `A`
 * is amperes. So `label: { text: 'S' }` on a supply curve resolved to a Unit
 * object, `katex.render` threw on it, the throw was caught and logged, and the
 * label drew **nothing** — with the curve, the axes and everything else
 * perfectly fine. Two objects in the econ library shipped with an invisible
 * `E`, and the KaTeX error was visible in this repo's own test output as
 * "Error rendering KaTeX: 2.718281828459045".
 *
 * A bare name as label text is a name to draw, not a value to look up. A value
 * is asked for the documented way, with a backtick template — `` `(calcs.Pe)` ``
 * — which `redraw` substitutes below and which a dotted path like `calcs.Pe`
 * still reaches too, since neither is a bare name.
 */
const BARE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

export class Label extends ViewObject {

    private x: number;
    private y: number;
    private text: string;
    private plainText: boolean;
    private fontSize: any;
    private xPixelOffset: number;
    private yPixelOffset: number;
    private align: string;
    private valign: string;
    private rotate: number;
    private color: string;
    private bgcolor: string;
    private along: UnivariateFunction;
    private size = { width: 0, height: 0 };
    /** Placed on an axis rather than in the plot; read by `AxisMarks`. */
    public axisMark: boolean;
    /**
     * A pairing between two labels, set by the `ghost` shorthand: the label
     * whose `yieldsTo` names another's `labelId` keeps clear of it. Read by
     * `LabelYields`; see `view/labelYields.ts`.
     */
    public labelId: string;
    public yieldsTo: string;
    private avoiding: LabelBox | null = null;

    constructor(def: LabelDefinition) {

        const xAxisReversed = (def.xScale.rangeMin > def.xScale.rangeMax),
            yAxisReversed = (def.yScale.rangeMin < def.yScale.rangeMax);

        let xOffset = xAxisReversed ? 1 : -1,
            yOffset = yAxisReversed ? 12 : -12;

        // A label placed *on* an axis names a value there — a dropline's `P^*`
        // — and outranks the tick labels it lands on. See `view/axisMarks.ts`.
        const axisMark = [def.x, def.y].some(c => c == 'AXIS' || c == 'OPPAXIS');

        if (def.x == 'AXIS') {
            def.x = def.yScale.intercept;
            def.align = xAxisReversed ? 'left' : 'right';
            def.xPixelOffset = xOffset;
        }

        if (def.x == 'OPPAXIS') {
            def.x = def.xScale.domainMax;
            def.align = xAxisReversed ? 'right' : 'left';
            def.xPixelOffset = -xOffset;
        }

        if (def.y == 'AXIS') {
            def.y = def.yScale.intercept;
            def.yPixelOffset = yOffset;
        }

        if (def.y == 'OPPAXIS') {
            def.y = def.yScale.domainMax;
            def.yPixelOffset = -yOffset;
        }

        //establish property defaults
        setDefaults(def, {
            xPixelOffset: 0,
            yPixelOffset: 0,
            fontSize: 10,
            align: 'center',
            valign: 'middle',
            rotate: 0,
            color: 'black'
        });

        // define constant and updatable properties
        //
        // `fontSize` moved out of the constants, and it was not only a missing
        // feature. A constant is read once, in the UpdateListener constructor,
        // and kept as-is unless it parses as a number — so `fontSize:
        // 'params.big ? 14 : 10'` was stored as that string and written into
        // the DOM as `font-size: params.big ? 14 : 10pt`, which is not a CSS
        // length. The browser discarded the declaration and the label rendered
        // at whatever size it inherited, with nothing anywhere saying so. As an
        // updatable it evaluates, and `redraw()` applies it.
        setProperties(def, 'constants', ['xPixelOffset', 'yPixelOffset', 'plainText']);
        setProperties(def, 'updatables', ['x', 'y', 'text', 'align', 'valign', 'rotate', 'color', 'bgcolor', 'fontSize']);

        // Built before `super`, as `Curve` builds its own, so it registers with
        // the model first and has already been updated by the time this label
        // asks it anything.
        let along: UnivariateFunction;
        if (def.along) {
            def.along.model = def.model;
            along = new UnivariateFunction(def.along);
        }

        super(def);

        this.along = along;
        this.axisMark = axisMark;
        this.labelId = (def as any).labelId;
        this.yieldsTo = (def as any).yieldsTo;

        // Default to the view's clearColor so labels visually blend with the chart background.
        // Schema authors can override this via the schema's clearColor property.
        this.bgcolor = def.bgcolor ?? def.model.clearColor;

    }

    /**
     * A curve's label stays on the plot by moving along the curve.
     *
     * A curve label is placed by an author at a coordinate — `x: 16` — and its
     * other coordinate is the curve's value there. That is a good place for the
     * curve the author was looking at and no place at all for the same curve
     * shifted: supply at `x: 16` with an intercept above 4 is above the top of a
     * 0–20 plot, so every input-cost scenario on the study screen drew a supply
     * curve with no `S`. `onGraph` hid it, correctly — a label off the plot is
     * either clipped or printed over the axes — and nothing put it anywhere else.
     *
     * The fix is to keep the author's coordinate as a preference and, when the
     * label would not fit there, walk back along the same curve to the nearest
     * place it does. It stays *on its curve*, which is the one thing a curve label
     * has to do, and it moves the least distance along it that will keep it on
     * screen. "Fits" means the whole typeset box, not just its anchor: a label
     * centred on the top edge is half off the plot and over whatever is above it.
     *
     * Done here rather than as an expression in the authoring layer because only
     * here are the label's size and the panel's pixels known, and because a curve
     * in general has no inverse to write the edge crossing as. Sampling and then
     * bisecting asks only that the curve can be evaluated, which it must be to be
     * drawn at all.
     */
    private slide(ok: (p: { x: number, y: number }) => boolean): { x: number, y: number } | null {
        const label = this,
            fn = label.along,
            byX = fn.ind !== 'y',
            scale = byX ? label.xScale : label.yScale;

        let lo = Math.min(scale.domainMin, scale.domainMax),
            hi = Math.max(scale.domainMin, scale.domainMax);
        // A curve drawn over part of the axis can only be labelled where it is drawn.
        if (fn.min !== undefined && isFinite(+fn.min)) lo = Math.max(lo, +fn.min);
        if (fn.max !== undefined && isFinite(+fn.max)) hi = Math.min(hi, +fn.max);
        if (!(hi >= lo)) return null;

        const at = (t: number) => {
            let v: number;
            try { v = +fn.evaluate(t); } catch (e) { v = NaN; }
            return byX ? { x: t, y: v } : { x: v, y: t };
        };
        const fits = (p: { x: number, y: number }) => isFinite(p.x) && isFinite(p.y) && ok(p);

        const wanted = byX ? +label.x : +label.y;
        if (isFinite(wanted)) {
            const there = at(wanted);
            if (fits(there)) return there;
        }
        const from = isFinite(wanted) ? Math.min(hi, Math.max(lo, wanted)) : lo;

        // The fitting sample nearest the author's coordinate. Every sample
        // strictly between it and that coordinate is nearer, so none of them fit,
        // and the edge the label should sit on is between it and its neighbour.
        const step = (hi - lo) / SLIDE_SAMPLES;
        let inside: number = null;
        for (let i = 0; i <= SLIDE_SAMPLES; i++) {
            const t = lo + i * step;
            if (fits(at(t)) && (inside === null || Math.abs(t - from) < Math.abs(inside - from))) {
                inside = t;
            }
        }
        if (inside === null) return null;

        let outside = inside + Math.sign(from - inside) * step;
        if (Math.abs(outside - inside) > Math.abs(from - inside)) outside = from;
        for (let i = 0; i < SLIDE_REFINEMENTS && outside !== inside; i++) {
            const mid = (inside + outside) / 2;
            if (fits(at(mid))) inside = mid; else outside = mid;
        }
        return at(inside);
    }

    /**
     * Would this label's box, anchored at a point, lie inside its panel?
     *
     * Against the box from the last draw, and with a margin of half the box's
     * shorter side. Without one, a label slid to the edge sat flush against it,
     * the curve ran out of the box's corner for the two or three pixels left
     * before the edge, and that stub read as a prime — `S′` on a curve with no
     * `S` for it to be prime to. With the margin the curve visibly carries on
     * past the label, the way it does at the author's own coordinate.
     *
     * A box that cannot fit anywhere, margin included, is held to its anchor
     * instead, so a label in a panel too small for it behaves as every label did
     * before.
     */
    private fits(p: { x: number, y: number }): boolean {
        const label = this,
            [x0, x1] = label.xScale.scale.range(),
            [y0, y1] = label.yScale.scale.range();

        let { width, height } = label.size,
            margin = Math.min(width, height) / 2;
        if (width + 2 * margin >= Math.abs(x1 - x0) || height + 2 * margin >= Math.abs(y1 - y0)) {
            width = height = margin = 0;
        }

        const left = Math.min(x0, x1) + margin, right = Math.max(x0, x1) - margin,
            top = Math.min(y0, y1) + margin, bottom = Math.max(y0, y1) - margin,
            box = label.boxAt(p, width, height);

        return box.left >= left && box.left + width <= right && box.top >= top && box.top + height <= bottom;
    }

    /** The box this label would occupy anchored at a point, in the panel's pixels. */
    private boxAt(p: { x: number, y: number }, width: number, height: number): LabelBox {
        const label = this,
            ax = label.xScale.scale(p.x) + (+label.xPixelOffset),
            ay = label.yScale.scale(p.y) - (+label.yPixelOffset);
        return {
            left: ax - (label.align == 'left' ? 0 : label.align == 'right' ? width : width / 2),
            top: ay - (label.valign == 'top' ? 0 : label.valign == 'bottom' ? height : height / 2),
            width, height
        };
    }

    /**
     * Does this label, anchored at a point, keep clear of the label it gives way to?
     *
     * A gap of a couple of pixels rather than mere non-intersection: two KaTeX
     * boxes that touch read as one word.
     */
    private clears(p: { x: number, y: number }): boolean {
        const label = this, other = label.avoiding;
        if (!other) return true;
        const box = label.boxAt(p, label.size.width, label.size.height);
        return box.left + box.width + LABEL_GAP <= other.left || other.left + other.width + LABEL_GAP <= box.left
            || box.top + box.height + LABEL_GAP <= other.top || other.top + other.height + LABEL_GAP <= box.top;
    }

    /**
     * Where the label is drawn: where the author put it, or the nearest place on
     * its curve that fits — and, for a label that gives way to another, the
     * nearest that fits *and* keeps clear of it. When nowhere on the curve does
     * both, keeping on the plot wins: an overlap is legible, a missing label is
     * not.
     */
    private placement(): { x: number, y: number } {
        const label = this;
        if (!label.along) return { x: label.x, y: label.y };
        const inPanel = (p: { x: number, y: number }) => label.fits(p);
        return (label.avoiding && label.slide(p => inPanel(p) && label.clears(p)))
            || label.slide(inPanel)
            || { x: label.x, y: label.y };
    }

    /**
     * Keep off another label's box, and move now.
     *
     * Called by `LabelYields` once every object has drawn for this update, with
     * the box the other label was just given, or with null when it is not on
     * screen. Only the position is rewritten — the text, colour and size were
     * set by this label's own redraw moments earlier in the same update.
     */
    giveWay(box: LabelBox | null) {
        const label = this;
        label.avoiding = box;
        if (!label.along || !label.rootElement || label.rootElement.node().style.display === 'none') return;
        const at = label.placement();
        label.position(
            label.xScale.scale(at.x) + (+label.xPixelOffset),
            label.yScale.scale(at.y) - (+label.yPixelOffset),
            label.size.width, label.size.height
        );
    }

    /**
     * A sliding label is on the graph whenever any of its curve is.
     *
     * Its own coordinates no longer decide it: they are where the author would
     * like it, and `slide` finds where it can go. A curve that has left the plot
     * entirely still takes its label with it. The curve moving is a reason to
     * redraw even when the label's own coordinates did not change — a label
     * already slid to an edge follows the curve along that edge.
     */
    onGraph() {
        const label = this;
        if (!label.along) return super.onGraph();
        if (!label.checkOnGraph) return true;
        if (label.along.hasChanged) label.hasChanged = true;
        return label.slide(p => label.fits(p)) !== null;
    }

    // create div for text
    draw(layer) {
        let label = this;

        const container = (label.def as ViewObjectDefinition).svgContainerDiv || d3.select(layer.node().parentNode.parentNode);

        label.rootElement = container.selectAll('div.rootElement-' + label.id).data([1]).join('div')
            .attr('class', 'rootElement-' + label.id + ' draggable')
            .style('position', 'absolute')
            // No font-size here: it is an updatable now, and draw() runs before
            // the first update, so this would write "undefinedpt". redraw() sets it.
            .style('text-align', 'center')
            .style('padding-left', '3px')
            .style('padding-right', '3px')

        return label.addInteraction();
    }

    // update properties
    redraw() {
        let label = this;

        label.rootElement
            .style('color', label.color)
            .style('background-color', label.bgcolor)
            // Applied here as well as in draw(): the size can now change after
            // the div exists, and the measurements below (clientWidth/Height,
            // which the alignment offsets are computed from) have to be taken
            // after the text has been re-sized, not before.
            .style('font-size', label.fontSize + 'pt');

        const at = label.placement(),
            x = label.xScale.scale(at.x) + (+label.xPixelOffset),
            y = label.yScale.scale(at.y) - (+label.yPixelOffset);

        const source = (label.def as LabelDefinition).text;
        let displayText: any = label.text;

        if (typeof source === 'string' && BARE_NAME.test(source)) {
            displayText = source;
        } else if (undefined != displayText && typeof displayText !== 'string' && typeof displayText !== 'number') {
            // Evaluation produced something that is not text — a unit, a
            // matrix, a function. Whatever the author wrote is closer to what
            // they meant than a value KaTeX cannot draw.
            displayText = source;
        }

        if (undefined != displayText) {
            if (typeof displayText === 'string') {
                // Dynamically evaluate templates wrapped in `(varName)` using the model
                displayText = displayText.replace(/`\(([^)]+)\)`/g, (match, p1) => {
                    const evaluated = label.model.evaluate(p1);
                    // Ensure we don't return [object Object] or undefined if eval fails softly
                    return (evaluated !== undefined && typeof evaluated !== 'object') ? String(evaluated) : match;
                });
            }

            if (label.plainText) {
                //console.log('rendering label as plain text: ', displayText)
                label.rootElement.text(displayText);
            } else {
                //console.log('rendering label as LaTeX: ', displayText)
                try {
                    katex.render(String(displayText), label.rootElement.node());
                }
                catch (e) {
                    console.log("Error rendering KaTeX: ", displayText);
                }
            }
        }
        label.rootElement.style('left', x + 'px');
        label.rootElement.style('top', y + 'px');
        const width = label.rootElement.node().clientWidth,
            height = label.rootElement.node().clientHeight;

        // The size is only known now, after the text has been typeset, and
        // whether a label fits depends on it — so a label that slides is placed
        // a second time, against its own measured box. `onGraph` used the box
        // from the last draw, which on the first draw is no box at all.
        if (label.along && (width !== label.size.width || height !== label.size.height)) {
            label.size = { width, height };
            const settled = label.placement();
            return label.position(
                label.xScale.scale(settled.x) + (+label.xPixelOffset),
                label.yScale.scale(settled.y) - (+label.yPixelOffset),
                width, height
            );
        }
        return label.position(x, y, width, height);
    }

    /** Put the box at an anchor, honouring the alignment. */
    private position(x: number, y: number, width: number, height: number) {
        const label = this;
        // Set left pixel margin; default to centered on x coordinate
        let alignDelta = width * 0.5;
        if (label.align == 'left') {
            alignDelta = 0;
        } else if (label.align == 'right') {
            // move left by half the width of the div if right aligned
            alignDelta = width;
        }
        label.rootElement.style('left', (x - alignDelta) + 'px');

        // Set top pixel margin; default to centered on y coordinate
        let vAlignDelta = height * 0.5;
        // Default to centered on x coordinate
        if (label.valign == 'top') {
            vAlignDelta = 0;
        } else if (label.valign == 'bottom') {
            vAlignDelta = height;
        }
        label.rootElement.style('top', (y - vAlignDelta) + 'px');

        const rotate = `rotate(-${label.rotate}deg)`;
        label.rootElement.style('-webkit-transform', rotate)
            .style('transform', rotate);

        return label;
    }



}

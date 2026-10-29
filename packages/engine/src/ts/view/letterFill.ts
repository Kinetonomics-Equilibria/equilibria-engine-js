import * as d3 from "d3";

/**
 * The insides of a label's letters, filled in the canvas colour.
 *
 * A curve's label sits on its curve, and the halo round its letters (`haloOf`
 * in viewObjects/label.ts) cuts the line for 2px either side of them. Where the
 * curve ends at its label, that is enough. Where it runs on through it, it was
 * not: since the symbols went to 14pt, the bowl of a D is 4px from its ink to
 * its middle, and the elasticity lesson's steep demand, labelled at $1 and
 * running on to $0, showed a stripe of itself inside the D. A halo wide enough
 * to close the bowl is 4px round every letter, and over a shaded area that is
 * a white cloud with the serifs ghosted in it: the sticker the halo replaced
 * the box to be rid of. Filling what the letters enclose clears the bowl and
 * changes nothing outside them.
 *
 * CSS cannot fill a letter's inside, so the label's letters are drawn again on
 * a canvas, where the inside of a letter is what a flood from the edges cannot
 * reach. That shape, in the canvas colour, is the label's background: under
 * its text and its halo, so only the inside shows.
 */

/** Alpha, of 255, below which a pixel is paper a flood can cross. Low, so a faint hairline still closes a bowl. */
const INK = 64;

/** Paper drawn round the label, so a letter that overhangs its box is not cut open at the canvas's edge. */
const MARGIN = 4;

/** Fills already drawn, by what was drawn: a label redraws on every move of a slider. */
const drawn = new Map<string, string>();
const KEEP = 200;

/** What each label's background was last set to, so an unchanged one is not set again. */
const shown = new WeakMap<HTMLElement, string>();

/**
 * Milliseconds a label's text stands still before its fill is drawn. A
 * readout's text changes on every move of a slider, and a fill costs a few
 * milliseconds to draw, several times that on a school laptop.
 */
const SETTLE = 100;
const settling = new WeakMap<HTMLElement, number>();

/** The text each label last waited on its fonts for; see `settle`. */
const waited = new WeakMap<HTMLElement, string>();

/**
 * 1 where a pixel is a letter or inside one: anything a flood from the edges,
 * across paper, does not reach. It floods four ways only, so two pixels of a
 * hairline that touch at a corner still close it.
 */
export function insideOf(alpha: ArrayLike<number>, width: number, height: number): Uint8Array {
    const reached = new Uint8Array(width * height),
        queue: number[] = [];
    const visit = (i: number) => {
        if (!reached[i] && alpha[i] < INK) {
            reached[i] = 1;
            queue.push(i);
        }
    };
    for (let x = 0; x < width; x++) {
        visit(x);
        visit((height - 1) * width + x);
    }
    for (let y = 0; y < height; y++) {
        visit(y * width);
        visit(y * width + width - 1);
    }
    while (queue.length) {
        const i = queue.pop(), x = i % width;
        if (x > 0) visit(i - 1);
        if (x < width - 1) visit(i + 1);
        if (i >= width) visit(i - width);
        if (i < width * (height - 1)) visit(i + width);
    }
    return reached.map(r => 1 - r);
}

/**
 * Set `div`'s background to the insides of its letters in `color`, or clear it
 * when `color` is null.
 *
 * A fill drawn before is set at once. A new one is drawn once the text has
 * stood still (`SETTLE`); until then the label has its halo alone, which
 * covers most of a letter's inside. A rotated label is left alone, since its
 * letters' boxes are measured after the rotation: the caller passes null for
 * one. So is one that is not laid out, which has no boxes to measure.
 */
export function fillInsideLetters(div: HTMLElement, color: string | null): void {
    clearTimeout(settling.get(div));
    settling.delete(div);

    // jsdom's canvas is a stub that logs an error when asked for a context.
    // OffscreenCanvas is the sign of a real one.
    if (!color || typeof OffscreenCanvas === 'undefined' || !document.fonts) return show(div, '');

    const at = measure(div, color);
    if (!at) return;
    const image = drawn.get(at.key);
    if (image !== undefined) return place(div, image, at.width, at.height);

    show(div, '');
    settling.set(div, window.setTimeout(() => {
        settling.delete(div);
        settle(div, color);
    }, SETTLE));
}

/** The label's size, and everything its fill depends on as one key; null if it is not laid out. */
function measure(div: HTMLElement, color: string) {
    const width = div.offsetWidth, height = div.offsetHeight;
    if (!width || !height) return null;
    const key = [div.innerHTML, div.style.fontSize, width, height, color, window.devicePixelRatio].join('|');
    return { key, width, height };
}

function settle(div: HTMLElement, color: string) {
    const at = measure(div, color);
    if (!at) return;

    const texts = lettersOf(div),
        fonts = texts.map(t => fontOf(t.parentElement));

    // Drawn in a stand-in font, the insides would be a stand-in's. Once the
    // label's own fonts are here, it is asked again, once: a font that fails
    // is never loaded, and the page shows the stand-in, as the canvas will.
    if (waited.get(div) !== at.key && fonts.some(f => !document.fonts.check(f))) {
        waited.set(div, at.key);
        const again = () => fillInsideLetters(div, color);
        Promise.all(fonts.map(f => document.fonts.load(f))).then(again, again);
        return;
    }

    const image = draw(div, texts, fonts, at.width, at.height, window.devicePixelRatio || 1, color);
    drawn.set(at.key, image);
    if (drawn.size > KEEP) drawn.delete(drawn.keys().next().value);
    place(div, image, at.width, at.height);
}

function place(div: HTMLElement, image: string, width: number, height: number) {
    show(div, image);
    if (image) {
        div.style.backgroundRepeat = 'no-repeat';
        div.style.backgroundSize = `${width + 2 * MARGIN}px ${height + 2 * MARGIN}px`;
        div.style.backgroundPosition = `${-MARGIN}px ${-MARGIN}px`;
    }
}

function show(div: HTMLElement, image: string) {
    if (shown.get(div) === image) return;
    shown.set(div, image);
    div.style.backgroundImage = image;
}

/** The text a reader sees: not KaTeX's MathML, which is there for a screen reader and drawn nowhere. */
function lettersOf(div: HTMLElement): Text[] {
    const texts: Text[] = [],
        walk = document.createTreeWalker(div, NodeFilter.SHOW_TEXT);
    for (let node = walk.nextNode() as Text; node; node = walk.nextNode() as Text) {
        if (node.data.trim() && !node.parentElement.closest('.katex-mathml')) texts.push(node);
    }
    return texts;
}

function fontOf(element: Element): string {
    const css = getComputedStyle(element);
    return `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
}

/**
 * The fill as a CSS image, or '' when the letters enclose nothing, as `S` and
 * `C` do not.
 *
 * Each letter is drawn where the page put it, from the box of a range around
 * it, so KaTeX's subscripts, struts and italic corrections come out as they are
 * on the page. The box's top is the font's ascent above its baseline.
 */
function draw(div: HTMLElement, texts: Text[], fonts: string[], width: number, height: number, ratio: number, color: string): string {
    const box = div.getBoundingClientRect(),
        // A scaled stage: the boxes are in its pixels, the canvas in the label's.
        zoom = box.width / width,
        w = Math.ceil((width + 2 * MARGIN) * ratio),
        h = Math.ceil((height + 2 * MARGIN) * ratio),
        canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d', { willReadFrequently: true });
    g.scale(ratio, ratio);

    const range = document.createRange();
    texts.forEach((node, n) => {
        g.font = fonts[n];
        const ascent = g.measureText(node.data).fontBoundingBoxAscent;
        let at = 0;
        for (const letter of node.data) {
            range.setStart(node, at);
            range.setEnd(node, at += letter.length);
            const r = range.getBoundingClientRect();
            if (r.width) g.fillText(letter, MARGIN + (r.left - box.left) / zoom, MARGIN + (r.top - box.top) / zoom + ascent);
        }
    });

    const pixels = g.getImageData(0, 0, w, h),
        alpha = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) alpha[i] = pixels.data[i * 4 + 3];
    const inside = insideOf(alpha, w, h);

    // Ink is filled too, so the letters' edges blend with the canvas colour and
    // not with a line under them; but only paper inside a letter needs a fill.
    if (!inside.some((v, i) => v && alpha[i] < INK)) return '';

    const fill = d3.rgb(color);
    if (isNaN(fill.r)) return '';
    const out = pixels.data;
    for (let i = 0; i < w * h; i++) {
        out[i * 4] = fill.r;
        out[i * 4 + 1] = fill.g;
        out[i * 4 + 2] = fill.b;
        out[i * 4 + 3] = inside[i] ? 255 : 0;
    }
    g.putImageData(pixels, 0, 0);
    return `url(${canvas.toDataURL()})`;
}

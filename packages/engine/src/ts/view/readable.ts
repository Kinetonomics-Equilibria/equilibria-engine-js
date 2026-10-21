import * as d3 from "d3";

/** What text needs against what is behind it: WCAG 1.4.3. A line needs 3. */
export const TEXT_CONTRAST = 4.5;

const cache = new Map<string, string>();

/**
 * A colour that can be read as text on `background`: the colour itself if it
 * already can, and otherwise the nearest shade of it that can.
 *
 * A label is drawn in the colour of the thing it names, and a colour chosen for
 * a line is not always one that can be read as letters. A line needs 3:1
 * against the sheet to be seen and text needs 4.5:1 (WCAG 1.4.11 and 1.4.3);
 * on white, the equilibrium's green is 3.4:1, so `P*` and `Q*` were drawn in a
 * colour a 2px line can carry and a 13px letter cannot. Asking every author to
 * pick a second, darker colour for every label is how half of them would be
 * missed, so the label asks here instead.
 *
 * Only the lightness moves, in HCL, so the shade is still recognisably the
 * curve's: a darker orange, not a brown. Darker on a light canvas and lighter
 * on a dark one. Anything that does not parse as a colour — `currentColor`,
 * `inherit` — is returned as it was given.
 */
export function readableOn(color: string, background: string, ratio: number = TEXT_CONTRAST): string {
    if (typeof color !== 'string' || typeof background !== 'string') return color;
    const key = color + '|' + background + '|' + ratio;
    const known = cache.get(key);
    if (known !== undefined) return known;

    let out = color;
    const fg = d3.color(color), bg = d3.color(background);
    if (fg && bg && contrast(fg, bg) < ratio) {
        const darker = luminance(bg) > 0.18,
            hcl = d3.hcl(fg);
        // An achromatic colour has no hue, and HCL with a NaN hue draws black.
        const hue = isNaN(hcl.h) ? 0 : hcl.h,
            chroma = isNaN(hcl.c) ? 0 : hcl.c;
        for (let l = hcl.l; darker ? l >= 0 : l <= 100; l += darker ? -1 : 1) {
            const shade = d3.rgb(d3.hcl(hue, chroma, l)).clamp();
            if (contrast(shade, bg) >= ratio) {
                out = shade.formatHex();
                break;
            }
        }
    }

    cache.set(key, out);
    return out;
}

/** WCAG's contrast ratio between two colours: 1 for the same, 21 for black on white. */
export function contrast(a: d3.Color | string, b: d3.Color | string): number {
    const la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** WCAG's relative luminance, from 0 for black to 1 for white. */
function luminance(color: d3.Color | string): number {
    const rgb = d3.rgb(color as any);
    return [rgb.r, rgb.g, rgb.b]
        .map(v => v / 255)
        .map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
        .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
}

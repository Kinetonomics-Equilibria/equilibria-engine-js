import { useEffect } from 'react';
import type { RefObject } from 'react';
import { toPng } from 'html-to-image';
import { readyForPicture } from 'equilibria-engine-js';
import type { EmbedLayout } from './links';

/**
 * Share: everything that leaves the screen — a link, a QR code, the code to
 * embed the page in another, a picture of the diagram, a printed page.
 *
 * What a link says is `links.ts`'s. This is the rest: making one whole, and
 * making a picture or a page of the view.
 */

/**
 * An address from `writeLink` (`lessons/fx?…`) or `writeEmbed`
 * (`embed/lessons/fx?…`) on this site, whole: from the app's root, wherever
 * the page asking is. An embed's own page is under `embed/`, and a link from
 * it opens the app.
 */
export function linkHref(address: string): string {
    return new URL(address, new URL(import.meta.env.BASE_URL, window.location.origin)).href;
}

/**
 * Each embed's size in a page, as its code asks for it: the room each layout
 * was laid out for. The whole page is the study screen less the rail, with
 * the side column beside the stage from 900px; the diagram alone fits a
 * 640px column, as a page of text has.
 */
export const EMBED_SIZE: Record<EmbedLayout, { width: number; height: number }> = {
    full: { width: 1000, height: 640 },
    diagram: { width: 640, height: 480 }
};

const attribute = (text: string) =>
    text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * The code to paste into a page: an iframe named for what it shows, at its
 * layout's size, borderless, and never wider than the column it is put in.
 * Narrower than 900px, the whole page takes the stacked layout a phone has.
 * The whole page may go full screen, so Present works inside it: `allow` is
 * how a browser is asked now, and `allowfullscreen` how an older one was.
 */
export function embedCode(src: string, title: string, layout: EmbedLayout): string {
    const { width, height } = EMBED_SIZE[layout];
    return `<iframe src="${attribute(src)}" title="${attribute(title)}" width="${width}" height="${height}" ` +
        `style="border:0;max-width:100%"${layout === 'full' ? ' allow="fullscreen" allowfullscreen' : ''} ` +
        'loading="lazy"></iframe>';
}

/**
 * Onto the clipboard, by the browser's clipboard if it will, and by the older
 * way of selecting text and copying it if not: a page in another site's frame
 * is often refused the first and allowed the second.
 */
export async function copyText(text: string): Promise<void> {
    try {
        await navigator.clipboard.writeText(text);
        return;
    } catch {
        const field = document.createElement('textarea');
        field.value = text;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand('copy');
        field.remove();
        if (!copied) throw new Error('The browser would not copy it.');
    }
}

/**
 * A link as someone would type it: no `https://`, which every browser adds
 * for itself. There is no shortener behind the app, so this is as short as a
 * link gets.
 */
export function typedLink(href: string): string {
    return href.replace(/^https?:\/\//, '');
}

/**
 * A name for the picture of a view: the lesson's, and where in it.
 *
 * Read by a student looking for it in their downloads, so it says what the
 * picture is in their words rather than the address's.
 */
export function pictureName(lesson: string, where: string | null): string {
    const name = where ? `${lesson}, ${where}` : lesson;
    return name.replace(/[\\/:*?"<>|]+/g, ' ').trim() + '.png';
}

/**
 * The stage as drawn, as a PNG, saved to the student's downloads.
 *
 * At twice the screen's pixels, so it stays sharp on a slide. The diagram's
 * sheets are white on the page's own shade, which is what the picture's
 * background is too, so the panels read as cards in it as they do on screen.
 * What the copy needs written on the diagram first is the engine's to know
 * (`readyForPicture`): its axes as they are drawn, and no handles. Rejects when
 * the browser will not draw it, so the menu can say so.
 */
export async function downloadPicture(node: HTMLElement, name: string): Promise<void> {
    const putBack = readyForPicture(node);
    const url = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: getComputedStyle(document.body).backgroundColor
    }).finally(putBack);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
}

/**
 * The widest the diagram is printed, in CSS pixels: A4's width less a
 * browser's usual margins, and a little under US Letter's. Portrait, which is
 * what a printer starts at.
 */
const PAPER_PX = 680;

/**
 * Fit the stage to the paper while the page prints.
 *
 * The stage is laid out in pixels for the screen it is on, and the paper is
 * narrower than most screens. So just before the browser lays the page out
 * for print, the stage keeps the size it has on screen and is scaled down to
 * the paper's width — everything in it, the curves, the labels and the
 * captions, by the same amount — and is let go again afterwards. Printing
 * from the browser's own menu takes the same path as Print in Share.
 */
export function usePrintFit(box: RefObject<HTMLElement | null>) {
    useEffect(() => {
        const fit = () => {
            const node = box.current;
            if (!node) return;
            const { width, height } = node.getBoundingClientRect();
            node.style.setProperty('--print-width', `${width}px`);
            node.style.setProperty('--print-height', `${height}px`);
            node.style.setProperty('--print-scale', String(Math.min(1, PAPER_PX / Math.max(width, 1))));
        };
        const unfit = () => {
            const node = box.current;
            if (!node) return;
            ['--print-width', '--print-height', '--print-scale'].forEach(name => node.style.removeProperty(name));
        };
        window.addEventListener('beforeprint', fit);
        window.addEventListener('afterprint', unfit);
        return () => {
            window.removeEventListener('beforeprint', fit);
            window.removeEventListener('afterprint', unfit);
        };
    }, [box]);
}

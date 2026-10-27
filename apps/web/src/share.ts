import { useEffect } from 'react';
import type { RefObject } from 'react';
import { toPng } from 'html-to-image';

/**
 * Share: everything that leaves the screen — a link, a QR code, a picture of
 * the diagram, a printed page.
 *
 * What a link says is `links.ts`'s. This is the rest: making one whole, and
 * making a picture or a page of the view.
 */

/** The address for a link's words (`?lesson=fx&…`) on this site, whole. */
export function linkHref(search: string): string {
    return new URL(search, window.location.href).href;
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
 * Rejects when the browser will not draw it, so the menu can say so.
 */
export async function downloadPicture(node: HTMLElement, name: string): Promise<void> {
    const url = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: getComputedStyle(document.body).backgroundColor
    });
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

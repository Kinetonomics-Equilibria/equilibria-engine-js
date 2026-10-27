import { useMemo } from 'react';
import qrcode from 'qrcode-generator';

/**
 * A QR code for a link, drawn as one SVG path so it scales to any size sharp.
 *
 * Black on white whatever the theme, since that is what a camera reads, with
 * the four modules of white round it that a scanner looks for. Medium error
 * correction: a code on a projector is read through glare and at an angle,
 * and a link's worth of text still makes a small code at that level.
 */

/** The white round the code, in modules: the standard's quiet zone. */
const QUIET = 4;

export interface QrCodeProps {
    text: string;
    /** What the code is, for a screen reader; the link itself is beside it. */
    label: string;
    className?: string;
}

export function QrCode({ text, label, className }: QrCodeProps) {
    const { path, size } = useMemo(() => {
        const qr = qrcode(0, 'M');
        qr.addData(text);
        qr.make();
        const count = qr.getModuleCount();
        let d = '';
        for (let row = 0; row < count; row++) {
            for (let col = 0; col < count; col++) {
                if (qr.isDark(row, col)) d += `M${col + QUIET} ${row + QUIET}h1v1h-1z`;
            }
        }
        return { path: d, size: count + 2 * QUIET };
    }, [text]);

    return (
        <svg
            className={className}
            viewBox={`0 0 ${size} ${size}`}
            role="img"
            aria-label={label}
            shapeRendering="crispEdges"
        >
            <rect width={size} height={size} fill="#fff" />
            <path d={path} fill="#000" />
        </svg>
    );
}

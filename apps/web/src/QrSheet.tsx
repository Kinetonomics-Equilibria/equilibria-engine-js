import { Button } from '@mantine/core';
import { StageSheet } from './StageSheet';
import { QrCode } from './QrCode';
import { typedLink } from './share';
import classes from './QrSheet.module.css';

/**
 * A link as a QR code, over the whole stage, for a class to scan from the
 * board: as large as the diagram was, with the link beside it for anyone who
 * would rather type.
 *
 * The link is Share's: a lesson's at its start, or in the playground the
 * view itself. A stage sheet like the cover, so the diagram waits under it at
 * its size, and Done or Esc puts it away.
 */
export interface QrSheetProps {
    /** The link, whole. */
    href: string;
    /** What it opens, as a sentence: "Opens the lesson at its start". */
    opens: string;
    onClose(): void;
}

export function QrSheet({ href, opens, onClose }: QrSheetProps) {
    return (
        <StageSheet
            label="QR code"
            eyebrow={`Scan with a phone's camera · ${opens.toLowerCase()}`}
            action={<Button variant="subtle" size="compact-sm" onClick={onClose}>Done</Button>}
        >
            <div className={classes.body}>
                <QrCode className={classes.code} text={href} label={`QR code. ${opens}.`} />
                <div className={classes.beside}>
                    <p className={classes.lead}>Or type</p>
                    <p className={classes.link}>{typedLink(href)}</p>
                </div>
            </div>
        </StageSheet>
    );
}

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
 * A stage sheet like the cover, so the diagram waits under it at its size,
 * and Done or Esc puts it away. It shows the link as it is now, so a step
 * taken while it is up is the step it opens at.
 */
export interface QrSheetProps {
    /** The link, whole. */
    href: string;
    /** Whether it opens at this view or at the start of the lesson. */
    start: boolean;
    onClose(): void;
}

export function QrSheet({ href, start, onClose }: QrSheetProps) {
    const opens = start ? 'Opens the lesson at its start' : 'Opens this view';
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

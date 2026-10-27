import { QrCode } from './QrCode';
import { typedLink } from './share';
import classes from './PrintedView.module.css';

/**
 * The view, said for paper: printed under the lesson's title and over the
 * diagram, and nowhere on screen.
 *
 * A printed diagram has no sliders to read its settings from, so they are
 * written out — where in the lesson it is, which panel is in front, and what
 * the student moved, from where the lesson puts it to where they put it — and
 * a code beside them opens the same view again, with the link written out
 * for anyone who would rather type.
 */
export interface PrintedViewProps {
    where: string;
    arrangement: string | null;
    moved: string[];
    href: string;
}

export function PrintedView({ where, arrangement, moved, href }: PrintedViewProps) {
    return (
        <div className={classes.printed}>
            <div className={classes.words}>
                <p className={classes.where}>{where}</p>
                {arrangement ? <p className={classes.line}>{arrangement}</p> : null}
                {moved.length > 0 ? (
                    <>
                        <p className={classes.lead}>Moved from where the lesson puts it</p>
                        <ul className={classes.moved}>
                            {moved.map(m => <li key={m}>{m}</li>)}
                        </ul>
                    </>
                ) : null}
                <p className={classes.again}>
                    To open it again, scan the code or go to <span className={classes.link}>{typedLink(href)}</span>
                </p>
            </div>
            <QrCode className={classes.code} text={href} label="QR code back to this view, for the printed page" />
        </div>
    );
}

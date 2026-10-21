import type { CSSProperties, ReactNode } from 'react';
import { STAGE_PAD } from 'equilibria-react';
import classes from './StageSheet.module.css';

/**
 * A sheet laid over the whole stage, for the moments a lesson has no diagram to
 * show: its cover, before the first step.
 *
 * The stage stays under it, mounted, at its size, and inert while the sheet is
 * up — the screen does that, not this — so this is only the sheet: the paper's
 * head, with what the sheet is at the left and its one action at the right,
 * and a body that scrolls if what it holds outgrows it.
 *
 * The words a step says are never here. They stay on the lesson card, which is
 * where every step's words are; the stage shows what the diagram would have.
 */
export interface StageSheetProps {
    /** The sheet's accessible name: what it is, in a few words. */
    label: string;
    /** What the sheet is, small and grey, in its head. */
    eyebrow: ReactNode;
    /** The sheet's one action, at the head's right. */
    action?: ReactNode;
    children: ReactNode;
}

export function StageSheet({ label, eyebrow, action, children }: StageSheetProps) {
    return (
        <div className={classes.frame} style={{ '--stage-pad': STAGE_PAD } as CSSProperties}>
            <section className={classes.sheet} aria-label={label}>
                <div className={classes.head}>
                    <p className={classes.eyebrow}>{eyebrow}</p>
                    {action}
                </div>
                <div className={classes.body}>{children}</div>
            </section>
        </div>
    );
}

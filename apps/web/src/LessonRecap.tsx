import type { CSSProperties } from 'react';
import type { Outcome } from './track/track';
import classes from './LessonRecap.module.css';

/**
 * The lesson's questions, looked back over, on the stage: the recap.
 *
 * It answers *how did I go?*, which nothing else on the screen does — the
 * verdict under a question is gone once the student moves on. One card per
 * question, each saying what it turned on in the words the chain uses ("Demand
 * for A$ increases", marked in its curve's colour), why, and how it went; then
 * the rule the questions were all instances of, once, in the reasoning's teal.
 *
 * Presentational: the screen works out each case from the lesson and the track,
 * and this decides nothing about them.
 */
export interface RecapCase {
    /** The question's step title: "Interest rates rise". */
    title: string;
    /** The cause, as the chain would say it: "Demand for A$ increases". */
    clause: string;
    /** The colour of the curve the cause moved, where the lesson names one. */
    color?: string;
    /** The question's explanation. */
    explain?: string;
    /** How it went; none for a question not yet finished. */
    outcome?: Outcome;
}

export interface LessonRecapProps {
    cases: RecapCase[];
    takeaway: string;
}

export function LessonRecap({ cases, takeaway }: LessonRecapProps) {
    return (
        <div className={classes.recap}>
            <ul className={classes.cases} aria-label="The questions">
                {cases.map(c => (
                    <li key={c.title} className={classes.case}>
                        <h4 className={classes.title}>{c.title}</h4>
                        <p
                            className={classes.clause}
                            style={c.color ? { '--curve': c.color } as CSSProperties : undefined}
                        >
                            {c.clause}
                        </p>
                        {c.explain ? <p className={classes.explain}>{c.explain}</p> : null}
                        {c.outcome ? (
                            <span className={classes.outcome} data-how={c.outcome.how}>
                                {outcomeWords(c.outcome)}
                            </span>
                        ) : null}
                    </li>
                ))}
            </ul>
            <div className={classes.takeaway}>
                <span className={classes.takeawayLabel}>In short</span>
                <p className={classes.takeawayText}>{takeaway}</p>
            </div>
        </div>
    );
}

const ORDINAL = ['', 'first', 'second', 'third'];

/** How a question went, said plainly. Nothing scolds: a shown answer is just that. */
export function outcomeWords(outcome: Outcome): string {
    switch (outcome.how) {
        case 'first':
            return 'Right first time';
        case 'retry':
            return outcome.goes < ORDINAL.length
                ? `Right on the ${ORDINAL[outcome.goes]} go`
                : `Right after ${outcome.goes} goes`;
        default:
            return 'You used Show me';
    }
}

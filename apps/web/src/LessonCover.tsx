import { partCounts, partsOf } from './track/track';
import type { LessonStep } from './track/track';
import type { LessonCover as Cover, Picture } from './lessons/content';
import classes from './LessonCover.module.css';

/**
 * What the stage shows before the first step: the lesson's cover.
 *
 * It answers the one question a student has before they press Start, which no
 * other card does — *what is this about, and how long is it?* The lesson card
 * beside it already says what they will be able to do by the end, and keeps
 * Start lesson; this says why they would want to, and lays out the parts they
 * will go through, drawn the way the track they are about to move along draws
 * them, questions in yellow.
 *
 * A picture that moves is shown as its still here. A cover is read, not
 * watched, and the steps that teach with a picture are where it moves.
 */
export interface LessonCoverProps {
    cover: Cover;
    picture?: Picture;
    steps: LessonStep[];
}

export function LessonCover({ cover, picture, steps }: LessonCoverProps) {
    const parts = partsOf(steps);
    return (
        <div className={classes.cover}>
            {picture ? (
                <img className={classes.picture} src={picture.still || picture.src} alt={picture.alt} />
            ) : null}
            <div className={classes.text}>
                <h3 className={classes.question}>{cover.question}</h3>
                <p className={classes.hook}>{cover.hook}</p>
            </div>
            <ol className={classes.parts} aria-label="The lesson's parts">
                {parts.map((part, i) => {
                    const counts = partCounts(steps, part);
                    return (
                        <li key={part.first}>
                            <span className={classes.bars} aria-hidden="true">
                                {counts.kinds.map((kinds, k) => (
                                    <span key={k} className={classes.bar} data-kinds={kinds.join(' ')} />
                                ))}
                            </span>
                            <span className={classes.partName}>
                                {part.title ? `${i + 1} · ${part.title}` : `Part ${i + 1}`}
                            </span>
                            <span className={classes.count}>{countWords(counts)}</span>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}

function countWords(counts: { steps: number; questions: number }): string {
    if (counts.questions > 0) return counts.questions === 1 ? '1 question' : `${counts.questions} questions`;
    return counts.steps === 1 ? '1 step' : `${counts.steps} steps`;
}

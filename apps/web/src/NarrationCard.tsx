import type { CSSProperties } from 'react';
import { Anchor, Button } from '@mantine/core';
import { IconArrowBackUp, IconArrowRight, IconInfoCircle } from '@tabler/icons-react';
import type { Clause, NarrationLine } from './narration/narrate';
import { announcement, curveColor } from './narration/narrate';
import classes from './NarrationCard.module.css';

/**
 * "What changed": the student's last move, followed through, on a card of its
 * own at the foot of the column beside the stage.
 *
 * The same narration as `NarrationStrip`, given the room the strip never had.
 * The strip is one line under the stage that must never grow, so it clipped a
 * long chain from the end — and the end is the effects, which are what a
 * student moved something to find out. The column's width is fixed and its
 * height is its own, so here the chain is read top to bottom, in the order it
 * happened:
 *
 *     Supply of A$ increases                54 → 56
 *     Supply of A$ shifts to the right
 *     Demand for US$ shifts to the right
 *     The A$ depreciates           US$0.63 → US$0.62
 *
 * — what moved, what that did to the curves, and what followed, each in the
 * lesson's words where it has them and each with its numbers. That is the
 * chain a student is asked to write, in the order they are asked to write it.
 *
 * A card rather than part of the instruments, because the question it answers
 * is not theirs. A scenario and a drag on the diagram move the market as much
 * as a slider does, and a chain inside the Explore tab would be gone the moment
 * a student opened Scenarios to apply one; a lesson's step moves it too. So it
 * sits under the tabs, the bottom third of the column whichever is open, and
 * is the same card under all of them.
 *
 * It renders a line and decides nothing, as the strip does, and announces the
 * same sentence for the same event.
 */

export interface NarrationCardProps {
    line: NarrationLine;

    /** A move the diagram would not make (P12), said above the chain. */
    refusal?: string | null;

    /** What the card says when nothing has moved yet. */
    restHint?: string;

    /** Put the diagram back where it was before this interaction. */
    onUndo?: () => void;

    /** Open the maths on `line.whyTarget`. Absent where there is no maths to open. */
    onWhy?: (calc: string) => void;

    /** Where the card sits in its column: the screen's call. */
    className?: string;
}

/**
 * One clause: what it means, or what it is called, then its numbers.
 *
 * Words where the lesson gives them, and then the label is not repeated beside
 * the number — "The A$ appreciates US$0.65 → US$0.70" rather than "The A$
 * appreciates A$1 = US$0.65 → US$0.70", which does not fit and says nothing
 * more. Mid-drag there are no words yet, since a reading has no direction to
 * mean, and the label carries it.
 */
function Row({ clause }: { clause: Clause }) {
    return (
        <div className={classes.row}>
            <span className={classes.words}>{clause.words || clause.label}</span>
            <span className={classes.numbers}>
                {clause.from !== undefined ? (
                    <>
                        <span className={classes.was}>{clause.unit}{clause.from}</span>
                        <span className={classes.arrow}>→</span>
                    </>
                ) : null}
                <span className={classes.now}>{clause.unit}{clause.to}</span>
            </span>
        </div>
    );
}

export function NarrationCard({
    line,
    refusal,
    restHint = 'Drag a curve to see what it changes.',
    onUndo,
    onWhy,
    className
}: NarrationCardProps) {

    const settled = line.kind === 'settled';

    // The chain's three parts, each only when it has something in it. The
    // middle one is the engine's account of what moved on the diagram, and is
    // left out rather than guessed when it could not give one.
    //
    // The first two are about curves, so their markers are drawn in the
    // curves' colour where there is one to draw them in. What followed is the
    // market's answer and no one curve's, and keeps its own.
    const curve = curveColor(line);
    const parts = [
        { part: 'cause', curve, rows: line.causes.map(c => <Row key={c.name} clause={c} />) },
        { part: 'movement', curve, rows: line.movements.map(m => <div key={m} className={classes.movement}>{m}</div>) },
        { part: 'effect', curve: null, rows: line.effects.map(c => <Row key={c.name} clause={c} />) }
    ].filter(p => p.rows.length > 0);

    return (
        <section
            className={className ? `${classes.card} ${className}` : classes.card}
            aria-label="What changed"
            data-kind={line.kind}
            data-refusal={refusal ? 'true' : undefined}
        >
            <div className={classes.head}>
                <span className={classes.eyebrow} aria-hidden="true">What changed</span>
                {/* Undo is the card's one action, in the corner where the
                  * lesson card keeps its own. It moves the numbers back and
                  * nothing else — not the lesson, not which panel is in front. */}
                {settled && onUndo ? (
                    <Button
                        variant="subtle"
                        color="gray"
                        size="compact-xs"
                        leftSection={<IconArrowBackUp size={14} stroke={1.75} />}
                        onClick={onUndo}
                    >
                        Undo
                    </Button>
                ) : null}
            </div>

            <div className={classes.body}>
                {/* The newer news, so first — and beside the chain rather than
                  * in its place, now that there is room for both: a curve that
                  * stopped still moved as far as it could. Hidden from a screen
                  * reader here because the announcement says it, first. */}
                {refusal ? (
                    <p className={classes.note} aria-hidden="true">
                        <IconInfoCircle size={16} stroke={1.75} className={classes.noteIcon} />
                        <span>{refusal}</span>
                    </p>
                ) : null}

                {/* Hidden from assistive technology as the strip's chips are:
                  * read element by element it is a dozen fragments, so it is
                  * announced once, as one sentence, from the live region below. */}
                <div className={classes.chain} data-chain aria-hidden="true">
                    {line.kind === 'rest' ? (
                        refusal ? null : <p className={classes.hint}>{restHint}</p>
                    ) : (
                        <ol className={classes.parts}>
                            {parts.map(p => (
                                <li
                                    key={p.part}
                                    className={classes.part}
                                    data-part={p.part}
                                    style={p.curve ? { '--curve': p.curve } as CSSProperties : undefined}
                                >
                                    {p.rows}
                                </li>
                            ))}
                        </ol>
                    )}
                </div>

                {/* "Why?" is the maths behind the first effect — the one the
                  * lesson ranks first — and is offered only where the maths is
                  * there to open. */}
                {settled && onWhy && line.whyTarget ? (
                    <Anchor
                        component="button"
                        type="button"
                        size="sm"
                        className={classes.why}
                        onClick={() => onWhy(line.whyTarget!)}
                    >
                        Why? See the maths
                        <IconArrowRight size={14} stroke={1.75} aria-hidden="true" />
                    </Anchor>
                ) : null}
            </div>

            {/* Polite, atomic, and only ever written on a settled interaction,
              * exactly as the strip's: a live region fed during a drag reads a
              * hundred fragments at a student who asked for one. */}
            <p className={classes.announcement} role="status" aria-live="polite" aria-atomic="true">
                {announcement(line, refusal)}
            </p>
        </section>
    );
}

import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { Anchor, Button } from '@mantine/core';
import {
    IconArrowBackUp, IconArrowRight, IconChevronDown, IconChevronUp, IconInfoCircle
} from '@tabler/icons-react';
import type { Clause, NarrationLine } from './narration/narrate';
import { announcement, curveColor } from './narration/narrate';
import classes from './NarrationFoot.module.css';

/**
 * "What changed": the student's last move, followed through, at the foot of
 * the card beside the stage — the lesson's, the instruments' or a story's.
 *
 * The same narration as `NarrationStrip`, given the room the strip never had.
 * The strip is one line under the stage that must never grow, so it clipped a
 * long chain from the end — and the end is the effects, which are what a
 * student moved something to find out. In full the chain reads top to bottom,
 * in the order it happened:
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
 * It used to be a card of its own, the column's bottom third, and that was
 * the wrong shape for it: a third of the column held at rest to say "drag a
 * curve", and six lines landing at once in the corner when something moved.
 * So the foot says the chain's two ends — what moved, and what followed first
 * — in a few lines that are the same height whatever they say, between the
 * card's words and its way on, where the eye passes on its way to Next. The
 * whole chain is one press away ("See all 6 changes"), on a sheet that rises
 * from the foot over the card's body, and goes back with "Show less", in the
 * same place.
 *
 * Under every card rather than in one, because the question it answers is not
 * theirs: a scenario, a drag on the diagram and a lesson's step all move the
 * market, and the foot is the same whichever card is above it.
 *
 * It renders a line and decides nothing, as the strip does, and announces the
 * same sentence for the same event.
 */

export interface NarrationFootProps {
    line: NarrationLine;

    /** A move the diagram would not make (P12), said before the chain. */
    refusal?: string | null;

    /** What the foot says when nothing has moved yet. */
    restHint?: string;

    /**
     * Where the student is in what the card above holds: the step, or the
     * open tab. When it changes the sheet goes back down, since what the
     * student moved to is on the card under it.
     */
    place?: unknown;

    /** Put the diagram back where it was before this interaction. */
    onUndo?: () => void;

    /** Open the maths on `line.whyTarget`. Absent where there is no maths to open. */
    onWhy?: (calc: string) => void;
}

/**
 * One clause: what it means, or what it is called, then its numbers.
 *
 * Words where the lesson gives them, and then the label is not repeated beside
 * the number — "The A$ appreciates US$0.65 → US$0.70" rather than "The A$
 * appreciates A$1 = US$0.65 → US$0.70", which does not fit and says nothing
 * more. Mid-drag there are no words yet, since a reading has no direction to
 * mean, and the label carries it.
 *
 * `worded` leaves the numbers off where there are words to say instead: the
 * foot's cause, whose numbers are the slider's own.
 */
function Row({ clause, worded = false }: { clause: Clause; worded?: boolean }) {
    const numbers = !(worded && clause.words);
    return (
        <div className={classes.row}>
            <span className={classes.words}>{clause.words || clause.label}</span>
            {numbers ? (
                <span className={classes.numbers}>
                    {clause.from !== undefined ? (
                        <>
                            <span className={classes.was}>{clause.unit}{clause.from}</span>
                            <span className={classes.arrow}>→</span>
                        </>
                    ) : null}
                    <span className={classes.now}>{clause.unit}{clause.to}</span>
                </span>
            ) : null}
        </div>
    );
}

/**
 * The chain down its rail: what moved, what that did to the curves, what
 * followed. The first two are about curves, so their markers are drawn in the
 * curves' colour where there is one to draw them in; what followed is the
 * market's answer and no one curve's, and keeps its own.
 *
 * `ends` is the foot's: the first cause and the first effect, and nothing
 * between. `arrive` has the parts after the cause come in turn — the curves,
 * then what followed — after a move that happened all at once.
 */
function Chain({ line, ends = false, arrive = false }: { line: NarrationLine; ends?: boolean; arrive?: boolean }) {
    const curve = curveColor(line);
    const causes = ends ? line.causes.slice(0, 1) : line.causes;
    const effects = ends ? line.effects.slice(0, 1) : line.effects;

    // Each part only when it has something in it. The middle one is the
    // engine's account of what moved on the diagram, and is left out rather
    // than guessed when it could not give one.
    const parts = [
        { part: 'cause', curve, rows: causes.map(c => <Row key={c.name} clause={c} worded={ends} />) },
        {
            part: 'movement', curve,
            rows: ends ? [] : line.movements.map(m => <div key={m} className={classes.movement}>{m}</div>)
        },
        { part: 'effect', curve: null, rows: effects.map(c => <Row key={c.name} clause={c} />) }
    ].filter(p => p.rows.length > 0);

    return (
        <ol className={classes.parts} data-arrive={arrive ? 'true' : undefined}>
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
    );
}

/** Every clause the whole chain says, which is what "See all" counts. */
function countOf(line: NarrationLine): number {
    return line.causes.length + line.movements.length + line.effects.length;
}

export function NarrationFoot({
    line,
    refusal,
    restHint = 'Drag a curve to see what it changes.',
    place,
    onUndo,
    onWhy
}: NarrationFootProps) {

    const settled = line.kind === 'settled';
    const sheetId = useId();

    // Each settled line, counted, so the rows come in afresh for a new one and
    // not for a re-render of the same. They come in turn only after a move made
    // all at once — a step, a scenario, Reset — since a drag has already
    // unfolded under the student's hand.
    const [seen, setSeen] = useState({ line, count: 0, arrive: false });
    if (seen.line !== line) {
        setSeen({
            line,
            count: settled ? seen.count + 1 : seen.count,
            arrive: settled && seen.line.kind !== 'live'
        });
    }

    // The sheet: open on a press, and down again on a press of "Show less" or
    // when the student moves on to another step or tab — and on nothing else.
    // A drag on the diagram goes through rest as it starts (the engine's new
    // snapshot, with nothing moved from it yet), then readings, then a chain;
    // the sheet stays up through all of it and says each, as the foot does,
    // since a student who opened it is reading what the next move does.
    const [open, setOpen] = useState(false);
    const [openedAt, setOpenedAt] = useState(0);
    const [where, setWhere] = useState(place);
    if (where !== place) {
        setWhere(place);
        if (open) setOpen(false);
    }

    // Focus follows the press to the toggle in the same place on the other
    // side, so a keyboard keeps its place, or to the foot itself where the
    // chain has gone to rest and there is no "See all" to come back to; when
    // the sheet goes down because the student moved on, focus is on what they
    // pressed, and stays.
    const foot = useRef<HTMLElement>(null);
    const seeAll = useRef<HTMLButtonElement>(null);
    const showLess = useRef<HTMLButtonElement>(null);
    const handOff = useRef(false);
    useEffect(() => {
        if (!handOff.current) return;
        handOff.current = false;
        ((open ? showLess : seeAll).current || foot.current)?.focus();
    }, [open]);

    const toggle = (to: boolean) => {
        handOff.current = true;
        setOpenedAt(seen.count);
        setOpen(to);
    };

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        toggle(false);
    };

    // "See all" where the sheet says more than the foot: a clause between the
    // ends, the cause's numbers, or the maths.
    const count = countOf(line);
    const between = count - Math.min(line.causes.length, 1) - Math.min(line.effects.length, 1);
    const more = settled && (between > 0
        || (line.causes.length > 0 && !!line.causes[0].words)
        || (!!onWhy && !!line.whyTarget));

    const undo = settled && onUndo ? (
        <Button
            variant="subtle"
            color="gray"
            size="compact-xs"
            leftSection={<IconArrowBackUp size={14} stroke={1.75} />}
            onClick={onUndo}
        >
            Undo
        </Button>
    ) : null;

    // A move the diagram would not make: the newer news, so first. On the
    // sheet it is said beside the chain, since a curve that stopped still
    // moved as far as it could; the foot has a few lines, so there it takes
    // the chain's place and the chain is a press away. Hidden from a screen
    // reader because the announcement says it, first.
    const note = refusal ? (
        <p className={classes.note} aria-hidden="true">
            <IconInfoCircle size={16} stroke={1.75} className={classes.noteIcon} />
            <span>{refusal}</span>
        </p>
    ) : null;

    return (
        <section
            ref={foot}
            tabIndex={-1}
            className={classes.foot}
            aria-label="What changed"
            data-kind={line.kind}
            data-refusal={refusal ? 'true' : undefined}
            data-open={open ? 'true' : undefined}
        >
            {/* Under the sheet while it is up, and out of reach there: its
              * Undo and "See all" are the sheet's own now. */}
            <div className={classes.ledge} inert={open} aria-hidden={open ? true : undefined}>
                <div className={classes.head}>
                    <span className={classes.eyebrow} aria-hidden="true">What changed</span>
                    {/* Undo is the foot's one action, in the corner where a
                      * card keeps its own. It moves the numbers back and
                      * nothing else — not the lesson, not which panel is in
                      * front. */}
                    {undo}
                </div>

                <div className={classes.ledgeBody}>
                    {/* Hidden from assistive technology as the strip's chips
                      * are: read element by element it is a dozen fragments,
                      * so it is announced once, as one sentence, from the live
                      * region below. */}
                    <div className={classes.ledgeRows} data-chain aria-hidden="true">
                        {note}
                        {line.kind === 'rest' ? (
                            refusal ? null : <p className={classes.hint}>{restHint}</p>
                        ) : refusal ? null : (
                            <Chain key={seen.count} line={line} ends arrive={seen.arrive} />
                        )}
                    </div>

                    {more ? (
                        <Anchor
                            ref={seeAll}
                            component="button"
                            type="button"
                            size="sm"
                            className={classes.toggle}
                            aria-expanded={false}
                            aria-controls={open ? sheetId : undefined}
                            onClick={() => toggle(true)}
                        >
                            {between > 0 ? `See all ${count} changes` : 'See the numbers'}
                            <IconChevronUp size={14} stroke={1.75} aria-hidden="true" />
                        </Anchor>
                    ) : null}
                </div>
            </div>

            {open ? (
                <div className={classes.sheet} id={sheetId} data-sheet onKeyDown={onKeyDown}>
                    <div className={classes.head}>
                        <span className={classes.eyebrow} aria-hidden="true">What changed</span>
                        {undo}
                    </div>

                    <div className={classes.sheetBody}>
                        {note}
                        <div data-chain aria-hidden="true">
                            {line.kind === 'rest' ? (
                                refusal ? null : <p className={classes.hint}>{restHint}</p>
                            ) : (
                                <Chain
                                    key={seen.count}
                                    line={line}
                                    arrive={seen.arrive && seen.count > openedAt}
                                />
                            )}
                        </div>

                        {/* "Why?" is the maths behind the first effect — the
                          * one the lesson ranks first — and is offered only
                          * where the maths is there to open. */}
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

                    <Anchor
                        ref={showLess}
                        component="button"
                        type="button"
                        size="sm"
                        className={classes.toggle}
                        aria-expanded
                        aria-controls={sheetId}
                        onClick={() => toggle(false)}
                    >
                        Show less
                        <IconChevronDown size={14} stroke={1.75} aria-hidden="true" />
                    </Anchor>
                </div>
            ) : null}

            {/* Polite, atomic, and only ever written on a settled interaction,
              * exactly as the strip's: a live region fed during a drag reads a
              * hundred fragments at a student who asked for one. */}
            <p className={classes.announcement} role="status" aria-live="polite" aria-atomic="true">
                {announcement(line, refusal)}
            </p>
        </section>
    );
}

/**
 * The whole chain on paper, where there is no press to open it: under the
 * diagram, in the order the printed page reads. Nothing on screen, and nothing
 * to a screen reader, which has the foot. At rest there is no chain, and a hint
 * to drag a curve is no use on paper, so it is left off.
 */
export function NarrationPrinted({ line }: { line: NarrationLine }) {
    if (line.kind !== 'settled') return null;
    return (
        <div className={classes.printed} data-printed aria-hidden="true">
            <div className={classes.head}>
                <span className={classes.eyebrow}>What changed</span>
            </div>
            <Chain line={line} />
        </div>
    );
}

import type { ReactNode } from 'react';
import { Drawer, ScrollArea, Tabs } from '@mantine/core';
import type { Instrument, InstrumentFocus, InstrumentProps } from './types';
import classes from './Dock.module.css';

/**
 * One region beside the stage, holding several instruments, one open at a time.
 *
 * The architectural claim is narrow and worth stating exactly: **the stage does
 * not move when the instrument changes.** Not that the dock never affects the
 * stage — it does, and correctly. `Stage` measures its own box, so a dock that
 * occupies space shrinks the stage and the stage re-arranges itself with no one
 * telling it to. What must never happen is the stage twitching because a
 * student switched tabs, and that is bought by the dock being a *fixed width*
 * regardless of what is open. An instrument with a long list scrolls inside its
 * own box.
 *
 * Beside the stage the lesson is a tab here too, ahead of the instruments:
 * Lesson, Explore, Scenarios, Maths. Still one at a time — while the lesson is
 * open no instrument is mounted, so the only controls on screen are the ones a
 * step hands the student — and the card is the same height whichever is open,
 * so moving from one to another hands neither the stage nor "What changed"
 * under it anything to re-arrange for.
 *
 * Below the breakpoint the same instruments are shown in a bottom sheet. The
 * stage is short there and a column beside it would leave neither readable.
 */

/** The lesson's tab, when the dock holds one. */
export const LESSON_TAB = 'lesson';

export interface DockProps {
    instruments: Instrument[];
    /**
     * Which tab is open: an instrument's id, or `LESSON_TAB`. Controlled: P8's
     * "why?" opens Maths from outside, and opening the lesson or leaving it is
     * a move the screen makes, not the dock.
     */
    open: string;
    onOpenChange(id: string): void;

    /**
     * The lesson, as the first tab. Its card brings its own head, body and
     * foot, and scrolls its body between them so Back and Next never scroll
     * away, so it is not put in the instruments' scroll area. Absent in the
     * sheet: on a phone the lesson is under the stage.
     */
    lesson?: ReactNode;

    /** Everything the instruments are handed; see `InstrumentProps`. */
    context: Omit<InstrumentProps, 'focus'>;
    focus?: InstrumentFocus;

    /**
     * Render as a bottom sheet rather than a column.
     *
     * Passed in rather than measured here. The screen already knows its own
     * width — it is what decides whether the dock is rendered beside the stage
     * at all — and a component that measures the viewport a second time is a
     * second answer to the same question.
     */
    sheet?: boolean;
    sheetOpen?: boolean;
    onSheetClose?(): void;

    /** Where the column puts the card and how tall it is: the screen's call. */
    className?: string;
}

function Instruments({ instruments, open, onOpenChange, context, focus, lesson }: {
    instruments: Instrument[];
    open: string;
    onOpenChange(id: string): void;
    context: Omit<InstrumentProps, 'focus'>;
    focus?: InstrumentFocus;
    lesson?: ReactNode;
}) {
    return (
        // `keepMounted={false}` is the "one at a time" claim made literal: an
        // inactive instrument is not in the DOM, so it cannot be read by a
        // screen reader, tabbed into, or found by a test that believes it.
        //
        // `pills` for its geometry only — a rounded tab with no underline — and
        // the colours are this file's: a track with the open tab raised out of
        // it, as the stage's Focus/Grid control is, rather than a blue pill.
        //
        // Not `grow`, which shares the track in equal parts: four names in the
        // column at its narrowest, 320px, do not fit in quarters of it. Each tab is its name's
        // width and the room left over is shared out, which the dock's CSS
        // keeps still by giving the open tab no heavier a weight than the rest.
        <Tabs
            value={open}
            onChange={value => value && onOpenChange(value)}
            keepMounted={false}
            variant="pills"
            classNames={{ root: classes.tabs, list: classes.list, tab: classes.tab }}
        >
            <Tabs.List>
                {lesson ? <Tabs.Tab value={LESSON_TAB}>Lesson</Tabs.Tab> : null}
                {instruments.map(i => (
                    <Tabs.Tab key={i.id} value={i.id} leftSection={i.icon}>
                        {i.label}
                    </Tabs.Tab>
                ))}
            </Tabs.List>

            {lesson ? (
                <Tabs.Panel value={LESSON_TAB} className={`${classes.panel} ${classes.lessonPanel}`}>
                    {lesson}
                </Tabs.Panel>
            ) : null}

            {instruments.map(i => (
                <Tabs.Panel key={i.id} value={i.id} className={classes.panel}>
                    {/* `hover`: a scrollbar when the student is pointing at the
                      * instrument, and none otherwise. `auto` showed one for as
                      * long as the content overflowed at all, so the maths sat
                      * beside a permanent bar for want of fourteen pixels. */}
                    <ScrollArea.Autosize className={classes.scroll} type="hover">
                        <div className={classes.panelInner}>
                            <i.Component
                                {...context}
                                focus={open === i.id ? focus : undefined}
                            />
                        </div>
                    </ScrollArea.Autosize>
                </Tabs.Panel>
            ))}
        </Tabs>
    );
}

export function Dock({
    instruments, open, onOpenChange, context, focus, lesson,
    sheet = false, sheetOpen = false, onSheetClose, className
}: DockProps) {

    const body = (
        <Instruments
            instruments={instruments}
            open={open}
            onOpenChange={onOpenChange}
            context={context}
            focus={focus}
            lesson={sheet ? undefined : lesson}
        />
    );

    if (sheet) {
        return (
            <Drawer
                opened={sheetOpen}
                onClose={() => onSheetClose && onSheetClose()}
                position="bottom"
                size="70%"
                title="Instruments"
                padding="md"
            >
                {body}
            </Drawer>
        );
    }

    return (
        <aside
            className={className ? `${classes.dock} ${className}` : classes.dock}
            aria-label={lesson ? 'Lesson and instruments' : 'Instruments'}
        >
            {body}
        </aside>
    );
}

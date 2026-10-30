import type { ReactNode } from 'react';
import { ScrollArea, Tabs } from '@mantine/core';
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
 * The playground's: a lesson has none beside it, since a student halfway
 * through a question has no use for three ways out of it (docs/design.md,
 * "Pages to come"). The card is the same height whichever is open, and so is
 * "What changed" at its foot, so moving from one to another hands neither the
 * stage nor the foot anything to re-arrange for.
 *
 * On a phone the same card is under the stage, where a lesson's card would
 * be, at the height a lesson's has, tabs and all: there is no lesson to hold
 * the place, and a bottom sheet over the diagram would hide what moving a
 * slider does.
 */

export interface DockProps {
    instruments: Instrument[];
    /**
     * Which instrument is open, by its id. Controlled: P8's "why?" opens
     * Maths from outside.
     */
    open: string;
    onOpenChange(id: string): void;

    /** Everything the instruments are handed; see `InstrumentProps`. */
    context: Omit<InstrumentProps, 'focus'>;
    focus?: InstrumentFocus;

    /** Where the screen puts the card and how tall it is: the screen's call. */
    className?: string;

    /**
     * "What changed", beside the stage: under the open instrument, whichever
     * it is, since a scenario and a slider move the market alike. Its sheet
     * rises over the instrument and not the tabs, so a student can always
     * open another.
     */
    whatChanged?: ReactNode;
}

export function Dock({ instruments, open, onOpenChange, context, focus, className, whatChanged }: DockProps) {
    // `keepMounted={false}` is the "one at a time" claim made literal: an
    // inactive instrument is not in the DOM, so it cannot be read by a screen
    // reader, tabbed into, or found by a test that believes it.
    //
    // `pills` for its geometry only — a rounded tab with no underline — and
    // the colours are this file's: a track with the open tab raised out of it,
    // as the stage's Focus/Grid control is, rather than a blue pill.
    //
    // Not `grow`, which shares the track in equal parts. Each tab is its
    // name's width and the room left over is shared out, which the dock's CSS
    // keeps still by giving the open tab no heavier a weight than the rest.
    //
    // The tabs are on a bar laid over the top of the open instrument, not
    // above it, so what scrolls up passes under them, blurred, rather than
    // being cut off at their edge.
    return (
        <aside className={className ? `${classes.dock} ${className}` : classes.dock} aria-label="Instruments">
            <Tabs
                value={open}
                onChange={value => value && onOpenChange(value)}
                keepMounted={false}
                variant="pills"
                classNames={{ root: classes.tabs, list: classes.list, tab: classes.tab }}
            >
                <div className={classes.bar}>
                    <Tabs.List>
                        {instruments.map(i => (
                            <Tabs.Tab key={i.id} value={i.id} leftSection={i.icon}>
                                {i.label}
                            </Tabs.Tab>
                        ))}
                    </Tabs.List>
                </div>

                <div className={classes.stack}>
                    {instruments.map(i => (
                        <Tabs.Panel key={i.id} value={i.id} className={classes.panel}>
                            {/* `hover`: a scrollbar when the student is pointing at the
                              * instrument, and none otherwise. `auto` showed one for as
                              * long as the content overflowed at all, so the maths sat
                              * beside a permanent bar for want of fourteen pixels. */}
                            <ScrollArea.Autosize
                                className={classes.scroll}
                                classNames={{ viewport: classes.viewport, scrollbar: classes.scrollbar }}
                                type="hover"
                            >
                                <div className={classes.panelInner}>
                                    <i.Component
                                        {...context}
                                        focus={open === i.id ? focus : undefined}
                                    />
                                </div>
                            </ScrollArea.Autosize>
                        </Tabs.Panel>
                    ))}

                    {whatChanged}
                </div>
            </Tabs>
        </aside>
    );
}

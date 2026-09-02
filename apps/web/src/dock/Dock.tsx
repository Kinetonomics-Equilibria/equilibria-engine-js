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
 * Below the breakpoint the same instruments are shown in a bottom sheet. The
 * stage is short there and a column beside it would leave neither readable.
 */

export interface DockProps {
    instruments: Instrument[];
    /** Which instrument is open. Controlled: P8's "why?" opens Maths from outside. */
    open: string;
    onOpenChange(id: string): void;

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
}

function Instruments({ instruments, open, onOpenChange, context, focus }: {
    instruments: Instrument[];
    open: string;
    onOpenChange(id: string): void;
    context: Omit<InstrumentProps, 'focus'>;
    focus?: InstrumentFocus;
}) {
    return (
        // `keepMounted={false}` is the "one at a time" claim made literal: an
        // inactive instrument is not in the DOM, so it cannot be read by a
        // screen reader, tabbed into, or found by a test that believes it.
        <Tabs
            value={open}
            onChange={value => value && onOpenChange(value)}
            keepMounted={false}
            className={classes.tabs}
        >
            <Tabs.List>
                {instruments.map(i => (
                    <Tabs.Tab key={i.id} value={i.id} leftSection={i.icon}>
                        {i.label}
                    </Tabs.Tab>
                ))}
            </Tabs.List>

            {instruments.map(i => (
                <Tabs.Panel key={i.id} value={i.id} className={classes.panel}>
                    <ScrollArea.Autosize className={classes.scroll} type="auto">
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
    instruments, open, onOpenChange, context, focus,
    sheet = false, sheetOpen = false, onSheetClose
}: DockProps) {

    const body = (
        <Instruments
            instruments={instruments}
            open={open}
            onOpenChange={onOpenChange}
            context={context}
            focus={focus}
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
        <aside className={classes.dock} aria-label="Instruments">
            {body}
        </aside>
    );
}

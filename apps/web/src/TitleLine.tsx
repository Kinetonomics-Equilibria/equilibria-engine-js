import { useState } from 'react';
import { ActionIcon, Divider, Menu, Title, Tooltip } from '@mantine/core';
import { IconDots, IconEye, IconLayoutGrid, IconPresentation, IconRotate } from '@tabler/icons-react';
import type { StageMode } from 'equilibria-react';
import { canPresent, togglePresenting, usePresenting } from './present';
import { ShareItems, ShareMenu } from './ShareMenu';
import type { ShareActions } from './ShareMenu';
import classes from './TitleLine.module.css';

/**
 * The lesson's title, and at its end the tools that act on the whole stage.
 *
 * The arrangement, a hairline, Reset, Present, then Share at the far end,
 * because it is the page's rather than the stage's: the order the design
 * language keeps for them (`docs/design.md`). Not over the stage, where a tool
 * lands on a panel's caption, and not in the side column, whose cards each
 * answer a question none of these answers.
 *
 * Every tool is a borderless icon with its name as its tooltip, so the line
 * is as wide whatever the lesson, and only the title is ever cut.
 *
 * On a phone there is no room for the row: the arrangement stays, and a `⋯`
 * beside it holds Reset and Share's items. Present and the QR code are not
 * among them: a phone is not what a class watches.
 */

export interface TitleLineProps {
    title: string;
    mode: StageMode;
    onModeChange(mode: StageMode): void;
    /** A sheet is over the stage, so there is nothing to arrange or reset. */
    covered: boolean;
    /** Whether Reset would move anything. Greyed, not hidden, when it would not. */
    canReset: boolean;
    onReset(): void;
    /** No column beside the stage: the tools go into the `⋯`. */
    stacked: boolean;
    /** The instruments' door, where the dock is a sheet with no edge to grab. */
    onOpenInstruments?: () => void;
    /** What Share hands out, and how. */
    share: ShareActions;
}

const ICON = { size: 16, stroke: 1.75 };

/** Every tool on the line: an icon with no border, as tall as an `xs` input. */
const TOOL = { variant: 'subtle', color: 'gray', size: 'input-xs', className: classes.tool } as const;

/** Each arrangement's name and icon, and the one a press turns it into. */
const ARRANGEMENTS = {
    focus: { name: 'Focus', Icon: IconEye, other: 'grid' },
    grid: { name: 'Grid', Icon: IconLayoutGrid, other: 'focus' }
} as const satisfies Record<StageMode, { name: string; Icon: typeof IconEye; other: StageMode }>;

/**
 * Focus or Grid, as one icon: the arrangement the stage is in, which a press
 * turns into the other. Its tooltip names both, and its label says what it
 * does, so a screen reader hears the press rather than the state.
 */
function Arrangement({ mode, onModeChange, disabled }: {
    mode: StageMode;
    onModeChange(mode: StageMode): void;
    disabled: boolean;
}) {
    const here = ARRANGEMENTS[mode], there = ARRANGEMENTS[here.other];
    return (
        <Tooltip
            label={<>{here.name} <span className={classes.hint}>Switch to {there.name}</span></>}
            withArrow
            transitionProps={{ duration: 0 }}
        >
            <ActionIcon
                {...TOOL}
                aria-label={`Switch to ${there.name}`}
                disabled={disabled}
                onClick={() => onModeChange(here.other)}
            >
                <here.Icon {...ICON} />
            </ActionIcon>
        </Tooltip>
    );
}

export function TitleLine({
    title, mode, onModeChange, covered, canReset, onReset, stacked, onOpenInstruments, share
}: TitleLineProps) {
    const resetDisabled = covered || !canReset;
    const presenting = usePresenting();
    const [more, setMore] = useState(false);

    return (
        <div className={classes.line} data-stacked={stacked || undefined}>
            <Title order={2} size="h4" className={classes.title}>{title}</Title>
            <div className={classes.tools}>
                {/* Disabled under a sheet, where there is nothing to arrange —
                  * and not hidden, so nothing on the line moves. Reset, beside
                  * it, is disabled there too. */}
                <Arrangement mode={mode} onModeChange={onModeChange} disabled={covered} />
                {stacked ? (
                    <Menu opened={more} onChange={setMore} position="bottom-end" shadow="sm" width={260}>
                        <Menu.Target>
                            <ActionIcon {...TOOL} aria-label="More">
                                <IconDots {...ICON} />
                            </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Item
                                leftSection={<IconRotate {...ICON} />}
                                disabled={resetDisabled}
                                onClick={onReset}
                            >
                                Reset
                            </Menu.Item>
                            <Menu.Divider />
                            <ShareItems {...share} opensAt="view" phone onDone={() => setMore(false)} />
                        </Menu.Dropdown>
                    </Menu>
                ) : (
                    <>
                        <Divider orientation="vertical" className={classes.hairline} />
                        <Tooltip label="Reset" withArrow transitionProps={{ duration: 0 }}>
                            <ActionIcon {...TOOL} aria-label="Reset" disabled={resetDisabled} onClick={onReset}>
                                <IconRotate {...ICON} />
                            </ActionIcon>
                        </Tooltip>
                        {/* The page full screen with the rail put away, and
                          * pressed until the browser says it is not: Esc, which
                          * the browser takes for itself, or this again. Still
                          * works under a sheet — a cover is worth showing a
                          * class. Not offered where the browser cannot. */}
                        {canPresent() ? (
                            <Tooltip label="Present to a class" withArrow transitionProps={{ duration: 0 }}>
                                <ActionIcon
                                    {...TOOL}
                                    variant={presenting ? 'light' : 'subtle'}
                                    color={presenting ? undefined : 'gray'}
                                    aria-label="Present to a class"
                                    aria-pressed={presenting}
                                    onClick={togglePresenting}
                                >
                                    <IconPresentation {...ICON} />
                                </ActionIcon>
                            </Tooltip>
                        ) : null}
                        {/* Works under a sheet: a cover is worth a link too. */}
                        <ShareMenu {...share} />
                    </>
                )}
                {/* Where the dock is a sheet it has no permanent edge to grab,
                  * so it needs a door. On a wide screen the dock is simply
                  * there, and while a lesson runs there are no instruments. */}
                {onOpenInstruments ? (
                    <ActionIcon {...TOOL} aria-label="Open instruments" onClick={onOpenInstruments}>
                        &#9776;
                    </ActionIcon>
                ) : null}
            </div>
        </div>
    );
}

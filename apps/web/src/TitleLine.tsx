import { useState } from 'react';
import type { CSSProperties } from 'react';
import { ActionIcon, Divider, Menu, Text, Title, Tooltip } from '@mantine/core';
import {
    IconDots, IconExternalLink, IconEye, IconLayoutGrid, IconPresentation, IconRotate
} from '@tabler/icons-react';
import type { StageMode } from 'equilibria-react';
import type { LessonTopic } from './lessons';
import { canPresent, togglePresenting, usePresenting } from './present';
import { ShareItems, ShareMenu } from './ShareMenu';
import type { ShareActions } from './ShareMenu';
import classes from './TitleLine.module.css';

/**
 * The page's title under its topic — a lesson's, or a model's in the
 * playground — and at its end the tools that act on the whole stage, in one
 * capsule.
 *
 * The arrangement and Reset, a hairline, then Present and Share at the far
 * end, because it is the page's rather than the stage's: the order the design
 * language keeps for them (`docs/design.md`). The hairline parts what a sheet
 * over the stage disables from what still works under one. Not over the stage, where a tool
 * lands on a panel's caption, and not in the side column, whose cards each
 * answer a question none of these answers.
 *
 * Every tool is a borderless icon with its name as its tooltip, so the line
 * is as wide whatever the lesson, and only the title is ever cut.
 *
 * On a phone there is no room for the row: the arrangement stays, and a `⋯`
 * beside it holds Reset and Share's items. Present and the QR code are not
 * among them: a phone is not what a class watches.
 *
 * In an embed, Share is "Open in Kinetonomics": the app at this view, in a
 * tab of its own. What leaves the screen there is the other site's to offer.
 */

/** What the line names of the topic a lesson, or a model's first lesson, is listed under. */
export type TitleTopic = Pick<LessonTopic, 'label' | 'color'>;

export interface TitleLineProps {
    title: string;
    /** The topic over the title, with its dot. Without one, the title stands alone. */
    topic?: TitleTopic | null;
    /** A story's day, in words, after its topic: a story is true of its day, so it is said first. */
    date?: string;
    mode: StageMode;
    onModeChange(mode: StageMode): void;
    /** A sheet is over the stage, so there is nothing to arrange or reset. */
    covered: boolean;
    /** Whether Reset would move anything. Greyed, not hidden, when it would not. */
    canReset: boolean;
    onReset(): void;
    /** No column beside the stage: the tools go into the `⋯`. */
    stacked: boolean;
    /** What Share hands out, and how. */
    share?: ShareActions;
    /** In an embed, in Share's place: this view's address in the app, whole. */
    openIn?: string;
}

const ICON = { size: 16, stroke: 1.75 };

/** A tool's glyph, larger than a menu item's: with no border, it is all there is of the tool. */
const GLYPH = { size: 20, stroke: 1.75 };

/**
 * Every tool on the line: an icon with no border, as tall as an `xs` input,
 * and round inside the capsule. Share's own button (`ShareMenu`) matches it.
 */
const TOOL = { variant: 'subtle', color: 'gray', size: 'input-xs', radius: 'xl', className: classes.tool } as const;

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
                <here.Icon {...GLYPH} />
            </ActionIcon>
        </Tooltip>
    );
}

/** Reset, as an icon with its name as its tooltip. */
function ResetTool({ disabled, onReset }: { disabled: boolean; onReset(): void }) {
    return (
        <Tooltip label="Reset" withArrow transitionProps={{ duration: 0 }}>
            <ActionIcon {...TOOL} aria-label="Reset" disabled={disabled} onClick={onReset}>
                <IconRotate {...GLYPH} />
            </ActionIcon>
        </Tooltip>
    );
}

/** What an embed's way back to the app is called, wherever it is. */
export const OPEN_IN = 'Open in Kinetonomics';

/**
 * The arrangement and Reset alone, in their capsule: under a diagram embedded
 * on its own, which has no title line to hold them.
 */
export function StageTools({ mode, onModeChange, covered, canReset, onReset }: Pick<
    TitleLineProps, 'mode' | 'onModeChange' | 'covered' | 'canReset' | 'onReset'
>) {
    return (
        <div className={classes.tools}>
            <Arrangement mode={mode} onModeChange={onModeChange} disabled={covered} />
            <ResetTool disabled={covered || !canReset} onReset={onReset} />
        </div>
    );
}

export function TitleLine({
    title, topic, date, mode, onModeChange, covered, canReset, onReset, stacked, share, openIn
}: TitleLineProps) {
    const resetDisabled = covered || !canReset;
    const presenting = usePresenting();
    const [more, setMore] = useState(false);

    return (
        <div className={classes.line} data-stacked={stacked || undefined}>
            <div className={classes.heading}>
                {/* The dot the Lessons panel draws before the topic's name, in
                  * the topic's colour, so the two read as one place. A
                  * story's day follows, on the same small line. */}
                {topic || date ? (
                    <Text
                        size="xs"
                        c="dimmed"
                        className={classes.topic}
                        style={topic ? { '--topic-color': `var(--mantine-color-${topic.color}-filled)` } as CSSProperties
                            : undefined}
                    >
                        {topic ? <span className={classes.dot} aria-hidden /> : null}
                        {topic ? topic.label : null}
                        {topic && date ? <span aria-hidden>·</span> : null}
                        {date ? <span>{date}</span> : null}
                    </Text>
                ) : null}
                <Title order={2} size="h4" className={classes.title}>{title}</Title>
            </div>
            <div className={classes.tools}>
                {/* Disabled under a sheet, where there is nothing to arrange —
                  * and not hidden, so nothing on the line moves. Reset, beside
                  * it, is disabled there too. */}
                <Arrangement mode={mode} onModeChange={onModeChange} disabled={covered} />
                {stacked ? (
                    <Menu opened={more} onChange={setMore} position="bottom-end" shadow="sm" width={260}>
                        <Menu.Target>
                            <ActionIcon {...TOOL} aria-label="More">
                                <IconDots {...GLYPH} />
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
                            {share ? <ShareItems {...share} phone onDone={() => setMore(false)} /> : null}
                            {openIn ? (
                                <Menu.Item
                                    component="a"
                                    href={openIn}
                                    target="_blank"
                                    rel="noopener"
                                    leftSection={<IconExternalLink {...ICON} />}
                                >
                                    {OPEN_IN}
                                </Menu.Item>
                            ) : null}
                        </Menu.Dropdown>
                    </Menu>
                ) : (
                    <>
                        <ResetTool disabled={resetDisabled} onReset={onReset} />
                        <Divider orientation="vertical" className={classes.hairline} />
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
                                    <IconPresentation {...GLYPH} />
                                </ActionIcon>
                            </Tooltip>
                        ) : null}
                        {/* Works under a sheet: a cover is worth a link too. In
                          * an embed, the way to the app at this view instead: a
                          * real link, so it opens in a tab of its own and the
                          * page the embed is on stays where it was. */}
                        {share ? <ShareMenu {...share} /> : null}
                        {openIn ? (
                            <Tooltip label={OPEN_IN} withArrow transitionProps={{ duration: 0 }}>
                                <ActionIcon
                                    {...TOOL}
                                    component="a"
                                    href={openIn}
                                    target="_blank"
                                    rel="noopener"
                                    aria-label={OPEN_IN}
                                >
                                    <IconExternalLink {...GLYPH} />
                                </ActionIcon>
                            </Tooltip>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    );
}

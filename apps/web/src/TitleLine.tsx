import { useLayoutEffect, useRef, useState } from 'react';
import { ActionIcon, Button, Divider, Menu, SegmentedControl, Title } from '@mantine/core';
import { IconDots, IconRotate } from '@tabler/icons-react';
import type { StageMode } from 'equilibria-react';
import classes from './TitleLine.module.css';

/**
 * The lesson's title, and at its end the tools that act on the whole stage.
 *
 * Focus | Grid, a hairline, then Reset: the order the design language keeps
 * for them ("Reserved for later" in `docs/design.md`), so that Present and
 * Share land after Reset without moving it. Not over the stage, where a tool
 * lands on a panel's caption, and not in the side column, whose cards each
 * answer a question none of these answers.
 *
 * On a phone there is no room for the row: Focus | Grid stays, and a `⋯`
 * beside it holds the rest.
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
}

const ICON = { size: 16, stroke: 1.75 };

/**
 * Whether the tools' names fit on the line beside the whole title.
 *
 * Where the line runs short the names go before anything wraps, so the line
 * keeps its height and the stage its size. Measured rather than set at a
 * breakpoint, because what fits depends on the title and every lesson has its
 * own: the A$ lesson's has 9px to spare at 900px without Reset, and Air
 * Jordans' a good deal more.
 *
 * The tools are measured with their names, and that width is kept while they
 * are hidden, so the answer does not change because it was given. The title
 * never wraps — `scrollWidth` is its whole length — and where even the names'
 * going leaves it short, it is cut with an ellipsis rather than taking a second
 * line out of the stage.
 */
function useNamesFit(stacked: boolean) {
    const line = useRef<HTMLDivElement>(null);
    const heading = useRef<HTMLHeadingElement>(null);
    const tools = useRef<HTMLDivElement>(null);
    const toolsNamed = useRef(0);
    const [named, setNamed] = useState(true);

    useLayoutEffect(() => {
        const row = line.current, title = heading.current, kit = tools.current;
        if (stacked || !row || !title || !kit) return;

        const fit = () => {
            if (named) toolsNamed.current = kit.offsetWidth;
            const style = getComputedStyle(row),
                px = (value: string) => parseFloat(value) || 0,
                room = row.clientWidth - px(style.paddingInlineStart) - px(style.paddingInlineEnd)
                    - px(style.columnGap);
            // A pixel for `scrollWidth`'s rounding, which would otherwise cut
            // the title's last letter at the width the names went at.
            setNamed(title.scrollWidth + 1 + toolsNamed.current <= room);
        };
        fit();
        const observer = new ResizeObserver(fit);
        observer.observe(row);
        return () => observer.disconnect();
    }, [stacked, named]);

    return { line, heading, tools, named };
}

export function TitleLine({
    title, mode, onModeChange, covered, canReset, onReset, stacked, onOpenInstruments
}: TitleLineProps) {
    const { line, heading, tools, named } = useNamesFit(stacked);
    const resetDisabled = covered || !canReset;

    return (
        <div ref={line} className={classes.line} data-stacked={stacked || undefined}>
            <Title ref={heading} order={2} size="h4" className={classes.title}>{title}</Title>
            <div ref={tools} className={classes.tools}>
                {/* Disabled under a sheet, where there is nothing to arrange —
                  * and not hidden, so the line keeps its height and the stage
                  * its size. Reset, beside it, is disabled there too. */}
                <SegmentedControl
                    size="xs"
                    disabled={covered}
                    value={mode}
                    onChange={value => onModeChange(value as StageMode)}
                    data={[{ label: 'Focus', value: 'focus' }, { label: 'Grid', value: 'grid' }]}
                    aria-label="Panel arrangement"
                />
                {stacked ? (
                    <Menu position="bottom-end" shadow="sm">
                        <Menu.Target>
                            <ActionIcon variant="default" size="input-xs" aria-label="More">
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
                        </Menu.Dropdown>
                    </Menu>
                ) : (
                    <>
                        <Divider orientation="vertical" className={classes.hairline} />
                        {named ? (
                            <Button
                                variant="default"
                                size="xs"
                                leftSection={<IconRotate {...ICON} />}
                                disabled={resetDisabled}
                                onClick={onReset}
                            >
                                Reset
                            </Button>
                        ) : (
                            <ActionIcon
                                variant="default"
                                size="input-xs"
                                aria-label="Reset"
                                disabled={resetDisabled}
                                onClick={onReset}
                            >
                                <IconRotate {...ICON} />
                            </ActionIcon>
                        )}
                    </>
                )}
                {/* Where the dock is a sheet it has no permanent edge to grab,
                  * so it needs a door. On a wide screen the dock is simply
                  * there, and while a lesson runs there are no instruments. */}
                {onOpenInstruments ? (
                    <ActionIcon
                        variant="default"
                        size="input-xs"
                        aria-label="Open instruments"
                        onClick={onOpenInstruments}
                    >
                        &#9776;
                    </ActionIcon>
                ) : null}
            </div>
        </div>
    );
}

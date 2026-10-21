import { useState } from 'react';
import { Button } from '@mantine/core';
import { useReducedMotion } from '@mantine/hooks';
import { IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react';
import { StageSheet } from './StageSheet';
import type { Picture } from './lessons/content';
import classes from './PictureSheet.module.css';

/**
 * A step's picture, across the whole stage.
 *
 * The step's words are on the lesson card, as every step's are; this is what
 * the diagram would have shown, had a diagram been able to show it. Its head
 * names it, and carries Pause when the picture moves.
 *
 * A picture that moves is an animated image, which an `<img>` cannot pause, so
 * pausing is showing its `still` instead, and playing is showing the moving one
 * again from its start — the `key` remounts the image, so it restarts rather
 * than resuming wherever the browser's clock left it. A student who has asked
 * for less motion starts on the still, read before the first paint so that not
 * one frame moves first; the button is still there if they want it to move.
 *
 * Mounted per picture (`key` at the call site), so the next picture starts as
 * the student's motion setting says, not as they left the last one.
 */
export interface PictureSheetProps {
    picture: Picture;
}

export function PictureSheet({ picture }: PictureSheetProps) {
    const calm = useReducedMotion(false, { getInitialValueInEffect: false });
    const [playing, setPlaying] = useState(!calm);
    const moves = !!picture.still;
    const showing = moves && !playing ? picture.still! : picture.src;

    return (
        <StageSheet
            label={picture.name}
            eyebrow={picture.name}
            action={moves ? (
                <Button
                    className={classes.toggle}
                    variant="subtle"
                    color="gray"
                    size="compact-xs"
                    leftSection={playing
                        ? <IconPlayerPause size={14} stroke={1.75} />
                        : <IconPlayerPlay size={14} stroke={1.75} />}
                    aria-label={playing ? 'Pause the animation' : 'Play the animation'}
                    onClick={() => setPlaying(p => !p)}
                >
                    {playing ? 'Pause' : 'Play'}
                </Button>
            ) : null}
        >
            <img
                key={showing}
                className={classes.picture}
                src={showing}
                alt={picture.alt}
                decoding="async"
            />
        </StageSheet>
    );
}

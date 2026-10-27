import { useState } from 'react';
import { ActionIcon, Menu, Tooltip } from '@mantine/core';
import {
    IconCheck, IconCode, IconLink, IconPhotoDown, IconPrinter, IconQrcode, IconSend, IconShare2
} from '@tabler/icons-react';
import { copyText, typedLink } from './share';
import classes from './ShareMenu.module.css';

/**
 * Share: one menu for everything that leaves the screen, at the far end of the
 * title line because it is the page's rather than the stage's.
 *
 * The link and the QR code open the lesson at its start: what a class needs
 * is the lesson, and the view is in the address bar for anyone who wants it.
 * The picture and the page are always this view. Each item is its name and
 * nothing under it; an item that has done its job says so in its name, and
 * one the browser refused says why under it. The menu is as wide whatever
 * it says, and the line it is on never changes width, so nothing moves.
 *
 * On a phone the same items sit in the title line's `⋯`, less the QR code,
 * which is for a board, and with the phone's own share sheet beside Copy link.
 */

const ICON = { size: 16, stroke: 1.75 };

/** Share's own glyph, as large as the title line's other tools'. */
const GLYPH = { size: 20, stroke: 1.75 };

export interface ShareActions {
    /** The link Share hands out, whole: the lesson's, at its start. */
    link: string;
    /** The lesson's title, for a phone's share sheet. */
    title: string;
    /** Put a QR code for the link over the stage. */
    onShowQr(): void;
    /** Open the embed dialog, which asks where the embed opens. Not offered without it, nor on a phone. */
    onEmbed?: () => void;
    /** Draw the stage and download it. Absent while a sheet hides the diagram. */
    onDownload?: () => Promise<void>;
    /** Print the view. Absent while a sheet hides the diagram. */
    onPrint?: () => void;
}

/** An item's name, and under it what went wrong, only when something did. */
function Named({ name, trouble }: { name: string; trouble: string | null }) {
    if (!trouble) return <>{name}</>;
    return (
        <>
            <span className={classes.name}>{name}</span>
            <span className={classes.trouble}>{trouble}</span>
        </>
    );
}

/** Where a phone has a share sheet of its own to hand a link to. */
const canSend = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function';

interface ShareItemsProps extends ShareActions {
    phone: boolean;
    /** Put the menu away: once a picture has been drawn and saved. */
    onDone(): void;
}

/**
 * The items, for either menu. Mounted with the menu's dropdown, so what one
 * says it has done is forgotten when the menu is put away.
 */
export function ShareItems({
    link, title, onShowQr, onEmbed, onDownload, onPrint, phone, onDone
}: ShareItemsProps) {
    const [copied, setCopied] = useState<'yes' | 'no' | null>(null);
    const [drawing, setDrawing] = useState<'now' | 'failed' | null>(null);

    const copy = () => {
        copyText(link).then(() => setCopied('yes'), () => setCopied('no'));
    };

    // Kept open while it draws, which can take a moment, so it can say so —
    // and say so if the browser will not.
    const download = () => {
        if (!onDownload || drawing === 'now') return;
        setDrawing('now');
        onDownload().then(onDone, () => setDrawing('failed'));
    };

    return (
        <>
            <Menu.Item
                leftSection={copied === 'yes' ? <IconCheck {...ICON} /> : <IconLink {...ICON} />}
                closeMenuOnClick={false}
                onClick={copy}
            >
                <Named
                    name={copied === 'yes' ? 'Copied' : 'Copy link'}
                    trouble={copied === 'no' ? `This browser would not copy it. It is ${typedLink(link)}` : null}
                />
            </Menu.Item>
            {phone ? (
                canSend() ? (
                    <Menu.Item
                        leftSection={<IconSend {...ICON} />}
                        onClick={() => { navigator.share({ title, url: link }).catch(() => undefined); }}
                    >
                        Send with…
                    </Menu.Item>
                ) : null
            ) : (
                <>
                    <Menu.Item leftSection={<IconQrcode {...ICON} />} onClick={onShowQr}>
                        Show a QR code
                    </Menu.Item>
                    {onEmbed ? (
                        <Menu.Item leftSection={<IconCode {...ICON} />} onClick={onEmbed}>
                            Embed…
                        </Menu.Item>
                    ) : null}
                </>
            )}
            <Menu.Divider />
            <Menu.Item
                leftSection={<IconPhotoDown {...ICON} />}
                rightSection={<span className={classes.format}>PNG</span>}
                disabled={!onDownload}
                closeMenuOnClick={false}
                onClick={download}
            >
                <Named
                    name={drawing === 'now' ? 'Drawing it…' : 'Download the diagram'}
                    trouble={drawing === 'failed' ? 'This browser would not draw it. Print can save a PDF.' : null}
                />
            </Menu.Item>
            <Menu.Item leftSection={<IconPrinter {...ICON} />} disabled={!onPrint} onClick={onPrint}>
                Print or save as PDF
            </Menu.Item>
        </>
    );
}

/** Share, on the title line beside the stage: a borderless icon, as the line's other tools are. */
export function ShareMenu(actions: ShareActions) {
    const [opened, setOpened] = useState(false);

    return (
        <Menu opened={opened} onChange={setOpened} position="bottom-end" shadow="sm" width={260}>
            <Tooltip label="Share" withArrow transitionProps={{ duration: 0 }} disabled={opened}>
                <Menu.Target>
                    <ActionIcon variant="subtle" color="gray" size="input-xs" radius="xl" aria-label="Share">
                        <IconShare2 {...GLYPH} />
                    </ActionIcon>
                </Menu.Target>
            </Tooltip>
            <Menu.Dropdown>
                <ShareItems {...actions} phone={false} onDone={() => setOpened(false)} />
            </Menu.Dropdown>
        </Menu>
    );
}

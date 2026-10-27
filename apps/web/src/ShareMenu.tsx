import { useState } from 'react';
import { ActionIcon, Button, Menu, SegmentedControl, Tooltip } from '@mantine/core';
import { IconCheck, IconLink, IconPhotoDown, IconPrinter, IconQrcode, IconSend, IconShare2 } from '@tabler/icons-react';
import { typedLink } from './share';
import classes from './ShareMenu.module.css';

/**
 * Share: one menu for everything that leaves the screen, at the far end of the
 * title line because it is the page's rather than the stage's.
 *
 * The link and the QR code open at this view or at the start of the lesson,
 * as the student chooses at the top; the picture and the page are always this
 * view. Each item says under its name what it does, and says it again when it
 * has done it, in the item: the line it is on never changes width, so nothing
 * on it moves.
 *
 * On a phone the same items sit in the title line's `⋯`, less the QR code,
 * which is for a board, and with the phone's own share sheet beside Copy link.
 */

export type OpensAt = 'view' | 'start';

const ICON = { size: 16, stroke: 1.75 };

export interface ShareActions {
    /** The links Share hands out, whole: this view's, and the lesson's start. */
    links: Record<OpensAt, string>;
    /** The lesson's title, for a phone's share sheet. */
    title: string;
    /** Put a QR code for one of the links over the stage. */
    onShowQr(opensAt: OpensAt): void;
    /** Draw the stage and download it. Absent while a sheet hides the diagram. */
    onDownload?: () => Promise<void>;
    /** Print the view. Absent while a sheet hides the diagram. */
    onPrint?: () => void;
}

/** An item's name, and what it does under it. */
function Says({ name, says }: { name: string; says: string }) {
    return (
        <>
            <span className={classes.name}>{name}</span>
            <span className={classes.says}>{says}</span>
        </>
    );
}

/** Where a phone has a share sheet of its own to hand a link to. */
const canSend = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function';

/**
 * Onto the clipboard, by the browser's clipboard if it will, and by the older
 * way of selecting text and copying it if not: a page in another site's frame
 * is often refused the first and allowed the second.
 */
async function copyText(text: string): Promise<void> {
    try {
        await navigator.clipboard.writeText(text);
        return;
    } catch {
        const field = document.createElement('textarea');
        field.value = text;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand('copy');
        field.remove();
        if (!copied) throw new Error('The browser would not copy the link.');
    }
}

interface ShareItemsProps extends ShareActions {
    opensAt: OpensAt;
    phone: boolean;
    /** Put the menu away: once a picture has been drawn and saved. */
    onDone(): void;
}

/**
 * The items, for either menu. Mounted with the menu's dropdown, so what one
 * says it has done is forgotten when the menu is put away.
 */
export function ShareItems({
    links, title, onShowQr, onDownload, onPrint, opensAt, phone, onDone
}: ShareItemsProps) {
    const link = links[opensAt];
    const [copied, setCopied] = useState<'yes' | 'no' | null>(null);
    const [drawing, setDrawing] = useState<'now' | 'failed' | null>(null);
    const hidden = 'When the diagram is back on screen';

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
                <Says
                    name="Copy link"
                    says={copied === 'yes' ? 'Copied. Paste it wherever it is going.'
                        : copied === 'no' ? `This browser would not copy it. It is ${typedLink(link)}`
                            : 'To paste into a message or the class page'}
                />
            </Menu.Item>
            {phone ? (
                canSend() ? (
                    <Menu.Item
                        leftSection={<IconSend {...ICON} />}
                        onClick={() => { navigator.share({ title, url: link }).catch(() => undefined); }}
                    >
                        <Says name="Send with…" says="Through an app on this phone" />
                    </Menu.Item>
                ) : null
            ) : (
                <Menu.Item leftSection={<IconQrcode {...ICON} />} onClick={() => onShowQr(opensAt)}>
                    <Says name="Show a QR code" says="For a class to scan from the board" />
                </Menu.Item>
            )}
            <Menu.Divider />
            <Menu.Item
                leftSection={<IconPhotoDown {...ICON} />}
                rightSection={<span className={classes.format}>PNG</span>}
                disabled={!onDownload}
                closeMenuOnClick={false}
                onClick={download}
            >
                <Says
                    name="Download the diagram"
                    says={!onDownload ? hidden
                        : drawing === 'now' ? 'Drawing it…'
                            : drawing === 'failed' ? 'This browser would not draw it. Print can save a PDF.'
                                : 'For notes, slides or an assignment'}
                />
            </Menu.Item>
            <Menu.Item leftSection={<IconPrinter {...ICON} />} disabled={!onPrint} onClick={onPrint}>
                <Says
                    name="Print or save as PDF"
                    says={onPrint ? 'The diagram, its settings and what changed' : hidden}
                />
            </Menu.Item>
        </>
    );
}

/** Share, on the title line beside the stage: its name, or its icon where the line runs short. */
export function ShareMenu({ named, ...actions }: ShareActions & { named: boolean }) {
    const [opened, setOpened] = useState(false);
    const [opensAt, setOpensAt] = useState<OpensAt>('view');

    const button = named ? (
        <Button variant="default" size="xs" leftSection={<IconShare2 {...ICON} />}>Share</Button>
    ) : (
        <ActionIcon variant="default" size="input-xs" aria-label="Share">
            <IconShare2 {...ICON} />
        </ActionIcon>
    );

    return (
        <Menu opened={opened} onChange={setOpened} position="bottom-end" shadow="sm" width={310}>
            <Tooltip label="Share" withArrow transitionProps={{ duration: 0 }} disabled={named || opened}>
                <Menu.Target>{button}</Menu.Target>
            </Tooltip>
            <Menu.Dropdown>
                <Menu.Label>The link and QR code open at</Menu.Label>
                <SegmentedControl
                    className={classes.opensAt}
                    fullWidth
                    size="xs"
                    value={opensAt}
                    onChange={value => setOpensAt(value as OpensAt)}
                    data={[{ label: 'This view', value: 'view' }, { label: 'The start of the lesson', value: 'start' }]}
                    aria-label="The link and QR code open at"
                />
                <Menu.Divider />
                {/* Keyed by what it opens at, so "Copied" is about the link it copied. */}
                <ShareItems
                    key={opensAt}
                    {...actions}
                    opensAt={opensAt}
                    phone={false}
                    onDone={() => setOpened(false)}
                />
            </Menu.Dropdown>
        </Menu>
    );
}

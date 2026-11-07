import { useState } from 'react';
import { Button, Group, Modal, Radio, Stack, Text, Textarea } from '@mantine/core';
import { IconCheck, IconCopy, IconExternalLink } from '@tabler/icons-react';
import type { EmbedLayout, Place } from './links';
import { EMBED_SIZE, copyText, embedCode, linkHref } from './share';
import classes from './EmbedDialog.module.css';

/**
 * Embed…: the code to put this page, or its diagram, in another site's page —
 * a class page, most often — and where it opens.
 *
 * Share's link opens a lesson at its start, because a class or a friend needs
 * the lesson. A class page is where a particular view is worth fixing, so the
 * embed asks: the start, or this view. It asks what to show first, since that
 * decides what "this view" can hold — the whole page, or the diagram alone,
 * which is the playground's stage whatever page it came from (`Embed`).
 *
 * Opened from Share, and not on a phone, where there is no class page to be
 * writing. Each time it opens it starts from the page's own answers: the
 * whole page, at the start where Share's link is the start, and at this view
 * in the playground, where Share's link is the view.
 */

/** Where an embed opens: the page's start, or the view on screen. */
export type EmbedOpens = 'start' | 'view';

/** One embed the dialog can give. */
export interface EmbedOption {
    /** Its address from the app's root, as `writeEmbed` writes it. */
    address: string;
    /** The frame's title, which is what a screen reader says it is. */
    title: string;
}

export interface EmbedDialogProps {
    opened: boolean;
    onClose(): void;
    /** The page the dialog is on, which names what each choice shows. */
    kind: Place['kind'];
    /**
     * Where in the lesson the view is, and each param moved off it, in words:
     * "Step 7 of 15 · The AUD appreciates · Supply of AUD 50 → 56".
     */
    here: string;
    /** Each embed there is, by what it shows and then by where it opens. */
    embeds: Record<EmbedLayout, Record<EmbedOpens, EmbedOption>>;
}

/** The whole page, as each kind of page calls it, and what is in it. */
const WHOLE: Record<Place['kind'], { label: string; description: string }> = {
    lesson: { label: 'The whole lesson', description: 'The diagram, with the lesson\'s steps beside it.' },
    playground: {
        label: 'The diagram and instruments',
        description: 'The diagram, with Explore, Scenarios and Maths beside it.'
    },
    news: { label: 'The whole story', description: 'The news report and the diagram, with what the news moves beside it.' }
};

/** The start, as each layout of each page has one. */
function startOf(kind: Place['kind'], layout: EmbedLayout) {
    if (layout === 'full' && kind === 'lesson') {
        return { label: 'The start of the lesson', description: 'The lesson\'s cover, before the first step.' };
    }
    if (layout === 'full' && kind === 'news') {
        return { label: 'The start of the story', description: 'The news report at the front, before its move is shown.' };
    }
    return { label: 'The model\'s own market', description: 'The market as the Playground first draws it.' };
}

export function EmbedDialog({ opened, onClose, ...choices }: EmbedDialogProps) {
    return (
        <Modal opened={opened} onClose={onClose} title="Embed" size={500}>
            {/* Mounted with the dialog, so each opening starts afresh. */}
            <EmbedChoices {...choices} />
        </Modal>
    );
}

function EmbedChoices({ kind, here, embeds }: Omit<EmbedDialogProps, 'opened' | 'onClose'>) {
    const [layout, setLayout] = useState<EmbedLayout>('full');
    const [opens, setOpens] = useState<EmbedOpens>(kind === 'playground' ? 'view' : 'start');
    const [copied, setCopied] = useState<'yes' | 'no' | null>(null);

    const chosen = embeds[layout][opens],
        src = linkHref(chosen.address),
        code = embedCode(src, chosen.title, layout),
        { width, height } = EMBED_SIZE[layout],
        start = startOf(kind, layout);

    // A new choice is new code, which has not been copied yet.
    const choose = <T,>(set: (value: T) => void) => (value: string) => {
        set(value as T);
        setCopied(null);
    };

    const copy = () => {
        copyText(code).then(() => setCopied('yes'), () => setCopied('no'));
    };

    return (
        <Stack gap="lg">
            <Radio.Group label="What it shows" value={layout} onChange={choose(setLayout)}>
                <Stack gap="sm" mt="xs">
                    <Radio value="full" label={WHOLE[kind].label} description={WHOLE[kind].description} />
                    <Radio
                        value="diagram"
                        label="The diagram only"
                        description="Every panel, as the Playground draws it, with Reset under it."
                    />
                </Stack>
            </Radio.Group>

            <Radio.Group label="Where it opens" value={opens} onChange={choose(setOpens)}>
                <Stack gap="sm" mt="xs">
                    <Radio value="start" label={start.label} description={start.description} />
                    <Radio
                        value="view"
                        label="This view"
                        description={layout === 'full' && kind === 'lesson'
                            ? here : 'The diagram as it is on screen now.'}
                    />
                </Stack>
            </Radio.Group>

            <div>
                <Textarea
                    label="Code for the page"
                    value={code}
                    readOnly
                    // As tall whatever is chosen, so the buttons under it
                    // never move under the pointer: five lines holds the
                    // code with a long title and a view, and a longer one
                    // scrolls inside.
                    rows={5}
                    resize="none"
                    classNames={{ input: classes.code }}
                    onFocus={event => event.currentTarget.select()}
                />
                <Text size="xs" c="dimmed" mt={6}>
                    {layout === 'full'
                        ? `${width} × ${height} pixels. In a column narrower than 900 pixels, the card beside ` +
                            'the diagram goes under it, as it does on a phone.'
                        : `${width} × ${height} pixels. It fits a narrower column as well.`}
                    {' '}Students need no account to use it, and nothing they do leaves their own browser.
                </Text>
            </div>

            <div>
                <Group justify="flex-end" gap="xs">
                    <Button
                        component="a"
                        href={src}
                        target="_blank"
                        rel="noopener"
                        variant="default"
                        rightSection={<IconExternalLink size={14} stroke={1.75} />}
                    >
                        Preview
                    </Button>
                    <Button
                        leftSection={copied === 'yes' ? <IconCheck size={16} stroke={1.75} /> : <IconCopy size={16} stroke={1.75} />}
                        onClick={copy}
                    >
                        {copied === 'yes' ? 'Copied' : 'Copy code'}
                    </Button>
                </Group>
                {copied === 'no' ? (
                    <Text size="xs" c="dimmed" ta="right" mt={6}>
                        This browser would not copy it. You can select the code above and copy it.
                    </Text>
                ) : null}
            </div>
        </Stack>
    );
}

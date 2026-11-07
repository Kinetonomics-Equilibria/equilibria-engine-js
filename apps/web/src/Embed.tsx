import { useCallback, useState } from 'react';
import { Button, Text } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import { StudyScreen } from './StudyScreen';
import { lessonById, modelById, topicOfLesson, topicOfModel } from './lessons';
import { storyById, topicOfStory } from './news';
import { readLink } from './links';
import type { Embedded, Link } from './links';
import { linkHref } from './share';
import classes from './Embed.module.css';

/**
 * An embed: a page of the app in another site's page, in an iframe, from the
 * code Share's Embed… gives (`EmbedDialog`).
 *
 * Two layouts. **The whole page** is the study screen less the rail — the
 * title line, the stage and the side column, or under 900px the stacked
 * layout a phone has — with "Open in Kinetonomics" in Share's place. **The
 * diagram alone** is the playground's stage, whatever page the address names:
 * the model whole, still draggable, with the arrangement and Reset under it
 * and the Playground at the other end. A lesson's steps reveal its diagram an
 * idea at a time, and a diagram on its own has no steps to do that with, so
 * it draws every panel, as the playground does.
 *
 * Opened at the view its address names, as a link opens, and as forgiving: a
 * lesson or a model that has gone opens the first one at its start.
 *
 * **An embed saves nothing to the page it is on.** It never writes its own
 * address — an iframe's history is the page's, so a write would put the
 * student's drags under the other site's Back button — and keeps no answers
 * anywhere. Each student who opens it has their own copy, and nothing they do
 * leaves their browser. Every way out of it, Finish and a story's "Open in
 * the Playground" among them, opens the app in a tab of its own, so the page
 * the embed is on stays where it was.
 */

/** A link to the app, whole, in a tab of its own. */
const openInTab = (address: string) => {
    window.open(linkHref(address), '_blank', 'noopener');
};

export function Embed({ place, layout }: Embedded) {
    // Read once: the address of an embed never changes under it.
    const [link] = useState(() => readLink(window.location.search));
    const leave = useCallback((address: string) => openInTab(address), []);

    const screen = (() => {
        if (!place) return null;
        if (place.kind === 'news') {
            const story = storyById(place.id);
            if (!story) return null;
            return layout === 'diagram'
                ? diagramOf(story.model.id, link)
                : <StudyScreen story={story} topic={topicOfStory(story)} link={link} embed="full" onFinish={leave} />;
        }
        if (place.kind === 'lesson') {
            const lesson = lessonById(place.id), named = lesson.id === place.id;
            if (layout === 'diagram') return diagramOf(lesson.model.id, named ? link : undefined);
            return (
                <StudyScreen
                    content={lesson}
                    topic={topicOfLesson(lesson.id)}
                    link={named ? link : undefined}
                    embed="full"
                    onFinish={leave}
                />
            );
        }
        if (layout === 'diagram') return diagramOf(place.id, link);
        const model = modelById(place.id);
        return (
            <StudyScreen
                playground={model}
                topic={topicOfModel(model.id)}
                link={model.id === place.id ? link : undefined}
                embed="full"
            />
        );
    })();

    return (
        <div className={classes.embed} data-layout={layout}>
            {screen || <Nowhere />}
        </div>
    );
}

/**
 * The diagram alone: the model's stage as the playground draws it, at the
 * view the link names less what only a page has, its step and its tab.
 */
function diagramOf(id: string, link: Link | undefined) {
    const model = modelById(id);
    return (
        <StudyScreen
            playground={model}
            topic={topicOfModel(model.id)}
            link={link && model.id === id ? { ...link, step: 0, tab: null } : undefined}
            embed="diagram"
        />
    );
}

/**
 * An address under `embed/` that names nothing: a story that is not there,
 * or a path the app does not have. Said in the frame, rather than the whole
 * app opened inside another site's page, with the way to the app beside it.
 */
function Nowhere() {
    return (
        <div className={classes.nowhere}>
            <Text fw={600}>There is no lesson, model or story at this address.</Text>
            <Text size="sm" c="dimmed">
                Part of the code may have been left out when it was copied. The lessons are all in Kinetonomics.
            </Text>
            <Button
                component="a"
                href={linkHref('')}
                target="_blank"
                rel="noopener"
                variant="subtle"
                size="compact-sm"
                rightSection={<IconExternalLink size={14} stroke={1.75} />}
            >
                Open Kinetonomics
            </Button>
        </div>
    );
}

import type { CSSProperties, MouseEvent } from 'react';
import { Title, VisuallyHidden } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { RAIL } from './components/DoubleNavbar';
import type { NavPanel } from './components/DoubleNavbar';
import { ActionRow } from './dock/Scenarios';
import { ON_HOME, STORIES, dateWords, topicOfStory } from './news';
import { writeLink } from './links';
import classes from './Home.module.css';

/**
 * Home: where the app opens, at the root (docs/design.md, "Home").
 *
 * A page that points, and nothing else. It answers the two questions a student
 * arriving has, one card each: where can I go, and what has happened. The
 * places are the rail's, with its icons and names, each a line saying what is
 * in it, and a press brings out its panel as the rail would — so Home is also
 * where the rail is learnt. The latest stories are a feed under them, newest
 * first, a press from the story itself. Every press opens a thing or a
 * place's panel; there is no list page to choose from.
 */

/** What is in each place, in a line: the people it is for, not the features. */
const LINES: Record<NavPanel, string> = {
    lessons: 'Each idea built up a step at a time, with questions to try on the way.',
    playground: 'A market to yourself: drag its curves, try what could happen, see the maths.',
    news: 'Real events, and which curve each one moves.'
};

export interface HomeProps {
    /** Bring out a place's panel, as its icon on the rail does. */
    onPanel(panel: NavPanel): void;
    /** Open a page, by its address from the app's root: pushed, as the rail's are. */
    onOpen(address: string): void;
}

export function Home({ onPanel, onOpen }: HomeProps) {
    const latest = STORIES.slice(0, ON_HOME);

    return (
        <div className={classes.home}>
            <div className={classes.heading}>
                <Title order={1} size="h4" className={classes.title}>Learn it, play with it, see it happen</Title>
            </div>

            <div className={classes.cards}>
                <section className={classes.card} aria-labelledby="home-places">
                    <div className={classes.head}>
                        <h2 className={classes.eyebrow} id="home-places">Where to go</h2>
                    </div>
                    <div className={classes.list}>
                        {RAIL.filter(place => place.panel).map(place => (
                            <ActionRow
                                key={place.place}
                                icon={<place.icon size={22} stroke={1.5} />}
                                label={place.label}
                                description={LINES[place.panel!]}
                                onPress={() => onPanel(place.panel!)}
                            />
                        ))}
                    </div>
                </section>

                <section className={classes.card} aria-labelledby="home-news">
                    <div className={classes.head}>
                        <h2 className={classes.eyebrow} id="home-news">Latest in the news</h2>
                    </div>
                    <ol className={classes.feed}>
                        {latest.map(story => {
                            const topic = topicOfStory(story),
                                address = writeLink({ kind: 'news', id: story.id });
                            return (
                                <li key={story.id}>
                                    <a
                                        className={classes.story}
                                        href={import.meta.env.BASE_URL + address}
                                        style={topic ? {
                                            '--topic-color': `var(--mantine-color-${topic.color}-filled)`
                                        } as CSSProperties : undefined}
                                        onClick={(event: MouseEvent<HTMLAnchorElement>) => {
                                            if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                                            event.preventDefault();
                                            onOpen(address);
                                        }}
                                    >
                                        <span className={classes.date}>{dateWords(story.date, 'short')}</span>
                                        {topic ? (
                                            <>
                                                <span className={classes.dot} aria-hidden />
                                                <VisuallyHidden>{topic.label}:</VisuallyHidden>
                                            </>
                                        ) : <span />}
                                        <span className={classes.headline}>{story.headline}</span>
                                        <IconArrowRight size={16} stroke={1.75} className={classes.go} aria-hidden="true" />
                                    </a>
                                </li>
                            );
                        })}
                    </ol>
                </section>
            </div>
        </div>
    );
}

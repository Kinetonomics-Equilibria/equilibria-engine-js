import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
    IconBook2,
    IconChartPpf,
    IconChevronRight,
    IconHome2,
    IconNews,
    IconSettings,
    IconX
} from '@tabler/icons-react';
import {
    ActionIcon, Avatar, Collapse, Menu, Text, Tooltip, Transition, UnstyledButton, VisuallyHidden, useMantineTheme
} from '@mantine/core';
import { useClickOutside, useMediaQuery, useWindowEvent } from '@mantine/hooks';
import classes from './DoubleNavbar.module.css';
import logo from './kinetonomics-logo.svg';

// A narrow rail of section icons, and beside it a panel listing what is inside
// the section pressed. The panel is out only while it is wanted: pressing a
// rail icon brings it out, and choosing something in it — or clicking anywhere
// else, or Escape — puts it away again. So there is no toggle of its own, and
// the stage keeps the window's width whether the panel is out or not.

/**
 * The rail sections that open a panel, which are also the places a page
 * belongs to: a lesson is in Lessons, a model in the Playground, a story In
 * the news.
 */
export type NavPanel = 'lessons' | 'playground' | 'news';

/** Every place on the rail: Home, which is a page, and the three with panels. */
export type NavPlace = 'home' | NavPanel;

/** Something a panel lists — a lesson, or a model — with its address. */
export interface NavItem {
    id: string;
    label: string;
    href: string;
}

/** A topic in a panel: a row that drops down to what it holds. */
export interface NavTopic {
    id: string;
    label: string;
    /**
     * A Mantine colour name. The dot before the topic's name is drawn in it,
     * and the topic holding the open page is lit in it.
     */
    color: string;
    items: NavItem[];
}

/** A run of topics under one heading in a panel. */
export interface NavStrand {
    label: string;
    topics: NavTopic[];
}

/** A story as the In the news panel lists it: its day, its topic's dot and its headline. */
export interface NavStory {
    id: string;
    headline: string;
    /** Its day, in words: "29 Sep". The month is the heading it is under. */
    day: string;
    /** The topic it is told in, for its dot. */
    topic: { label: string; color: string } | null;
    href: string;
}

/** A month in the In the news panel, and its stories, newest first. */
export interface NavMonth {
    label: string;
    stories: NavStory[];
}

// The places, in the order a student meets them: where to start, then learn
// it, play with it, see it happen (docs/design.md, "The rail"). Home is a
// page, and opens; the others bring out their panels. The profile circle at
// the rail's foot is not one of these: it opens a menu rather than going
// anywhere. Home's own list of the places reads their icons and names here,
// so the two cannot disagree.
export const RAIL: { icon: typeof IconHome2; label: string; place: NavPlace; panel?: NavPanel }[] = [
    { icon: IconHome2, label: 'Home', place: 'home' },
    { icon: IconBook2, label: 'Lessons', place: 'lessons', panel: 'lessons' },
    { icon: IconChartPpf, label: 'Playground', place: 'playground', panel: 'playground' },
    { icon: IconNews, label: 'In the news', place: 'news', panel: 'news' }
];

const TITLE: Record<NavPanel, string> = { lessons: 'Lessons', playground: 'Playground', news: 'In the news' };

// The id a rail button points `aria-controls` at, and its panel's title's.
const panelId = (panel: NavPanel) => `navbar-${panel}-panel`;
const titleId = (panel: NavPanel) => `navbar-${panel}-title`;

interface DoubleNavbarProps {
    /**
     * Which rail section's panel is out, if any. Owned by the shell, because
     * below `sm` its burger opens the panel along with the navbar.
     */
    panel: NavPanel | null;

    /** Called with a panel to bring it out, or with `null` to put it away. */
    onPanelChange: (panel: NavPanel | null) => void;

    /** What the Lessons and Playground panels list, arranged into strands and topics. */
    lists: Record<'lessons' | 'playground', NavStrand[]>;

    /** What the In the news panel lists: every story, newest first, under each month. */
    news: NavMonth[];

    /**
     * The open page: the place it belongs to, which the rail keeps lit, the
     * id of what is open there, and the topic it is under, which the Lessons
     * and Playground panels open on. Owned by the shell, which mounts the page.
     */
    page: { place: NavPlace; id: string; topic: string | null };

    /** Called with a panel and an item's id when the student chooses it. */
    onSelect: (panel: NavPanel, id: string) => void;

    /** Called when the student presses Home. */
    onHome: () => void;
}

export function DoubleNavbar({ panel, onPanelChange, lists, news, page, onSelect, onHome }: DoubleNavbarProps) {
    // Above `sm` the panel floats over the page, and a click anywhere else puts
    // it away. Below it the panel is part of the burger's overlay, and the
    // burger is outside this nav: counting its click as "outside" would put the
    // overlay away on mousedown and bring it straight back on click.
    const theme = useMantineTheme();
    const floats = useMediaQuery(`(min-width: ${theme.breakpoints.sm})`);

    // The whole nav rather than the panel alone, because the rail is in it: a
    // second press on Lessons has to reach the button as a toggle, not close
    // the panel on mousedown and reopen it on click.
    const navRef = useClickOutside<HTMLElement>(() => {
        if (panel && floats) onPanelChange(null);
    });

    // Whether the profile menu is out. Below `sm` it opens over the panel, and
    // Escape then puts away the menu alone, as it would any menu.
    const [profileOpen, setProfileOpen] = useState(false);

    // The panel last out, so one going away still has its list while it slides
    // off. Switching between the two swaps the list in place.
    const lastOut = useRef<NavPanel>(page.place === 'home' ? 'lessons' : page.place);
    if (panel) lastOut.current = panel;
    const showing = panel || lastOut.current;

    // Capture phase: the rail button that brought the panel out still has
    // focus, and its Tooltip keeps Escape from bubbling up to the window.
    useWindowEvent('keydown', (event) => {
        if (panel && !profileOpen && event.key === 'Escape') onPanelChange(null);
    }, { capture: true });

    const rail = RAIL.map((link) => {
        const isOut = link.panel !== undefined && link.panel === panel;
        // Home opens, and puts away a panel that is out; a place with a panel
        // brings it out, or puts it away if it is out already.
        const press = () => {
            if (!link.panel) onHome();
            else onPanelChange(isOut ? null : link.panel);
        };
        return (
            <Tooltip
                label={link.label}
                position="right"
                withArrow
                transitionProps={{ duration: 0 }}
                // Its panel says the same word, in the same place.
                disabled={isOut}
                key={link.label}
            >
                <UnstyledButton
                    onClick={press}
                    className={classes.mainLink}
                    data-active={link.place === page.place || isOut || undefined}
                    aria-label={link.label}
                    aria-expanded={link.panel ? isOut : undefined}
                    aria-controls={link.panel ? panelId(link.panel) : undefined}
                >
                    <link.icon size={22} stroke={1.5} />
                </UnstyledButton>
            </Tooltip>
        );
    });

    return (
        <nav className={classes.navbar} ref={navRef}>
            <div className={classes.aside}>
                <img className={classes.logo} src={logo} alt="Kinetonomics" />
                {rail}

                {/* Opens beside the rail, its foot level with the circle's.
                  * The circle sits 10px in from the rail's edge, so an offset
                  * of 18 stands the menu 8px off the rail, as the panel
                  * stands. Above `sm` opening it puts the panel away, which
                  * it would otherwise cover; below it the panel is the
                  * overlay the circle is on, so it stays. */}
                <Menu
                    opened={profileOpen}
                    onChange={setProfileOpen}
                    onOpen={() => { if (panel && floats) onPanelChange(null); }}
                    position="right-end"
                    offset={18}
                    width={200}
                    shadow="md"
                    radius="md"
                >
                    {/* The Tooltip outside the target: inside it, the Tooltip
                      * keeps the menu's `aria-expanded` and `aria-haspopup`
                      * for itself and they never reach the button. */}
                    <Tooltip
                        label="Profile"
                        position="right"
                        withArrow
                        transitionProps={{ duration: 0 }}
                        disabled={profileOpen}
                    >
                        <Menu.Target>
                            <UnstyledButton className={classes.profile} aria-label="Profile">
                                {/* No accounts yet, so no picture or initials:
                                  * Mantine's own placeholder figure. Blue
                                  * while its menu is out, as a rail icon is
                                  * while its panel is. */}
                                <Avatar size={36} color={profileOpen ? 'blue' : 'gray'} />
                            </UnstyledButton>
                        </Menu.Target>
                    </Tooltip>

                    <Menu.Dropdown>
                        {/* Settings has no page behind it yet, so choosing it
                          * only puts away what is out, as Home does. */}
                        <Menu.Item
                            leftSection={<IconSettings size={16} stroke={1.5} />}
                            onClick={() => onPanelChange(null)}
                        >
                            Settings
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </div>

            <Transition mounted={panel !== null} transition="slide-right" duration={150} timingFunction="ease">
                {(styles) => (
                    <section
                        className={classes.panel}
                        style={styles}
                        id={panelId(showing)}
                        aria-labelledby={titleId(showing)}
                    >
                        <div className={classes.header}>
                            <Text fw={600} size="sm" id={titleId(showing)}>{TITLE[showing]}</Text>
                            {/* Below `sm` the burger turns into a close
                              * button in this same corner, and closes the
                              * panel with the overlay. */}
                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                visibleFrom="sm"
                                aria-label={`Close ${TITLE[showing].toLowerCase()}`}
                                onClick={() => onPanelChange(null)}
                            >
                                <IconX size={16} />
                            </ActionIcon>
                        </div>
                        {/* Keyed by panel, so each opens on its own topic. */}
                        {showing === 'news' ? (
                            <StoryList
                                months={news}
                                active={page.place === 'news' ? page.id : null}
                                onSelect={id => onSelect('news', id)}
                            />
                        ) : (
                            <PlaceList
                                key={showing}
                                strands={lists[showing]}
                                active={page.place === showing ? page.id : null}
                                topic={page.topic}
                                onSelect={id => onSelect(showing, id)}
                            />
                        )}
                    </section>
                )}
            </Transition>
        </nav>
    );
}

/**
 * A plain click stays in the app and swaps the page; a click that asks for a
 * new tab or window is the browser's, since every row is a real address.
 */
const inApp = (event: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; button: number }) =>
    !(event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0);

interface StoryListProps {
    months: NavMonth[];
    /** The story that is open, if one is. */
    active: string | null;
    onSelect: (id: string) => void;
}

/**
 * The In the news panel's body: newest first, under each month, a row a
 * story — its day, its topic's dot and its headline. No topics to drop down:
 * a story is found by when it happened, and the dot says which topic it is
 * told in, the name beside it for a screen reader.
 */
function StoryList({ months, active, onSelect }: StoryListProps) {
    return (
        <div className={classes.body}>
            {months.map((month) => (
                <div key={month.label}>
                    <Text size="xs" fw={600} c="dimmed" className={classes.groupLabel}>
                        {month.label}
                    </Text>
                    {month.stories.map((story) => (
                        <a
                            key={story.id}
                            className={classes.story}
                            data-active={active === story.id || undefined}
                            aria-current={active === story.id ? 'page' : undefined}
                            href={story.href}
                            style={story.topic ? {
                                '--topic-color': `var(--mantine-color-${story.topic.color}-filled)`,
                                '--topic-ink': `var(--mantine-color-${story.topic.color}-light-color)`
                            } as CSSProperties : undefined}
                            onClick={(event) => {
                                if (!inApp(event)) return;
                                event.preventDefault();
                                onSelect(story.id);
                            }}
                        >
                            <span className={classes.storyDay}>{story.day}</span>
                            {story.topic ? (
                                <>
                                    <span className={classes.storyDot} aria-hidden />
                                    <VisuallyHidden>{story.topic.label}:</VisuallyHidden>
                                </>
                            ) : <span />}
                            <span className={classes.storyHeadline}>{story.headline}</span>
                        </a>
                    ))}
                </div>
            ))}
        </div>
    );
}

interface PlaceListProps {
    strands: NavStrand[];
    /** What is open, where it is in this list. */
    active: string | null;
    /** The topic the open page is under, which the list opens on. */
    topic: string | null;
    onSelect: (id: string) => void;
}

/** A panel's body: each strand's heading, and its topics under it. */
function PlaceList({ strands, active, topic, onSelect }: PlaceListProps) {
    // One topic open at a time. Mounted afresh whenever the panel comes out, so
    // it opens every time on the topic the open page is under — a lesson's
    // model under its lesson's — with what is open in view.
    const [openTopic, setOpenTopic] = useState(topic);

    return (
        <div className={classes.body}>
            {strands.map((strand) => (
                <div key={strand.label}>
                    <Text size="xs" fw={600} c="dimmed" className={classes.groupLabel}>
                        {strand.label}
                    </Text>
                    {strand.topics.map((topic) => (
                        <TopicSection
                            key={topic.id}
                            topic={topic}
                            opened={openTopic === topic.id}
                            onToggle={() => setOpenTopic(openTopic === topic.id ? null : topic.id)}
                            active={active}
                            onSelect={onSelect}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

interface TopicSectionProps {
    topic: NavTopic;
    opened: boolean;
    onToggle: () => void;
    active: string | null;
    onSelect: (id: string) => void;
}

/** A topic's row, which drops down to what it holds. */
function TopicSection({ topic, opened, onToggle, active, onSelect }: TopicSectionProps) {
    const itemsId = `navbar-topic-${topic.id}`;
    const holdsActive = topic.items.some(item => item.id === active);

    // On a wrapper both the row and its items sit in, since a custom property
    // reaches the two only from an element they share.
    const colours = {
        '--topic-color': `var(--mantine-color-${topic.color}-filled)`,
        '--topic-tint': `var(--mantine-color-${topic.color}-light)`,
        '--topic-ink': `var(--mantine-color-${topic.color}-light-color)`
    } as CSSProperties;

    // Real addresses, so a lesson or a model can be opened in a new tab or
    // handed to a class as a link; a plain click stays in the app and swaps
    // the page.
    const links = topic.items.map((item) => (
        <a
            className={classes.link}
            data-active={active === item.id || undefined}
            aria-current={active === item.id ? 'page' : undefined}
            href={item.href}
            onClick={(event) => {
                if (!inApp(event)) return;
                event.preventDefault();
                onSelect(item.id);
            }}
            key={item.id}
        >
            {item.label}
        </a>
    ));

    return (
        <div style={colours}>
            <UnstyledButton
                className={classes.topic}
                data-active={holdsActive || undefined}
                onClick={onToggle}
                aria-expanded={opened}
                aria-controls={itemsId}
            >
                <span className={classes.dot} aria-hidden />
                <Text size="sm" fw={500} truncate className={classes.topicLabel}>
                    {topic.label}
                </Text>
                <IconChevronRight
                    size={14}
                    className={classes.chevron}
                    data-opened={opened || undefined}
                    aria-hidden
                />
            </UnstyledButton>
            {/* Collapse keeps its children mounted, so a closed topic's
              * items would still be links in the page — found by a screen
              * reader's list of links, and by tabbing, while out of sight. */}
            <Collapse expanded={opened}>
                {opened && <div id={itemsId} className={classes.lessons}>{links}</div>}
            </Collapse>
        </div>
    );
}

import { useState } from 'react';
import type { CSSProperties } from 'react';
import {
    IconChartHistogram,
    IconChartPpf,
    IconChevronRight,
    IconHome2,
    IconSettings,
    IconX
} from '@tabler/icons-react';
import { ActionIcon, Collapse, Text, Tooltip, Transition, UnstyledButton, useMantineTheme } from '@mantine/core';
import { useClickOutside, useMediaQuery, useWindowEvent } from '@mantine/hooks';
import type { LessonStrand, LessonTopic } from '../lessons';
import classes from './DoubleNavbar.module.css';

// A narrow rail of section icons, and beside it a panel listing what is inside
// the section pressed. The panel is out only while it is wanted: pressing a
// rail icon brings it out, and choosing something in it — or clicking anywhere
// else, or Escape — puts it away again. So there is no toggle of its own, and
// the stage keeps the window's width whether the panel is out or not.

/** The rail sections that open a panel. Only Lessons has one so far. */
export type NavPanel = 'lessons';

// Home and Settings have no pages behind them yet. They are here so the rail
// has its shape, and pressing one only puts away a panel that is out.
const RAIL: { icon: typeof IconHome2; label: string; panel?: NavPanel }[] = [
    { icon: IconHome2, label: 'Home' },
    { icon: IconChartPpf, label: 'Lessons', panel: 'lessons' },
    { icon: IconSettings, label: 'Settings' }
];

// The section the open page belongs to, which the rail keeps lit. Every page is
// a lesson so far.
const PAGE_SECTION = 'Lessons';

// The ids the Lessons button points `aria-controls` at, and the panel's title.
const PANEL_ID = 'navbar-lessons-panel';
const PANEL_TITLE_ID = 'navbar-lessons-title';

interface DoubleNavbarProps {
    /**
     * Which rail section's panel is out, if any. Owned by the shell, because
     * below `sm` its burger opens the panel along with the navbar.
     */
    panel: NavPanel | null;

    /** Called with a panel to bring it out, or with `null` to put it away. */
    onPanelChange: (panel: NavPanel | null) => void;

    /** The lessons, arranged into strands and topics. */
    curriculum: LessonStrand[];

    /** Which lesson is open. Owned by the shell, which mounts it. */
    activeLesson: string;

    /** Called with a lesson's id when the student chooses it. */
    onSelectLesson: (id: string) => void;
}

export function DoubleNavbar({
    panel, onPanelChange, curriculum, activeLesson, onSelectLesson
}: DoubleNavbarProps) {
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

    // Capture phase: the rail button that brought the panel out still has
    // focus, and its Tooltip keeps Escape from bubbling up to the window.
    useWindowEvent('keydown', (event) => {
        if (panel && event.key === 'Escape') onPanelChange(null);
    }, { capture: true });

    const rail = RAIL.map((link) => {
        const isOut = link.panel !== undefined && link.panel === panel;
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
                    onClick={() => onPanelChange(link.panel && !isOut ? link.panel : null)}
                    className={classes.mainLink}
                    data-active={link.label === PAGE_SECTION || isOut || undefined}
                    aria-label={link.label}
                    aria-expanded={link.panel ? isOut : undefined}
                    aria-controls={link.panel ? PANEL_ID : undefined}
                >
                    <link.icon size={22} stroke={1.5} />
                </UnstyledButton>
            </Tooltip>
        );
    });

    return (
        <nav className={classes.navbar} ref={navRef}>
            <div className={classes.aside}>
                <div className={classes.logo}>
                    <IconChartHistogram size={30} stroke={1.5} />
                </div>
                {rail}
            </div>

            <Transition mounted={panel === 'lessons'} transition="slide-right" duration={150} timingFunction="ease">
                {(styles) => (
                    <section
                        className={classes.panel}
                        style={styles}
                        id={PANEL_ID}
                        aria-labelledby={PANEL_TITLE_ID}
                    >
                        <div className={classes.header}>
                            <Text fw={600} size="sm" id={PANEL_TITLE_ID}>Lessons</Text>
                            {/* Below `sm` the burger turns into a close
                              * button in this same corner, and closes the
                              * panel with the overlay. */}
                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                visibleFrom="sm"
                                aria-label="Close lessons"
                                onClick={() => onPanelChange(null)}
                            >
                                <IconX size={16} />
                            </ActionIcon>
                        </div>
                        <LessonList
                            curriculum={curriculum}
                            activeLesson={activeLesson}
                            onSelectLesson={onSelectLesson}
                        />
                    </section>
                )}
            </Transition>
        </nav>
    );
}

/** The topic that holds a lesson, or `null` for an id no topic holds. */
function topicOf(curriculum: LessonStrand[], lessonId: string): string | null {
    const topics = curriculum.flatMap(strand => strand.topics);
    const holder = topics.filter(topic => topic.lessons.some(lesson => lesson.id === lessonId))[0];
    return holder ? holder.id : null;
}

interface LessonListProps {
    curriculum: LessonStrand[];
    activeLesson: string;
    onSelectLesson: (id: string) => void;
}

/** The panel's body: each strand's heading, and its topics under it. */
function LessonList({ curriculum, activeLesson, onSelectLesson }: LessonListProps) {
    // One topic open at a time. Mounted afresh whenever the panel comes out, so
    // it opens every time on the topic the open lesson is in, with that lesson
    // in view.
    const [openTopic, setOpenTopic] = useState(() => topicOf(curriculum, activeLesson));

    return (
        <div className={classes.body}>
            {curriculum.map((strand) => (
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
                            activeLesson={activeLesson}
                            onSelectLesson={onSelectLesson}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

interface TopicSectionProps {
    topic: LessonTopic;
    opened: boolean;
    onToggle: () => void;
    activeLesson: string;
    onSelectLesson: (id: string) => void;
}

/** A topic's row, which drops down to its lessons. */
function TopicSection({ topic, opened, onToggle, activeLesson, onSelectLesson }: TopicSectionProps) {
    const lessonsId = `navbar-topic-${topic.id}`;
    const holdsActive = topic.lessons.some(lesson => lesson.id === activeLesson);

    // On a wrapper both the row and its lessons sit in, since a custom property
    // reaches the two only from an element they share.
    const colours = {
        '--topic-color': `var(--mantine-color-${topic.color}-filled)`,
        '--topic-tint': `var(--mantine-color-${topic.color}-light)`,
        '--topic-ink': `var(--mantine-color-${topic.color}-light-color)`
    } as CSSProperties;

    // Real addresses, so a lesson can be opened in a new tab or handed to a
    // class as a link; a plain click stays in the page and swaps the lesson.
    const links = topic.lessons.map((lesson) => (
        <a
            className={classes.link}
            data-active={activeLesson === lesson.id || undefined}
            aria-current={activeLesson === lesson.id ? 'page' : undefined}
            href={`?lesson=${encodeURIComponent(lesson.id)}`}
            onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                event.preventDefault();
                onSelectLesson(lesson.id);
            }}
            key={lesson.id}
        >
            {lesson.label}
        </a>
    ));

    return (
        <div style={colours}>
            <UnstyledButton
                className={classes.topic}
                data-active={holdsActive || undefined}
                onClick={onToggle}
                aria-expanded={opened}
                aria-controls={lessonsId}
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
              * lessons would still be links in the page — found by a screen
              * reader's list of links, and by tabbing, while out of sight. */}
            <Collapse expanded={opened}>
                {opened && <div id={lessonsId} className={classes.lessons}>{links}</div>}
            </Collapse>
        </div>
    );
}

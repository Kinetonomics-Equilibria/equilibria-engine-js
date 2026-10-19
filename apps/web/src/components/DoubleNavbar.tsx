import { useState } from 'react';
import {
    IconCalendarStats,
    IconChartHistogram,
    IconChevronLeft,
    IconChevronRight,
    IconDeviceDesktopAnalytics,
    IconFingerprint,
    IconGauge,
    IconHome2,
    IconSettings,
    IconUser
} from '@tabler/icons-react';
import { Title, Tooltip, UnstyledButton } from '@mantine/core';
import classes from './DoubleNavbar.module.css';

// Mantine's DoubleNavbar recipe (ui.mantine.dev/component/double-navbar): a
// narrow rail of section icons, and a second column listing the links within
// the selected section.
//
// The second column is real: it lists the lessons, and choosing one is the
// app's only navigation so far. The rail is still the recipe's placeholder
// data — there are no sections to wire it to yet. Replace this array (and the
// `useState` default below) when there are; nothing else here is placeholder.
const mainLinksMockdata = [
    { icon: IconHome2, label: 'Home' },
    { icon: IconGauge, label: 'Dashboard' },
    { icon: IconDeviceDesktopAnalytics, label: 'Analytics' },
    { icon: IconCalendarStats, label: 'Releases' },
    { icon: IconUser, label: 'Account' },
    { icon: IconFingerprint, label: 'Security' },
    { icon: IconSettings, label: 'Settings' }
];

// The id the toggle points `aria-controls` at, so a screen reader can tell that
// the button in the rail governs the column beside it.
const LINKS_PANEL_ID = 'navbar-links-panel';

interface DoubleNavbarProps {
    /**
     * Whether the second column (the links list) is collapsed, leaving only the
     * icon rail. Owned by the shell rather than by this component, because the
     * width of `AppShell.Navbar` has to change with it.
     */
    collapsed: boolean;

    /** Called when the collapse toggle in the rail is pressed. */
    onToggleCollapse: () => void;

    /** The lessons to list, in order. */
    lessons: { id: string; label: string }[];

    /** Which lesson is open. Owned by the shell, which mounts it. */
    activeLesson: string;

    /** Called with a lesson's id when the student chooses it. */
    onSelectLesson: (id: string) => void;
}

export function DoubleNavbar({
    collapsed, onToggleCollapse, lessons, activeLesson, onSelectLesson
}: DoubleNavbarProps) {
    // Which rail section is highlighted. Local state: nothing reads it yet.
    const [active, setActive] = useState('Home');

    const mainLinks = mainLinksMockdata.map((link) => (
        <Tooltip
            label={link.label}
            position="right"
            withArrow
            transitionProps={{ duration: 0 }}
            key={link.label}
        >
            <UnstyledButton
                onClick={() => setActive(link.label)}
                className={classes.mainLink}
                data-active={link.label === active || undefined}
                aria-label={link.label}
            >
                <link.icon size={22} stroke={1.5} />
            </UnstyledButton>
        </Tooltip>
    ));

    // Real addresses, so a lesson can be opened in a new tab or handed to a
    // class as a link; a plain click stays in the page and swaps the lesson.
    const links = lessons.map((lesson) => (
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
        <nav className={classes.navbar}>
            <div className={classes.wrapper} data-collapsed={collapsed || undefined}>
                <div className={classes.aside}>
                    <div className={classes.logo}>
                        <IconChartHistogram size={30} stroke={1.5} />
                    </div>
                    {mainLinks}

                    {/* `visibleFrom="sm"` rather than a media query in the
                      * module because it has to agree with `navbar.breakpoint`
                      * in App.tsx, and both are Mantine's default `sm`: below
                      * it the navbar is a full-width overlay with nothing to
                      * collapse into. */}
                    <Tooltip
                        label={collapsed ? 'Show links' : 'Hide links'}
                        position="right"
                        withArrow
                        transitionProps={{ duration: 0 }}
                    >
                        <UnstyledButton
                            onClick={onToggleCollapse}
                            className={`${classes.mainLink} ${classes.collapseLink}`}
                            visibleFrom="sm"
                            aria-label={collapsed ? 'Show links' : 'Hide links'}
                            aria-expanded={!collapsed}
                            aria-controls={LINKS_PANEL_ID}
                        >
                            {collapsed
                                ? <IconChevronRight size={22} stroke={1.5} />
                                : <IconChevronLeft size={22} stroke={1.5} />}
                        </UnstyledButton>
                    </Tooltip>
                </div>

                <div className={classes.main} id={LINKS_PANEL_ID}>
                    <Title order={4} className={classes.title}>
                        Lessons
                    </Title>

                    {links}
                </div>
            </div>
        </nav>
    );
}

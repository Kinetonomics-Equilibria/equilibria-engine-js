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
// Both lists are still the recipe's placeholder data — the app has no
// navigation to wire them to yet. Replace these two arrays (and the `useState`
// defaults below) when it does; nothing else here is placeholder.
const mainLinksMockdata = [
    { icon: IconHome2, label: 'Home' },
    { icon: IconGauge, label: 'Dashboard' },
    { icon: IconDeviceDesktopAnalytics, label: 'Analytics' },
    { icon: IconCalendarStats, label: 'Releases' },
    { icon: IconUser, label: 'Account' },
    { icon: IconFingerprint, label: 'Security' },
    { icon: IconSettings, label: 'Settings' }
];

const linksMockdata = [
    'Security',
    'Settings',
    'Dashboard',
    'Releases',
    'Account',
    'Orders',
    'Clients',
    'Databases',
    'Pull Requests',
    'Open Issues',
    'Wiki pages'
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
}

export function DoubleNavbar({ collapsed, onToggleCollapse }: DoubleNavbarProps) {
    // Which section is selected, and which link within it. Local state: nothing
    // outside the navbar reads it yet.
    const [active, setActive] = useState('Releases');
    const [activeLink, setActiveLink] = useState('Settings');

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

    const links = linksMockdata.map((link) => (
        <a
            className={classes.link}
            data-active={activeLink === link || undefined}
            href="#"
            onClick={(event) => {
                event.preventDefault();
                setActiveLink(link);
            }}
            key={link}
        >
            {link}
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
                        {active}
                    </Title>

                    {links}
                </div>
            </div>
        </nav>
    );
}

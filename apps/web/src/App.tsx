import { useCallback, useEffect, useState } from 'react';
import { AppShell, Burger } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { DoubleNavbar } from './components/DoubleNavbar';
import type { NavPanel } from './components/DoubleNavbar';
import { StudyScreen } from './StudyScreen';
import { CURRICULUM, lessonById } from './lessons';
import { usePresenting } from './present';
import { readLink, writeLink } from './links';
import classes from './App.module.css';

/** The lesson the address names: `?lesson=fx`. */
function lessonInUrl(): string | null {
    return new URLSearchParams(window.location.search).get('lesson');
}

// The navbar's width above `sm`, in a rem-free number because AppShell converts
// it. It is the icon rail and the margin to its left, and nothing else — the
// panel beside the rail floats over the page rather than widening the navbar —
// so it must be `--rail-width` plus `--rail-inset` in DoubleNavbar.module.css.
const NAVBAR_WIDTH = 64 + 8;

export function App() {
    // Below the `sm` breakpoint the navbar is a full-width overlay toggled by
    // the burger, and starts closed. Above it the navbar is always present and
    // the burger is hidden.
    const [mobileOpened, { open: openMobile, close: closeMobile }] = useDisclosure(false);

    // Which rail section's panel is out, if any. Put away until a rail icon
    // brings it out, and put away again once something in it is chosen.
    const [panel, setPanel] = useState<NavPanel | null>(null);

    const changePanel = useCallback((next: NavPanel | null) => {
        setPanel(next);
        // Below `sm` the panel is what the overlay is for, so putting it away
        // puts the overlay away too. Above it there is no overlay to close.
        if (!next) closeMobile();
    }, [closeMobile]);

    /**
     * Presenting puts the rail away, and Esc brings it back.
     *
     * The rail is about the app — where to go, who you are — and a class
     * watching a projector has no use for it, so the stage gets its width, and
     * arranges itself for it as it does for a wider window. Inert while it is
     * away, so the keyboard cannot reach buttons nobody can see. A lessons
     * panel left out goes with it.
     */
    const presenting = usePresenting();
    useEffect(() => {
        if (presenting) changePanel(null);
    }, [presenting, changePanel]);

    const toggleMobile = () => {
        if (mobileOpened) {
            changePanel(null);
        } else {
            openMobile();
            setPanel('lessons');
        }
    };

    /**
     * Which lesson is open, kept in the address as well as here.
     *
     * The address is what makes a lesson something a teacher can hand out, and
     * it is read once at load and written on every change — pushed rather than
     * replaced, so the browser's back button goes back to the last lesson
     * rather than out of the app. A lesson chosen opens at its start, so it is
     * pushed as the lesson alone.
     */
    const [lessonId, setLessonId] = useState(() => lessonById(lessonInUrl()).id);
    const lesson = lessonById(lessonId);

    useEffect(() => {
        const follow = () => setLessonId(lessonById(lessonInUrl()).id);
        window.addEventListener('popstate', follow);
        return () => window.removeEventListener('popstate', follow);
    }, []);

    const selectLesson = useCallback((id: string) => {
        if (id !== lessonId) {
            const url = new URL(window.location.href);
            url.search = writeLink(id);
            window.history.pushState(null, '', url);
            setLessonId(id);
        }
        // Choosing a lesson puts the list away, so the lesson gets the room:
        // the panel floats over the stage above `sm`, and below it the overlay
        // covers the lesson just chosen. The rail's Lessons icon brings it back.
        changePanel(null);
    }, [lessonId, changePanel]);

    /**
     * The rest of the view, which follows it in the address (`links.ts`).
     *
     * Replaced, never pushed: Back goes to the last lesson, not the last drag,
     * and the address bar is always the link to the view on screen. Each
     * history entry is so left at the view its lesson was left at, and Back
     * opens that lesson there, as a link would.
     */
    const followView = useCallback((search: string) => {
        if (search === window.location.search) return;
        const url = new URL(window.location.href);
        url.search = search;
        window.history.replaceState(window.history.state, '', url);
    }, []);

    // The view the address names, for the lesson it names. An address naming
    // a lesson there is not opens the first lesson at its start.
    const link = lessonInUrl() === lesson.id ? readLink(window.location.search) : undefined;

    return (
        // No `header` config and no AppShell.Header: the navbar is the only
        // fixed section, so nothing offsets it and it runs from the top of the
        // viewport to the bottom.
        <AppShell
            className={classes.shell}
            padding="md"
            navbar={{
                // Below `breakpoint` the width is 100% regardless, so this value
                // only bites on desktop.
                width: NAVBAR_WIDTH,
                breakpoint: 'sm',
                collapsed: { mobile: !mobileOpened || presenting, desktop: presenting }
            }}
        >
            {/* With no header there is no bar to hold the burger, so it
              * floats in the top corner instead — the only way to reach the
              * navbar on mobile, where it is closed by default. It sits above
              * the navbar's z-index so it stays clickable once the navbar is
              * open and covering the viewport, and in the *right* corner
              * because both things it would otherwise overlap — the page
              * heading, and the panel's title — are left-aligned. The page's
              * controls on the heading's line are right-aligned, so that line
              * stops short of it by `--app-burger-room` (App.module.css). */}
            <Burger
                opened={mobileOpened}
                onClick={toggleMobile}
                hiddenFrom="sm"
                size="sm"
                aria-label="Toggle navigation"
                className={classes.navbarToggle}
            />

            {/* No border: the rail inside is a card with an edge of its own. */}
            <AppShell.Navbar withBorder={false} className={classes.navbar} inert={presenting}>
                <DoubleNavbar
                    panel={panel}
                    onPanelChange={changePanel}
                    curriculum={CURRICULUM}
                    activeLesson={lesson.id}
                    onSelectLesson={selectLesson}
                />
            </AppShell.Navbar>

            <AppShell.Main>
                {/* No `.page` width cap here. That class exists for
                  * article-shaped pages and centres their text in 56rem; a
                  * study screen is not an article, and capping it would leave
                  * the stage measuring a column while the window has a room.
                  *
                  * Keyed by lesson, so another lesson is another screen: a new
                  * engine, a track at its start and no question half-asked,
                  * rather than one screen's state carried into a diagram it
                  * was never about. Opened at the view the address names, as a
                  * link opens. */}
                <StudyScreen key={lesson.id} content={lesson} link={link} onLinkChange={followView} />
            </AppShell.Main>
        </AppShell>
    );
}

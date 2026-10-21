import { useCallback, useEffect, useState } from 'react';
import { AppShell, Burger } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { DoubleNavbar } from './components/DoubleNavbar';
import type { NavPanel } from './components/DoubleNavbar';
import { StudyScreen } from './StudyScreen';
import { CURRICULUM, lessonById } from './lessons';
import classes from './App.module.css';

/** The lesson the address names: `?lesson=fx`. */
function lessonInUrl(): string | null {
    return new URLSearchParams(window.location.search).get('lesson');
}

// The navbar's width above `sm`, in a rem-free number because AppShell converts
// it. It is the icon rail and nothing else — the panel beside the rail floats
// over the page rather than widening the navbar — so it must match
// `flex: 0 0 60px` on `.aside` in DoubleNavbar.module.css.
const RAIL_WIDTH = 60;

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
     * rather than out of the app.
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
            url.searchParams.set('lesson', id);
            window.history.pushState(null, '', url);
            setLessonId(id);
        }
        // Choosing a lesson puts the list away, so the lesson gets the room:
        // the panel floats over the stage above `sm`, and below it the overlay
        // covers the lesson just chosen. The rail's Lessons icon brings it back.
        changePanel(null);
    }, [lessonId, changePanel]);

    return (
        // No `header` config and no AppShell.Header: the navbar is the only
        // fixed section, so nothing offsets it and it runs from the top of the
        // viewport to the bottom.
        <AppShell
            padding="md"
            navbar={{
                // Below `breakpoint` the width is 100% regardless, so this value
                // only bites on desktop.
                width: RAIL_WIDTH,
                breakpoint: 'sm',
                collapsed: { mobile: !mobileOpened }
            }}
        >
            {/* With no header there is no bar to hold the burger, so it
              * floats in the top corner instead — the only way to reach the
              * navbar on mobile, where it is closed by default. It sits above
              * the navbar's z-index so it stays clickable once the navbar is
              * open and covering the viewport, and in the *right* corner
              * because both things it would otherwise overlap — the page
              * heading, and the panel's title — are left-aligned. */}
            <Burger
                opened={mobileOpened}
                onClick={toggleMobile}
                hiddenFrom="sm"
                size="sm"
                aria-label="Toggle navigation"
                className={classes.navbarToggle}
            />

            <AppShell.Navbar>
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
                  * was never about. */}
                <StudyScreen key={lesson.id} content={lesson} />
            </AppShell.Main>
        </AppShell>
    );
}

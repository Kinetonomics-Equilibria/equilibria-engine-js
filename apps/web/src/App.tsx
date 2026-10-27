import { useCallback, useEffect, useState } from 'react';
import { AppShell, Burger } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { DoubleNavbar } from './components/DoubleNavbar';
import type { NavItem, NavPanel, NavStrand } from './components/DoubleNavbar';
import { StudyScreen } from './StudyScreen';
import type { Answered } from './StudyScreen';
import { CURRICULUM, lessonById, modelById, modelsOf, topicOfLesson, topicOfModel } from './lessons';
import { usePresenting } from './present';
import { readLink, readPlace, writeLink } from './links';
import type { Link, Place } from './links';
import { linkHref } from './share';
import classes from './App.module.css';

/** A page's address, from the site's root, for an `href`. */
const pathTo = (place: Place) => import.meta.env.BASE_URL + writeLink(place);

/**
 * What each of the rail's panels lists: the lessons, and the models they are
 * drawn on, in the same strands and topics with the same dots, so a model
 * sits under the topic its lessons do.
 */
const LISTS: Record<NavPanel, NavStrand[]> = {
    lessons: CURRICULUM.map(strand => ({
        label: strand.label,
        topics: strand.topics.map(topic => ({
            id: topic.id, label: topic.label, color: topic.color,
            items: topic.lessons.map((lesson): NavItem =>
                ({ id: lesson.id, label: lesson.label, href: pathTo({ kind: 'lesson', id: lesson.id }) }))
        }))
    })),
    playground: CURRICULUM.map(strand => ({
        label: strand.label,
        topics: strand.topics.map(topic => ({
            id: topic.id, label: topic.label, color: topic.color,
            items: modelsOf(topic).map((model): NavItem =>
                ({ id: model.id, label: model.name, href: pathTo({ kind: 'playground', id: model.id }) }))
        })).filter(topic => topic.items.length > 0)
    }))
};

/** The page that is open, and what opening it takes from the address. */
interface Page {
    place: Place;
    /** The view to open at, where the address names this page: otherwise it opens at its start. */
    link?: Link;
    /** The answers this history entry remembers, for a lesson. */
    answered?: Answered;
}

/**
 * The page the address names, and the view after its `?`.
 *
 * Home is not built, so the root opens the first lesson, as the app always
 * has. An id that names nothing opens the first lesson, or the first model,
 * at its start. An address from before the pages opens what it opened: a
 * lesson at its step, or, where it named one of the instruments' tabs, the
 * playground at the lesson's model, at that tab and market. The screen then
 * writes the address the page has now, so it says what did.
 *
 * A lesson's answers come from the history entry, never the address: Back to
 * a lesson finds it as the student left it, and a link handed round does not.
 */
function pageAt(): Page {
    const found = readPlace(window.location, import.meta.env.BASE_URL),
        link = readLink(window.location.search);
    if (found && found.place.kind === 'playground') {
        const model = modelById(found.place.id);
        return { place: { kind: 'playground', id: model.id }, link: model.id === found.place.id ? link : undefined };
    }
    const lesson = lessonById(found ? found.place.id : null),
        named = !!found && lesson.id === found.place.id;
    if (named && found.old && link.tab) return { place: { kind: 'playground', id: lesson.model.id }, link };
    const kept = window.history.state ? window.history.state.answered as Answered | undefined : undefined;
    return {
        place: { kind: 'lesson', id: lesson.id },
        link: named ? link : undefined,
        answered: named && kept && kept.lesson === lesson.id ? kept : undefined
    };
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

    /**
     * Which page is open — a lesson, or a model in the playground — kept in
     * the address as well as here.
     *
     * The address is what makes a page something a teacher can hand out, and
     * it is read at load and on Back and Forward, and written on every change:
     * opening a page is pushed, so the browser's back button goes back to the
     * last page rather than out of the app. A page chosen from the rail opens
     * at its start, so it is pushed as its path alone.
     */
    const [page, setPage] = useState(pageAt);
    const lesson = page.place.kind === 'lesson' ? lessonById(page.place.id) : null;
    const model = lesson ? lesson.model : modelById(page.place.id);
    const topic = lesson ? topicOfLesson(lesson.id) : topicOfModel(model.id);
    const place: NavPanel = lesson ? 'lessons' : 'playground';

    useEffect(() => {
        const follow = () => setPage(pageAt());
        window.addEventListener('popstate', follow);
        return () => window.removeEventListener('popstate', follow);
    }, []);

    const go = useCallback((address: string) => {
        window.history.pushState(null, '', linkHref(address));
        setPage(pageAt());
    }, []);

    const select = useCallback((panel: NavPanel, id: string) => {
        const next: Place = { kind: panel === 'lessons' ? 'lesson' : 'playground', id };
        if (next.kind !== page.place.kind || next.id !== page.place.id) go(writeLink(next));
        // Choosing puts the list away, so the page gets the room: the panel
        // floats over the stage above `sm`, and below it the overlay covers
        // the page just chosen. The rail's icon brings it back.
        changePanel(null);
    }, [page, go, changePanel]);

    const toggleMobile = () => {
        if (mobileOpened) {
            changePanel(null);
        } else {
            openMobile();
            // At the panel of the place the open page belongs to.
            setPanel(place);
        }
    };

    /**
     * The rest of the view, which follows it in the address (`links.ts`).
     *
     * Replaced, never pushed: Back goes to the last page, not the last drag,
     * and the address bar is always the link to the view on screen. Each
     * history entry is so left at the view its page was left at, and Back
     * opens that page there, as a link would.
     */
    const followView = useCallback((address: string) => {
        const url = new URL(linkHref(address));
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;
        window.history.replaceState(window.history.state, '', url);
    }, []);

    /**
     * A lesson's answers, kept in its history entry and nowhere a link goes,
     * so Back to the lesson finds them: at the recap, the questions it looks
     * back over, rather than the first of them asked again.
     */
    const remember = useCallback((answered: Answered) => {
        window.history.replaceState({ ...window.history.state, answered }, '', window.location.href);
    }, []);

    /**
     * Finish: the lesson's market, opened in the playground. Pushed, as
     * opening any page is, so Back returns to the recap — once the lesson's
     * own entry is brought up to the view it is leaving, which a paced write
     * may not have reached.
     */
    const finish = useCallback((address: string, from: string | null) => {
        if (from) followView(from);
        go(address);
    }, [followView, go]);

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
                    lists={LISTS}
                    page={{ place, id: page.place.id, topic: topic ? topic.id : null }}
                    onSelect={select}
                />
            </AppShell.Navbar>

            <AppShell.Main>
                {/* No `.page` width cap here. That class exists for
                  * article-shaped pages and centres their text in 56rem; a
                  * study screen is not an article, and capping it would leave
                  * the stage measuring a column while the window has a room.
                  *
                  * Keyed by page, so another page is another screen: a new
                  * engine, a track at its start and no question half-asked,
                  * rather than one screen's state carried into a diagram it
                  * was never about. Opened at the view the address names, as a
                  * link opens. */}
                {lesson ? (
                    <StudyScreen
                        key={`lesson/${lesson.id}`}
                        content={lesson}
                        topic={topic}
                        link={page.link}
                        answered={page.answered}
                        onLinkChange={followView}
                        onAnswer={remember}
                        onFinish={finish}
                    />
                ) : (
                    <StudyScreen
                        key={`playground/${model.id}`}
                        playground={model}
                        topic={topic}
                        link={page.link}
                        onLinkChange={followView}
                    />
                )}
            </AppShell.Main>
        </AppShell>
    );
}

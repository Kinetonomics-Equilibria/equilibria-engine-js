import { AppShell, Burger } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { DoubleNavbar } from './components/DoubleNavbar';
import { StudyScreen } from './StudyScreen';
import classes from './App.module.css';

// The navbar's two columns, in rem-free numbers because AppShell converts them.
// `RAIL` is the icon rail on its own — it must match `flex: 0 0 60px` on
// `.aside` in DoubleNavbar.module.css, since that rail is all that is left when
// the second column is collapsed.
const NAVBAR_WIDTH = { RAIL: 60, FULL: 300 };

export function App() {
    // Two independent collapses, which is why they are two hooks. Below the
    // `sm` breakpoint the navbar is a full-width overlay toggled by the burger,
    // and starts closed. Above it the navbar is always present and the burger
    // is hidden; what collapses there is the navbar's second column, which
    // starts open.
    const [mobileOpened, { toggle: toggleMobile }] = useDisclosure(false);
    const [linksOpened, { toggle: toggleLinks }] = useDisclosure(true);

    return (
        // No `header` config and no AppShell.Header: the navbar is the only
        // fixed section, so nothing offsets it and it runs from the top of the
        // viewport to the bottom.
        <AppShell
            padding="md"
            navbar={{
                // Narrowing the navbar is what makes the collapse visible: the
                // column inside it is hidden by CSS, and this takes the space
                // back so AppShell.Main widens into it. Below `breakpoint` the
                // width is 100% regardless, so this value only bites on
                // desktop — the same place the toggle is shown.
                width: linksOpened ? NAVBAR_WIDTH.FULL : NAVBAR_WIDTH.RAIL,
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
              * heading, and the navbar's section title — are left-aligned. */}
            <Burger
                opened={mobileOpened}
                onClick={toggleMobile}
                hiddenFrom="sm"
                size="sm"
                aria-label="Toggle navigation"
                className={classes.navbarToggle}
            />

            <AppShell.Navbar className={classes.shellNavbar}>
                <DoubleNavbar collapsed={!linksOpened} onToggleCollapse={toggleLinks} />
            </AppShell.Navbar>

            <AppShell.Main>
                {/* No `.page` width cap here. That class exists for
                  * article-shaped pages and centres their text in 56rem; a
                  * study screen is not an article, and capping it would leave
                  * the stage measuring a column while the window has a room. */}
                <StudyScreen />
            </AppShell.Main>
        </AppShell>
    );
}

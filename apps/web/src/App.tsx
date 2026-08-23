import { AppShell, Burger } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { EquilibriaCard } from 'equilibria-react';
import { DoubleNavbar } from './components/DoubleNavbar';
import classes from './App.module.css';

// A linear supply-and-demand market, built from primitive Line and Point
// objects. This started as a workaround for NOTES.md issue 2; that is fixed, so
// EconLinearEquilibrium would draw the same market in fewer lines, but the
// primitive version shows the params/calcs binding this app is built around.
//
// `params` hold the state, `calcs` solve the equilibrium from them, and the
// objects bind to both, so changing a param re-solves and re-renders rather
// than redrawing a static picture.
//
// The engine is headless: it renders the diagram, not a control panel. Slider
// UI for `params` is the app's job — the `useEquilibria` hook exposes
// `updateParams()` for that when we need it.
const linearEquilibrium = {
    schema: 'EconSchema',
    params: [
        { name: 'a', value: 20, min: 12, max: 28, round: 0.1 },
        { name: 'c', value: 2, min: 0, max: 8, round: 0.1 }
    ],
    // demand P = a - Q, supply P = c + Q  =>  Q* = (a - c)/2, P* = (a + c)/2
    calcs: {
        Qe: '(params.a - params.c)/2',
        Pe: '(params.a + params.c)/2'
    },
    layout: {
        OneGraph: {
            graph: {
                xAxis: { title: 'Q', min: 0, max: 20 },
                yAxis: { title: 'P', min: 0, max: 20 },
                objects: [
                    {
                        type: 'Line',
                        def: {
                            yIntercept: 'params.a', slope: -1,
                            color: 'colors.demand', label: { text: 'D' }
                        }
                    },
                    {
                        type: 'Line',
                        def: {
                            yIntercept: 'params.c', slope: 1,
                            color: 'colors.supply', label: { text: 'S' }
                        }
                    },
                    {
                        type: 'Point',
                        def: {
                            x: 'calcs.Qe', y: 'calcs.Pe',
                            color: 'colors.equilibriumPrice',
                            droplines: { vertical: 'Q^*', horizontal: 'P^*' }
                        }
                    }
                ]
            }
        }
    }
};

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
                {/* A plain div, not <main>: AppShell.Main already renders the
                  * page's one <main> element. */}
                <div className="page">
                    <h1>Equilibria</h1>
                    <p className="lede">
                        Interactive economics diagrams for students.
                    </p>

                    <EquilibriaCard
                        config={linearEquilibrium}
                        title="Market equilibrium"
                        description="Linear supply and demand. The equilibrium price and quantity are solved from the curve parameters rather than drawn in by hand."
                        variant="elevated"
                        onError={(error) => console.error('Equilibria failed to mount:', error)}
                    />
                </div>
            </AppShell.Main>
        </AppShell>
    );
}

import { EquilibriaCard } from 'equilibria-react';

// A linear supply-and-demand market.
//
// `params` hold the state and the objects bind to them, so changing a param
// re-solves and re-renders rather than redrawing a static picture.
// EconLinearEquilibrium solves the intersection itself and publishes it as
// calcs.equilibrium.Q / .P, so the app does not restate the algebra.
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
    layout: {
        OneGraph: {
            graph: {
                xAxis: { title: 'Q', min: 0, max: 20 },
                yAxis: { title: 'P', min: 0, max: 20 },
                objects: [
                    {
                        type: 'EconLinearEquilibrium',
                        def: {
                            // demand P = a - Q, supply P = c + Q
                            demand: {
                                yIntercept: 'params.a', slope: -1,
                                label: { text: 'D' }
                            },
                            supply: {
                                yIntercept: 'params.c', slope: 1,
                                label: { text: 'S' }
                            },
                            equilibrium: {}
                        }
                    }
                ]
            }
        }
    }
};

export function App() {
    return (
        <main className="page">
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
        </main>
    );
}

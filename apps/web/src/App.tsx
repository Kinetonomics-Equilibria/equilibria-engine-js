import { EquilibriaCard } from 'equilibria-react';

// A linear supply-and-demand market, built from primitive Line and Point
// objects rather than the EconLinearEquilibrium wrapper, which currently solves
// the wrong intersection — see NOTES.md, issue 2.
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

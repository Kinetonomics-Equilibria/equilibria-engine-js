import { axis, curve, equilibrium, namedArea, priceAxis } from '../kit/chart';
import type { ParamDefinition, PanelDefinition } from '../kit/lesson';

/**
 * One market drawn three ways: the market, what buyers gain, and what
 * sellers earn. Demand is `P = a − Q` and supply `P = c + Q`, so each param
 * is where its curve meets the price axis.
 */

export const PARAMS: ParamDefinition[] = [
    { name: 'a', value: 20, min: 12, max: 28, round: 0.1 },
    { name: 'c', value: 2, min: 0, max: 8, round: 0.1 }
];

// Solved from the params rather than drawn in by hand, and read back by the
// chips through `kg:param_changed`. One definition serves the diagram and the
// number beside it, which is the only way the two cannot disagree.
export const CALCS = {
    Qe: '(params.a - params.c)/2',
    Pe: '(params.a + params.c)/2',
    CS: '0.5 * calcs.Qe * (params.a - calcs.Pe)',
    TR: 'calcs.Pe * calcs.Qe'
};

/** Where a demand curve with intercept `a` is labelled; see `demand`. */
const DEMAND_LABEL_AT = (a: string) => `min(${a}, 20) - 2`;

/**
 * Demand, in a panel: the one thing a student moves directly.
 *
 * A `name` is an address; a `title` is what the thing is called. These panels
 * draw one market three ways, so each holds a demand curve, and the three are
 * the same curve. Naming them all `demand` made them one *address*, which
 * they are not: names double as calc keys, so the engine warned that two
 * objects were sharing `calcs.demand` and only the first survived. Named per
 * panel and all titled `demand`, they say exactly what is true — three
 * drawings, one thing — and narration says "demand" once because the title is
 * what it groups by.
 *
 * Dragged up and down by its intercept, which keeps "shift the curve" from
 * becoming "rotate the curve" and so makes a direction question answerable at
 * all.
 *
 * Only the market panel draws where it was, and the question: the ghost is
 * the one that carries a qualifier, D₀, and the live curve is D in every
 * panel. The engine's default pairing primed the curve that has a ghost, so
 * the same curve read D′ in the market and D in the two panels beside it.
 */
const demand = (panel: string) => curve({
    name: 'demand_' + panel, title: 'demand', meaning: 'demand', symbol: 'D', type: 'Line',
    moves: ['a'],
    shape: p => ({ yIntercept: p.a, slope: -1 }),
    // Positioned by x along the line: a `Line` builds a univariate function
    // before it reaches `Curve`, so a label with an x lands on the curve. At
    // its lower-right end, where a textbook puts it: two short of where it
    // leaves the panel, through the quantity axis or, past a = 20, the
    // right-hand edge. At x = 4 it was at the top left, which in the surplus
    // panel is inside the shaded triangle.
    labelAt: p => ({ x: DEMAND_LABEL_AT(p.a) }),
    drag: [{ vertical: 'a' }],
    ghost: panel === 'market', asked: panel === 'market'
});

/**
 * Supply, in a panel, at its upper-right end: a price of 18 whatever `c` is.
 * At x = 16 a `c` over 4 put the label above the top of the panel.
 *
 * Except when the market clears up there too: P* reaches 18 with `a` and `c`
 * both near the top of their ranges, and the label was drawn over the
 * equilibrium. Higher up it does not fit in a small panel, and the engine
 * slides it back down onto the point. So it goes to the curve's other end,
 * which is then nowhere near P*.
 */
const supply = (panel: string) => curve({
    name: 'supply_' + panel, title: 'supply', meaning: 'supply', symbol: 'S', type: 'Line',
    moves: ['c'],
    shape: p => ({ yIntercept: p.c, slope: 1 }),
    labelAt: p => ({ x: `calcs.Pe > 16 ? 1.5 : 18 - ${p.c}` })
});

/**
 * Where the market clears. In the market panel, also where it cleared before,
 * and the move between the two — the sentence the diagram is trying to say.
 */
const cleared = (panel: string) => equilibrium({
    name: 'equilibrium_' + panel, x: 'calcs.Qe', y: 'calcs.Pe', droplines: ['Q^*', 'P^*'],
    ghost: panel === 'market'
});

/** In words, with the unit: "P" and "Q" were letters nothing on screen explained. */
const axes = () => ({ xAxis: axis('Quantity', 0, 20), yAxis: priceAxis(20) });

/**
 * The three panels, and which number each one's caption headlines.
 *
 * Naming a calc is a claim about what a panel is *for*, which is an editorial
 * decision about economics and belongs in the app rather than in the binding or
 * the engine. A headline names one of the narrated calcs, and takes its label,
 * unit and decimals from there rather than declaring its own: the caption reads
 * "Market · Price $13.00" and the strip under it reads "Price $11.00 → $13.00".
 *
 * The question's target is drawn after a verdict and not before: with a
 * target visible the task stops being economics and becomes aiming.
 */
export const PANELS: PanelDefinition[] = [
    {
        key: 'market', name: 'Market', headline: 'Pe',
        ...axes(),
        objects: [...demand('market'), ...supply('market'), cleared('market')]
    },
    {
        key: 'surplus', name: 'Consumer surplus', headline: 'CS',
        ...axes(),
        objects: [
            ...demand('surplus'), ...supply('surplus'),
            // The triangle between demand and P*, out to the quantity traded.
            // The panel's one area, so its title names it.
            //
            // Producer surplus was shaded under it as well, in supply's
            // orange, with no label, under a title saying "Consumer surplus" —
            // and no step ever mentions it. A student could only take it for
            // part of what the title named. It comes back with a step that
            // teaches it, and a label of its own.
            namedArea({
                name: 'consumerSurplus', meaning: 'demand',
                shape: { fn1: 'params.a - (x)', fn2: 'calcs.Pe', min: 0, max: 'calcs.Qe' },
                srTitle: 'Consumer surplus'
            }),
            cleared('surplus')
        ]
    },
    {
        key: 'revenue', name: 'Revenue', headline: 'TR',
        ...axes(),
        objects: [
            ...demand('revenue'), ...supply('revenue'),
            // Price times quantity, so the equilibrium's green.
            namedArea({
                name: 'revenue', meaning: 'equilibriumPrice', type: 'Rectangle',
                shape: { a: [0, 0], b: ['calcs.Qe', 'calcs.Pe'] },
                srTitle: 'Total revenue'
            }),
            cleared('revenue')
        ]
    }
];

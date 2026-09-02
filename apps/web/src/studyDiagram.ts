/**
 * One diagram, three panels, one market.
 *
 * The panels are not three charts that happen to sit together: they are one
 * config, one engine and one set of params, so a drag in whichever panel is
 * focal moves all three at once with nothing in this app synchronising them.
 * That is the whole reason the stage places regions of a single canvas rather
 * than mounting a component per panel.
 *
 * The rects are missing on purpose. `Stage` computes them from the space it is
 * given and writes them in, which is what lets the arrangement respond to the
 * viewport and lets a promotion be a param change rather than a rebuild.
 */

/** Demand's intercept is the one thing a student moves directly. */
const DRAG_DEMAND = [{ vertical: 'a' }];

/**
 * A `name` is an address; a `title` is what the thing is called.
 *
 * These panels draw one market three ways, so each of them holds a demand
 * curve, and the three are the same curve. Naming them all `demand` made them
 * one *address*, which they are not: names double as calc keys, so the engine
 * warned that two objects were sharing `calcs.demand` and only the first
 * survived. Naming them per panel and titling them all `demand` says exactly
 * what is true — three drawings, one thing — and narration says "demand" once
 * because the title is what it groups by.
 */
const demand = (panel: string, draggable = false) => ({
    type: 'Line',
    def: {
        name: 'demand_' + panel, title: 'demand',
        yIntercept: 'params.a', slope: -1,
        color: 'colors.demand',
        // Positioned by x along the line: a `Line` builds a univariate function
        // before it reaches `Curve`, so a label with an x lands on the curve.
        label: { text: 'D', x: 4 },
        ...(draggable ? { drag: DRAG_DEMAND } : {})
    }
});

const supply = (panel: string) => ({
    type: 'Line',
    def: {
        name: 'supply_' + panel, title: 'supply',
        yIntercept: 'params.c', slope: 1,
        color: 'colors.supply',
        label: { text: 'S', x: 16 }
    }
});

/**
 * Where demand was when the student took hold of it.
 *
 * `prev.params.a` is the value the live curve is bound to, one snapshot ago —
 * no shadow param and no bookkeeping in the app — and `prev.changed` keeps it
 * off screen until something actually moves.
 */
const demandGhost = () => ({
    type: 'Line',
    def: {
        yIntercept: 'prev.params.a', slope: -1,
        color: 'colors.demand', lineStyle: 'dashed',
        strokeOpacity: 0.35, show: 'prev.changed'
    }
});

const equilibrium = (panel: string) => ({
    type: 'Point',
    def: {
        name: 'equilibrium_' + panel, title: 'equilibrium',
        x: 'calcs.Qe', y: 'calcs.Pe',
        color: 'colors.equilibriumPrice',
        droplines: { vertical: 'Q^*', horizontal: 'P^*' },
        srTitle: 'Equilibrium'
    }
});

const axes = () => ({
    xAxis: { title: 'Q', min: 0, max: 20 },
    yAxis: { title: 'P', min: 0, max: 20 }
});

export const studyDiagram = {
    schema: 'EconSchema',

    params: [
        { name: 'a', value: 20, min: 12, max: 28, round: 0.1 },
        { name: 'c', value: 2, min: 0, max: 8, round: 0.1 }
    ],

    // Solved from the params rather than drawn in by hand, and read back by the
    // chips through `kg:param_changed`. One definition serves the diagram and
    // the number beside it, which is the only way the two cannot disagree.
    //
    // The deltas are calcs like any other. `prev.calcs` is the state at the last
    // snapshot — the one the ghosts above are drawn from — so a chip and a ghost
    // are always describing the same movement.
    calcs: {
        Qe: '(params.a - params.c)/2',
        Pe: '(params.a + params.c)/2',
        CS: '0.5 * calcs.Qe * (params.a - calcs.Pe)',
        TR: 'calcs.Pe * calcs.Qe',
        dPe: 'calcs.Pe - prev.calcs.Pe',
        dCS: 'calcs.CS - prev.calcs.CS',
        dTR: 'calcs.TR - prev.calcs.TR'
    },

    layout: {
        CustomLayout: {
            panels: [
                {
                    key: 'market',
                    ...axes(),
                    objects: [
                        demand('market', true), demandGhost(), supply('market'),
                        equilibrium('market'),
                        // Where the market cleared before, and the move between
                        // the two — the sentence the diagram is trying to say.
                        {
                            type: 'Point',
                            def: {
                                x: 'prev.calcs.Qe', y: 'prev.calcs.Pe',
                                color: 'colors.equilibriumPrice',
                                strokeOpacity: 0.35, opacity: 0.35, show: 'prev.changed'
                            }
                        },
                        {
                            type: 'Arrow',
                            def: {
                                begin: ['prev.calcs.Qe', 'prev.calcs.Pe'],
                                end: ['calcs.Qe', 'calcs.Pe'],
                                color: 'colors.equilibriumPrice', show: 'prev.changed'
                            }
                        }
                    ]
                },
                {
                    key: 'surplus',
                    ...axes(),
                    objects: [
                        demand('surplus', true), supply('surplus'),
                        // The two triangles either side of the clearing price,
                        // between each curve and P*, out to the quantity traded.
                        {
                            type: 'Area',
                            def: {
                                name: 'consumerSurplus',
                                fn1: 'params.a - (x)', fn2: 'calcs.Pe',
                                min: 0, max: 'calcs.Qe',
                                color: 'colors.demand',
                                srTitle: 'Consumer surplus'
                            }
                        },
                        {
                            type: 'Area',
                            def: {
                                name: 'producerSurplus',
                                fn1: 'calcs.Pe', fn2: 'params.c + (x)',
                                min: 0, max: 'calcs.Qe',
                                color: 'colors.supply',
                                srTitle: 'Producer surplus'
                            }
                        },
                        equilibrium('surplus')
                    ]
                },
                {
                    key: 'revenue',
                    ...axes(),
                    objects: [
                        demand('revenue', true), supply('revenue'),
                        {
                            type: 'Rectangle',
                            def: {
                                name: 'revenue',
                                a: [0, 0], b: ['calcs.Qe', 'calcs.Pe'],
                                color: 'colors.equilibriumPrice',
                                srTitle: 'Total revenue'
                            }
                        },
                        equilibrium('revenue')
                    ]
                }
            ]
        }
    }
};

/**
 * What the app calls each panel, and which number is worth putting on its chip.
 *
 * The plan left this open — a delta chip needs a "headline value" and nobody
 * had decided where one comes from. It comes from here, and only from here:
 * naming a calc is a claim about what a panel is *for*, which is an editorial
 * decision about economics and belongs in the app rather than in the binding or
 * the engine. The stage never sees it.
 */
export const PANELS = [
    { key: 'market', name: 'Market', headline: 'Pe', delta: 'dPe', unit: '$' },
    { key: 'surplus', name: 'Consumer surplus', headline: 'CS', delta: 'dCS', unit: '$' },
    { key: 'revenue', name: 'Revenue', headline: 'TR', delta: 'dTR', unit: '$' }
] as const;

/**
 * The numbers the narration strip reports as consequences, most important first.
 *
 * Declared here for the same reason a panel's headline is: `calcs` holds
 * everything the diagram computes, including a bag of geometry per named object,
 * and which of them are *results a student should read* is a claim about
 * economics rather than something a component could work out. This list is the
 * panels' headlines plus `Qe`, which no panel headlines and every chain needs —
 * a price that moved without a quantity is half an event.
 *
 * Order matters twice over: it is the order the clauses appear in, and the first
 * entry is what "why?" opens the maths explainer on.
 */
export const NARRATED_CALCS = [
    { name: 'Pe', label: 'P*', unit: '$' },
    { name: 'Qe', label: 'Q*' },
    { name: 'CS', label: 'CS', unit: '$' },
    { name: 'TR', label: 'TR', unit: '$' }
];

/**
 * The calcs worth explaining, and their formulas.
 *
 * Derived from the config rather than restated, so a calc added above appears in
 * the Maths instrument without anyone remembering to list it. The deltas are
 * filtered out: `calcs.Pe - prev.calcs.Pe` is a true formula and a useless
 * explanation — it says a change is a change. What a student asking "why?" wants
 * is where the *level* comes from.
 */
export const EXPLAINED_CALCS: Record<string, string> = Object.keys(studyDiagram.calcs)
    .filter(name => !/^d[A-Z]/.test(name))
    .reduce((out, name) => {
        out[name] = (studyDiagram.calcs as Record<string, string>)[name];
        return out;
    }, {} as Record<string, string>);

/**
 * Named param sets a student can jump to.
 *
 * Applied instantly rather than animated. Two curves sliding simultaneously is
 * a pretty thing that teaches less than a sentence naming what shifted — and the
 * sentence is already there, under the stage, generated from the same change.
 *
 * They live beside the diagram for now because a real content model is its own
 * piece of work; expect this to move.
 */
export const SCENARIOS = [
    {
        id: 'demand-shock',
        label: 'Demand shock',
        description: 'Incomes rise and buyers want more at every price.',
        params: { a: 26 }
    },
    {
        id: 'input-costs',
        label: 'Input costs rise',
        description: 'Production gets dearer, so sellers need more to supply the same quantity.',
        params: { c: 6 }
    },
    {
        id: 'both',
        label: 'Boom and cost squeeze',
        description: 'Both at once — the quantity effects work against each other.',
        params: { a: 26, c: 6 }
    },
    {
        id: 'baseline',
        label: 'Back to baseline',
        params: { a: 20, c: 2 }
    }
];

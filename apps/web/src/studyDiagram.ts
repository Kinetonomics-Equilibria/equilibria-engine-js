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

const demand = (draggable = false) => ({
    type: 'Line',
    def: {
        name: 'demand',
        yIntercept: 'params.a', slope: -1,
        color: 'colors.demand',
        // Positioned by x along the line: a `Line` builds a univariate function
        // before it reaches `Curve`, so a label with an x lands on the curve.
        label: { text: 'D', x: 4 },
        ...(draggable ? { drag: DRAG_DEMAND } : {})
    }
});

const supply = () => ({
    type: 'Line',
    def: {
        name: 'supply',
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

const equilibrium = () => ({
    type: 'Point',
    def: {
        name: 'equilibrium',
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
                        demand(true), demandGhost(), supply(), equilibrium(),
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
                        demand(true), supply(),
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
                        equilibrium()
                    ]
                },
                {
                    key: 'revenue',
                    ...axes(),
                    objects: [
                        demand(true), supply(),
                        {
                            type: 'Rectangle',
                            def: {
                                name: 'revenue',
                                a: [0, 0], b: ['calcs.Qe', 'calcs.Pe'],
                                color: 'colors.equilibriumPrice',
                                srTitle: 'Total revenue'
                            }
                        },
                        equilibrium()
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

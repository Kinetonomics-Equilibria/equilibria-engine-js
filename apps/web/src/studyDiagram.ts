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

/**
 * Demand's intercept is the one thing a student moves directly.
 *
 * Locked to one axis, which is what keeps "shift the curve" from becoming
 * "rotate the curve" and therefore what makes a direction question answerable
 * at all. `draggable` is what a committed answer freezes: while `submitted` is
 * set the curve refuses the drag and stops showing a resize cursor, so a taken
 * answer reads as taken rather than as a diagram that has broken.
 */
const DRAG_DEMAND = [{ vertical: 'a', draggable: 'not(params.submitted)' }];

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
const demand = (panel: string, draggable = false, ghost = false) => ({
    type: 'Line',
    def: {
        name: 'demand_' + panel, title: 'demand',
        yIntercept: 'params.a', slope: -1,
        color: 'colors.demand',
        // Positioned by x along the line: a `Line` builds a univariate function
        // before it reaches `Curve`, so a label with an x lands on the curve.
        label: { text: 'D', x: 4 },
        ...(draggable ? { drag: DRAG_DEMAND } : {}),
        // Where this curve was when the student took hold of it (P13). The
        // engine builds the dashed twin from this same def, so the two cannot
        // disagree about slope, colour or anything else — and it relabels this
        // one D' for as long as the ghost is up.
        //
        // Off while a question is on screen, where `startA` below draws the
        // "before" instead. `prev` is per *gesture*, so a student on their
        // second attempt would see it slide up to the start of that attempt
        // while the answer is still being marked from the question's own
        // starting line — two dashed curves claiming to be the same thing.
        ...(ghost ? { ghost: { show: 'not(params.asking)' } } : {})
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
 * The question apparatus: where demand was when it was asked, and where it goes.
 *
 * Both are params rather than expressions over `prev`, and that is the whole
 * point. The graded start and the drawn start are then one number, written once
 * when the question is armed — the alternative disagrees with itself the moment
 * the student takes a second run at it.
 *
 * `answerA` is drawn only after a verdict. There is deliberately nothing on
 * screen to aim at during the attempt: with a target visible the task stops
 * being economics and becomes aiming.
 */
const questionStart = () => ({
    type: 'Line',
    def: {
        name: 'questionStart',
        yIntercept: 'params.startA', slope: -1,
        color: 'colors.demand', lineStyle: 'dashed',
        strokeOpacity: 0.35, show: 'params.asking'
    }
});

const questionAnswer = () => ({
    type: 'Line',
    def: {
        name: 'questionAnswer',
        yIntercept: 'params.answerA', slope: -1,
        // Demand's own colour, because it *is* demand — dotted and at full
        // weight, which separates it from the start ghost (dashed and faint)
        // without borrowing the equilibrium's green and reading as a dropline.
        color: 'colors.demand', lineStyle: 'dotted',
        label: { text: 'D_1', x: 4 },
        show: 'params.revealed'
    }
});

const equilibrium = (panel: string, ghost = false) => ({
    type: 'Point',
    def: {
        name: 'equilibrium_' + panel, title: 'equilibrium',
        x: 'calcs.Qe', y: 'calcs.Pe',
        color: 'colors.equilibriumPrice',
        droplines: { vertical: 'Q^*', horizontal: 'P^*' },
        srTitle: 'Equilibrium',
        // Where the market cleared before, and the move between the two — the
        // sentence the diagram is trying to say. A point has one position, so
        // the engine draws the arrow as well as the faint twin. The droplines
        // are deliberately not inherited: two axis labels reading `P^*` at two
        // heights would be a contradiction rather than a memory.
        ...(ghost ? { ghost: true } : {})
    }
});

const axes = () => ({
    xAxis: { title: 'Q', min: 0, max: 20 },
    yAxis: { title: 'P', min: 0, max: 20 }
});

/**
 * The lesson, in order (P10).
 *
 * Inline beside the diagram, and that is a deliberate stopgap rather than a
 * design: a real content model would let several lessons address one diagram
 * and would live somewhere a teacher could edit. Expect this to move, and keep
 * it as data so that moving it is a cut and a paste.
 *
 * `reveal` and `set` are the engine's — `compileSteps` turns a reveal into
 * `show: 'params.step >= n'` on the objects or the panel it names, and hands
 * `set` back rather than applying it. `say` is the app's and rides on the same
 * objects. One list, one order: the engine sees the whole thing and returns the
 * whole thing from `kg.steps()`, so nothing app-side can disagree with the
 * diagram about how many steps there are.
 *
 * The market panel's frame is not revealed by any step, so it is there from the
 * start: the lesson draws *into* a pair of labelled axes rather than beginning
 * with a blank rectangle. The other two panels are revealed by their key, which
 * takes their axes and axis titles with them — the whole point being that the
 * second panel arrives as an event with a sentence attached, rather than
 * sitting there from the first frame waiting to be explained.
 */
export const LESSON = [
    {
        reveal: ['demand_market'],
        say: 'Demand slopes down: at a higher price, buyers want less.'
    },
    {
        reveal: ['supply_market'],
        say: 'Supply slopes up: a higher price is worth producing more at.'
    },
    {
        reveal: ['equilibrium_market'],
        say: 'Where they cross, the market clears — one price, one quantity.'
    },
    {
        reveal: ['surplus'],
        say: 'The same market, shaded: what buyers and sellers gain by trading at that price.'
    },
    {
        set: { a: 26 },
        say: 'Incomes rise, so buyers want more at every price. Watch both panels.'
    },
    {
        reveal: ['revenue'],
        say: 'And the money that changes hands: the price times the quantity sold.'
    },
    {
        set: { a: 20 },
        say: 'Back where we started, with every panel on screen.'
    },
    // The question the build-up was for (P11). It sets its own starting value
    // rather than inheriting whatever the student last left — the answer is
    // marked from where the question began, so where it begins should not
    // depend on what they did while exploring. One param, so the non-atomic
    // multi-param update cannot bite here; two would be order-dependent.
    //
    // Direction is the question. The target makes the magnitude half real as
    // well, and gives the reveal something to draw — a direction-only question
    // has no "correct position", only a correct way.
    {
        set: { a: 20 },
        say: 'Now you. Incomes rise again — move demand to where it belongs, then check.',
        ask: { param: 'a', direction: 'up', target: 26, tolerance: 1 }
    },
    // The lesson hands the market back where it found it, which is what makes
    // "free exploration is the track at its last position" true rather than
    // nearly true: the end of the build-up is the diagram as the config
    // declares it, with everything drawn and nothing left mid-demonstration.
    {
        set: { a: 20 },
        say: 'That is the mechanism: one shift, and price, quantity, surplus and revenue all move together. The market is yours now.'
    }
];

export const studyDiagram = {
    schema: 'EconSchema',

    steps: LESSON,

    params: [
        { name: 'a', value: 20, min: 12, max: 28, round: 0.1 },
        { name: 'c', value: 2, min: 0, max: 8, round: 0.1 },

        // The question apparatus (P11). Every one of them is `presentation`,
        // and that is load-bearing rather than tidy: `prev.changed` counts
        // non-presentation params that differ from the snapshot, so arming a
        // question without this would draw the dashed ghost of a curve nobody
        // had touched — P10's finding 4, in the plan that inherited it.
        //
        // It also keeps them out of the narration strip and the Explore
        // instrument, neither of which should offer a student a slider for
        // "has this been submitted".
        { name: 'asking', value: 0, min: 0, max: 1, round: 1, presentation: true },
        { name: 'submitted', value: 0, min: 0, max: 1, round: 1, presentation: true },
        { name: 'revealed', value: 0, min: 0, max: 1, round: 1, presentation: true },
        // Bounded like `a`, because they are drawn as the same curve.
        { name: 'startA', value: 20, min: 12, max: 28, round: 0.1, presentation: true },
        { name: 'answerA', value: 20, min: 12, max: 28, round: 0.1, presentation: true }
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
                        demand('market', true, true),
                        questionStart(), questionAnswer(), supply('market'),
                        equilibrium('market', true)
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
 * Which params draw the question, for each param a question may be about.
 *
 * The plan called the reveal "a third curve shown on a `revealed` param", which
 * is right for a diagram with one askable param and quietly wrong for two: the
 * curve is bound to a *particular* param's geometry, so a question about `c`
 * drawn through demand's apparatus would show the student a confident wrong
 * answer. Naming the mapping makes the limit visible instead — a question about
 * a param with no entry here draws nothing and says so in dev.
 *
 * `asking`, `submitted` and `revealed` are shared, because they are about the
 * question rather than about the curve.
 */
export const QUESTION_APPARATUS: Record<string, { start: string; answer: string }> = {
    a: { start: 'startA', answer: 'answerA' }
};

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

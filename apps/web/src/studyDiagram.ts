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

/** Where a demand curve with intercept `a` is labelled; see `demand`. */
const DEMAND_LABEL_AT = (a: string) => `min(${a}, 20) - 2`;

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
        //
        // At its lower-right end, where a textbook puts it: two short of where
        // it leaves the panel, through the quantity axis or, past a = 20, the
        // right-hand edge. At x = 4 it was at the top left, which in the
        // surplus panel is inside the shaded triangle (docs/chart-design.md).
        label: { text: 'D', x: DEMAND_LABEL_AT('params.a') },
        ...(draggable ? { drag: DRAG_DEMAND } : {}),
        // Where this curve was when the student took hold of it (P13). The
        // engine builds the dashed twin from this same def, so the two cannot
        // disagree about slope, colour or anything else.
        //
        // The ghost is the one that carries a qualifier, D₀; the live curve is
        // D, always, in every panel. Only the market panel draws the ghost, and
        // the engine's default pairing primes the curve that has one — so the
        // same curve read D′ in the market and D in the two panels beside it.
        // It also primed the wrong one on the way back: when the lesson returns
        // demand to where it started, the curve at the original place was D′
        // and the place it had just left was D.
        //
        // Off while a question is on screen, where `startA` below draws the
        // "before" instead. `prev` is per *gesture*, so a student on their
        // second attempt would see it slide up to the start of that attempt
        // while the answer is still being marked from the question's own
        // starting line — two dashed curves claiming to be the same thing.
        ...(ghost ? { ghost: { show: 'not(params.asking)', label: '_0' } } : {})
    }
});

const supply = (panel: string) => ({
    type: 'Line',
    def: {
        name: 'supply_' + panel, title: 'supply',
        yIntercept: 'params.c', slope: 1,
        color: 'colors.supply',
        // At its upper-right end, a price of 18 whatever `c` is. At x = 16 a
        // `c` over 4 put the label above the top of the panel.
        //
        // Except when the market clears up there too: P* reaches 18 with `a`
        // and `c` both near the top of their ranges, and the label was drawn
        // over the equilibrium. Higher up it does not fit in a small panel,
        // and the engine slides it back down onto the point. So it goes to
        // the curve's other end, which is then nowhere near P*.
        label: { text: 'S', x: 'calcs.Pe > 16 ? 1.5 : 18 - params.c' }
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
        label: { text: 'D_1', x: DEMAND_LABEL_AT('params.answerA') },
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

/** In words, with the unit: "P" and "Q" were letters nothing on screen explained. */
const axes = () => ({
    xAxis: { title: 'Quantity', min: 0, max: 20 },
    yAxis: { title: 'Price (\\$)', min: 0, max: 20 }
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
 * `set` back rather than applying it. `title`, `say`, `term`, `part` and `ask`
 * are the app's and ride on the same objects. One list, one order: the engine sees the whole thing and returns the
 * whole thing from `kg.steps()`, so nothing app-side can disagree with the
 * diagram about how many steps there are.
 *
 * The market panel's frame is not revealed by any step, so it is there from the
 * start: the lesson draws *into* a pair of labelled axes rather than beginning
 * with a blank rectangle. Before the first step those axes are under the
 * lesson's cover (`SUPPLY_AND_DEMAND.cover`), so the first thing a student sees
 * of the diagram is the frame the first step draws into. The other two panels are revealed by their key, which
 * takes their axes and axis titles with them — the whole point being that the
 * second panel arrives as an event with a sentence attached, rather than
 * sitting there from the first frame waiting to be explained.
 */
export const LESSON = [
    {
        part: 'Meet the market',
        reveal: ['demand_market'],
        title: 'Demand: what buyers want',
        say: 'The demand curve, D, shows how much of something buyers want at each price.\n\n' +
            'It slopes down. When the price goes up, people buy less, and when it comes down, ' +
            'they buy more.',
        term: {
            word: 'Demand',
            meaning: 'How much buyers are willing and able to buy at each price.'
        }
    },
    {
        reveal: ['supply_market'],
        title: 'Supply: what sellers offer',
        say: 'The supply curve, S, shows how much sellers want to sell at each price.\n\n' +
            'It slopes up. A higher price makes it worth producing more.',
        term: {
            word: 'Supply',
            meaning: 'How much sellers are willing and able to sell at each price.'
        }
    },
    {
        reveal: ['equilibrium_market'],
        title: 'Where they meet',
        say: 'Where the curves cross, the amount buyers want is exactly the amount sellers ' +
            'offer. Nothing is left over, and nobody who will pay that price misses out.\n\n' +
            'That point gives one price, P*, and one quantity, Q*.',
        term: {
            word: 'Equilibrium',
            meaning: 'The price and quantity where demand equals supply.'
        }
    },
    {
        part: 'When demand changes',
        reveal: ['surplus'],
        title: 'What buyers gain',
        say: 'Lots of buyers would have paid more than the market price. The shaded area adds ' +
            'up that extra value, for every buyer.\n\n' +
            'It\'s the same market, shown a second way.',
        term: {
            word: 'Consumer surplus',
            meaning: 'The difference between what buyers would be willing to pay and what they ' +
                'actually pay.'
        }
    },
    {
        set: { a: 26 },
        title: 'Incomes rise',
        say: 'Say people\'s incomes rise. Buyers can afford more, so they want more at every ' +
            'price, and the whole demand curve shifts to the right.\n\n' +
            'Watch the price, the quantity and the shaded area all change together.',
        term: {
            word: 'Increase in demand',
            meaning: 'Buyers want more at every price, so the demand curve shifts right.'
        }
    },
    {
        reveal: ['revenue'],
        title: 'What sellers earn',
        say: 'The new panel shows the money that changes hands: the price times the quantity ' +
            'sold.\n\n' +
            'When demand rises, sellers sell more, at a higher price, so their revenue goes up. ' +
            'Move demand yourself and watch revenue follow it.',
        // The one "see what happens" step: a slider on the card, since the
        // lesson has no instruments beside it. Safe to hand over here because
        // the step after it sets both params, so wherever the student leaves
        // demand, "back to the start" is where the market goes.
        try: [{ param: 'a', label: 'Demand' }],
        term: {
            word: 'Total revenue',
            meaning: 'Price × quantity: everything buyers spend, and sellers receive.'
        }
    },
    // "Where we started" is both params, not just the one the lesson moved.
    // Setting `a` alone made this step false for any student who had moved
    // supply on the way — "Input costs rise" and then this step left P* at
    // 13.00, not 11.00, under words saying the market was back where it
    // started — and so did the two steps after it. The lesson's own steps only
    // ever move `a`, which is how the gap hid: the author's walk through it
    // never left `c`.
    //
    // Two params in one update is order-dependent in general, because the
    // engine applies and validates them one at a time (plans README, finding
    // 4). It is not here, and the reason is worth stating rather than relying
    // on: the diagram declares no restrictions, and `a` (12–28) and `c` (0–8)
    // are each bounded only by their own range, so every interim state between
    // two legal markets is itself legal and either order lands in the same
    // place. A restriction tying the two together could end that, and these
    // three steps would then need the batched update the finding asks for.
    {
        set: { a: 20, c: 2 },
        title: 'Back to the start',
        say: 'Incomes settle back, and the market returns to where it began.\n\n' +
            'All three panels are on screen now: the market, what buyers gain, and what ' +
            'sellers earn.'
    },
    // The question the build-up was for (P11). It sets its own starting value
    // rather than inheriting whatever the student last left — the answer is
    // marked from where the question began, so where it begins should not
    // depend on what they did while exploring. That includes supply: the
    // target of 26 is "incomes rise again" from the baseline the step before
    // announced, so the market the question starts in is that baseline.
    //
    // Resetting `c` here touches neither the arming nor the grade. The step's
    // `set` is applied before the question is armed, while the screen is not
    // yet listening for the asked param, so it is not read as an attempt; the
    // snapshot is taken after it; and the grade reads `a` and only `a`.
    //
    // Direction is the question. The target makes the magnitude half real as
    // well, and gives the reveal something to draw — a direction-only question
    // has no "correct position", only a correct way.
    {
        part: 'Your turn',
        set: { a: 20, c: 2 },
        title: 'Incomes rise again',
        say: 'Incomes rise again, by the same amount as before.\n\n' +
            'Move the demand curve to where it goes, then press Check.',
        ask: {
            param: 'a', direction: 'up', target: 26, tolerance: 1,
            explain: 'Higher incomes mean buyers want more at every price, so demand ' +
                'increases and the curve shifts right — as far as it went last time, which ' +
                'takes the price to $14.00.'
        }
    },
    // The lesson hands the market back where it found it, so Finish hands the
    // instruments the diagram as the config declares it, with everything drawn
    // and nothing left mid-demonstration.
    {
        set: { a: 20, c: 2 },
        title: 'Over to you',
        say: 'One shift in demand moved the price, the quantity, consumer surplus and revenue, ' +
            'all at once.\n\n' +
            'Press Finish and the market is yours: drag the demand curve, try a scenario, or ' +
            'see the maths behind each number.'
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
                        // The triangle between demand and P*, out to the
                        // quantity traded. The panel's one area, so its title
                        // names it.
                        //
                        // Producer surplus was shaded under it as well, in
                        // supply's orange, with no label, under a title saying
                        // "Consumer surplus" — and no step ever mentions it. A
                        // student could only take it for part of what the
                        // title named. It comes back with a step that teaches
                        // it, and a label of its own.
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
 *
 * A headline names one of `NARRATED_CALCS` below, and takes its label, unit and
 * decimals from there rather than declaring its own. The caption reads "Market ·
 * Price $13.00" and the strip under it reads "Price $11.00 → $13.00"; a panel
 * that kept its own copy of the unit is how those would come to disagree.
 */
export const PANELS = [
    { key: 'market', name: 'Market', headline: 'Pe', delta: 'dPe' },
    { key: 'surplus', name: 'Consumer surplus', headline: 'CS', delta: 'dCS' },
    { key: 'revenue', name: 'Revenue', headline: 'TR', delta: 'dTR' }
] as const;

/**
 * Money, wherever a calc is measured in it: dollars, to the cent.
 *
 * Declared once and spread into each calc that is money, so the unit and the
 * decimals cannot be given to one calc and not the other. Two decimals because
 * that is how a price is written — "$13.0" is a number nobody would put on a
 * label — and the one-decimal default stays for a quantity, where 9.0 is fine.
 */
const MONEY = { unit: '$', precision: 2 };

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
 * It is also what every number on the screen is *called*. The strip's clauses,
 * the panel captions and their change chips all print a calc with the label,
 * unit and decimals given here, so the price is "Price" and $13.00 is $13.00
 * wherever a student reads it.
 *
 * The labels are words, because a caption and the strip are words: "P* $13.00"
 * and "CS $40.50" asked a student to know two abbreviations nobody had spelt
 * out. A symbol is for the diagram and for a formula, where there is no room
 * for a word, so `tex` gives the Maths instrument the one the dropline uses.
 * Consumer surplus and revenue have none on the diagram, and their formulas
 * say them in words.
 *
 * Order matters twice over: it is the order the clauses appear in, and the first
 * entry is what "why?" opens the maths explainer on.
 */
export const NARRATED_CALCS = [
    {
        name: 'Pe', label: 'Price', tex: 'P^*', meaning: 'Equilibrium price', ...MONEY,
        rise: 'The price rises', fall: 'The price falls'
    },
    {
        name: 'Qe', label: 'Quantity', tex: 'Q^*', meaning: 'Equilibrium quantity',
        rise: 'More is bought and sold', fall: 'Less is bought and sold'
    },
    // In the words of the steps that bring these panels in: "What buyers gain"
    // and "What sellers earn". Labelled as the panels are named, so a caption
    // says the name once and not twice.
    //
    // In a formula consumer surplus is "Surplus", under the heading that says
    // whose: the whole phrase made its working wider than the Maths tab.
    {
        name: 'CS', label: 'Consumer surplus', tex: '\\text{Surplus}', meaning: 'Consumer surplus', ...MONEY,
        rise: 'Buyers gain more', fall: 'Buyers gain less'
    },
    {
        name: 'TR', label: 'Revenue', meaning: 'Total revenue', ...MONEY,
        rise: 'Sellers earn more', fall: 'Sellers earn less'
    }
];

/**
 * What `a` and `c` are, for the Maths instrument's key.
 *
 * The curves are `P = a − Q` and `P = c + Q`, so each param is where its curve
 * meets the price axis — which a student can see, and check, on the diagram
 * beside the formula. The params themselves stay unlabelled: the strip and the
 * sliders call them `a` and `c`, and so do the formulas this explains.
 */
export const PARAM_MEANINGS = {
    a: 'where demand meets the price axis',
    c: 'where supply meets the price axis'
};

/**
 * Things to try in Explore. With `P = a − Q` and `P = c + Q` the market clears
 * at `P* = (a + c)/2` and `Q* = (a − c)/2`, which is every answer: costs up
 * raises the price and cuts the quantity; equal rises in `a` and `c` raise the
 * price and leave the quantity, and so consumer surplus, where they were; and
 * raising `c` alone shrinks what buyers gain.
 */
export const EXPLORE_PROMPTS = [
    'Raise sellers\' costs (c). Which way do the price and the quantity sold go?',
    'Raise a and c by the same amount. What changes, and what stays the same?',
    'Make buyers gain less without touching demand.'
];

/**
 * What `a` and `c` are to a student who is moving them.
 *
 * The letters stay on the sliders, as on the formulas; the sentence under each
 * says which curve it is and which way is which, since "higher a" means nothing
 * until you know a is demand. Raising `c` lifts the supply curve, which is a
 * *fall* in supply — the reading says what happened to sellers rather than
 * leave a student to work out that up is less.
 *
 * Each is marked in its curve's colour, which is what ties a letter to a line
 * before the student has learnt which is which.
 */
export const PARAM_WORDS = {
    a: {
        about: 'Where demand meets the price axis. Higher means buyers want more at every price.',
        rise: 'Demand increases',
        fall: 'Demand decreases',
        curve: 'demand'
    },
    c: {
        about: 'Where supply meets the price axis. Higher means each unit costs sellers more.',
        rise: 'Sellers\' costs rise',
        fall: 'Sellers\' costs fall',
        curve: 'supply'
    }
};

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

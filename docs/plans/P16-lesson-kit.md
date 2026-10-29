# P16 — A lesson kit: the house rules as code

**Lane:** app ·
**Depends on:** P10 (one timeline), P11 (the attempt loop), P13 (`ghost:`), P14 (which curve moves),
P15 (the stage beyond charts). It packages what they built rather than adding to it ·
**Unblocks:** the fifth lesson and every one after it, written by a person or an AI session from a
short guide ·
**Status:** ✅ **Done** (2026-10-29). Phases 1–5 in fourteen commits from `409298e` to `2e61fe8`;
phase 6, the price elasticity lesson written from the guide by a fresh session, after them, with
its findings at the end of [Findings](#findings). Read against the code before building — see
[Read against the code](#read-against-the-code-2026-10-29) — and [Findings](#findings) for what
building it turned up.

## Goal

A new lesson should be mostly its words and its model. The chart's house rules and the question's
wiring should come with it, not be written again:

1. **`defineLesson()`**: one call that turns a lesson's words, params, calcs, panels and steps into
   `StudyContent`, and works out everything that today has to be written by hand to agree with
   something else.
2. **A chart kit**: a function for each kind of thing `chart-design.md` describes, so that following
   a rule is what a helper does by default, and breaking one has to be said.
3. **The chart rules as tests**: the parts of `chart-design.md` a machine can check, checked over
   every lesson.
4. **A way in for an AI session**: a template lesson, a guide, and docs that stop saying the engine
   reads YAML.

Nothing a student sees changes, except where phase 2 finds a chart breaking a rule.

## Why this shape

Four lessons in, the cost of a lesson is plain. Each file is long — 742 lines for the Air Jordans,
670 for the A$, 994 for the café, and 661 for the market across `studyDiagram.ts` and
`supplyAndDemand.ts` — and a quarter to a third of each is wiring: the question's params and lines,
the change calcs, the ghost and the drag that a question turns off, and the steps handed over twice.
Each lesson writes its own copy, with its own signatures. P13 put the argument against that once
already: a fact stated twice is a fact that will eventually be stated two different ways. Here it is
stated four times.

The chart rules are in the same position. `chart-design.md` is 447 lines, and every lesson follows
it by hand: an AI session reads all of it, then writes `'Price (\\$)'`, `color: 'colors.demand'`
and `ghost: { show: 'not(params.asking)', label: '_0' }` from memory, and nothing checks the result
but a screenshot.

The decisions that shape the plan:

- **TypeScript, not YAML.** The engine reads a plain object (`packages/engine/src/ts/kg.ts:98`) and
  clones it through JSON on mount (`kg.ts:113`), so a lesson's config is JSON already. YAML was how
  KGJS's authors wrote that object down; nothing in this repo parses it. The lessons already write
  the object in TypeScript, so a kit that returns the same object changes nothing in the engine.
  Moving lessons to YAML would cost three things they lean on: expressions built by functions
  (`demandAt`, `labelAt`, `params.step >= ${N}`), which in YAML become strings copied by hand, the
  very duplication P13 removed; a type error for a wrong colour name or a misspelt field; and
  pictures that are imported, so a missing one fails the build (`apps/web/src/lessons/content.ts:45-46`).
- **In the app, not the engine.** No lesson uses the engine's econ composites (`EconLinearDemand`
  and the rest), which P13 found too (its correction 1); [README finding 17](README.md#findings-that-cut-across-the-set)
  says to build for the app you have. The house rules are the app's: they live in `docs/`, and they
  are about Year 10 students and a classroom projector. A TypeScript helper is typed and cheap to
  change. A piece that settles can move into the engine later as a flag, as `ghost:` did.
- **Extracted, not designed.** Every helper is one that at least two lessons already wrote. The
  café's curve and the A$ lesson's mirror market stay raw objects beside the kit's, and that is not
  a failure of the kit.
- **Plain inputs.** `content.ts:16-19` keeps the lessons as data so that moving them to a content
  model is "a cut and a paste". The kit keeps that true: what an author hands it is strings, numbers
  and arrays, and the functions are inside it. Moving the words to files a teacher edits is then a
  loader in front of `defineLesson`, not a rewrite.
- **Tests first.** The migration is proved by the output not changing — a snapshot of each lesson's
  config taken before the kit exists — and the rules by tests that name the section of
  `chart-design.md` they come from, so that a failure says what to read.

## Current state

Checked against the tree on 2026-10-27.

**The engine and YAML**

- `KineticGraph` takes `config: any` (`packages/engine/src/ts/kg.ts:98`) and deep-clones it with
  `JSON.parse(JSON.stringify(...))` when it mounts (`kg.ts:113`).
- No YAML parser is installed. `package-lock.json` has no `yaml` entry, and the only mention of YAML
  in the engine's source is a comment (`packages/engine/src/ts/model/model.ts:514`).
- The docs say otherwise: `llms.txt:12` ("typically defined in JSON or YAML"),
  `docs/configuration.md:3` ("most commonly authored as YAML and parsed via `js-yaml`"),
  `docs/getting-started.md:85`, `docs/index.md:8` and `:36`, and
  `docs/schema/01-getting-started.md:3`. Every example under `docs/schema/` is YAML. `llms.txt` is
  what an AI tool reads first.

**What every lesson writes for itself**

| | Market (`studyDiagram.ts`) | Air Jordans (`demandShifters.ts`) | A$ (`foreignExchange.ts`) | Café (`productionPossibilities.ts`) |
| --- | --- | --- | --- | --- |
| The question's params, all `presentation` | 334-339 | 364, 411-418 | 395-396, 418-424 | 537-538, 600-610 |
| `questionApparatus` | 583-585 | 733-736 | 659 | 988 |
| Start and answer lines | 106-128 | 484-533 | 116-135 | 423-427, 634-648 |
| The ghost that stands down for a question | 72 | 481 | 84 | 685 |
| The drag that freezes after Check | 24 | 72 | 75 | 697, 709 |
| Change calcs, `calcs.X - prev.calcs.X` | 354-356 | 377-378 | 390-391 | 575 |
| `steps:`, the same array as `lesson:` | 319 | 398 | 401 | 581 |
| `explainedCalcs` | derived inline, 563-568 | chosen, 700-702 | `explainable`, 626 | chosen, 933 |
| A step's position by its title | — | `stepTitled`, 354 | — | `stepTitled`, 387 |

- The names already follow one pattern, which is what makes working them out safe. Every start and
  answer param is `start` or `answer` and the param's name with a capital (`startA`, `startDemand`,
  `startPrice`, `startH`), and every change calc is `d` and its headline with a capital (`dPe`,
  `dQd`, `dMine`, `dRate`, `dInverse`, `dOc`).
- The screen writes the three shared question params by name (`apps/web/src/StudyScreen.tsx:133-135`,
  `:710-714`, `:935-937`, `:1014`), so whatever declares them has to use those names.
- `stepTitled` is `findIndex(...) + 1` (`demandShifters.ts:354`), so a title that isn't there gives
  step 0, and `params.step >= 0` is true from the start. Nothing says so.
- `lessons.test.ts:93-95` checks that `diagram.steps` is `lesson`, because both have to be set.

**Chart helpers each lesson has its own copy of**

- Demand and supply, with the label at the end the rules give it: `studyDiagram.ts:40-92`,
  `foreignExchange.ts:86-100`, `demandShifters.ts:58-72` and `:470-482`.
- The equilibrium, with droplines, `srTitle` and a ghost: `studyDiagram.ts:130-145`,
  `foreignExchange.ts:137-147`.
- Axes: `studyDiagram.ts:148-151`, `foreignExchange.ts:157-165`, and inline at
  `demandShifters.ts:435-436` and `:467-468`. Each writes `'Price (\\$)'` by hand.
- A price line with P on the axis: `demandShifters.ts:442-457`.
- Annotations, only in the café so far: `letter` (`productionPossibilities.ts:456`), `readout`
  (`:483`), `legLabel` (`:511`), `counted` (`:531`) and `fixed` (`:534`).

**What is tested, and what is not**

- `apps/web/src/__tests__/lessons.test.ts` holds every lesson to the rules for words
  (`:131-240`: titles, paragraph lengths, each term once, covers, pictures) and to most of the
  wiring (`:97-129`, `:242-366`). Two of its checks touch the chart: a param's colour is the colour
  of everything it draws (`:326-339`), and every panel's caption names a narrated calc
  (`:353-362`).
- Nothing checks the rules in `chart-design.md`. `grep -rn "strokeWidth\|fontSize\|bgcolor"
  apps/web/src/__tests__` finds nothing. The doc's checklist for adding a chart
  (`docs/chart-design.md:417-439`) ends with "Look at it", and today all of it is looked at.
- `EconSchema` names 37 colours (`packages/engine/src/ts/KGAuthor/econ/schemas/econSchema.ts:53-106`).
  The chart rules allow six (`chart-design.md:172-179`).

**For an AI session**

- `CLAUDE.md` points to the two design docs (`:9`, `:11`) and to nothing about how a lesson is put
  together.
- `apps/web/scripts/screenshot.mjs:8` takes a URL and a size, not a step, and `?lesson=` opens a
  lesson at its cover.

## Read against the code (2026-10-29)

Two days after it was written, the tree it described had moved on:

1. **There were five lessons, not four.** The plane tickets lesson (`supplyShifters.ts`, 818
   lines) landed the day before building started, written by copying the Air Jordans. It was the
   topic phase 6 suggested, so phase 6's lesson is now the sixth; and every helper the Jordans had
   already had its second user, which settled `priceLine` and `pricePoint` into the kit.
2. **`diagram.steps` was already gone.** "Each lesson drawn on a model of its own" (`04d12a2`)
   split `StudyModel` from `StudyContent`: a model has no steps, the screen adds the lesson's, and
   `lessons.test.ts` checks that a model has none. The plan's "`steps:`, the same array as
   `lesson:`" had no copy left to remove. A model still reads its lesson's step numbers in its
   calcs (the Jordans, the airline, the café), so `defineLesson` makes the two together.
3. **The doc's list of departures contradicted itself.** "Where today's charts differ" said both
   "write down in the config why it stays, then delete the line here" and "add a line here naming
   the chart, the rule, and where the reason is written down". It now keeps a line per deliberate
   departure, which `breaksRule` and the test hold to each other both ways.
4. **A link carries a step.** "Screenshots at a step" is out of scope below as needing one, and
   `lessons/<id>?step=4` has opened a lesson at a step since Links landed; the guide uses it.
5. **`screenshot.mjs` loses its flags from the root.** `npm run screenshot -- --url …` hands
   `--url` to npm, not the script. The guide says `--workspace=web`.

## Approach

### Phase 1 — Say what the engine reads

- Correct the sentences listed under Current state. The engine reads an object; in this repo that
  object is written in TypeScript; YAML is one way to write it down, and nothing here parses it.
- At the top of `docs/schema/01-getting-started.md`, one line: the examples are YAML because it is
  short, and a lesson writes the same keys in TypeScript, with the kit (phase 4).

### Phase 2 — Pin today's output, and check the chart rules

- `lessonConfigs.test.ts`: a snapshot of each lesson's `diagram`, so phases 3 and 4 can show they
  changed nothing. It is a tool for the migration and is deleted at the end of phase 4. Kept, it
  would fail on every chart edit and be updated without being read.
- `chartRules.test.ts`, over every panel of every lesson, each check named after its section in
  `chart-design.md`:
  - **Type** and **Lines**: no `fontSize`, `strokeWidth` or `bgcolor` on any object.
  - **Colour**: every `color` is `colors.<name>`, with the name in the table; no more than four hues
    on a panel, plus grey.
  - **Axes**: both axes have a title, of more than a lone letter, with no bare `$`.
  - **Labels on the plot**: every curve drawn solid has a label; the label on a curve or a dropline
    is from the symbol list; a word in a label is `plainText`, not `\text{}`, which only a symbol
    on the list may use (`\text{PPC}`).
  - **Points**: a point's letter is never P, Q, D, S or E.
  - **Points and areas**: an area is the default 20%, or 8% for context.
  - **Accessibility**: every object a student can drag has an `srTitle`.
- A check that today's lessons fail is fixed, in a commit of its own with a screenshot, or written
  under "Where today's charts differ" with its reason. It is never loosened to pass.
- **The chart holds still** (principle 5) is the one check that needs an engine: mount each lesson
  at its last step, move each param a student can move to its minimum and its maximum, and check
  that every label stays on the plot. One param at a time, not every corner at once: the café lets
  two params at the top together run its curve off the axes, and says so
  (`productionPossibilities.ts:584-588`).

### Phase 3 — `defineLesson()`

New, `apps/web/src/lessons/kit/lesson.ts`. It takes the lesson's words (every field of
`StudyContent` that is words today), the params a student moves, the calcs, the panels and the
steps, and works out:

- `diagram.steps` and `lesson`, as one array.
- The question's wiring. A param can be asked about if any step's `ask` names it as its `param` or
  in its `among`. For each, `start<Param>` and `answer<Param>`, bounded like it and `presentation`;
  the three shared params; and `questionApparatus`. The three names come from one exported constant
  that `StudyScreen` reads too.
- A change calc, `d<Headline>`, for each panel's headline, and that panel's `delta`.
- `explainedCalcs`: `explainable(calcs)`, unless the lesson gives its own, as the Air Jordans and the
  café do, each with its reason.
- `stepNumbered(steps, title)`, which throws on a title that isn't there; and `from(title)` and
  `until(title)`, which return the `params.step` expressions the lessons write today.

The market goes first. `studyDiagram.ts` and `supplyAndDemand.ts` become one lesson, and the
mention of `studyDiagram.ts` in `chart-design.md:263` follows it.

### Phase 4 — The chart kit

New, `apps/web/src/lessons/kit/chart.ts`, taken from the lessons' own helpers:

- `axis(title, min, max, options)`, which escapes `$` itself, and `priceAxis(max)`, which is
  "Price ($)".
- `curve(spec)`: what it means (its colour), its symbol, its shape as a function of its params, the
  params it moves and the way it is dragged. It adds the ghost that stands down for a question and
  the drag that freezes after Check. For a curve whose params can be asked about, it also adds the
  dashed start line and the dotted answer line, drawn from the same shape with `params.start<X>` and
  `params.answer<X>` in place of `params.<X>`: one definition, three drawings, as P13 did for the
  ghost. Where the label goes along the curve is still the author's to give, as a calc, because
  only the author knows where the curve ends across the sliders.
- `equilibrium`, `priceLine`, `namedArea` (the area, and its label centred in it), `contextArea`,
  `letter`, `readout` and `measuredStep`.
- Types that only take what the rules allow: a colour from the table, a symbol from the list, and
  no `fontSize` or `strokeWidth`. A raw engine object can sit beside the kit's. One that breaks a
  rule on purpose says so with `breaksRule: { rule, why }`, which the kit removes before the engine
  sees it and `chartRules.test.ts` holds against "Where today's charts differ". That is `CLAUDE.md`'s
  "say why in a comment beside the config", in a form a test can read.
- One lesson per commit: the A$ lesson first, for the market helpers and two curves that can be
  asked about; then the Air Jordans, then the market, then the café, whose annotation helpers become
  the kit's.
- Each lesson moves into a folder of its own as it goes: `lessons/<id>/index.ts` for the words and
  the `defineLesson` call, `steps.ts`, and `chart.ts`. A session changing a step then reads the
  steps, not 994 lines. `lessons/index.ts`, `StudyScreen.tsx:15` and five test files import a
  lesson by its path today; they follow.
- Each commit's snapshot diff is empty, or explained in the commit. Two are expected: the A$ lesson
  draws its start lines after both curves where the kit draws them after each, and the market's
  answer line is the one not gated on `answer != start` (`studyDiagram.ts:126`). A diff in draw
  order is checked by a screenshot.

### Phase 5 — A way in for an AI session

- `lessons/_template/`: the smallest lesson the kit makes — one market, three steps, one question.
  The lesson tests run it beside `LESSONS`, and no strand lists it, so it cannot go stale and no
  student sees it.
- `docs/lesson-authoring.md`: the order a lesson is written in — the model and its ranges, the
  panels, the steps, the words, the questions, the tests, a screenshot — with each step pointing to
  the section of `design.md` or `chart-design.md` it needs, not restating it.
- A project skill, `.claude/skills/new-lesson/`, that is the guide and the template.
- A third line in `CLAUDE.md`: for a new lesson, read `docs/lesson-authoring.md`.

### Phase 6 — The proof: a fifth lesson

A fresh session, given the guide and a topic, writes the next lesson. "What shifts supply" would
mirror the Air Jordans; the topic is the user's call. Then record what it got wrong that a test
caught, what it got wrong that only a screenshot caught, and what it had to read the kit's source to
find out. Each is a finding, and each one a test could have caught becomes a test. The A$ lesson
tested the study screen against a topic it was not written for; this tests the kit the same way.

## API / schema surface

A sketch. The signatures are settled by taking them out of the four lessons, not before.

```ts
// apps/web/src/lessons/kit/lesson.ts
function defineLesson(spec: LessonSpec): StudyContent;

interface LessonSpec extends LessonWords {        // id, label, title, intro, goals, cover, pictures,
                                                  // asides, paramWords, narratedCalcs, explorePrompts,
                                                  // scenarios, paramMeanings, directionWords: as today
    steps: LessonStep[];
    params: ParamDefinition[];                    // the student's only; the question's are worked out
    calcs: Record<string, string>;                // levels only; the change calcs are worked out
    panels: PanelDefinition[];                    // key, name, headline, axes, objects
    explainedCalcs?: Record<string, string>;      // default: explainable(calcs)
}

function stepNumbered(steps: LessonStep[], title: string): number;   // throws on an unknown title
function from(steps: LessonStep[], title: string): string;           // 'params.step >= n'
function until(steps: LessonStep[], title: string): string;          // 'params.step < n'

// apps/web/src/lessons/kit/question.ts — the names StudyScreen reads as well
const QUESTION_PARAMS = ['asking', 'submitted', 'revealed'] as const;
const FROZEN = 'not(params.submitted)';
const STANDS_DOWN = 'not(params.asking)';
const startOf = (param: string) => 'start' + capitalised(param);
const answerOf = (param: string) => 'answer' + capitalised(param);

// apps/web/src/lessons/kit/chart.ts
type Meaning = 'demand' | 'supply' | 'equilibriumPrice' | 'ppf' | 'choice' | 'combination';
type CurveSymbol = 'D' | 'S' | '\\text{PPC}';
type AxisSymbol = 'P^*' | 'Q^*' | 'P' | 'P_1' | 'Q_d' | 'e^*' | '1/e^*';

function axis(title: string, min: number, max: number,
    options?: { intercept?: number; tickPrecision?: number }): AxisDefinition;
function priceAxis(max: number): AxisDefinition;

function curve(spec: {
    name: string;
    title?: string;
    meaning: Meaning;
    symbol: CurveSymbol;
    /** Called three times: with `params.demand`, then `params.startDemand`, then `params.answerDemand`. */
    shape: (p: Record<string, string>) => CurveShape;
    moves: string[];
    drag?: 'horizontal' | 'vertical' | DragDefinition;
    label: { x: string } | { y: string };
    asked?: boolean;
    ghost?: boolean;
}): ObjectDefinition[];

function equilibrium(spec: { panel: string; x: string; y: string; droplines: [AxisSymbol, AxisSymbol] }): ObjectDefinition;
function priceLine(param: string, across: [number, number]): ObjectDefinition[];
function namedArea(words: string, def: AreaShape): ObjectDefinition[];
function letter(letter: Letter, at: Position): ObjectDefinition;
function readout(lines: string[]): ObjectDefinition[];
function measuredStep(spec: MeasuredStep): ObjectDefinition[];

/** On any object: a rule it breaks on purpose, and why. Never reaches the engine. */
interface BrokenRule { rule: string; why: string }
```

## Tests

Phase 1: none. A reading of `llms.txt` and the docs it names.

Phase 2:

- `lessonConfigs.test.ts`: each lesson's config, as a snapshot.
- `chartRules.test.ts`: the checks above, for every lesson, each failure naming its section of
  `chart-design.md`; and the kit's symbols and colour names against the doc's tables.
- The hold-still check: in jsdom if a label's position can be read there, otherwise in
  `app.spec.ts`, where `textCollisions` (`apps/web/tests/helpers.ts:233`) already reads labels'
  boxes.

Phase 3:

- `lessonKit.test.ts`: the question's params for a lesson asking about one param, about two, and
  about three that move one curve (the café), each bounded like its param; a param named only in
  `among` counts; a change calc for each headline; `stepNumbered` throws on a title that isn't
  there; a lesson that gives its own `explainedCalcs` keeps them.
- Every existing test green and unchanged, and the market's snapshot unchanged.

Phase 4:

- `chartKit.test.ts`: a curve's start and answer lines are its own shape with the question's
  params; a curve nobody asks about has neither; `axis` escapes `$`; `breaksRule` never reaches the
  engine.
- For each lesson moved: its snapshot unchanged, or the diff explained; its own test file
  (`demandShifters.test.tsx` and the rest) green and unchanged; and, where draw order changed, a
  screenshot in Focus and in the grid, at 1440×900 and on a phone.

Phase 5: the template passes every lesson test.

Phase 6: the fifth lesson passes every lesson test and its own, and its findings are written up.

## Risks and unknowns

- **A kit can hide the reasons.** The lessons explain themselves beside the config: why a curve is
  written as Q = f(P) (`foreignExchange.ts:38-50`), why supply's label moves
  (`studyDiagram.ts:82-89`). A reason about a rule moves into the kit's comments, once; a reason
  about the lesson stays in the lesson. Each comment is read as it moves, and sorted.
- **Too general a kit.** The café's curve and the A$ lesson's mirror don't fit a kit for demand and
  supply, and shouldn't be made to. The kit holds what two lessons share; everything else is a raw
  object.
- **Two homes for the symbols and the colours**: the doc's tables and the kit's types. A test holds
  them together, and a new symbol still goes into the doc first (`chart-design.md:385`).
- **jsdom does no layout.** If a label's place on the plot can't be read in jsdom, the hold-still
  check is a Playwright test, slower and run less often.
- **Snapshots get updated without being read.** That is why they go at the end of phase 4.
- **The AI claims are unmeasured** until phase 6. If the session writing the fifth lesson reads the
  kit's source more than the guide, the guide is wrong.
- **Phase 2 may find today's charts breaking rules.** That is the point of it. Each is fixed or
  recorded, in commits apart from the kit's.

## Done when

- [x] Phase 1: no doc says the engine reads YAML.
- [x] Phase 2: every lesson's config pinned; the chart rules checked over every lesson; every
  failure fixed, or recorded under "Where today's charts differ".
- [x] Phase 3: the five lessons made by `defineLesson`, with no question param, change calc or step
  array written by hand.
- [x] Phase 4: no lesson defines its own demand, supply, equilibrium, start line, answer line or
  axis; each lesson in a folder of its own; the snapshots deleted.
- [x] Phase 5: the template, the guide, the skill and the line in `CLAUDE.md`.
- [x] Phase 6: a sixth lesson, written from the guide, and its findings: price elasticity of demand.

## Out of scope

- **Lessons as YAML or JSON files, or a content model a teacher can edit.** `content.ts:16-19` keeps
  that for later, and the kit's plain inputs keep it a loader away.
- **New objects in the engine.** The kit returns objects the engine already draws. Moving a settled
  piece into KGAuthor as a flag, as P13 did with `ghost:`, is a plan of its own.
- **The engine's econ composites** (`EconLinearDemand` and the rest), which no lesson uses.
- **Rewriting `docs/schema/`'s examples** in TypeScript.
- **Screenshots at a step.** That needs a link that carries a step, which `design.md`'s "Reserved for
  later" gives to Links.
- **A visual editor.**
- **Changing what a student sees,** beyond the fixes phase 2 finds.

## Findings

- **Every curve was nameless to a screen reader.** The engine draws a `<title>` in each curve's
  path, and no lesson gave a curve an `srTitle`, so every one was empty; only points had theirs.
  The Accessibility check found it on its first run. The kit now names a curve by its title.
- **The hold-still check found the café running off its own plot, twice.** At 10 hours of work
  the curve shrinks under A and B, both go to its end, and their letters were drawn one on top of
  the other across the toasties axis: their floor was a twenty-fifth of the *curve's* reach, which
  halves. And "Z · unattainable" ran off the right of the plot and off its top. Both fixed
  (`8a6637e`). One corner is left: with both of Z's params at their top at once, its word meets the
  readout, whose corner is the one no *curve* reaches — and Z is a point that goes anywhere. The
  check takes one param at a time, as this plan said it should, so it does not see it.
- **jsdom does no layout, so the hold-still check is a browser test.** It runs in each model's
  playground, which draws what the last step draws; the plot is the engine's clip rectangle, read
  through the SVG's screen transform, and a dropline's label is allowed the band just past the
  axis it sits on. A spec cannot import a lesson — they import their pictures — so it lists the
  models, and `chartRules.test.ts` holds that list to the models there are.
- **An untitled object is titled by its name.** `GraphObject` gives a named object its name as its
  title unless it has one, so the market's, the A$ lesson's and the café's question lines were
  objects "What changed" could have named `questionStart`. The Jordans' and the airline's said
  `title: ''`. The kit's say it too, for every lesson.
- **A check can hold the kit to a choice it cannot otherwise see.** The Jordans' price point was
  first placed by the same sum as the curve it sits on, which names `params.demand`; the lessons
  test reads "names a param" as "is drawn by it", and the point is orange, not demand's blue. It
  is placed by `calcs.q` again, which is that sum, and `pricePoint` takes it as `x`. The proxy is
  a textual one, and it was right.
- **`breaksRule` needed somewhere to live once the engine could not see it.** The kit takes it off
  every object and keeps it on the model as `brokenRules`, which nothing draws and the rules test
  reads. Each one must name a section of the doc and be listed under "Where today's charts
  differ", and each object listed there must have one.
- **The names were settled by the lessons, as the sketch said they would be.** `stepNumbered` is
  `stepTitled`, the name three lessons already used. `from` and `until` take a step number, not a
  title, because the lessons find their steps four ways — by title, by what a step reveals, by the
  first question, and by the last step — and combine them. `FROZEN` and `STANDS_DOWN` became
  `UNTIL_SUBMITTED` and `UNLESS_ASKING`: named for when they are true, since `draggable: FROZEN`
  reads as its opposite. And each question's lines are named for the param they answer,
  `questionStart<Param>`, where the lessons had `questionStart`, `questionStartDemand` and
  `questionStartPoint`.
- **The café's annotations stayed the café's.** `readout`, `counted` and `fixed` moved into the
  kit, because the doc's rules for a readout are rules for any of them. The step between A and B,
  its labels and the letters did not: one lesson draws them, and where they go is about its curve.
  The plan listed `measuredStep` and `letter` for the kit, and its own "extracted, not designed"
  outranked its list.
- **The lessons shrank less than a quarter.** The market from 666 lines to 484, the A$ lesson from
  674 to 591, the Jordans from 766 to 654, the airline from 818 to 705 and the café from 998 to
  959. What went was the wiring; what stayed is mostly words and the reasons beside the config,
  which is what a lesson should be. A chart is now about 150 lines, the café's 410.
- **A browser suite against a dev server sees every edit.** One run failed a test that passed
  alone: lesson files were being rewritten while it ran, and the dev server served them half
  written. Nothing is edited while the browser suite runs.


### Phase 6 — the elasticity lesson

The topic was the user's: price elasticity of demand, told with a school canteen's sausage rolls
(`lessons/elasticity/`). One $1 rise from $4.50, told twice, on a demand curve that pivots about
where the canteen starts: with students kept in at lunch, 10% fewer sales for a 20% rise, 0.50,
and revenue up $100.00; with a bakery across the road, 40% fewer, 2.00, and revenue down $175.00.
Two panels, the canteen's demand headlined by the elasticity and its revenue, 13 steps and three
questions. It was written from the guide, the design docs and the other lessons; where that was
not enough, the kit's source or the app's was read, and each time is below.

**What a test caught.**

- **Two texts too long for the screen.** A question's explanation at 204 characters, and the
  recap's takeaway at 278. `lessons.test.ts` holds them to 200 and 220, and the guide named
  neither limit, nor any of the others. They are a table in the guide's "The words" now.
- **The colour test failed the revenue area, and the test was wrong.** It holds everything that
  names a param to the param's curve colour, and the revenue rectangle names `params.price`, so
  it was held to the price's orange. `chart-design.md` says an area takes the colour of what it
  belongs to, revenue's green, and the market lesson's green revenue passed only because its
  shape goes through calcs. The proxy that was right for the Jordans' point (above) was wrong
  for an area. The test leaves areas out.

**What no test caught, and printing the screen did.** Before the lesson's own test had an
assertion, a run that printed each caption and "What changed" at every step, in jsdom. None of
these failed anything; the first two are tests now.

- **The price printed as 4.5.** A price in 10c steps took one decimal from its `round`, so "What
  changed" said "The canteen raises its price 4.5 → 5.5" under a step that said $5.50. The
  engine has always read a param's `precision`; the kit's `ParamDefinition` did not offer one.
  It does now, and the lesson's price is printed to the cent. A test holds a price a step sets,
  and says in dollars and cents, to print that way: it fails the lesson as first written.
- **The question's lines were drawn twice, and only the console said so.** The guide says every
  curve a question offers is drawn `asked: true`, and the lesson's demand is in both panels. The
  kit names a question's lines for the param (`questionStartResponse`), so both panels drew the
  same four objects; the engine kept the first and warned. The lines are in the revenue panel,
  which is at the front through the questions, and a test holds every object in a model to a
  name of its own. The guide says a param is asked about in one panel.
- **The percentages were nowhere on screen at the step that reads them.** They were held back
  with `fromStep` until "Changes as percentages", which moves nothing, and "What changed" says
  what the last move changed, which was before them. They are there from the start, 0 at $4.50.
  The guide says a number a step reads must be on the screen at it.
- **A negative prints with a hyphen**: "% change in quantity demanded 0 → -10".
  `chart-design.md`'s "Numbers" asks for a true minus. `formatValue` writes JavaScript's hyphen
  for every lesson; this is the first whose chain prints a negative. Not fixed here: it is the
  app's formatter, which the Maths tab's TeX goes through as well.
- **No thousands separator**: revenue at $5.50 is "$1045.00". The step says "rises by $100.00"
  rather than quote it, and the guide says to keep a quoted number under 1,000 where the model
  allows. The formatter is the same follow-up as the minus.

**What only a screenshot caught.** At 1440×900 and 390×844, in Focus and the grid, and walking
the steps in the browser, since a link to a step draws no ghost and no chip.

- **A step about the bakery led "What changed" with a price cut.** The bakery step put the price
  back to $4.50 and turned the curve, in one `set`, so the caption's chip said ▼$100.00 and the
  chain's foot "The canteen cuts its price", under words about a flatter curve. The cut back is a
  step of its own now, "Inelastic: a cut brings in less", the other half of the revenue rule, and
  the bakery step moves only the curve. A test holds every step before the questions to params
  of one curve colour, as "What changed" can only mark one; on its first run it found the café
  doing the same at "Full employment", which put the faster espresso machine back as it moved Z.
  That step moves Z alone now, which is inside the curve for any machine the step before allows.
- **The Maths tab writes a param by its name**: "210 − response · (price − 4.5)", where the slider
  says "Sales lost per $1". `response` is a word, so it stays, and `paramMeanings` says what it
  is; the guide says a param's name is read by students. The price's 4.5 is the expression's
  literal, which the parser normalises, so it cannot be written 4.50.
- Nothing else. Every label stayed on its plot at both ends of both sliders, in the browser
  suite and by eye; the price point drags, so "Drag a curve" at rest does not promise what is not
  there.

**What the guide did not say, and was read in the source.**

- **What each kit helper takes.** The guide names them; the lessons that use them said how. The
  guide has a table now, helper by helper, with a lesson to read for each, and says the types
  answer the rest. That `pricePoint` draws P on the price axis itself, so a panel with a point
  needs no `priceLine`, came from the Jordans' market.
- **Whether `stepTitled` counts from 0 or 1** (`kit/lesson.ts`). From 1, the value
  `params.step` has at that step; the guide says so, and that every `fromStep` is true in the
  Playground.
- **Whether a param can be printed to the cent**: the kit's `ParamDefinition`, `defineLesson`
  handing params to the engine as they are, and the engine's `param.ts`, which reads
  `precision`. Now a field of the kit's, and in the guide's first step.
- **What a narrated calc's `unit` does** (`narration/narrate.ts`): it is put in front of the
  number, so there is no `%` after one, and the label carries it. In the guide. That the Maths
  tab escapes a `%` in a label came from `dock/mathsText.ts`.
- **Why "What changed" said nothing of the curve turning** in the lesson's test
  (`narration/phrasebook.ts`): the test had jumped to the step from the cover, where no curve
  is drawn yet, so there was nothing to measure the turn against. The engine says "gets
  flatter" when it has. In the guide's "The tests", with the keyboard's chip, which says only
  the last press.
- **Where the browser suite and the screenshot script look.** Both use a dev server already on
  their port, or start one. In this checkout 5173 was the main checkout's, so both would have
  tested and photographed code without the lesson in it, and said nothing. The guide gives
  each a port of its own.

The guide was enough for the shape: the order, the files, what the kit works out, and the
sections of the two design docs to read at each step. Every gap above was a fact about how a
number reaches the screen, or a limit a test holds and the guide did not say. Three tests are
new in `lessons.test.ts` — a price printed as a step says it, a name of its own for every
object, one curve's params a step — and the lesson's own, `priceElasticity.test.tsx`, was
checked by breaking five of the numbers its steps state, each of which it failed.

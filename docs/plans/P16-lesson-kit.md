# P16 — A lesson kit: the house rules as code

**Lane:** app ·
**Depends on:** P10 (one timeline), P11 (the attempt loop), P13 (`ghost:`), P14 (which curve moves),
P15 (the stage beyond charts). It packages what they built rather than adding to it ·
**Unblocks:** the fifth lesson and every one after it, written by a person or an AI session from a
short guide ·
**Status:** 📝 **Draft** (2026-10-27), not started. Read it against the code before building, as
every plan here has been ([README finding 11](README.md#findings-that-cut-across-the-set)).

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

- [ ] Phase 1: no doc says the engine reads YAML.
- [ ] Phase 2: every lesson's config pinned; the chart rules checked over every lesson; every
  failure fixed, or recorded under "Where today's charts differ".
- [ ] Phase 3: the four lessons made by `defineLesson`, with no question param, change calc or step
  array written by hand.
- [ ] Phase 4: no lesson defines its own demand, supply, equilibrium, start line, answer line or
  axis; each lesson in a folder of its own; the snapshots deleted.
- [ ] Phase 5: the template, the guide, the skill and the line in `CLAUDE.md`.
- [ ] Phase 6: a fifth lesson, and its findings.

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

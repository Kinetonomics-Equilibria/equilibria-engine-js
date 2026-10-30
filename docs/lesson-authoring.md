# Writing a lesson

How a lesson is put together, in the order it is written. Each step names the
section of [`design.md`](./design.md) or [`chart-design.md`](./chart-design.md)
it needs; read that section when you reach it, rather than all of both first.

A lesson is mostly its words and its model. The rest — the wiring a question
needs, the change each caption shows, the chart's house rules — is the lesson
kit's, in `apps/web/src/lessons/kit/`. Lean on it: a fact a lesson writes by
hand that the kit works out is a fact that will one day be written two ways.

## Start from the template

Copy `apps/web/src/lessons/_template/` to `apps/web/src/lessons/<id>/`, where
`<id>` is the lesson's address (`lessons/<id>`). It is the smallest lesson the
kit makes — one market, three steps, one question — and the lesson tests run
it beside every real lesson, so it is a lesson that passes them. Three files:

| File | What is in it |
| --- | --- |
| `chart.ts` | The model: the params a student moves, the calcs, and the panels with what is drawn in them |
| `steps.ts` | The steps, in order, and the baseline every question starts from |
| `index.ts` | The words, the model's words, and the `defineLesson` call that puts it together |

A lesson is listed by adding it to its topic in `CURRICULUM`
(`apps/web/src/lessons/index.ts`). That is what puts it on the Lessons panel,
and its model in the Playground.

## What the kit works out

Don't write any of these. `defineLesson` and the chart kit do:

- The question's params: `asking`, `submitted` and `revealed`, and a start and
  an answer for every param a step asks about or offers among its choices,
  bounded like that param. Also `questionApparatus`.
- Each panel's change calc, `d` and its headline (`dPe`), and its `delta`.
- The calcs the Maths tab explains: every level, unless the lesson says which.
- On a curve: its colour from what it means, its symbol as its label, its
  name for a screen reader, the ghost that stands down while a question is
  asked, the drag that freezes after Check, and, with `asked: true`, the
  question's dashed start line and dotted answer line, from the curve's own
  shape.
- `$` in an axis title, escaped for the engine.

## In this order

### 1. The model and its ranges

In `chart.ts`: `PARAMS`, the params a student moves, and `CALCS`, the levels
the diagram computes. Write the model's sums in a comment at the top, as
every lesson does.

Choose each range so every curve stays on the axes at both ends of it, and a
step (`round`) that moves the headline by an amount its caption prints: the
A$ lesson's step of 2 is a cent on the rate. Read
[principle 5, "The chart holds still"](./chart-design.md#principles) and
[Axes](./chart-design.md#axes), "Size the axes to the sliders".

A param's `name` is read by students: the Maths tab writes a formula with it,
"210 − response · (price − 4.5)", where the slider says its `label`. Name it
with a word that reads in a formula, and say what it is in `paramMeanings`.

A param is printed, on its slider and in "What changed", to as many decimals
as its `round` has. A price in steps of 10c would print as 4.5, so give it
`precision: 2`; a test holds a price a step sets and says in dollars and
cents to print that way. A param has no unit: "What changed" says
"The canteen raises its price 4.50 → 5.50", with no `$`.

Where a step states a number, choose the model so it comes out round, and say
how in the comment at the top: the elasticity lesson's 210 rolls lose 20 or 70
to a $1 rise, which is 10% or 40%. A number is printed with no thousands
separator, as $1045.00, so a step that quotes one reads oddly; keep the
numbers a step quotes under 1,000 where the model allows.

### 2. The panels

In `chart.ts`: `PANELS`. Each has a key, a name (the chart's title, one to
three words: [The chart's title](./chart-design.md#the-charts-title)), a
headline calc, two axes and its objects, in the order they are drawn.

Draw with the kit's helpers (`kit/chart.ts`). Their options are typed, so
`npm run typecheck` says what each takes; to see one in use, read the lesson
that uses it:

| Helper | What it draws | Used in |
| --- | --- | --- |
| `axis`, `priceAxis` | An axis with a title in words; the price axis's `$` escaped | every lesson; `priceAxis` all but `fx` and `ppc` |
| `curve` | A curve, by what it means and its symbol; its ghost and a question's lines | every lesson but `ppc` |
| `equilibrium` | Where two curves cross, with droplines | `market`, `fx`, the template |
| `priceLine` | A price across a panel with no curve to sit on, P on the axis | `demand`'s and `supply`'s first panel |
| `pricePoint` | The point a price picks on a curve, with its droplines: P on the price axis, so no `priceLine` beside it | `demand`, `supply`, `elasticity` |
| `namedArea` | An area the lesson names, at 20% | `market`, `elasticity` |
| `contextArea` | A region that is context, at 8% | `ppc` |
| `readout` | A line in the plot's top-right corner | `ppc` |

A curve's label goes where
[Labels on the plot](./chart-design.md#labels-on-the-plot) says — demand at its
lower right, supply at its upper right — placed by a calc where the end moves,
and never on the equilibrium or the point a price picks.

Where the kit has nothing that fits, write a raw engine object beside the
kit's, as the café's curve is, and give it the house rules by hand:
[Lines](./chart-design.md#lines), [Colour](./chart-design.md#colour),
[Points and areas](./chart-design.md#points-and-areas),
[Droplines](./chart-design.md#droplines),
[Annotations](./chart-design.md#annotations),
[Accessibility](./chart-design.md#accessibility). An object that has to break
a rule says so with `breaksRule: { rule, why }`, `rule` being the doc's
section, and gets a line under
[Where today's charts differ](./chart-design.md#where-todays-charts-differ).

### 3. The steps

In `steps.ts`. A step reveals objects or a panel by name (`reveal`), moves
params (`set`), starts a part (`part`), or brings a panel to the front
(`focus`). Where a calc or a `show` depends on how far the lesson has got,
find the step with the kit — `stepTitled`, `stepRevealing`, `firstQuestion` —
and write the condition with `fromStep`, `untilStep` and `atStep`. Each
throws for a title or a name that is not there, where `findIndex` would
quietly give step 0. Each gives the step's number counting the first as 1,
the value `params.step` has once that step is applied, and the position a
test's `marker()` takes. In the Playground every `fromStep` is true.

A number a step reads has to be on the screen at that step: a panel's
headline, or a clause of "What changed". "What changed" says what the last
move changed, so a step that moves nothing shows the step before's. A number
held back with `fromStep` until a step that moves nothing is on the screen
only if it is a headline: the elasticity lesson's percentages are there from
the start for that reason, and its elasticity, a headline, is held back.

A step that sets a param a student could have moved on the step before, with
`try`, is sure of where it starts; a step after a `try` that sets nothing is
not.

A step moves the params of one curve. "What changed" leads with the first
cause it moved, and marks the curves in the causes' colour only when they
share one, so a step that put the price back to the start and turned the
curve led with the price, in orange, under words about the blue curve. A move
back to the start is a step of its own, with something to say: the
elasticity lesson's is the other half of the revenue rule. `lessons.test.ts`
holds every step before the questions to params of one colour.

One idea a step; a few parts. Read
[What a lesson supplies](./design.md#what-a-lesson-supplies) for every field a
step can carry, and [Motion](./chart-design.md#motion) before `arrive`.

### 4. The words

In `index.ts`, and the steps' `title`, `say` and `term`. Read
[Writing for the screen](./design.md#writing-for-the-screen) and
[What a lesson supplies](./design.md#what-a-lesson-supplies), which says how
each field is written and where it is read. A symbol on the chart is said in
words in the step that first draws it ([Symbols](./chart-design.md#symbols)),
and every number a step states is one the diagram solves to at that step.

`lessons.test.ts` holds the words to the room the screen has for them, and
fails a lesson that runs over:

| What | At most |
| --- | --- |
| A step's `title` | 40 characters |
| A step's `say` | 2 paragraphs, each 220 characters |
| A question's `explain` | 200 characters |
| A recap's `takeaway`, the cover's `hook` | 220 characters |
| The cover's `question` | 60 characters |
| A picture's `alt` | 250 characters |
| `goals`, and parts | 4 |

The model's words are in `index.ts` too: `narratedCalcs` (what every number is
called, its unit and decimals), `paramWords`, `paramMeanings`,
`explorePrompts`, `scenarios` and, for a curve dragged sideways,
`directionWords`. A curve a param turns rather than shifts needs none: "What
changed" says it gets steeper or flatter.

A param's `because` is the reason "What changed" gives between the curves
and the numbers, one sentence for its rise and one for its fall: "At the old
price, buyers now want more than sellers offer, so some buyers miss out and
the price is pushed up until the two match again." Say what makes the move
lead to what followed, in the words the steps use, not the move or the
numbers again. It is said for every move that way, however far and wherever
the other params are, so check it at the ends of the ranges, and leave it
out where no one sentence holds: the café's specialisation has none. It may
be said before a panel is on the stage, so it names nothing that panel
shows: the canteen's price says nothing of revenue.

A narrated calc's `unit` is put in front of its number, as `$` is, so there is
no `%` after one. Say it in the label: "% change in price". `rise` and `fall`
can be left out where they would only say the label again; the clause is then
the label and its numbers.

### 5. The questions

A step's `ask`. Start each from the baseline with `set`, so where it starts
does not depend on what the student did on the way. Offer every curve that
could move (`among`), in the same order every time, and name none of them in
the prompt or a report beside it: which curve moves is the first half of the
answer. Give a `target`, or for a question of direction only an `illustrate`
for "Show me" to draw, and an `explain` for after. Every curve a question
offers is drawn with `asked: true`.

A question's start and answer lines are named for the param they answer
(`questionStartPrice`), not for the panel, so a param is asked about in one
panel: the one at the front through the questions. A curve drawn in two
panels takes `asked: true` in that one and its ghost in both. Asked in both,
the engine keeps one pair of lines and warns in the console, and nothing fails
on screen; `lessons.test.ts` holds every object to a name of its own.

A question may start somewhere other than `BASELINE`, where its words need it
to, as the elasticity lesson's do with the bakery open. What matters is that
the `set` is the same whatever the student did on the way. Where a question is
marked by direction only, check the whole range of its param: every move the
right way should be right. The elasticity lesson's price stops at $3.50
because with elastic demand a cut to $3.00 would bring in no more than $4.50
did.

### 6. The tests

`lessons.test.ts` and `chartRules.test.ts` hold every listed lesson, and the
template, to the rules for words, wiring and charts: they run over a new
lesson as soon as it is listed. Add its model's id to the list in
`apps/web/tests/chart.spec.ts`, which takes each param to the ends of its
range in the Playground and checks every label stays on the plot.

Then write `<name>.test.tsx` beside the others: every number a step states,
held to what the diagram solves to at that step
(`demandShifters.test.tsx` is one to copy, and `priceElasticity.test.tsx`
reads "What changed" as well as the captions). Run `npm test`,
`npm run typecheck` and `npm run test:browser`.

Before writing the assertions, walk the lesson once and print each panel's
caption and "What changed" at every step: what the screen says is the fastest
way to learn its format ("Revenue$945.00▲ $100.00"). Three things a test meets:

- A slider moved by the keyboard is a move a press, so a caption's chip says
  only the last press. Read the two captions either side instead. A curve or
  point moved by the keyboard is the same.
- A step reached from the cover by its marker has nothing drawn before it, so
  "What changed" cannot say how a curve moved. Step to it from the step
  before.
- Break a number in a step and see the test fail, once, so you know it reads
  what you think it reads.

`npm run test:browser` starts a dev server on 5173, or attaches to one already
there, which may be another checkout's. Give it a port of its own,
`PORT=5181 npm run test:browser`, and edit nothing under `apps/web` while it
runs.

### 7. A screenshot

Look at it, in Focus and in the grid, at 1440×900 and on a phone
([Adding a chart](./chart-design.md#adding-a-chart)). A link opens a lesson at
a step: `lessons/<id>?step=4`, and `&arrange=grid` for the grid.

A link draws no ghost, no chip and nothing in "What changed": a move nobody
made is not shown. So walk each step that moves something from the step
before it, in the browser, and read the caption and "What changed" there.
That is where the elasticity lesson's bakery step was found leading with a
price cut.

From the repo's root, through the workspace so npm passes the flags on. The
script uses a dev server already at the URL's port, or starts one there, so
give it a port no other checkout is serving: on 5173 it may photograph
someone else's code, without a word.

```bash
npm run screenshot --workspace=web -- --url "http://localhost:5181/lessons/<id>?step=4" --out screenshots/<id>.png
```

For a phone, add `--width 390 --height 844`.

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

### 2. The panels

In `chart.ts`: `PANELS`. Each has a key, a name (the chart's title, one to
three words: [The chart's title](./chart-design.md#the-charts-title)), a
headline calc, two axes and its objects, in the order they are drawn.

Draw with the kit's helpers (`kit/chart.ts`): `axis` and `priceAxis`;
`curve`; `equilibrium`; `priceLine` and `pricePoint` for a price set or taken
as given; `namedArea` and `contextArea`; `readout`. A curve's label goes where
[Labels on the plot](./chart-design.md#labels-on-the-plot) says — demand at its
lower right, supply at its upper right — placed by a calc where the end moves,
and never on the equilibrium.

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
quietly give step 0.

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

The model's words are in `index.ts` too: `narratedCalcs` (what every number is
called, its unit and decimals), `paramWords`, `paramMeanings`,
`explorePrompts`, `scenarios` and, for a curve dragged sideways,
`directionWords`.

### 5. The questions

A step's `ask`. Start each from the baseline with `set`, so where it starts
does not depend on what the student did on the way. Offer every curve that
could move (`among`), in the same order every time, and name none of them in
the prompt or a report beside it: which curve moves is the first half of the
answer. Give a `target`, or for a question of direction only an `illustrate`
for "Show me" to draw, and an `explain` for after. Every curve a question
offers is drawn with `asked: true`.

### 6. The tests

`lessons.test.ts` and `chartRules.test.ts` hold every listed lesson, and the
template, to the rules for words, wiring and charts: they run over a new
lesson as soon as it is listed. Add its model's id to the list in
`apps/web/tests/chart.spec.ts`, which takes each param to the ends of its
range in the Playground and checks every label stays on the plot.

Then write `<name>.test.tsx` beside the others: every number a step states,
held to what the diagram solves to at that step
(`demandShifters.test.tsx` is one to copy). Run `npm test`,
`npm run typecheck` and `npm run test:browser`.

### 7. A screenshot

Look at it, in Focus and in the grid, at 1440×900 and on a phone
([Adding a chart](./chart-design.md#adding-a-chart)). A link opens a lesson at
a step: `lessons/<id>?step=4`, and `&arrange=grid` for the grid.

From the repo's root, through the workspace so npm passes the flags on:

```bash
npm run screenshot --workspace=web -- --url "http://localhost:5173/lessons/<id>?step=4" --out screenshots/<id>.png
```

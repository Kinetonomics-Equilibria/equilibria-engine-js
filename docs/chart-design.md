# The chart's design language

How a diagram is drawn — everything inside a panel's sheet: the caption across
its top, the plot, its axes, and every curve, point, area and word on it.
[`design.md`](./design.md) covers the cards around the stage; this covers what
is on it.

Written down so the next chart is drawn the way the last one was. A student who
has learnt to read one chart in the app should be able to read the next without
being taught again: demand is the same blue, "before" is the same dashed line,
the price is read off the axis the same way, and the words mean the same thing.

These are defaults, not laws. Charts differ, and some will need to break a rule.
When one does, say so in a comment beside the config with the reason, the way
the lesson files already explain their choices. Places where a chart in the
repo breaks a rule today are listed at the end, under
[Where today's charts differ](#where-todays-charts-differ). Don't copy them.
When one is fixed, delete its line.

The lesson kit (`apps/web/src/lessons/kit/chart.ts`) draws most of what follows
by default, and `chartRules.test.ts` checks every rule here a machine can.
[`lesson-authoring.md`](./lesson-authoring.md) says how a lesson uses them.

## The idea in one line

> **The same thing is drawn the same way, called by the same name, in the same
> place, on every chart.**

## Principles

1. **Label it where it is.** Every curve, point and area is named on the chart,
   beside the thing it names. No legend box: a key makes a student look away
   from the chart to match colours, and a student who can't tell orange from
   green can't match them at all.

2. **Words before symbols, and symbols from one list.** Titles, axis titles and
   annotations are in words, in full. A symbol (D, P\*, PPC) goes only where
   space is tight, on the plot itself. It must come from the
   [symbol list](#symbols), and the lesson must say it in words before a student
   needs it.

3. **Weight follows attention.** The thing a student is reading is the heaviest
   mark on the chart, and the frame is the lightest: curves are 2px, axes 1.5px,
   and a shaded area has no outline at all.

4. **A line's style says when it is.** Solid is now. Dashed and faint is where
   it was. Dotted is something to read the chart against: a dropline to an
   axis, a measured step, or the answer to a question. A student who has learnt
   this once can read any before-and-after in the app.

5. **The chart holds still.** The axes cover the whole range a lesson's sliders
   can reach, so nothing rescales while a student is dragging. This is
   `design.md`'s "nothing moves under the pointer", inside the plot.

6. **Hide first, then one step down.** In a smaller panel the engine's
   density levels drop what a glance does not need: at grid size (`compact`)
   the axis titles, a ghost's name and a curve handle's arrows, and at rail
   size (`indicator`) the ticks and every label. A curve's symbol steps down
   once, at grid size, to the size of the words beside it. Nothing is drawn
   smaller than 14px. A chart is written once, at its focal size, and the same
   config serves every size.

7. **Sized for a laptop; Present is for the room.** A student reads the chart
   up close, on a laptop, and the defaults are for that. A teacher projecting
   presses Present, which draws every label a quarter larger and every line
   half as heavy again (`--kg-type-scale` and `--kg-line-scale`). A chart does
   not set its own sizes for a projector.

## Anatomy

| Part | Where | Drawn by |
| --- | --- | --- |
| Chart title | Caption row across the top of the sheet, centred over the plot | The app, from the panel's `name` in `PANELS` |
| Headline number and change chip | Caption row, right end | The app, from the panel's `headline` and `delta` calcs |
| Plot | Under the caption | The engine |
| Axis titles | 44px under the x axis, centred; 56px left of the y axis, rotated, centred | The engine, from `xAxis.title` and `yAxis.title` |
| Tick numbers | Outside each axis | The engine (d3) |
| Dropline values | On the axis, among the tick numbers | The engine, from `droplines` on a point |
| Curve, point and area labels | On the plot, beside what they name | The engine, from `label` on the object |
| Readouts | Top-right corner of the plot | The engine, as `Label` objects |
| Handles | On whatever can be dragged | The engine, from `drag` on the object |

The chart's title is never drawn inside the plot, and the engine draws no title
of its own.

## Type

There is one typeface: the app's (`fontFamily` in `apps/web/src/theme.ts`), for
every word and every number. KaTeX's maths italic is used for one thing only,
symbols — D, S, P\*, Q\*, e\* — so a symbol always looks like maths and a word
never does. A word in a label is plain text (`plainText: true`), not `\text{}`.

A label's `fontSize` is in **points**, not pixels: `fontSize: 12` is 16px.

The sizes below are a laptop's. In Present every label is a quarter larger,
so 14px is 17.5px and 16px is 20px; tick numbers stay 14px there, as their
place beside the axis titles is measured for.

| What | Size | Style | Colour |
| --- | --- | --- | --- |
| Chart title | 16px | semibold | text |
| Headline number and chip | 14px | regular, tabular figures | dimmed grey |
| Curve label (a symbol) | `SYMBOL_SIZE`, 12pt (16px); `LABEL_SIZE` in a grid panel | maths italic | the curve's |
| Axis title | `LABEL_SIZE`, 10.5pt (14px) | regular | text |
| Dropline value | `LABEL_SIZE` | regular, plain text, tabular figures | the point's |
| Point letter, area label, annotation | `LABEL_SIZE` | regular, plain text | the thing's |
| Tick numbers | 14px | regular, tabular figures | axis grey |

These are the engine's defaults for each kind of label (`LABEL_SIZE` and
`SYMBOL_SIZE` in `packages/engine/src/ts/view/typeScale.ts`; tick numbers in
`kgjs-theme.css`), so a config sets no `fontSize` at all. They are sized for a
student reading a laptop, and Present enlarges them for a projector
(principle 7). They were set for a projector at 100% zoom, 16px and 18.7px,
and a multi-letter symbol at that size, LRAS or SRPC, was the heaviest mark on
its chart. Nothing a student has to read is smaller than 14px, and there are no
sizes in between.

## Lines

| Role | Weight | Style | Colour | Opacity |
| --- | --- | --- | --- | --- |
| Axis line and ticks | 1.5px | solid | `--kg-axis-color` (#333) | 100% |
| A curve, now | 2px | solid | its own | 100% |
| Where it was (the ghost) | 2px | dashed, 10 on 10 off | the curve's | 35% |
| Where it should go (the answer, after Check) | 2px | dotted | the curve's | 100% |
| Dropline | 2px | dotted | the point's | 100% |
| Price line (a set price across the plot, to read points against; labelled with its value on the price axis) | 2px | dotted | `choice`, or `price` against supply | 100% |
| Measured step ("+20 toasties") | 2px | dotted | the thing measured | 100% |
| Gridline | 1px | dotted | light grey | 100% |

- **Weights are set for a laptop, and Present sets them for the room.** The
  defaults are 2px (`LINE_WEIGHT` in
  `packages/engine/src/ts/view/viewObjects/viewObject.ts`) and 1.5px for the
  axes (`kgjs-theme.css`). In Present every line is drawn half as heavy again,
  3px and 2.25px: at 2px curves and 1px axes on a projector they could hardly
  be seen across a room, and at 3px on a laptop four panels in a grid were a
  tangle of heavy strokes. A config sets no `strokeWidth`.
- Every curve is the same weight, the one a student can drag included. Don't
  thicken the curve a lesson is about: the lesson's words and the caption
  already say what it is about.
- Dotted is round dots as wide as the line, a line's width apart. In the
  smallest panels (`indicator`) every line is drawn half as heavy again, and
  its dots and gaps grow with it.
- A ghost comes from `ghost:` on the object, never from a hand-drawn dashed
  copy. The engine builds it from the same definition, so the two can't
  disagree about slope or colour. With `ghost: { label: '_0' }` it is named D₀
  while the live curve stays D, and it draws the shift arrow.
- **A shift arrow is level.** A shift is sideways: at every price, more or
  less is bought or sold. So the arrow runs parallel to the quantity axis, from
  where the curve was to where it is, at the price the market cleared at
  before the move. It starts at the old equilibrium. The curve that shifted
  draws it: `shiftAt: 'prev.calcs.Pe'` in the kit, which is
  `ghost: { arrow: { y } }` on the engine's object. It is in the curve's
  colour, and stops 12px short of each curve.
- The equilibrium has no arrow of its own. It slides along the curve that
  stayed, at a slant, and its ghost already shows where it was.
- A point a price picks on a curve keeps its own arrow, from where it was to
  where it is. It is level when the curve shifts, and runs along the curve when
  the price moves, because that is a movement along the curve, not a shift. A
  chart with such a point gives its curve no `shiftAt`, or one move would draw
  two arrows.
  The one hand-drawn "before" is a question's starting line, which is set from
  params when the question is asked. It is drawn exactly like a ghost: dashed,
  35%.
- The answer line appears only once a question has been marked. It is dotted at
  full weight so it can't be mistaken for the faint, dashed start.
- No gridlines by default. Droplines do the reading. A chart where students read
  many values off the axes, such as a data plot, may turn them on.

## Points and areas

| Role | Size | Fill |
| --- | --- | --- |
| A point the chart is about: equilibrium, a chosen combination | radius 7 (the default), with a 1.5px white ring | solid, its colour |
| A curve's end that can be dragged: the PPC's most coffees and most toasties | radius 6 | solid, the curve's colour, with its [handle](#handles)'s arrows |
| A ghost point | radius 7 | 35%, from `ghost:`, and no label: its word or letter beside it, said twice, read as two points |
| An area the lesson names: consumer surplus, revenue, profit | — | 20% (the default), no outline |
| A region that is context: the attainable set under a PPC | — | 8%, no outline |

An area takes the colour of what it belongs to. Consumer surplus is under
demand, so it is demand's blue; producer surplus is supply's orange; revenue,
price times quantity, is the equilibrium's green.

## Handles

Whatever a student can drag says so where it is, with the pointer nowhere near
it. The cursor changes only once the pointer is on a curve's grip, so a student
had to sweep the plot and wait; a tablet has no pointer to change, and on a
projector only the person at the laptop sees it. The engine draws every handle
from the object's `drag` (`packages/engine/src/ts/view/handles.ts`), so a
config sets nothing.

| What can be dragged | Its handle |
| --- | --- |
| A curve | A thumb on the curve, with an arrow beside it each way it moves. The thumb is the sliders' own: a white disc in a 4px ring of the curve's colour, 16px across. It looks like the control under the diagram that moves the same thing, because it is one. |
| A point | The arrows alone, round it. A point is already a place to grab. |

- **The arrows say which way**: ◀ ▶ for a drag sideways, ▲ ▼ for up and down,
  and all four for a drag anywhere, as the cursor says. Each is a small
  triangle in the thing's colour, 11 to 18px out from its centre, with a white
  edge so it keeps its shape across a dropline.
- **Only what can be dragged now.** A curve held still for a step, or frozen
  once an answer is committed, has no handle, as it has no drag cursor. A
  ghost, a question's lines and an answer line never have one. Nor does a panel
  at `indicator` size, which is glanced at, not dragged.
- **In a grid panel a curve's handle is its thumb alone.** At `compact` size
  the arrows go: three curves' arrows in one grid panel were more marks than
  the curves themselves, and the thumb already says the curve can be dragged.
  A point keeps its arrows, which are the whole of its handle.
- **It starts a quarter of the way along the curve**, from its left-hand end:
  the end away from D and S's labels, and from the equilibrium in the middle.
  Where that spot is taken it starts at the nearest clear one along the curve:
  clear of points, labels and other handles, and of other curves where it can.
  A step of a lesson puts it back there.
- **It goes with its curve, and only with it.** A curve dragged sideways keeps
  its handle at the same height, and one dragged up and down keeps it at the
  same distance across, so the handle stays under the pointer. Where that
  would take it off the plot, it slides along the curve to stay on. A curve
  that isn't moving keeps its handle still, whatever else moves.
- **It gets out of the way once the student stops.** While a drag, a slider or
  a run of key presses is going, a handle keeps clear of nothing: the
  equilibrium passes over supply's handle, which is drawn under it. Once
  nothing has moved for 300ms, with nothing held, a handle left covered moves
  once to the nearest clear spot along its curve and stays there. Re-placed
  on every update, handles used to hop along their curves ahead of the
  equilibrium and jump out from under the pointer.
- **A label beside a point that can be dragged sits past its arrows.** The
  engine moves a point's own label out to 20px. A label set beside one by hand
  keeps the same distance, as the café's "+20 toasties" does beside A.
- **A little see-through at rest, solid once a student is at it.** 80%
  (`--kg-handle-opacity`), so a handle sits behind the curve it is on. It goes
  to full strength with the pointer anywhere on that curve or point, while a
  mouse or a finger holds it, and while the keyboard is on it. A screen with no
  hover has only the press, and goes back at the release. The change takes
  120ms, and none for a student who has asked for less motion. At 80% orange
  and green come to 2.6:1 on white and grey to 2.9:1, under the 3:1 a line has
  to clear ([Colour](#colour)): the price of a handle that doesn't compete with
  the curve. Blue is 3.4:1 and purple 3.0:1, so any lower takes purple under it
  as well.
- **Not drawn like a point.** The thumb is white where a point is solid, so it
  is never read as a combination the chart is about.
- **Handles hold still** ([Motion](#motion)): no pulse and no bounce.
- **Only on screen.** A printed page and a downloaded picture leave them off,
  arrows and all: nothing on either can be dragged, and a thumb on a curve
  would read as a point. Present and an embed keep them, because a student or
  a teacher can drag there.
- **The keyboard reaches what has a handle**, and only that. Each one is a
  slider: Tab reaches it, and a screen reader says its name and what it moves,
  "Demand for AUD, slider, 50", or "Point Z, slider, Toasties at Z 40,
  Coffees at Z 120" for a point that moves two ways. An arrow key moves it a
  step the way that arrow points, as a drag of its handle that far would, and
  Shift moves it five. Something that moves one way takes all four arrow keys,
  as a slider does: right and up are more. A step is a fortieth of the axis at
  a round number, and never too small to move the param. Each press is a move
  of its own, as a slider's is, so the ghost is one press behind.
- **Its focus ring goes round the handle**: 2px, in the colour of the page's
  other rings, round the thumb and its arrows or round the point and its
  arrows. Never the browser's, which outlines the curve's whole unclipped box.

## Colour

Colour carries meaning on the chart in the same way as on the cards (see
`design.md`, principle 6).

- **Name colours by what they mean**: `colors.demand`, not `colors.blue`. The
  palette is in `EconSchema` (`packages/engine/src/ts/KGAuthor/econ/schemas/econSchema.ts`).
  A concept with no name yet gets one, added there and to the table below,
  rather than borrowing a raw colour.
- **A concept is the same colour on every chart.** Demand is blue and supply
  is orange wherever they are drawn, even where two panels show the same trades
  from either side: the USD market's supply is orange, though it is the AUD
  market's blue demand seen from the other side. The lesson's words make that
  link, not the colour.
- **No more than four hues on one chart**, plus grey.
- **Colour is never the only difference.** Every curve has a label. A ghost is
  dashed as well as faint. Never use red against green to mean opposites.
- **No verdicts.** A falling price is good news for someone. Direction is shown
  with ▲ ▼ and → in grey.
- **Contrast against the white sheet**: at least 3:1 for a line, point or area
  edge, and 4.5:1 for text. Text drawn "in a curve's colour" uses a darker shade
  of it wherever the curve's own colour falls short. The engine does this for
  every label (`readableOn` in `packages/engine/src/ts/view/readable.ts`), so a
  label is given the curve's colour and nothing else.

A new colour must clear 3:1 as a line, because nothing darkens a line for you.

| Name | Colour | Means |
| --- | --- | --- |
| `demand` | blue | Demand, and the buyers behind it |
| `supply` | orange | Supply, and the sellers behind it |
| `equilibriumPrice` | green | Where the market clears: the point, its droplines, its arrow, the revenue it makes |
| `ppf` | blue | The production possibility curve, and the resources it is built from |
| `choice` | orange | Points chosen on the curve (A, B), and the step between them; a price a seller sets, and the point it picks on demand |
| `price` | grey | A price sellers take as given, and the point it picks on supply: the plane tickets lesson's fare. Not `choice`, which is supply's orange, so the point would be the colour of the curve it slides along, and a point on the price line the colour of the line |
| `combination` | purple | A combination anywhere: inside, on or outside the curve |
| `termsOfTrade` | purple | The terms of trade: the line through the origin, and the point on it that says what 100 baskets of exports buy |
| `potential` | grey | Potential growth, how fast the economy can grow with its resources fully employed: long-run aggregate supply, the long-run Phillips curve, and the business cycle's trend |
| `businessCycle` | purple | GDP growth over time, through the business cycle, and the words for its parts |

Contrast of the engine's palette on white. "Text" is what a label in that
colour is drawn in:

| Colour | Line | Ratio | Text |
| --- | --- | --- | --- |
| red | #d62728 | 5.0 | as the line |
| blue | #1f77b4 | 4.8 | as the line |
| purple | #9467bd | 4.3 | darkened to 4.5 |
| grey | #7f7f7f | 4.0 | darkened to 4.5 |
| green | #2ca02c | 3.4 | darkened to 4.5 |
| orange | #e56a00 | 3.3 | darkened to 4.5 |
| olive | #bcbd22 | 2.0, **too light for a line** | darkened to 4.5 |

Orange is not d3's #ff7f0e, which was 2.5:1: too light for the supply curve
to be seen against white. It is the same hue, darkened. Olive is still d3's, and
no chart draws in it; darken it the same way before one does.

## Axes

- **Every axis has a title in words, with its unit:** "Price ($)", "Quantity
  (coffees a day)", "USD per AUD". Never a lone letter like "P" or "Q". Use
  sentence case. `$` inside a title is written `'\\$'` in the TypeScript
  string, because the engine typesets titles and a bare `$` would start maths.
- **`$` on its own means Australian dollars.** Where another currency is on
  the same screen, write each by its code: AUD, USD.
- **The unit is in the title, so tick numbers are bare**: 0, 5, 10, not $0, $5,
  $10.
- **About five ticks** (the engine's default) at round steps of 1, 2 or 5 times a
  power of ten, with the same number of decimals on every tick (`tickPrecision`).
- **Both axes start at zero**, unless the quantity never comes near zero, like an
  exchange rate. Then the axis starts at a round number and its first tick is
  labelled, so nobody reads the corner as zero.
- **Size the axes to the sliders, not to the start.** Take the furthest any curve
  can reach across the lesson's param ranges and leave a little room past it.
  The empty space this leaves at the start is the cost of a chart that never
  rescales. The PPC's axes run to 160 and 320 for a curve that starts at 100
  and 200 because the lesson can grow it that far.
- **Axis titles are placed by the engine.** Don't hand-place one with a `Label`.

## The chart's title

Every chart has one, in the caption row across the top of its sheet, directly
above the plot.

- **Centred over the plot, the name.** One to three words, a noun phrase,
  sentence case, in words: "Market", "Consumer surplus", "AUD market", "Café".
  It names what the chart is about, in a student's words. It is centred over
  the plot, as the x axis's title is centred under it, not over the sheet,
  whose left side holds the y axis's numbers and title. Where a long headline
  number reaches past the plot's centre, as in a narrow grid panel, the name
  slides left only as far as it must to clear it. A grid caption is one line,
  and a name with no room left is cut to "Marke…". A rail panel's small
  caption keeps its name at the left, over its number, so the name can use the
  width the corner icon leaves.
- **At the right, the headline number**, labelled in words with its unit:
  "Price $7.60", not "P\* $7.60". The label is the narrated calc's `label`, the
  same one the chain under the stage uses, so the words have to make sense
  there too. When the chart's name already says what the number is
  ("Consumer surplus"), it is said once, not twice: give the calc the panel's
  name as its label, and the caption shows the name and an unlabelled number,
  keeping the name even in a narrow grid panel.
- **Then the change chip**, ▲ or ▼ and the amount, in grey, and only once
  something has moved as printed.
- No subtitle, and nothing about the chart's title inside the plot.

## Labels on the plot

### Curves

- **Every curve is labelled**, on the plot, in its own colour, just beside its
  line. The engine's halo keeps the line from running through the letters, and
  it fills the inside of each letter, so a line through a D doesn't show in its
  bowl. Never set a `bgcolor` box.
- **Demand and supply are labelled at their right-hand ends**: D near the bottom
  right, S near the top right. That is where students' textbooks put them, and
  it keeps the labels clear of the price axis, where P\* and the surplus areas
  are. Other curves are labelled at the end with the most open space, and at
  the same end every time that curve is drawn.
- **A label stays on the plot across the whole slider range.** If the end of a
  curve moves, position the label with a calc, not a constant.
- **A label never sits on the equilibrium.** Where the point can reach the end
  of the curve its label is at, the label moves to the other end while the point
  is there. Supply does this at the top of the market lesson's ranges
  (`lessons/market/chart.ts`). A ghost shows when the curve moves, not its
  label, so a label placed by the equilibrium raises no ghost when only the
  other curve moved.
- **A label that moves to the other end fades in there.** The engine does
  this for any label that goes more than a quarter of the way across its plot
  in one update, over 200ms ([Motion](#motion)). Drawn there at once, AD's
  label read as thrown across the chart, and its ghost's a press later as a
  second throw. A label going with its curve never moves that far in one
  update, so it simply moves. Nothing to set: write the label's two ends as a
  calc, as above.
- **The label is the curve's symbol** from the [list](#symbols). The live curve
  keeps its plain name always: D, never D′ or D₁. Its ghost adds ₀
  (`ghost: { label: '_0' }`), and the answer after a question adds ₁. The engine
  moves the ghost's label clear of the live one, and in a grid panel leaves it
  off: the dashed line says where the curve was, and D₀ piled up beside D.
- **The same curve is called the same thing in every panel** it is drawn in.

### Points

- **A point the student has to find by name gets a capital letter**: A, B, C…,
  usually in the order the lesson brings them in, skipping any letter on the
  symbol list (never P, Q, D, S or E) and any letter the Maths tab already uses
  for a param. The café's free point is Z for both reasons: P is price, and C
  is coffees an hour.
- **The letter sits beside its point**, on the side with open space, in the
  point's colour, as plain text at the default size.
- **The equilibrium is not lettered.** Its droplines name it.
- **A point's coordinates are not written beside it.** If the numbers matter,
  they are read off the axes with droplines, or stated in a readout.
- A word about the point's state follows its letter after a middle dot:
  "C · inefficient".

### Areas

- **An area the lesson names is labelled in words inside it**, centred, when
  there is room: "Consumer surplus". Where there isn't room, the chart's title
  can name it, but only if it is the chart's one area. Two areas on one chart
  need a label each. An `Area` has no `label` of its own, so place a `Label` at
  its centre.

## Droplines

For a point whose values a student is meant to read off the axes: the
equilibrium price and quantity, or the quantity traded under a price ceiling.

- **From the point to both axes**, unless only one value matters. Dotted, 2px,
  in the point's colour. The kit draws them (`equilibrium`, `pricePoint`),
  and a point of an author's own takes `axisValue` for each side and
  `plainText: true`.
- **Labelled on the axis with its value**, among the tick numbers: "7.60",
  to the places the caption prints the same number, bare as a tick number is,
  since the unit is in the axis title. In the page's font, in the point's
  colour, with figures of one width so it holds still while a curve is
  dragged and only its digits change. A tick number the label would cover is
  hidden while it does: the engine does this, and the tick mark stays.
- **The symbol is said, not drawn.** It was the label, P\* and Q\*, and a
  student dragging a curve then had to read the value off the ticks either
  side. A lesson says the symbol in its words, where it teaches the idea ("Economists
  write them as P\* and Q\*"), and the Maths tab writes it in the formula.
- **Only the point as it is now has droplines.** A ghost point gets none, and
  the engine won't give it any. Two values at two heights would contradict
  each other. The old value is in the caption's chip and in "What changed".
- **Not for points that aren't read off the axes**, such as A and B on a PPC,
  whose story is the step between them.

## Annotations

Anything else written on the plot. There are three kinds.

1. **A measured step**: how far a move goes along one axis. "+20 toasties",
   "−40 coffees". It sits beside its leg, outside the shape the legs make, and
   clear of the points at either end: a label wider than its leg starts just
   past the point the move starts from and runs along the leg away from it. It is signed with + or a true minus (−, not a hyphen) and has its unit
   in words, counted properly: "1 coffee", "2 coffees".
2. **A readout**: a line or two about what is drawn. "A (60, 160) → B (80,
   120)", "1 more toastie costs 2.0 coffees". It goes in the top-right corner
   of the plot, right-aligned, with lines 24px apart, in the corner no curve
   reaches across the lesson's ranges. If no corner is clear all the way
   through, the readout belongs in the caption or in "What changed", not on the
   plot.
3. **A state**: a word after a point's letter ("C · inefficient"), as above.

For all three:

- Plain text (`plainText: true`), at the default size, in the colour of the thing
  it is about, using the darker text shade where the colour needs one. No box.
- Words in full, in sentence case. Numbers at the same precision as the
  caption, so a number reads the same on the plot as beside it.
- One idea each, and no more than three at once on top of the curve and point
  labels. A lesson brings each one in at the step that explains it.
- Never over the point or curve the student is dragging, and never off the
  plot, at any position the sliders allow. A label beside its anchor
  (`position: 'l'` or `'r'`, or aligned left or right) that could be pushed off
  the plot takes `flipToFit: true`: the engine draws it on the other side of
  its anchor whenever this side would run off.
- The only arrows are the engine's: the shift arrow, which a ghost draws
  ([Lines](#lines)), and a [handle](#handles)'s. Don't draw decorative arrows.

## Motion

A chart moves for one reason: to show a student where to look when a step
brings something onto it. Otherwise it holds still (principle 5).

- **A point a step brings in can arrive.** It pops, growing from nothing to a
  little past its size and back in 200ms. Then its droplines are drawn out
  from it to each axis in 300ms, the way a student's eye reads the value off.
  Set `arrive: true` on the point, and its droplines arrive with it. The
  Air Jordans lesson's pairs do this.
- **Only for what the step is about**: the thing the student reads next, not
  everything the step reveals. A panel coming onto the stage is movement
  enough, and what is in it doesn't pop as well.
- **Only at a step.** Not when a lesson opens at a step from a link, when the
  view is put back after a remount, when a question is set, or while a
  student drags. Going back a step plays it again. The app says which updates
  are steps (`update(config, { arrive: true })`), because to the engine each
  one is a param moving.
- **Half a second at most, and never in the way.** Nothing waits for it: the
  next step can come at any time, and a redraw puts everything where it
  belongs.
- **What a step takes away goes at once**, so the eye stays on what arrived.
  A ghost never arrives: it is where something was, nothing new.
- **Nothing loops, bounces or shakes**, and nothing moves to say an answer is
  right or wrong.
- **A label that jumps fades in where it lands**, in 200ms, at a step or not:
  while a student drags too, because a label moved across the chart at once
  reads as thrown ([Labels on the plot](#curves)). It only fades in: nothing
  slides across the chart to get there.
- **A drag follows the pointer, and settles where the lesson's numbers are.**
  A param whose `round` is a big share of its axis jumps when it is dragged on
  it: the shortages lesson's price sat still under the pointer, then leapt a
  twelfth of the axis. Give it a `dragRound`, a finer step that `round` is a
  whole number of, and a drag moves on that. Let go, it glides onto the nearer
  value of `round` in 150ms, inside the drag, so the ghost and "What changed"
  treat the drag and the glide as one move. A slider, an arrow key and a step
  move it on `round`, as before. Mid-drag, every number is on the finer step,
  so choose one that still prints whole: 5c and 10 mangoes for 50c and 100.
- **No motion for a student who has asked for less.** With reduced motion set
  on their device, everything simply appears, and the chart reads the same. A
  drag lets go where its `round` puts it, at once.

## Keys and legends

- **No legend box.** Everything is labelled where it is (principle 1).
- **Line styles are explained by the lesson** the first time they appear. The
  step that first draws a ghost says, in its words or in a term box, that the
  dashed line is where the curve was.
- **The one exception, when it comes**: a chart with more lines than can be
  labelled at their ends, such as several countries over time. Its key is one
  row under the caption and above the plot. It lists the lines in the order
  they end, top to bottom, with names in full, each beside a short sample of
  its colour and line style. Label the line ends as well wherever there is
  room.

## Symbols

On a chart, a student reads three kinds of text:

- **Words**: titles, axis titles, annotations. Always in full.
- **Symbols**: on curves and points. Only from this list.
- **Numbers**: tick numbers, and a dropline's value on its axis, formatted as
  everywhere else.

A symbol is allowed only because it sits on the plot, where space is tight.
Each one means one thing across the whole app. The lesson says each one in
words before a student needs it, usually in the step that first draws it:
"The demand curve, labelled D, shows…".

A reading a dropline shows has a symbol too, P\* for the equilibrium price,
which an exam asks a student to write on their own diagram. The chart shows
the reading's value instead ([Droplines](#droplines)), so the symbol is said:
in the lesson's words ("Economists write them as P\* and Q\*") and in the
Maths tab's formulas. These rows say where.

| Symbol | Means | Drawn on |
| --- | --- | --- |
| D | The demand curve | A market's demand curve |
| S | The supply curve | A market's supply curve |
| PPC | The production possibility curve | The PPC |
| ToT | The terms of trade, export prices ÷ import prices × 100 | Its line; the imports axis shows its value |
| AD | Aggregate demand | The economy's aggregate demand curve |
| SRAS | Short-run aggregate supply | The economy's short-run aggregate supply curve |
| LRAS | Long-run aggregate supply, at potential growth | The vertical line at potential growth |
| SRPC | The short-run Phillips curve | The curve inflation and unemployment move along |
| LRPC | The long-run Phillips curve, at the natural rate of unemployment | The vertical line at the natural rate |
| GDP | GDP growth over time | The business cycle |
| D₀, S₀, PPC₀, ToT₀, AD₀, SRAS₀, LRAS₀, SRPC₀, LRPC₀, GDP₀ | Where that curve was | Its ghost |
| D₁, S₁, PPC₁, ToT₁, AD₁, SRAS₁, LRAS₁, SRPC₁, LRPC₁, GDP₁ | Where that curve goes | The answer, after a question |
| P\* | The equilibrium price | Said in the lesson and written in the Maths tab; its axis shows the value |
| Q\* | The equilibrium quantity | Said in the lesson and written in the Maths tab; its axis shows the value |
| P | A price a seller sets, or sellers take as given, where nothing clears a market | Said in the lesson and written in the Maths tab; its axis shows the value |
| P₁ | Where that price goes | Said in the lesson and written in the Maths tab; its axis shows the value |
| Q<sub>d</sub> | The quantity demanded at P | Said in the lesson and written in the Maths tab; its axis shows the value |
| Q<sub>s</sub> | The quantity supplied at P | Said in the lesson and written in the Maths tab; its axis shows the value |
| e\* | The equilibrium exchange rate, USD per AUD | Said in the lesson and written in the Maths tab; its axis shows the value |
| 1/e\* | Its reciprocal, AUD per USD | Said in the lesson and written in the Maths tab; its axis shows the value |
| U | The unemployment rate | Said in the lesson and written in the Maths tab; its axis shows the value |
| π | The inflation rate | Said in the lesson and written in the Maths tab; its axis shows the value |
| A, B, C… | Points the lesson names | Beside the point |

A new symbol is added here first, and only if a word won't fit where it has to
go.

Never put any of these in front of a student:

- Abbreviations made for the code: CS, TR, Qe, oc, maxC.
- Unexplained Greek letters (Δ) or shorthand: w/, &, approx., qty, eq'm.
- Shortened units: write "thousands of tonnes", not "'000 t"; "a day", not "/d".

Currency codes (AUD, USD) are fine: that is how money is written.

## Numbers

- Tick numbers are bare. The unit is in the axis title.
- Every other number goes through the same formatter and precision as the
  caption: `formatValue` with the narrated calc's `precision`.
- A price is in dollars and cents ($7.60). A quantity is a whole number, or has
  one decimal where a fraction matters.
- A change is written was → now. A direction is ▲ or ▼, in grey. Negatives use a
  true minus (−).

## Accessibility

- Every object a student is meant to find has an `srTitle` in words:
  "Equilibrium", "Point A", "Most coffees".
- Colour is never the only difference (see [Colour](#colour)), and the contrast
  ratios above apply.
- Nothing a student has to read is smaller than 14px.
- Don't shrink a drag target. The engine gives curves and points an invisible
  grip 20px across or more, so a student on a trackpad doesn't have to land on
  a 2px line.
- Whatever can be dragged has a [handle](#handles) at rest, so finding it
  doesn't depend on hovering, which a tablet can't do.
- Whatever can be dragged can be moved from the keyboard as well, as a slider
  ([Handles](#handles)). Its name is its `srTitle`, and a param it moves is
  said by its `label` where that says more than the name, as the slider
  for the same param says it.

## Adding a chart

1. **Caption.** A name of one to three words, and a headline calc whose `label`
   is in words.
2. **Axes.** Titles in words with units. Ranges that cover the sliders' full
   reach. Round ticks.
3. **Curves.** A semantic colour, the default weight, and a label from the symbol
   list at the conventional end.
4. **Points.** The default radius. A letter if the lesson names the point.
   Droplines only if it is read off the axes.
5. **Areas.** 20%, or 8% for context, and labelled in words.
6. **Before and after.** Use `ghost:` for before and a dotted answer line for a
   question. Never two P\*s. On a chart with an equilibrium, give each curve
   that shifts a `shiftAt` at the old equilibrium price, so its arrow is level.
7. **Annotations.** Plain text at the default size in the thing's colour, readouts
   at the top right, no more than three at a time.
8. **Motion.** `arrive: true` only on the point a step brings in for the student
   to read.
9. **Drags.** Nothing to draw: the engine puts a handle on whatever can be
   dragged. A label set by hand beside a point that can be dragged sits 20px
   out, past its arrows. A param whose step is a big share of its axis, as
   the shortages lesson's are at a twelfth and an eighth, gets a `dragRound`
   ([Motion](#motion)).
10. **Nothing extra.** No legend, no gridlines, no hand-set `fontSize`, no
    hand-set `strokeWidth`.
11. **Words.** Every symbol is in the list above, and the lesson says it in words
    first.
12. **Contrast.** Any new colour clears 3:1 as a line and 4.5:1 as text.
13. **Look at it.** Check it in focus and in the grid, at 1440×900 and on a phone.
    The defects in `NOTES.md` that no test caught were found by looking at a
    screenshot.

## Where today's charts differ

Each line is a place where a chart in the repo breaks a rule above, on purpose,
and where the reason is written down beside its config. Don't copy one. If one
can be fixed, fix it and delete its line. When a chart has to break a rule, give
the object a `breaksRule: { rule, why }` naming this doc's section and the
reason, and add a line here naming the chart, the objects and where the reason
is. The lesson kit takes `breaksRule` off before the engine sees it.
`chartRules.test.ts` checks the rules a machine can, skips a rule only for an
object whose `breaksRule` names it, and holds every such object to a line here.

- **Labels on the plot**: aggregate demand, `ad` in `lessons/ad-as/chart.ts`,
  is labelled at its upper left, not its lower right as demand is. Its lower
  right is on the bottom edge, close to the economy whenever inflation is low
  and to LRAS for much of potential growth's range, so a label there went to
  the other end with the demand slider alone. The reason is in its
  `breaksRule`.
- **Annotations**: the pressure a surplus or a shortage puts on the price,
  `surplusPressure` and `shortagePressure` in
  `lessons/shortage-surplus/chart.ts`, is an arrow drawn by hand, in the
  price's grey, from the price line down or up to the equilibrium. The
  engine's arrows say where something was, and the lesson is about where the
  price is going. It is unlabelled, as a shift arrow is, and the step that
  brings it in says what it is. The reason is in its `breaksRule`.

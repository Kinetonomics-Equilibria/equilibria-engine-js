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
   mark on the chart, and the frame is the lightest: curves are 3px, axes 2px,
   and a shaded area has no outline at all.

4. **A line's style says when it is.** Solid is now. Dashed and faint is where
   it was. Dotted is something to read the chart against: a dropline to an
   axis, a measured step, or the answer to a question. A student who has learnt
   this once can read any before-and-after in the app.

5. **The chart holds still.** The axes cover the whole range a lesson's sliders
   can reach, so nothing rescales while a student is dragging. This is
   `design.md`'s "nothing moves under the pointer", inside the plot.

6. **Hide, don't shrink.** In a small panel the engine's density levels drop
   axis titles, then ticks and labels. Nothing is drawn smaller to fit. A chart
   is written once, at its focal size, and the same config serves every size.

## Anatomy

| Part | Where | Drawn by |
| --- | --- | --- |
| Chart title | Caption row across the top of the sheet, centred over the plot | The app, from the panel's `name` in `PANELS` |
| Headline number and change chip | Caption row, right end | The app, from the panel's `headline` and `delta` calcs |
| Plot | Under the caption | The engine |
| Axis titles | 44px under the x axis, centred; 56px left of the y axis, rotated, centred | The engine, from `xAxis.title` and `yAxis.title` |
| Tick numbers | Outside each axis | The engine (d3) |
| Dropline labels | On the axis, among the tick numbers | The engine, from `droplines` on a point |
| Curve, point and area labels | On the plot, beside what they name | The engine, from `label` on the object |
| Readouts | Top-right corner of the plot | The engine, as `Label` objects |

The chart's title is never drawn inside the plot, and the engine draws no title
of its own.

## Type

There is one typeface: the app's (`fontFamily` in `apps/web/src/theme.ts`), for
every word and every number. KaTeX's maths italic is used for one thing only,
symbols — D, S, P\*, Q\*, e\* — so a symbol always looks like maths and a word
never does. A word in a label is plain text (`plainText: true`), not `\text{}`.

A label's `fontSize` is in **points**, not pixels: `fontSize: 12` is 16px.

| What | Size | Style | Colour |
| --- | --- | --- | --- |
| Chart title | 16px | semibold | text |
| Headline number and chip | 14px | regular, tabular figures | dimmed grey |
| Curve label (a symbol) | `SYMBOL_SIZE`, 14pt (18.7px) | maths italic | the curve's |
| Axis title | `LABEL_SIZE`, 12pt (16px) | regular | text |
| Dropline label | `LABEL_SIZE` | maths italic | the point's |
| Point letter, area label, annotation | `LABEL_SIZE` | regular, plain text | the thing's |
| Tick numbers | 14px | regular, tabular figures | axis grey |

These are the engine's defaults for each kind of label (`LABEL_SIZE` and
`SYMBOL_SIZE` in `packages/engine/src/ts/view/typeScale.ts`; tick numbers in
`kgjs-theme.css`), so a config sets no `fontSize` at all. They are sized for a
projector at the front of a classroom at 100% zoom, not only for a laptop.
Nothing a student has to read is smaller than 14px, and there are no sizes in
between.

## Lines

| Role | Weight | Style | Colour | Opacity |
| --- | --- | --- | --- | --- |
| Axis line and ticks | 2px | solid | `--kg-axis-color` (#333) | 100% |
| A curve, now | 3px | solid | its own | 100% |
| Where it was (the ghost) | 3px | dashed, 10 on 10 off | the curve's | 35% |
| Where it should go (the answer, after Check) | 3px | dotted | the curve's | 100% |
| Dropline | 3px | dotted | the point's | 100% |
| Price line (a set price across the plot, to read points against; labelled P on the price axis) | 3px | dotted | `choice` | 100% |
| Measured step ("+20 toasties") | 3px | dotted | the thing measured | 100% |
| Gridline | 1px | dotted | light grey | 100% |

- **Weights are set for the back of a classroom.** These charts are shown on
  a projector at 100% zoom as well as read on a laptop, and at 2px curves and
  1px axes they could hardly be seen across a room. The defaults are 3px
  (`LINE_WEIGHT` in `packages/engine/src/ts/view/viewObjects/viewObject.ts`)
  and 2px (the axes, in `kgjs-theme.css`). A config sets no `strokeWidth`.
- Every curve is the same weight, the one a student can drag included. Don't
  thicken the curve a lesson is about: the lesson's words and the caption
  already say what it is about.
- Dotted is round dots as wide as the line, a line's width apart. In the
  smallest panels (`indicator`) every line is drawn half as heavy again, and
  its dots and gaps grow with it.
- A ghost comes from `ghost:` on the object, never from a hand-drawn dashed
  copy. The engine builds it from the same definition, so the two can't
  disagree about slope or colour. With `ghost: { label: '_0' }` it is named D₀
  while the live curve stays D, and on a point it also draws the shift arrow.
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
| A handle: a curve's end that can be dragged | radius 6 | solid, the curve's colour |
| A ghost point | radius 7 | 35%, from `ghost:` |
| An area the lesson names: consumer surplus, revenue, profit | — | 20% (the default), no outline |
| A region that is context: the attainable set under a PPC | — | 8%, no outline |

An area takes the colour of what it belongs to. Consumer surplus is under
demand, so it is demand's blue; producer surplus is supply's orange; revenue,
price times quantity, is the equilibrium's green.

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
| `combination` | purple | A combination anywhere: inside, on or outside the curve |

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
  line. The engine's halo keeps the line from running through the letters.
  Never set a `bgcolor` box.
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
  (`studyDiagram.ts`).
- **The label is the curve's symbol** from the [list](#symbols). The live curve
  keeps its plain name always: D, never D′ or D₁. Its ghost adds ₀
  (`ghost: { label: '_0' }`), and the answer after a question adds ₁. The engine
  moves the ghost's label clear of the live one.
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

- **From the point to both axes**, unless only one value matters. Dotted, 3px,
  in the point's colour. Set with `droplines: { vertical: 'Q^*', horizontal:
  'P^*' }` on the point.
- **Labelled on the axis**, among the tick numbers, with the symbol. A tick
  number the label would cover is hidden while it does: the engine does this,
  and the tick mark stays.
- **Only the point as it is now has droplines.** A ghost point gets none, and
  the engine won't give it any. Two P\*s at two heights would contradict each
  other. The old value is in the caption's chip and in "What changed".
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
- The only arrow is the engine's shift arrow, which a point's `ghost: true`
  draws from where it was to where it is. Don't draw decorative arrows.

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
- **Symbols**: on curves, droplines and points. Only from this list.
- **Numbers**: formatted as everywhere else.

A symbol is allowed only because it sits on the plot, where space is tight.
Each one means one thing across the whole app. The lesson says each one in
words before a student needs it, usually in the step that first draws it: "That
point gives one price, P\*, and one quantity, Q\*."

| Symbol | Means | Drawn on |
| --- | --- | --- |
| D | The demand curve | A market's demand curve |
| S | The supply curve | A market's supply curve |
| PPC | The production possibility curve | The PPC |
| D₀, S₀, PPC₀ | Where that curve was | Its ghost |
| D₁, S₁, PPC₁ | Where that curve goes | The answer, after a question |
| P\* | The equilibrium price | The price axis, at the end of a dropline |
| Q\* | The equilibrium quantity | The quantity axis, at the end of a dropline |
| P | A price a seller sets, where nothing clears a market | The price axis, at the end of a dropline or a price line |
| P₁ | Where that price goes | The price axis, for the answer after a question |
| Q<sub>d</sub> | The quantity demanded at P | The quantity axis, at the end of a dropline |
| e\* | The equilibrium exchange rate, USD per AUD | The AUD market's rate axis |
| 1/e\* | Its reciprocal, AUD per USD | The USD market's rate axis |
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
  a 3px line.

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
   question. Never two P\*s.
7. **Annotations.** Plain text at the default size in the thing's colour, readouts
   at the top right, no more than three at a time.
8. **Nothing extra.** No legend, no gridlines, no hand-set `fontSize`, no
   hand-set `strokeWidth`.
9. **Words.** Every symbol is in the list above, and the lesson says it in words
   first.
10. **Contrast.** Any new colour clears 3:1 as a line and 4.5:1 as text.
11. **Look at it.** Check it in focus and in the grid, at 1440×900 and on a phone.
    The defects in `NOTES.md` that no test caught were found by looking at a
    screenshot.

## Where today's charts differ

Each line is a place where a chart in the repo breaks a rule above. Fix it, or
write down in the config why it stays, then delete the line here.

None at the moment. When a chart has to break a rule, add a line here naming
the chart, the rule, and where the reason is written down.

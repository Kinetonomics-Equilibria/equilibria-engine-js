# 03 - Layouts

The `layout` property defines the canvas and the arrangement of graphs within it. A layout class
does exactly two things: it sets the canvas **aspect ratio**, and it writes a fractional
`{x, y, width, height}` position onto each graph it names. `CustomLayout` takes those fractions
from the host instead of hardcoding them. Everything else on screen — controls,
prose, sidebars — is the host application's job (see [the engine/host boundary](../index.md)).

## Both spellings

```yaml
layout:
  OneGraph:              # every config in this repo uses this form
    graph: { ... }
```

```yaml
layout:
  type: OneGraph         # also accepted
  def:
    graph: { ... }
```

**Only the first key of `layout` is read** (`view/view.ts:190`), so layouts do not compose. To place
two arrangements on one page, mount two engines.

A top-level `aspectRatio` on the config **overrides** the layout's
(`view.aspectRatio = data.aspectRatio || parsedData.aspectRatio || 1`, `view/view.ts:220`).

## `CustomLayout`: the host decides

Every other class on this page is a hardcoded arrangement — a table of fractions with a name.
`CustomLayout` is the same code path with the table supplied from outside, so an application can
measure its own viewport and say "focus panel on the left, three indicators down the right"
without one of the presets happening to match.

```yaml
layout:
  CustomLayout:
    aspectRatio: 1.26
    panels:
      - key: market
        x: 0.04
        y: 0.03
        width: 0.52
        height: 0.90
        xAxis: { title: Q, min: 0, max: 20 }
        yAxis: { title: P, min: 0, max: 20 }
        objects: [ ... ]
      - key: firm
        x: 0.62
        y: 0.03
        width: 0.16
        height: 0.28
        linkTo: market
        objects: [ ... ]
```

| Panel key | Meaning |
|---|---|
| `key` | The panel's handle. Optional; a panel without one is `panel0`, `panel1`, … by position. |
| `x`, `y`, `width`, `height` | The rect, as fractions of the canvas. Required. |
| `linkTo` | The key of the panel whose scales this panel's objects may also reference. |
| `density` | How much detail this panel draws — see [below](#density-how-much-detail-a-panel-draws). Optional; absent means `full`. |

Everything else on a panel is an ordinary graph def — `xAxis`, `yAxis`, `objects`.

### The key is what makes a panel addressable

A panel's key names its scales: `market` gets `market_x` and `market_y`. The authoring objects are
discarded once a config is parsed, so the scale names are the only part of a panel that survives
into `parsedData` — which is what every view object resolves against. Two panels sharing a key is
therefore a real fault and warns twice: once for the duplicate key, once because a scale lookup now
keeps whichever panel was built last.

### Linking panels

`linkTo` is what lets an object on one panel reference another panel's scales — a line drawn
across two graphs, a dropline connecting them. It is **one directed link per panel**, not a mesh,
because the underlying mechanism (`addSecondGraph`) holds exactly one second graph per object. A
panel may link forwards to one declared after it.

A link that names a key which does not exist warns and is dropped; a cross-graph object left
unlinked warns and is not drawn. Neither takes the rest of the diagram down with it.

### A panel's position can be an expression

A rect is an ordinary evaluated string, so it can name a param:

```yaml
panels:
  - key: firm
    x: params.focus == 1 ? 0.05 : 0.62
    y: 0.03
    width: params.focus == 1 ? 0.52 : 0.16
    height: params.focus == 1 ? 0.90 : 0.28
```

Promoting that panel is then `kg.update({ params: [{ name: 'focus', value: 1 }] })` — a param
change, with no remount and no config-shape change. The panel's scales re-evaluate their range and
everything drawn against them follows: axis, curves, points, and the clip path their contents are
masked by.

Positions given as expressions are **not** bounds-checked, because their value is not known until
the model exists. Numeric ones are, and a panel outside the canvas warns by key.

### One canvas, one aspect ratio

A host arranging panels is choosing the **canvas** shape too. There is no way to give one panel its
own aspect ratio independent of its rect — a square panel on a wide canvas is a rect whose width
and height fractions happen to produce a square at the current canvas size. This is a real
constraint on any focus-and-rail arrangement, not an oversight.

## Density: how much detail a panel draws

A 190px panel in a rail and a 620px panel on the stage have **different jobs**, not the same job at
different sizes. At 620px a panel is read: the values matter, the axis titles matter. At 190px it
answers one question — did something change here, and is it worth clicking? Below roughly 220px,
10pt tick labels and KaTeX curve labels collide with each other and with the curve, so a rail of
full-detail panels is noise.

`density` says which job a panel has. It is available on any graph def, not only a `CustomLayout`
panel, but the panel must be **named** — the key is what addresses it.

```yaml
panels:
  - key: market
    density: full            # full | compact | indicator | auto
  - key: firm
    density: indicator
```

| Level | Axis titles | Ticks and tick labels | Curve and point labels | Strokes |
|---|---|---|---|---|
| `full` | drawn | as authored | drawn | as authored |
| `compact` | hidden | half as many | drawn | as authored |
| `indicator` | hidden | none; the axis line stays | hidden | ×2 |
| `auto` | the engine picks a level from the panel's measured short side | | | |

Curve geometry, shaded areas, points and droplines are **never** dropped. They are what makes a
small panel recognisable, and recognition is the whole job at that size.

### A level composes; it does not overrule

Nothing here replaces a value you wrote.

- `show` is **conjoined**, exactly as a [step's reveal predicate](./02-parameters-and-interactions.md)
  is. A level can hide more; it can never reveal something you hid. An object with its own `show`
  keeps deciding, inside whatever the level allows.
- `ticks` is **scaled**. `ticks: 20` at `compact` is 10, not the level's own number. (d3 treats a
  tick count as a hint and quantises the step, so the rendered count is not always exactly half.)
- Stroke width is scaled by a separate factor (`strokeScale`), so your `strokeWidth` — expression
  or number — is untouched.

### Changing level at runtime

```ts
kg.setDensity('firm', 'full');
```

A level lives in a param (`density_<key>`, declared for you unless you declare it yourself), so
this is a param update and nothing else: no remount, and a panel being promoted from the rail can
gain its labels **as** it grows rather than after it arrives. Only a panel that declared a
`density` can be set — declaring it is what creates the level to move — and `setDensity` names the
panels that can be when given one that cannot.

### `auto`, and what it does and does not follow

`auto` chooses from the panel's measured **short side**: under 240px it is an `indicator`, under
420px `compact`, otherwise `full`. Those two numbers are working values from typographic reasoning
about the 10pt default, not measurements taken with real diagrams in front of real students.

It is re-chosen whenever the panel's box changes — on a container resize, and on a param change
that moves the panel, so an `auto` panel promoted by [an expression in its
rect](#a-panels-position-can-be-an-expression) changes level in the same tick that it grows.

`auto` is opt-in on purpose. The engine can see that a panel is small; it cannot see *why*, and a
190px rail panel and a 190px panel on a phone want different treatment. A host that knows why
should say so with a level.

## The base classes

Three classes exist only to be inherited from, and their aspect ratios are what a concrete layout
silently picks up when it does not set its own.

| Base | Aspect ratio | Notes |
|---|---|---|
| `Layout` | **2** | Inherited by `GameMatrixPlusGraph`, `SquarePlusTwoVerticalGraphs`, `EdgeworthBox`, `EdgeworthBoxPlusSidebar`. |
| `SquareLayout` | **1.22** | Not 1:1. The *canvas* is 1.22 so that a graph occupying 0.82 of the width comes out square (`layouts/layout.ts:30-31`). |
| `WideRectangleLayout` | **2.44** | Twice as wide as `SquareLayout`. |

`nosvg` is hardcoded `false` (`layouts/layout.ts:13`) and is not author-settable, despite being a
`ViewDefinition` field.

## Every layout

| Class | Aspect ratio | Graph keys |
|---|---|---|
| `CustomLayout` | 2, or `aspectRatio` | `panels` — see [above](#customlayout-the-host-decides) |

| `OneGraph` | 1.22 | `graph` |
| `OneTree` | 1.22 | `tree` |
| `OneWideGraph` | 2.44 | `graph` |
| `TwoHorizontalGraphs` | 2.5 | `leftGraph`, `rightGraph` |
| `GameMatrixPlusGraph` | 2 | `graph` |
| `TwoVerticalGraphs` | 1.22 | `topGraph`, `bottomGraph` |
| `TwoVerticalGraphsRoom200` | 1.3 | `topGraph`, `bottomGraph` |
| `ThreeHorizontalGraphs` | 4 | `leftGraph`, `middleGraph`, `rightGraph` |
| `FourGraphs` | 1.22 | `topLeftGraph`, `bottomLeftGraph`, `topRightGraph`, `bottomRightGraph` |
| `SquarePlusTwoVerticalGraphs` | 2 | `bigGraph`, `topGraph`, `bottomGraph` |
| `TwoVerticalSquaresOneBigSquare` | 1.6 | `bigGraph`, `topGraph`, `bottomGraph` |
| `EdgeworthBox` | 2 | `agentA`, `agentB` |
| `EdgeworthBoxSquare` | 1.22 | `agentA`, `agentB` |
| `EdgeworthBoxPlusSidebar` | 2 | `agentA`, `agentB` |
| `EdgeworthBoxPlusTwoGraphsPlusSidebar` | 1.22 | `agentA`, `agentB`, `graph1`, `graph2` |
| `EdgeworthBoxAboveOneGraphPlusSidebar` | 1.22 | `agentA`, `agentB`, `graph` |

The exact fractional rect each of these produces is asserted in
`packages/engine/src/__tests__/layouts.test.ts`; that file is the authority if this table and the
source ever disagree.

### Things the names do not tell you

- **`SquarePlusTwoVerticalGraphs` and `TwoVerticalSquaresOneBigSquare` are mirror images**, not
  variants of one layout. The first puts the big graph on the **left** (x 0.05) on a 2 canvas; the
  second puts it on the **right** (x 0.43) on a 1.6 canvas.
- **`EdgeworthBoxPlusSidebar` is an exact alias of `EdgeworthBox`** — same aspect ratio, same rects.
  The sidebar it names was never rendered. Kept because configs reference it by name.
- **`EdgeworthBox`'s `agentB` has negative width and height.** That is deliberate: agentB's box is
  agentA's read from the opposite corner, with axes oriented `top` and `right`.
- **`EntryDeterrence` is not a layout.** It extends `Tree` and lives in `econ/layouts/` only by
  filing accident.
- The two Edgeworth layouts with auxiliary graphs clamp their box height to **0.62** so the band
  below has room. Without the clamp, equal goods put those graphs off the bottom of the canvas.

## Keys the engine does not render

These are accepted by the parser and **warn by name**. `Controls`, `GameMatrix`, `Sidebar` and
`Explanation` were never implemented; the container that would have held them discarded its def.

| Key | On | Was |
|---|---|---|
| `leftControls`, `rightControls` | `TwoHorizontalGraphs` | Reserved a band nothing drew, and shrank the graphs to 0.5 height on a 1.8 canvas |
| `leftControls`, `middleControls`, `rightControls` | `ThreeHorizontalGraphs` | Same, on a 2 canvas |
| `game` | `GameMatrixPlusGraph` | Reserved the left 40% of the canvas, permanently blank |
| `sidebar` | the three Edgeworth `*Sidebar` classes | Discarded; never reserved canvas |
| `explanation` | top level | Pushed an `Explanation` class that does not exist |

Passing one of these now leaves the graphs using the **full canvas** and prints one warning naming
the key. Render the control, matrix, sidebar or prose in the host application instead.

## Example

```yaml
layout:
  TwoHorizontalGraphs:
    leftGraph:
      xAxis: { title: "Quantity (Left)" }
      yAxis: { title: "Price" }
    rightGraph:
      xAxis: { title: "Quantity (Right)" }
      yAxis: { title: "Price" }
```

## Economic addons

The `Edgeworth*` layouts are covered further in
[06 - Economic Components](./06-econ-objects.md).

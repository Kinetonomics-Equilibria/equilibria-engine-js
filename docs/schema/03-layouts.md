# 03 - Layouts

The `layout` property defines the canvas and the arrangement of graphs within it. A layout class
does exactly two things: it sets the canvas **aspect ratio**, and it writes a fractional
`{x, y, width, height}` position onto each graph it names. Everything else on screen — controls,
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

# P2 — Layout defect sweep

**Lane:** engine
**Depends on:** nothing
**Unblocks:** P3 (reuses the test helper and the canvas-bounds invariant); any product work that puts more than one graph on screen
**Status:** ✅ **Complete** (2026-08-27). Tests: `packages/engine/src/__tests__/layouts.test.ts`
(64 cases; 11 of them fail against the pre-sweep source, verified by stashing it).

## Goal

Make the existing layout family honest: no reserved canvas for content the engine
cannot draw, no layout that silently puts a graph off-screen, no config key
accepted and ignored, and a `docs/schema/03-layouts.md` that matches the source.
Add the first test coverage the family has ever had.

This is independent of all three architectural forks and can land today.

## Why this shape

Three principles decide every case below.

1. **The engine draws diagrams; the host draws UI.** `docs/index.md:21` already
   states this ("intentionally leaves the surrounding layout, UI controls (like
   interactive sidebars), and application routing to the host"), and the product
   design puts controls in the app's DOCK. So the answer to "should we implement
   a real `DivContainer` + `Controls` + `GameMatrix` + `Sidebar`?" is no — that is
   building three UI widgets into a headless renderer, against both the stated
   boundary and the direction of travel.

2. **A key the engine cannot honour must warn by name.** Today `leftControls`,
   `sidebar` and `game` are accepted, silently dropped, and in two cases silently
   change the geometry of the graphs that *did* render. That is the same failure
   mode as NOTES.md issues 4 and 7 — a wrong answer with no diagnostic — and it
   gets the same treatment: one `console.warn` naming the key and saying whose
   job it is.

3. **"Backwards compatible" only protects output worth keeping.** Removing the
   controls code paths *does* change rendering for a config that passes those
   keys. But the current output for such a config is a canvas with 40% blank
   space, graphs at 55% of their natural height, and a different aspect ratio
   than the same config without the key — reserved for a widget that cannot
   exist. There is no version of that worth preserving. Every geometry change
   below is stated explicitly and argued individually.

Where a defect is purely dead code with no rendering consequence (the Edgeworth
sidebars, the `view.sidebar` branch), the change is a straight deletion and the
compat question does not arise.

## Current state

### The layout family, as it actually is

`layout: { <ClassName>: def }` is dispatched by class name at
`packages/engine/src/ts/view/view.ts:186-193`. The `{ type, def }` form is
accepted at the same site — the doc's example uses that form, every config in the
repo uses the other. Author classes are auto-indexed into
`packages/engine/src/ts/KGAuthor/index.ts` by
`packages/engine/scripts/generateIndices.mjs:13`, which scrapes `export class`.

A layout class does exactly two things: set `this.aspectRatio`, and write a
fractional `position {x,y,width,height}` onto each graph def. `Layout.parseSelf`
(`layouts/layout.ts:20-24`) copies `aspectRatio` and `nosvg` into `parsedData`;
the position lands, and *only* lands, on the graph's two `Scale` defs
(`positionedObjects/positionedObject.ts:72-97`).

**Correction to a stated fact:** `layouts/` exports **14** classes, of which 11
are concrete layouts — the other three are the bases `Layout` (aspectRatio 2),
`SquareLayout` (1.22) and `WideRectangleLayout` (2.44) at `layouts/layout.ts:5,
28, 40`. `econ/layouts/` adds 5 more concrete layouts in `edgeworth.ts`, plus
`EntryDeterrence` (`econ/layouts/gameTree.ts:9`), which extends `Tree`, not
`Layout`, and is misfiled in `layouts/`.

| Class | Source | aspectRatio | Graph keys | Dead keys |
|---|---|---|---|---|
| `OneGraph` | `layouts/oneGraph.ts:5` | 1.22 | `graph` | — |
| `OneTree` | `layouts/oneGraph.ts:24` | 1.22 | `tree` | — |
| `OneWideGraph` | `layouts/oneGraph.ts:43` | 2.44 | `graph` | — |
| `TwoHorizontalGraphs` | `layouts/twoHorizontalGraphs.ts:13` | 2.5, or 1.8 with controls | `leftGraph`, `rightGraph` | `leftControls`, `rightControls` |
| `GameMatrixPlusGraph` | `layouts/twoHorizontalGraphs.ts:103` | 2 (inherited) | `graph` | `game` |
| `TwoVerticalGraphs` | `layouts/twoVerticalGraphs.ts:4` | 1.22 | `topGraph`, `bottomGraph` | — |
| `TwoVerticalGraphsRoom200` | `layouts/twoVerticalGraphs.ts:40` | 1.3 | `topGraph`, `bottomGraph` | — |
| `ThreeHorizontalGraphs` | `layouts/threeHorizontalGraphs.ts:15` | 4, or 2 with controls | `leftGraph`, `middleGraph`, `rightGraph` | `leftControls`, `middleControls`, `rightControls` |
| `FourGraphs` | `layouts/fourGraphs.ts:4` | 1.22 | `topLeftGraph`, `bottomLeftGraph`, `topRightGraph`, `bottomRightGraph` | — |
| `SquarePlusTwoVerticalGraphs` | `layouts/squarePlusTwoVerticalGraphs.ts:6` | 2 (inherited) | `bigGraph`, `topGraph`, `bottomGraph` | — |
| `TwoVerticalSquaresOneBigSquare` | `layouts/squarePlusTwoVerticalGraphs.ts:46` | 1.6 | `bigGraph`, `topGraph`, `bottomGraph` | — |
| `EdgeworthBox` | `econ/layouts/edgeworth.ts:14` | 2 | `agentA`, `agentB` | — |
| `EdgeworthBoxSquare` | `econ/layouts/edgeworth.ts:61` | 1.22 | `agentA`, `agentB` | — |
| `EdgeworthBoxPlusSidebar` | `econ/layouts/edgeworth.ts:100` | 2 | `agentA`, `agentB` | `sidebar` |
| `EdgeworthBoxPlusTwoGraphsPlusSidebar` | `econ/layouts/edgeworth.ts:149` | 1.22 | `agentA`, `agentB`, `graph1`, `graph2` | `sidebar` |
| `EdgeworthBoxAboveOneGraphPlusSidebar` | `econ/layouts/edgeworth.ts:214` | 1.22 | `agentA`, `agentB`, `graph` | `sidebar` |

### D1 — `DivContainer` is a stub, and so is everything it would have held

The class is declared three times, locally and unexported, at
`layouts/twoHorizontalGraphs.ts:5-11`, `layouts/threeHorizontalGraphs.ts:5-11`
and `econ/layouts/edgeworth.ts:4-10`. All three are identical: an empty
constructor that discards its def, and a `parse()` that returns `parsedData`
unchanged without recursing.

There are **two** levels of missing implementation, not one. Even a working
`DivContainer` that recursed into its `children` would find nothing: the child
types it names — `Controls` (`twoHorizontalGraphs.ts:43`,
`threeHorizontalGraphs.ts:47,68,89`) and `GameMatrix`
(`twoHorizontalGraphs.ts:120`) — are not exported anywhere in `KGAuthor`, so
`parse()` would warn "Unknown object type" (`parsers/parsingFunctions.ts:26`).
Nor is `DivContainer` itself registered: `generateIndices.mjs` scrapes
`export class`, and none of the three declarations is exported.

Consequences, per consumer:

- `TwoHorizontalGraphs` with `leftControls` or `rightControls`: aspectRatio drops
  2.5 → 1.8 and `graphHeight` drops 0.9 → 0.5 (`twoHorizontalGraphs.ts:74-76`).
  The graphs occupy y 0.1–0.6 and the bottom 40% of a now-taller canvas is blank.
- `ThreeHorizontalGraphs` with any `*Controls`: aspectRatio 4 → 2, `graphHeight`
  0.9 → 0.5 (`threeHorizontalGraphs.ts:99-101`). Graphs occupy y 0.025–0.525;
  the bottom 47% is blank.
- `GameMatrixPlusGraph`: unconditionally places its one graph at x 0.6 width 0.35
  (`twoHorizontalGraphs.ts:126-131`) and leaves the left 40% permanently blank,
  because that is where the matrix would have gone. The `game` def is discarded.
- The three Edgeworth `*Sidebar` classes: `sidebarDef` is passed straight to the
  stub and dropped. **No geometry change** — the sidebar never reserved canvas.
  `EdgeworthBoxPlusSidebar` (`edgeworth.ts:100-147`) is therefore byte-for-byte
  equivalent to `EdgeworthBox` apart from that dead line.

Nothing in this repo passes any of these keys — `grep` over `apps/`, `docs/`,
`packages/` finds `leftControls`/`sidebar`/`game` only inside the layout sources
themselves. The exposure is to legacy KGJS YAML someone might port.

### D2 — `TwoHorizontalGraphs` control band overflows the canvas

`bottomY = 0.9` and `controlHeight = 0.25` (`twoHorizontalGraphs.ts:25-27`) sum
to 1.15 — 15% below the bottom edge. This is **latent**: the rect goes to the
stub and nothing is drawn. `ThreeHorizontalGraphs` does not have it
(0.65 + 0.3 = 0.95).

Every other rect in the family is inside the canvas. Two bottom out at exactly
1.0 — `TwoHorizontalGraphs` graphs (0.1 + 0.9) and `TwoVerticalGraphsRoom200`'s
bottom graph (0.62 + 0.38). Both are legal; the SVG root is `overflow: visible`
(`view/view.ts:243`) so tick labels below the axis still paint.

### D3 — Two Edgeworth classes put their auxiliary graphs off the canvas

Not in the stated fact list; found while checking rect sums.
`EdgeworthBoxPlusTwoGraphsPlusSidebar` (`econ/layouts/edgeworth.ts:161-197`)
starts with `height = 0.9`, then shrinks it **only if the two goods differ**:

```ts
let width = 0.738, height = 0.9;
if (def.totalGood1 > def.totalGood2) { height = def.totalGood2 * height / def.totalGood1; }
if (def.totalGood2 > def.totalGood1) { height = def.totalGood1 * width  / def.totalGood2; }
...
graph1.position = { x: 0.1, y: height + 0.15, width: 0.35, height: 0.85 - height };
```

When `totalGood1 === totalGood2` — the commonest Edgeworth setup, and a square
box is the point of `0.9 / 1.22 = 0.738` — neither branch fires, so `graph1` and
`graph2` get `y: 1.05` and `height: -0.05`: entirely below the canvas, and
inverted. `EdgeworthBoxAboveOneGraphPlusSidebar` (`edgeworth.ts:225-254`) has the
identical formula and the identical failure. In the unequal cases the arithmetic
lands the auxiliary band at exactly y+height = 1.0 and is fine.

Note also that the two branches are inconsistent: one scales `height` by `height`,
the other by `width`.

### D4 — `rectanglePlusTwoSquares.ts` is eight space characters

`packages/engine/src/ts/KGAuthor/layouts/rectanglePlusTwoSquares.ts` is 8 bytes,
all `0x20` (confirmed with `xxd`). No `export class`, so it is absent from the
generated `KGAuthor/index.ts` and unreachable.

### D5 — `docs/schema/03-layouts.md` drift

Against the table above:

- `SquarePlusTwoVerticalGraphs / TwoVerticalSquaresOneBigSquare` are listed as one
  entry (line 35). They are mirror images with different aspect ratios: 2 (big
  graph on the **left**, x 0.05) vs 1.6 (big graph on the **right**, x 0.43).
- `TwoVerticalGraphsRoom200` is omitted entirely.
- `OneTree` is listed but `EntryDeterrence` (a `Tree` subclass filed under
  `econ/layouts/`) is not mentioned anywhere.
- `GameMatrixPlusGraph` is described as "provides layout space for a game matrix"
  — accurate about the space, silent about the fact that nothing fills it.
- The `*Controls` and `sidebar` keys are undocumented, which is arguably a mercy
  but means an author who inherits a KGJS config has no way to learn why their
  graphs shrank.
- "a `SquareLayout` maintains an aspect ratio close to 1:1" (line 6) — it is 1.22,
  and the reason is in the source comment (`layouts/layout.ts:30-31`): the
  *canvas* is 1.22 so that a graph occupying 0.82 of the width is square.
- Nothing states that `Layout`'s default is 2, which is what
  `SquarePlusTwoVerticalGraphs`, `EdgeworthBox`, `EdgeworthBoxPlusSidebar` and
  `GameMatrixPlusGraph` silently inherit.
- Nothing states that a top-level `aspectRatio` on the config **overrides** the
  layout's: `view.aspectRatio = data.aspectRatio || parsedData.aspectRatio || 1`
  (`view/view.ts:220`).
- Nothing states that only the first key of `layout` is read
  (`view/view.ts:190`), so layouts cannot be composed.
- `nosvg` is hardcoded `false` (`layouts/layout.ts:13`) and is not author-settable
  despite being a `ViewDefinition` field (`view/view.ts:35`).

`docs/configuration.md:113` has its own shorter, also-incomplete list.

### D6 — dead view-sizing code adjacent to layout

Found while reading; include or drop as you prefer, but they are the same class
of thing.

- `view.sidebar` and `view.explanation` (`view/view.ts:76-77`) are **never
  assigned** anywhere in the engine (`grep` for `.sidebar =` / `.explanation =`
  returns nothing). So `view/view.ts:395-421` is dead: `sidebarHeight` and
  `explanationHeight` are always 0 and `displayHeight` is always `height + 10`.
- `view/view.ts:196-198` pushes `{ type: "Explanation" }` when the config has an
  `explanation` key, but no `Explanation` class is exported from `KGAuthor`, so
  it produces `Unknown object type "Explanation"` and is dropped.
- `view/view.ts:430-431` and `435-436` call `.style('width', width)` with a bare
  number. d3 stringifies it, `"800"` is not a valid CSS length, and the browser
  discards it. The checked-in snapshot proves it:
  `__snapshots__/snapshot.test.ts.snap` shows
  `<div style="position: absolute; left: 0px; top: 0px;">` and
  `<svg style="overflow: visible; pointer-events: none;" width="800" height="400">`
  — no width or height in either `style`. The SVG is sized by its **attributes**
  (`view/view.ts:437-438`), which do work; `svgContainerDiv` is unsized and acts
  as a zero-size positioning origin at (0,0), which is all the absolutely
  positioned label divs need.

### D7 — test coverage would not catch any of this

`src/__tests__/snapshot.test.ts` mounts a config with **no `layout` key at all**
— raw `scales` and `layers` (lines 36-63). Its snapshot is one `<path>` in one
`<g>`. The only layout exercised anywhere in the suite is `OneGraph`, via
`__tests__/helpers.ts:63` and `econ_regressions.test.ts:21`, and neither asserts
anything about position or aspect ratio.

So: **no layout class has a single assertion against it.** Changing a fraction in
`FourGraphs`, flipping `TwoVerticalSquaresOneBigSquare`'s mirror, or deleting an
`addSecondGraph` call would leave all 88 tests green. Baseline confirmed by
running `npx vitest run` in `packages/engine`: 12 files, 88 tests, all passing.

## Approach

### 1. One shared warning for keys the engine will not honour

Add to `packages/engine/src/ts/KGAuthor/layouts/layout.ts`:

```ts
export function warnUnsupportedLayoutKeys(className: string, def: any, keys: string[]) { ... }
```

One `console.warn` per key present, of the form:

> `TwoHorizontalGraphs: "leftControls" is not rendered by the engine. Controls, game matrices and sidebars are the host application's responsibility; the graphs now use the full canvas.`

Warn-and-continue is the house style here (`parsingFunctions.ts:26`,
`nameRegistry.ts:41`, `model.ts:106`) and the tests already have
`captureWarnings()` (`__tests__/helpers.ts:102`) to assert on it.

### 2. Delete the `DivContainer` stubs and the branches that build them

- `layouts/twoHorizontalGraphs.ts`: delete the class (lines 5-11); delete both
  `leftControls`/`rightControls` blocks (32-72); delete `includeControls` and the
  conditionals it feeds, fixing `graphHeight = 0.9` and `aspectRatio = 2.5`
  (74-76); call `warnUnsupportedLayoutKeys('TwoHorizontalGraphs', def,
  ['leftControls','rightControls'])`. **This is a rendering change** for a config
  passing either key: the graphs go back to 0.9 height on a 2.5 canvas instead of
  0.5 on a 1.8 one. Argued in *Why this shape*, point 3. D2's overflow is
  resolved by the same deletion.
- `layouts/threeHorizontalGraphs.ts`: identical treatment (class at 5-11, three
  blocks at 36-97, constants at 99-101); fixes `graphHeight = 0.9` and
  `aspectRatio = 4`. Same rendering change.
- `layouts/twoHorizontalGraphs.ts` `GameMatrixPlusGraph` (103-137): delete the
  `gameDivDef` and its push; move the graph to the full canvas
  (`x: 0.15, y: 0.1, width: 0.74, height: 0.7` — matching `OneWideGraph`'s band,
  or keep `y/height` as-is and only widen). Warn on `game`. **Keep the class**
  rather than delete it: deleting makes `layout: { GameMatrixPlusGraph: ... }`
  hit the unknown-type warn and render an empty container, which is worse than a
  full-width graph plus an explicit message.
- `econ/layouts/edgeworth.ts`: delete the class (4-10) and the three
  `new DivContainer(sidebarDef)` pushes (143, 208, 264); warn on `sidebar`. **No
  geometry change** in any of the three. `EdgeworthBoxPlusSidebar` becomes an
  exact alias of `EdgeworthBox`; keep it (configs reference it) and say so in a
  comment.

Rejected alternatives, for the record: *implement* `DivContainer` — against the
engine/host boundary in `docs/index.md:21` and against the DOCK design; *leave and
document* — leaves two layouts reserving 40%+ of the canvas for nothing, which no
amount of documentation makes acceptable in a product whose core screen is a
readable diagram.

If you disagree with the geometry change, the strictly smaller variant is: delete
the stub class and the pushes, keep `includeControls` driving `aspectRatio` and
`graphHeight`, and only add the warning. That is still an improvement (the author
learns why) and it is a one-line revert away from the full fix.

### 3. Fix the Edgeworth auxiliary-graph band (D3)

In `econ/layouts/edgeworth.ts`, both `EdgeworthBoxPlusTwoGraphsPlusSidebar`
(161-197) and `EdgeworthBoxAboveOneGraphPlusSidebar` (225-254):

Minimal safe fix — clamp the box height so the band it leaves is non-negative:

```ts
const MAX_BOX_HEIGHT_WITH_AUX = 0.62;
height = Math.min(height, MAX_BOX_HEIGHT_WITH_AUX);
```

With equal goods this gives box height 0.62, auxiliary band `y: 0.77,
height: 0.23`, bottom edge exactly 1.0. The two unequal cases (0.45 and 0.369)
are already below the clamp and are **unchanged**. Also make the two branches
consistent — both should scale `height` by `height`, not one by `width`.

Cost: with equal goods the box stops being square in pixels (0.738W × 0.508W).
The alternative that preserves squareness is to lower these two classes'
`aspectRatio` from the inherited 1.22 to ≈0.84, which changes the canvas shape in
*all* cases. **This is the one item in the sweep that needs a look at a rendered
example rather than a number check** — decide it with a real config in front of
you, and leave the clamp in if in doubt, since it is the change that fixes the
broken case without touching the working ones.

### 4. Delete `rectanglePlusTwoSquares.ts` (D4)

Then run `npm run generate:indices` from `packages/engine` and confirm the diff to
`KGAuthor/index.ts` is empty (the file contributed no exports). Do not hand-edit
the generated index.

### 5. Rewrite `docs/schema/03-layouts.md` (D5)

Replace the prose list with the table from *Current state*, plus:

- Both `layout` spellings, noting that `{ ClassName: def }` is what every config
  in this repo uses and `{ type, def }` is what the current example shows.
- Only the first key of `layout` is read; layouts do not compose.
- Top-level `aspectRatio` overrides the layout's (`view/view.ts:220`).
- `SquareLayout` = 1.22 with the reason from `layouts/layout.ts:30-31`;
  `WideRectangleLayout` = 2.44; bare `Layout` = 2 and which classes inherit it.
- A short "keys the engine does not render" section listing `leftControls`,
  `middleControls`, `rightControls`, `game`, `sidebar` and `explanation`, saying
  they warn and are the host's job.
- `EdgeworthBoxPlusSidebar` is an alias of `EdgeworthBox`.
- `EntryDeterrence` is a `Tree` subclass, not a layout, despite its location.

Also update the list at `docs/configuration.md:113` to point at the table rather
than repeat a partial one.

### 6. Optional: retire the dead view-sizing code (D6)

- Delete `view/view.ts:395-421`'s sidebar and explanation branches and the
  now-unused private fields at 76-77. Pure dead-code removal, zero behaviour
  change — the fields are never assigned.
- Delete the `Explanation` push at `view/view.ts:196-198` and warn by name
  instead, so `explanation:` gets the same treatment as `sidebar:`.
- Delete the four no-op `.style('width'/'height', <number>)` calls at
  `view/view.ts:430-431, 435-436`. Removing a call the browser already discards
  is exactly a no-op; the snapshot at `__snapshots__/snapshot.test.ts.snap`
  should not change. **Do not "fix" them by adding `px`** — that would give
  `svgContainerDiv` a real box for the first time and is a rendering change with
  no demand behind it.

### 7. New test file

`packages/engine/src/__tests__/layouts.test.ts` — see below.

## API / schema surface

Additive:

- `warnUnsupportedLayoutKeys(className, def, keys)` exported from
  `KGAuthor/layouts/layout.ts`. Internal helper; not part of the config surface.

Removed from the config surface (each now warns instead of silently acting):

- `leftControls`, `rightControls` on `TwoHorizontalGraphs`
- `leftControls`, `middleControls`, `rightControls` on `ThreeHorizontalGraphs`
- `game` on `GameMatrixPlusGraph`
- `sidebar` on the three Edgeworth `*Sidebar` classes
- `explanation` at the top level (step 6, optional)

Geometry changes (all documented in the changelog entry for this sweep):

| Config | Before | After |
|---|---|---|
| `TwoHorizontalGraphs` + any `*Controls` | AR 1.8, graph height 0.5 | AR 2.5, graph height 0.9 |
| `ThreeHorizontalGraphs` + any `*Controls` | AR 2, graph height 0.5 | AR 4, graph height 0.9 |
| `GameMatrixPlusGraph` | graph at x 0.6 w 0.35 | graph at x 0.15 w 0.74 |
| `EdgeworthBox*PlusTwoGraphs*` / `*AboveOneGraph*` with `totalGood1 === totalGood2` | aux graphs at y 1.05, height −0.05 (off canvas) | box height 0.62, aux band y 0.77 height 0.23 |

No class is removed. No class is renamed. Every config that does not pass a dead
key renders byte-identically.

## Tests

New file `packages/engine/src/__tests__/layouts.test.ts`, using
`stubContainerLayout()` and `captureWarnings()` from `__tests__/helpers.ts`.

The assertion target is `kg.view.parsedData` — specifically `aspectRatio` and
`scales`. That is the *whole* output of a layout class, so it is the right level:
DOM snapshots of a three-graph layout would be enormous and would fail for
unrelated reasons, which is the trap NOTES.md already calls out ("New engine work
should extend those rather than adding more shape-count tests").

Two facts the helper depends on, both verified by reading:

- `parsedData.scales` is seeded with two defaults named `x` and `y`
  (`view/view.ts:164-179`) before any layout pushes to it, so **drop the first
  two entries**.
- Each graph pushes its x scale then its y scale, graphs in construction order
  (`positionedObject.ts:99`, `authoringObject.ts:47-54`). y is inverted:
  `rangeMin = y + height`, `rangeMax = y` (`positionedObject.ts:88-97`).

```ts
// rect for panel i:  x = xs.rangeMin, width = xs.rangeMax - xs.rangeMin,
//                    y = ys.rangeMax, height = ys.rangeMin - ys.rangeMax
```

Cases:

1. **`aspectRatio` per class** — one assertion per concrete layout, against the
   table in *Current state*. Guards: an inherited default changing under someone;
   the `TwoVerticalSquaresOneBigSquare` 1.6 vs `SquarePlusTwoVerticalGraphs` 2
   distinction, which is currently only visible by reading two class bodies.
2. **Rects per class** — the ordered list of `{x,y,width,height}` for each layout,
   as literals. Guards any accidental edit to a hardcoded fraction, and pins the
   mirror-image relationship between the two `SquarePlusTwo*` classes.
3. **Every rect is inside the canvas** — a loop over all layouts asserting
   `0 ≤ min(x, x+width)` and `max(x, x+width) ≤ 1`, same for y. Normalise first:
   `EdgeworthBox`'s `agentB` has deliberately negative width and height
   (`edgeworth.ts:42-47`). Guards D2 and D3 as a class, not as two instances —
   this is the test that would have caught both.
4. **`totalGood1 === totalGood2` on `EdgeworthBoxPlusTwoGraphsPlusSidebar`** — the
   auxiliary graphs land on the canvas with positive height. Fails against
   today's code. Same for `EdgeworthBoxAboveOneGraphPlusSidebar`.
5. **`leftControls` no longer changes geometry** — mount `TwoHorizontalGraphs`
   with and without `leftControls`, assert identical `aspectRatio` and identical
   rects, and assert exactly one warning naming `leftControls`. Same for
   `ThreeHorizontalGraphs`. Guards the D1 fix in both directions: the geometry
   stops moving *and* the author still gets told.
6. **`sidebar` warns and changes nothing** — mount `EdgeworthBoxPlusSidebar` with
   and without `sidebar`, assert identical rects and one warning. Guards that the
   econ deletion stayed geometry-neutral.
7. **`EdgeworthBoxPlusSidebar` ≡ `EdgeworthBox`** — same aspectRatio and rects for
   the same def. Documents the alias in a place that fails if it stops being true.
8. **Cross-graph wiring survives** — `TwoVerticalGraphs` and
   `TwoVerticalGraphsRoom200` call `addSecondGraph` on every sub-object
   (`twoVerticalGraphs.ts:30-31, 66-67`), which populates `xScale2Name` /
   `yScale2Name` on defs that declare `yScale2Name`
   (`authoringObject.ts:56-65`). Mount a `CrossGraphSegment` and assert its
   parsed def carries both. Guards a refactor quietly dropping those two lines.
   *This is the one case that may need adjusting once you look at
   `CrossGraphSegment`'s required def keys — budget for that.*
9. **The registered layout set is explicit** — assert that the layout class names
   present in `KGAuthorClasses` equal a literal list in the test. Adding or
   removing a layout then forces a deliberate edit, and the plan's rule is that
   the same commit updates `docs/schema/03-layouts.md`. (Rejected alternative:
   parsing the markdown from the test — brittle, and it fails for formatting
   changes.)

Leave `snapshot.test.ts` alone. It guards the SVG drawing pipeline, which is a
different thing from layout arithmetic, and it will not change under any of the
above (verify: it should still match after step 6).

## Risks and unknowns

- **The geometry changes are real.** No config in this repo is affected, but a
  ported KGJS config passing `leftControls` will render differently. The warning
  is the mitigation; the changelog entry is the other half.
- **The Edgeworth clamp (0.62) has now been looked at rendered, and the trade-off is real.**
  Screenshots: `apps/web/screenshots/p2-edgeworth-check.png` (the clamp as shipped) and
  `p2-edgeworth-ar084.png` (this plan's stated alternative). Both were captured through
  `apps/web/scripts/screenshot.mjs` against a temporary Edgeworth config in `App.tsx`, since the
  app itself only ever mounts `OneGraph`; the temporary config was reverted.

  - **As shipped (aspectRatio 1.22, clamp 0.62):** the box renders correctly with both agents'
    axes and the auxiliary graphs sit below it, on-canvas. It is legible and the broken case is
    fixed. But with equal goods the box is visibly **wider than tall** (0.738W × 0.508W), and an
    Edgeworth box with equal endowments reads as *wanting* to be square.
  - **The alternative (aspectRatio 0.84, same clamp):** the box is exactly square. The arithmetic
    is not a coincidence — 0.62 · W/0.84 = 0.738W — so the clamp this plan chose and an 0.84
    canvas happen to compose into a square box. It looks clearly better. The cost is a portrait
    canvas roughly 1.19× as tall as it is wide, in *every* case including unequal goods, which is
    a large change to make on one example.

  **Decision: left as the clamp.** Working the proportionality through is what settled it, and it
  shows this plan's 0.84 suggestion to be *incomplete on its own*.

  For the box to be proportional to the goods, its pixel ratio must equal `tg1/tg2`:

  ```
  pixel w / pixel h  =  0.738·W / (h · W/AR)  =  0.738·AR / h  =  tg1 / tg2
                 ⇒   h  =  0.738 · AR · tg2 / tg1
  ```

  At `AR = 1.22` that is `h = 0.900 · tg2/tg1` — which is exactly the existing first branch. **The
  current formula is already correct for the current aspect ratio.** At `AR = 0.84` the coefficient
  becomes `0.62`, so switching the aspect ratio *without also changing the base height from 0.9 to
  0.62* leaves every unequal-goods box proportionally wrong: 20:10 goods would render at a pixel
  ratio of 1.38 instead of 2.0. The square box in the screenshot is the equal-goods case only, and
  it is square by the coincidence that the clamp value and the proposed aspect ratio happen to
  compose — not because 0.84 is right.

  A coherent version of the alternative exists — `AR = 0.84` **and** `h = 0.62 · tg2/tg1`, dropping
  the clamp to a cap — but it changes every Edgeworth-with-auxiliary case, not just the broken one,
  and it still does not address the tall-box branch, which needs the box's *width* shrunk rather
  than its height under any aspect ratio. That is a real piece of geometry work with a rendered
  review attached, not a constant swap. The clamp stays until someone does it.
- **The two branches were left inconsistent, deliberately — this plan's instruction to make them
  consistent was not followed, and here is why.** Step 3 asked that both scale `height` by
  `height` rather than one by `width`. Working the geometry through: for the box to be proportional
  to the goods on a 1.22 canvas, `h = 0.9 · totalGood2 / totalGood1`, which is exactly the *first*
  branch. For a taller-than-wide box that formula exceeds the canvas, so the correct response is to
  shrink the box's **width**, not to shrink its height further. Making the branches "consistent"
  moves that case from 0.369 to 0.45 — shorter and wider, i.e. further from proportional, not
  closer. It also contradicts this plan's own statement two paragraphs earlier that the unequal
  cases are "already below the clamp and are **unchanged**". So the clamp landed and the branch
  inconsistency is documented in a code comment as a known defect awaiting a rendered look.
- **Test case 8 may need rework.** I have not confirmed the minimal def that makes
  `CrossGraphSegment` construct cleanly; if it turns out fiddly, assert
  `addSecondGraph` reached the sub-objects some other way rather than dropping
  the case — that wiring is the only thing distinguishing `TwoVerticalGraphs`
  from a generic two-graph stack.
- ⚠️ **`generate:indices` is broken and must not be run — worse than this plan supposed.**
  Running `npm run generate:indices` does not merely reorder: it **destroys a hand-edit**. The
  checked-in `KGAuthor/index.ts` ends with a hand-written block that populates
  `classRegistry.ts` through lazy getters (`Object.defineProperty(KGAuthorClasses, key,
  { get: … })`) — evidently to break a circular-import cycle, since every consumer imports
  `KGAuthorClasses` from `classRegistry`, not from `index`. The generator emits
  `export const KGAuthorClasses = AllClasses;` instead and drops the registry wiring entirely.
  It also rewrites the five `Dropline` exports from `./graphObjects/segment` back to
  `./graphObjects/dropline`, meaning the checked-in index is hand-maintained in at least two
  places. **The regeneration was reverted**; deleting `rectanglePlusTwoSquares.ts` left
  `index.ts` unchanged, as this plan required, because that file exported nothing. Fixing the
  generator is its own piece of work and is out of scope here.
- **`EntryDeterrence` is left where it is.** It is a no-op `Tree` subclass
  (`econ/layouts/gameTree.ts:9-20`) misfiled under `layouts/`. Moving it changes
  only the generated index's import path, but it buys nothing behavioural, so
  this plan documents it instead.

## Done when

- [x] No `DivContainer` declaration remains in the tree.
- [x] Every layout def key the engine cannot honour produces one named warning —
      including the top-level `explanation` (step 6).
- [x] `layouts.test.ts` exists, covers all 16 concrete layouts, and cases 4, 5 and 6
      fail against the pre-sweep code. Verified by stashing the source: 11 of the 64
      cases fail, including all three of those.
- [x] `rectanglePlusTwoSquares.ts` is gone and `KGAuthor/index.ts` is unchanged by it.
- [x] `docs/schema/03-layouts.md` lists every layout with its aspect ratio and keys,
      and `docs/configuration.md` points at it.
- [x] `npx vitest run` in `packages/engine` is green (162 tests, up from 88), and
      `__snapshots__/snapshot.test.ts.snap` is byte-identical — confirmed by running
      with `-u` and seeing no diff, which also proves step 6's deletions were no-ops.

## Out of scope

- Implementing controls, game matrices, sidebars or explanations anywhere. If a
  host wants a reserved region on the canvas, P3's pass-through layout gives it
  one *by name*, which is a better mechanism than a per-layout hardcoded hole.
- Collapsing the layout classes onto a shared implementation. P3 covers why that
  should wait.
- Moving `EntryDeterrence` out of `econ/layouts/`.
- The 10px fudge in `displayHeight = height + ... + 10` (`view/view.ts:421`) —
  real, unexplained, and changing it moves every diagram's container height.
- The two layouts whose graphs bottom out at exactly y+height = 1.0
  (`TwoHorizontalGraphs`, `TwoVerticalGraphsRoom200`). Legal, and the SVG is
  `overflow: visible`, so tick labels still paint.

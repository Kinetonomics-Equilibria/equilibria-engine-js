# P4 — Density render mode

**Lane:** engine
**Depends on:** P3 (only if stage and rail share one canvas — see the mixed-size problem below)
**Unblocks:** P7's rail; the focus + rail design as a whole
**Status:** ✅ **Done.** See [Findings](#findings) for where the plan was wrong — three of its
statements about current behaviour were, and two of them in the direction that mattered.

## Goal

Let a panel render at a level of detail matched to its size, so a 190px indicator in the rail
shows a recognisable shape rather than a collision of axis titles, tick labels and curve labels.
When this is done, the same graph definition can be drawn as a full diagram at 620px and as a
legible glyph at 190px, and the student can recognise the second well enough to know what they
would be promoting.

## Why this shape

The arithmetic from the layout discussion: on a 1280×800 laptop the stage is about 900×714, so a
square panel is ~620px and a rail panel ~190px. Below roughly 220px, tick labels at 10pt and KaTeX
curve labels overlap each other and the curve. Without a density level the rail is noise, and
without the rail the whole focus + context design collapses back into an equal grid — which the
same arithmetic already rules out.

The important framing: **a small panel has a different job, not a smaller version of the same job.**
At 620px a panel is read — values matter, axes matter. At 190px it answers one question: did
something change here, and is it worth clicking? That argues for dropping furniture aggressively
rather than scaling it down, and for keeping the *shape* (curve geometry, the equilibrium point,
shaded areas) at full fidelity, since shape is the only thing carrying recognition.

Much of this is already expressible per object, which shapes the plan: rather than inventing a
parallel rendering path, density should mostly *drive the values already declared updatable*.

## Current state

More is updatable than expected, and one important thing is not.

- `ViewObject` updatables: `xScaleMin, xScaleMax, yScaleMin, yScaleMax, fill, stroke, strokeWidth,
  opacity, strokeOpacity, show, lineStyle, srTitle, srDesc`
  (`view/viewObjects/viewObject.ts:129`). `show` gates rendering at `:296` via `displayElement()`
  at `:268-271`.
- `Axis` adds its own updatables: `ticks, intercept, label, min, max, otherMin, otherMax,
  tickPrepend, tickPrecision, tickValues` (`view/viewObjects/axis.ts:38`). **`label` here is the
  axis title and `ticks` is the tick count** — so "drop the axis title, drop to 2 ticks" is already
  expressible per axis, today, with no engine change.
- `Label` declares `fontSize` a **constant**, alongside `xPixelOffset`, `yPixelOffset` and
  `plainText` (`view/viewObjects/label.ts:80`); its updatables are `x, y, text, align, valign,
  rotate, color, bgcolor` (`:81`). So label *text* and position can change at runtime but label
  *size* cannot. Default is 10pt (`:72`).
- Labels render through KaTeX unless `plainText` is set (`view/viewObjects/label.ts:130-138`), with
  a try/catch that logs a render failure. KaTeX is the expensive path and the one that produces the
  most visual furniture.
- `Curve` sets `strokeWidth: 2` as a default and then calls `setProperties(def, 'updatables', [])`
  in both branches (`view/viewObjects/curve.ts:30-40`) — **curve stroke width is not updatable**.
  `Point` sets `strokeWidth: 1` and lists only `x, y, r` as updatables
  (`view/viewObjects/point.ts:33-37`).
- The view knows every panel's pixel box: `Scale.updateDimensions(width, height)` sets `extent`
  from the canvas size (`view/scale.ts:53-57`), and the range fractions give each panel's share.
- `srTitle` / `srDesc` mark an object tabbable (`KGAuthor/parsers/authoringObject.ts:31-38`), and
  are updatable on view objects.

## Approach

1. **Prove the "no engine change" baseline first.** Before building anything, author one graph def
   twice — full, and stripped via the existing updatables (`Axis.label: ''`, `ticks: 2`,
   `show: false` on curve labels) — and look at both at 190px. This is the honest control: if hand
   authoring gets 80% of the way, the engine feature is about *ergonomics and consistency*, not
   capability, and the plan should say so plainly rather than overclaiming. Fold the finding into
   P0's findings note if that spike has run.

2. **Define three levels: `full`, `compact`, `indicator`.** Argue the boundaries in the doc, not in
   code — this is a design decision, and hardcoded pixel thresholds age badly.
   - `full` — everything, as today.
   - `compact` — drop axis titles, halve tick count, keep tick labels, keep curve labels.
   - `indicator` — drop axis titles, tick labels and tick marks entirely; drop curve labels and
     point labels; keep axis lines, curve geometry, shaded areas, the equilibrium point and
     droplines; thicken strokes.

3. **Decide who sets the level, and make it explicit rather than magic.** Recommend: the *host*
   sets it, per panel, because the host knows why a panel is small — a 190px rail panel and a 190px
   panel on a phone want different treatment, and the engine cannot tell them apart from pixels
   alone. Provide engine-side auto-selection from measured size as an opt-in default
   (`density: 'auto'`) so a naive host still gets something sane. Do not make auto the only mode:
   self-selecting renderers are hard to debug precisely because nobody typed the decision anywhere.

4. **Implement the level as a resolved set of values, not a second render path.** At parse/update
   time, the level maps to the properties that already exist: axis `label`, `ticks`, per-object
   `show`, `strokeWidth`. This keeps one rendering path and means an author can still override any
   individual value — the level is a default, not a lock. Where an author has explicitly set a
   property, their value wins; record that precedence in the docs, because "my label vanished at
   small sizes" is otherwise an unpleasant bug to chase.

5. **Make stroke width and label size updatable.** Both are currently frozen: `Curve` passes an
   empty updatables array and `Label.fontSize` is a constant. Adding `strokeWidth` to `Curve` and
   `Point`, and moving `fontSize` from constants to updatables on `Label`, is what lets step 4
   apply without a rebuild. Check what else empties its updatables the way `Curve` does — that
   pattern looks like it was deliberate, and the reason should be understood before undoing it.

6. **Handle the mixed-size problem.** Under P3's single canvas, the stage and the rail live in one
   SVG with one coordinate space, so "thicker strokes when small" cannot be a canvas-wide constant —
   two panels at different sizes need different stroke widths *simultaneously*. This is the design
   constraint that makes a per-panel level necessary rather than a per-view one. Verify that stroke
   width is resolved per object rather than inherited from the SVG, or the rail and the stage will
   fight.

7. **Keep the accessible description intact.** An `indicator` panel that has dropped every label is
   exactly the case where `srTitle`/`srDesc` carry the whole meaning. Density must never strip
   those, and ideally an `indicator` panel gains a description naming what it shows and its current
   value, so the screen-reader experience is *better* at small sizes rather than worse.

## API / schema surface

```yaml
layout:
  CustomLayout:
    panels:
      - key: market
        density: full        # full | compact | indicator | auto
      - key: firm
        density: indicator
```

Plus an imperative path for a host that resizes without re-authoring, alongside `updateParams`:

```ts
kg.setDensity('firm', 'compact');
```

Default is `full` for every existing config, so nothing authored today changes. If `auto` proves
reliable it can become the default in a later major version — not now.

## Tests

Pixel snapshots are worthless here; assert on the parsed/rendered structure instead.

- `packages/engine/src/__tests__/density.test.ts`
  - At `indicator`, no axis-title text node and no tick text nodes are rendered for that panel,
    while the curve path count is unchanged — the shape survives, the furniture goes.
  - At `compact`, tick count is reduced but tick labels remain.
  - An author-set `Axis.label` survives at `compact` (explicit beats default, per step 4).
  - Two panels at different levels in one canvas render different stroke widths — the mixed-size
    guard from step 6.
  - `srTitle`/`srDesc` are present and unchanged at every level.
- `packages/engine/src/__tests__/updatables_contract.test.ts` — extend or add: `Curve.strokeWidth`
  and `Label.fontSize` respond to an update after step 5, with a note that this test exists to
  catch a regression back to the frozen behaviour.

  *Written.* The stroke-width cases turned out to be regression guards on behaviour that already
  worked (finding 1); the `fontSize` cases are the ones that fail against the previous code.

## Risks and unknowns

- **`Curve` deliberately empties its updatables in both branches.** That looks intentional and the
  reason is not recorded. Understand it before changing it; there may be a performance or
  path-regeneration argument, in which case step 5 needs a different mechanism.
- KaTeX cost is assumed, not measured. If label rendering is the bottleneck at small sizes, dropping
  labels is a performance win as well as a legibility one — worth measuring, because it changes how
  hard to push on `indicator`.
- The 220px readability floor came from typographic reasoning about the current 10pt default, not
  from testing with real diagrams and real students. It is a working number, not a finding.
- Auto-selection needs a measured panel size at the moment of update; ordering between
  `updateDimensions` and object updates is unverified and could produce a one-frame flash at the
  wrong density on resize.
- Density interacts with P3's movable geometry: a panel promoted from rail to stage should change
  level *as* it grows. If level changes force a rebuild while position changes do not, promotion
  animation gets ugly.

## Done when

- [x] The hand-authored control from step 1 exists and its result is recorded, so the engine
      feature's value is stated honestly — `updatables_contract.test.ts`, and finding 1 below.
- [x] Three levels are implemented as resolved values over existing properties. Not "with author
      overrides winning" — with author values *composed with*, which is stronger; see finding 3.
- [x] `strokeWidth` and `fontSize` respond to updates. The `Curve` decision turned out not to be a
      decision at all (finding 1), and `fontSize` turned out to be a live defect (finding 2).
- [x] Two panels at different densities render correctly in one canvas — `density.test.ts`,
      "two panels at different levels in one canvas".
- [x] Screen-reader descriptions are unaffected at every level, and an `indicator` panel is
      demonstrably still describable — which it was not, at any level, until finding 4.

## Findings

Five things differed from the plan. Every one was settled by running the code; three of them read
the opposite way from the plan's "Current state" section, which had been written from reading it.

1. **`Curve` never froze its updatables, and the axis title was never one of them.** Both halves of
   step 5's premise were wrong, and in opposite directions.

   `setProperties(def, 'updatables', [])` *appends* — the empty array only makes sure the key
   exists — and `ViewObject`'s own list, `strokeWidth` included, is pushed by the `super(def)` call
   immediately after. So curve and point stroke widths have always responded to a param change, and
   there was no deliberate decision to understand. Measured: `strokeWidth: 'params.w'` goes 2 → 6.

   The other half cost more. `Axis` listed `label` as an updatable and `Axis.redraw()` never drew
   it: an axis *title* is a separate `Label` object the authoring class builds from `title`, at
   construction, only when the title is non-empty. "Drop the axis title, drop to 2 ticks is already
   expressible today, with no engine change" was therefore half true — the ticks were, the title
   was not, and nothing could address it at runtime at all. The dead updatable is removed.

   What the control actually shows: **ticks and stroke width were reachable by hand; axis titles
   and object labels were not.** A curve's `label: { show: ... }` is dropped whenever the curve def
   carries its own `show`, because the label def is a copy of it and `setDefaults` skips keys that
   already exist — so there was no reliable way to hide a curve's name without hiding the curve.
   Density is a capability gain, not only an ergonomic one, but a smaller one than the plan implied.

2. **`Label.fontSize` was not a missing feature but a silent failure.** As a constant it was read
   once and kept as-is unless it parsed as a number, so `fontSize: 'params.f'` was written into the
   DOM as `font-size: params.fpt` — not a valid CSS length. The browser discarded the declaration
   and the label rendered at whatever it inherited, with nothing anywhere saying so. This is the
   repo's signature failure mode (plans README, finding 1) in a third costume. Fixed independently
   of density, which does not use it: density drops labels rather than shrinking them, and adding a
   level that shrinks them on the strength of a hypothesis is what P6's finding 4 warns against.

3. **"Explicit beats default" is not implementable, and composition is better anyway.** By the time
   the compiler runs, `Axis`'s `ticks: 5` default has not been applied yet — it is applied in the
   view class, after parsing — and an author's `ticks: 5` and no `ticks` at all are indistinguish-
   able the moment it has been. So the rule became: **a level never replaces an authored value.**
   `show` is conjoined, exactly as a step's reveal predicate is, so density can only hide more and
   never reveal; `ticks` and stroke width are scaled, so `ticks: 20` at `compact` is 10 rather than
   the level's own number. That is a stronger guarantee than the plan asked for and a simpler one
   to state.

   Stroke width could not be scaled in place: the defaults live in the view classes (`Curve` 2,
   `Point` 1) and are applied after parsing, so a compiler over parsed defs has no base to multiply.
   Hence `strokeScale`, a factor carried beside `strokeWidth` and applied at every site that writes
   one.

4. **The accessible description was not intact to begin with.** Step 7 asked that density never
   strip `srTitle`/`srDesc` and that an `indicator` panel still be describable. Writing that test
   found that a **curve's screen-reader text was never written at all**: `Curve.draw` creates the
   `<title>` and `<desc>` elements and only `Point.redraw` ever called
   `updateScreenReaderDescriptions`. Every curve in every diagram has carried an empty `<title>` —
   the author's `srTitle` accepted, stored, and announced to nobody. Fixed, and the test now passes
   for the reason it was supposed to.

5. **`auto` had to follow a promotion, not only a resize.** The plan filed this under risks
   ("density interacts with P3's movable geometry"). It is not a risk, it is the main case: under
   P3 a panel is promoted by a param change, so an `auto` level recomputed only on container resize
   would animate a panel to full size and leave it drawn as a glyph. The level is refreshed from
   the seam the View already installs on the model (`onParamChange`) as well as from
   `updateDimensions`, and the refresh writes the param directly rather than through `updateParam`
   — a density change is the layout answering a question about itself, and submitting it to the
   restriction set could see a level *rejected*, leaving a panel drawing furniture it has no room
   for.

   Cheap enough to run on every accepted change: the panel's box comes from the scales' fractions
   and extent, which have already recomputed for the tick, so nothing is measured from the DOM.

**Not done, deliberately:** the KaTeX cost in the plan's risk list is still assumed rather than
measured. Dropping labels at `indicator` is justified by legibility on its own, and measuring
render cost to justify it further would not change what the level does.

## Out of scope

- Deciding *which* panel is small — that is the host's arrangement logic, P7.
- The `min-height: 300px` container clash, which distorts small-panel sizing from the React side —
  P1 owns that.
- Any change to how labels are positioned or collision-detected. Density drops labels; it does not
  make them smarter. A layout-aware label solver is a separate and much larger piece of work.

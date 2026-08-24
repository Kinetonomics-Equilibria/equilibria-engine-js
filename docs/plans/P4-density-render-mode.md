# P4 — Density render mode

**Lane:** engine
**Depends on:** P3 (only if stage and rail share one canvas — see the mixed-size problem below)
**Unblocks:** P7's rail; the focus + rail design as a whole
**Status:** Draft plan — not implemented

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

- [ ] The hand-authored control from step 1 exists and its result is recorded, so the engine
      feature's value is stated honestly.
- [ ] Three levels are implemented as resolved defaults over existing properties, with author
      overrides winning.
- [ ] `strokeWidth` and `fontSize` respond to updates, with the `Curve` decision understood and
      documented.
- [ ] Two panels at different densities render correctly in one canvas.
- [ ] Screen-reader descriptions are unaffected at every level, and an `indicator` panel is
      demonstrably still describable.

## Out of scope

- Deciding *which* panel is small — that is the host's arrangement logic, P7.
- The `min-height: 300px` container clash, which distorts small-panel sizing from the React side —
  P1 owns that.
- Any change to how labels are positioned or collision-detected. Density drops labels; it does not
  make them smarter. A layout-aware label solver is a separate and much larger piece of work.

# P3 — Pass-through layout, and geometry that can move

**Lane:** engine
**Depends on:** P2 (reuses its canvas-bounds invariant and layout test helper; not strictly blocking)
**Unblocks:** P7 (stage composition), and through it the whole study screen
**Status:** Draft plan — not implemented

## Goal

Let the host decide where panels sit, instead of picking from eleven hardcoded arrangements. When
this is done, `apps/web` can compute "focus 620px square, three 190px indicators down the right"
and hand those fractions to the engine, and a promotion can move a panel from the rail to the
stage **without a remount** — which is what makes focus + rail feel like one diagram rearranging
rather than four charts blinking.

Two pieces: a `CustomLayout` class that takes geometry from its def, and a one-line
reclassification in `Scale` that turns panel geometry from a construction-time constant into
something that updates.

## Why this shape

Fork 1 leaned A — one `KineticGraph` per screen, host-computed geometry — because linkage *is* the
shared model. Splitting panels across engine instances would make "linked diagrams", the product's
entire premise, an app-level synchronisation trick with duplicated `calcs`.

The reason A is cheap is that the existing layout classes do almost nothing. Every one of them is a
position writer: set `aspectRatio`, write fractional `{x, y, width, height}` onto each graph def,
push a `Graph`. `OneGraph` is 20 lines. There is no layout *engine* to replace — only a hardcoded
table to make injectable.

The second piece is the interesting one, and it was not obvious until the code was read. Panel
geometry already flows through the same expression machinery as everything else: positions are
composed with `addDefs` (`KGAuthor/parsers/parsingFunctions.ts:85-93`), which builds expression
strings, and they end up as a `Scale`'s `rangeMin` / `rangeMax`. The only thing stopping a panel
from moving in response to a param is that `Scale` declares those two as **constants**
(`view/scale.ts:35`), and constants are read once in the `UpdateListener` constructor
(`model/updateListener.ts:43-45`) while updatables are re-evaluated on every update
(`:89-93`).

Move those two names from one list to the other and panel position becomes a function of params.
Promotion is then `updateParams([{name: 'focus', value: 2}])` — no remount, no config-shape change,
and it flows through the same path that already animates everything else. That is a much better
outcome than the host tearing down and rebuilding the view on every click, which is what the
alternative looks like: `KineticGraph.update()` only walks `params` and otherwise calls a generic
model update (`kg.ts:86-99`), so a changed *shape* means the React hook remounts
(`packages/react/src/useEquilibria.ts:135`).

## Current state

- Layout dispatch is by class name: `view.ts:186-192` takes `Object.keys(data.layout)[0]` as the
  type and pushes `{type, def}` onto `data.objects`. Any exported class in the KGAuthor tree is
  reachable, because `packages/engine/scripts/generateIndices.mjs` scrapes `export class` names
  into the registry.
- `Layout` (`KGAuthor/layouts/layout.ts`) holds `aspectRatio` (default 2) and `nosvg`, and
  `parseSelf` copies both onto `parsedData`. `SquareLayout` = 1.22, `WideRectangleLayout` = 2.44.
- Each layout writes `graphDef.position = {x, y, width, height}` as fractions of the canvas and
  pushes `new Graph(graphDef)`. See `layouts/oneGraph.ts:12-20`, `layouts/fourGraphs.ts:16-40`,
  etc.
- `PositionedObject` turns that position into two `Scale`s, with `rangeMin`/`rangeMax` taken from
  the position edges and composed via `addDefs`
  (`KGAuthor/positionedObjects/positionedObject.ts:70-97`).
- `Scale` sets `def.constants = ['rangeMin', 'rangeMax', 'axis', 'name']` and
  `def.updatables = ['domainMin', 'domainMax', 'intercept']` (`view/scale.ts:34-36`). `update()`
  multiplies the range by `extent`, which `updateDimensions(width, height)` sets from the canvas
  size (`:42-57`).
- `TwoVerticalGraphs` and `TwoVerticalGraphsRoom200` are the only layouts that cross-link panels,
  calling `addSecondGraph` on every child of each graph so objects can reference the other panel's
  scales (`layouts/twoVerticalGraphs.ts:26-31`); `AuthoringObject.addSecondGraph` wires
  `xScale2Name`/`yScale2Name` (`KGAuthor/parsers/authoringObject.ts:56-62`).
- The whole canvas has exactly one `aspectRatio`, and height is `containerWidth / aspectRatio`
  (`view.ts:381-395`).

## Approach

1. **Add `packages/engine/src/ts/KGAuthor/layouts/customLayout.ts`.** A `CustomLayout extends Layout`
   whose constructor reads `def.aspectRatio` (defaulting to the base 2) and iterates `def.panels`,
   writing each panel's `position` from its own `x`/`y`/`width`/`height` and pushing a `Graph`.
   Each panel carries a `key` — the host's handle for it — and the rest of the entry is an ordinary
   graph def (`xAxis`, `yAxis`, `objects`). Nothing else; resist the urge to make it clever.

2. **Key the panels for addressing.** Set the graph's `name` from `panel.key` so the key survives
   into the parsed data, and confirm whether anything downstream renders it into the DOM. The host
   does not strictly need a DOM hook — it computed the fractions, so it can position overlay chrome
   itself — but a stable name is what lets an event say *which* panel was interacted with, which
   P8's narration needs.

3. **Decide cross-linking policy.** `addSecondGraph` is pairwise and the existing stacked layouts
   call it in both directions. For N panels the options are: never (authors reference explicitly),
   all-pairs (N² wiring, and `xScale2Name` only holds one), or an explicit `linkTo: <key>` on a
   panel. Recommend `linkTo`, because the existing mechanism only supports *one* second graph per
   object and pretending otherwise will produce silent wrong answers. Document that limit rather
   than hiding it.

4. **Make geometry updatable.** In `view/scale.ts`, move `rangeMin` and `rangeMax` from
   `def.constants` to `def.updatables`. Check `update()` still behaves when `extent` is undefined
   on the first pass (it already guards with `if (s.extent != undefined)`), and confirm nothing
   downstream caches a pixel range across updates — the axis redraw calls `d3.axisBottom(a.xScale.scale)`
   each time (`view/viewObjects/axis.ts:60-96`), which suggests it re-reads, but this needs
   verifying against curves, areas and clip paths, which are the likely offenders.

5. **Let a panel's position be an expression.** With step 4 done, a host can write
   `x: 'params.focus == 0 ? 0.05 : 0.62'` and promotion becomes a param change. Verify that the
   position strings survive `addDefs` composition — they are already run through it, so the
   machinery is there, but a ternary inside a composed sum is exactly the kind of thing that
   produces a valid-looking string that mathjs then parses differently than intended. Test it early;
   if it fails, fall back to the host writing plain fractions and re-mounting on promote, and say so
   in the findings.

6. **Re-express the existing layouts as presets.** Each of the eleven classes becomes a thin wrapper
   that computes the same fractions and delegates to the same code path `CustomLayout` uses. Their
   published behaviour must not change — that is what the golden test in step 8 is for. Do this
   *after* P2's defect sweep, so the presets encode corrected geometry rather than preserving the
   off-canvas control boxes.

7. **Document it** in `docs/schema/03-layouts.md` alongside the presets, including the honest note
   that one canvas has one aspect ratio, so a host arranging panels is choosing a *canvas* shape
   too.

8. **Tests** (see below) before wiring any of it into `apps/web`.

## API / schema surface

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

Additive: no existing config names `CustomLayout`, and the presets keep the current classes
working. The `Scale` reclassification is internal, but it is a behaviour change for anything that
was relying on a range being frozen — which is why step 4 carries a verification burden rather than
being a one-line commit.

## Tests

- `packages/engine/src/__tests__/custom_layout.test.ts`
  - A `CustomLayout` def produces one parsed graph per panel, with scales whose ranges match the
    given fractions.
  - Panels stay inside the canvas (reuse P2's bounds invariant) — a host can pass nonsense, and
    the failure should be a warning naming the panel key, not a silently clipped diagram.
  - `linkTo` wires `xScale2Name`/`yScale2Name`; a `linkTo` naming an unknown key warns.
- `packages/engine/src/__tests__/layout_presets.test.ts` — **golden test**: for each of the eleven
  existing layout classes, the parsed positions and aspect ratio before and after the preset
  refactor are identical. This is the safety net for step 6 and should be written *first*, against
  today's classes, so it captures current behaviour rather than intended behaviour.
- `packages/engine/src/__tests__/scale_updatable_range.test.ts` — a scale whose `rangeMin` is an
  expression of a param moves when the param changes, and the axis, a curve and a clipped area all
  follow. The clip path is the case most likely to break.

## Risks and unknowns

- **Step 4 is the whole plan.** If something downstream caches pixel geometry, moving panels
  without a remount stops being one line and becomes a real refactor. Verify before committing to
  the animated-promotion story in P7; the fallback (remount on promote) is worse but survivable.
- Ternaries inside composed position expressions (step 5) are unproven. Same class of risk as the
  silent-string failure recorded in P0: mathjs returning something plausible rather than throwing.
- One canvas, one aspect ratio. A host that wants a tall rail beside a square stage is choosing the
  bounding canvas, and panels inside it are free — but there is no way to give one panel its own
  aspect ratio independent of its rect. That is a real constraint on P7's layouts and should be
  stated there.
- `addSecondGraph` supports exactly one second graph per object. Any design that assumes N-way
  cross-references is wrong today.
- Presets refactor touches every layout file at once. If P2 has not landed, it will also be
  carrying the defects forward. Sequence matters.

## Done when

- [ ] `CustomLayout` parses, renders N panels at host-given fractions, and warns by key on
      out-of-bounds or unknown `linkTo`.
- [ ] The golden preset test passes against all eleven existing layouts, before and after their
      refactor.
- [ ] A panel's position can be driven by a param, demonstrated by a test that moves one and
      asserts the axis, a curve and a clipped area all follow — **or** the plan is amended to record
      that this is not feasible and P7 takes the remount path.
- [ ] `docs/schema/03-layouts.md` documents `CustomLayout` and the one-aspect-ratio constraint.

## Out of scope

- Panel **roles** (driver / consequence / detail) — that is Fork 2, and belongs with P6's authoring
  vocabulary. `CustomLayout` takes geometry; who decided that geometry is not its business.
- Density behaviour at small panel sizes — P4.
- The React components that compute these fractions — P7.
- Any change to how the canvas itself is sized in the DOM. The `min-height: 300px` clash is P1's.

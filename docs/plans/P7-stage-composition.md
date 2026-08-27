# P7 — Stage composition: focus, rail and promotion

**Lane:** bindings (with the arrangement policy in the app)
**Depends on:** P1 (land first), P3 (geometry), P4 (rail legibility)
**Unblocks:** the study screen; P8/P9/P10/P11 all render inside it
**Status:** ✅ **Done.** `packages/react` has `arrange`/`toCustomLayout` and `Stage`; `apps/web` has
the study screen. See [Findings](#findings) — building it turned up three engine defects, one of
them introduced by P4 the day before.

## Goal

The composition layer that replaces the card: one focal panel the student drives, a rail of linked
panels at indicator size carrying delta chips, click-or-keyboard promotion that swaps them, and a
2×2 grid reachable as a view state. Panels keep their identity through the change, so a promotion
reads as one diagram rearranging rather than four charts blinking.

## Why this shape

Two facts from the layout arithmetic force it. A square panel on a 1280×800 laptop is ~620px, which
is nearly the whole stage — so an equal grid puts every panel under the readability floor, and the
only arrangement that gives anything a readable size is focus + context. And the question a student
is asking has a subject and objects — "I did this, what happened over there?" — not four equals.

Under Fork 1 = A the panels are not separate React components with their own engines. They are
regions of **one** SVG whose fractions the host computed. That inverts the usual React instinct: the
component tree does not own the panels, it owns the *arrangement policy* and the *chrome that floats
above them*. Getting this the wrong way round is the main risk in the plan, and it is why P1 must
land first — the card teaches exactly the wrong model.

## Current state

- `packages/react` after P1: `useEquilibria`, a bare `EquilibriaChart`, `KG_EVENTS`,
  `KG_CONTAINER_CLASS`. No layout, no chrome.
- `useEquilibria` **remounts whenever `config` identity changes**
  (`packages/react/src/useEquilibria.ts:135`, documented at `:55-60`), and
  `KineticGraph.update()` only walks `params`, otherwise calling a generic model update
  (`packages/engine/src/ts/kg.ts:86-99`). So anything that changes config *shape* — a revealed
  panel, a new object — currently costs a full rebuild.
- P3's finding: if `Scale`'s `rangeMin`/`rangeMax` move from constants to updatables
  (`packages/engine/src/ts/view/scale.ts:34-36`), panel geometry becomes an expression of params,
  and promotion is a param change through the existing update path — no remount at all.
- One `ResizeObserver` per `KineticGraph`, calling `view.updateDimensions()`
  (`packages/engine/src/ts/kg.ts:56-62`), which recomputes height from `aspectRatio`.
- The engine emits `kg:param_changed`, `kg:curve_dragged`, `kg:node_hover`; the hook forwards them
  as callbacks and exposes `updateParams`.
- `apps/web` is a Mantine `AppShell` with a `DoubleNavbar` and a `.page` capped at
  `max-width: 56rem` (`apps/web/src/index.css`) — which, as noted in the layout discussion, means
  collapsing the navbar re-centres the diagram rather than widening it. The study screen will want a
  wider container than the current article-width page.

## Approach

1. **Decide the split between package and app, and write it down.** `packages/react` gets the
   mechanism: a `<Stage>` that takes an arrangement (a list of panel rects plus which key is
   focused) and renders one engine instance plus positioned chrome. `apps/web` gets the policy:
   which panel is focal, what the rail order is, what a delta chip says, how it responds to
   viewport. If economics vocabulary appears in `packages/react`, the line has been crossed.

2. **Compute the arrangement as data.** A pure function — viewport size, panel count, focused key,
   view mode (`focus` | `grid`) → `{ aspectRatio, panels: [{key, x, y, width, height, density}] }`.
   Pure means testable without a DOM, which matters because this is where the arithmetic lives and
   arithmetic is what this design is built on. Feed the result straight into P3's `CustomLayout`.

3. **Render chrome as absolutely positioned DOM over the SVG.** The host computed the fractions, so
   it knows every panel's pixel box without touching the SVG. Each panel gets an overlay carrying:
   name, delta chip, changed-state pulse, and — for rail panels — a button role with click and
   keyboard activation. Keep the overlay non-interactive except for its controls
   (`pointer-events: none` on the container, `auto` on the affordances) or it will eat the drag
   events the diagram needs.

4. **Promotion.** Preferred path, if P3 step 4 lands: set the param that drives the geometry and let
   the engine move the panels, so the diagram itself transitions. Fallback: recompute the
   arrangement and re-mount, which loses transient state and flashes. Either way the *chrome*
   animates in DOM. Assess the View Transition API for the chrome — it gives a real morph with a
   one-line fallback (`document.startViewTransition` guarded by a capability check and
   `prefers-reduced-motion`), but it does not compose with an SVG that is separately animating its
   own geometry, so do not use it for both halves at once.

5. **Delta chips.** On a committed param change, compute each rail panel's headline value and show
   the change; at rest show the level. The values come from `calcs`, which the app already has via
   events. The pulse is a CSS animation gated on `prefers-reduced-motion`. Design note worth keeping:
   a chip that updates on every drag frame is noise — tie it to the same commit boundary P8's
   narration uses, so the periphery is calm while the hand is moving.

6. **The grid view state.** Same panels, same engine, different arrangement from step 2 — a toggle,
   not a route, and never the landing state. Under P4 the grid's panels sit at `compact` rather than
   `indicator`.

7. **Lifecycle.** Params change through `updateParams` and never remount. Shape changes (a revealed
   panel arriving, per P10) currently do remount — decide here whether the app pre-declares all
   panels and reveals them via `show`, which avoids shape changes entirely, or whether the engine
   needs an incremental-add path. **Recommend pre-declaring**: it costs a little parse time up front
   and it keeps promotion, reveal and resize all on the no-remount path.

8. **Responsive.** Below ~900px the dock becomes a bottom sheet and the rail a horizontal filmstrip;
   the focal panel keeps its square. Drive it from the same pure arrangement function, so the
   breakpoints are data rather than scattered media queries. The `.page` width cap needs revisiting
   for this screen — the study screen is not an article.

9. **Coordinate resize with density.** The engine's `ResizeObserver` recomputes canvas height; the
   arrangement function decides each panel's density level. Both fire on resize, and the order
   matters — a panel that grows should not render one frame at `indicator` and then jump. Verify the
   sequencing rather than assuming it.

## API / schema surface

```tsx
<Stage
  config={diagram}                 // one config, all panels
  arrangement={arrangement}        // from the pure function in step 2
  onPromote={(key) => …}
  renderChrome={(panel) => …}      // app supplies chips, names, affordances
  onParamChanged={…}
/>
```

`packages/react` exports `Stage`, the arrangement types, and keeps `useEquilibria` /
`EquilibriaChart` for hosts that want a single diagram with no composition.

## Tests

- `packages/react/src/__tests__/arrangement.test.ts` — pure function, no DOM. Focus + rail at
  1280×800 produces a ~620px focal square and ~190px rail panels; the grid mode produces four equal
  cells; panels never overflow the canvas; below 900px the rail becomes a filmstrip.
- `packages/react/src/__tests__/stage.test.tsx` — renders N chrome overlays for N panels; clicking a
  rail panel calls `onPromote` with its key; Enter and Space do the same; the overlay container does
  not intercept pointer events outside its affordances.
- `packages/react/src/__tests__/stage-lifecycle.test.tsx` — a promotion does **not** destroy and
  recreate the engine instance (assert the mock's constructor call count), which is the regression
  that would quietly undo the whole design.
- `apps/web/tests/` — a browser-level check that a promotion visibly swaps the panels and the
  diagram remains interactive afterwards.

## Risks and unknowns

- **If P3 step 4 fails, promotion means remounting.** The visual result is a flash and the loss of
  any drag state; the design still works but feels worse. Know this before promising the morph.
- Overlay chrome and SVG drag handling will fight if `pointer-events` is set carelessly, and the
  symptom (curves that stop responding near a chip) is easy to misdiagnose.
- Under Fork 1 = B this plan changes substantially: panels become independent components with their
  own engines, arrangement becomes ordinary CSS grid, and a param-mirroring layer appears in the
  hook. Cheaper to build, and it makes linkage an app illusion. The arrangement function survives
  either way, which is an argument for writing it first.
- The View Transition API's interaction with a simultaneously animating SVG is unproven here.
- Delta chips need a per-panel "headline value", which is a modelling decision nobody has made yet —
  probably a named calc per panel, which touches P6's vocabulary.
- Mantine's `AppShell` is built for document-shaped pages. A five-region study screen may fight it,
  and it is worth checking the vendored docs (`docs/reference/mantine-llms-full.txt`) before
  assuming `AppShell` is the right shell for this route at all.

## Done when

- [x] The arrangement function is pure, tested, and produces the numbers the layout discussion
      assumed — `arrangement.test.ts`, 900×714 giving a 672px focal square and 180px rail panels.
- [x] Focus + rail renders from one engine instance with positioned chrome. Asserted in the
      browser: one `.kg-container`, one `svg`, six axes.
- [x] Promotion swaps panels without destroying the engine — asserted twice, on the mock's
      construct/destroy counts and on a marked SVG surviving a real click.
- [x] Rail panels are keyboard-reachable and promote on Enter/Space, because they are `<button>`s.
- [x] The grid toggle works and is not the landing state.
- [x] Below 900px the layout reflows without a separate code path — the same `slots` function,
      rotated.

## Findings

Six, and the three that matter most are engine defects the plan could not have predicted, because
they only appear when something asks the engine for a *number* rather than a picture.

1. **An expression beginning with a number was truncated to that number.** `Model.evaluate` opened
   with `if (!isNaN(parseFloat(name))) return parseFloat(name)` — a fast path for a value that is
   already a number. parseFloat reads a *prefix*, so `0.5 * calcs.Qe * (params.a - calcs.Pe)`
   evaluated to `0.5` and never reached mathjs at all. Found by putting consumer surplus on a chip
   and reading `$0.5` where `$40.5` belonged. No warning, no NaN, no missing shape: a number, and
   the wrong one. This is the plans README's finding 1 in its plainest form yet, and it had been
   there since the fork.

2. **`label: { text: 'S' }` drew nothing, because mathjs knows what a siemens is.** Label text is
   evaluated like any other updatable, and mathjs resolves `S` to a Unit and `E`/`e` to Euler's
   number. `katex.render` threw on the Unit, the throw was caught and logged, and the label was
   simply absent while its curve drew perfectly. Two objects in the econ library ship an invisible
   `E`, and the KaTeX error had been visible in this repo's own test output for as long as anyone
   had looked at it. A bare name is now drawn as written; a value is asked for with the documented
   backtick template.

3. **P4's `auto` density made every ghost appear.** `prev.changed` is "has the student moved
   anything", and it gates every ghost and shift arrow. A panel resolving its own level from its
   measured size writes a param — so as of the day before, an `auto` panel announced a student
   action before the student had touched anything. Params now declare whether they carry
   *presentation* or *state*, and only state is compared against the snapshot. `Stage`'s own focus
   and mode params are declared the same way, or promoting a panel would have done it too.

4. **The arrangement had to be scale-free, and was not.** With padding and rail widths in pixels,
   the fractions were a function of the stage's *size*, so every pixel of a window drag produced a
   new `CustomLayout` and a rebuilt diagram — the exact remount the plan is built to avoid, arriving
   through a door it was not watching. It now computes in a normalised canvas and depends only on
   the stage's *shape*, so a proportional resize costs nothing and only a real change of proportions
   (quantised to a hundredth) rebuilds.

5. **Step 5's premise was wrong, and the missing piece was small.** "The values come from `calcs`,
   which the app already has via events" — it did not. `kg:param_changed` said what changed and what
   moved, and not what anything *is*, so a host wanting a number had to reach into the model or
   write the formula out a second time. The event now carries `calcs`, and `getCalcs()` gives the
   same at rest. With that, the open question about a "headline value" answers itself: it is a calc
   the diagram declares, named by the app, and a delta is `calcs.Pe - prev.calcs.Pe` — computed by
   the engine from the same snapshot the ghosts use.

6. **Density did not have to be arranged at all.** P4 recommends the host choose a level, because
   the engine can see that a panel is small but not *why*. In this arrangement it can: the focal
   panel is large *because* it is focal, so size and role are the same fact. `Stage` declares every
   panel `auto` and promotion moves one param instead of four, which also sidesteps the
   non-atomic multi-param update. The recommendation is still right in general and wrong here,
   which is worth saying rather than quietly departing from.

**Not built, deliberately:** the View Transition API (step 4's optional half). Promotion is already
a param change with no remount, and the plan itself warns that view transitions do not compose with
an SVG animating its own geometry. There is nothing to morph that the engine is not already
moving.

## Out of scope

- The narration strip (P8), the dock (P9), the track (P10) and quiz UI (P11) — they render *in*
  this shell, they are not part of it.
- Deciding what a diagram's panels *are*, or their roles. Authoring vocabulary, P6.
- Engine-side density implementation (P4) and geometry (P3). This plan consumes both.

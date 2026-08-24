# P6 — Object identity, names and step ordering

**Lane:** engine (authoring vocabulary)
**Depends on:** P5 for the geometry-comparison option in step 3; nothing otherwise
**Unblocks:** P8 (narration — blocked entirely on the middle clause), P10 (declared step order)
**Status:** Draft plan — not implemented

## Goal

Give the engine enough vocabulary about its own objects that something outside it can say
"the demand curve shifted right" — and give authors a way to declare a build-up once per diagram
instead of once per object.

Two capabilities, one root cause: today objects are anonymous to everything above the renderer.

## Why this shape

The narration strip is the highest-value component in the design, and it is a three-clause
sentence: `a 20.0 → 24.0` · `D shifts right` · `P* 11.0 → 13.0`. The first clause comes free from
`params`, the third from `calcs`. The middle clause is the entire content of this plan — it is what
turns a readout into an explanation, and it is why narration cannot ship complete before this
lands.

The reframe that keeps this small: **the engine does not need to generate the sentence.** It needs
to expose enough that the app can. That means a name, a way to know which objects a param affects,
and a direction. Anything more — phrasing, tense, tone, translation — is product copy and belongs
in the app, where it can be revised without touching diagrams.

Step ordering is here rather than in an app plan for the same reason: `show: 'params.step >= 3'`
already works per object, so the missing piece is not a mechanism but a *place to declare it once*.

## Current state

Better than expected on identity, absent on everything else.

- `AuthoringObjectDefinition` already declares `name?`, `tabbable?`, `srTitle?`, `srDesc?`
  (`KGAuthor/parsers/authoringObject.ts:6-11`), and the constructor assigns `this.name = def.name`
  (`:20`).
- `GraphObject` fills a random name **only as a default**:
  `setDefaults(def, { name: randomString(10) })` (`KGAuthor/graphObjects/graphObject.ts:38-40`), and
  `setDefaults` skips any key the def already owns (`util.ts:1-9`). **So an author-supplied `name`
  survives today.** Stable ids are largely already available; what is missing is that nothing
  requires them, nothing checks them for uniqueness, and nothing exposes them upward.
- Random names are also minted in `positionedObject.ts:78,89` (the two scales), `graph.ts:33` (the
  clip path), `arrowDef.ts:11`, and several econ composites — e.g.
  `budgetLine.ts:69` uses `def.name || 'BL' + randomString(5)`, which shows the "author name wins"
  convention is already the local idiom in places.
- `srTitle` / `srDesc` set `tabbable` and are updatable on view objects
  (`view/viewObjects/viewObject.ts:129`) — the closest thing to a human-readable description today,
  but they are accessibility text, not identity.
- `show` is updatable (same line), so `show: 'params.step >= 3'` per object gives a staged build-up
  **now**. Verified in principle by reading; P0 confirms in practice and measures how verbose it is.
- Econ composites carry human meaning implicitly: `linearEquilibrium.ts` composes demand, supply and
  an equilibrium point with `colors.demand` / `colors.supply` / `colors.equilibriumPrice`, so the
  concept "this is the demand curve" exists at authoring time and is then thrown away.
- `EconSchema` ships `oldValueLabel` / `newValueLabel` idioms (`econSchema.ts:28-32`) — evidence the
  authoring layer already thinks in before/after terms.
- Events carry no object identity beyond what the emitter passes; `kg:param_changed` and
  `kg:curve_dragged` are emitted from the interaction path (`constants.ts`, `docs/interactivity.md`).

## Approach

1. **Make `name` a first-class id.** Keep the current "author wins, random fallback" behaviour, and
   add: a uniqueness check at parse time that warns (not throws) on a duplicate naming two objects
   in the same graph, and a note in the schema docs that a named object is addressable and an
   unnamed one is not. No breaking change — every existing config keeps working, and the ones that
   named things get a guarantee they did not have before.

2. **Add `title` — a human name, distinct from the drawn label.** `label.text` is `D`;
   `srDesc` is a sentence for a screen reader; neither is "the demand curve". Add an optional
   `title` on graph objects, and populate it automatically from econ composites so authors are not
   made to name twenty primitives by hand. `EconLinearDemand` knows it is demand; it should set
   `title: 'demand'` on the curve it builds. **This is the difference between a feature that gets
   used and one that does not** — if narration only works when an author has hand-titled every
   object, most diagrams will never narrate.

3. **Direction of movement — pick one of three, and be honest about the trade.** To say "shifts
   right" something must know a named object moved and which way.

   - **(a) Author declares it.** Per object, a mapping from param to a direction or phrase:
     `responds: { a: 'right' }`. Cheap, predictable, no engine cleverness, and completely wrong the
     moment a param's effect is non-monotonic or depends on another param. Also more authoring
     burden on the very configs that most need narration.
   - **(b) Engine derives it geometrically.** With P5's snapshot, compare the object's sampled
     geometry before and after the change: a curve whose points all moved +x is "right", all +y is
     "up", mixed is "shifted", rotation is "steeper"/"flatter". Robust to how the param works,
     costs a sampling pass, and needs a vocabulary of movement kinds rather than a single axis.
   - **(c) App derives it from events plus its own knowledge.** No engine change, but the app has to
     duplicate the model's understanding of what each param does, which is precisely the coupling
     this plan exists to avoid.

   **Recommendation: (b), with (a) as an override.** Geometric derivation is the only option that
   stays correct when an author writes a curve whose relationship to its params is not obvious, and
   the override handles the cases where the engine's description is technically right but
   pedagogically wrong. Sample a small fixed number of points per object rather than the render
   path's full resolution; this runs once per committed change, not per frame.

   Degenerate cases to specify explicitly, because each has a wrong answer that looks right:
   a param that rotates rather than shifts (pivot around an intercept); a param that moves two
   objects (narration must name both or pick the driver); a change with no visible effect (must say
   nothing rather than "shifts right" by rounding noise); a curve that moves up *and* right
   (a shift along one axis is a different claim from a shift along both — for a demand curve they
   are the same event described two ways, and the economics convention is horizontal).

4. **Expose it.** Extend the param-changed event to carry an array of affected objects, each with
   `name`, `title` and a movement descriptor (`{ kind: 'shift', axis: 'x', sign: +1 }` rather than a
   sentence). The app composes the wording. Keep the payload additive so existing listeners are
   unaffected.

5. **Declared step order.** Add an optional top-level `steps` array to the diagram config, where a
   step names objects to reveal and/or params to set. Compile it down to the mechanism that already
   works — the engine derives `show: 'params.step >= n'` for objects named in step *n*, so there is
   one code path and hand-written `show` expressions keep working alongside. An author writes the
   order once, in one place, and objects that are not mentioned are visible from the start.

   Panel reveal is the same idea one level up and needs P3's keys to name a panel; a step that
   reveals a panel sets whatever param that panel's geometry or `show` is bound to. Keep the
   *timeline UI* — scrubbing, back/forward, lesson prompts — entirely in the app (P10). The engine
   provides addressable objects and a reveal predicate; nothing else.

## API / schema surface

```yaml
objects:
  - type: Line
    def:
      name: demand              # already works; now guaranteed unique and addressable
      title: the demand curve   # new: human name, defaulted by econ composites
      responds: { a: right }    # new, optional: overrides derived direction
      yIntercept: params.a
      slope: -1

steps:                          # new, optional, top-level
  - reveal: [axes]
  - reveal: [demand]
  - reveal: [supply]
  - set: { a: 24 }
```

Event payload, additive:

```ts
{ name: 'a', value: 24,
  affected: [ { name: 'demand', title: 'the demand curve',
                movement: { kind: 'shift', axis: 'x', sign: 1 } } ] }
```

All additive. Configs without `title`, `responds` or `steps` behave exactly as today.

## Tests

- `packages/engine/src/__tests__/object_identity.test.ts` — an author-supplied `name` survives
  parse (guards the `setDefaults` behaviour, which is load-bearing and easy to break); duplicates in
  one graph warn; unnamed objects still render.
- `packages/engine/src/__tests__/movement_detection.test.ts` — the cases from step 3, each as an
  explicit fixture: pure horizontal shift; pure vertical shift; rotation about an intercept; a param
  affecting two objects; a change below the noise threshold reporting *no* movement. This last one
  is the case that will otherwise produce confidently wrong narration.
- `packages/engine/src/__tests__/steps.test.ts` — a `steps` array produces the same visibility
  outcomes as the equivalent hand-written `show` expressions; a hand-written `show` on an object
  also named in a step is not silently overwritten (decide and pin the precedence).
- Extend the econ object-name test (`econ_object_names.test.ts`) to assert composites set a
  sensible default `title`.

## Risks and unknowns

- **Step 3(b) depends on P5.** If snapshot semantics land differently than assumed, geometric
  derivation needs its own before-state and the two plans should be sequenced deliberately.
- Sampling geometry for movement detection is new machinery on the update path. It must not run on
  every drag frame; tie it to the same commit boundary the narration uses, or the cost lands
  exactly where interaction is most latency-sensitive.
- The noise threshold in step 3 is a magic number that determines whether the app says nothing or
  says something wrong. It probably needs to be relative to the axis domain, not absolute.
- `title` defaults from econ composites means touching a lot of composite files. Worth checking how
  many actually construct labelled curves before committing to blanket coverage.
- Precedence between `steps` and hand-written `show` is a genuine design decision with no obviously
  right answer. Pick one, test it, document it.
- Movement descriptors are an economics vocabulary in disguise ("shift" versus "rotate" versus
  "pivot"). Getting the taxonomy wrong here propagates into every sentence the app writes.

## Done when

- [ ] Author-supplied names survive, are checked for uniqueness, and are documented as the way to
      address an object.
- [ ] `title` exists and econ composites populate it by default for the common curves.
- [ ] A param change reports which named objects moved and how, with the degenerate cases from
      step 3 each covered by a test — including the no-movement case.
- [ ] A `steps` array reveals objects in order, compiling to the existing `show` mechanism.
- [ ] `docs/schema/` documents names, titles, `responds` and `steps`.

## Out of scope

- Composing the sentence — the engine reports structured movement, the app writes English (P8).
- The timeline UI: scrubbing, prompts, lesson progression (P10).
- Panel roles (driver / consequence / detail). Related vocabulary, but it belongs with whichever
  plan resolves Fork 2; noted here so it does not get quietly absorbed.
- Any attempt to explain *why* an object moved. Causality beyond "this param moved this object" is
  economics, not geometry.

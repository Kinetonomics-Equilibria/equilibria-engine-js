# P6 — Object identity, names and step ordering

**Lane:** engine (authoring vocabulary)
**Depends on:** P5 for the geometry-comparison option in step 3; nothing otherwise
**Unblocks:** P8 (narration — blocked entirely on the middle clause), P10 (declared step order)
**Status:** ✅ **Complete** (2026-08-27), all five steps. Step 3 took option (b) as recommended.
Tests: `packages/engine/src/__tests__/object_identity.test.ts` (13 cases),
`movement_detection.test.ts` (20), `steps.test.ts` (14), plus 3 in `diagnostics.test.ts`.
Docs: `docs/schema/05-graph-objects.md`, `docs/schema/02-parameters-and-interactions.md`,
`docs/interactivity.md`.

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
  **now**. **P0 §5 confirmed it in practice**, including un-revealing on the way back. It also
  measured the verbosity, which is this plan's justification: 24 characters per object, the step
  number duplicated into every object in that step, and renumbering a step means touching all of
  them. The capability is not the argument for declared step order — the *authoring cost* is, and it
  is now a number rather than an intuition.
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

- [x] Author-supplied names survive, are checked for uniqueness, and are documented as the way to
      address an object. Generated names are deliberately exempt from the check — see Findings 2.
- [x] `title` exists and econ composites populate it by default: demand, supply, equilibrium,
      marginal revenue, the PPF, the contract curve, the monopolist.
- [x] A param change reports which named objects moved and how, through `kg:param_changed`'s
      `affected` array. Every degenerate case named in step 3 has its own fixture, the no-movement
      case included.
- [x] A `steps` array reveals objects in order, compiling to the existing `show` mechanism.
- [x] `docs/schema/` documents names, titles and `steps`. **`responds` was not built** — see
      Findings 4.

## Out of scope

- Composing the sentence — the engine reports structured movement, the app writes English (P8).
- The timeline UI: scrubbing, prompts, lesson progression (P10).
- Panel roles (driver / consequence / detail). Related vocabulary, but it belongs with whichever
  plan resolves Fork 2; noted here so it does not get quietly absorbed.
- Any attempt to explain *why* an object moved. Causality beyond "this param moved this object" is
  economics, not geometry.

## Findings

Five things differed from the plan. All were found by running the code.

1. **Step 4 was "emit it", not "extend it".** `KG_EVENTS.PARAM_CHANGED`, `CURVE_DRAGGED` and
   `NODE_HOVER` have been declared in `constants.ts`, documented in `docs/interactivity.md` as
   fired, and given callback props by the React bindings (`onParamChanged`, `onCurveDragged`,
   `onNodeHover`) since the fork — and **no code path in the engine ever emitted any of them**.
   `view.emitter` was assigned at `kg.ts:84` and read nowhere; the React tests emit them by hand
   against a mock, which is why the gap survived a green suite. All three now fire.

2. **Names were already shared, invisibly.** The plan recorded that author-supplied names survive,
   which is true. What it missed is that they were also *copied*: a point's droplines and axis
   labels, and a curve's and a segment's own label, are built with `copyJSON(def)` taken after the
   parent has been stamped with a name, so three objects answered to `equilibrium`. Harmless while
   a name was only a calc key decorations never write to, and wrong the moment it became an
   address. The opposite case had to be told apart from it rather than lumped in: an indifference
   curve drawn as several curves from one def is one object the author named once, whose calcs
   deliberately merge. Hence `anonymizeCopy` and `reuseName` as two named intentions.

   Generated names are exempt from the uniqueness check. By the time a def reaches `GraphObject`
   an author's name and a default already applied to a copy are indistinguishable except by
   `randomString`'s `KGID_` prefix — and a collision between two generated names is not something
   an author can see or fix, so reporting it would be noise.

3. **`&&` does not parse, and therefore reads as true.** Found while writing the conjunction for
   step 5. mathjs spells logical operators `and` / `or` / `not`; `&&` throws, `Model.evaluate`
   catches, and the expression flows on as its own source string — non-empty, therefore truthy.
   This is finding 1 of the plans README in a new costume, and it had already shipped:
   `EconConstantElasticityCurve` gated a curve and its inverse on `&&` expressions, so **both were
   drawn at once whatever the elasticity**. Fixed, and `Model.evaluate` now warns once when an
   unparseable expression contains `&&` or `||` — narrow enough to be loud, where the general
   unparsed case must stay quiet because colors, LaTeX and forward references all fail there
   legitimately.

4. **`responds` was not needed, so it was not built.** Step 3 recommended geometric derivation with
   an author override. The derivation carried every case in the plan's degenerate list on its own —
   pivot about an intercept, two objects moved by one param, movement below the noise floor — so
   the override has nothing to override yet. Adding an authoring key on the strength of a
   hypothetical is how a schema fills up with things nothing reads. It is a small addition whenever
   a real diagram needs it.

5. **Sampling did not have to be kept off the render path.** The plan's worry was a sampling pass
   running on every drag frame. Two things made it cheap enough to run on every accepted change,
   which is a better answer than a separate commit boundary: `Curve.sampleGeometry` reads the data
   the redraw beside it has already generated rather than resampling, and the whole comparison is
   skipped when nothing is listening for the event. Measuring against the **snapshot** rather than
   the previous frame then fell out for free, and is what keeps a ghost drawn from `prev` and a
   sentence written from `affected` describing one event rather than two.

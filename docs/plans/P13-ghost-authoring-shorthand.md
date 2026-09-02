# P13 — `ghost:` authoring shorthand

**Lane:** bindings (KGAuthor) ·
**Depends on:** P5 (supplies the `prev` primitive), P6 (names, titles and `partOf`) ·
**Unblocks:** nothing — this is the last of the thirteen ·
**Status:** outlined in
[P5](P5-interaction-snapshot-and-prev-scope.md#out-of-scope) and split out here. Read against the
code before building — see [Read against the code](#read-against-the-code-2026-09-02) for what the
outline had wrong.

## Goal

An author who wants to show where a curve *was* should write one word on the
curve they already declared, and get the dashed twin, the shift arrow and the
`D` / `D′` relabelling that go with it.

Today they write the whole thing a second time, by hand, in terms of `prev` —
and the second copy has to be kept in step with the first for as long as the
diagram lives.

## Why this shape

P5 built the memory and deliberately stopped there: `prev` is a scope, and every
ghost in this repo is spelled out longhand against it. That was right — the
primitive should not have been designed around one convenience — but it leaves
the cost where an author pays it. `apps/web/src/studyDiagram.ts` draws one
market three ways and pays it three times over:

- `demandGhost()` (`studyDiagram.ts:67-79`) restates `demand()`'s geometry,
  colour and slope with `prev.params.a` in place of `params.a`.
- the faint prior equilibrium (`studyDiagram.ts:264-271`) restates
  `equilibrium()` with `prev.calcs` in place of `calcs`.
- the shift arrow (`studyDiagram.ts:272-279`) restates both ends of it again.

Roughly thirty lines, none of which says anything the live objects had not
already said. Every one of them is a place where the ghost and the thing it is a
ghost *of* can drift apart — change the live curve's slope and the dashed one
still has the old one, silently, because nothing ties them together but the
author's memory.

That is the whole argument for the shorthand, and it is the same argument
[README finding 3](README.md#findings-that-cut-across-the-set) makes about
values: **a fact stated twice is a fact that will eventually be stated two
different ways.** Here the two statements are in the same file, twelve lines
apart, which makes it likelier to be noticed and no less likely to happen.

There is a second reason, and it is the one that decides the design. A ghost is
not a new object an author is composing; it is *the same object, one snapshot
ago*. Saying that in a config should look like saying it in English — a flag on
the thing, not a copy of the thing.

## Current state

Checked against the tree on 2026-09-02.

- `prev` resolves in any evaluated string: `prev.params.<n>`, `prev.calcs.<n>`,
  the flattened `prev.<n>`, `prev.seq` and `prev.changed`
  (`packages/engine/src/ts/model/model.ts:324-334`). Curve `fn` strings are
  substituted textually and `prev` is in that regex
  (`math/mathFunction.ts:57-64`), so a curve bound to `prev` draws.
- `prev.changed` excludes presentation params (`model.ts:349-355`), which is
  what keeps a ghost off screen until the student moves something.
- There is no `ghost` key anywhere: `grep -rn "ghost" packages/engine/src`
  matches only test names and comments. Every ghost in the repo is hand-written.
- `EconSchema` ships `oldValueLabel` / `newValueLabel` idiom sets
  (`KGAuthor/econ/schemas/econSchema.ts:30-31`) — `\ ` / `^\prime`, `_1` / `_2`,
  `0` / `1` — and they reach the expression scope
  (`model.ts:474-478`).
- `Graph` builds each declared object by looking its `type` up in
  `KGAuthorClasses` and constructing it with its `def`
  (`KGAuthor/positionedObjects/graph.ts:51-57`). That is the one place in the
  engine where an author's `{type, def}` pair is still whole.
- `anonymizeCopy` already exists for exactly the "a copy of this def that is not
  a second address" problem, and records `partOf` on the way
  (`KGAuthor/parsers/nameRegistry.ts:132-142`).
- `combineShow` already exists for "conjoin a generated predicate with whatever
  the author wrote", and spells conjunction `and` rather than `&&`
  (`KGAuthor/parsers/steps.ts:64-72`).

## Read against the code (2026-09-02)

Eight corrections. One moves the feature to a different set of objects, one
finds a third costume for this repo's oldest defect, and four were established
by running the engine rather than reading it — marked **measured**.

1. **The outline puts the flag on the objects nobody in this repo draws.** It
   asks for "a `ghost: true` flag on `EconLinearDemand` and friends". The only
   diagram here that draws ghosts is `apps/web/src/studyDiagram.ts`, and it uses
   `Line`, `Point`, `Area`, `Rectangle` and `Arrow` — there is no econ composite
   anywhere in it, and `grep -rn "Econ" apps/web/src` returns nothing but the
   schema name. A shorthand on the composites would ship with no consumer, which
   is [README finding 17](README.md#findings-that-cut-across-the-set) exactly:
   *before adding a channel, find the message that will go down it in the app you
   actually have.* So `ghost` belongs on **every graph object**, expanded where
   `Graph` builds them, and the econ composites get it by inheritance rather than
   by name.

2. **`oldValueLabel` and `newValueLabel` are read by nothing. (measured)** They
   are declared in `econSchema.ts:30-31`, they reach the model's scope, and
   `grep -rn "oldValueLabel" packages apps` finds no consumer at all. This is
   [README finding 6](README.md#findings-that-cut-across-the-set) again — a
   declaration that is not a behaviour — and it means the pairing the outline
   asks for has never once been rendered. P13 is their first consumer, so their
   spelling is unverified and has to be checked rather than assumed. It renders:
   `D` / `D^\prime` on the default set, `D_1` / `D_2` on `custom: '..1'`, and
   KaTeX accepts both.

3. **`+` does not concatenate strings in mathjs, and the failure is silent.
   (measured)** `"D" + idioms.newValueLabel` throws `Cannot convert "D" to a
   number`; `Model.evaluate` catches it and returns the expression as its own
   source text (`model.ts:490-499`), so the label renders the literal characters
   `"D" + idioms.newValueLabel` as LaTeX. `concat("D", idioms.newValueLabel)`
   works.

   This is a **third position** for the fallback that
   [README finding 1](README.md#findings-that-cut-across-the-set) tracks. It is
   truthy in a `show` (permanently visible), falsy in a restriction (permanently
   refusing), and in a `label` it is **itself** — the expression appears on the
   diagram as text. Three positions, three different meanings, one fallback, and
   the author cannot see which position they are in.

4. **A bare param reference cannot be ghosted, and the two halves of the engine
   disagree about whether it even works. (measured)** A textual `prev.` rewrite
   can only see the qualified form. What a bare name does today depends entirely
   on where it lands: `Point`'s `x: 'a'` resolves through the flattened scope and
   is fine, while `Line`'s `yIntercept: 'a'` throws `Undefined symbol a` out of
   `UnivariateFunction.evaluate` and **the whole diagram fails to draw** — a
   curve's `fn` is substituted textually by a regex that only matches
   `params.`/`calcs.`/`prev.` (`mathFunction.ts:61`), so the bare name never gets
   a value.

   So the shorthand rewrites the qualified form and *warns* about a bare one
   rather than trying to rewrite it. Rewriting bare identifiers inside arbitrary
   expressions is the kind of clever substitution this codebase has been bitten
   by three times (`parseFloat`'s prefix, `addDefs`'s parenthesisation,
   `replaceVariable`), and the warning is the more useful artefact anyway: a
   ghost silently drawn on top of its own live object is precisely the
   silent-wrong-answer failure everything here is arranged to prevent.

5. **The outline says "the arrow" as though every ghost has one. Only a
   *position* has one.** The app draws its arrow between the equilibrium
   **points**, not between the two demand curves, and that is not an oversight:
   two parallel lines have no single displacement to draw. So the arrow is
   defaulted on for a def that carries a position (`coordinates`, or `x` and
   `y`), and asking for one anywhere else warns instead of silently drawing
   nothing.

6. **A ghost must not become a second address, and the machinery for that is
   already written.** P6's `anonymizeCopy` strips `name` and `title` and records
   `partOf` (`nameRegistry.ts:132-142`). Using it rather than deleting the keys
   by hand buys something the outline never considered: `compileSteps` matches
   `o.def.partOf === name` (`steps.ts:107`), so **a lesson step that reveals
   `demand` reveals its ghost with it**, for free, with no code in this plan.

7. **`show` composition has one right answer and it is exported.**
   `combineShow` conjoins rather than replaces and spells conjunction `and`
   (`steps.ts:64-72`). Building the ghost's `show` by string concatenation would
   re-open the `&&` trap that P6 closed and that two econ curves had already
   shipped through. Reuse it.

8. **A schema-less config has no idioms, and the label pairing degrades into
   correction 3. (measured)** Mount the same label with no `schema:` key and it
   renders `concat("D", idioms.oldValueLabel)` on the diagram. `parsedData.idioms`
   defaults to `{}` (`view/view.ts:254`) and only a `Schema` fills it. The two
   idioms the shorthand emits therefore need an engine-level default, applied
   after the schema has had its say.

## Approach

1. **One expansion, at the one place a `{type, def}` pair is whole.** `Graph`
   looks each object's type up in `KGAuthorClasses` and constructs it
   (`graph.ts:51-57`). Expand `ghost` on the def list immediately before that, so
   a ghost is an *ordinary object of the same type* — a `Line` ghost goes through
   `Line`'s geometry dispatch, an `EconLinearDemand` ghost through the composite,
   and every subobject a class builds from a def (a curve's label, a point's
   droplines) is rebuilt from the ghosted def with no further work.

2. **The rewrite is textual and narrow.** `params.<x>` → `prev.params.<x>`,
   `calcs.<x>` → `prev.calcs.<x>`, recursively over every string in the def, and
   idempotent — a reference already under `prev.` is left alone. Nothing else is
   touched: `colors.demand`, `drag.dy`, `x` and `y` all mean what they meant.

3. **Ghost order is draw order.** The twin is inserted *before* the object it
   shadows and the arrow *after* it, because layers are drawn in order and a
   ghost belongs under the live thing while the arrow belongs over it.

4. **Identity is stripped through `anonymizeCopy`,** which gets step reveals for
   free (correction 6). Interaction is stripped too — `drag`, `click`,
   `draggable`, `handles` — because a ghost that can be dragged would bind a
   param through `prev`, and screen-reader text is stripped because the ghost is
   the same object twice and should be announced once.

5. **The label pairing is emitted as expressions, not resolved at author time.**
   `Graph` runs before the schema is parsed and cannot see the idioms, so the
   ghost's label becomes `concat("<text>", idioms.oldValueLabel)` and the live
   one becomes `<ghost's show> ? concat("<text>", idioms.newValueLabel) :
   "<text>"`. Conditioning the live label on the *ghost's own* predicate is what
   keeps `D′` from appearing while there is no `D` to be prime to.

6. **Two idioms get engine defaults** (correction 8), applied after the object
   list is parsed so a schema still wins.

## API / schema surface

```yaml
objects:
  - type: Line
    def:
      name: demand
      yIntercept: params.a
      slope: -1
      color: colors.demand
      label: { text: D, x: 4 }
      drag: [{ vertical: a }]
      ghost: true          # ← the whole feature
```

```ts
interface GhostDefinition {
    /** An extra condition on the ghost only, conjoined with `prev.changed`.
     *  Read as written — it is about now, not about the snapshot. */
    show?: string;
    /** Draw the displacement. Defaults to true for a def with a position. */
    arrow?: boolean;
    /** Pair the labels through the schema's idioms. Default true. */
    label?: boolean;
    /** Anything else is merged onto the generated def, so a ghost's styling is
     *  the author's to override. */
    [property: string]: any;
}
```

Defaults the generated twin carries, all overridable: `lineStyle: 'dashed'`,
`strokeOpacity: 0.35`, `opacity: 0.35`, the original's `color`.

## Tests

Engine, in `packages/engine/src/__tests__/ghosts.test.ts`:

- `ghost: true` on a `Line` draws a second curve, bound one snapshot back, and
  the two coincide until a param moves.
- The ghost is hidden until `prev.changed`, and an author's own `show` survives
  as a conjunction rather than being replaced.
- The ghost is not an address: it claims no name, no calc key, and no duplicate
  warning is emitted.
- A step that reveals the original reveals the ghost (correction 6) — asserted
  through the running engine, not by reading `partOf`.
- `drag` is not copied: dragging the ghost is impossible and the live curve
  still drags.
- A `Point` ghost draws an arrow from the old position to the new one; a `Line`
  ghost does not, and `ghost: { arrow: true }` on one warns.
- Labels pair: `D` and `D′` on the default idioms, `D_1` and `D_2` on
  `custom: '..1'`, and the live label is plain `D` before anything moves.
- A bare param reference in a ghosted def warns, naming the object and the
  property (correction 4).
- A config with no schema still renders the paired labels (correction 8).
- Byte-identical output for every config that does not say `ghost` — the
  existing DOM snapshot is the check.

App, in `apps/web`: `studyDiagram.ts` loses `demandGhost()`, the prior
equilibrium point and the shift arrow, and the existing narration, quiz and
track tests stay green unchanged. That last clause is the real test: the
shorthand has to produce what the hand-written version produced.

## Risks and unknowns

- **A textual rewrite is a blunt instrument.** Contained by rewriting only two
  qualified prefixes, by dropping the keys where a rewrite would be wrong before
  rewriting anything, and by warning on the bare form rather than guessing.
- **The label pairing changes what an existing diagram says.** Adding `ghost` to
  a curve relabels the live curve once the student moves it. That is the
  intended behaviour and it is still a change to something the author did not
  write; `ghost: { label: false }` turns it off.
- **Ghosts of composites are untested territory.** An `EconLinearDemand` ghost
  will also ghost its handles, its marginal revenue curve and its surplus area.
  That is probably right and certainly loud, but the app does not use them, so
  the coverage is a unit test rather than a screen.
- **Nothing here helps a ghost of something that is not on a graph.** `Tree`
  nodes and edges are built from `def.nodes`/`def.edges`, not from `def.objects`
  (`positionedObjects/tree.ts:33-41`), and will ignore the flag.

## Done when

`studyDiagram.ts` says `ghost: true` twice and draws exactly what it draws
today, thirty lines shorter; an author who writes it on a curve whose geometry
is bare-named is told why nothing moved; and every config that has never heard
of ghosts renders byte for byte as before.

## Out of scope

- **Ghosts of tree nodes and edges.** Named above; the flag is a graph-object
  feature.
- **History deeper than one step.** `prev` is depth 1 by design (P5), and a
  shorthand cannot add memory the model does not keep.
- **Animation between the ghost and the live object.** The engine has no
  transition system; P5 said so and it is still true.
- **A `ghost` on a param or a calc.** The delta chips in the dock are calcs over
  `prev` and they read fine as they are; there is no ergonomic problem there to
  solve.
- **Restriction authoring ergonomics.** P12 handed this neighbourhood to P13 and
  it is being handed back: nothing about a refusal is a ghost.

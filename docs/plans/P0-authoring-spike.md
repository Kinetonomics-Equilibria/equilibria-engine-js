# P0 — Authoring spike: prove the free pile

**Lane:** cross (authoring only — no source changes)
**Depends on:** nothing
**Unblocks:** P5, P6, P10, P11 (each leans on a claim proved or disproved here)
**Status:** ✅ **Complete** (2026-08-27). Findings: [P0-findings.md](P0-findings.md).
Tests: `packages/engine/src/__tests__/authoring_contracts.test.ts`.

## Goal

Seven capabilities were claimed to be available *today*, purely by writing config — no engine
change, no React change. Each claim was reached by reading source, not by running anything. This
spike writes a throwaway schema for each, runs it, and records what actually happens. When it is
done we know which of the seven are real, and the plans that depend on them are either confirmed
or rewritten before anyone builds on a wrong assumption.

Deliverable is a scratch page plus a short findings note, not production code. Where a claim turns
out to hold, the spike leaves behind one engine test that pins it, so it cannot silently regress.

## Why this shape

The free pile is the cheapest thing in the whole programme and the most load-bearing: P10's staged
reveal degrades to `show` expressions, P11's verdicts degrade to mathjs calcs, and P5 exists only
because ghosts *can* already be drawn but not remembered. If `show` turns out not to accept a
boolean expression, or `draggable` is read once at mount and never again, three plans change shape.
Running seven small configs is hours of work; discovering it during implementation is weeks.

A spike also produces the thing no amount of source reading produces: a feel for how much schema an
author has to write per effect. Several of these are "possible" in a way that may still be
unusable — writing `show: 'params.step >= 3'` on twenty objects by hand is a real cost, and it is
the argument for P6's declared step order. The spike is where that cost becomes visible.

## Current state

Everything below is source-derived and awaiting confirmation by execution.

- `show` sits in the updatables list alongside `fill, stroke, strokeWidth, opacity, strokeOpacity,
  lineStyle, srTitle, srDesc` — `packages/engine/src/ts/view/viewObjects/viewObject.ts:129`. It
  defaults to `true` at `:123`, and gates rendering at `:296` (`vo.show && vo.onGraph()`), applied
  through `displayElement()` at `:268-271`.
- Expressions compile through mathjs against a flat scope of params, calcs, colors and idioms —
  `packages/engine/src/ts/model/model.ts:143-190`. Failure to parse returns the string unchanged
  rather than throwing (`:180-188`), which means a broken predicate fails *silently and truthily*.
  That is the single biggest risk in this spike.
- `lineStyle` is honoured for `dashed` and `dotted` at
  `packages/engine/src/ts/view/viewObjects/viewObject.ts:251-256`.
- `Arrow` is a `Segment` with `endArrow` forced on, and `double` mapping to `startArrow` —
  `packages/engine/src/ts/KGAuthor/graphObjects/arrow.ts`. Markers are minted per colour by
  `graph.getEndArrowName` / `getStartArrowName`
  (`packages/engine/src/ts/KGAuthor/positionedObjects/graph.ts:88-99`).
- `DragListener` maps `horizontal:` / `vertical:` to a direction and the expression
  `params.X + drag.dx` — `packages/engine/src/ts/controller/listeners/dragListener.ts:33-42`;
  `draggable` and `directions` are declared updatable at `:45`.
- `ClickListener.click()` computes `transitions[current]`, i.e. it indexes the transitions array
  **by the param's current value** — `packages/engine/src/ts/controller/listeners/clickListener.ts`.
  With the default `[1, 0]` and a 0/1 param that toggles, but it is an index table, not a toggle,
  and nothing validates that the current value is a usable index.
- `EconSchema` ships `oldValueLabel` / `newValueLabel` idiom sets (`\ ` vs `^\prime`, `_1` vs `_2`,
  `0` vs `1`) — `packages/engine/src/ts/KGAuthor/econ/schemas/econSchema.ts:28-32`.
- The React hook exposes `updateParams(params)` calling `instance.update({ params })` —
  `packages/react/src/useEquilibria.ts:160-164`; the engine's `update()` walks params and otherwise
  falls through to a generic model update (`packages/engine/src/ts/kg.ts:86-99`).

## Approach

Work in a scratch route in `apps/web` — a page rendering one config at a time from a picker — or in
a standalone HTML file that imports the built engine directly. Either is fine; the point is fast
edit-reload, not integration. Do **not** modify `App.tsx`'s existing config.

Each claim below gets: the config fragment, the observable that decides it, and the consequence if
it fails.

1. **Authored ghost.** Two `Line` objects on one graph — one bound to `params.a`, one pinned to the
   literal starting value, the latter with `lineStyle: 'dashed'` and reduced `strokeOpacity`.
   *Observable:* dragging the live line leaves the dashed one in place, and the dashed one is
   visibly de-emphasised. *If it fails:* P5 is no longer an enhancement but a prerequisite for any
   ghost at all.

2. **Runtime-toggled ghost.** Add `show: 'params.showGhost'` to the dashed line and a boolean-ish
   param. *Observable:* flipping the param hides and shows the ghost without a remount.
   *If it fails:* every ghost becomes a config-shape change, which means a remount, which collides
   with P7's lifecycle work.

3. **Shift arrow.** An `Arrow` whose `begin` is the pinned old point and whose `end` is
   `calcs`-derived and live. *Observable:* the arrowhead tracks the live point as the curve moves,
   and the marker renders in the object's colour. *If it fails:* the ghost figure in the design
   loses its clearest element and needs a different treatment.

4. **Conditional feedback (the quiz predicate).** A calc `correct: 'abs(params.a - 24) <= 0.5'` and
   a label with `show: 'calcs.correct'`. *Observable:* the label appears only inside the tolerance
   band. **Test the failure mode explicitly**: introduce a deliberate typo (`abs(params.aa - 24)`)
   and confirm what happens — per `model.ts:180-188` an unparseable expression is returned as a
   string, and a non-empty string is truthy, so a broken predicate may well render as *always
   correct*. Record exactly what a mistyped predicate does; it decides whether P11 can put grading
   in the schema at all. *If it fails:* Fork 3 stops being a choice and grading must live in the app.

5. **Staged reveal.** Five objects, each with `show: 'params.step >= n'`, and a param stepped 0..5.
   *Observable:* objects appear in order as the param advances, and disappear on the way back.
   Record **how much schema this costs per object**, since that cost is P6's justification.
   *If it fails:* P10 has no fallback and cannot ship before P6.

6. **Constrained drag and freeze-on-commit.** A curve with `horizontal:` drag, plus
   `draggable: 'not(params.submitted)'` and a `ClickListener` flipping `submitted`.
   *Observable:* the curve moves only in x; after the click it stops responding to drags.
   Check specifically whether `draggable` is re-read after mount or captured once — the updatables
   list says it should update, but this is the claim most likely to be wrong in practice. Also
   confirm the `transitions` indexing behaviour noted above with a 0/1 param.
   *If it fails:* P11's commit step needs the app to unmount interactivity, which is uglier.

7. **Scenario presets.** From the host, call `updateParams([{name:'a', value:26}, {name:'c', value:1}])`.
   *Observable:* both change in one render pass, restrictions evaluated once, no flicker.
   Check whether two params changing together transiently violates a restriction that the end state
   satisfies — `updateParam` validates per param (`model.ts:231-262`), so a two-param scenario may
   be rejected halfway. *If it fails:* scenarios need a batched update path, which is new engine
   work nobody has planned.

8. **Write up.** A short findings note — `docs/plans/P0-findings.md` — with one line per claim:
   holds / holds with caveats / does not hold, the evidence, and which plan it affects. Then open
   the affected plans and correct them rather than leaving the contradiction.

9. **Pin what holds.** For each confirmed claim that a plan depends on, add one test to
   `packages/engine/src/__tests__/` asserting the contract at the parse/model level (does `show`
   accept an expression and resolve to a boolean; does a mistyped predicate produce X). These are
   cheap and they stop a refactor quietly removing the foundation of three plans.

## API / schema surface

None. This spike deliberately changes no source. Its output is knowledge, a findings note, and a
handful of tests.

## Tests

- New: `packages/engine/src/__tests__/authoring_contracts.test.ts` — one case per confirmed claim,
  written at the model/parse level rather than against the DOM:
  - `show` given an expression resolves to a boolean and gates the object.
  - An unparseable predicate produces *whatever the spike found* — pin the real behaviour, and if
    it is "truthy string", label the test as documenting a defect rather than a desirable contract.
  - `draggable` bound to an expression changes after a param update.
  - `updateParams` with two params leaves both applied.
- Existing `packages/engine/src/__tests__/snapshot.test.ts` should be checked for whether any of
  these configs would be caught by it; if the spike's configs are useful fixtures, say so in the
  findings rather than adding them speculatively.

## Risks and unknowns

- **The silent-string failure mode (claim 4) is the one to take seriously.** If a typo in a
  predicate reads as `true`, then any schema-side grading is a trap for authors, and the finding
  should propagate into P11 immediately.
- mathjs booleans versus JavaScript truthiness: mathjs may return its own boolean type, and
  `displayElement(show)` takes a boolean. Whether `0`, `false`, `'false'` and `NaN` all behave is
  unverified.
- `draggable` may be read once during interaction-handler setup rather than on each update, despite
  being declared updatable.
- Restriction evaluation during multi-param updates (claim 7) is unverified and could quietly
  reject legitimate scenarios.
- The spike may reveal that a capability is *technically* available but so verbose to author that
  the plan depending on it should not treat it as a fallback. Verbosity findings are as valuable as
  failures here and should be recorded with an honest character count, not glossed.

## Done when

- [x] Seven configs exist and have been run, with the outcome of each recorded.
- [x] `docs/plans/P0-findings.md` states holds / holds-with-caveats / fails for each claim, with
      evidence.
- [x] The specific behaviour of a mistyped predicate is documented, and P11 has been updated to
      match it (Fork 3 settled: the app grades).
- [x] Every plan whose assumptions the spike contradicted has been corrected — P5, P6, P10, P11 and
      the plans README.
- [x] Confirmed claims that other plans depend on are pinned by tests in
      `packages/engine/src/__tests__/authoring_contracts.test.ts` (10 tests).
- [x] No scratch page was created — the spike ran through the existing jsdom harness, so nothing
      could leak into `apps/web`. The three scratch probe files used during the spike are deleted.

## Out of scope

- Any engine or React source change — if the spike finds a defect, it is recorded, not fixed here.
- Designing the step vocabulary (P6), the snapshot semantics (P5), or the quiz UI (P11). This
  spike only establishes what the current engine already does.
- Performance work. Seven toy configs say nothing useful about render cost at scale.

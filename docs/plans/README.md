# Plans

Twelve independent implementation plans, drawn from the layout audit and the study-screen design
discussion. Each is self-contained: goal, reasoning, verified current state with `path:line`
citations, numbered approach, tests, risks, and an explicit out-of-scope section naming which other
plan owns what it excludes.

**None of these is scheduled or committed.** They are drafts to argue with, and several are
deliberately conditional on decisions that have not been made.

## Settle these first

Three forks decide which lane several items belong to. Answer them differently and parts of these
plans reshuffle. **Two are now settled** — Fork 1 by decision, Fork 3 by measurement.

| Fork | Question | Current lean |
| --- | --- | --- |
| 1 | One engine per screen, or one per panel? | ✅ **Settled 2026-08-27 — A**, one engine, host-computed geometry (P3). |
| 2 | Does the author declare geometry, or roles? | **Roles**; existing layouts become presets |
| 3 | Who grades a quiz? | ✅ **Settled by P0 — the app grades.** A mistyped predicate reads as *correct*, silently. |

## The plans

| ID | Title | Lane | Depends on |
| --- | --- | --- | --- |
| [P0](P0-authoring-spike.md) | Authoring spike: prove the free pile ✅ **done** — [findings](P0-findings.md) | cross | — |
| [P1](P1-retire-react-component-surface.md) | Retire the React component surface ⚠️ **code complete**, npm unpublish outstanding | bindings | — |
| [P2](P2-layout-defect-sweep.md) | Layout defect sweep ✅ **done** | engine | — |
| [P3](P3-pass-through-layout.md) | Pass-through layout, and geometry that can move | engine | P2 |
| [P4](P4-density-render-mode.md) | Density render mode | engine | P3 (if one canvas) |
| [P5](P5-interaction-snapshot-and-prev-scope.md) | Interaction snapshot and the `prev` scope | engine | — |
| [P6](P6-object-identity-and-steps.md) | Object identity, names and step ordering | engine | P5 (for derived movement) |
| [P7](P7-stage-composition.md) | Stage composition: focus, rail and promotion | bindings | P1, P3, P4 |
| [P8](P8-narration-strip.md) | The narration strip | app | P6, P5, P7 |
| [P9](P9-instrument-dock.md) | The instrument dock | app | P7, P1 |
| [P10](P10-one-timeline.md) | One timeline: build, reveal, lesson | app | P6, P7, P9 |
| [P11](P11-quiz-attempt-loop.md) | The quiz attempt loop | app | P0, P10, P5 |

Two further plans are outlined inside P5 rather than written separately: **P12 — Refusals that
speak** (restriction rollbacks currently revert silently, which is wrong for a learner) and
**P13 — `ghost:` authoring shorthand**.

## What blocks what

Four chains. Only the first crosses all three lanes.

```
Fork 1  →  P3 pass-through layout  →  P7 stage components  →  focus + rail screen
           P4 density mode         →  P7 panel chrome      →  legible rail
           P5 snapshot + prev      →  ─────────────────────→  remembered ghosts → P11 reveal
           P6 names + direction    →  ─────────────────────→  P8 narration strip
```

P5 and P6 need no binding work at all — they are engine changes that land straight in the product,
which is exactly why they are the easiest to defer indefinitely and the most costly to.

## Reading order

- Starting from nothing: ~~**P0**~~ (done — read [P0-findings](P0-findings.md) instead),
  ~~**P2**~~ (done), ~~**P1**~~ (code done; the npm unpublish and repo archive are the user's to
  run). All three were independent of every fork and none was blocked on a decision.
- Deciding the architecture: **P3** first, since its finding that `Scale`'s `rangeMin`/`rangeMax` are
  constants rather than updatables (`packages/engine/src/ts/view/scale.ts:34-36`) is what makes
  Fork 1 = A cheap.
- Chasing the product: **P8** is the highest-value single component, and **P6** is what unblocks it.

## Three findings that cut across the set

1. **A mistyped expression fails truthily. Confirmed by measurement.** `model.evaluate` returns the
   expression *as a string* when mathjs cannot parse it
   (`packages/engine/src/ts/model/model.ts:180-188`) — deliberately, since colors and label text
   legitimately fail to parse — and a non-empty string is truthy. P0 ran it: a quiz predicate with a
   typo renders as *always correct*, emits **no warning**, and reaches the screen. This settles
   Fork 3. See [P0-findings](P0-findings.md) §4; pinned in
   `packages/engine/src/__tests__/authoring_contracts.test.ts`.

2. **Author-supplied names already survive.** `GraphObject` fills a random name only as a *default*
   via `setDefaults` (`KGAuthor/graphObjects/graphObject.ts:38-40`, `util.ts:1-9`), so stable object
   ids are mostly already available. P6 is smaller than it first appeared.

3. **Multi-param updates are not atomic, and fail silently.** Found by P0 (§7), owned by no plan.
   `kg.update({ params: [...] })` applies params one at a time and validates each alone, so a legal
   destination reached through an illegal interim is rejected halfway and rolled back with no
   diagnostic — leaving a state that is neither the start nor the target. Every scenario, lesson step
   and question setup that moves more than one param is order-dependent today. A batched update that
   validates once at the end is a precondition for P10 and P11.

4. **Panel geometry is one classification away from being animatable.** Positions already compose as
   expressions through `addDefs`; they are frozen only because `Scale` lists `rangeMin`/`rangeMax`
   as constants. Move them to updatables and promotion becomes a param change with no remount.

## Conventions

Every plan follows the same headings: Goal, Why this shape, Current state, Approach,
API / schema surface, Tests, Risks and unknowns, Done when, Out of scope. Claims about current
behaviour cite `path:line`. Where a plan could not verify something, it says so rather than
assuming.

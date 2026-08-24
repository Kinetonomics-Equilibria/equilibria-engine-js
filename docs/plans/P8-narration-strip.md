# P8 — The narration strip

**Lane:** app
**Depends on:** P6 for the middle clause; P5 for snapshot semantics; P7 for the region it sits in
**Unblocks:** the "why?" route into the maths explainer (P9); the verdict surface for P11
**Status:** Draft plan — not implemented

## Goal

One generated line under the stage, always in the same place, reading as a causal chain:

```
a 20.0 → 24.0  →  D shifts right  →  P* 11.0 → 13.0  ·  Q* 9.0 → 11.0        why?   undo
```

It is the answer to "what did I just do, and what does it mean?" — the question the whole product
exists to serve — and it is generated from the config the author already wrote, not from a second
body of prose that has to be kept in sync.

## Why this shape

Dynamic values and changing explanations need *one* home. If the words move — sometimes on the
chart, sometimes in a sidebar, sometimes in a toast — the student spends attention locating them
instead of reading them. A fixed strip is the cheapest possible answer to that.

Writing it as a **chain** rather than a sentence is the design decision that makes it teachable. A
paragraph explains; a chain shows the mechanism, and the mechanism is the thing being learned. It
also degrades gracefully: each clause is independently available, so the strip can ship before all
three exist.

And it is generated. `params` give the cause, `calcs` give the consequences, and P6 gives the middle
clause. No author writes narration copy per diagram — which is what makes it viable across a whole
curriculum rather than a demo.

## Current state

- `apps/web/src/App.tsx` is a single page: an `AppShell`, a `DoubleNavbar`, one diagram config with
  params `a` and `c` and calcs `Qe`, `Pe`. No router, no state management, no content model.
- Param metadata that the strip needs already exists: `name`, `label`, `value`, `min`, `max`,
  `round`, and `precision` derived from `round`
  (`packages/engine/src/ts/model/param.ts:36-70`). **Use `precision` for formatting** — the strip
  showing `13.000000000002` is the obvious first bug.
- Calc values are available through the model; calcs are re-evaluated in a 5-pass loop
  (`packages/engine/src/ts/model/model.ts:99-121`).
- The engine emits `kg:param_changed` and `kg:curve_dragged`; the React hook forwards them as
  `onParamChanged` / `onCurveDragged` (`packages/react/src/useEquilibria.ts:105-125`).
- The middle clause needs a named object and a direction, which **does not exist today** — P6.
- The engine has no memory of previous values; P5 adds it. Until then the app holds its own previous
  state, which is fine and is what the design prototype did.

## Approach

1. **Ship it without the middle clause first.** `a 20.0 → 24.0 · P* 11.0 → 13.0 · Q* 9.0 → 11.0` is
   already worth having: it makes the linkage legible and it is buildable today from events plus
   app-held previous values. Treat the middle clause as an enhancement that arrives with P6, not a
   precondition. This is what keeps the highest-value component from being blocked on the hardest
   engine work.

2. **Hold previous state in the app, not the engine — for now.** Keep the last committed snapshot of
   params and calcs in app state. When P5 lands, switch to the engine's snapshot so the app and the
   diagram's own ghosts agree about what "before" means. **The two must not disagree** — a ghost
   drawn from one before-state and a sentence written from another is worse than either alone.

3. **Solve the strobe problem: narrate on commit, not on change.** A continuous drag fires many
   updates; a line that rewrites at 60Hz is unreadable and, worse, meaningless — "20.0 → 20.1" is
   not a mechanism. Options: debounce (simple, arbitrary), narrate on interaction *end* (matches how
   people think — you did a thing, then you read what happened), or narrate against the last
   *commit boundary* (drag start, scenario apply, step change). **Recommend interaction-end against
   the drag-start snapshot**, which gives "you moved a from 20 to 24" as one event regardless of how
   many frames it took. During the drag, show live values without the arrow form.

4. **Format numbers from `precision`.** Every number in the strip is a param or a calc; params carry
   `precision`, calcs do not. Decide a rule for calcs — probably inherit from the params they
   derive from, or a sensible default of one decimal — and apply it consistently, including in the
   delta chips P7 renders, so the two never show the same quantity differently.

5. **The middle clause, when P6 lands.** Take the structured movement descriptor
   (`{kind, axis, sign}` plus the object's `title`) and compose the phrase in the app: `shift` +
   `x` + `+1` → "shifts right"; `rotate` → "gets steeper"/"flatter". Keep the phrasebook in one
   module. Two objects moving means naming both or naming the driver — decide, and prefer naming
   what the student touched. No visible movement means the clause is *omitted*, not filled with
   something vague.

6. **"Why?" hands off to the maths explainer.** The affordance opens P9's Maths instrument focused
   on the calc named in the final clause, showing that calc's expression with today's values
   substituted. This is the payoff of the reframe: the explainer is the `calcs` string typeset, so
   "why?" costs no new content.

7. **Undo.** Restores the previous snapshot through `updateParams`. Cheap, and it turns the strip
   into a control as well as a readout — which matters for the "what if I do this?" loop, where
   getting back to where you were should not require dragging carefully.

8. **Accessibility, carefully.** This is a live region and it will be announced. `aria-live="polite"`
   on the settled line only — never during a drag, or a screen-reader user is read a hundred
   fragments. Announce the whole chain as one utterance. Give "why?" and "undo" real button
   semantics.

9. **Place it under the stage**, spanning the stage's width, never moving. It sits above the track
   (P10) and beside nothing.

## API / schema surface

App-internal. A narration module with a pure core:

```ts
narrate(before: Snapshot, after: Snapshot, movement?: Movement[]): NarrationLine
```

`NarrationLine` is structured (`cause`, `mechanism?`, `effects[]`, `whyTarget?`), not a string —
so the component renders it, tests assert on it, and a future translation does not require
re-parsing English.

## Tests

- `apps/web/src/__tests__/narrate.test.ts` — pure function.
  - Cause clause formats from `precision`, not raw floats.
  - Effects list every changed calc and omit unchanged ones.
  - No-change produces a rest state, not `20.0 → 20.0`.
  - With a movement descriptor, the phrasebook produces "shifts right" / "gets steeper"; with an
    unknown descriptor it omits the clause rather than inventing one.
  - Two moved objects resolve per the rule chosen in step 5.
- `apps/web/src/__tests__/NarrationStrip.test.tsx` — renders the chain; "why?" fires with the right
  calc name; "undo" calls `updateParams` with the previous snapshot; the live region is polite and
  updates once per commit, not per frame.

## Risks and unknowns

- **The middle clause is the product**, and it depends on the hardest engine work in the programme.
  Step 1 exists so the strip is not hostage to it, but be honest that the version without it is a
  readout, not an explanation.
- Commit-boundary semantics must match P5's snapshot semantics and P7's delta chips exactly. Three
  components with three ideas of "before" is a bug the user experiences as incoherence.
- Calc precision is undefined today and inventing a rule may produce numbers that disagree with what
  the diagram's own labels show.
- Phrasing is economics, and wrong phrasing is worse than none: "shifts right" for a movement along
  the curve rather than of the curve teaches an error. The phrasebook needs review by someone who
  teaches this.
- Undo restoring params does not restore anything else the student changed (a step position, a
  quiz attempt). Scope undo to params explicitly, or it will surprise.

## Done when

- [ ] The strip renders cause and effect clauses from live events, formatted from `precision`.
- [ ] It updates once per interaction, not per frame, and shows live values without arrows during a
      drag.
- [ ] "Why?" opens the maths explainer on the right calc; "undo" restores the previous state.
- [ ] The middle clause appears when P6 lands, and is omitted rather than guessed when movement is
      unknown.
- [ ] The live region announces the settled chain once, as one utterance.

## Out of scope

- The maths explainer itself (P9) and the step track (P10), even though both are one hop away.
- Lesson prompts, which share the region's real estate — P10 decides how they take turns.
- Any narration of *why* in the economic sense. This strip says what moved and what followed; the
  explanation of the mechanism is the lesson's job.

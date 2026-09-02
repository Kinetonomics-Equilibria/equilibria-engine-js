# P10 — One timeline: build, reveal, lesson

**Lane:** app
**Depends on:** P6 (declared step order — **landed**), P7 (the region), P9 (the instrument contract)
**Unblocks:** authored lessons; the pacing answer to cognitive overload
**Status:** Draft, read against the code 2026-09-02 before building — see
[Read against the code](#read-against-the-code-2026-09-02) for what the draft had wrong. The
sections above it are corrected; the record of what changed is at the bottom.

## Goal

One ordered track along the bottom of the study screen, where a step can add an object, reveal a
panel, set params, or say something. Building it once gives step-by-step drawing, staged panel
reveal and lessons — three features from one mechanism — and gives the author control over when a
student meets the fourth panel.

## Why this shape

The three features are the same thing at different scales. Step-by-step drawing is steps within one
diagram; staged reveal is steps that bring panels in; a lesson is the whole track with prompts
attached. Building them separately produces three overlapping controls and three content formats.

It is also the honest answer to cognitive overload, which was the original problem: the fix for four
linked panels at once is not a cleverer grid — the arithmetic says there isn't one — it is that the
**author** decides when the fourth panel arrives, and the student meets it as an event with a
sentence attached rather than as four charts appearing at once.

Free exploration is not a separate mode. It is this track at its final position, with the scrubber
still available.

## Current state

Verified 2026-09-02, after P6, P7, P8 and P9 landed. The draft was written before all four; every
`path:line` below was re-read, and two claims were settled by mounting a diagram rather than by
reading one.

- **P6 landed, and it already owns two of the four step kinds.** `steps` is a config key, carried
  into the parsed data and compiled at `packages/engine/src/ts/view/view.ts:317` by `compileSteps`
  (`packages/engine/src/ts/KGAuthor/parsers/steps.ts:76`). `reveal` rewrites `show` on the objects
  a step names, conjoining rather than replacing whatever the author wrote; `set` is parsed and
  handed back rather than applied; `kg.steps()` returns the declared list
  (`packages/engine/src/ts/kg.ts:195`). The draft's fallback discussion — 24 characters per object,
  hand-written `show`, "not blocked on P6" — describes a world that no longer exists.
- **The `step` param exists and the engine declares it.** `STEP_PARAM = 'step'`
  (`steps.ts:37`), `value: 0`, `min: 0`, `max:` the number of steps, `round: 1`, unless the author
  declares their own. Predicates compile as `params.step >= n` with **n counted from 1**, so the
  param is a count of steps applied, not an index into the list.
- **Advancing a step lights every ghost in the diagram.** Run, not read. `compileSteps` declares the
  step param without `presentation: true`, and `prev.changed` — which gates every ghost an author
  draws — is true when any *non-presentation* param differs from the snapshot
  (`packages/engine/src/ts/model/model.ts:276-283`). Mounting a two-panel diagram with two steps and
  calling `update({ params: [{ name: 'step', value: 1 }] })` takes `prev.changed` from 0 to 1. The
  density param sets the flag for exactly this reason
  (`packages/engine/src/ts/KGAuthor/parsers/density.ts:213-219`); the step param must too.
- **A step cannot reveal a panel, and there is no object called `axes`.** `compileSteps` matches on
  `def.name` or `def.partOf` (`steps.ts:86-87`). A panel's axes are built by `Graph` from `xAxis`
  and `yAxis` and are never named: in a two-panel probe all four axes and all four axis-title labels
  came back as `KGID_…`. Every one of them does carry `xScaleName`, which is how `compileDensity`
  addresses a panel's contents (`density.ts:169`, `:224`).
- **Multi-param updates are still not atomic.** `kg.update` walks the array
  (`packages/engine/src/ts/kg.ts:135-149`); `model.updateParam` validates each param alone and rolls
  back silently on refusal (`model.ts:497-548`). The batched path P0 recommended has not been built.
  The study diagram declares no restrictions, so nothing can trip today.
- **A boundary the engine cannot see has to be declared.** `kg.snapshot()`'s own comment names
  "starting a lesson step" as its third example; P9 shipped the same bug for scenarios and found it
  by looking at the screen (P9 finding 1). `snapshot()` is part of the instrument contract
  (`apps/web/src/dock/types.ts`), called *before* the change.
- **The screen exists and owns the narration.** `apps/web/src/StudyScreen.tsx` holds the engine
  handle, the narrated-param list (`:158`), the `line` state and the `kg:param_changed` handler.
  `NarrationStrip` renders a `NarrationLine` and decides nothing.
- **`Stage` remounts when the panel *set* changes.** Its config memo is keyed on `keys.join(' ')`
  (`packages/react/src/Stage.tsx:201`), and `useEquilibria` remounts on config identity. Everything
  else — promotion, mode, density — moves through params and does not
  (`Stage.tsx:248-262`, `arrangement.ts:284`).
- `apps/web/src/App.tsx` still has no router and no content model. Inline steps remain the only place
  a lesson can live.

## Approach

1. **Extend the step vocabulary; do not redefine it.** `reveal` and `set` are the engine's and stay
   the engine's. The app adds two:
   - `say: "..."` — a sentence for the student.
   - `ask: {...}` — a question (P11 owns what is inside). A step with `ask` stops the track until
     it is resolved.
   They ride on the same step objects, in the same list, and come back through `kg.steps()`, so
   there is one ordered list of steps and not an app list shadowing an engine one.

2. **Let a step reveal a panel.** Fifteen lines in `compileSteps`, matching `compileDensity`: a
   `reveal` entry that names a panel key hides every object whose `xScaleName` belongs to that
   panel — its curves, its axes and its axis titles. Without this a pre-declared panel sits there
   showing an empty labelled frame from the first frame of the lesson, which is not an arrival.
   Warn when one object is revealed by two names at two different steps, since the predicates
   conjoin and the later one silently wins.

3. **Mark the step param as presentation.** Three lines in `compileSteps` and a test. Advancing a
   step is not the student moving something, and `prev.changed` is what every ghost reads.

4. **Steps live inline beside the diagram, and this is a deliberate deferral.** A real content model
   is its own piece of work and does not exist. The step list is shaped so it can be lifted out
   later — it is data, it names objects and panels by key, and nothing in the app reaches into the
   diagram config for anything else.

5. **The app owns the position; the `step` param mirrors it.** One-way, app → engine, and the two
   numbers are the same number: `position` counts steps *applied*, 0 meaning before the first, so
   `params.step = position` with no arithmetic in between. Nothing in the diagram advances it.

6. **Hold `position` and nothing else.** Reveal state is the `step` param; the params a step
   established are the accumulation of `set` over steps 1..p, derived when needed. A second copy of
   either is the plans README's finding 3 waiting to happen. The reducer's only other state is which
   `ask` steps have been resolved.

7. **Scrubbing back reverses reveals and not params.** Reveals reverse for free — the predicate is
   `>=`. `set` does not: a student who has dragged the curve since step 2 keeps their work, and a
   step that needs its authored state offers **"reset to this step"** explicitly, which applies the
   accumulated `set` up to that position. This is a pedagogy decision as much as a technical one and
   is written down where the next person will find it.

8. **A step that moves params snapshots first.** `snapshot()`, then one `update({ params })` with
   the step param and the step's `set` in a single call, reveals first. A step that reveals only
   does not snapshot — there is nothing to be "before".

9. **Free exploration = the track at its end.** No mode switch, no separate screen. At the last
   position everything is revealed and the student is simply using the diagram. The scrubber remains.

10. **Give the track its own row, under the narration strip, and type the markers.** A step that
    reveals a panel looks different from one that asks a question; the ordering is real information.
    Position, back/forward, click-to-jump, all from real buttons so the keyboard comes free.

11. **Arbitrate the strip in the screen, not in the strip.** `NarrationStrip` gains the authored
    sentence as a prop and renders it in place of the generated chain. The rule lives in
    `StudyScreen`, which is the only thing that knows both: **the student's own action always wins,
    and a step's sentence persists until they act.** The sharp edge is that a step's own `set` fires
    `kg:param_changed` for narrated params, so "any param change clears the sentence" clears it in
    the tick it was set — the screen has to know which changes were its own.

12. **The arrangement is a function of how many panels have arrived.** Pre-declaring every panel
    (P7 step 7) keeps the engine off the remount path, but on its own it reserves the absent panels'
    slots from the first frame and floats a promote button over each empty square. So `Stage` takes
    `revealed`, and `toCustomLayout` compiles the arrangement for **every prefix count** as well as
    every focus and mode — one more presentation param, the same trick P3 used for promotion.
    Panels that have not arrived are parked on the focal rect, where nothing draws them because
    everything in them is hidden. Reveal, promotion, mode and resize all stay on the no-remount path.

13. **Do not build the Build instrument.** P9 defined the slot and this plan's own step 8 said to
    decide after the track exists, and not to build two. The track is the control; whether an
    object-scoped version of it belongs in the dock is a question for after it has been used.

## API / schema surface

```yaml
steps:
  - reveal: [demand_market]
    say: "Demand slopes down: at a higher price, less is bought."
  - reveal: [supply_market]
    say: "Supply slopes up: a higher price is worth producing more at."
  - reveal: [equilibrium_market]
  - reveal: [surplus]                 # a panel key: its curves, axes and titles
    say: "Now the same market again, shaded."
  - set: { a: 26 }
    say: "Incomes rise. Watch both panels."
```

App state:

```ts
interface TrackState {
    /** Steps applied. 0 is before the first; `steps.length` is the end. */
    position: number;
    /** Indices of `ask` steps that have been answered. P11 fills in what that means. */
    resolved: number[];
}
```

Everything else is derived: `revealedAt(steps, position)`, `paramsAt(steps, position)`,
`blockedAt(state, steps)`.

## Tests

- `apps/web/src/__tests__/track.test.ts` — pure reducer.
  - Advancing accumulates reveals; going back removes only reveals added at or after that step.
  - Going back does **not** revert param changes, and "reset to this step" does.
  - A step with `ask` blocks advance until resolved; back is never blocked.
  - Jumping to the end matches sequential advance to the same position.
- `apps/web/src/__tests__/Track.test.tsx` — typed markers; back/forward and click-to-jump; keyboard
  operable; the current position is announced.
- `apps/web/src/__tests__/narration-arbitration.test.tsx` — a step's sentence shows; a student action
  replaces it; a subsequent step replaces it again; and the step's *own* param change does not.
- `packages/engine/src/__tests__/steps.test.ts` — a panel key reveals the panel's axes and titles;
  the step param is presentation, so `prev.changed` stays 0 across an advance.
- `packages/react/src/__tests__/arrangement.test.ts` — the compiled layout agrees with `arrange` at
  every revealed count as well as every focus and mode.

## Risks and unknowns

- **No content model exists.** Inline steps are a deliberate stopgap and will need migrating.
- Scrub-back semantics (step 7) will feel wrong to somebody whichever way it goes. It needs trying
  with a real student, not settling by argument.
- Nothing prevents an author writing a `ClickListener` that changes `step` from inside the diagram,
  at which point the app's position and the param disagree silently.
- **A multi-param `set` is still order-dependent.** The engine owes a batched update that validates
  once at the end (README finding 4). Until then a lesson step moving several params can be refused
  halfway with no diagnostic. Nothing in the study diagram can trip it, and that is luck, not design.
- Revealed panels must arrive in declared order, because the compiled arrangement is indexed by a
  count. A lesson that wants the third panel before the second has to declare them that way.
- The compiled rect expressions grow by the number of prefix counts. They are evaluated on every
  param change, which is the drag path.

## Done when

- [ ] Four step kinds are implemented, with the reducer tested including reverse behaviour.
- [ ] The track renders with typed markers and is keyboard operable.
- [ ] A revealed panel arrives without a remount, and the arrangement reflows as it does.
- [ ] Narration arbitration works and lives in one place.
- [ ] Free exploration is demonstrably "the track at its end", not a separate mode.
- [ ] One real authored lesson exists end to end, as the proof.

## Out of scope

- Questions and grading — `ask` is a slot here; P11 owns its contents.
- The content model, authoring UI, progress persistence and multi-lesson navigation.
- The batched param update. It is a precondition the engine owes and this plan works around rather
  than resolving; naming it here is not the same as fixing it.

## Read against the code (2026-09-02)

Ten corrections before a line was written. Eight are the failure mode P9's read named: **a plan
written before its dependencies landed describes a tree that no longer exists.** Two needed running
rather than reading, and both were in the engine.

1. **P6 landed, and already owns half the vocabulary.** The draft proposed defining `reveal` and
   `set` app-side and treated P6 as optional. Both exist in the config schema, compile to `show`
   predicates, and come back through `kg.steps()`. Defining them again would have produced a second
   step format shadowing the first. The app adds `say` and `ask` to the *same* objects.

2. **The draft's step numbering was off by one.** `TrackState.position` was "index into steps";
   compiled predicates are `params.step >= n` with n from 1, and the declared param starts at 0. So
   the position is a count of steps applied, and it equals the param exactly — which also removes
   the "mirror it into the engine" arithmetic the draft's step 3 assumed.

3. **`revealed: Set<string>` and `authoredParams` were second copies of derivable state.** What is
   revealed *is* the `step` param — the entire point of compiling reveals into `show`. The params a
   step established are the accumulation of `set` over 1..p. Storing either is finding 3 in the
   plans README, and the draft's `authoredParams` was additionally wrong for its own purpose: to
   reset *to* a step you need every `set` up to it, not the last one.

4. **Advancing a step lights every ghost in the diagram.** Found by mounting one. `compileSteps`
   declares the step param without `presentation: true`, and `prev.changed` counts every
   non-presentation param that differs from the snapshot. So a step that reveals a curve also draws
   the dashed ghost of a curve nobody moved, plus its shift arrow. The density work hit the same
   wall and set the flag; steps did not, because nothing had yet advanced a step on a diagram with
   ghosts in it. Three lines.

5. **A step cannot reveal a panel, and there is no object called `axes`.** Both the draft's YAML
   (`reveal: [firmPanel]`, `reveal: [axes]`) and the schema doc's example say otherwise. Reveal
   matches names, and a panel's axes and axis titles are built by `Graph` with generated ones — a
   probe returned `KGID_…` for all eight in a two-panel diagram. Pre-declaring a panel therefore
   left a bare labelled frame on screen from the first frame, which is the opposite of the effect
   this plan exists to produce. Fixed the way density already addresses a panel: by `xScaleName`.

6. **"Without a remount" needed more than P7's pre-declare.** Pre-declaring is necessary — `Stage`'s
   config memo is keyed on the panel key list, so changing the set rebuilds the engine — and it is
   not sufficient. Alone it reserves the absent panels' slots from the start and leaves a promote
   button floating over each empty square. The arrangement has to reflow, which means compiling it
   over the revealed count as well as focus and mode. That is bindings-lane work this plan did not
   budget for, and it is what makes a reveal read as an arrival.

7. **The batched param update is a precondition the draft assumed and does not exist.** "Argues for
   the batched update path P0 recommends" reads as though it were queued. It is not built, it is
   engine-lane, and this plan ships around it: one `update` call, order preserved, and the exposure
   stated rather than implied away.

8. **The draft never mentions `snapshot()`.** It is the exact bug P9 shipped and found by looking at
   the screen: the diagram moves, every ghost appears, and the sentence underneath says nothing
   happened. `kg.snapshot()`'s comment names "starting a lesson step" by name. A step that sets
   params calls it first; a step that only reveals does not.

9. **Narration arbitration cannot live in `NarrationStrip`.** "Both live in one component" is right
   about the principle and wrong about the component: the strip renders a line and decides nothing,
   while `StudyScreen` owns the line, the engine handle and the change events. The strip gains a
   prop. The screen gains the rule — and the edge the draft could not have seen, that a step's own
   `set` fires the very event that would clear the step's sentence.

10. **The Build instrument is not this plan's to build.** The draft's step 8 says so itself and is
    worth honouring rather than quietly reinterpreting: the track is the control, and whether an
    object-scoped version belongs in the dock is a question for after somebody has used one.

What survived untouched: the reveal/param asymmetry on scrub-back (step 7), free exploration as the
track's last position, `ask` as a slot P11 fills, and the judgement that inline steps are a
deliberate stopgap rather than a design.

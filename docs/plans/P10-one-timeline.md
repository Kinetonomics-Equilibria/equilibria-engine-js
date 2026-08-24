# P10 — One timeline: build, reveal, lesson

**Lane:** app
**Depends on:** P6 (declared step order), P7 (the region), P9 (the instrument slot)
**Unblocks:** authored lessons; the pacing answer to cognitive overload
**Status:** Draft plan — not implemented

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

- **The mechanism already exists per object.** `show` is updatable
  (`packages/engine/src/ts/view/viewObjects/viewObject.ts:129`), so `show: 'params.step >= 3'`
  gives a build-up today, hand-written on each object. P0 measures how verbose that is; P6 makes it
  declarable once per diagram and compiles down to the same thing.
- `apps/web/src/App.tsx` has no router, no state management and no content model — there is nowhere
  for a lesson to live yet, which is this plan's biggest unstated dependency.
- Params are the only state the engine holds; a step position is therefore either a param (visible
  to expressions, which is what makes `show: 'params.step >= n'` work) or app state (invisible to the
  diagram). It probably has to be **both**: a param the engine can read, driven by app state that
  knows about prompts and progress.
- `updateParams` applies param changes from the app (`packages/react/src/useEquilibria.ts:160-164`).
- The narration strip (P8) occupies the region directly above the track and both want to speak when
  something changes — they must take turns rather than compete.

## Approach

1. **Define the step vocabulary, small.** Four kinds, no more until something demands a fifth:
   - `reveal: [objectName | panelKey]` — show things that were hidden.
   - `set: { param: value }` — move the diagram to a state.
   - `say: "..."` — a sentence for the student.
   - `ask: {...}` — a question (P11 owns what is inside).
   A step may combine `reveal`, `set` and `say`; `ask` stops the track until answered.

2. **Decide where steps live, and accept that this is a content-model decision.** Options: inline
   beside the diagram config (simple, couples a lesson to one diagram), or a separate lesson
   document referencing a diagram by id (allows several lessons over one diagram, needs a content
   model that does not exist). **Recommend inline to start**, with the step list shaped so it can be
   lifted out later — but say plainly in the plan that a real content model is coming and that this
   is a deliberate deferral, not an oversight.

3. **Drive the diagram through a `step` param.** The app owns the authoritative position; a
   `step` param mirrors it into the engine so P6's compiled `show` expressions work. One-way: app →
   engine. Nothing in the diagram advances the step except through the app, or the two disagree.

4. **Scrubbing back is the hard part.** `reveal` and `say` are trivially reversible. `set` is not:
   if a student has since dragged the curve themselves, scrubbing back to step 2 must decide whether
   to restore the authored values and discard their exploration, or leave their values and only
   reverse the reveals. **Recommend: reveals reverse, param changes do not** — the student's own
   work is never destroyed by navigation, and a step that needs its authored state offers "reset to
   this step" explicitly. This is a pedagogy decision as much as a technical one; write down the
   reasoning where the next person will find it.

5. **Free exploration = the track at its end.** No mode switch, no separate screen. When the track
   is at its last step everything is revealed and the student is simply using the diagram. The
   scrubber remains, so "how did we get here" is always one drag away.

6. **Give the track its own row, and make the step kinds legible in it.** A step that reveals a
   panel should look different from a step that asks a question — the design sketch used a single
   line with typed markers, which is right because the ordering is real information. Position,
   back/forward, and click-to-jump.

7. **Take turns with the narration strip.** When a step fires a `say`, the strip shows the step's
   sentence; when the student changes something themselves, it shows the generated chain. Rule:
   the student's own action always wins the strip, and a step's sentence persists until the student
   does something. Both live in one component so the arbitration is in one place, not two.

8. **Register Build as an instrument (P9's contract).** Inside the diagram, "build" is the same
   track scoped to objects rather than panels — same control, different granularity. Whether it
   deserves a separate instrument or is just the track in a different mode is worth deciding after
   the track exists; do not build two.

## API / schema surface

```yaml
steps:
  - reveal: [axes]
    say: "Start with price on the vertical axis and quantity on the horizontal."
  - reveal: [demand]
    say: "Demand slopes down: at a higher price, less is bought."
  - reveal: [supply]
  - reveal: [firmPanel]
    say: "Now bring in a single firm, which takes the market price as given."
  - set: { a: 26 }
    say: "Incomes rise. Watch both panels."
```

App state:

```ts
interface TrackState {
  position: number;         // index into steps
  revealed: Set<string>;    // object and panel names currently shown
  authoredParams: Record<string, number>;  // what steps set, for "reset to this step"
}
```

## Tests

- `apps/web/src/__tests__/track.test.ts` — pure reducer.
  - Advancing accumulates reveals; going back removes only reveals added at or after that step.
  - Going back does **not** revert param changes the student made (the step 4 decision), and
    "reset to this step" does.
  - A step with `ask` blocks advance until resolved.
  - Jumping to the end reveals everything, matching sequential advance to the same position.
- `apps/web/src/__tests__/Track.test.tsx` — renders typed markers; back/forward and click-to-jump;
  keyboard operable; `prefers-reduced-motion` respected on transitions.
- `apps/web/src/__tests__/narration-arbitration.test.tsx` — a step's sentence shows; a student
  action replaces it; a subsequent step replaces it again.

## Risks and unknowns

- **No content model exists.** Inline steps are a deliberate stopgap and will need migrating. The
  longer the deferral, the more diagrams carry inline lessons that have to be lifted later.
- Scrub-back semantics (step 4) will feel wrong to somebody whichever way it goes. It needs trying
  with a real student, not settling by argument.
- The `step` param is app-driven, but nothing prevents an author writing a `ClickListener` that
  changes it from inside the diagram, at which point the two states diverge silently. Consider
  reserving the name.
- Before P6 lands, every revealed object needs a hand-written `show` expression, so authored lessons
  are expensive to write. That is an argument for sequencing P6 first, or for accepting that early
  lessons are demos.
- The track competes with the narration strip for both screen space and attention. Step 7's rule is
  a guess and should be revisited once both are real.
- A lesson that sets params and a student who has dragged the curve can produce a state no author
  ever previewed. That is inherent to the design and is fine, but the reveal/quiz plans should not
  assume authored states.

## Done when

- [ ] Four step kinds are implemented, with the reducer tested including reverse behaviour.
- [ ] The track renders with typed markers and is keyboard operable.
- [ ] A revealed panel arrives without a remount (per P7's pre-declare recommendation).
- [ ] Narration arbitration works and lives in one place.
- [ ] Free exploration is demonstrably "the track at its end", not a separate mode.
- [ ] One real authored lesson exists end to end, as the proof.

## Out of scope

- Questions and grading — `ask` is a slot here; P11 owns its contents.
- The content model, authoring UI, progress persistence and multi-lesson navigation. Each is real
  work and none is this plan.
- Engine-side step compilation (P6). This plan consumes it and degrades to hand-written `show`
  expressions without it.

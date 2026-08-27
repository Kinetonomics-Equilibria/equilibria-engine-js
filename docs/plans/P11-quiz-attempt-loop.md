# P11 — The quiz attempt loop

**Lane:** app
**Depends on:** P0 (the predicate failure mode), P10 (`ask` steps), P5 (the reveal ghost), P7/P8
**Unblocks:** assessment that uses the diagram rather than multiple choice about it
**Status:** Draft plan — not implemented

## Goal

A question the student answers by moving the diagram: prompt, attempt, verdict, reveal. The app
grades the end state and then shows the correct position beside the student's answer, so a wrong
answer is still a diagram of the mechanism rather than a red cross.

## Why this shape

The product's premise is that economics is learned by manipulating the diagram, so assessment should
use the same channel. "Drag demand to where it goes when income rises" tests the thing being taught;
a multiple-choice question about it tests recall of a sentence.

Two design decisions carry most of the value:

**No visible target while dragging.** With a target zone on screen the task stops being economics
and becomes aiming — the student solves it by looking, not by reasoning. Show nothing, take the
commit, then reveal.

**Direction before magnitude.** "Which way does D move, and why" needs no tolerance, is robust to
units, and is what is actually being taught. Magnitude is a second, harder question that only makes
sense once direction is secure — and it is the one that needs the target/tolerance machinery, with
all its traps.

## Current state

- **Verdicts are expressible as calcs today.** Expressions run through mathjs
  (`packages/engine/src/ts/model/model.ts:143-190`), so `correct: 'abs(params.a - 24) <= 0.5'` is an
  ordinary calc and any object can appear on it via `show`.
- **A mistyped predicate fails silently and truthily. Measured, not supposed.** P0 ran it: a calc
  `abs(params.aa - 24) <= 0.5` (with `aa` undefined) settles to the **string** `"abs(params.aa - 24)
  <= 0.5"`, which is truthy; **no warning is emitted**; and a `Label` gated on `show: 'calcs.correct'`
  **renders for a wrong answer**. A well-formed predicate does resolve to a genuine JavaScript
  `boolean`, so the happy path is clean — the trap is exclusively in the typo. `reportUnresolvedCalcs`
  does not catch it, because it looks for an interpolated `undefined` token and a whole unparseable
  expression contains none. Evidence and the pinned test: `docs/plans/P0-findings.md` §4,
  `packages/engine/src/__tests__/authoring_contracts.test.ts`. **This settles Fork 3: the app grades.**
- **Drag can be locked to one axis**: `horizontal:` / `vertical:` on a drag listener generates
  `params.X + drag.dx` (`packages/engine/src/ts/controller/listeners/dragListener.ts:33-42`) — which
  is what keeps "shift the curve" from becoming "rotate the curve", and therefore what makes a
  direction question answerable at all.
- **A curve can freeze on commit**: `draggable` is updatable (`:45`), and `ClickListener` cycles a
  param through `transitions` (`packages/engine/src/ts/controller/listeners/clickListener.ts`).
  Note that `click()` indexes `transitions` **by the param's current value**, so it is a cycle table,
  not a toggle — fine for 0/1, undefined for anything else.
- **`round` snaps param values** (`packages/engine/src/ts/model/param.ts:74-90`), so a tolerance
  tighter than the rounding interval creates a target that cannot be hit.
- The engine has **no memory**, so "the position before the attempt" is either an authored constant
  or app-held state until P5 lands.
- Events (`kg:param_changed`, `kg:curve_dragged`) reach the app through the hook, which is the
  grading input under Fork 3.
- **Loading a question's initial state is not atomic, and can land wrong.** P0 §7: `kg.update({params})`
  applies params one at a time and validates each alone, so a legal starting state reached through an
  illegal interim is rejected halfway and rolled back **silently** — leaving a state that is neither
  the old one nor the requested one. Any question whose setup moves more than one param is
  order-dependent today. Either order the params by hand and pin the order in a test, or wait for the
  batched update path P0 recommends.

## Approach

1. **~~Wait for P0's finding~~ — settled. Grading lives in the app.** P0 confirmed a typo reads as
   `true`, silently, all the way to the screen. Schema-side grading is therefore a trap for authors
   and this plan does not use it. Two consequences that were not obvious before the measurement:
   the same trap catches **any** `show:` expression, not just a verdict, so it is worth its own small
   engine change (let a calc be declared boolean and warn when it settles to a string) independently
   of who grades; and because a *well-formed* predicate does return a real boolean, the fix is a type
   assertion at the boundary, not a rewrite of `evaluate`.

2. **Grade in the app; let the schema declare only the target.** A question names a param, a
   direction, and optionally a target and tolerance. The app listens for the commit, compares, and
   renders the verdict in the narration strip's region (P8), where attempts, hints and scoring can
   live. The diagram keeps only what must be *drawn*: the ghost of the start position and the reveal.

3. **Implement the four states as an explicit machine**, because each has different affordances:
   - **prompt** — question visible, curve draggable, no target shown, ghost holds the start.
   - **attempt** — student drags; live values only, no verdict, no hint.
   - **verdict** — commit freezes the curve (`draggable` bound to a `submitted` param), the app
     grades, the strip says what was right and what was not.
   - **reveal** — the correct position appears alongside their answer.
   `ask` steps in P10 enter this machine and block track advance until it resolves.

4. **Direction marking first.** Compare the committed param against its start: sign of change, and
   whether it moved at all. No tolerance, no rounding trap, and the feedback is legible —
   "right direction, too small a shift" is a useful thing to be told and needs both a direction check
   and a magnitude check that are reported separately.

5. **Magnitude marking second, with the rounding trap handled.** Tolerance must be at least the
   param's `round` interval; validate this when a question is authored and fail loudly in dev rather
   than shipping an unhittable question. Consider expressing tolerance in *round units* rather than
   raw values, so the trap is impossible to write.

6. **The reveal.** Before P5: the correct position is an authored constant, drawn as a third curve
   shown on a `revealed` param. After P5: the student's own start can be the ghost and the reveal
   sits beside their answer, which is the version that teaches. Both are the same drawing; only the
   source of the "before" changes.

7. **Attempts, hints and scoring live in the app**, because the engine has nowhere to keep them and
   should not grow one. Decide the retry policy deliberately: unlimited retries with the reveal
   withheld until the student gives up teaches more than one-shot marking, but needs a "show me"
   affordance so nobody is stuck.

8. **Keyboard path.** A drag-to-answer question is unusable without one. The param is a number with
   `min`, `max` and `round`, so an accessible answer control is a slider — arrow keys to adjust,
   Enter to commit. This is not a lesser fallback; it may be the better interaction for magnitude
   questions, and it costs almost nothing given P9's Explore instrument already renders exactly that
   control.

9. **What a wrong answer looks like.** The strip names the direction and the magnitude separately;
   the diagram shows their curve, the ghost of the start and the correct position. No red crosses, no
   score in the moment of the mistake. The wrongness is legible as geometry, which is the whole point
   of assessing in the diagram.

## API / schema surface

```yaml
steps:
  - say: "Income rises. Move demand to where it belongs."
    ask:
      param: a
      direction: up          # required; the first-class question
      target: 24             # optional; magnitude marking
      tolerance: 2           # optional; validated against param.round
      reveal: correct        # what to draw after the verdict
```

App state:

```ts
interface Attempt {
  questionId: string;
  startValue: number;
  committedValue?: number;
  directionCorrect?: boolean;
  magnitudeCorrect?: boolean;
  attempts: number;
  revealed: boolean;
}
```

## Tests

- `apps/web/src/__tests__/grade.test.ts` — pure grading.
  - Direction: correct, wrong, and *no movement* (which is wrong but needs its own message).
  - Magnitude: inside tolerance, outside, and exactly on the boundary.
  - A tolerance smaller than the param's `round` interval is rejected at authoring time.
  - Direction and magnitude are reported independently so "right way, not far enough" is possible.
- `apps/web/src/__tests__/attempt-machine.test.ts` — state transitions; commit freezes dragging;
  retry returns to attempt without discarding the recorded first answer; reveal is reachable from
  verdict only.
- `apps/web/src/__tests__/quiz-a11y.test.tsx` — the slider answer path adjusts and commits by
  keyboard; the verdict is announced once; focus is not stolen mid-attempt.
- `packages/engine/src/__tests__/authoring_contracts.test.ts` — **already written by P0.** It pins the
  mistyped-predicate behaviour (labelled as documenting a defect), the drag-freeze contract this plan's
  commit step relies on, and the non-atomic multi-param update. Extend rather than duplicate.

## Risks and unknowns

- ~~**The silent-string predicate.**~~ Resolved by measurement — see Current state. The residual risk
  is that an author writes a `show:` expression anywhere else in the product and hits the same trap;
  that is not this plan's to fix, but it is this plan's to have found.
- ~~Freeze-on-commit depends on `draggable` being re-read after mount.~~ Verified — P0 §6 measured
  `draggable: 'not(params.submitted)'` going true → false → true across updates with no remount. This
  was flagged as the claim most likely to be wrong in practice; it is correct.
- **Question setup is order-dependent** while multi-param updates stay non-atomic (P0 §7). A question
  that positions two params can silently start in the wrong state.
- Direction is ambiguous for a curve that moves both ways at once, and "up" versus "right" for a
  demand shift are the same event described two ways. The question vocabulary must match the
  convention taught, and that is a subject-matter decision, not a technical one.
- Retry policy changes what is being measured. Unlimited retries with a reveal at the end measures
  persistence; one shot measures recall. Decide what the product is for.
- Attempt data is the first thing in the app that looks like it needs persistence. That drags in the
  content/progress model deferred by P10.
- A student who drags, explores elsewhere, then returns and commits has an "answer" whose start
  point may no longer mean anything. Snapshot the start at prompt time, not at first drag.

## Done when

- [x] P0's predicate finding is recorded (`docs/plans/P0-findings.md` §4) and the grading
      architecture reflects it: the app grades, the schema declares only the target.
- [ ] Direction questions work end to end: prompt, drag, commit, verdict, reveal.
- [ ] No target is visible during the attempt.
- [ ] Magnitude questions validate tolerance against `round` and fail loudly when unhittable.
- [ ] The keyboard answer path is equal in capability to dragging.
- [ ] A wrong answer leaves a diagram that shows the mechanism, with direction and magnitude
      reported separately.

## Out of scope

- Scoring models, gradebooks, and anything that reports to a teacher.
- Question types that are not "move this thing" — multiple choice, numeric entry, free text.
- The engine growing any notion of a question. Fork 3's lean is that it must not.

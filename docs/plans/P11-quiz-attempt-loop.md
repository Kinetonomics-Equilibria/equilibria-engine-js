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
- **But a mistyped predicate fails silently and truthily.** `model.evaluate` returns the expression
  *as a string* when mathjs cannot parse it (`:180-188`) — deliberately, since colors and label text
  legitimately fail — and a non-empty string is truthy. So `abs(params.aa - 24) <= 0.5` may render as
  *always correct*. **P0 step 4 measures exactly what happens; this plan must not be built until it
  has.** This single behaviour is the strongest argument for Fork 3's "app grades" lean.
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

## Approach

1. **Wait for P0's finding on the silent-string predicate, and let it decide the architecture.** If a
   typo reads as `true`, schema-side grading is a trap for authors and grading belongs entirely in
   the app. That is already the lean; P0 turns it into a decision with evidence.

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
- `packages/engine/src/__tests__/` — if any predicate *is* left in the schema after step 1, a test
  pinning what a mistyped predicate does, referencing P0's finding.

## Risks and unknowns

- **The silent-string predicate.** Until P0 reports, the safety of any schema-side verdict is
  unknown. Build nothing on it before then.
- Freeze-on-commit depends on `draggable` being re-read after mount. Declared updatable, unverified
  in practice — P0 step 6.
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

- [ ] P0's predicate finding is recorded and the grading architecture reflects it.
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

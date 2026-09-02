# P11 — The quiz attempt loop

**Lane:** app
**Depends on:** P0 (the predicate failure mode), P10 (`ask` steps), P5 (the reveal ghost), P7/P8
**Unblocks:** assessment that uses the diagram rather than multiple choice about it
**Status:** ✅ **Done** (2026-09-02). Read against the code before building — see
[Read against the code](#read-against-the-code-2026-09-02) for what the draft had wrong, and
[Findings](#findings) for what building it turned up.

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
- [x] Direction questions work end to end: prompt, drag, commit, verdict, reveal — in the shipped
      lesson (`apps/web/src/studyDiagram.ts`, step 8), asserted in jsdom against a real engine
      (`quiz-loop.test.tsx`) and in a browser by dragging the curve itself (`app.spec.ts`).
- [x] No target is visible during the attempt. Asserted by counting drawn curves either side of the
      commit, not by reading a flag.
- [x] Magnitude questions are validated, and by a stricter rule than the plan's: whether *some
      achievable value* lies within tolerance of the target. Failures are loud in dev, per question,
      when the question is armed.
- [x] The keyboard answer path is equal in capability to dragging — the slider writes the same param
      the drag writes. Building it found that the dock's sliders had had the gesture contract
      backwards for the keyboard since P9.
- [x] A wrong answer leaves the diagram showing the mechanism — their curve, the ghost of the start,
      and the correct position — with direction and magnitude in separate clauses
      (`apps/web/screenshots/p11-question.png`).

## Out of scope

- Scoring models, gradebooks, and anything that reports to a teacher.
- Question types that are not "move this thing" — multiple choice, numeric entry, free text.
- The engine growing any notion of a question. Fork 3's lean is that it must not.

## Read against the code (2026-09-02)

Ten corrections before a line was written. The first needed *running* rather than reading, and it
invalidates the plan's central claim about the commit step — which P0 had checked, and checked the
wrong way.

1. **`draggable` was dead, so freeze-on-commit was not authorable.** P0 §6 measured the *property* —
   `dl.draggable` going true → false → true across updates — and concluded "P11's commit step needs
   no app-side unmounting". Nothing read it. `Listener.onChange` moved the param unconditionally
   (`packages/engine/src/ts/controller/listeners/listener.ts:36`), and the interaction handler set
   `pointer-events` from `directions` alone. A curve bound to `not(params.submitted)` went on
   dragging after commit, with a field on a listener recording that it should not have. Measured by
   calling what the d3 `drag` handler calls: `a` moved 20 → 23 with `draggable` false.

   This is the plans README's finding 6 landing on the one claim P0 flagged as *most likely to be
   wrong in practice* — and P0 then verified it by asserting the shape rather than the effect, which
   is the exact habit NOTES.md was written to break. Fixed in the engine:
   `DragListener.onChange` refuses when not draggable, and a listener that is not draggable
   contributes no direction, so the object leaves the pointer path and stops showing a resize cursor.
   Both halves pinned in `authoring_contracts.test.ts` by asserting the param, not the field.

   Found alongside, and the reason the second half could never have worked: the handler's
   pointer-events recompute was gated on `ih.hasChanged`, which is the *handler's* own updatables,
   while `dragListeners` is registered as a **constant**
   (`packages/engine/src/ts/controller/interactionHandler.ts:62`). A listener whose `draggable` had
   just changed never reached the code that would have acted on it. It now compares the answer it
   would write against the answer it last wrote, which keeps the d3 calls off the drag path without
   missing the change.

   And a trap next door for anyone who puts `draggable` on the object instead of on the listener:
   `makeDraggable` only builds a drag from the shorthand when the value is literally `true` or
   `'true'` (`KGAuthor/parsers/parsingFunctions.ts:186-198`), so an *expression* there silently
   produces no drag at all rather than a conditional one.

2. **The plan's tolerance rule is both too strict and too lenient.** "Tolerance must be at least the
   param's `round` interval" fails in both directions: a target that sits on the rounding grid is
   hittable with no tolerance at all, and a target outside the param's `min`/`max` satisfies the rule
   and is still unreachable. The exact question is whether *some achievable value* lies within
   tolerance of the target, and the achievable values are `Math.round(v / round) * round` clamped to
   `[min, max]` — `Param.update` clamps *before* rounding (`model/param.ts:153-163`), so the two ends
   are exactly `min` and `max` whatever the grid says. P11 validates that, which subsumes the round
   check and catches the out-of-range case the plan's rule waves through.

3. **The prompt cannot live in the narration strip.** P10's arbitration rule is that the student's
   own action always wins, so the instant they drag to answer, the step's sentence is cleared — and
   the question vanishes from the screen while they are answering it. The prompt therefore lives in
   the question row and the strip goes on doing its job, which during an attempt is narrating the
   attempt. The plan's "render the verdict in the narration strip's region (P8)" survives as
   *region*, not as *component*: the strip is one line that must not grow, and a verdict is two
   clauses and up to three controls.

4. **The reveal needs an apparatus per askable param, not "a third curve".** "The correct position is
   an authored constant, drawn as a third curve shown on a `revealed` param" is right for a diagram
   with one askable param and quietly wrong for two, because the curve is bound to a *particular*
   param's geometry. The diagram declares the apparatus and the app maps asked param → apparatus, so
   a question about a param with no apparatus draws nothing and says so in dev rather than drawing
   the wrong curve.

5. **The start ghost cannot be `prev`.** Step 6 says "the student's own start can be the ghost", and
   P5's snapshot is per *gesture*: a second drag re-snapshots, so `prev` becomes the start of that
   drag while the graded start stays where the question began. The drawn "before" and the graded
   "before" would be two different numbers, which is the failure this whole strip and ghost
   apparatus exists to prevent. The question's start is its own presentation param, written once when
   the question is armed, so the ghost and the grade read the same number by construction.

6. **A frozen curve is only half a freeze.** `draggable` stops the diagram's own drag and says
   nothing about a host control. P9's Explore instrument writes the same param through
   `updateParams`, so a committed answer could still be moved with a slider — and P11's step 8 makes
   that slider the *equal* answer path, so this is not a corner. The screen guards the one place
   every host param write goes through.

7. **The plan's `Attempt` records the reveal twice.** It specifies a four-state machine *and* a
   `revealed: boolean`, which are the same fact (`phase === 'reveal'`). That is the plans README's
   finding 3 in miniature — a value already held, kept a second time, free to disagree. One phase
   field, and direction and magnitude hang off the grade rather than off the attempt.

8. **An `ask` step's `say` is the prompt.** The plan's YAML already writes it that way, and P10
   routes every `say` to the strip, so without a rule the two collide (see 3). The screen routes an
   ask step's sentence to the question row and passes the strip nothing.

9. **Attempt data is not persisted, and the plan half-assumes it is.** `TrackState.resolved` is what
   survives navigation; the attempt itself is discarded when the student leaves the step, so a
   question they come back to is asked again and the track stays unblocked. The plan's own risk list
   says attempt data is the first thing in the app that looks like it needs persistence, and that is
   still true and still deferred. What is *not* deferred is the trap it names: the start is
   snapshotted when the question is armed, never at first drag.

10. **"Up" needed defining, and "did not move" needed a tolerance.** The plan names the ambiguity
    (up versus right for a demand shift) and leaves the vocabulary open. `up`/`down` are defined as
    the **param's value** rising or falling — the author's prose is where the taught convention
    lives. And "did not move" is `|committed − start| < round / 2`, not equality: the param lives on
    a rounding grid and exact-zero is a claim about floating point rather than about the student.

What survived untouched: grading in the app (Fork 3, settled by P0 and unchanged by any of this),
direction before magnitude, no visible target during the attempt, the slider as an equal answer path
rather than a fallback, and the judgement that a wrong answer should leave a diagram rather than a
cross.

## Findings

Seven. Three came from the running app rather than from the suite, which is now four plans in a row —
and the largest of the three was found by taking a screenshot to admire the finished feature.

1. **`draggable` was read by nothing, so the plan's commit step did not exist.** Found in the
   pre-build read and written up there; repeated here because it is the finding, not a correction.
   P0 had checked this exact claim — flagging it as the one most likely to be wrong in practice —
   and checked it by asserting that the *field* changed. The field changed. The curve went on
   dragging. **A property that reports the right value and is read by nobody passes every test that
   asks it what it says and fails the one that asks what it does.**

2. **The dock's sliders had the gesture contract backwards for the keyboard, and had since P9.**
   Mantine's `Slider` handles keys in `onKeyDownCapture` attached to its own root *after* `...others`,
   and calls `onChange` **and** `onChangeEnd` synchronously inside that one handler. So a
   bubble-phase `onKeyDown` prop — the obvious reading of the API, and what P9 wrote — runs after the
   value has already moved. `Model.beginGesture` snapshots the instant it is called, so the "before"
   it captured was the after: `prev` equalled the current value, every ghost hid itself, the strip
   read *"Drag a curve to see what it changes"* about a curve that had just moved, and the gesture
   was left open so it stayed that way for everything afterwards.

   Nothing caught it because nothing had needed a keyboard to *move* anything: P9's browser test
   scrubs with the mouse, where `mousedown` legitimately precedes the change. P11 needed the keyboard
   to be a first-class answer path, and the first keyboard answer narrated nothing.

   The fix is one element outward — a wrapper whose capture handlers necessarily precede the
   Slider's — and it now lives in one place, `ParamSlider`, used by the dock and by the question.
   General form: **an ordering contract between a library's handlers and yours is decided by where
   they are attached, and the docs will not tell you where the library attached its own.**

3. **A resize threw the lesson away, silently.** `Stage` rebuilds its config — and so remounts the
   engine — when the measured box's *quantised aspect ratio* changes (`Stage.tsx`, the `box` memo).
   That is deliberate and correct: the arrangement's fractions are a function of the shape. What
   nobody had noticed is what a remount costs now that a lesson exists: the engine is rebuilt from
   the config, so `params.step` returns to 0, every reveal is undone and the student's own drag is
   discarded — while the track underneath goes on reading "8 / 9". **Half the app's state lived in
   the engine and half in React, and only one half survives a remount.**

   Found by screenshotting the finished question: the capture resized the viewport, and the diagram
   in the picture was empty. The browser suite found it independently a minute later, because the
   question row arriving and leaving is itself a resize — which is why P11 met this and P10 did not.

   The repair is the app restoring what it owns in `onReady`, which fires again on a remount:
   position, question apparatus, and the param values the engine last reported. The remount itself
   is bindings-lane and out of scope. There is still a visible flash of the reset diagram before the
   restore lands, and after it the strip is honestly at rest — the rebuilt engine has no memory of
   the movement it was describing.

4. **The plan's tolerance rule was wrong in both directions, and the right rule is easier.** "At
   least the param's `round` interval" rejects a target sitting exactly on the grid, which needs no
   tolerance at all, and accepts a target off the end of the slider, which no tolerance can save.
   Asking the question directly — *is there an achievable value within tolerance of the target* —
   is three lines, subsumes the rounding case and catches the out-of-range one. Two more checks
   needed the starting value and so could only run when the question was armed: a target that
   contradicts the direction it asks for, and a question that starts on its own answer.

5. **Freezing the diagram is not freezing the answer.** `draggable` stops the drag and knows nothing
   about a host control — and P11's own step 8 makes that host control the *equal* answer path, so
   a committed answer the dock could still edit is not committed. The guard belongs at the one place
   every host param write goes through, which the screen already had. Generalises: **an engine-side
   permission covers the engine's own inputs, and a host that adds inputs has to add the permission
   to each of them, or put them all behind one door.**

6. **Committing had to move focus, which reads like a violation of "do not steal focus".** The rule
   is about not stealing it *mid-attempt*, and the two are easily conflated. At the commit the
   control the student was standing on is disabled and leaves the tab order, and focus falls to the
   document body: answering by keyboard sent them back to the top of the page. So the row moves it
   one step, to the first control that replaced it — which is also why the question offers
   **Continue** after it resolves, a control the plan's own reasoning had argued against as a
   duplicate of the track's forward arrow. It is a duplicate, and it is the right one to have.

7. **A lesson with a question in it is a lesson the test suite has to answer.** P10's claim was that
   the browser suite written before the track existed "passes unchanged" from the track's last
   position. It still does — every assertion is untouched — but the *navigation* helper now commits
   an answer and asks to be shown on its way past. Worth stating plainly rather than quietly
   editing: the end of the track is still the same place as no lesson at all, and getting there is
   one step longer than it was.

### Departed from the plan, deliberately

- **The verdict is not in the narration strip.** The plan says to render it "in the narration
  strip's region (P8), where attempts, hints and scoring can live". The region, yes — the component,
  no. The strip is one line that must not grow and it is arbitrated by a rule that gives it to the
  student the instant they move anything, which is precisely when a question needs to stay on
  screen.
- **`Attempt` has a phase instead of a `revealed` flag.** The plan carried both, which is one fact
  twice.
- **Attempts are not persisted across navigation.** `TrackState.resolved` survives, so a question
  the student returns to is asked again and the track stays unblocked. Showing a recorded verdict
  beside a curve that has since moved is worse than asking again, and the progress model that would
  make it right does not exist. The plan already names this as the first thing here that will need
  persistence.
- **The reveal is drawn for a correct answer too.** The plan reveals only after a wrong one. Their
  curve is inside the tolerance, and seeing exactly where "close enough" sat is the difference
  between being told yes and being shown why.

# P14 — Which curve moves

**Lane:** app ·
**Depends on:** P11 (the attempt loop), the A$ lesson ([findings](FX-lesson-findings.md) §8–9) ·
**Unblocks:** the slides' practice questions as the slides ask them ·
**Status:** ✅ **Done** (2026-10-19). Read against the code before building — see
[Read against the code](#read-against-the-code-2026-10-19) — and [Findings](#findings) for what
building it turned up.

## Goal

A question the student answers by choosing a curve as well as a direction. "The RBA lifts the
cash rate" — which curve moves, and which way? — asked without the prompt naming the curve, marked
on both halves, and told in words when the student reached for the wrong one.

And a direction-only question whose "Show me" draws something: the right curve, shifted the right
way, by an amount the author picks for the picture and the grade never reads.

## Why this shape

The slides' practice asks three things of every scenario: which curve moves, which way, and what
that does to the currency. P11's loop can ask the second. It marks one named param and listens to
nothing else (`apps/web/src/StudyScreen.tsx:374`), so the A$ lesson had to name the curve in every
prompt ("Move demand for A$, then check") — giving away the hardest third of the skill — and a
student who reached for supply anyway was told *"You did not move it."*, which is false.

The fix is not a new kind of question. It is the same question with its candidates written down:
the param it is about, and the params the student may choose between. Everything P11 built — the
four phases, the start snapshotted at arming, the freeze, the keyboard path, "no target while
dragging" — applies to each candidate the way it applies to the one today, and a question with no
`among` has exactly one candidate and behaves exactly as before.

The reveal half is the same move in miniature. A direction-only question has no correct
*position*, only a correct way (`StudyScreen.tsx:160-164`), and the A$ lesson is direction-only on
purpose — a target would have the verdict say the RBA's decision "belongs at 60", a number the
lesson made up. So the answer line it already declares is never drawn. An `illustrate` amount gives
the reveal a position to draw *as an illustration*, kept out of the grade so the made-up number
never becomes a mark.

## Current state

- **One param is listened to.** `asked` is one name (`StudyScreen.tsx:243`) and a change counts as an
  attempt only when `asked.current === event.name` (`:374`). Moving any other curve narrates in the
  strip and leaves the question at `prompt`.
- **One start is recorded.** Arming reads the asked param's value (`:656-659`) into
  `Attempt.startValue` (`apps/web/src/quiz/attempt.ts:36`). Every other askable param's apparatus is
  parked on its current position by `parkApparatus` (`apps/web/src/quiz/apparatus.ts:23-39`), which
  is where a wrongly-moved curve's dashed start line already comes from — but its *value* is not kept
  anywhere the grade can read.
- **One param is frozen.** `frozenParam` (`StudyScreen.tsx:575`) guards host writes for the asked
  param only (`:577-580`). The diagram's own freeze already covers both A$ curves: both carry
  `draggable: 'not(params.submitted)'` (`apps/web/src/lessons/foreignExchange.ts:71`).
- **One param is marked.** `onCommit` reads the asked param (`StudyScreen.tsx:741`) and `grade()`
  compares two numbers (`apps/web/src/quiz/grade.ts:110-134`).
- **One slider.** `QuestionRow` renders one `ParamSlider` named "Your answer"
  (`apps/web/src/QuestionRow.tsx:114-122`); the name is its accessible name only — nothing visible
  labels it, which was fine while there was one.
- **The verdict says "it".** On purpose: "the prompt sits directly above and names what to move"
  (`apps/web/src/quiz/verdict.ts:49-56`). Rewrite the prompts and "it" has no antecedent.
- **The answer is drawn only for a target.** `drawableAnswer` (`StudyScreen.tsx:160-164`) gates
  "Show me" (`:789`), the reveal on a correct answer (`:755`) and the remount restore (`:468-470`).
  The A$ answer lines exist and are gated on `params.revealed and (answer != start)`
  (`foreignExchange.ts:120-130`); the first lesson's on `params.revealed` alone
  (`apps/web/src/studyDiagram.ts:100-112`).
- **"Try again" leaves everything where it is.** `retry` returns to `attempt` with the verdict
  cleared (`attempt.ts:106-111`) and the screen writes only `submitted` and `revealed`
  (`StudyScreen.tsx:767-772`).

## Read against the code (2026-10-19)

Seven things the proposal in the findings (§8–9) did not say, found by reading what it would touch.

1. **"Try again" would trap the student it was written for.** P11's retry keeps every curve where the
   student left it. A student told *"supply of A$ should stay where it was"* who then moves demand
   the right way is marked wrong again — supply is still out — unless they first put supply back
   *exactly*: "moved" is half a step (`grade.ts:118`), and with a step of 2 that is the single grid
   point it started on, which a mouse has to hit. So **Try again puts every wrongly-moved candidate
   back where the question found it, and leaves the asked one where the student put it** (P11's own
   reason for retrying into `attempt` rather than `prompt`: they have already moved it). It is not
   the answer key — the verdict has already named the curve, and the direction is still theirs to
   find. It is written as the app's move, not theirs: under the step flag, then snapshotted, so the
   strip does not narrate it as something they did and no ghost marks it.
2. **The verdict has to name the curve.** The brief gives the wrong-curve sentence; the other
   sentences say "it", and once the prompt stops naming the curve, "it" names nothing. In a choice
   question the direction clause names the asked param by its label ("you moved demand for A$
   right"), "you did not move it" names the choices ("you moved neither demand for A$ nor supply of
   A$"), and a question with one candidate keeps every sentence it has today.
3. **Illustrating would also draw on a *correct* answer.** `drawableAnswer` decides "Show me" *and*
   the reveal P11 gives a right answer, so making an illustration drawable would put a D₁ shifted 10
   beside a student who correctly moved demand 4 — a picture of "not far enough" under the word
   "Correct". The reveal on a correct answer stays target-only; "Show me" draws either. The remount
   restore follows the same rule.
4. **The slider order must not depend on which curve is asked**, or the first slider is the answer.
   The sliders follow `among` as written, the same for every question.
5. **Two sliders need visible names.** "Your answer" is an accessible name with nothing on screen
   beside it. With two, a sighted keyboard user cannot tell them apart; the mouse user has the
   curves' colours and letters. Each gets its param's label, visibly, and the same label is its
   accessible name — so a single-candidate question keeps "Your answer" and nothing else changes.
6. **`startValue` becomes `starts`, not `startValue` plus `otherStarts`.** One record of where the
   question found every candidate, the asked one included — the README's finding 3 in the small,
   which P11's own read caught once already (`revealed` beside `phase`).
7. **A question can now be unanswerable in a new way:** an `among` that leaves out the param the
   question is about. Checked with the others, at arming in dev and over every lesson in
   `lessons.test.ts` — which also requires every candidate to have apparatus, since a wrongly-moved
   curve with no start line cannot show the student where it was.

Also confirmed, not changed: the engine reads only `reveal` and `set` from a step
(`packages/engine/src/ts/KGAuthor/parsers/steps.ts:22-37`), so new keys inside `ask` reach it
harmlessly; and the A$ answer lines need no change to draw an illustration — the answer param is
written at arming exactly as a target is, and `revealed` gates it.

## Approach

1. **`Question` gains two optional fields** (`apps/web/src/quiz/grade.ts`): `among`, the params the
   student may choose between (default: just `param`), and `illustrate`, how far "Show me" draws the
   answer on a question with no target. `candidatesOf(question)` is the one reading of `among`:
   de-duplicated, in the order written, and with `param` appended if the author left it out (which
   is also reported, so the question stays answerable while it says so).
2. **`grade()` is unchanged**, and still marks the asked param alone. `gradeChoice` marks the whole
   answer: `grade()` for the asked param, plus `othersMoved` — every other candidate at least half
   its own step from where the question found it — and `correct` only when that list is empty.
3. **The verdict** (`verdict.ts`) gains a `curve` sentence — *"This one works through demand for A$ —
   supply of A$ should stay where it was."* — said first, and only when another candidate moved. When
   the asked param did not move at all it is the whole verdict: no direction clause to contradict
   it and no magnitude clause to say where "it" belongs. Tone: moving the other curve as well is
   "Not yet", not "Almost" — `partly` keeps meaning "direction right, magnitude not". Labels are
   lower-cased mid-sentence only where they are an ordinary capitalised word ("Demand for A$" →
   "demand for A$"; "RBA" and "A$" stay as written). `directionWords` are used as now.
4. **The attempt** (`attempt.ts`) records `starts` for every candidate at `ask`. Two pure helpers say
   what the screen does with it: `frozenParams` (every candidate, once committed) and
   `resetsOnRetry` (the wrongly-moved candidates, at their starts).
5. **The screen** (`StudyScreen.tsx`): `asked` becomes the candidate list, so a move of any
   candidate is an attempt; arming records every candidate's start; `updateParams` refuses every
   frozen candidate; `onCommit` reads every candidate and grades with `gradeChoice`; `onRetry`
   applies `resetsOnRetry`, under the step flag and then snapshotted (the order every other
   boundary in the file uses: put the state back, *then* snapshot); "Show me" draws an illustration
   as it draws a target.
6. **The question row** (`QuestionRow.tsx`): one slider per candidate, each named by its label,
   visibly and accessibly, in the question's order. Enter on any of them commits. One candidate
   renders exactly what it renders today.
7. **The illustration** is written into the asked param's answer apparatus when the question is
   armed — `start ± illustrate`, the sign from `direction` — and drawn only by "Show me". The grade
   never reads it; `validateQuestion` checks it is positive, not beside a target, and lands on a
   value the param can take.
8. **The A$ lesson** (`foreignExchange.ts`): the four prompts stop naming the curve and ask the
   slides' question instead; each gains `among: ['demand', 'supply']` and `illustrate: 10`.

## API / schema surface

```ts
interface Question {
    param: string;            // the one that should move
    direction: 'up' | 'down';
    target?: number;
    tolerance?: number;
    among?: string[];         // NEW — what the student chooses between; default [param]
    illustrate?: number;      // NEW — direction-only "Show me" draws param ± this; never graded
}

interface Grade {
    // ...as before, about the asked param...
    othersMoved?: string[];   // NEW — set by gradeChoice: the other candidates that moved
}

interface Verdict {
    tone; headline;
    curve?: string;           // NEW — only when another candidate moved
    direction?: string;       // now optional: absent when the curve sentence is the whole story
    magnitude?: string;
}

interface Attempt {
    starts: Record<string, number>;   // was startValue: number
    // ...
}
```

```ts
// apps/web/src/lessons/foreignExchange.ts
ask: { param: 'demand', direction: 'up', among: ['demand', 'supply'], illustrate: 10 }
```

## Tests

- `grade.test.ts` — `gradeChoice`: the right curve, the wrong curve alone, both, a move under half a
  step, and one candidate grading exactly as `grade()`; the curve sentence and the named direction
  clause; `validateChoice`; `illustrate`'s validation; and that `grade()` is the same with and
  without an illustration.
- `attempt-machine.test.ts` — `starts` for every candidate; `frozenParams`; `resetsOnRetry` returns
  the wrongly-moved candidates at their starts and nothing for a question with one.
- `quiz-loop.test.tsx` — the first lesson's question still offers one slider and leaves supply
  alone: neither counted nor frozen.
- `quiz-a11y.test.tsx` — a choice question's sliders are named by their labels, in the same order for
  a demand and a supply question; Enter on either commits; the verdict names the curve.
- `foreignExchange.test.tsx` — moving supply on a demand question is told so in words; Try again puts
  supply back and keeps demand; "Show me" draws the answer line, to the right of where the question
  started, and a correct answer draws nothing; no prompt names its curve.
- `fx.spec.ts` — the same choice made with the mouse, and the illustration's position read back
  through the axes: demand shifted 10 crosses US$0.65 at a quantity of 60.

## Risks and unknowns

- **Economics.** A choice question is only fair if its scenario pins one curve. "Australian prices
  rise faster" alone is answerable both ways (findings, *Economics to review* 4); the prompt adds
  "Australians switch to imports", which pins supply. The prompts are a teacher's to check.
- **Moving both curves.** Marked "Not yet" with both sentences. A student who moved both the right
  way has drawn a market whose rate barely moved; that is wrong, but how gently to say so is copy
  worth arguing about.
- **Lower-casing a label is a heuristic.** "Australian demand" would become "australian demand".
  The A$ labels are safe; a lesson that needs better can be given nouns later.
- **The retry reset is a param write the student did not make.** It is guarded like a lesson step,
  and it is the one place a question moves a curve after arming.

## Done when

- [x] On the A$ lesson a student who moves supply on a demand question is told so in words
      (`foreignExchange.test.tsx`, and by dragging in `fx.spec.ts`).
- [x] Keyboard and mouse both choose a curve (`quiz-a11y.test.tsx`; both in `fx.spec.ts`).
- [x] "Show me" on a direction-only question draws the right curve shifted the right way — which
      curve and which way for all four questions in jsdom, how far through the axes in the browser.
- [x] The supply-and-demand lesson behaves exactly as before: its suites pass unchanged, plus a guard
      that supply is neither counted nor frozen.
- [x] `npm test` (415 + 131 + 280), `npm run typecheck` and `npm run test:browser` (50) pass.
- [x] [FX-lesson-findings](FX-lesson-findings.md) §8–9 say what landed.

## Out of scope

- The third question the slides ask — *does the A$ appreciate?* — which is a question about a calc,
  not a param, and needs its own answer path. Findings §11 is the half of it the strip owns.
- Questions that move two curves at once (the textbook rate rise: inflow up *and* outflow down).
  `among` lets a student choose one of several; marking a pair is a different grade.
- Partial credit, scoring and persistence — P11's out-of-scope, unchanged.

## Findings

Five, and one thing not done.

1. **A sentence can lean on another sentence, and nothing fails when the other one changes.** The
   verdict's "it" was correct only because the prompt above it named the curve, and its comment said
   so. Rewrite the prompt and "you moved it right" stays true, grammatical and passing — about
   nothing. Found by reading, before building, and it is the one defect here that no test could have
   found, because every assertion about it would have been satisfied.
2. **"Try again" is now the one place a question moves a curve after arming.** Putting the wrong curve
   back is a param write the student did not make, so it is written the way a remount restore is: under
   the step flag, snapshotted after, and the calcs read again after the snapshot. Pinned by the strip
   being at rest afterwards, not reporting "supply of A$ shifts to the left" as something the student
   did.
3. **jsdom can say which curve was drawn and which way, but not how far.** Plans README finding 18
   says a *drag* cannot be synthesised in jsdom. Reading a *drawing* is different: the engine computes
   each path's `d` without layout, so a dotted line, its colour, its slope and its offset from the
   dashed start line can all be read in jsdom. Only the distance needs the browser's axes. That
   decided where each half of "Show me draws the right shift" is tested.
4. **A browser run from a worktree tests whatever is on port 5173.** `reuseExistingServer` is on
   locally, and the main checkout had `npm run dev` open on 5173, so `npm run test:browser` here would
   have attached to *that* server and reported on code this branch does not contain. Run as
   `PORT=5199 npm run test:browser`. The config's comment already allows for this; the trap is that a
   wrong run fails nothing and passes green.
5. **The question's sliders share their names with the dock's.** "Demand for A$" names a slider in the
   question row and one in the Explore instrument. The "Question" group tells them apart, for a reader
   and for a test, which has to look `within` the row. Deliberate: the name is the label the student
   sees on both.

Every rule this plan added was then reverted on its own — listening to one param, freezing one,
putting nothing back on retry, drawing targets only, drawing the illustration beside a right answer,
not grading the other curve — and each reversion failed at least one test.

**Not done:** nobody has *looked* at the two-slider row. Its behaviour is pinned in both suites, but
its layout at 1440px and on a phone (where it should wrap to two lines) has not been screenshotted.

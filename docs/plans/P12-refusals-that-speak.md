# P12 — Refusals that speak

**Lane:** engine
**Depends on:** P5 (shares the `Model.updateParam` edit), P6 (the model→host seam it extends)
**Unblocks:** learner-facing coaching on a move the diagram would not make
**Status:** 📝 Outlined in [P5](P5-interaction-snapshot-and-prev-scope.md#outline-p12--refusals-that-speak)
and split out here. Read against the code before building — see
[Read against the code](#read-against-the-code-2026-09-02).

## Goal

A student who pushes a curve somewhere the diagram will not go should be told
why. Today the curve simply stops, the engine reverts, and nothing anywhere —
event, warning or pixel — says that a refusal happened at all.

## Why this shape

The product's premise is that a diagram teaches by responding. A diagram that
*declines* to respond is still teaching something, and what it is teaching is
either "this is impossible, and here is the constraint" or "this thing is
broken" — and the student cannot tell which. That is the whole of the problem:
the two are indistinguishable from the outside, and one of them is a lesson.

There is also a second audience. An author whose restriction expression contains
a typo has built a diagram that refuses *everything*, silently and permanently,
and has no way to find out. A refusal that speaks tells them too.

## Current state

Quoted from P5's outline, with line numbers checked against the tree on
2026-09-02. Everything under [Read against the code](#read-against-the-code-2026-09-02)
supersedes anything here that disagrees with it.

- `Model.updateParam` hypothesises the new state, tests every restriction, and
  reverts at `packages/engine/src/ts/model/model.ts:542-547` — emitting nothing.
- `Restriction.valid` evaluates one expression against optional `min`/`max` and
  returns a bare boolean (`packages/engine/src/ts/model/restriction.ts:31-43`).
- `RestrictionDefinition` carries `expression`, `type`, `min?`, `max?`
  (`restriction.ts:5-10`). There is nothing on it a host could put in front of a
  student.
- The schema docs describe the silence as intended: "the engine will silently
  cancel the update and roll back"
  (`docs/schema/02-parameters-and-interactions.md:76`).

## Approach

1. **A third seam, not a fourth event path.** `Model` already reports to the
   `View` through `onSnapshot` and `onParamChange` (`model.ts:102-103`). Add
   `onParamBlocked` beside them and let the `View` turn it into an event, the way
   it already turns `onParamChange` into `kg:param_changed`.
2. **Name the restrictions.** `RestrictionDefinition` gains optional `name` and
   `message`. `message` is the author's sentence for the learner ("Price can't go
   below zero"); `name` is the stable id an app keys coaching or analytics off.
   Without at least one of them an app can only say "that isn't allowed", which
   is barely better than silence.
3. **Report both kinds of refusal.** A restriction rollback, and a param bound —
   see correction 6 below for why the second is not scope creep but the only one
   this repo's own app can reach.
4. **Coalesce on the cause.** Emit on the transition into a refusal, not per
   tick: a pointer dragged along a boundary produces one refusal per pointer
   move, all with the same cause.
5. **`Restriction` reports what it saw.** `valid()` returning a boolean cannot
   say *how far* out of range the attempt was, which is the difference between
   "not allowed" and "you'd need to stay above 0.001".

## Read against the code (2026-09-02)

Eight corrections, of which two delete steps the outline asks for, three are
defects the outline did not know about, and one changes what the payload is
mostly *for*. Three were established by running the model rather than reading
it — marked **measured**.

1. **Shape item 1 is already built, and by a better mechanism.** The outline asks
   for `Model` to become an `EventEmitter`, for the `View` to forward model
   events, and for the emitter to be passed into `new View(...)` because it is
   currently installed one line later. P6 built the path differently: the `View`
   installs *seams* on the model — `model.onSnapshot` and `model.onParamChange`
   (`model.ts:102-103`, `view.ts:393-401`) — and `KineticGraph` still assigns
   `view.emitter` after construction (`kg.ts:102`, then `:110`). The seam is the
   better arrangement, because the model stays ignorant of what an event is, and
   P12 should add a third seam rather than rebuild the road. The
   construction-time-loss worry the outline raises does not arise: a refusal
   cannot happen before there is a diagram to refuse in.

2. **Shape item 2 is done.** All three documented events are emitted —
   `kg:param_changed` at `view.ts:630`, `kg:curve_dragged` at
   `interactionHandler.ts:159` and `:175`, `kg:node_hover` at `:132-133`. P6 did
   it. The outline's "not scope creep — the docs already promise them" was true
   when it was written and is now simply finished.

3. **A restriction has a second silent failure, in the opposite direction, and it
   is the worse one. (measured)** A restriction whose `expression` does not parse
   — `params.aa - params.c`, one keystroke — refuses **every** param change,
   permanently, with no warning. `Model.evaluate` returns an unparseable
   expression as its own source *string* (`model.ts:415-423`), and
   `"params.aa - params.c" >= 0` is `false`, so `valid()` says no to everything
   forever. An unparseable `min` or `max` does the same.

   This is P0's finding with the sign flipped. The same string fallback reads as
   **always true** in a `show` and as **never move** in a restriction — one
   ships a diagram that shows what it should hide, the other ships a diagram
   that has seized solid. Neither says a word. It is the refusal most in need of
   a voice, and P12 should lead with it rather than treat it as a footnote.

4. **A restriction with neither `min` nor `max` permits everything, and the docs
   say otherwise. (measured)** `valid()` opens with `isValid = true` and only
   ever narrows on a declared bound (`restriction.ts:35-41`), so
   `{ expression: 'params.a > 0' }` is a guard that guards nothing. That spelling
   is not hypothetical: `docs/schema/02-parameters-and-interactions.md:76`
   describes the engine as honouring "mathematical properties defined in the
   `expression` operators", which is exactly a boolean expression, and it has
   never worked. Both of a restriction's failure modes are silent and they point
   in opposite directions.

5. **`type` is required by the interface and by the docs, and is read by nothing.
   (measured)** `Restriction` stores `def.type` (`restriction.ts:19`, `:26`) and
   never consults it; a restriction declared `type: 'nonsense'` enforces its
   `min` exactly as one declared anything else does. It should become optional
   rather than acquire a meaning, and the docs should stop asking for it.

6. **The outline names the rarer refusal.** A param's own `min`/`max` stops far
   more drags than a restriction does, and it is silent in a nastier way:
   pushing `a` past its `max` of 28 clamps to 28 and reports an ordinary
   `kg:param_changed`, so the host is told the curve **moved** rather than that
   it was stopped; every further push reports nothing at all, because
   `updateParam` returns early when the value did not change (`model.ts:508`).

   This matters for whether P12 has a consumer. `apps/web` declares no
   restrictions and — checked against the config — cannot honestly declare one:
   with `a ∈ [12,28]` and `c ∈ [0,8]` every derived quantity stays in range for
   every combination, so any restriction added there would be arithmetic
   invented to demonstrate a feature. Its bounds *are* its real constraint. A
   `kg:param_blocked` that covered only restrictions would therefore ship with
   no consumer in this repo, which is precisely what finding 7 says not to do.
   So the event carries a `reason`, and `'bounds'` is the first-class case.

7. **The event storm has a different shape than the outline supposes.** d3 fires
   `drag` on movement, not on a timer, so a pointer held still against a
   boundary produces nothing at all. The storm is a *moving* pointer past the
   boundary: one refusal per pointer move, every one with an identical cause.
   Coalescing therefore keys on the cause rather than on elapsed time — emit
   when the refusal *starts*, stay quiet while it is the same refusal, and clear
   it when that param next moves.

8. **`Restriction.valid` needs to report more than the outline asks.** Bounds and
   the evaluated value are not enough given correction 3: the payload also has to
   say whether the expression and each bound resolved to a number at all, since
   "your drag broke this rule" and "this rule is not a rule" are different
   sentences and only the second is addressed to the author.

## API / schema surface

```ts
interface RestrictionDefinition {
    expression: string;
    type?: string;          // accepted, unread — see correction 5
    min?: string;
    max?: string;
    name?: string;          // stable id, for an app keying coaching off it
    message?: string;       // the author's sentence for the learner
}
```

```ts
KG_EVENTS.PARAM_BLOCKED === 'kg:param_blocked'

interface ParamBlockedEvent {
    name: string;             // the param
    label: string;            // its label, so a host can write a sentence
    reason: 'bounds' | 'restriction';
    requestedValue: number;   // what was asked for
    attemptedValue: number;   // after clamp and round — the value actually tried
    value: number;            // where the param actually stands now
    min: number;
    max: number;
    limit?: 'min' | 'max';    // bounds only: which end was hit
    restrictions: BlockedRestriction[];   // restriction only; [] otherwise
}

interface BlockedRestriction {
    name?: string;
    message?: string;
    expression: string;
    value: number | string;             // what the expression evaluated to
    min?: number | string;
    max?: number | string;
    unresolved?: 'expression' | 'min' | 'max';  // correction 3: not a rule at all
}
```

## Tests

- A restriction rollback emits once, with the offending restriction named.
- A drag held past a boundary emits **once**, not per tick, and emits again after
  an accepted change in between.
- A clamp at a param bound emits, including the second push that changes nothing.
- An unparseable restriction expression warns, names the restriction, and reports
  `unresolved` rather than pretending the student broke a rule.
- A restriction with no bounds and a boolean expression refuses a `false`.
- A restriction with no bounds and no boolean expression warns that it guards
  nothing.
- Nothing is computed when nothing is listening, matching `reportParamChange`.
- The React binding forwards it, and the app renders it — an integration point
  exercised only through a mock is not exercised (finding 7).

## Risks and unknowns

- **Volume.** Bounds refusals are common by design. Coalescing on the cause is
  what keeps this from being a firehose; if it is still too much, a host can
  filter on `reason`.
- **A refusal is not an error.** Nothing should log to the console on a student
  hitting a boundary — that is ordinary use. Only the author-facing cases
  (corrections 3, 4) warn.
- **The frozen-answer case is the app's, not the engine's.** P11 filters a frozen
  param out in `updateParams` before the engine ever sees it, so that refusal
  cannot be reported through this path. Named in Out of scope.

## Done when

A student dragging demand above the top of its range is told, in words, that it
will not go further and why; an author with a typo in a restriction is told that
their restriction is not a rule; and neither costs anything when nothing is
listening.

## Out of scope

- **Batched multi-param updates.** Still unowned (P0 §7, README finding 4). P12
  makes the halfway rollback *audible*, which is not the same as making it not
  happen, and the fix is a different change to the same method.
- **A host refusal.** The app declining to pass a param through (P11's frozen
  answer) never reaches the engine. If it should speak too, that is app copy.
- **Restriction authoring ergonomics.** No `EconSchema` shorthand for common
  restrictions; that is P13's neighbourhood.
- **Undo, or offering the student a legal alternative.** Saying why is the whole
  of this plan.

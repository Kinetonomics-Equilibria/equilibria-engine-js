# P0 — Findings

**Status:** Complete. Ran 2026-08-27 against `packages/engine` at baseline (12 files, 88 tests green).
**Method:** Configs mounted through the existing jsdom harness (`src/__tests__/helpers.ts`), asserting on
model values and rendered DOM rather than on a scratch page. Every claim below was executed, not read.
**Pinned by:** `packages/engine/src/__tests__/authoring_contracts.test.ts`.

## Verdicts

| # | Claim | Verdict |
|---|---|---|
| 1 | Authored ghost (pinned dashed line beside a live one) | **Holds** |
| 2 | Runtime-toggled ghost (`show` bound to a param) | **Holds** |
| 3 | Shift arrow tracking a live point | **Holds** |
| 4 | Conditional feedback / quiz predicate | **Holds — but the failure mode is worse than feared** |
| 5 | Staged reveal (`show: 'params.step >= n'`) | **Holds**, at 24 characters per object |
| 6 | Constrained drag and freeze-on-commit | **Holds**, including `draggable` re-read after mount |
| 7 | Scenario presets (two params in one call) | **Fails — order-dependent, and silently lands wrong** |

## 1 — Authored ghost. Holds.

Two `Line` objects on one graph, one bound to `params.a`, one pinned to a literal, render as two
independent paths with distinguishable stroke treatment:

```
path-KGID_rrThTDi7y4   stroke-opacity: 1;    stroke-dasharray: 10,0    (live)
path-KGID_N1k3DnwYaM   stroke-opacity: 0.35; stroke-dasharray: 10,10   (ghost)
```

`lineStyle: 'dashed'` and `strokeOpacity` both reach the DOM as authored. No engine change is needed
to draw a ghost.

**Consequence:** P5 stays an enhancement (remembering a ghost) rather than a prerequisite for having
one at all.

## 2 — Runtime-toggled ghost. Holds.

`show: 'params.showGhost'` with a 0/1 param toggles the object's `display` on `update()`, with no
remount, and reverses cleanly:

```
showGhost=0  → style "... display: none;"
showGhost=1  → (no display rule)
showGhost=0  → style "... display: none;"
```

**Consequence:** ghosts are a param change, not a config-shape change, so they do not collide with
P7's remount-on-config-identity lifecycle problem.

## 3 — Shift arrow. Holds.

`Arrow` renders as `<line class="line-…" marker-end="url(#…)">`, not a `<path>`. The end tracks the
param — as `a` goes 20 → 26 the endpoint moves `x2 514.67 → 633.07`, `y2 213.11 → 95.08`, while the
pinned `begin` stays put. The minted marker's path carries the object's own colour
(`fill="#d62728"` for `colors.red`), confirming `getEndArrowName`'s per-colour marker mechanism.

**Note for implementers:** assert on `x1/y1/x2/y2` of a `<line>`. The `<path>` elements inside a
`<marker>` are the arrowhead glyph and never move.

## 4 — Conditional feedback. Holds; the mistyped case is a silent always-true.

The happy path is clean. `calcs.correct: 'abs(params.a - 24) <= 0.5'` evaluates to a genuine
JavaScript `boolean` — `true` at `a=24`, `false` at `a=30` — not a mathjs boxed type. Truthiness
concerns do not arise for a well-formed predicate.

**The failure mode is confirmed, and it is worse than the plan supposed.** With a typo:

```yaml
calcs: { correct: 'abs(params.aa - 24) <= 0.5' }   # 'aa' does not exist
params: [{ name: 'a', value: 30 }]                  # answer is wrong by 6
```

| Observed | |
|---|---|
| `calcs.correct` value | `"abs(params.aa - 24) <= 0.5"` (the source text) |
| `typeof` | `string` |
| truthy? | **yes** |
| warnings emitted | **none** |
| `Label` with `show: 'calcs.correct'` | **renders** |

A student with a wrong answer is told they are correct. The bare-name spelling (`abs(aa - 24) <= 0.5`)
behaves identically. `reportUnresolvedCalcs` does not catch it: that guard looks for an interpolated
`undefined` token (`model.ts:195-`), and a whole expression that merely fails to parse contains no
such token, so it passes inspection.

This is `model.ts:180-188` behaving exactly as documented — returning unparseable strings unchanged is
deliberate, because colours, LaTeX label text and forward references legitimately fail to parse. The
defect is not the fallback; it is that nothing downstream distinguishes "this string is a colour" from
"this string was supposed to be a boolean".

**Consequence for P11 (Fork 3):** schema-side grading is a trap in its current form. A predicate typo
does not fail loudly, does not fail closed, and does not fail *visibly* — it fails as a pass. Either
the app grades (Fork 3 = app), or P11 must first require a boolean-typed calc that warns when a calc
declared as a predicate resolves to a string. Recommend the latter as a small engine change regardless
of who grades, since the same trap catches any `show:` expression.

## 5 — Staged reveal. Holds. 24 characters per object.

Five points, each `show: 'params.step >= n'`, stepped 0..5. Visibility (2 circles per point — a
`dragCircle` hit area and the drawn `circle`):

```
step=0  0 0 0 0 0 0 0 0 0 0
step=1  1 1 0 0 0 0 0 0 0 0
step=3  1 1 1 1 1 1 0 0 0 0
step=5  1 1 1 1 1 1 1 1 1 1
step=2  1 1 1 1 0 0 0 0 0 0    ← scrubbing back works
```

Reveal is monotone forward and reverses correctly, so a scrubber is viable today.

**The verbosity finding, honestly stated:** `show: 'params.step >= 1'` is 24 characters, hand-written
per object, with the step number duplicated into every object that belongs to that step. For a
twenty-object diagram that is ~480 characters of boilerplate whose only content is an integer, and
renumbering a step means editing every object in it. It works, and it is unpleasant enough that P6's
declared step order is justified on authoring cost alone rather than on capability.

**Consequence:** P10 has a real fallback and is not blocked on P6 — but should not ship on the
fallback for a diagram of any size.

## 6 — Constrained drag and freeze-on-commit. Holds, including the doubtful part.

`drag: [{ horizontal: 'a' }]` produces `directions: 'x'`, `param: 'a'`,
`expression: 'params.a + drag.dx'` — as `dragListener.ts:33-42` claims.

**`draggable` bound to an expression is re-read after mount.** This was flagged as the claim most
likely to be wrong in practice; it is correct. With `draggable: 'not(params.submitted)'`:

```
submitted=0 → draggable: true
submitted=1 → draggable: false
submitted=0 → draggable: true     ← and it comes back
```

`ClickListener` with the default `transitions: [1, 0]` on a 0/1 param toggles as expected
(0 → 1 → 0 → 1). The indexing caveat stands as written — it is a lookup table indexed by the param's
current value, nothing validates that the value is a usable index, and a param outside `0..len-1`
will index `undefined`. For 0/1 params it is a toggle.

**Consequence:** P11's commit step needs no app-side unmounting. Freeze-on-submit is authorable today.

## 7 — Scenario presets. Fails.

`kg.update({ params: [...] })` iterates and calls `model.updateParam` **once per param**
(`kg.ts:86-99`), and each call validates the whole restriction set against a state where only that one
param has moved (`model.ts:231-262`). A legal destination reached through an illegal interim is
rejected halfway, and the rollback is silent.

Restriction `params.a - params.c >= 10`, starting at `a=26, c=9` (difference 17, legal), target
`a=15, c=5` (difference 10, legal):

| Call | Interim | Result |
|---|---|---|
| `[{a:15}, {c:5}]` | `a=15, c=9` → difference 6 | **`a` rejected.** Final state `a=26, c=5` |
| `[{c:5}, {a:15}]` | `a=26, c=5` → difference 21 | Both applied. Final state `a=15, c=5` |

The first case ends in `a=26, c=5` — a state neither the caller's start nor its target, reached with
**no warning and no error**. The caller believes the scenario was applied.

**Consequence:** scenario presets need a batched update path that applies all params, then validates
once, then rolls back all-or-nothing. That is new engine work nobody has planned. Until it exists, any
caller passing multiple params is relying on luck in ordering. This affects P10 (a lesson step that
sets several params at once) and P11 (loading a question's initial state), and it is the strongest
argument yet for P12 — a rollback that says nothing is indistinguishable from success.

## Actions taken

- Claims 1, 2, 3, 5, 6 pinned in `packages/engine/src/__tests__/authoring_contracts.test.ts`.
- Claim 4's real behaviour pinned in the same file, labelled as **documenting a defect**, not a
  desirable contract.
- Claim 7's order-dependence pinned in the same file, likewise labelled as a defect.
- Plans corrected: P11 (grading), P10 (fallback viability and multi-param steps), P5 (ghosts are an
  enhancement, not a prerequisite), P6 (justified on authoring cost).

## Two items this spike found that no plan owns

1. **A calc that should be a predicate can silently be a string.** Narrower and cheaper than "fix
   `evaluate`": let a calc be declared boolean, and warn when it settles to a non-boolean. Worth its
   own small plan; P11 cannot be trusted without it.
2. **Multi-param updates are not atomic.** A batched `updateParams` that validates once at the end
   would fix claim 7 and is a precondition for scenarios anywhere in the product.

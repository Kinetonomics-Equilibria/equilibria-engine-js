# Known issues

Findings from auditing the engine and from building its first real consumer
(`apps/web`). These are pre-existing defects inherited from the KGJS fork, not
regressions from the monorepo or packaging work — the code paths involved are
untouched by those changes.

## Why these went unnoticed

The suite asserted that a diagram *rendered*: element counts above zero, the
absence of `NaN` in the markup, stroke colors, and one DOM snapshot. None of
that distinguishes a diagram that solves the right system from one that solves
the wrong one, so every wrong-answer defect below passed CI.

`src/__tests__/econ_values.test.ts` now asserts the numbers the model actually
resolves to, with each expected value hand-checkable from the config beside it.
New engine work should extend it rather than adding more shape-count tests.

---

## Fixed

### 1. Semantic colors were discarded

**Symptom:** every `Econ*` object rendered with no stroke at all — geometrically
correct but invisible.

**Cause:** `setStrokeColor()` assigned `def.color` and `def.stroke`
unconditionally, so when neither was supplied it created own properties holding
`undefined`. `setDefaults()` skips any key that is already an own property, so
the semantic color assigned immediately afterwards (`colors.demand` and friends)
was silently dropped.

**Fix:** `setStrokeColor()` only assigns when a color is actually available.
Covered by `econ_regressions.test.ts` ("semantic colors").

### 2. `EconLinearEquilibrium` solved the wrong intersection

**Symptom:** demand `{yIntercept: 20, slope: -1}` against supply
`{yIntercept: 2, slope: 1}` reported `Q=0, P=2` where the answer is `Q=9, P=11`.
The demand curve was also drawn degenerately. Intercept form
(`{yIntercept: 20, xIntercept: 20}`) was correct throughout.

**Cause:** `EconLinearDemand` defaulted `point: [0, yIntercept]` alongside the
caller's `slope`. `Line` dispatches on `hasOwnProperty` through an ordered chain
and reaches `point && yIntercept` *before* `slope && yIntercept`, so the
placeholder point won. Because that point *is* the y-intercept, the slope it
derived was `(yIntercept - yIntercept)/0` — and `divideDefs()` short-circuited a
zero numerator to `0` rather than `NaN`, so the result looked like a legitimate
horizontal line rather than a degenerate one. The caller's slope was discarded
and `lineIntersection()` was handed the wrong line.

**Fix:** the placeholder is only applied when the def carries no geometry at
all. A lone `yIntercept` still gives a horizontal curve, now via `Line`'s own
fallback — which also fixes it previously being drawn as a vertical line at
`x=0`. `divideDefs()` no longer reports `0/0` as `0`.

The blast radius was narrower than first assessed: a placeholder `point` was
injected in exactly one place in the whole KGAuthor tree, so this did not
require reordering `Line`'s dispatch chain.

`apps/web` now builds its market diagram from `EconLinearEquilibrium` rather
than from primitive `Line` and `Point` objects with the algebra restated in
`calcs`.

### 3. Documented functional-form names did not work

**Symptom:** `EconIndifferenceCurve`, `EconIndifferenceMap`,
`EconOptimalBundle` (and the Lagrange/Slutsky/Hicks/LowestCost variants) and
`EconDemandCurve` all failed with `Cannot read properties of undefined (reading
'levelCurve')` — an error naming neither the config nor the real problem.

**Cause:** `getUtilityFunction()` matched `CobbDouglas`, `Substitutes`,
`Complements`, `Concave`, `Quasilinear` and `CESFunction`. The names the schema
reference documents — and that the classes are exported under — are
`CobbDouglasFunction`, `LinearFunction`, `MinFunction`, `ConcaveFunction`,
`QuasilinearFunction` and `CESFunction`. Only `CESFunction` overlapped, so five
of the six documented forms fell off the end of the chain and returned
`undefined`.

**Fix:** both vocabularies are accepted, and an unrecognised name now throws an
error that names itself and lists the valid options.

### 4. Lines through the origin published a broken fixed point

**Symptom:** `calcs.<name>.fixedPoint` came back as the literal string
`"((undefined)/(1 - 1))"`, so anything binding to it received a string instead
of a number. Reached by any line through the origin — including a `slope`-only
def, and a supply curve starting at the origin.

**Cause:** `Line.parseSelf()` tested its intercepts for truthiness, so an
intercept of `0` read as absent: `d.yIntercept` was never set, but the branch
below still interpolated it.

**Fix:** the intercepts are tested against `null`, which is what `Line` actually
reports for the absent intercept of a horizontal or vertical line.

### 5. Unresolved expressions failed silently

`Model.evaluate()` catches every mathjs failure and returns the raw string. That
fallback is load-bearing — color names, LaTeX label text, forward references
that resolve on a later pass, and deliberate functions of `x` all fail to
evaluate legitimately — but it also let badly assembled expressions through
unremarked.

Calcs are now swept once they have settled, and any value still carrying an
interpolated `undefined` is reported with its calc path. That token is the one
unambiguous signal: it only ever appears because a definition was missing a
value when the expression was built.

### 6. `Line` ignored an x-intercept given alongside a slope

A def carrying both `slope` and `xIntercept` had no matching branch and fell
through to the `slope`-only case, which forces the line through the origin and
discarded the author's x-intercept. The branch now exists.

### 7. Two smaller collisions

- `EconContractCurve` published its function under a hardcoded `calcs['cc']`, so
  two contract curves in one diagram overwrote each other. Now keyed by name,
  with `'cc'` kept as the default name so existing configs still resolve.
- `EconBudgetLine` published its endowment via `toString()` on a point object,
  emitting the literal `"[object Object]"`. It is now a nested calc
  (`calcs.<name>.endowment.x`), omitted when the line is defined by income.

---

## Open

### A. Unnamed econ objects share a calc namespace

`EconLinearDemand`, `EconLinearSupply` and `EconLinearEquilibrium` default their
`name` to `demand`, `supply` and `equilibrium`. Two unnamed demand curves in one
diagram therefore both publish to `calcs.demand`, and because `parseSelf()`
merges with `setDefaults()` — which skips keys already present — the *first* one
wins and the second is silently dropped.

Verified: mounting two unnamed `EconLinearDemand` objects yields a single
`calcs.demand` holding the first curve's geometry.

Fixing this well means deciding what an unnamed second object should be called,
which changes the calc keys existing configs reference. It wants a deliberate
call rather than a quick patch. Naming both curves explicitly is a complete
workaround.

### B. `multiplyDefs()` treats `0 * Infinity` as `0`

`multiplyDefs()` short-circuits to `0` whenever either operand is `0`, without
checking the other. `Infinity` is a real operand here — `Line` uses it for the
inverse slope of a horizontal line — so the product is reported as `0` where it
is mathematically undefined.

No defect has been traced to this in practice, and the short-circuit is load
bearing for horizontal and vertical line handling, so it is recorded rather than
changed. `divideDefs()` had the analogous flaw and *was* implicated (see fixed
issue 2), which is why that one was fixed and this one was not.

### C. React binding clobbers the engine's container class

`KineticGraph.mount()` adds `.kg-container` to the container element via
`classList.add`. `EquilibriaChart` also sets `className` on that same element,
so the next React render after `setMounted(true)` resets the class attribute and
drops `.kg-container`. It is present in jsdom tests (no re-render is triggered
there) but absent in the browser.

Cosmetic. Impact is limited to the two declarations under `.kg-container` in
`kgjs-theme.css` (`color` and `background-color`); the `--kg-*` custom
properties are defined on `:root`, so colors and axes are unaffected.

### D. Missing required keys produce opaque errors

An econ object built without the keys it needs interpolates `undefined` into its
generated expressions and surfaces as a mathjs type error naming neither the
object nor the missing key — for example `EconContractCurve` without `a`/`b`.
The calc sweep added in fixed issue 5 reports these once they reach the model,
but there is no up-front validation of required keys.

# Known issues

Findings from building the first real consumer of the engine (`apps/web`) and
from auditing the econ object library. These are pre-existing defects inherited
from the KGJS fork, not regressions from the monorepo or packaging work — the
code paths involved are untouched by those changes. Everything under **Fixed**
is closed and named by the test that holds it in place; three items remain
**Open** at the end.

Issues 9 and 10 were found later, while implementing the plans in `docs/plans`,
and are the same two shapes as the rest: a value written into the DOM in a form
nothing could read, and an element created for text that nothing ever wrote.

## Why these went unnoticed

The suite asserted that a diagram *rendered*: element counts above zero, the
absence of `NaN` in the markup, stroke colors, and one DOM snapshot. None of
that distinguishes a diagram that solves the right system from one that solves
the wrong one, so every wrong-answer defect below passed CI.

`src/__tests__/econ_values.test.ts` and `src/__tests__/econ_equilibrium_values.test.ts`
now assert the numbers the model actually resolves to, with each expected value
hand-checkable from the config beside it. New engine work should extend those
rather than adding more shape-count tests.

# Fixed

## 1. Semantic colors were discarded — FIXED

**Symptom:** every `Econ*` object rendered with no stroke at all. The geometry
was correct, so the elements were in the DOM with the right `d` attribute, but
invisible. The engine's tests only ever asserted element *counts*, so this went
unnoticed.

**Cause:** `setStrokeColor()` in `KGAuthor/parsers/parsingFunctions.ts` assigned
`def.color` and `def.stroke` unconditionally:

```ts
def.color = def.color || def.stroke;   // undefined || undefined -> undefined
def.stroke = def.stroke || def.color;  // but the key now EXISTS
```

When neither was supplied this created own properties holding `undefined`.
`setDefaults()` skips any key that is already an own property
(`if (!def.hasOwnProperty(key))`), so the semantic color assigned immediately
afterwards — `color: 'colors.demand'` in `EconLinearDemand`, `'colors.supply'`
in `EconLinearSupply`, and so on — was silently dropped. `drawStroke()` then
wrote `stroke=undefined`.

Plain `Line` and `Curve` objects were unaffected because they set `color`
*before* `setStrokeColor()` runs.

**Fix:** `setStrokeColor()` now only assigns when a color is actually available.
Covered by regression tests in `src/__tests__/econ_regressions.test.ts`
("semantic colors").

## 2. `EconLinearEquilibrium` solved the wrong intersection — FIXED

**Symptom:** `EconLinearEquilibrium` with `demand: {yIntercept: 20, slope: -1}`
and `supply: {yIntercept: 2, slope: 1}` reports an equilibrium of `Q=0, P=2`.
The correct answer is `Q=9, P=11`. The demand curve is also drawn degenerately.
This reproduces with literal numbers, so it is not a parameter-binding problem.

**Cause:** `EconLinearDemand` defaults `point: [0, def.yIntercept]` alongside
the caller's `slope` and `yIntercept`. The `Line` constructor then dispatches
on `hasOwnProperty` through an ordered chain of branches, and the
`point && yIntercept` branch is reached *before* the `slope && yIntercept` one:

```ts
slope    = divideDefs(subtractDefs(def.point[1], def.yIntercept), def.point[0]);
invSlope = divideDefs(def.point[0], subtractDefs(def.point[1], def.yIntercept));
```

Because the defaulted point *is* the y-intercept, both reduce to `0/0`, and the
caller's explicit `slope: -1` is discarded. `divideDefs()` compounded it by
short-circuiting a zero numerator to `0` rather than `NaN`, so the result looked
like a legitimate horizontal line rather than a degenerate one.
`lineIntersection()` — whose formula is itself correct — is then handed the wrong
line and returns `x = 0`.

**Fix:** the placeholder point is gone. `[0, yIntercept]` *is* the y-intercept,
so it never added a constraint — it only diverted the def into a branch that
could not use it. A fallback is applied only when the def carries no geometry at
all (no `point`, `point2`, `slope`, `invSlope`, `xIntercept` or `yIntercept`),
which is the case it was there for. Precedence in `Line` is otherwise unchanged:
a point plus a y-intercept still reads as two points on the line, which is the
right answer whenever the point carries information.

Gaps that the defaulted point had been masking are closed alongside it:

- `Line` had no `slope && xIntercept` branch, so a line given that pair fell
  through to the bare `slope` branch and was drawn through the origin, ignoring
  the x-intercept. Every demand curve defined by an x-intercept hit this.
- The `point && yIntercept` branch is now skipped when the point *is* the
  y-intercept (`[0, yIntercept]`), since its formulas reduce to `0/0` there. Any
  config still passing that redundant point falls through to the slope it also
  carries instead of producing a degenerate line. A point elsewhere on the y-axis
  still reads as a vertical line, as before.
- `divideDefs()` no longer reports `0/0` as `0`. A symbolic denominator still
  short-circuits: it is not literally `0`, and the simplification keeps generated
  expressions readable.

Covered by `src/__tests__/econ_equilibrium_values.test.ts`, which asserts solved
values (`Q*=9`, `P*=11`, from literals and from params) and checks the rendered
diagram against primitive `Line`/`Point` objects placed at the same coordinates,
and by the demand and equilibrium cases in `src/__tests__/econ_values.test.ts`.
Seven of the ten tests in the first file fail against the previous behaviour; the
other three are regression guards on the `Line` forms that already worked.

**Note:** `apps/web/src/App.tsx` still builds its diagram from primitive `Line`
and `Point` objects, which was the workaround for this bug. It no longer has to —
`EconLinearEquilibrium` now solves the same market correctly.

## 3. React binding clobbered the engine's container class — FIXED

`KineticGraph.mount()` adds `.kg-container` to the container element via
`classList.add`. `EquilibriaChart` and `EquilibriaCard` also set `className` on
that same element, so the render React runs after `setMounted(true)` rewrote the
class attribute and dropped `.kg-container`. It was present in jsdom tests
(which only looked at the first render) but absent in the browser.

Impact was limited to the two declarations under `.kg-container` in
`kgjs-theme.css` (`color` and `background-color`); the `--kg-*` custom
properties are defined on `:root`, so colors and axes were unaffected.

**Fix:** the engine exports the class name as `KG_CONTAINER_CLASS`, and both
React components render it in their own `className` instead of relying on the
engine's `classList.add`. Whichever element React owns, React writes the class —
there is no longer an attribute two parties both assign. `mount()` still adds the
class for plain-DOM callers, and the same guidance now appears in
`docs/getting-started.md` for any other framework that renders `class` on the
container.

The React test double now mirrors the engine here — it adds the class on `mount`
and removes it on `destroy` — so the regression tests reproduce the real
sequence: engine adds the class, React's next render drops it. Both fail against
the previous components.

## 4. Unnamed econ objects collided on their default names — FIXED

**Symptom:** two `EconLinearDemand` objects in one diagram, neither given a
`name`, both reported the first curve's geometry. The second curve's slope and
intercepts never reached `calcs`, so anything reading `calcs.demand.*` — a
surplus area, an equilibrium point, an author's own expression — silently
described the wrong curve. Same for two supply curves and two equilibria.

**Cause:** names double as calc keys, and `EconLinearDemand`, `EconLinearSupply`
and `EconLinearEquilibrium` defaulted to the fixed names `demand`, `supply` and
`equilibrium`. `Line.parseSelf` merges into `parsedData.calcs` with
`setDefaults`, which skips keys that already exist:

```ts
parsedData.calcs[l.name] = setDefaults(parsedData.calcs[l.name] || {}, d);
```

so the first object to parse won the key and the second was dropped with no
warning. `EconLinearMonopoly` (`monopoly`), `EconPPF` (`ppf`) and
`EconConstantElasticityEquilibrium` (`equilibrium`) had fixed defaults too.

**Fix:** a per-parse name registry (`KGAuthor/parsers/nameRegistry.ts`, reset at
the top of `parse()`) hands out those semantic defaults. The first claim on a
base name is still unqualified — every config that already references
`calcs.demand` keeps working, which is why the collision was fixed by numbering
rather than by switching the defaults to unique names — and later unnamed
objects of the same kind get `demand2`, `demand3`, and so on. Names the author
supplied are never rewritten, but they are registered, so a generated name never
lands on top of one; reusing a name explicitly now logs a warning instead of
silently dropping calcs. Covered by `src/__tests__/econ_object_names.test.ts`,
which asserts on parsed calcs rather than on rendered elements.

**Note for authors:** generated numbering follows construction order, so name
curves explicitly whenever you intend to reference them (see
`docs/schema/06-econ-objects.md`).

## 5. Documented functional-form names did not work — FIXED

**Symptom:** `EconIndifferenceCurve`, `EconIndifferenceMap`, `EconOptimalBundle`
(and the Lagrange/Slutsky/Hicks/LowestCost variants) and `EconDemandCurve` all
failed with `Cannot read properties of undefined (reading 'levelCurve')` — an
error naming neither the config nor the real problem.

**Cause:** `getUtilityFunction()` matched `CobbDouglas`, `Substitutes`,
`Complements`, `Concave`, `Quasilinear` and `CESFunction`. The names the schema
reference documents — and that the classes are exported under — are
`CobbDouglasFunction`, `LinearFunction`, `MinFunction`, `ConcaveFunction`,
`QuasilinearFunction` and `CESFunction`. Only `CESFunction` overlapped, so five
of the six documented forms fell off the end of the chain and returned
`undefined`.

**Fix:** both vocabularies are accepted, and an unrecognised name throws an error
that names itself and lists the valid options. Covered by
`src/__tests__/diagnostics.test.ts`.

## 6. Lines through the origin published a broken fixed point — FIXED

**Symptom:** `calcs.<name>.fixedPoint` came back as the literal string
`"((undefined)/(1 - 1))"`, so anything binding to it received a string instead of
a number. Reached by any line through the origin — including a `slope`-only def,
and a supply curve starting at the origin.

**Cause:** `Line.parseSelf()` tested its intercepts for truthiness, so an
intercept of `0` read as absent: `d.yIntercept` was never set, but the branch
below still interpolated it.

**Fix:** the intercepts are tested against `null`, which is what `Line` actually
reports for the absent intercept of a horizontal or vertical line. An intercept
of `0` now reaches `calcs` as `"0"` rather than being omitted.

## 7. Unresolved expressions failed silently — FIXED

`Model.evaluate()` catches every mathjs failure and returns the raw string. That
fallback is load-bearing — color names, LaTeX label text, forward references that
resolve on a later pass, and deliberate functions of `x` all fail to evaluate
legitimately — but it also let badly assembled expressions through unremarked.

Calcs are now swept once they have settled, and any value still carrying an
interpolated `undefined` is reported with its calc path, once rather than on
every parameter change. That token is the one unambiguous signal: it only ever
appears because a definition was missing a value when the expression was built.
Covered by `src/__tests__/diagnostics.test.ts`.

## 8. Two smaller calc-key collisions — FIXED

- `EconContractCurve` published its function under a hardcoded `calcs['cc']`, so
  two contract curves in one diagram overwrote each other. It is now keyed by
  name, with `'cc'` kept as the default so existing configs still resolve, and it
  goes through the name registry from issue 4 — a second unnamed contract curve
  is numbered (`cc2`) rather than dropped.
- `EconBudgetLine` published its endowment via `toString()` on a point object,
  emitting the literal `"[object Object]"`. It is now a nested calc
  (`calcs.<name>.endowment.x`), omitted when the line is defined by income.

Covered by `src/__tests__/calc_keys.test.ts` and `src/__tests__/econ_values.test.ts`.

## 9. A label's font size was silently discarded — FIXED

**Symptom:** `fontSize: 'params.big ? 14 : 10'` on a `Label` produced a label at whatever size it
inherited, with no warning and nothing wrong-looking in the config. A literal `fontSize: 18` worked,
so the key appeared to function.

**Cause:** `fontSize` was declared a **constant** (`view/viewObjects/label.ts:80`). A constant is
read once in the `UpdateListener` constructor and kept as-is unless it parses as a number, so the
expression was stored as its own source text and written out as `font-size: params.big ? 14 : 10pt`
— not a valid CSS length. The browser discards an invalid declaration and says nothing, which is
the same shape as issue 7: a value that looks like it means something and is dropped on the floor.

**Fix:** `fontSize` is an updatable, evaluated on every model update and applied in `redraw()`
rather than only in `draw()` — it has to be applied before the label's own width and height are
measured for alignment, not after. Covered by `src/__tests__/updatables_contract.test.ts`.

## 10. A curve's screen-reader text was never written — FIXED

**Symptom:** every `Curve` carried an **empty** `<title>` element. An author's `srTitle` and
`srDesc` were accepted, stored on the object, and announced to nobody.

**Cause:** `ViewObject.addScreenReaderDescriptions()` creates the `<title>`/`<desc>` elements and
`updateScreenReaderDescriptions()` fills them, and only `Point.redraw()` ever called the second
one. `Curve.draw()` called the first and no more.

**Fix:** `Curve.redraw()` now updates them. Found by P4's density tests, which assert that an
`indicator` panel — one that has dropped every visible label — is still describable; it was not,
and neither was a full-detail one. Covered by the screen-reader cases in
`src/__tests__/density.test.ts`.

# Open

## A. `multiplyDefs()` treats `0 * Infinity` as `0`

`multiplyDefs()` short-circuits to `0` whenever either operand is `0`, without
checking the other. `Infinity` is a real operand here — `Line` uses it for the
inverse slope of a horizontal line — so the product is reported as `0` where it
is mathematically undefined.

No defect has been traced to this in practice, and the short-circuit is load
bearing for horizontal and vertical line handling, so it is recorded rather than
changed. `divideDefs()` had the analogous flaw and *was* implicated (issue 2),
which is why that one was fixed and this one was not.

## B. A decoration's own `show` is dropped when its parent has one

A curve's, point's or segment's label is built by copying the parent's def, so it inherits the
parent's `show` — which is right, since a hidden curve's name must hide with it. But `setDefaults`
skips keys that already exist, so `label: { show: '...' }` is then **silently ignored**: there is no
way to hide a curve's label without hiding the curve. The two predicates should conjoin, the way
[a step's reveal](docs/schema/02-parameters-and-interactions.md) and a density level already do.

Recorded rather than fixed because it is the same one-line change in four constructors and none of
them is in P4's scope. Density does not depend on it — it conjoins onto the parsed def directly,
after the copy has been made — which is how the gap was found.

## C. Missing required keys produce opaque errors

An econ object built without the keys it needs interpolates `undefined` into its
generated expressions and surfaces as a mathjs type error naming neither the
object nor the missing key — for example `EconContractCurve` without `a`/`b`.
The calc sweep from issue 7 reports these once they reach the model, but there is
no up-front validation of required keys.

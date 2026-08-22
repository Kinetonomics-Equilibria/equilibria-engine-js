# Known issues

Findings from building the first real consumer of the engine (`apps/web`).
These are pre-existing defects inherited from the KGJS fork, not regressions
from the monorepo or packaging work — the code paths involved are untouched by
those changes.

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

## 2. `EconLinearEquilibrium` solves the wrong intersection — OPEN

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
caller's explicit `slope: -1` is discarded. `lineIntersection()` — whose formula
is itself correct — is then handed a degenerate line and returns `x = 0`.

**Why it is still open:** the fix is a precedence decision (should an explicit
`slope` beat a defaulted `point`? should `EconLinearDemand` stop defaulting
`point` at all?) that changes behaviour for every diagram built on `Line`, and
the repo has no coverage asserting econ *values* to catch fallout. It wants a
deliberate call plus value-level tests, not a quick patch.

**Workaround in use:** `apps/web/src/App.tsx` builds its supply-and-demand
diagram from primitive `Line` and `Point` objects with the equilibrium solved in
`calcs`, which is verified correct (`Q*=9`, `P*=11`).

## 3. React binding clobbers the engine's container class — OPEN, cosmetic

`KineticGraph.mount()` adds `.kg-container` to the container element via
`classList.add`. `EquilibriaChart` also sets `className` on that same element,
so the next React render after `setMounted(true)` resets the class attribute and
drops `.kg-container`. It is present in jsdom tests (no re-render is triggered
there) but absent in the browser.

Impact is limited to the two declarations under `.kg-container` in
`kgjs-theme.css` (`color` and `background-color`); the `--kg-*` custom
properties are defined on `:root`, so colors and axes are unaffected.

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

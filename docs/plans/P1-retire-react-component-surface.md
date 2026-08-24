# P1 — Retire the React component surface

**Lane:** bindings (plus one app edit, plus registry actions the user runs)
**Depends on:** nothing
**Unblocks:** P7 — and should land *before* it, so the card's assumptions are not ported forward
**Status:** Draft plan — not implemented

## Goal

`packages/react` stops being a published component library and becomes an app-internal binding: a
hook, a bare mount primitive, and the tests that protect them. `EquilibriaCard` and its styling go.
The package is withdrawn from npm and its documentation stops telling readers to install it.

When this is done there is exactly one theming system on screen (Mantine), exactly one owner of
panel chrome (the app), and no public API promise to honour while the study screen is being built.

## Why this shape

The card is a *documentation* abstraction — title, description, footer, `variant`, skeleton
shimmer, error panel, retry button. It is the right component for a README demo and the wrong one
for a study screen, where chrome is a panel name, a delta chip and a promote affordance owned by
the stage, and where a "card" wrapping each panel would be four competing containers.

The styling is worse than merely unnecessary: `styles.module.css` ships its own `--eq-*` theme with
its own light/dark handling, while the app is themed with Mantine tokens. Two theming systems on one
screen will drift, and the drift shows up as diagrams that look subtly wrong in dark mode.

The hook is the opposite case. It is small, and it encodes real bugs found the hard way — it should
survive almost untouched.

Doing this **before** P7 matters. If the stage components are built while the card still exists,
they will inherit its assumptions: that a panel owns its own chrome, that loading is a per-panel
state, that a panel is independently mountable. Under Fork 1 = A none of those are true.

## Current state

- `packages/react/src/` — `EquilibriaChart.tsx` (~60 lines, mostly `KG_CONTAINER_CLASS` handling),
  `EquilibriaCard.tsx` (title/description/footer/variant/skeleton/error/retry), `useEquilibria.ts`,
  `types.ts`, `styles.module.css` (~200 lines), `index.ts`.
- `useEquilibria` carries three fixes documented in its own comments
  (`packages/react/src/useEquilibria.ts`): `isReady` is **derived, not stored** (`:78`) because
  `KineticGraph.mount()` catches internally and emits `'error'` synchronously during the mount call,
  so a stored flag reported a broken chart as ready; callbacks live in a ref (`:82-84`) so listeners
  never go stale without a remount; destroy-on-cleanup swallows errors (`:88-95`, `:138-150`).
  `updateParams` calls `instance.update({ params })` (`:160-164`).
- `index.ts` re-exports `KG_EVENTS` and `KG_CONTAINER_CLASS`. The second is load-bearing: React
  rewrites the `class` attribute it owns and drops the class the engine adds via `classList.add` —
  documented at `packages/engine/src/ts/kg.ts:10-17` and in the index comment.
- `index.ts` also imports `katex/dist/katex.min.css` as a package side effect, and `katex` is a
  dependency of **both** packages though only the engine uses it
  (`packages/engine/src/ts/view/viewObjects/label.ts:3`).
- `styles.module.css` sets `min-height: 300px` on `.chartContainer`, which beats the inline height
  the engine writes — a `ThreeHorizontalGraphs` canvas is 210px tall inside a 300px box.
- Tests: `packages/react/src/__tests__/` — `EquilibriaCard.test.tsx` (217), `useEquilibria.test.tsx`
  (292), `EquilibriaChart.test.tsx` (152), `engineMock.ts` (130), `index.test.ts` (29),
  `setup.ts` (27).
- `packages/react/package.json` is `"private": true` locally, but **`equilibria-react@0.2.0` is
  published on npm** — created 2026-03-03, 2 downloads in the last week, single maintainer
  `kinetonomics-equilibria`. `equilibria-engine-js@1.0.8` is published too, and its README says
  `npm install equilibria-react`.
- `apps/web/src/App.tsx` is the only consumer of `EquilibriaCard`.
- Nine references across six files tell readers to install or use the standalone package:
  `docs/getting-started.md` (three, including an install line, plus a claim at `:157` that the
  components handle container sizing), `docs/index.md:47`, `docs/interactivity.md:10` (two),
  `packages/engine/README.md:42-54` (three, including an install line), root `README.md:17,45,62`,
  and `packages/react/README.md` in its entirety.

## Approach

Ordered so the app builds at every step.

1. **Port the tests worth keeping, before deleting anything.** From `EquilibriaCard.test.tsx`,
   identify cases that actually test the *hook's* behaviour through the card — error surfacing,
   ready state, retry — and move them onto `useEquilibria` directly or onto `EquilibriaChart`. Cases
   that test card chrome (does the footer render, does the variant class apply) simply go. Keep
   `engineMock.ts` untouched: it is the expensive asset and it is component-agnostic.

2. **Replace the card in `apps/web/src/App.tsx`.** Render `EquilibriaChart` inside app-owned markup
   — a Mantine `Paper` or plain `Box` with the heading and description as ordinary app elements,
   themed with the app's tokens. This is a temporary shape; P7 replaces it with the stage. Doing it
   now is what lets step 3 delete the card without breaking the build.

3. **Delete the card.** `EquilibriaCard.tsx`, its test file, `styles.module.css`, and the
   `EquilibriaCardProps` / `CardVariant` types in `types.ts`. Remove the exports from `index.ts`.
   The `min-height: 300px` defect dies with the stylesheet — note it in the commit message, since it
   is a fix that will otherwise look like a side effect.

4. **Reduce `EquilibriaChart` to a mount primitive.** It keeps `KG_CONTAINER_CLASS`, the ref, the
   error/ready callbacks and `className`/`style` passthrough. It loses any styling opinion,
   including the loading fade — which belongs to whatever renders it. Check what
   `chartContainerLoading` / `chartContainerReady` were doing and make sure removing them does not
   leave the container invisible.

5. **Untangle KaTeX.** Remove the `katex/dist/katex.min.css` side-effect import from `index.ts` and
   the `katex` dependency from `packages/react/package.json`. The engine owns KaTeX; confirm the
   engine actually ships or requires that stylesheet itself — if it does not, this is a real bug
   that the React package was accidentally papering over, and the fix belongs in the engine, not in
   restoring the import here.

6. **Rewrite the nine documentation references.** Each becomes either a pointer to
   `packages/react` as an internal package, or is deleted where it exists only to sell the
   standalone library. `packages/react/README.md` becomes short internal notes: what the hook does,
   why `isReady` is derived, why `KG_CONTAINER_CLASS` must be rendered by React — the three things a
   future reader will otherwise rediscover painfully. `docs/getting-started.md:157`'s claim about
   the components handling container sizing must go; it will be false.

7. **Confirm the package's status.** `"private": true` is already correct; make sure nothing in the
   root `package.json` workspace scripts still tries to build or publish it as a distributable.

8. **Registry and repo actions — the user runs these, not the implementer.**
   - `npm unpublish equilibria-react --force`. The package meets npm's post-72-hour criteria
     (single maintainer, 2 downloads/week). **One-way**: that name and version can never be
     republished, and the name is blocked for 24 hours.
   - `equilibria-engine-js@1.0.8`'s published README still says `npm install equilibria-react`.
     Registry copy is frozen per version, so this only changes with a new engine release — fold the
     README fix into whatever engine version ships next rather than cutting a release for it.
   - Archive the standalone GitHub repo. Already redundant: `repository.directory` points at
     `packages/react` in this monorepo.

## API / schema surface

Removed: `EquilibriaCard`, `EquilibriaCardProps`, `CardVariant`, the `--eq-*` custom properties, the
package stylesheet.

Kept: `useEquilibria` (unchanged signature), `EquilibriaChart` (narrowed — `variant`-adjacent props
gone), `KG_EVENTS`, `KG_CONTAINER_CLASS`, `EquilibriaChartProps`, `ParamChangeEvent`,
`UseEquilibria*` types.

No deprecation period and no compatibility shim. The package is private, has two downloads a week,
and is about to be unpublished; a shim would be ceremony for an audience of nobody.

## Tests

- `packages/react/src/__tests__/EquilibriaCard.test.tsx` — deleted.
- `packages/react/src/__tests__/useEquilibria.test.tsx` — gains the ported cases from step 1.
  Specifically keep coverage of: mount failure surfaces as `error` and **not** as `isReady`
  (the derived-state bug), callbacks fire after a re-render without a remount, destroy on unmount,
  `retry` re-mounts, `updateParams` reaches the instance.
- `packages/react/src/__tests__/EquilibriaChart.test.tsx` — trimmed to the mount primitive:
  the container renders `KG_CONTAINER_CLASS`, the ref is attached, `className` passes through.
- `packages/react/src/__tests__/index.test.ts` — updated to assert the *new* export surface, and
  that importing the package no longer pulls in a stylesheet.
- `apps/web` — whatever smoke coverage exists (`apps/web/tests/app.spec.ts`) must still pass after
  step 2; check it does not assert on card markup.

## Risks and unknowns

- Step 5 could expose that KaTeX styling was only ever arriving via the React package's side-effect
  import. If diagram labels render unstyled after removing it, that is a pre-existing engine
  packaging gap, not a regression introduced here — but it will look like one.
- The card's loading fade may be masking a flash of unstyled or unsized diagram at mount. Removing
  it might make an existing rough edge visible; that is worth seeing rather than hiding, but expect
  it.
- `apps/web/tests/app.spec.ts` and the screenshot script may assert on card DOM.
- Unpublishing is irreversible in a way the rest of this plan is not. Everything else here can be
  reverted with `git revert`; that cannot.
- Deleting `styles.module.css` also deletes the only dark-mode handling the chart container had.
  Until the app supplies equivalent theming, diagrams may sit on the wrong ground in dark mode.

## Done when

- [ ] `EquilibriaCard`, its types, its tests and `styles.module.css` are gone.
- [ ] `apps/web` renders its diagram through app-owned markup and the suite passes.
- [ ] `EquilibriaChart` is a bare mount primitive with no styling opinion.
- [ ] `katex` is a dependency of the engine only, and the package no longer imports a stylesheet.
- [ ] The nine doc references are rewritten or removed; `packages/react/README.md` is internal notes
      covering the three non-obvious behaviours.
- [ ] The user has run the unpublish and archived the repo, and the engine's README fix is queued
      for the next release.

## Out of scope

- Building the replacement stage, rail or panel chrome — P7.
- Any change to `useEquilibria`'s mount/remount semantics. The remount-on-config-identity limitation
  is real and P7 owns it.
- Engine packaging of the KaTeX stylesheet, if step 5 turns out to expose a gap. Record it, raise it
  as its own piece of work.

# P1 — Retire the React component surface

**Lane:** bindings (plus one app edit, plus registry actions the user runs)
**Depends on:** nothing
**Unblocks:** P7 — and should land *before* it, so the card's assumptions are not ported forward
**Status:** ⚠️ **Code complete** (2026-08-27); **step 8 is outstanding and only the user can do it.**
Everything in steps 1–7 has landed. The npm unpublish and the GitHub archive have *not* been done —
they are irreversible and are the user's to run.

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

5. **Untangle KaTeX.** ✅ Done — **and the suspected bug was real.** The engine imports `katex` the
   *library* (`view/viewObjects/label.ts:3`) but never imported `katex/dist/katex.min.css`. The
   React package's side-effect import was the only thing supplying it, which means a non-React
   consumer of the engine has been getting unstyled maths all along. Fixed where this plan says it
   belongs — in the engine, beside the theme stylesheet it already imports
   (`packages/engine/src/ts/kg.ts`) — rather than by restoring the import here. Verified by
   Playwright: the four KaTeX annotations still render and are still styled.

   What is *not* fixed, and is genuinely out of scope: the engine's `exports` points at TypeScript
   source, not a built bundle, so `equilibria-engine-js/dist/style.css` — which `README.md` and
   `docs/getting-started.md` both told consumers to import — is not something this repository
   produces. Whether the published `1.0.8` artifact carries either stylesheet is unverified. Both
   docs now say so explicitly instead of asserting something unchecked.

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

- ✅ **Step 5 did expose exactly that**, and it was resolved by giving the engine the import. See
  step 5. The residual packaging question is recorded in both READMEs rather than assumed away.
- ✅ **The loading fade was not masking anything visible.** Screenshot after removal:
  `apps/web/screenshots/p1-after-card-removal.png`. The diagram mounts clean, and it now renders at
  its natural size rather than inside the stylesheet's `min-height: 300px` box — which makes the
  fix visible rather than merely asserted.
- ✅ `apps/web/tests/app.spec.ts` asserted only on the heading text (`Market equilibrium`), which
  the app-owned `Title` still renders, so all four Playwright tests passed unchanged. Two test names
  and one comment referring to "the card" were updated to say "the app-owned panel".
- Unpublishing is irreversible in a way the rest of this plan is not. Everything else here can be
  reverted with `git revert`; that cannot.
- **Still open: deleting `styles.module.css` removed the only dark-mode handling the chart
  container had.** The app's `Paper` supplies the surface, and the engine's own
  `css/kgjs-theme.css` hangs text and background colours on `.kg-container` — but this has only
  been checked in light mode. Dark mode is unverified and worth a look before P7 builds on it.

## Done when

- [x] `EquilibriaCard`, its types, its tests and `styles.module.css` are gone. `css.d.ts` went with
      the stylesheet, since nothing else in the package imports CSS.
- [x] `apps/web` renders its diagram through app-owned markup — a Mantine `Paper` with a `Title`
      and `Text` — and the whole suite passes: 162 engine, 32 React, 4 Playwright.
- [x] `EquilibriaChart` is a bare mount primitive with no styling opinion. Its container is still
      rendered through a failed mount, so the ref stays attached and `retry()` has somewhere to go.
- [x] `katex` is a dependency of the engine only, and the package no longer imports a stylesheet.
- [x] The nine doc references are rewritten or removed; `packages/react/README.md` is internal notes
      covering the three non-obvious behaviours (plus the un-fixed remount-on-config-identity one).
- [ ] **The user has run the unpublish and archived the repo** — outstanding, see step 8.
      The engine's published README fix is queued for whatever version ships next.

## Out of scope

- Building the replacement stage, rail or panel chrome — P7.
- Any change to `useEquilibria`'s mount/remount semantics. The remount-on-config-identity limitation
  is real and P7 owns it.
- Engine packaging of the KaTeX stylesheet, if step 5 turns out to expose a gap. Record it, raise it
  as its own piece of work.

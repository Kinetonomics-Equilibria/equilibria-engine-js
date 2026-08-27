# `packages/react` — internal React bindings

Not a component library, and not published. `equilibria-react` was on npm until this package
was withdrawn to app-internal status; nothing outside this monorepo should depend on it, and
`apps/web` is its only consumer.

What it is:

- **`useEquilibria(config, options?, callbacks?)`** — the whole of the lifecycle. Builds a
  `KineticGraph`, mounts it into a ref, destroys it on unmount, re-mounts when the config
  *identity* changes, forwards the three interaction events, and surfaces `error`, `isReady`,
  `retry()` and `updateParams()`.
- **`<EquilibriaChart />`** — a div with a ref and the engine's container class on it. No
  chrome, no theme, no sizing. Panel chrome belongs to whatever renders it.
- **`<Stage />`** — several panels, one engine. Measures its own box, compiles every
  arrangement it can be in into one `CustomLayout`, mounts one engine, and floats an overlay
  over each panel. Promotion is a param update: no remount, no flash, no lost drag.
- **`arrange` / `toCustomLayout` / `pixelBox`** — the arrangement arithmetic, exported on its
  own because it is a pure function of a box and a list of keys and an app may want the
  numbers without rendering anything.
- Re-exports of `KG_EVENTS` and `KG_CONTAINER_CLASS`.

`Stage` supplies mechanism only. Which panel is focal, what each is called and what its chip
says arrive as props — if economics vocabulary appears in this package, the line has been
crossed. `apps/web/src/StudyScreen.tsx` is what the other side of that line looks like.

There used to be an `EquilibriaCard` — title, description, footer, `variant`, skeleton
shimmer, error panel, retry button — with a `styles.module.css` carrying its own `--eq-*`
theme and light/dark handling. It is gone. Two theming systems on one screen drift, and the
drift shows up as diagrams that look subtly wrong in dark mode. Its stylesheet also set
`min-height: 300px` on the chart container, which beat the height the engine writes, so a
210px `ThreeHorizontalGraphs` canvas sat in a 300px box.

## Four things that will otherwise be rediscovered painfully

**1. `isReady` is derived, never stored.** `KineticGraph.mount()` does not throw when a mount
fails: it catches internally and emits `'error'` — *synchronously*, while control is still
inside the `kg.mount(el)` call. A stored flag meant the `setMounted(true)` on the next line
overwrote the failure that had already been recorded, and consumers were told a broken chart
was ready. `isReady = mounted && error === null` cannot disagree with `error`, whatever the
ordering. See `useEquilibria.ts`.

**2. `KG_CONTAINER_CLASS` must be rendered by React, not left to the engine.** The engine adds
its class with `classList.add` in `mount()`. React owns the `class` attribute of an element it
renders and rewrites it on the next render — including the render triggered by the mount
itself — which silently dropped the class and took the theme's text and background colours
with it. `<EquilibriaChart />` therefore renders the class itself, and any component building
its own container div must do the same. This is documented at the source too
(`packages/engine/src/ts/kg.ts`).

**3. Event callbacks live in a ref.** They are stored in `callbacksRef` and re-assigned on
every render, so a listener registered at mount always calls the *current* callback. Passing
them to the engine directly would mean either stale closures or a re-mount on every parent
render, and re-mounting rebuilds the whole diagram.

**4. A layout's fractions belong to a canvas *shape*, not a canvas size.** `arrange` computes
in a normalised canvas — 1 wide, `1/aspectRatio` tall — so two stages of the same proportions
produce identical fractions. This is not tidiness: `useEquilibria` remounts when the config's
identity changes, and with pixel padding the fractions moved on every pixel of a window drag,
rebuilding the diagram each time. `Stage` also quantises the ratio to a hundredth, so only a
real change of proportions costs a rebuild.

Still true, and still a limitation: **the hook re-mounts whenever `config` changes identity.**
Callers must `useMemo` the config. `Stage` handles this for the things it owns — its config
memo deliberately excludes `focused` and `mode`, because those move through params — but a
caller whose config varies with state still pays for it.

## Tests

```bash
npm test --workspace=equilibria-react
```

`src/__tests__/engineMock.ts` is the expensive asset: a fake `KineticGraph` that reproduces
the engine's real failure semantics, including emitting `'error'` synchronously during
`mount()`. It is component-agnostic — reach for it rather than mocking afresh. Its
construct/destroy counts are also what pins the no-remount guarantee: `stage.test.tsx` asserts
on them, because a promotion that quietly rebuilds the engine looks identical from the DOM.

**A test file that mocks the engine must import it too.** A `vi.mock` factory that reaches for
the mocked module — through `importActual`, and through `engineMock`, which imports it as well
— deadlocks unless the test file itself pulls that module in first. The symptom is a run that
hangs before a single test executes, with no error and no output, so the import at the top of
`stage.test.tsx` is load-bearing and is commented as such.

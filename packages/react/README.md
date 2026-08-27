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
- Re-exports of `KG_EVENTS` and `KG_CONTAINER_CLASS`.

There used to be an `EquilibriaCard` — title, description, footer, `variant`, skeleton
shimmer, error panel, retry button — with a `styles.module.css` carrying its own `--eq-*`
theme and light/dark handling. It is gone. Two theming systems on one screen drift, and the
drift shows up as diagrams that look subtly wrong in dark mode. Its stylesheet also set
`min-height: 300px` on the chart container, which beat the height the engine writes, so a
210px `ThreeHorizontalGraphs` canvas sat in a 300px box.

## Three things that will otherwise be rediscovered painfully

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

A fourth, unfixed: **the hook re-mounts whenever `config` changes identity.** Callers must
`useMemo` the config or every parent render rebuilds the diagram. This is a real limitation —
it makes a config that varies with state expensive — and it is P7's to address, not something
to work around here.

## Tests

```bash
npm test --workspace=equilibria-react
```

`src/__tests__/engineMock.ts` is the expensive asset: a fake `KineticGraph` that reproduces
the engine's real failure semantics, including emitting `'error'` synchronously during
`mount()`. It is component-agnostic — reach for it rather than mocking afresh.

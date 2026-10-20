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
- **`<Stage />`** — several panels, one engine. Measures its own box, mounts one engine whose
  panels' rects are presentation params, lays it out again with the engine's `relayout` whenever
  the arrangement changes, and floats an overlay over each panel. Promotion, a reveal and a
  resize — a change of shape included — are each relayouts of the same engine: no remount, no
  flash, no lost drag, and no lost ghost. A promotion or a change of mode is **played**: for
  300ms the stage lays the engine out at the rects in between, a frame at a time, and the
  panel getting smaller fades out of the way of the one coming forward (`motion.ts`). A reveal
  and a resize land in one relayout, and so does everything for a student who prefers reduced
  motion. Each panel
  has a **role** — `focal`, `rail`, `strip`, `shelf` or `grid` — which sets the level of detail
  it draws at and tells the app's chrome which side of the panel it may use. `chromeRoom` says
  how many pixels that chrome takes, and the stage keeps it clear along with the room the
  engine's own axes need. A `shelf` is a filmstrip too narrow for its captions beside its
  glyphs, captioned above them instead, and only an app that gives it room gets one. Only the
  rail, the strip and the shelf lay a promote button across a panel; a grid panel is dragged
  like the focal one, and its chrome is handed `promote` instead.
- **`arrange` / `toCustomLayout` / `layoutParams` / `pixelBox`** — the arrangement arithmetic,
  exported on its own because it is a pure function of a box and a list of keys and an app may
  want the numbers without rendering anything. `toCustomLayout` declares the rect params and
  `layoutParams` gives their values for an arrangement.
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

## Five things that will otherwise be rediscovered painfully

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

**4. A change of shape must not rebuild the engine.** A remount is a new model, and a new
model has no `prev`: the ghost of the curve the student just moved, every delta beside a panel
and the sentence under the stage all go with the old one. The stage used to compile every
arrangement into one `CustomLayout` of ternaries, which held every focus, mode and reveal but
not a new canvas shape — every number in it was for one — so any resize that moved the
proportions by a hundredth rebuilt the diagram, and a host restoring the lesson onto the new
engine had to snapshot to keep the restore from being drawn as a move, which is what forgot the
student's. Now each rect is four presentation params, the engine's `relayout` takes a new aspect
ratio in the same redraw, and the config is built once. `arrange` is still scale-free —
fractions of a normalised canvas, 1 wide and `1/aspectRatio` tall — but that is a property of the
design now, not a defence against rebuilds.

The exception to scale-free is **room**. Tick labels, axis titles and the app's captions sit
outside a panel at fixed pixel offsets, and a gutter that was a fraction of the canvas came to
18px where 50 were needed — the grid's rows printed over each other. So room is asked for in
pixels, and `Stage` arranges at the box it measures *now*, every time; it used to measure only
when the shape changed, because each new arrangement was a new engine.

**5. The stage's resize reaches the engine before the browser paints.** The engine observes its
own container and redraws at the new width — at the old proportions — as soon as the box
changes. `Stage`'s observer flushes its render synchronously and lays the engine out in a layout
effect, so the drawing and the captions take the new shape in the same frame rather than one
apart.

Still true, and still a limitation: **the hook re-mounts whenever `config` changes identity.**
Callers must `useMemo` the config. `Stage` handles this for everything it owns — its config
memo depends on the config and its panels and nothing else — but a caller whose config varies
with state still pays for it.

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

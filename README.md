# Equilibria

Monorepo for the **Equilibria** student webapp, the engine that powers it, and
its React bindings — a headless rendering engine for interactive kinetic graphs,
aimed at economics diagrams.

> [!NOTE]
> This project is a hard fork of [KGJS](https://github.com/cmakler/kgjs), originally
> created by Chris Makler.

## Packages

| Package | Directory | Description |
|---|---|---|
| [`web`](./apps/web) | `apps/web` | The student-facing webapp (Vite + React). |
| [`equilibria-engine-js`](./packages/engine) | `packages/engine` | The headless D3/mathjs rendering engine. |
| [`equilibria-react`](./packages/react) | `packages/react` | React components and hooks wrapping the engine. |

Both packages are internal workspace libraries — they are not published to npm.
They export TypeScript source directly, so the app compiles them as part of its
own bundle and there is no build step between the two.

## Getting started

The repository uses npm workspaces, so a single install at the root covers
everything.

```bash
npm install
npm run dev        # start the webapp on http://localhost:5173
npm test           # engine + React test suites
npm run typecheck  # all workspaces
npm run build      # production bundle for the app
```

Because the app imports engine source rather than a built bundle, an edit
anywhere under `packages/engine/src` hot-reloads in the browser immediately — no
rebuild, and no ordering constraint between the packages.

## Checking the app in a browser

`npm test` runs the engine and React suites under jsdom, and the React tests
mock the engine — so nothing in it renders a real diagram. These two commands
drive the actual app in headless Chromium against `npm run dev`:

```bash
npm run test:browser   # smoke-test the running app
npm run screenshot     # capture apps/web/screenshots/app.png
```

Both start a dev server if one isn't up and stop it afterwards; if you already
have `npm run dev` open they attach to it and leave it alone. On a machine that
has never run Playwright, install the browser once with
`npx playwright install chromium`.

The tests live in [`apps/web/tests`](./apps/web/tests) and assert the numbers
the diagram resolves to, not just that an SVG appeared — `dataCoordinates()`
reads a rendered point back through the axis ticks into graph units, so a
diagram that solves the wrong system fails even though it still looks like a
diagram. That is the gap [`NOTES.md`](./NOTES.md) blames for the econ defects
that passed CI. `npm run test:browser:ui` opens Playwright's UI mode for
stepping through a failure, and a failed run leaves a screenshot and a trace in
`apps/web/test-results/` (`npx playwright show-trace <path>`).

`screenshot` is the one to reach for when developing without a screen — a
container or an SSH session — since it is the only way to actually see what a
change did to a diagram. It takes `--out`, `--url`, `--width` and `--height`.

## Documentation

Engine guides live in [`docs/`](./docs):

1. [Getting Started](./docs/getting-started.md)
2. [Architecture Overview](./docs/architecture.md)
3. [Configuration Specification](./docs/configuration.md)
4. [API & Interactivity](./docs/interactivity.md)

There is also a schema reference under [`docs/schema/`](./docs/schema).

## Repository

[https://github.com/Kinetonomics-Equilibria/equilibria-engine-js](https://github.com/Kinetonomics-Equilibria/equilibria-engine-js)

## License

MIT

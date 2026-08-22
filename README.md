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

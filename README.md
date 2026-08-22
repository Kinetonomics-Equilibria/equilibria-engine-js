# Equilibria

Monorepo for the **Equilibria** engine and its React bindings — a headless
rendering engine for interactive kinetic graphs, aimed at economics diagrams.

> [!NOTE]
> This project is a hard fork of [KGJS](https://github.com/cmakler/kgjs), originally
> created by Chris Makler.

## Packages

| Package | Directory | Description |
|---|---|---|
| [`equilibria-engine-js`](./packages/engine) | `packages/engine` | The headless D3/mathjs rendering engine. |
| [`equilibria-react`](./packages/react) | `packages/react` | React components and hooks wrapping the engine. |

Each directory is a self-contained npm package and is published independently.

## Getting started

The repository uses npm workspaces, so a single install at the root covers both
packages and links `equilibria-react` against the local engine build — no
`npm link` or publish step is needed to test a change end to end.

```bash
npm install
npm run build      # builds the engine, then React (that order matters)
npm test           # engine test suite
npm run typecheck  # both packages
```

To work on one package at a time:

```bash
npm run build:engine
npm run build:react
```

`equilibria-react` imports the engine by package name. npm resolves that to
`packages/engine` through the workspace symlink, so engine changes are picked
up as soon as the engine is rebuilt.

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

# Equilibria Engine

Welcome to the **Equilibria Engine** (`equilibria-engine-js`), a headless Javascript rendering engine for interactive kinetic graphs. 

> [!NOTE] 
> **Acknowledgement:** This project is a hard fork of the excellent [KGJS](https://github.com/cmakler/kgjs) engine originally created by Chris Makler. The intent of the Equilibria fork is to decouple the core mathematical engine from its original monolithic application structure, making it substantially easier for developers to integrate economic models into modern websites, SPAs (React/Vue/Svelte), and custom data visualization pipelines.

## Installation

```bash
npm install equilibria-engine-js
```

The engine imports both stylesheets it needs — its own theme and KaTeX's — as a side effect of
`kg.ts`, so consuming it from source requires no CSS import in your application.

> **Unresolved:** this package's `exports` points at TypeScript source (`./src/ts/kg.ts`), not a
> built bundle, so `equilibria-engine-js/dist/style.css` — which older docs told consumers to
> import — is not something this repository produces. Whether the published `1.0.8` artifact
> carries the KaTeX stylesheet has not been verified. Packaging is its own piece of work.

## Documentation

Comprehensive documentation has been added to assist developers in utilizing and configuring the headless engine. 

Full guides live in the [`docs/`](https://github.com/Kinetonomics-Equilibria/equilibria-engine-js/tree/master/docs) directory of the repository:

1. [Getting Started](https://github.com/Kinetonomics-Equilibria/equilibria-engine-js/blob/master/docs/getting-started.md)
2. [Architecture Overview](https://github.com/Kinetonomics-Equilibria/equilibria-engine-js/blob/master/docs/architecture.md)
3. [Configuration Specification](https://github.com/Kinetonomics-Equilibria/equilibria-engine-js/blob/master/docs/configuration.md)
4. [API & Interactivity](https://github.com/Kinetonomics-Equilibria/equilibria-engine-js/blob/master/docs/interactivity.md)

## Dependencies

The engine relies heavily on:

* [D3](https://d3js.org) for drawing 2D diagrams
* [mathjs](https://mathjs.org/) for mathematical constraint solving and evaluation
* [KaTeX](https://katex.org) for rendering mathematical typographic text — `kg.ts` imports `katex/dist/katex.min.css` itself, since the engine is what uses it

## React Integration

React bindings live alongside this package in the same monorepo, at `packages/react`. They
are **internal** — a `useEquilibria()` hook and a bare `<EquilibriaChart />` mount primitive,
not a published component library — and they are not on npm. If you are consuming this engine
from React outside the monorepo, mount it yourself: create a container, render
`KG_CONTAINER_CLASS` on it from React (the engine's own `classList.add` is dropped when React
rewrites the attribute), and call `mount()` in an effect.

## Repository
[https://github.com/Kinetonomics-Equilibria/equilibria-engine-js](https://github.com/Kinetonomics-Equilibria/equilibria-engine-js)


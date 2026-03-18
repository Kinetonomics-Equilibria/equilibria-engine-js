# Equilibria Engine

Welcome to the **Equilibria Engine** (`equilibria-engine-js`), a headless Javascript rendering engine for interactive kinetic graphs. 

> [!NOTE] 
> **Acknowledgement:** This project is a hard fork of the excellent [KGJS](https://github.com/cmakler/kgjs) engine originally created by Chris Makler. The intent of the Equilibria fork is to decouple the core mathematical engine from its original monolithic application structure, making it substantially easier for developers to integrate economic models into modern websites, SPAs (React/Vue/Svelte), and custom data visualization pipelines.

## Installation

```bash
npm install equilibria-engine-js
```

You will also need to import the engine's CSS and the KaTeX CSS (for math rendering) in your application:

```javascript
import "equilibria-engine-js/dist/style.css";
import "katex/dist/katex.min.css"; 
```

## Documentation

Comprehensive documentation has been added to assist developers in utilizing and configuring the headless engine. 

Please see the local `/docs` directory for guides:

1. [Getting Started](./docs/getting-started.md)
2. [Architecture Overview](./docs/architecture.md)
3. [Configuration Specification](./docs/configuration.md)
4. [API & Interactivity](./docs/interactivity.md)

## Dependencies

The engine relies heavily on:

* [D3](https://d3js.org) for drawing 2D diagrams
* [mathjs](https://mathjs.org/) for mathematical constraint solving and evaluation
* [KaTeX](https://katex.org) for rendering mathematical typographic text (requires `katex/dist/katex.min.css`)

## React Integration

For React and Next.js applications, the companion package [`equilibria-react`](https://github.com/Kinetonomics-Equilibria/equilibria-react) provides drop-in components with lifecycle management, event forwarding, and styled card wrappers:

```bash
npm install equilibria-react equilibria-engine-js
```

It provides:
- **`<EquilibriaChart />`** — Minimal chart component
- **`<EquilibriaCard />`** — Styled card with title, loading skeleton, and error handling
- **`useEquilibria()`** — Full-control hook with `updateParams` and event callbacks
- Automatic re-export of `KG_EVENTS` for event subscriptions

See the [equilibria-react README](https://github.com/Kinetonomics-Equilibria/equilibria-react) for full API documentation.

## Repository
[https://github.com/Kinetonomics-Equilibria/equilibria-engine-js](https://github.com/Kinetonomics-Equilibria/equilibria-engine-js)


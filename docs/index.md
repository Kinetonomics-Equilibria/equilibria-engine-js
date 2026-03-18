# Equilibria Engine Documentation

Welcome to the documentation for the **Equilibria Engine** (`equilibria-engine-js`), a headless Javascript rendering engine for interactive kinetic graphs. 

> [!NOTE] 
> **Acknowledgement:** This project is a hard fork of the excellent [KGJS](https://github.com/cmakler/kgjs) engine originally created by Chris Makler. The intent of the Equilibria fork is to decouple the core mathematical engine from its original monolithic application structure, making it substantially easier for developers to integrate economic models into modern websites, SPAs (React/Vue/Svelte), and custom data visualization pipelines.

The primary purpose of the engine is to interpret economic models, data structures, and views defined in JSON/YAML configuration formats and render them into standalone, highly interactive diagrams.

## Overview

Unlike traditional visualization libraries, the Equilibria engine is focused on **state-driven** diagrams. You define mathematical relationships through **Parameters**, **Calculations**, and **Restrictions**. As the user interacts with the diagram (e.g. dragging a curve, sliding a control), the engine re-evaluates the mathematical models and smoothly transitions the SVG view in real-time.

The engine relies on:
* **D3.js** for handling the SVG DOM, rendering elements, and orchestrating smooth structural transitions.
* **MathJS** for parsing string-based mathematical expressions and evaluating them dynamically.
* **KaTeX** for formatting equations and rendering high-quality math text on the diagram.

## Why "Headless"?

The engine focuses solely on translating configuration logic into an interactive graphic payload within a specified DOM node. It intentionally leaves the surrounding layout, UI controls (like interactive sidebars), and application routing to the host website or application.

## Table of Contents

1. [Getting Started](./getting-started.md)
   Learn how to import the engine into your project, initialize it, and mount a graphic.
2. [Architecture Overview](./architecture.md)
   Understand the Model/View/Controller/KGAuthor separation that makes the engine fast and flexible.
3. [Configuration Specification](./configuration.md)
   Reference for the configuration schema: declaring params, scales, layouts, and view objects.
4. [Interactivity & API](./interactivity.md)
   Communicate with the running engine by triggering updates and listening to events.

### Schema Guides

For detailed guidance on authoring YAML schemas with the KGAuthor transpiler:

5. [Schema: Getting Started](./schema/01-getting-started.md)
6. [Schema: Parameters & Interactions](./schema/02-parameters-and-interactions.md)
7. [Schema: Layouts](./schema/03-layouts.md)
8. [Schema: Graphs & Scales](./schema/04-graphs-and-scales.md)
9. [Schema: Graph Objects](./schema/05-graph-objects.md)
10. [Schema: Economic Components](./schema/06-econ-objects.md)

### React Companion Package

For React and Next.js applications, see the companion package [`equilibria-react`](https://github.com/Kinetonomics-Equilibria/equilibria-react), which provides drop-in components (`<EquilibriaChart />`, `<EquilibriaCard />`), the `useEquilibria()` hook, and automatic event forwarding.

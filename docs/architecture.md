# Architecture Overview

The Equilibria engine is built on a clear separation of concerns, heavily influenced by Model-View-Controller (MVC) paradigms, optimized for rendering fast mathematical updates.

The core modules located in `src/ts/` are broadly divided into:

1. **Model** (`src/ts/model/`): The source of truth for all mathematical state.
2. **View** (`src/ts/view/`): The D3-powered DOM rendering engine.
3. **Controller** (`src/ts/controller/`): The interaction layer that handles dragging and user input.
4. **KGAuthor** (`src/ts/KGAuthor/`): The transpiler that expands high-level schemas into low-level view objects.

## 1. Model: State & Mathematics

At the heart of the engine is the `Model` class (`src/ts/model/model.ts`), instantiated when you provide a configuration object. The model acts as a reactive state container, primarily housing:

* **Params** (`src/ts/model/param.ts`): The independent variables of your diagram (e.g., $price=10$, $quantity=5$). 
* **UpdateListeners** (`src/ts/model/updateListener.ts`): Dependent variables constructed dynamically using **MathJS**. The engine utilizes a flattened execution scope; when an underlying param changes, the update listeners traverse the dependency graph and recalculate. You can refer to `params`, `calcs`, `colors`, and `idioms` directly as variables dynamically within Math expressions without prefix paths.
* **Restrictions** (`src/ts/model/restriction.ts`): Rules that prevent parameters from exceeding certain bounds or satisfying particular conditions during interactions.

Whenever an interaction changes a Param's value, the Model performs a fast update loop:
1. It hypothetically evaluates the new mathematical state.
2. It validates the new mathematical properties against all active Restrictions. 
3. If strictly valid, it completes the broadcast update to the View; if invalid, it rolls the underlying param back to its previous legal state.
4. For valid updates, View objects redraw their coordinates, math text, and SVGs smoothly.

## 2. View: The Rendering Layer

The `View` (`src/ts/view/view.ts`) handles painting to the screen using **D3.js**. 

The lifecycle of the view goes as follows:

1. **Initialization:** The view creates the root SVG tag within the host container and applies the provided `aspectRatio`. It also generates an `svgContainerDiv` for absolute positioning of overlay text objects.
2. **Scales Execution:** The engine creates `Scale` instances (`src/ts/view/scale.ts`). These scale objects are crucial: they convert mathematical domain values (e.g., $x \in [0, 20]$) into raw pixel locations on the viewport. 
3. **ViewObjects Instantiation:** Geometric elements (`Point`, `Segment`, `Curve`, `Label`, `Area`, `Circle`, `Rectangle`, `Contour`) are instantiated from the configuration. These are located in `src/ts/view/viewObjects/`.
4. **Drawing:** Each `ViewObject` creates its own elements (e.g., `<circle>`, `<path>`) inside dedicated D3 layers within the primary SVG graphic. Text objects like `Label` elements are parsed via KaTeX and rendered dynamically within absolute `div`s inside the `svgContainerDiv` layer cleanly separated from the SVG logic for better headless SPA integrations.

When the Model broadcasts a state change, the View objects trigger their internal `update()` methods, mapping their new data values through the scales and smoothly interpolating D3 transitions.

## 3. Controller: Handling Interaction

The `InteractionHandler` (`src/ts/controller/interactionHandler.ts`) processes events like clicks, drags, hover states, and mouse movement. 

When a `ViewObject` (like a Point) is defined with a `drag` directive, the engine attaches D3 drag behaviors to the instantiated element. During a drag loop:

1. The interaction handler receives raw pixel deltas.
2. It uses the `Scale.invert()` method to convert pixel changes back into mathematical domain changes.
3. It instructs the `Model.updateParam()` to shift the parameter value.
4. The Model completes the loop by updating the View smoothly.

## 4. KGAuthor: The Schema Transpiler

The `KGAuthor` module (`src/ts/KGAuthor/`) is a transpiler layer that sits between the user-authored YAML/JSON schema and the low-level `ViewDefinition` consumed by the View. It is responsible for:

1. **Schema Expansion:** Converting high-level schema types (e.g., `EconSchema`, `BowlesHallidaySchema`) into fully resolved configurations with colors, idioms, and layout defaults.
2. **Layout Resolution:** Resolving layout types (e.g., `OneGraph`, `TwoHorizontalGraphs`, `FourGraphs`) into positioned graph containers with computed aspect ratios and coordinates.
3. **Economic Object Expansion:** Expanding complex economic concepts (e.g., `EconLinearEquilibrium`, `EconOptimalBundle`, `CobbDouglasFunction`) into their constituent geometric primitives (points, lines, curves, areas, labels).
4. **Final Output:** Producing a flat `ViewDefinition` with resolved `scales`, `layers`, `clipPaths`, `markers`, and `divs` that the View can render directly.

The KGAuthor module contains sub-directories for:
- `schemas/` — Schema type definitions
- `layouts/` — Layout type handlers
- `graphObjects/` — Basic geometric object authors
- `econ/` — Economic object authors (consumer theory, equilibrium, exchange, etc.)
- `parsers/` — Parsing functions that orchestrate the expansion pipeline

## Main Entry Point

The `KineticGraph` class (`src/ts/kg.ts`) is the main export wrapper. It extends `EventEmitter3` and bridges the gap between the `View`, the `Model`, and the event system, providing the external API (`mount()`, `update()`, `destroy()`) necessary to pass new configs or listen to graph events from the host application.

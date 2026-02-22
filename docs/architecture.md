# Architecture Overview

The KGJS-Equilibria engine is built on a clear separation of concerns, heavily influenced by Model-View-Controller (MVC) paradigms, optimized for rendering fast mathematical updates.

The core modules located in `src/ts/` are broadly divided into:

1. **Model** (`src/ts/model/`): The source of truth for all mathematical state.
2. **View** (`src/ts/view/`): The D3-powered DOM rendering engine.
3. **Controller** (`src/ts/controller/`): The interaction layer that handles dragging and user input.

## 1. Model: State & Mathematics

At the heart of the engine is the `Model` class, instantiated when you provide a configuration object. The model acts as a reactive state container, primarily housing:

* **Params**: The independent variables of your diagram (e.g., $price=10$, $quantity=5$). 
* **UpdateListeners** (Calculations): Dependent variables constructed dynamically using **MathJS**. When an underlying param changes, the update listeners traverse the dependency graph and recalculate.
* **Restrictions**: Rules that prevent parameters from exceeding certain bounds or satisfying particular conditions during interactions.

Whenever an interaction changes a Param's value, the Model performs a fast update:
1. It validates the change against Restrictions.
2. It evaluates all mathematical Calcs via MathJS.
3. It broadcasts an update to the View so components can redraw their coordinates and math text.

## 2. View: The Rendering Layer

The `View` handles painting to the screen using **D3.js**. 

The lifecycle of the view goes as follows:

1. **Initialization:** The view creates the root SVG tag within the host container and applies the provided `aspectRatio`.
2. **Scales Execution:** The engine creates `Scale` instances (`src/ts/view/scale.ts`). These scale objects are crucial: they convert mathematical domain values (e.g., $x \in [0, 20]$) into raw pixel locations on the viewport. 
3. **ViewObjects Instantiation:** Geometric elements (`Point`, `Segment`, `Curve`, `Label`) are instantiated from the configuration. 
4. **Drawing:** Each `ViewObject` creates its own SVG elements (e.g., `<circle>`, `<path>`, or DOM `<div>` elements for KaTeX) inside dedicated D3 layers.

When the Model broadcasts a state change, the View objects trigger their internal `update()` methods, mapping their new data values through the scales and smoothly interpolating D3 transitions.

## 3. Controller: Handling Interaction

The `InteractionHandler` (`src/ts/controller/interactionHandler.ts`) processes events like clicks, drags, hover states, and mouse movement. 

When a `ViewObject` (like a Point) is defined with a `drag` directive, the engine attaches D3 drag behaviors to the instantiated element. During a drag loop:

1. The interaction handler receives raw pixel deltas.
2. It uses the `Scale.invert()` method to convert pixel changes back into mathematical domain changes.
3. It instructs the `Model.updateParam()` to shift the parameter value.
4. The Model completes the loop by updating the View smoothly.

## Main Entry Point

The `KineticGraph` class (`src/ts/kg.ts`) is the main export wrapper. It bridges the gap between the `View`, the `Model`, and the `EventEmitter`, providing the external API necessary to pass new configs or listen to graph events from the host application.

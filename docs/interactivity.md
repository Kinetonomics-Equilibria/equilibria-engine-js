# API & Interactivity

The power of the KGJS-Equilibria engine lies in allowing the host web application (the outside code) to communicate two-ways with the configured mathematical visualizations.

## Emitting Events

The `KineticGraph` class inherits from `EventEmitter3`. This gives the host application the ability to attach subscriptions to interactions happening on the graph.

Currently, the engine exposes a global `KG_EVENTS` enum:

```js
import { KineticGraph, KG_EVENTS } from "equilibria-engine";

const kg = new KineticGraph(config);
kg.mount(document.getElementById('container'));

// Listen for updates explicitly triggered from the interaction layer
kg.on('update', (eventData) => {
    console.log("Graph model updated!", eventData);
});
```
*(Note: Complete payloads emitting the full parameter slate on interaction are continually being extended into the main `interactionHandler.ts` update loop.)*

## Updating Param State Programmatically

You can instruct the engine to alter param value states from the outside. For instance, if you build structural UI elements like sliders or buttons in your React/Vue framework, sliding the elements can automatically snap the underlying model engine to your desired value.

You perform updates by feeding partial configs, specifically targeting the `params` key through `update(newConfig)`.

### Example: Setting external slider values to the engine

```js
// Let's assume the config initialized a param: { name: "price", value: 10 }

function handlePriceSliderChange(newPriceValue) {
    
    // Call .update() with a partial config containing the new parameter parameters
    kg.update({
        params: [
            { name: "price", value: newPriceValue }
        ]
    });

}
```

When you call `update()` with `params`:
1. The engine checks the named parameter (e.g. `"price"`).
2. The engine merges the new numeric `value` into the internal Model wrapper.
3. The engine automatically re-triggers calculation logic downstream.
4. The View smoothly animates graphic elements bound to that parameter to their new configuration domain coordinate.

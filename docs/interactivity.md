# API & Interactivity

The power of the Equilibria engine lies in allowing the host web application (the outside code) to communicate two-ways with the configured mathematical visualizations.

## Events

The `KineticGraph` class extends `EventEmitter3`. This gives the host application the ability to attach subscriptions to interactions happening on the graph.

> [!TIP]
> **React users:** The [`equilibria-react`](https://github.com/Kinetonomics-Equilibria/equilibria-react) package re-exports `KG_EVENTS` and provides callback props (`onParamChanged`, `onCurveDragged`, `onNodeHover`) so you don't need to subscribe manually. See the [equilibria-react README](https://github.com/Kinetonomics-Equilibria/equilibria-react) for details.

The engine exposes a `KG_EVENTS` object with the following event keys:

| Event Key | Event Name | Description |
|-----------|------------|-------------|
| `KG_EVENTS.PARAM_CHANGED` | `'kg:param_changed'` | Fired when a parameter value changes (e.g., via drag interaction). |
| `KG_EVENTS.CURVE_DRAGGED` | `'kg:curve_dragged'` | Fired when a curve element is dragged by the user. |
| `KG_EVENTS.NODE_HOVER` | `'kg:node_hover'` | Fired when the user hovers over an interactive node. |

### Listening for Events

```js
import { KineticGraph, KG_EVENTS } from "equilibria-engine-js";

const kg = new KineticGraph(config);
kg.mount(document.getElementById('container'));

// Listen for parameter changes from user interactions
kg.on(KG_EVENTS.PARAM_CHANGED, (eventData) => {
    console.log("Parameter changed!", eventData);
});

// Listen for curve drag interactions
kg.on(KG_EVENTS.CURVE_DRAGGED, (eventData) => {
    console.log("Curve dragged!", eventData);
});
```

### Error Handling

The engine emits an `'error'` event if the rendering pipeline encounters an exception during `mount()`:

```js
kg.on('error', (err) => {
    console.error("Engine error:", err);
});
```

## Updating Param State Programmatically

You can instruct the engine to alter param value states from the outside. For instance, if you build structural UI elements like sliders or buttons in your React/Vue framework, sliding the elements can automatically snap the underlying model engine to your desired value.

You perform updates by feeding partial configs, specifically targeting the `params` key through `update(newConfig)`.

### Example: Setting external slider values to the engine

```js
// Let's assume the config initialized a param: { name: "price", value: 10 }

function handlePriceSliderChange(newPriceValue) {
    
    // Call .update() with a partial config containing the new parameter values
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

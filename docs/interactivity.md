# API & Interactivity

The power of the Equilibria engine lies in allowing the host web application (the outside code) to communicate two-ways with the configured mathematical visualizations.

## Events

The `KineticGraph` class extends `EventEmitter3`. This gives the host application the ability to attach subscriptions to interactions happening on the graph.

> [!TIP]
> **In this repo:** the internal React bindings ([`packages/react`](../packages/react))
> re-export `KG_EVENTS` and provide callback props (`onParamChanged`, `onCurveDragged`,
> `onNodeHover`), so app code does not subscribe manually.

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

> [!WARNING]
> **Multiple params in one call are applied one at a time, not atomically.** The
> engine validates the restriction set after each one, so a legal destination
> reached through an illegal interim is rejected halfway — and the rollback is
> silent. `[{a: 15}, {c: 5}]` and `[{c: 5}, {a: 15}]` can therefore land in
> different states, one of which is neither the start nor the target. Until a
> batched update path exists, order your params so every interim state is legal,
> or set them in separate calls you can check.

## Gestures and Snapshots

The engine keeps a one-deep memory of its own state, which diagram expressions read as `prev` — see [Remembering the Previous State](./schema/02-parameters-and-interactions.md#remembering-the-previous-state-prev) for the authoring side. Drags inside the diagram snapshot themselves. The host has to take part in two cases: its own continuous controls, and boundaries only the app knows about.

| Method | Purpose |
|--------|---------|
| `kg.beginGesture()` | Declare the start of a host-driven gesture. Only the outermost open gesture snapshots, so nesting is safe. |
| `kg.endGesture()` | Close it. |
| `kg.snapshot()` | Mark the current state as the new `prev`, outside any gesture. |
| `kg.getSnapshot()` | Read the last snapshot: `{ params, calcs, seq }`, or `null` if none has been taken. Returns copies. |

### A host slider must bracket its own gesture

This is not optional polish. A slider scrub reaches the engine as an undifferentiated stream of `update({ params })` calls, and the engine cannot tell that stream apart from sixty deliberate jumps. Without brackets, `prev` advances on every tick and ends up one frame behind the live value — the ghost hides under the live curve and the shift arrow is a pixel long. Map the calls onto the control's own gesture events; a Mantine `Slider` gives `onChangeStart` / `onChangeEnd`.

```jsx
<Slider
    value={price}
    onChangeStart={() => kg.beginGesture()}
    onChange={(value) => {
        setPrice(value);
        kg.update({ params: [{ name: 'price', value }] });
    }}
    onChangeEnd={() => kg.endGesture()}
/>
```

### Snapshotting at an app boundary

`kg.snapshot()` is for the moments the engine cannot see: applying a scenario preset, revealing a quiz answer, advancing a lesson step. Each of those wants the state *before* it as the thing the student compares against.

```js
// Freeze "before" at the moment the answer is revealed, so the ghost of the
// student's own attempt stays on screen beside the correct position.
kg.snapshot();
kg.update({ params: correctAnswerParams });
```

### Choosing when snapshots happen

`snapshotOn` accepts `'gesture'` (default), `'change'` or `'never'`, and can be given either as a `KineticGraph` option or at the root of the config. The option wins.

```js
const kg = new KineticGraph(config, { snapshotOn: 'never' });
```

### From React

The `useEquilibria()` hook in [`packages/react`](../packages/react) mirrors the three methods, so app components do not reach for the instance:

```jsx
const { containerRef, snapshot, beginGesture, endGesture } = useEquilibria(config);
```

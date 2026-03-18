# Getting Started

This guide explains how to integrate the Equilibria engine into a website or web application.

## Installation

The engine can be incorporated into modern module bundler setups (like Vite, Webpack, Next.js) or included directly onto a simple HTML page via CDN.

### Option 1: Using NPM (Recommended for Web Apps)

If you are building an application in React, Vue, or Vanilla JS using a bundler:

```bash
npm install equilibria-engine-js
```

Within your javascript or typescript files, you can then import the engine class:

```js
import { KineticGraph, KG_EVENTS } from "equilibria-engine-js";
import "equilibria-engine-js/dist/style.css"; // Engine styles
import "katex/dist/katex.min.css"; // Required for math rendering
```

### Option 2: Using CDN (For Vanilla HTML/JS)

You can load the bundled module directly in your browser. Since the engine exposes an ES module, you can instantiate it directly inside a `<script type="module">` tag.

```html
<!-- Required CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/equilibria-engine-js@latest/dist/style.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" />

<!-- Host container for the graph -->
<div id="graph-container"></div>

<script type="module">
  import { KineticGraph } from "https://cdn.jsdelivr.net/npm/equilibria-engine-js@latest/dist/kgjs.es.js";
  
  // Use KineticGraph here...
</script>
```

### Option 3: Using React (Recommended for React/Next.js)

The [`equilibria-react`](https://github.com/Kinetonomics-Equilibria/equilibria-react) companion package wraps the engine with React-idiomatic components and handles mounting, unmounting, resizing, error handling, and event forwarding automatically:

```bash
npm install equilibria-react equilibria-engine-js
```

```tsx
import { useMemo } from 'react';
import { EquilibriaChart } from 'equilibria-react';

function App() {
  const config = useMemo(() => ({
    params: [{ name: "price", value: 10, min: 0, max: 20 }],
    layout: {
      OneGraph: {
        graph: {
          xAxis: { title: "Quantity", min: 0, max: 20 },
          yAxis: { title: "Price", min: 0, max: 20 },
          objects: [
            { type: "Point", def: { x: "10", y: "price", color: "blue", draggable: true } }
          ]
        }
      }
    }
  }), []);

  return <EquilibriaChart config={config} onReady={() => console.log('mounted')} />;
}
```

See the [`equilibria-react` documentation](https://github.com/Kinetonomics-Equilibria/equilibria-react) for `<EquilibriaCard />`, event callbacks (`onParamChanged`, `onCurveDragged`, `onNodeHover`), the `useEquilibria()` hook, and the `updateParams` API.

## Initializing the Engine

The engine reads a `config` object (typically from parsed JSON or YAML) that dictates the mathematical model and visual presentation of the graph.

To render a graph:
1. Create a container element in your HTML.
2. Define or fetch the configuration object.
3. Instantiate a new `KineticGraph`, optionally passing a second argument for engine options.
4. Call `.mount()` to attach the graph to your container element.

Here is a minimal functional component in Vanilla JS:

```js
import { KineticGraph } from 'equilibria-engine-js';

// Grab the host HTML element
const containerElement = document.getElementById('graph-container');

// Prepare the model configuration
const graphConfig = {
    // Defines parameters the user can manipulate
    params: [
        { name: "price", value: 10 }
    ],
    // Defines the x and y coordinate space bounds
    scales: [
        { name: "x", axis: "x", domainMin: 0, domainMax: 20 },
        { name: "y", axis: "y", domainMin: 0, domainMax: 20 }
    ],
    // Defines the graphical elements 
    objects: [
        {
            type: "Point",
            def: {
                x: "10",
                y: "price", // Bound to the parameter
                color: "blue",
                drag: [{ directions: "y", param: "price", prop: "y" }]
            }
        }
    ]
};

// 1. Instantiate the graph with the configuration
const kg = new KineticGraph(graphConfig);

// 2. Mount to the DOM
// The engine will immediately bind D3 methods and render the first frame.
kg.mount(containerElement);
```

### Engine Options

The `KineticGraph` constructor accepts an optional second argument for engine-level options:

```js
const kg = new KineticGraph(graphConfig, {
    legacyUrlOverrides: false // default: false. If true, reads URL query params
                              // and container div attributes for param overrides.
});
```

## Responsive Layouts

When `kg.mount()` is called, the engine attaches a `ResizeObserver` scoped to the `containerElement`. The graphic will naturally expand to fill the width of the container, scaling the height based on the `aspectRatio` defined in the configuration.

The engine also applies the `.kg-container` CSS class to the container element for theme activation.

Ensure the container has a defined width logic (e.g. `width: 100%`) in your CSS.

## Error Handling

If the engine encounters an error during rendering, it emits an `'error'` event that you can listen for:

```js
kg.on('error', (err) => {
    console.error("Engine rendering error:", err);
});
```

## Tearing Down

If you are using a single-page application framework (like React or Vue), it is crucial to clean up the engine instance when the component unmounts to prevent memory leaks.

```js
// Call this when the component unmounts
kg.destroy();
```

This will:
- Disconnect the `ResizeObserver` monitoring the container
- Remove the `.kg-container` CSS class from the container
- Clear the container's `innerHTML`
- Remove all event listeners

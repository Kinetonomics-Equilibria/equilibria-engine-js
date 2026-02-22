# Getting Started

This guide explains how to integrate the KGJS-Equilibria engine into a website or web application.

## Installation

The engine can be incorporated into modern module bundler setups (like Vite, Webpack, Next.js) or included directly onto a simple HTML page via CDN.

### Option 1: Using NPM (Recommended for Web Apps)

If you are building an application in React, Vue, or Vanilla JS using a bundler:

```bash
npm install equilibria-engine
```

Within your javascript or typescript files, you can then import the engine class:

```js
import { KineticGraph, KG_EVENTS } from "equilibria-engine";
```

### Option 2: Using CDN (For Vanilla HTML/JS)

You can load the bundled module directly in your browser. Since the engine exposes an ES module, you can instantiate it directly inside a `<script type="module">` tag.

```html
<!-- Host container for the graph -->
<div id="graph-container"></div>

<script type="module">
  import { KineticGraph } from "https://cdn.jsdelivr.net/npm/equilibria-engine@latest/dist/kgjs.es.js";
  
  // Use KineticGraph here...
</script>
```

## Initializing the Engine

The engine reads a `config` object (typically from parsed JSON or YAML) that dictates the mathematical model and visual presentation of the graph.

To render a graph:
1. Create a container element in your HTML.
2. Define or fetch the configuration object.
3. Instantiate a new `KineticGraph`.
4. Call `.mount()` to attach the graph to your container element.

Here is a minimal functional component in Vanilla JS:

```js
import { KineticGraph } from 'equilibria-engine';

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

## Responsive Layouts

When `kg.mount()` is called, the engine binds an event listener to the `window` resize event. The graphic will naturally expand to fill the width of the `containerElement` you passed in, scaling the height based on the `aspectRatio` defined in the configuration. 

Ensure the container has a defined width logic (e.g. `width: 100%`) in your CSS.

## Tearing Down

If you are using a single-page application framework (like React or Vue), it is crucial to clean up the engine instance when the component unmounts to prevent memory leaks.

```js
// Call this when the component unmounts
kg.destroy();
```

This will clear the DOM contents, decouple D3 listeners, and remove any event emitter subscriptions.

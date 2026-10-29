# 01 - Getting Started with Equilibria Schema

> The examples in these guides are YAML because it is short to read. The engine reads the same keys as a plain object and parses no YAML itself, so write them in JavaScript or TypeScript, or load them from JSON. The study app's lessons write them in TypeScript (`apps/web/src/lessons/`).

The Equilibria Engine uses one configuration object to define interactive diagrams, graphs, and economic models. The engine reads this object and transpiles it into an interactive view.

This guide provides an introduction to the structure of an Equilibria schema document.

## The `Schema` Object

At the root of every Equilibria definition is a `Schema` or `ViewDefinition` object. When authoring, you generally provide a top-level object representing your configuration.

### Basic Structure

```yaml
schema:
  colors:
    primary: blue
    secondary: red
  idioms:
    # Custom idioms or macros
  params:
    - name: x
      value: 10
      min: 0
      max: 20
  layout:
    type: OneGraph
    def:
      # Layout definition goes here
```

### Core Properties

- **`colors`**: A dictionary of custom colors. You can map simple names to standard D3 colors or use specific hex/rgb codes.
  *Default Palette Includes:* `blue`, `orange`, `green`, `red`, `purple`, `brown`, `magenta`, `grey`, `olive`.
- **`idioms`**: An object containing custom reusable definitions or macros for your schema.
- **`params`**: An array of `ParamDefinition` objects representing the interactive state variables of the graph.
- **`restrictions`**: Constraints that enforce rules on params (e.g., ensuring one param is always greater than another).
- **`layout`**: The visual arrangement of the schema, dictating how many graphs to display and how they are positioned.
- **`custom`**: A string containing custom CSS or scripts if needed (dependent on the integration environment).

## How it Works

The schema you write is processed by the **Authoring Layer** (`KGAuthor`). This layer acts as a transpiler, taking high-level economic and geometric concepts (like an Edgeworth Box or a Demand Curve) and breaking them down into fundamental view objects (points, lines, areas) that the underlying Equilibria render engine understands.

1. **Read**: The engine takes the configuration as a plain JavaScript object, and deep-clones it so nothing it does reaches the author's copy.
2. **Expand**: `KGAuthor` classes expand macro-objects (like `EconLinearDemand`) into their constituent geometric parts (a `Line`, a `Label`, etc.).
3. **Render**: The `View` engine takes the expanded configuration and draws it as SVG elements in the browser, establishing data-binding with the `params` for interactivity.

## Next Steps

Once your schema root is defined, the next logical steps are to define the state of your diagram using **Parameters and Interactions** and to configure the visual arrangement using **Layouts**.

See [02 - Parameters and Interactions](./02-parameters-and-interactions.md) for details on making your graphs dynamic.

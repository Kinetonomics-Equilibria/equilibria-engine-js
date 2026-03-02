# Configuration Specification

The engine relies on a comprehensive configuration object (the `ViewDefinition`) to define everything from parameters to drawn SVG objects. While you can construct this object as pure Javascript, it is most commonly authored as YAML and parsed via `js-yaml`.

A graph configuration follows this top-level schema:

```json
{
  "schema": "Schema",
  "aspectRatio": 1.5,
  "params": [],
  "calcs": {},
  "colors": {},
  "restrictions": [],
  "layout": {},
  "objects": [],
  "custom": ""
}
```

Below is a breakdown of the core properties.

## 1. Schema Type (`schema`)

The `schema` property selects which root schema class processes the configuration. This determines the default color palette, idioms, and other schema-level defaults.

| Value | Description |
|-------|-------------|
| `"Schema"` | Default schema with standard settings (default if omitted). |
| `"EconSchema"` | Economics-focused schema with preset economic color palette. |
| `"BowlesHallidaySchema"` | Textbook-specific schema with tailored colors and conventions. |

## 2. Parameters (`params`)

Params are the independent state variables. They control the root logic of your graph.

| Property | Type | Description |
|-----------|------|-------------|
| `name` | string | The variable name (must be unique). Use this to reference the param in math logic. |
| `value` | number | The default initial value. |
| `min` | string/number | Minimum threshold. Can be raw number or math string (e.g., `"param_a + 5"`). |
| `max` | string/number | Maximum threshold. |
| `round` | number | Steps for the numeric value indicating precision (e.g., `0.5`). |

**Example**:
```json
{ "name": "baseWidth", "value": 10, "min": 0, "max": 20 }
```

## 3. Calculations (`calcs`)

Calculations act as derived state. They are dynamically parsed using MathJS whenever parameters shift.

```json
"calcs": {
  "area": "baseWidth * 5",
  "midpointX": "(baseWidth - 0) / 2"
}
```

You can seamlessly use variables defined in `calcs` throughout your scale domains or `ViewObject` coordinates. Calcs can depend on other calcs — the engine re-evaluates up to 5 levels deep to resolve dependencies. The engine processes everything using a flattened MathJS dictionary scope, so params and configurations like `colors` and `idioms` are universally available for calculations without standard object path prefixes (e.g., you can just write `"area * demand"` instead of `"calcs.area * idioms.demand"`).

## 4. Colors (`colors`)

A dictionary of custom color names mapped to color values. These can be referenced by name throughout the configuration.

```json
"colors": {
  "demand": "blue",
  "supply": "orange",
  "equilibrium": "#2ca02c"
}
```

The default palette includes: `blue`, `orange`, `green`, `red`, `purple`, `brown`, `magenta`, `grey`, `olive`.

## 5. Restrictions (`restrictions`)

Restrictions are conditional guards that prevent invalid operations or state combinations during runtime interactions (like dragging geometry).

| Property | Type | Description |
|-----------|------|-------------|
| `expression`| string | A math string evaluating to a boolean (`>`, `<`, `==`, `!=`) or a raw value tested against explicit bounds. |
| `min`| string/number | Optional. Explicit lower limit that the evaluated `expression` must be greater than or equal to. |
| `max`| string/number | Optional. Explicit upper limit that the evaluated `expression` must be less than or equal to. |

The engine implements predictive state-rollback for restrictions. When a user begins dragging a parameter, the engine evaluates the hypothetical new state against all specified minimums, maximums, and boolean operators. If the new state resolves as invalid, the engine silently cancels the view update and restores the original mathematical values.

**Example**:
```json
"restrictions": [
  { "type": "domain", "expression": "price > marginalCost" }
]
```

## 6. Layout (`layout`)

The `layout` property is the primary way to define the visual arrangement of graphs within the canvas. It replaces the need to manually configure scales and objects in many cases.

```json
"layout": {
  "type": "OneGraph",
  "def": {
    "graph": {
      "xAxis": { "min": 0, "max": 20, "title": "Quantity" },
      "yAxis": { "min": 0, "max": 20, "title": "Price" },
      "objects": []
    }
  }
}
```

Available layout types include: `OneGraph`, `OneWideGraph`, `TwoHorizontalGraphs`, `TwoVerticalGraphs`, `ThreeHorizontalGraphs`, `FourGraphs`, and specialized economic layouts like `EdgeworthBox`. See the [Schema Layouts guide](./schema/03-layouts.md) for the full list.

## 7. Scales (`scales`)

Scales connect mathematical Cartesian domains to the pixel viewport. Every `ViewObject` inherits mapping scales to calculate positioning.

| Property | Type | Description |
|-----------|------|-------------|
| `name` | string | Internal name for the scale (e.g. `"x"`, `"y"`). |
| `axis` | string | `"x"` (horizontal mapping) or `"y"` (vertical mapping). |
| `domainMin` | string/number | Starting range of Cartesian space (e.g. `0`). |
| `domainMax` | string/number | Ending range of Cartesian space (e.g. `100`). |

> **Note:** When using `layout`, scales are generated automatically. You only need to define scales explicitly when building a configuration without a layout.

## 8. View Objects (`objects`)

Objects dictate what is rendered to the root SVG element. The core components are arrays built of `{ "type": string, "def": object }` wrappers.

The standard object types are:

* **Point**: An interactive `<circle>` mapped to `[x, y]`.
* **Segment**: A `<path>` drawn between two coordinate points (`[a, b]`).
* **Curve**: Multiple points rendered smoothly along a mathematical function.
* **Label**: A KaTeX formatted `<text>` or `<div>` object. You can dynamically inject live model calculations or param variables into the markup by wrapping the variable inside backtick-parentheses syntax `\((varName)\)` within the text string.
* **Area**: A filled region between boundaries or curves. Supplying an `autoGeneratedBaseline` boolean flag enables drawing areas above/below standard configured curves automatically without requiring explicit function intersections.
* **Circle**: A standard circle with center point and radius.
* **Rectangle**: A filled rectangle defined by corner coordinates.
* **Contour**: A contour plot rendered from a 2D function.
* **Axis**: Axis lines and tick marks (usually auto-generated by Graphs).

### Drag Interactivity

Many `objects` (like Points or Curve Handles) support interactivity to mutate parameters on user drag. 
To enable this, supply the `drag` directive inside an object's `def`:

```json
{
  "type": "Point",
  "def": {
    "x": "baseWidth", 
    "y": "5",
    "color": "blue",
    "drag": [
      {
        "directions": "x", 
        "param": "baseWidth", 
        "prop": "x" 
      }
    ]
  }
}
```

In the example above, the point can be dragged horizontally (`directions: "x"`). As it moves, its relative `x` pixel coordinate is inverted to mathematical space to modify the parameter `baseWidth`.

## 9. Additional Properties

| Property | Type | Description |
|-----------|------|-------------|
| `aspectRatio` | number | Width-to-height ratio of the canvas (default: `1`). |
| `clearColor` | string | Background color of the canvas (default: `"#FFFFFF"`). |
| `custom` | string | Custom CSS to inject into the rendering context. |
| `idioms` | object | Custom reusable definitions or macros for the schema. |

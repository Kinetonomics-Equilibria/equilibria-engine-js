# Configuration Specification

The engine relies on a comprehensive configuration object (the `ViewDefinition`) to define everything from parameters to drawn SVG objects. While you can construct this object as pure Javascript, it is most commonly translated from a YAML structure (`js-yaml`).

A graph configuration usually follows this top-level schema:

```json
{
  "aspectRatio": 1.5,
  "params": [],
  "calcs": {},
  "restrictions": [],
  "scales": [],
  "objects": []
}
```

Below is a breakdown of the core properties.

## 1. Parameters (`params`)

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

## 2. Calculations (`calcs`)

Calculations act as derived state. They are dynamically parsed using MathJS whenever parameters shift.

```json
"calcs": {
  "area": "baseWidth * 5",
  "midpointX": "(baseWidth - 0) / 2"
}
```

You can seamlessly use variables defined in `calcs` throughout your scale domains or `ViewObject` coordinates.

## 3. Restrictions (`restrictions`)

Restrictions are conditional guards that prevent invalid operations or state combinations during runtime interactions (like dragging geometry).

| Property | Type | Description |
|-----------|------|-------------|
| `expression`| string | A math string evaluating to a boolean (`>`, `<`, `==`, `!=`). |
| `type` | string | Typically `"domain"` or `"range"`. |

**Example**:
```json
"restrictions": [
  { "type": "domain", "expression": "price > marginalCost" }
]
```

## 4. Scales (`scales`)

Scales connect mathematical Cartesian domains to the pixel viewport. Every `ViewObject` inherits mapping scales to calculate positioning.

| Property | Type | Description |
|-----------|------|-------------|
| `name` | string | Internal name for the scale (e.g. `"x"`, `"y"`). |
| `axis` | string | `"x"` (horizontal mapping) or `"y"` (vertical mapping). |
| `domainMin` | string/number | Starting range of Cartesian space (e.g. `0`). |
| `domainMax` | string/number | Ending range of Cartesian space (e.g. `100`). |

## 5. View Objects (`objects`)

Objects dictate what is rendered to the root SVG element. The core components are arrays built of `{ "type": string, "def": object }` wrappers.

The standard object types are:

* **Point**: An interactive `<circle>` mapped to `[x, y]`.
* **Segment**: A `<path>` drawn between coordinate arrays (`[a, b]`).
* **Curve**: Multiple points rendered smoothly.
* **Function**: An equation mapped along an explicit domain.
* **Label**: A KaTeX formatted `<text>` or `<div>` object.

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

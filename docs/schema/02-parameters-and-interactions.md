# 02 - Parameters and Interactions

Parameters (or `params`) represent the state of an Equilibria schema. By adjusting params, users interact with the visual configuration, changing equations, coordinates, or visibility of graph elements.

Every time a `param` changes, the graph re-renders according to its mathematical dependencies.

## Defining a Parameter

Parameters are an array of `ParamDefinition` objects defined at the root of the schema.

### `ParamDefinition` Interface

```typescript
interface ParamDefinition {
    name: string;     // Reference variable for the parameter (e.g. "x1")
    label: string;    // Label for the slider that controls this param
    value: any;       // Initial default value (number or boolean)
    min?: any;        // Lowest acceptable value (left bound of slider)
    max?: any;        // Highest acceptable value (right bound of slider)
    round?: any;      // Interval to snap to (e.g. 0.01 or 1)
    precision?: any;  // Number of decimal places to display value to
}
```

### Example Usage

```yaml
params:
  - name: price
    label: Price
    value: 10
    min: 0
    max: 100
    round: 1
  - name: isMonopoly
    value: true # Booleans are parsed mathematically as 1 (true) or 0 (false)
```

## How Math and Parameters Work

Any string value in an Equilibria definition can be evaluated as a math expression involving the names of your `params`.

For example, if you have `params` `r` and `t`, you could define an `x` coordinate of a point like this:

```yaml
# Inside some graph object definition
x: (r + 10) * t
```

The system uses `math.js` to parse these strings algebraically under the hood. It supports a wide variety of standard mathematical formulas (`sin`, `cos`, `log`, `min`, `max`, exponents `^`, etc.).

A schema can define an array of `restrictions` that prevent user interaction from dragging a parameter into an invalid domain.

### `RestrictionDefinition` Interface

```typescript
interface RestrictionDefinition {
    expression: string;
    type: string;
    min?: string;
    max?: string;
}
```

For example, if you have a budget line where `Px * X + Py * Y = M`, you might want to enforce that `Px > 0` and `Py > 0`. You would define an expression for `Px` with a min of `0.001`. 

When a user interacts with a parameter (like dragging a point bound to `Px`), the Equilibria engine predictively evaluates the new mathematical state. If the new `Px` value drops below `0.001`—or if the interaction violates any other mathematical properties defined in the `expression` operators—the engine will silently cancel the update and roll back the parameter to the last known valid state.

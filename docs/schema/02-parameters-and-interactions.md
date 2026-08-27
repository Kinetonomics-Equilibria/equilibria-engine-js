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
    presentation?: boolean; // Says how the diagram is shown, not what it shows
}
```

`presentation` marks a param that carries *arrangement* rather than *state* — a
panel's [density level](./03-layouts.md#density-how-much-detail-a-panel-draws),
which panel a host has focused. The engine declares its own that way, and a host
should do the same for any param it uses to lay a screen out. Such a param is
excluded from [`prev.changed`](#remembering-the-previous-state-prev), and has to
be: `prev.changed` means *the student moved something*, and a panel resizing
itself is not that.

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

## Remembering the Previous State (`prev`)

The engine keeps a one-deep memory of itself. Any evaluated string can read `prev`, which resolves to the state as it was *before the current interaction*. That is what lets an author draw where a curve used to be — a ghost, a shift arrow — without shadow params, duplicated calcs, or any bookkeeping in the host.

### The `prev` scope

| Name | Meaning |
|------|---------|
| `prev.params.<name>` | Param value at the last snapshot. |
| `prev.calcs.<name>` | Calc value at the last snapshot. **Stored, not recomputed** — the value that calc had then, not the one it would have now. |
| `prev.<name>` | Flattened form. Calcs shadow params on a name collision, exactly as they do at the top level. |
| `prev.seq` | Snapshot counter. `0` before the first snapshot. |
| `prev.changed` | `1` if any param now differs from the snapshot, otherwise `0`. |

`prev` is seeded at construction, so it is never undefined. At `t = 0`, `prev` equals the current state and a ghost drawn from it sits exactly under the live object. This matters more than it sounds: an unresolved name does not throw, it falls through `evaluate()` and reaches the renderer as its own source string, which is the silent-wrong-answer failure the engine works hard to close.

`prev.changed` is what keeps a ghost off screen until something actually moves. The comparison is exact, which is correct here because `round` snaps every param onto a grid — there is no float dust to tolerate, and no author needs to invent an epsilon.

Params marked [`presentation`](#paramdefinition-interface) are not part of the comparison. A panel choosing its own density from its measured size, or a host promoting one, changes a param and changes nothing the student did — and counting it would raise every ghost in the diagram before they had touched it.

### Example: a ghost of the old curve

```yaml
params:
  - name: a
    label: Demand intercept
    value: 20
    min: 5
    max: 28
    round: 0.1

objects:
  # The live curve, draggable vertically.
  - type: Line
    def:
      yIntercept: params.a
      slope: -1
      color: colors.demand
      drag:
        - vertical: a

  # Where it was when the student grabbed it. Same binding, one snapshot ago.
  - type: Line
    def:
      yIntercept: prev.params.a
      slope: -1
      color: colors.demand
      lineStyle: dashed
      strokeOpacity: 0.35
      show: prev.changed
```

The same two expressions draw the move itself, which is usually the sentence the diagram is trying to say out loud:

```yaml
  - type: Arrow
    def:
      begin: [prev.calcs.Qe, prev.calcs.Pe]
      end: [calcs.Qe, calcs.Pe]
      show: prev.changed
```

### When a snapshot is taken

`snapshotOn`, at the root of the config, decides.

| Value | Behaviour |
|-------|-----------|
| `gesture` (default) | One snapshot per gesture, taken on the drag's first movement rather than on mousedown — so a stray click costs neither a render nor a ghost. |
| `change` | A snapshot on every param change. Inside a gesture it still coalesces to one, taken at the start. |
| `never` | Only an explicit `snapshot()` call from the host moves `prev`. |

`gesture` is the default because a drag fires roughly sixty updates a second. A snapshot per update leaves `prev` one tick behind: the ghost sits underneath the live curve and the shift arrow is a pixel long. `change` is offered because a host that only ever sets params in discrete jumps has no gesture to speak of, but it is a trap for anything continuous.

A host that drives a continuous control of its own — a slider — must bracket it with `beginGesture()` / `endGesture()`. The engine cannot infer a gesture from a stream of `update()` calls. See [API & Interactivity](../interactivity.md#gestures-and-snapshots).

An individual drag can opt out, for a control whose movement is not something a ghost should remember:

```yaml
drag:
  - directions: x
    param: cursor
    prop: x
    snapshot: false
```

### Reserved names

`prev` joins `params`, `calcs`, `colors`, `idioms` and `d3` as a name the expression scope reserves, and `seq` and `changed` are reserved inside it. A param or calc named `prev` shadows the memory; the engine warns once on the console and carries on rather than throwing, in keeping with every other diagnostic here.

A calc whose definition reads `prev.calcs` also warns. It is well defined — the value one snapshot ago, not a fixpoint — but it is the spelling most likely to surprise, and `prev.params` is almost always what was meant.

## Declared Build-Up Order (`steps`)

A staged reveal has always been possible one object at a time —
`show: 'params.step >= 3'` works, and un-reveals on the way back. What it costs
is 24 characters on every object, the step number duplicated into each one, and
an edit to all of them when a step is renumbered.

`steps`, at the root of the config, says it once:

```yaml
steps:
  - reveal: [axes]
  - reveal: [demand]
  - reveal: [supply]
  - reveal: [equilibrium]
    set: { a: 24 }
```

This compiles to exactly the mechanism above, so there is one code path for
visibility and hand-written `show` expressions keep working beside it.

| Key | Meaning |
|---|---|
| `reveal` | Object names to bring on screen at this step. They stay on at later steps. |
| `set` | Params this step establishes. **Read by the host, not applied by the engine** — see below. |

Steps are numbered from 1. The engine declares a `step` param for you
(`value: 0`, `max:` the number of steps) unless you declare your own — do that
if you want a different starting step or range. Advancing the build-up is an
ordinary param change:

```js
kg.update({ params: [{ name: 'step', value: 2 }] });
```

**Objects no step mentions are visible from the start.** A build-up names what
appears late; it does not require you to list the whole diagram.

**Only objects you named can be revealed.** A `reveal` naming something no
object answers to warns — otherwise a typo produces a step that silently does
nothing. See [Names and titles](./05-graph-objects.md#names-and-titles).

**A reveal takes an object's decorations with it.** A point's droplines and axis
labels are separate objects with names of their own, and revealing the point
brings them along. Naming an econ composite reveals what it draws:
`reveal: [equilibrium]` brings up the equilibrium point.

**A `show` you wrote yourself is combined, not replaced.** An object revealed at
step 2 *and* written `show: params.showMR` is making two claims, and both have
to hold for it to appear. Honouring one by discarding the other would be a
silent wrong answer.

> [!WARNING]
> Expressions are mathjs, which spells logical operators `and`, `or` and `not`.
> **`&&`, `||` and `!` do not parse** — and an expression that does not parse is
> returned as its own text, which is non-empty and therefore reads as *true*. A
> `show: 'a && b'` is not occasionally wrong; it is permanently visible. The
> engine now warns when it sees one.

### Why the engine will not apply a step's `set`

`kg.steps()` hands back the declared steps so a host can read each one's `set`
and apply it itself. The engine deliberately does not do it, because
[a multi-param update is not atomic](../interactivity.md#updating-param-state-programmatically):
each param is validated alone, so a legal destination reached through an illegal
interim is rejected halfway and rolled back with no diagnostic. Which order to
move them in has to be decided with the diagram in view. That decision is the
host's, and it should be made visibly rather than taken quietly here.

The timeline itself — scrubbing, back and forward, lesson prompts — is the host
application's too. The engine supplies addressable objects and a reveal
predicate; nothing else.

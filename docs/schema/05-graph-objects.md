# 05 - Basic Graph Objects

Basic Graph Objects are the geometric primitives that make up interactive diagrams. They are instantiated inside a graph's `objects` array.

## `GraphObject` Base Properties

All graph objects share certain common definitions (from `GraphObjectDefinition`):

- `color`: The stroke/fill color (e.g., `blue`, `red`).
- `layer`: The z-index/drawing order layer.
- `show`: A math expression evaluating to boolean/number indicating whether to show the object (e.g. `show: (price > 10)`).
- `name`: Used to reference this object inside the math evaluations (`calcs.name.x`, etc.), and the object's address from outside the engine — see [Names and titles](#names-and-titles).
- `title`: The object's human name, for prose about it. Not drawn.
- `strokeWidth`, `lineStyle`: For objects with strokes (e.g. `dashed`, `dotted`).
- `ghost`: Draw a second copy of this object bound to the previous state — see [Ghosts](#ghosts-ghost).

## Names and titles

An object has two kinds of name, and they answer different questions.

`name` is its **address**. It is the calc key its geometry publishes under
(`calcs.demand.slope`), and it is how anything outside the engine refers to the
object. Names are checked for uniqueness at parse time: two objects answering to
one name warns, because whichever parses second loses its calcs and any
reference to that name becomes ambiguous. An object you do not name gets a
generated one (`KGID_…`) and is deliberately **not addressable** — nothing
refers to it, so a collision between two generated names is neither an error nor
reported.

`title` is its **word in a sentence**: "demand" where the drawn label is `D` and
the name is `demand`. It exists so a host can write *"demand shifts right"*
without knowing calc keys. It is never rendered.

Titles default so that a diagram narrates without being hand-annotated:

| Case | `title` |
|---|---|
| You wrote one | yours |
| You named the object | the `name` you gave it |
| An econ composite named it | the composite's word — `demand`, `supply`, `marginal revenue`, `the PPF` |
| A second unnamed object of the same kind | the word, numbered: `demand 2` |
| Nothing named it | none — a generated name is not a word for anything |

```yaml
- type: Line
  def:
    name: demand          # the address, and the calc key
    title: market demand  # the word for prose about it
    yIntercept: params.a
    slope: -1
```

### Decorations do not share an object's identity

A point's droplines and axis labels, and a curve's own label, are built by
copying the object's def — so they used to carry its name as well. They now get
their own, because three things answering to `equilibrium` makes the address
ambiguous and would narrate one movement three times. A single object drawn as
*several* curves — an indifference curve either side of its asymptote — is the
opposite case and keeps its one name, deliberately.

Composites that publish calcs but draw nothing themselves hand the title to the
object that *is* drawn. `EconLinearEquilibrium` publishes `calcs.equilibrium.Q`
and `.P` and draws a point named `equilibrium_point` titled `equilibrium`: the
point is the thing that moves, so the point is the thing narration talks about.

## Ghosts (`ghost`)

Any graph object can carry `ghost`, which draws a second copy of it bound to
[the previous state](02-parameters-and-interactions.md#remembering-the-previous-state-prev):
where this thing was when the student took hold of it.

```yaml
- type: Line
  def:
    name: demand
    yIntercept: params.a
    slope: -1
    color: colors.demand
    label: { text: D, x: 4 }
    drag: [{ vertical: a }]
    ghost: true
```

That is the whole of it. The ghost is an ordinary object of the same type built
from the same def, so it cannot disagree with the object it shadows about slope,
colour or anything else — which is exactly what a hand-written second copy does,
eventually.

**What the shorthand generates**

| | |
|---|---|
| The twin | The same def with every `params.x` read as `prev.params.x` and every `calcs.y` as `prev.calcs.y`, drawn dashed at 35% stroke opacity, *underneath* the live object. |
| Its visibility | Whatever `show` you wrote, **and** `prev.changed` — so the ghost is off until the student has actually moved something. |
| A shift arrow | Only for an object that has a single position (a point). Two parallel lines have no one displacement between them; the arrow belongs on the equilibrium, not on the curves that cross there. |
| Paired labels | The ghost keeps the label; the live object is relabelled with the schema's `newValueLabel` idiom for as long as the ghost is up — `D` and `D′` by default, `D_1` and `D_2` under `custom: '..1'`. |

**What it does not inherit**

`drag`, `click`, `draggable`, `handles` — a ghost is a memory, not a control.
`srTitle` and `srDesc`, because a screen reader should meet one object once.
And `droplines`, because a dropline's axis label names a *place on the axis*,
and two of them reading `P^*` at two different heights is a contradiction drawn
on the diagram.

It does keep `name` in one indirect sense: the ghost records `partOf`, so a
[lesson step](02-parameters-and-interactions.md) that reveals an object reveals
its ghost with it.

**Options**

```yaml
ghost:
  show: not(params.asking)   # an extra condition, read as *now* rather than as *then*
  arrow: false               # or true, to demand one where there is a position for it
  label: false               # leave both labels alone
  opacity: 0.1               # anything else is merged onto the generated def
```

`show` is the one field that is deliberately **not** rewritten to `prev`:
whether something is on screen is a claim about the present. A curve revealed at
step 3 has a ghost revealed at step 3, not one revealed at whatever step the
lesson had reached a snapshot ago.

A filled shape — an `Area`, a `Rectangle` — keeps its own fill, which is already
translucent; fading it to the ghost default would make the ghost *louder* than
the live object. Give it `ghost: { opacity: 0.1 }` if it should recede.

**Write `params.a`, not `a`**

The rewrite is textual and sees only the qualified spellings. A bare `a` cannot
be rewritten, so a ghost written that way would be bound to the same value as
the object it shadows and sit silently on top of it forever. The engine warns,
naming the object and the reference. (The bare form is worth avoiding anyway: it
resolves fine in a point's `x` and throws `Undefined symbol` out of a curve's
`fn`, taking the whole diagram with it.)

## `Point`

A single coordinate pair, typically drawn as a visible circle.

```yaml
type: Point
def:
  x: 10
  y: 20
  r: 4 # radius
  draggable: true
  label:
    text: "Equilibrium"
    position: "bl" # bottom-left
  droplines:
    vertical: "Q*"
    horizontal: "P*"
```

- **Droplines**: A `Point` can automatically generate droplines down to the X or Y axis with optional text.
- **Draggability**: Setting `draggable: true` allows the user to click and pull the point, changing the underlying `params` indirectly.

## `Line` and `Segment`

A `Line` is infinite, drawn completely across the Graph bounds. A `Segment` is finite, drawn between two points.

```yaml
type: Line
def:
  point: [0, 50]
  slope: -1
  label:
    text: "Demand"
```

A line is defined by any two of `point`, `point2`, `slope`, `invSlope`,
`xIntercept` and `yIntercept` — for example `slope` with `yIntercept`, the two
intercepts, or `xIntercept` with `slope`. Where a def carries more than two, the
first pair below wins, so pass only the pair you mean:

`point` + `point2`, then `xIntercept` + `yIntercept`, then `point` +
`yIntercept`, then `slope`/`invSlope` with an intercept, then `slope`/`invSlope`
with a `point`. A single `slope`, `yIntercept` or `xIntercept` on its own gives a
line through the origin, a horizontal line, or a vertical line respectively.

A `Segment` requires starting and ending definitions:
```yaml
type: Segment
def:
  a: [0, 5]
  b: [5, 10]
```

## `Curve` & `Area`

A `Curve` is a smooth path plotted using an expression. It requires an array of sample points or a mathematical function.

```yaml
type: Curve
def:
  fn: "100 / x"
  min: 1
  max: 10
```

By default, creating an `Area` requires two bounding mathematical functions. However, if you explicitly attach `areaAbove: true` or `areaBelow: true` to a Curve's definition, the engine will handle instantiating the Area Object automatically. Internally, it utilizes the `autoGeneratedBaseline` property to automatically calculate the maximum or minimum bounds without requiring you to declare a second function.

## Other Basic Objects

## Other Basic Objects

- **`Rectangle`** / **`Area`**: Fills a geometric boundary. Can accept vertices (`[x,y]` pairs) or function domains. 
- **`Circle`** / **`Ellipse`**: Standard basic shapes defined by center points and radii.
- **`Axis`** / **`Grid`**: Under-the-hood objects usually handled by the `Graph` itself. You rarely declare these manually in `objects`.
- **`Label`**: Floating text defined by `x`, `y`, and `text`. If your label depends on parameter values dynamically (e.g. to say "Price: \$10"), wrap the parameter or calculation name inside backticks and parentheses: `` `\((price))` ``. The engine will evaluate and inject the live value during rendering. `fontSize` is in points, defaults to 10, and is an ordinary evaluated expression — a label can change size in response to a param, not only at mount.
- **`Arrow`** / **`Angle`**: Markers for geometric demonstrations.

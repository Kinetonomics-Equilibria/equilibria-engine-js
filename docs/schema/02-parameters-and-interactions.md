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
    min?: string;
    max?: string;
    name?: string;      // a stable id for this rule
    message?: string;   // what a student should read when it refuses their move
    type?: string;      // accepted, and read by nothing
}
```

For example, if you have a budget line where `Px * X + Py * Y = M`, you might want to enforce that `Px > 0` and `Py > 0`. You would define an expression for `Px` with a min of `0.001`.

When a user interacts with a parameter (like dragging a point bound to `Px`), the Equilibria engine predictively evaluates the new mathematical state. If the new `Px` value drops below `0.001`, the engine cancels the update and rolls the parameter back to the last known valid state.

**The rollback is not silent.** It emits [`kg:param_blocked`](../interactivity.md#a-move-the-diagram-will-not-make), carrying every rule that objected, what its expression came to, and the bounds it had to clear. Write a `message` and that is the sentence a host can put in front of the student; without one the most an app can honestly say is "that isn't allowed", which is barely better than the silence.

```yaml
restrictions:
  - name: positive-price
    expression: params.Px
    min: 0.001
    message: A price cannot fall to zero — nothing would be given up for the good.
```

**Two ways to write one, and one way to break it.**

A restriction with `min` and/or `max` tests its expression as a *value*. A restriction with neither reads its expression as a *condition* — `expression: params.Px > 0` — which must hold. (Before this was implemented, a bound-less restriction narrowed nothing and permitted everything; if you have one that never seemed to fire, that is why, and it will now start firing.)

An expression that does not resolve — a name that is not there — is the failure mode to watch. The model returns an unparseable expression as its own source text and a missing property as `undefined`, and both compare `false` against every bound, so **a typo in a restriction refuses every change to every param, permanently.** It is the mirror image of the same fallback in a `show` predicate, where an unparseable expression is a non-empty string and therefore reads as *true*. The engine warns once, naming the restriction, and reports it as `unresolved` in the event.

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

Longhand first, because it is what the shorthand compiles to and the only way to
see what `prev` is actually doing. In a real config, write
[`ghost: true`](05-graph-objects.md#ghosts-ghost) on the live curve and let the
engine generate all of this — a second copy of an object's geometry is a fact
stated twice, and two statements of one fact do not stay in agreement.

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

All three objects above — the live curve, its dashed twin and the arrow — are
what `ghost: true` on a single declaration produces, along with the `D` / `D′`
relabelling that the longhand leaves you to write yourself.

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

## Freezing a drag (`draggable`)

A drag listener takes an expression for `draggable`, so whether a curve can be moved is part of the model rather than a fact about how it was mounted. It is re-read on every param change, so it goes false and true again without a rebuild.

```yaml
params:
  - name: submitted
    value: 0
    min: 0
    max: 1
    round: 1
    presentation: true      # it says how the diagram is *shown*, not what it shows

objects:
  - type: Line
    def:
      yIntercept: params.a
      slope: -1
      color: colors.demand
      drag:
        - vertical: a
          draggable: not(params.submitted)
```

While `draggable` is false the listener refuses the drag *and* the object leaves the pointer path, so it stops showing a resize cursor. Both halves matter: a curve that still invites a drag and then declines it reads as a diagram that has broken rather than as an answer that has been taken.

This is what a quiz's commit step is built on — see [P11](../plans/P11-quiz-attempt-loop.md). Two cautions worth having in advance:

- **`draggable` on the *listener*, not on the object.** The object-level `draggable: true` shorthand is a different thing: it builds a drag listener from a point's `x`/`y` bindings, and it only fires for a literal `true`. An expression there silently produces no drag at all rather than a conditional one.
- **It covers the diagram's own drags and nothing else.** A host slider writing the same param through `update({ params })` is not a drag and is not refused. A host that offers its own controls has to enforce the same freeze on them.

## Declared Build-Up Order (`steps`)

A staged reveal has always been possible one object at a time —
`show: 'params.step >= 3'` works, and un-reveals on the way back. What it costs
is 24 characters on every object, the step number duplicated into each one, and
an edit to all of them when a step is renumbered.

`steps`, at the root of the config, says it once:

```yaml
steps:
  - reveal: [demand]
  - reveal: [supply]
  - reveal: [equilibrium]
    set: { a: 24 }
  - reveal: [firmPanel]     # a panel key: everything drawn in that panel
```

This compiles to exactly the mechanism above, so there is one code path for
visibility and hand-written `show` expressions keep working beside it.

| Key | Meaning |
|---|---|
| `reveal` | What to bring on screen at this step — object names, or panel keys. Whatever a step reveals stays on at later steps. |
| `set` | Params this step establishes. **Read by the host, not applied by the engine** — see below. |

Steps are numbered from 1. The engine declares a `step` param for you
(`value: 0`, `max:` the number of steps, `presentation: true`) unless you declare
your own — do that if you want a different starting step or range. It is a
presentation param because advancing a build-up is not the student moving
anything: without the flag, `prev.changed` would be true the moment a step fired
and every ghost in the diagram would appear over an untouched curve. Advancing
the build-up is an ordinary param change:

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

**A panel key reveals the whole panel, frame included.** A graph's axes and their
titles are built from `xAxis` and `yAxis` and are never named, so no list of
object names can hide them — which matters when a diagram declares a panel up
front that the lesson does not reach until later, because otherwise it sits there
showing an empty labelled box. `reveal: [surplus]` hides everything drawn against
that panel's scales until its step. Panel keys come from `CustomLayout`'s `key`,
or a graph's `name`.

**Revealing one object twice composes rather than replaces.** If a panel key and
an object's own name both name it at different steps, both predicates hold, so it
appears at the later of the two. The engine warns, because that is a reasonable
resolution and an unpleasant thing to work out from a diagram that will not draw
when you expect.

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
and apply it itself. **Keys the engine does not recognise ride along untouched**,
so a host can write its own alongside the reveals — a sentence for the student, a
question — and get them back from the same call. `steps<T>()` is generic in the
step type for exactly that. One ordered list, rather than an application-side
list shadowing this one and drifting from it. The engine deliberately does not do it, because
[a multi-param update is not atomic](../interactivity.md#updating-param-state-programmatically):
each param is validated alone, so a legal destination reached through an illegal
interim is rejected halfway and rolled back with no diagnostic. Which order to
move them in has to be decided with the diagram in view. That decision is the
host's, and it should be made visibly rather than taken quietly here.

The timeline itself — scrubbing, back and forward, lesson prompts — is the host
application's too. The engine supplies addressable objects and a reveal
predicate; nothing else.

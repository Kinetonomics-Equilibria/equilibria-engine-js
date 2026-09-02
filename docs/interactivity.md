# API & Interactivity

The power of the Equilibria engine lies in allowing the host web application (the outside code) to communicate two-ways with the configured mathematical visualizations.

## Events

The `KineticGraph` class extends `EventEmitter3`. This gives the host application the ability to attach subscriptions to interactions happening on the graph.

> [!TIP]
> **In this repo:** the internal React bindings ([`packages/react`](../packages/react))
> re-export `KG_EVENTS` and provide callback props (`onParamChanged`, `onParamBlocked`,
> `onCurveDragged`, `onNodeHover`), so app code does not subscribe manually.

The engine exposes a `KG_EVENTS` object with the following event keys:

| Event Key | Event Name | Fired when |
|-----------|------------|------------|
| `KG_EVENTS.PARAM_CHANGED` | `'kg:param_changed'` | A param change is **accepted** — from a drag, a click, or `update()`. A change a restriction rejects does not fire. |
| `KG_EVENTS.PARAM_BLOCKED` | `'kg:param_blocked'` | A change the diagram **would not make** — the value was outside the param's own range, or a restriction refused the state it implied. Once per cause, not per drag tick. |
| `KG_EVENTS.CURVE_DRAGGED` | `'kg:curve_dragged'` | A drag on an object starts moving and when it ends. `dragging` says which. |
| `KG_EVENTS.NODE_HOVER` | `'kg:node_hover'` | The pointer enters or leaves an interactive object. `hovering` says which. Only draggable and clickable objects receive pointer events at all. |

### Listening for Events

```js
import { KineticGraph, KG_EVENTS } from "equilibria-engine-js";

const kg = new KineticGraph(config);
kg.mount(document.getElementById('container'));

kg.on(KG_EVENTS.PARAM_CHANGED, (e) => {
    // { name, value, previousValue, params, affected }
    console.log(`${e.name}: ${e.previousValue} → ${e.value}`);
});

kg.on(KG_EVENTS.CURVE_DRAGGED, (e) => {
    // { name, title, dragging }
    console.log(e.dragging ? `dragging ${e.title}` : `let go of ${e.title}`);
});
```

### What moved: the `affected` array

`kg:param_changed` carries what the change did to the diagram, which is the
difference between a readout and an explanation:

```js
{
  name: 'a', value: 24, previousValue: 20,
  params: { a: 24, ... },
  affected: [
    { name: 'demand', title: 'demand',
      movement: { kind: 'shift', dx: 0, dy: 4, axis: 'y', sign: 1 } },
    { name: 'equilibrium_point', title: 'equilibrium',
      movement: { kind: 'move', dx: 2, dy: 2, axis: 'both', sign: 0 } }
  ]
}
```

| Field | Meaning |
|---|---|
| `kind` | `move` (a point), `shift` (every sampled point translated together), `rotate` (the shape pivoted). |
| `dx`, `dy` | Mean change, **in domain units** — so it means the same thing whatever size the panel is drawn at. |
| `axis` | `x`, `y`, or `both`. |
| `sign` | `1` or `-1` along `axis`; `0` when `axis` is `both`. |
| `steeper` | On `rotate` only: whether the chord through the shape got steeper. |

Three things this deliberately does **not** do.

It does not write the sentence. `{ kind: 'shift', axis: 'x', sign: 1 }`, never
"shifts right" — phrasing, tense, tone and translation are product copy, and
belong where they can be revised without editing a diagram.

It does not pick between "up" and "right" for something that moved both ways.
That is a question about economics rather than geometry — for a demand curve the
convention is horizontal — so `axis` is `both` and the app decides.

It does not report movement it is not sure of. A change smaller than a tenth of
a percent of the visible axis range is treated as no movement, because an app
told "shifted right" by rounding noise says something confidently false to a
student. Only objects with a [`title`](./schema/05-graph-objects.md#names-and-titles)
that are currently on screen are ever described; an untitled object has no word
an app could use for it.

Movement is measured **from the last snapshot**, not from the previous frame —
the same comparison `prev` makes. A bracketed drag therefore reports the whole
movement from where the student grabbed the curve, and a ghost drawn from `prev`
and a sentence written from `affected` always describe the same event. See
[Gestures and Snapshots](#gestures-and-snapshots).

Nothing is measured when nothing is listening: with no `kg:param_changed`
subscriber the engine skips the comparison entirely.

### A move the diagram will not make

Two mechanisms stop a param moving and, from the student's side, they are the
same thing: the curve stops. Neither said anything before this event existed,
and the quieter of the two is the commoner one — a drag past the end of a param's
range clamps and reports an ordinary `kg:param_changed`, so the host is told the
curve *moved*, and every further push reports nothing at all.

```js
kg.on(KG_EVENTS.PARAM_BLOCKED, (e) => {
    if (e.reason === 'bounds') {
        say(`${e.label} will not go above ${e.max}.`);
    } else {
        say(e.restrictions.map(r => r.message).filter(Boolean).join(' '));
    }
});
```

| Field | Meaning |
|---|---|
| `name`, `label` | The param, and what the author called it. |
| `reason` | `'bounds'` — outside the param's `min`/`max`. `'restriction'` — a rule the author declared. |
| `requestedValue` | What was asked for, before clamping or rounding. |
| `attemptedValue` | The value actually tried, after the clamp and the round. |
| `value` | Where the param stands now: the clamped end, or the value it reverted to. |
| `min`, `max` | The param's own range. |
| `limit` | `'min'` or `'max'` — on a `'bounds'` refusal, which end was hit. |
| `restrictions` | On a `'restriction'` refusal, every rule that objected; `[]` otherwise. |

Each entry in `restrictions` carries the author's `name` and `message`, the
`expression` verbatim, the `value` it evaluated to, the `min`/`max` it had to
clear, and — if it did not resolve to a number at all — `unresolved`.

**`unresolved` is not the student's fault, and copy should not treat it as one.**
An expression naming something that is not there comes back as its own source
text, or as `undefined`, and both compare `false` against any bound — so one typo
in a restriction refuses every change to every param, permanently. The engine
also warns about it once, in the console, where the author will see it.

**Once per cause, not per tick.** A pointer dragged along a boundary asks for a
new out-of-range value on every move, all with the same cause; the engine
announces the first and then stays quiet until that param moves somewhere it
will go, or until the cause changes. Nothing has to be debounced downstream.

**Rounding is not a refusal.** Asking for `20.04` of a param that moves in tenths
is asking for `20.0`, and no event is emitted.

**Nothing is emitted when nothing is listening**, matching `kg:param_changed`.

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

## Reading the current values

```js
const { Pe, CS } = kg.getCalcs();
```

`kg:param_changed` carries `calcs` alongside `params`, so a host putting a
number beside a diagram never has to re-derive it — one definition serves the
diagram and the readout, which is the only way the two cannot disagree.
`getCalcs()` is the same thing at rest, for the first render, before anything
has changed.

A **delta** is an ordinary calc over [`prev`](./schema/02-parameters-and-interactions.md#remembering-the-previous-state-prev):

```yaml
calcs:
  Pe: (params.a + params.c)/2
  dPe: calcs.Pe - prev.calcs.Pe
```

Both arrive in the event. The delta is measured against the same snapshot the
ghosts are drawn from, so a chip and a ghost always describe one movement.

### Reading the params

```js
kg.getParams();
// [{ name: 'a', label: 'Demand intercept', value: 20, min: 12, max: 28,
//    round: 0.1, precision: 1, presentation: false, isBoolean: false }, …]
```

The counterpart of `getCalcs()`: what the diagram *takes*, where that gives what
it computes. In declared order, and copies — move a param with `update()`.

Three fields exist because a host cannot work them out for itself:

- **`precision`** is the number of decimal places `round` implies, and it is what
  a value should be printed to. Without it a host either hardcodes a number or
  re-derives it, and a readout ends up saying `13.000000000002` beside a diagram
  that says `13.0`.
- **`presentation`** marks a param that says how the diagram is *shown* rather
  than what it shows — a panel's density, which panel a host has focused. A host
  filtering "params the student moved" from those cannot do it by name: an undo
  built without it restores a promoted panel along with the price.
- **`isBoolean`** says the author declared this param as `true`/`false`. The
  engine coerces one to 0/1 with numeric bounds before anything outside can see
  it, so by this point it is indistinguishable from a small integer — and a
  control panel that guesses offers a hundred-step slider for a toggle. Nothing
  downstream can recover the fact, so it is recorded where it is still known.

## Declaring a boundary the engine cannot see

```js
kg.snapshot();                                   // mark where the diagram is now
kg.update({ params: [{ name: 'a', value: 26 }] });
```

`prev` — and every ghost, shift arrow and delta drawn from it — is updated at an
*interaction boundary*. A drag brackets itself, and a host-driven scrub is
bracketed with `beginGesture()` / `endGesture()`. A **discrete jump** is
invisible: applying a scenario, revealing an answer, starting a lesson step all
arrive as ordinary param updates, and nothing in them says a new "before" has
begun.

Call `snapshot()` **before** the change, since it marks the state as it stands.
Skipping it is not a silent no-op — it produces the opposite of one. Before the
student's first drag no snapshot has been taken at all, so `getSnapshot()`
returns `null` while the diagram's own `prev` is still seeded from construction:
the ghosts draw a movement and a host reading the snapshot is told nothing
happened.

The mirror case is an **undo**, which should *not* snapshot. Restoring the params
to what `prev` already holds is what makes `prev.changed` false again, so the
ghosts hide themselves and the diagram stands down on its own.

## Setting a panel's level of detail

```js
kg.setDensity('firm', 'full');
```

A panel that declared a `density` draws at a level matched to its size — a full diagram at 620px, a
recognisable glyph at 190px. The level lives in a param, so this is a param update with no remount:
a panel promoted from a rail to the stage can gain its axis labels **as** it grows.

Only a panel that declared a `density` can be set, and a panel declared `'auto'` is the engine's to
choose — setting one warns, because the next resize will overwrite it. See
[Density](./schema/03-layouts.md#density-how-much-detail-a-panel-draws) for the levels, what each
one drops, and how a level composes with what the author wrote.

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

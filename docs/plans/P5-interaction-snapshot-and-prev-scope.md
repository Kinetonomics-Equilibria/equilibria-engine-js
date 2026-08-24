# P5 — Interaction snapshot and the `prev` scope

**Lane:** engine
**Depends on:** nothing
**Unblocks:** ghosts (product idea 1); P12 — Refusals that speak (outlined below, split out of this plan); P13 — `ghost:` authoring shorthand (out of scope, named below)
**Status:** Draft plan — not implemented
**Note:** the sub-plans this document splits out were renumbered P12 and P13 to avoid colliding with P6 (object identity) and P7 (stage composition).

## Goal

Give the engine a one-deep memory of its own state, and give authors a way to read
it from an expression.

Concretely: after this plan, an author writes

```yaml
- type: Line
  def:
    yIntercept: prev.params.a      # where demand was before the student moved it
    slope: -1
    lineStyle: dashed
    strokeOpacity: 0.35
    show: prev.changed
- type: Arrow
  def:
    begin: [prev.calcs.Qe, prev.calcs.Pe]
    end: [calcs.Qe, calcs.Pe]
    show: prev.changed
```

and gets a ghost of the previous demand curve plus a shift arrow, with no shadow
params, no duplicated calcs, and no host-side bookkeeping. `Arrow` already maps
`begin`/`end` onto the `Segment` coordinate pair `a`/`b`
(`packages/engine/src/ts/KGAuthor/graphObjects/arrow.ts:23-24`,
`packages/engine/src/ts/KGAuthor/graphObjects/segment.ts:10-17,44-45`), and
`lineStyle` / `opacity` / `strokeOpacity` / `show` are all updatables
(`packages/engine/src/ts/view/viewObjects/viewObject.ts:129`), so the *drawing*
half is already there. This plan supplies the missing half: the values.

Three things are in scope: **when a snapshot is taken**, **how `prev` reads in the
expression scope**, and — argued below — **not** the restriction-rollback event,
which is split into its own plan.

## Why this shape

**Corrections to the brief's "verified facts."** Two are wrong and one is
incomplete; both corrections change the plan's shape.

1. **The engine emits none of `kg:param_changed`, `kg:curve_dragged`,
   `kg:node_hover`.** They are declared (`packages/engine/src/ts/constants.ts:1-5`),
   re-exported (`packages/engine/src/ts/kg.ts:6`), documented as "Fired when…"
   (`docs/interactivity.md:14-18`), forwarded by the React hook
   (`packages/react/src/useEquilibria.ts:113-123`) and exercised by React tests
   that call `.emit()` by hand
   (`packages/react/src/__tests__/useEquilibria.test.tsx:251-253`). But a
   full-tree grep of `packages/engine/src` finds exactly one `emit` call site —
   `this.emit('error', err)` at `kg.ts:81`. `kg.ts:54` assigns
   `(this.view as any).emitter = this` and **nothing ever reads it**. The three
   interaction events are dormant. The documentation is inaccurate today.

   This matters twice over. It is why the restriction-rollback work is a bigger
   job than "add an event" (there is no model→host path to add it to), and it is
   why the no-engine-change fallback cannot ship ghosts (below).

2. **A drag gesture already freezes the params at drag start — by aliasing.**
   `interactionHandler.ts:88` does `handler.scope.params = handler.model.currentParamValues`,
   which copies a *reference*. `Model.evalParams()` builds and returns a **fresh**
   object every time (`model.ts:90-96`), and `updateParam` rebinds the field to
   that new object (`model.ts:242`), so the object the handler is holding is never
   mutated. The same is true of `currentCalcValues`: `evalCalcs()` reassigns to a
   fresh `evalObject()` result (`model.ts:102-105`) before the 5-pass loop mutates
   it. So `params.X` inside `params.X + drag.dx`
   (`controller/listeners/dragListener.ts:35,40`) resolves to the value at drag
   start, for the whole gesture.

   That is not incidental — it *is* the snapshot, already computed, already
   correctly scoped to a gesture, already load-bearing for drag correctness. This
   plan does not invent a lifecycle point; it publishes one the engine already
   observes.

3. The rest check out: `Param` holds one `value` and `update()` clamps then rounds
   (`model/param.ts:76-88`); `updateParam` captures `oldValue` at `model.ts:235`,
   hypothesises the new state, tests restrictions, and reverts at `model.ts:257-259`
   with nothing emitted; the flat mathjs scope is built at `model.ts:159-170` with
   no `prev`; `evalCalcs` runs a fixed 5-pass loop at `model.ts:108`;
   `Restriction.valid` evaluates an expression against min/max
   (`model/restriction.ts:31-43`); `EconSchema` ships `oldValueLabel` /
   `newValueLabel` (`KGAuthor/econ/schemas/econSchema.ts:30-31`);
   `useEquilibria` exposes `updateParams` calling `instance.update({ params })`
   (`packages/react/src/useEquilibria.ts:160-164`). The authoring docs also state
   the rollback behaviour explicitly — "the engine will silently cancel the update
   and roll back" (`docs/schema/02-parameters-and-interactions.md`, final line).

**On bundling.** Items 1 and 2 of the assignment are one feature and should stay
bundled. A snapshot nothing can read is dead weight; a `prev` scope nothing fills
is empty. They share one data structure (`prevParamValues` / `prevCalcValues`),
one lifecycle hook, one set of tests, and one backwards-compatibility argument
(the reserved name `prev`). Splitting them produces two plans neither of which
does anything.

Item 3 — restriction rollbacks that say why — **should be split**, and is
outlined at the end of this plan as **P12**. The reasoning:

- Its real cost is not the event, it is the **absence of any model→host event
  path**. Building that path means deciding whether `Model` becomes an
  `EventEmitter`, reordering `KineticGraph.mount` so the emitter exists before
  `new View()` (today it is attached at `kg.ts:54`, one line *after* the View is
  constructed at `kg.ts:49`), and forwarding through the View. That is a
  structural change with a blast radius far beyond restrictions.
- Once that path exists, the honest thing to do in the same change is to make
  `kg:param_changed`, `kg:curve_dragged` and `kg:node_hover` real, because they
  are documented as working. That is a plan, not a patch.
- P5 needs **no emitter at all**. Its read surface is `kg.getSnapshot()` and the
  expression scope. Keeping the emitter out of P5 keeps P5 small and its
  regression risk near zero.

The one argument *for* bundling: both edits land in the same ~30 lines of
`Model.updateParam` (`model.ts:231-262`) and will conflict textually. That is
resolved by ordering rather than merging — P12 depends on P5 and appends to it.

**On the snapshot's default timing.** Five candidate triggers, and what each one
means to a student:

| Trigger | "before" means | Serves | Fails |
| --- | --- | --- | --- |
| every accepted param change | the previous tick | nothing | **the trap.** A drag fires ~60 updates/sec; prev is one tick behind, the ghost sits under the live curve, the arrow is a pixel long |
| gesture start | where it was when you grabbed it | "what did I just do?" — ghosts | changes with no gesture (host slider, click toggle, `kg.update`) leave prev stale |
| explicit host call `snapshot()` | whatever the app declares | quiz reveal, "mark this as the baseline" | app has to remember; nothing happens by default |
| scenario / config apply | before this scenario | "what did this policy do?" | too coarse to explain one drag |
| lesson step boundary | the state at the start of this step | multi-move exercises ("shift both curves") | the engine has no concept of a step; this is the host's word |

**Recommended default: gesture-scoped** (`snapshotOn: 'gesture'`). One snapshot per
gesture, committed on the gesture's first actual movement, unchanged for the rest
of it. Every other trigger stays reachable: `kg.snapshot()` for host-declared
boundaries (quiz reveal, scenario apply, step boundary), `snapshotOn: 'change'`
for the naive per-change semantics (offered, documented as the trap),
`snapshotOn: 'never'` for host-only control, and `snapshot: false` on an individual
drag listener for a control the author does not want ghosted.

The critical mechanism is **coalescing, not the drag hook**. The rule is "at most
one snapshot per open gesture", which is what defeats the slider trap. And the
engine cannot infer gesture boundaries from a stream of `kg.update({params})`
calls — there is no in-engine slider (no slider or div view object is registered:
`view/viewObjects/index.ts`), so continuous host controls arrive as an
undifferentiated sequence of `updateParam` calls (`kg.ts:93`). So the host must be
able to declare a gesture: `kg.beginGesture()` / `kg.endGesture()`, which map
exactly onto a Mantine `Slider`'s `onChangeStart` / `onChangeEnd`. Saying this out
loud is the difference between a feature that works with the app's sliders and one
that only works with in-diagram drags.

**On `prev.calcs`: store, do not recompute.** Three reasons.

- **It is free.** `evalCalcs` already produces a fresh object every call
  (`model.ts:102-105`), so snapshotting the calcs is a single reference
  assignment — O(1) time, one retained object generation. Recomputing means a
  second full `evalObject` pass over every calc with a swapped scope.
- **It is what the student saw.** Recomputation reconstructs what the calcs
  *would* evaluate to given `prev.params`; storing records what they *did*
  evaluate to. Those diverge whenever a calc depends on anything besides params,
  and there is no reason to show the student a reconstruction when the original
  is sitting there.
- **It terminates.** Recomputing `prev.calcs` requires evaluating calc
  expressions, some of which may reference `prev.*` — an infinite regress with no
  natural base case. Storing makes `prev.calcs.X` mean "X at the previous
  snapshot", full stop, one level deep, no recursion.

**On evaluation order and the 5-pass loop.** The hazard the brief asks about is
real but bounded, and the bound is worth stating as an invariant:

> **`prev` is immutable for the duration of any single evaluation pass.** It
> changes only between frames, at a snapshot boundary, and a snapshot never
> captures `prev` itself.

`evalCalcs` clears and rebuilds `currentCalcValues`, and during that rebuild
`model.evaluate` hands the *partially built* calcs object into scope
(`model.ts:154,167`) — that is why the 5-pass loop exists. `prev`, by contrast,
is fully formed before the pass starts, so `prev.params.a` and `prev.calcs.Qe`
both resolve on pass 1 and the loop's convergence behaviour is unchanged. There
is no ordering hazard *from* `prev`.

What remains is a bootstrapping question: at construction, `evalCalcs()` runs
before any snapshot exists. Handled by a cheap static check — scan the calc
definition strings once at construction for `\bprev\b`. **For every config
authored today that scan finds nothing and the constructor behaves exactly as it
does now.** Only when a calc does reference `prev` does the constructor commit the
seed snapshot and run `evalCalcs()` a second time so the reference resolves.
One extra pass, at mount, only for configs that asked for it.

**On flattened bare names.** No new top-level names. `prev` is a nested object
only. Inside it, mirror the existing flat-scope shape exactly (`model.ts:159-170`):
`prev.params.a`, `prev.calcs.Qe` as the canonical spellings, plus flattened
`prev.a` / `prev.Qe` for symmetry, with calcs shadowing params on a name collision
because that is the precedence the top-level scope already has (params spread
first at `:160`, calcs second at `:161`). Adding bare top-level names like `a_prev`
would collide unpredictably with real params and force a naming convention on
authors; the nested object costs nothing and reads better.

## Current state

- `Model` holds `currentParamValues`, `currentCalcValues`, `currentColors`,
  `currentIdioms` (`model.ts:51-54`). There is no history of any kind.
- `Model.evaluate` builds the mathjs scope at `model.ts:159-170`. `params`,
  `calcs`, `colors`, `idioms` and `d3` are effectively reserved names there
  already — a param called `params` is clobbered at `:165`. There is no `prev`.
- `Model.updateParam` (`model.ts:231-262`): capture `oldValue`, `param.update()`
  (clamp + round, `param.ts:76-88`), re-evaluate, test every restriction, then
  either `model.update(false)` or revert and re-evaluate. Nothing is emitted on
  either branch.
- `Model.resetParams()` (`model.ts:82-88`) exists and has **no call sites** in the
  engine (grep: only the definition).
- Drag path: `InteractionHandler.addTrigger` (`interactionHandler.ts:86-107`)
  wires `d3.drag()`. `start` freezes `scope.params`/`scope.calcs`/`scope.colors`
  by reference and records `drag.x0/y0` (`:88-92`); `drag` computes `dx/dy` and
  calls each `DragListener.onChange` (`:94-103`); `end` does nothing (`:104-106`).
  `Listener.onChange` compiles its expression against that scope and calls
  `model.updateParam` (`listener.ts:36-41`).
- `ViewObject` re-evaluates only its `updatables` and redraws only when
  `hasChanged` (`viewObject.ts:129`, `:298`), so an object bound to `prev.*` costs
  nothing on frames where `prev` did not move.
- Public engine surface is `packages/engine/src/ts/kg.ts` (`package.json`
  `exports: { ".": "./src/ts/kg.ts" }`): `KineticGraph`, `KG_EVENTS`,
  `KG_CONTAINER_CLASS`, `KineticGraphOptions`.
- No config in the repo, and no generated `EconSchema` output, uses the name
  `prev` (grep of `packages/engine/src/ts` for `\bprev\b`: no matches).
- The webapp's only diagram (`apps/web/src/App.tsx:19-62`) has params `a`, `c`
  and calcs `Qe`, `Pe`, and no `draggable` on either line. `EconLinearDemand`
  supports `draggable: true`, which synthesises drag listeners bound to the param
  named in the intercept (`KGAuthor/econ/micro/equilibrium/linearDemand.ts:61-72`,
  `KGAuthor/parsers/parsingFunctions.ts:167-188`).

## Approach

Five steps, each independently shippable and each backwards-compatible.

### 1. Snapshot storage in `Model`

Add to `Model`:

```ts
public prevParamValues: {} = {};
public prevCalcValues: {} = {};
public snapshotSeq: number = 0;      // 0 until the first real snapshot
private gestureDepth: number = 0;
private snapshotOn: 'gesture' | 'change' | 'never' = 'gesture';
```

`snapshot(opts?: { render?: boolean })`:

```
prevParamValues = currentParamValues     // reference capture; evalParams() always
prevCalcValues  = currentCalcValues      // returns a fresh object (model.ts:90-96, 102-105)
snapshotSeq++
if (opts.render !== false) update(false)
```

Never capture `prev*` into `prev*` — memory stays O(1) and there is no
prev-of-prev chain.

Constructor: initialise `prevParamValues`/`prevCalcValues` to `{}` before the
first evaluation, then after the existing `evalParams()`/`evalCalcs()` at
`model.ts:71-74` commit a seed snapshot with `render: false` and
`snapshotSeq = 0`. Then, **only if** a static scan of the calc definitions finds
`\bprev\b`, run `evalCalcs()` once more so calcs that reference `prev` resolve
numerically instead of falling through `evaluate`'s catch and being returned as
strings (`model.ts:178-186`).

Seeding means `prev` is never `undefined` and at `t=0` `prev === current`, so an
unsnapshotted ghost draws *coincident with* the live object rather than crashing,
producing a wrong number, or silently becoming a string. `prev.seq === 0` and
`prev.changed === 0` let the author hide it. The rejected alternative is leaving
`prev` undefined: mathjs throws, `evaluate` catches and returns the expression
string verbatim (`model.ts:185`), and that string flows into a coordinate — the
exact silent-wrong-answer failure mode `reportUnresolvedCalcs` was written to
close (`model.ts:191-211`, `NOTES.md`).

### 2. Gesture coalescing

```ts
beginGesture() { if (++this.gestureDepth === 1 && this.snapshotOn === 'gesture') this.snapshot(); }
endGesture()   { this.gestureDepth = Math.max(0, this.gestureDepth - 1); }
```

The depth counter (rather than a boolean) handles multi-touch, where two
simultaneous d3 drags each open a gesture, and host gestures nesting inside
diagram gestures. Only the 0→1 transition snapshots.

Hook it in `InteractionHandler.addTrigger` (`interactionHandler.ts:86-107`):

- `start` (`:87-93`): unchanged. **Do not snapshot here** — `d3.drag` fires
  `start` on mousedown even when the pointer never moves, so snapshotting there
  would burn a render and a ghost on every stray click.
- `drag` (`:94-103`): call `handler.model.beginGesture()` once per gesture, before
  the `dragListeners.forEach`, guarded by a per-handler `gestureOpen` flag. At
  that instant no `updateParam` has run for this gesture, so
  `currentParamValues` is still the object frozen into `scope.params` at
  `start` — the snapshot captures drag-start state exactly.
- `end` (`:104-106`): `handler.model.endGesture()` and clear `gestureOpen`.

Per-listener opt-out: `DragListenerDefinition` gains `snapshot?: boolean`
(default `true`); a handler whose drag listeners all set `snapshot: false` does
not open a gesture.

Cost: exactly one extra `model.update(false)` per gesture (not per tick). Every
subsequent tick is unchanged.

`snapshotOn: 'change'` is implemented in `updateParam`'s success branch, before
`model.update(false)` at `model.ts:254`, and only when `gestureDepth === 0` — so
even in `'change'` mode a real gesture still coalesces. `snapshotOn: 'never'`
does nothing automatically.

`kg.update({ params })` does **not** snapshot by default: it is a programmatic
set, not a student action, and the quiz-reveal flow depends on being able to push
the correct answer in without clobbering the student's ghost. A host that wants a
ghost across a programmatic change calls `kg.snapshot()` first.

`resetParams()` (`model.ts:82-88`) should reset `prev` to the post-reset state
too, otherwise a reset leaves a ghost of the pre-reset world hanging over a fresh
diagram. It has no call sites today; fix it while the semantics are being
defined.

### 3. `prev` in the mathjs scope

In `Model.evaluate`, build the `prev` object alongside the existing flat scope
(`model.ts:152-170`):

```ts
const prev = {
    ...this.prevParamValues,
    ...this.prevCalcValues,          // calcs shadow params, matching :160-161
    params: this.prevParamValues,
    calcs:  this.prevCalcValues,
    seq:     this.snapshotSeq,
    changed: this.paramsDifferFromSnapshot() ? 1 : 0
};
```

added to `flatScope` as a single `prev` key.

`prev.changed` uses strict inequality with no epsilon, which is exact here:
`Param.update()` snaps every value to `Math.round(v / round) * round`
(`param.ts:85`), so values live on a grid and "differs" is unambiguous. Computing
it in the engine saves every author from hand-writing
`abs(a - prev.a) > 0.001 or abs(c - prev.c) > 0.001` and getting the epsilon
wrong.

`seq` and `changed` are reserved names *inside* `prev` only.

Numbers rather than booleans for `seq`/`changed`: the engine already coerces
boolean params to `0`/`1` (`param.ts:54-58`, `view.ts:133-138`), so numeric flags
match how `show: params.someToggle` already behaves.

### 4. Reserved-name diagnostic

At construction, if any param or top-level calc is named `prev`, `console.warn`
once naming the collision and stating that the `prev` scope object wins. This is
the plan's only backwards-incompatible edge, it affects no config in this repo
(verified by grep), and it extends a list of names the flat scope has always
reserved (`params`, `calcs`, `colors`, `idioms`, `d3` — `model.ts:165-169`).
Follows the existing diagnostic convention: warn once, keep going, never throw
(`model.ts:191-211`, tested via `captureWarnings` in
`packages/engine/src/__tests__/helpers.ts:102-110`).

A second, softer diagnostic: warn once if a `calcs` *definition string* references
`prev.calcs`, explaining that it resolves to the value one snapshot ago rather
than a fixpoint. Not an error — it is well-defined — but it is the one spelling
that will surprise people.

### 5. Host and React surface

`KineticGraph` (`kg.ts`):

```ts
interface KineticGraphOptions {
    legacyUrlOverrides?: boolean;
    snapshotOn?: 'gesture' | 'change' | 'never';   // default 'gesture'
}

snapshot(): void
beginGesture(): void
endGesture(): void
getSnapshot(): { params: Record<string, number>; calcs: Record<string, any>; seq: number } | null
```

`getSnapshot()` returns `null` while `seq === 0`, and returns **copies**, not the
model's live references — the engine must not hand a caller an object it will
later read back as authoritative.

`snapshotOn` also readable from the config root (`ViewDefinition`), with the
constructor option taking precedence, matching how `legacyUrlOverrides` is
threaded (`kg.ts:31-35,49-51`, `view.ts:82-85,103`).

`useEquilibria` gains `snapshot`, `beginGesture`, `endGesture` as `useCallback`
wrappers in the same shape as `updateParams`
(`packages/react/src/useEquilibria.ts:160-164`), and `UseEquilibriaReturn` gains
the three fields. No new events, so no changes to the callback plumbing at
`:107-123`.

### The no-engine-change fallback, and why it is not enough

The app can build ghosts today with shadow params. For
`apps/web/src/App.tsx:19-62` that means adding `a0`, `c0` mirroring `a`, `c`;
duplicating the calcs as `Qe0: '(params.a0 - params.c0)/2'` and
`Pe0: '(params.a0 + params.c0)/2'`; adding dashed, low-opacity `Line` and `Point`
objects bound to the shadows with `show: 'a != a0'`; and calling
`updateParams([{ name: 'a0', value: previousA }, { name: 'c0', value: previousC }])`
whenever the app decides "this is now the before".

**It cannot ship ghosts at all**, for one decisive reason: to write the before
value, the app has to know it, and the app only knows values it pushed itself.
`kg:param_changed` does not fire (verified above), so a drag is invisible to the
host. Shadow params work only for changes the app originates. Ghosts exist
precisely to answer "what did I just do?" after a drag. The fallback covers the
one case the feature is not for.

Even for app-originated changes it costs:

- **Silent clamping.** A shadow write goes through `Param.update()` and is clamped
  to `[min, max]` and rounded (`param.ts:76-88`). Get the shadow's bounds slightly
  wrong and the ghost is drawn somewhere the curve never was, with no warning.
- **Silent rejection.** `kg.update({params})` routes to `model.updateParam`
  (`kg.ts:93`), which runs the **entire** restriction set (`model.ts:246-250`). A
  shadow-param write can be refused by a restriction about the live state, and the
  refusal is silent (`model.ts:257-259`). The ghost then just fails to move, and
  nothing anywhere says why.
- **Two full re-renders per "before".** Each shadow param is its own `updateParam`
  → `evalParams` + `evalCalcs` + full restriction sweep + full listener broadcast
  (`model.ts:242-254`). `prev` is one snapshot and one render regardless of how
  many params moved.
- **Hand-duplicated calcs that drift.** Every derived quantity the ghost needs is
  copied by hand. Edit `Qe` and forget `Qe0` and the ghost quietly solves a
  different model — the class of defect `NOTES.md` was written about.
- **Doubled param surface.** Every shadow appears in `params`, needs matching
  `min`/`max`/`round`, is reset by `resetParams()` to its authored initial value
  rather than to anything meaningful, and is indistinguishable from a real param
  to anything that iterates the list.
- **No gesture boundary.** The app cannot tell a drag from a slider scrub because
  the engine never tells it anything, so "this is now the before" is a guess.

Where the fallback **is** genuinely adequate: **quiz reveal** (product idea 2).
There, the app itself knows both the student's answer and the correct one, sets
both, and never needs to observe a drag. Shipping quiz reveal on shadow params
while this plan is unimplemented is a reasonable call — with the caveats about
clamping and silent restriction rejection understood.

So the honest summary is: the fallback ships idea 2 today and cannot ship idea 1
at all. That asymmetry is this plan's justification.

## API / schema surface

**New, all additive.**

Config root (`ViewDefinition`, `view.ts:31-55`):

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `snapshotOn` | `'gesture' \| 'change' \| 'never'` | `'gesture'` | when a snapshot is taken automatically |

Drag listener def (`DragListenerDefinition`, `dragListener.ts:6-11`):

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `snapshot` | `boolean` | `true` | whether this drag opens a gesture |

Expression scope (available in any string the model evaluates):

| Name | Meaning |
| --- | --- |
| `prev.params.<name>` | param value at the last snapshot (canonical) |
| `prev.calcs.<name>` | calc value at the last snapshot (canonical, **stored** not recomputed) |
| `prev.<name>` | flattened; calcs shadow params on collision, matching `model.ts:160-161` |
| `prev.seq` | snapshot counter, `0` before the first snapshot |
| `prev.changed` | `1` if any param differs from the snapshot, else `0` |

`Model` (internal):

```ts
public prevParamValues: {};
public prevCalcValues: {};
public snapshotSeq: number;
snapshot(opts?: { render?: boolean }): void;
beginGesture(): void;
endGesture(): void;
```

`KineticGraph` (public, `kg.ts`):

```ts
KineticGraphOptions.snapshotOn?: 'gesture' | 'change' | 'never';
kg.snapshot(): void;
kg.beginGesture(): void;
kg.endGesture(): void;
kg.getSnapshot(): { params: Record<string, number>; calcs: Record<string, any>; seq: number } | null;
```

`useEquilibria` (`packages/react/src/useEquilibria.ts`): adds `snapshot`,
`beginGesture`, `endGesture` to `UseEquilibriaReturn`.

**Reserved names introduced:** `prev` at scope top level; `seq` and `changed`
inside `prev`.

**Unchanged:** every existing config key, every existing expression spelling, the
three `KG_EVENTS` (still dormant — P12), `Restriction`, `Param`, the drag
expression form `params.X + drag.dx`.

## Tests

New file `packages/engine/src/__tests__/interaction_snapshot.test.ts` — named to
avoid confusion with the existing `snapshot.test.ts`, which is a DOM
snapshot-regression test and has nothing to do with this feature.

**Model-level** (no DOM; `new Model({ params, calcs, colors: {}, idioms: {} })`,
the pattern at `packages/engine/src/__tests__/diagnostics.test.ts:16-18`):

1. At construction `prev.params.a` equals the initial value, `prev.seq === 0`,
   `prev.changed === 0`.
2. `snapshot()` then `updateParam('a', …)`: `prev.params.a` is the pre-change
   value, `currentParamValues.a` is the new one, `prev.changed === 1`.
3. `prev.calcs.Qe` equals the calc value **at snapshot time** — asserted by
   picking a calc whose recomputation from `prev.params` would give a different
   answer, so the test distinguishes stored from recomputed.
4. **The anti-trap test.** One snapshot followed by *many* `updateParam` calls
   leaves `prev` fixed at the pre-first-change value. This is the assertion a
   naive per-change implementation fails, and it is the reason the file exists.
5. `beginGesture()` → N × `updateParam` → `endGesture()` takes exactly one
   snapshot; nested `beginGesture()` calls do not take a second; unbalanced
   `endGesture()` cannot drive the depth negative.
6. `snapshotOn: 'change'` snapshots per accepted change *outside* a gesture and
   still coalesces inside one; `snapshotOn: 'never'` snapshots only on an explicit
   call.
7. A restriction-rejected `updateParam` does not move `prev` (uses a `restrictions`
   entry, `restriction.ts:23-29`).
8. A calc referencing `prev.params.*` resolves to a number at construction (the
   two-pass bootstrap), and one referencing `prev.calcs.*` resolves and warns
   once.
9. A config with **no** `prev` anywhere evaluates its calcs in exactly one pass —
   asserts the static scan really does make the bootstrap free for existing
   configs.
10. A param named `prev` warns once via `captureWarnings` (`helpers.ts:102-110`)
    and the `prev` object wins.
11. `snapshot()` is O(1): asserts `prevCalcValues` is the *same object identity*
    as the pre-snapshot `currentCalcValues` and that a subsequent `evalCalcs()`
    does not mutate it — the aliasing property the whole design rests on.

**Mounted** (`mountObjects` / `mountConfig`, `helpers.ts:51-96`):

12. A `Line` with `yIntercept: 'prev.params.a'` alongside one with
    `yIntercept: 'params.a'` renders coincident before any snapshot, and at two
    distinct intercepts after `snapshot()` + a param change.
13. `show: 'prev.changed'` hides the ghost at `t=0` and shows it after a change.
14. An `Arrow` with `begin: ['prev.calcs.Qe','prev.calcs.Pe']` and
    `end: ['calcs.Qe','calcs.Pe']` renders with distinct endpoints after a
    change — the end-to-end ghost story on the real `apps/web` model.
15. `kg.getSnapshot()` returns `null` before the first snapshot and a **copy**
    afterwards (mutating the returned object does not affect the model).

**Regression:** the existing DOM snapshot in `snapshot.test.ts` and the value
assertions in `econ_values.test.ts` / `econ_equilibrium_values.test.ts` must be
untouched — no config in the suite mentions `prev`, so no rendered output may
change.

**Not covered by vitest:** a real pointer-driven drag. d3's drag behaviour depends
on pointer events jsdom models poorly, so the gesture hook is tested at the
`Model.beginGesture`/`endGesture` seam and the `InteractionHandler` wiring is
verified by one test asserting the handler calls them. The genuine
"drag the curve, see the ghost" test belongs in the Playwright suite
(`apps/web/tests/app.spec.ts`) and needs `apps/web` to have a draggable diagram
first — the current config has no `draggable` on either line
(`apps/web/src/App.tsx:35-58`).

## Risks and unknowns

- **`prev` becomes a reserved name.** The only backwards-incompatible edge.
  Mitigated by a construction-time warning and by the fact that no config in this
  repo uses it. An external config that names a param `prev` changes behaviour
  silently in expressions and loudly in the console.
- **Memory.** One retained generation of the calcs object per model. Cheap for the
  configs here, but note that `evalObject` turns arrays into plain objects
  (`model.ts:123-138` recurses on anything that is not a number or string), so a
  calc holding sampled points is already heavier than it looks; the snapshot
  inherits whatever `evalCalcs` produced rather than making it worse.
- **One extra render per gesture.** `snapshot()` calls `update(false)` so objects
  bound to `prev.*` move when `prev` moves. The alternative — a `render: false`
  fast path on the drag hook, relying on the `updateParam` that immediately
  follows — is a real optimisation but adds a second code path for one frame per
  gesture. Recommend the simple version first and measure. `ViewObject` only
  redraws when `hasChanged` (`viewObject.ts:298`), so the extra `update` is nearly
  free for objects that do not reference `prev`.
- **Multi-touch.** Two concurrent drags share one snapshot (the first gesture
  wins; the second nests). Defensible — "before" should be one moment, not one per
  finger — but it is a choice, and if it turns out wrong the fix is per-gesture
  snapshots keyed by pointer id, which is a much larger change.
- **A gesture rejected on its first tick** commits a snapshot for a change that
  never happened. Harmless (`prev.changed === 0`, nothing draws) but it does
  increment `prev.seq`, so `seq` counts snapshots, not student actions. Document
  that.
- **`useEquilibria` remounts on config identity change**
  (`packages/react/src/useEquilibria.ts:135-153`), destroying the snapshot. `prev`
  is session state and does not survive a remount. The app must memoise its
  config — already documented at `:58-60` — and must not treat `prev` as durable.
- **`prev.calcs` and unresolved calcs.** A calc that fails to evaluate is returned
  as its own string (`model.ts:178-186`); the snapshot stores that string
  faithfully. `prev` neither creates nor hides this pre-existing behaviour, but it
  gives it a second place to surface.
- **Unknown: does the gesture default hold for touch-first use?** On a phone, a
  drag and a tap are harder to distinguish, and `d3.drag`'s `start`-without-`drag`
  case is more common. Committing on the first *movement* rather than on `start`
  is the mitigation, but it wants real-device checking.
- **Unknown: what "before" a lesson step should mean.** The engine deliberately
  does not model steps; `kg.snapshot()` is the hook the host uses to express one.
  Whether that is enough only becomes clear once a multi-move exercise exists.

## Done when

1. `Model` holds `prevParamValues` / `prevCalcValues` / `snapshotSeq`, seeded at
   construction, and `snapshot()` captures by reference in O(1).
2. `prev.params.<n>`, `prev.calcs.<n>`, `prev.<n>`, `prev.seq` and `prev.changed`
   resolve in any evaluated string.
3. A drag gesture takes exactly one snapshot, on first movement, regardless of how
   many update ticks it produces — held by test 4 and test 5.
4. `kg.snapshot()`, `kg.beginGesture()`, `kg.endGesture()`, `kg.getSnapshot()` and
   `snapshotOn` are exported from `kg.ts` and mirrored in `useEquilibria`.
5. A param or calc named `prev` warns once and does not throw.
6. Configs that never mention `prev` produce byte-identical rendered output and
   evaluate their calcs in the same number of passes as before — the existing DOM
   snapshot and econ value tests pass untouched.
7. `apps/web` renders a ghost demand curve and a shift arrow from `prev` alone,
   with no shadow params and no duplicated calcs.
8. `docs/schema/02-parameters-and-interactions.md` documents `snapshotOn`, the
   `prev` scope and the reserved names; `docs/interactivity.md` documents the host
   gesture API and states plainly that mapping a host slider's
   `onChangeStart`/`onChangeEnd` onto `beginGesture`/`endGesture` is required for
   sensible ghosts.

## Out of scope

- **Restriction rollbacks that say why — split out as P12** (outlined below).
- **Ghost authoring shorthand (P13).** This plan supplies the primitive. A
  `ghost: true` flag on `EconLinearDemand` and friends that auto-generates the
  dashed twin, the arrow and the `oldValueLabel`/`newValueLabel` pairing
  (`econSchema.ts:30-31`) is a KGAuthor ergonomics plan and should not be
  entangled with model semantics.
- **History deeper than one step.** `prev` is depth 1 by design. Undo/redo or a
  scrubbable timeline has different memory characteristics and a different API.
- **Persisting snapshots** across mounts, reloads or config changes.
- **Animation** between `prev` and current. The engine has no transition system;
  ghosts are static.
- **Quiz grading, scoring or correctness checking.** P5 makes the reveal drawable;
  what counts as correct is the app's.
- **Removing the `snapshotOn: 'change'` mode** even though it is the trap. It is
  offered, and documented as a trap, because forbidding it invites someone to
  rebuild it badly outside the engine.

---

## Outline: P12 — Refusals that speak

**Lane:** engine · **Depends on:** P5 (shares the `Model.updateParam` edit) ·
**Unblocks:** learner-facing coaching on blocked drags; makes the three documented
`KG_EVENTS` real

**Problem.** A restriction-blocked drag reverts with no trace: `updateParam`
reverts at `model.ts:257-259` and emits nothing, and the schema docs describe this
as intended ("the engine will silently cancel the update and roll back",
`docs/schema/02-parameters-and-interactions.md`). A student pushing a curve into
an invalid region sees it stick, with no reason given. Worse, there is currently
**no channel at all** through which a reason could be delivered: `KG_EVENTS`
declares three events (`constants.ts:1-5`), `docs/interactivity.md:14-18` says they
fire, `useEquilibria.ts:113-123` forwards them, and nothing in
`packages/engine/src/ts` ever calls `emit` except `kg.ts:81` for `'error'`.

**Shape.**

1. **Build the model→host path.** Make `Model` an `EventEmitter` (it is already a
   dependency, `packages/engine/package.json`), have the `View` forward model
   events to its emitter, and pass the emitter into `new View(...)` — today it is
   attached one line *after* construction (`kg.ts:49` then `:54`), so any
   construction-time event would be lost. Testable without a DOM, matching
   `diagnostics.test.ts:16-18`.
2. **Make the documented events real** in the same change: `kg:param_changed` from
   `updateParam`'s success branch, `kg:curve_dragged` from the drag `end` hook
   (`interactionHandler.ts:104-106`, currently empty), `kg:node_hover` from the
   hover path. Not scope creep — the docs already promise them.
3. **Name the restrictions.** `RestrictionDefinition` gains optional `name?: string`
   and `message?: string` (`restriction.ts:5-10`) — additive; existing
   restrictions keep working unnamed. `message` is the author's sentence for the
   learner ("Price can't go below zero"); `name` is the stable id the app keys
   coaching or analytics off. Without at least one of them the app can only say
   "that isn't allowed", which is barely better than silence.
4. **Report the refusal.** `updateParam` already visits every restriction in its
   `forEach` (`model.ts:246-250`) rather than short-circuiting, so collecting the
   failures is free. Emit
   `kg:param_blocked` with
   `{ param, attemptedValue, revertedTo, restrictions: [{ name, message, expression, value, min, max }] }`.
   `attemptedValue` should be the value **after** `Param.update()`'s clamp and
   round (`param.ts:76-88`) — the value actually tried — with the raw request
   alongside it if the two differ, since "your drag was clamped" and "your drag
   was refused" are different things to explain.
5. **`Restriction.valid` currently returns a bare boolean** (`restriction.ts:31-43`)
   and recomputes `model.evaluate(r.min)` / `(r.max)` inline. It needs to return
   the evaluated value and bounds so the payload can say *how far* out of range
   the attempt was — the difference between "not allowed" and "you'd need to stay
   above 0.001".

**Risk.** Emitting per rejected tick during a drag means an event storm at the
boundary — a curve held against a constraint fires on every pointer move. Needs
either coalescing (emit on the transition into blocked, not per tick) or explicit
"this is high-frequency, debounce it" documentation. Coalescing is better and is
the reason this deserves its own plan rather than three lines appended to P5.

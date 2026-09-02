# Plans

Fourteen independent implementation plans, drawn from the layout audit and the study-screen design
discussion. Each is self-contained: goal, reasoning, verified current state with `path:line`
citations, numbered approach, tests, risks, and an explicit out-of-scope section naming which other
plan owns what it excludes.

They began as drafts to argue with, several deliberately conditional on decisions that had not been
made. **All fourteen have since landed** — P0, P1 (code), P2, P3, P4, P5, P6, P7, P8, P9, P10, P11,
P12 and P13 — and each carries a Findings section recording where the plan was wrong.

## Settle these first

Three forks decide which lane several items belong to. Answer them differently and parts of these
plans reshuffle. **Two are now settled** — Fork 1 by decision, Fork 3 by measurement.

| Fork | Question | Current lean |
| --- | --- | --- |
| 1 | One engine per screen, or one per panel? | ✅ **Settled 2026-08-27 — A**, one engine, host-computed geometry (P3). |
| 2 | Does the author declare geometry, or roles? | **Roles**; existing layouts become presets |
| 3 | Who grades a quiz? | ✅ **Settled by P0 — the app grades.** A mistyped predicate reads as *correct*, silently. |

## The plans

| ID | Title | Lane | Depends on |
| --- | --- | --- | --- |
| [P0](P0-authoring-spike.md) | Authoring spike: prove the free pile ✅ **done** — [findings](P0-findings.md) | cross | — |
| [P1](P1-retire-react-component-surface.md) | Retire the React component surface ⚠️ **code complete**, npm unpublish outstanding | bindings | — |
| [P2](P2-layout-defect-sweep.md) | Layout defect sweep ✅ **done** | engine | — |
| [P3](P3-pass-through-layout.md) | Pass-through layout, and geometry that can move ✅ **done** | engine | P2 |
| [P4](P4-density-render-mode.md) | Density render mode ✅ **done** | engine | P3 (if one canvas) |
| [P5](P5-interaction-snapshot-and-prev-scope.md) | Interaction snapshot and the `prev` scope ✅ **done** | engine | — |
| [P6](P6-object-identity-and-steps.md) | Object identity, names and step ordering ✅ **done** | engine | P5 (for derived movement) |
| [P7](P7-stage-composition.md) | Stage composition: focus, rail and promotion ✅ **done** | bindings | P1, P3, P4 |
| [P8](P8-narration-strip.md) | The narration strip ✅ **done** | app | P6, P5, P7 |
| [P9](P9-instrument-dock.md) | The instrument dock ✅ **done** | app | P7, P1, P8 |
| [P10](P10-one-timeline.md) | One timeline: build, reveal, lesson ✅ **done** | app | P6, P7, P9 |
| [P11](P11-quiz-attempt-loop.md) | The quiz attempt loop ✅ **done** | app | P0, P10, P5 |
| [P12](P12-refusals-that-speak.md) | Refusals that speak ✅ **done** | engine | P5, P6 |
| [P13](P13-ghost-authoring-shorthand.md) | `ghost:` authoring shorthand ✅ **done** | bindings | P5, P6 |

Both of the plans that were only outlines inside P5 have now been written out and landed: P12, and
P13, which was the last of them.

## What blocks what

Four chains. Only the first crosses all three lanes.

```
Fork 1  →  P3 pass-through layout  →  P7 stage components ✅ →  focus + rail screen ✅
           P4 density mode ✅      →  P7 panel chrome ✅     →  legible rail ✅
           P5 snapshot + prev      →  ──────────────────────→  remembered ghosts → P11 reveal
           P6 names + direction    →  ──────────────────────→  P8 narration strip
```

The first chain is complete: the focus + rail screen exists in `apps/web`, built on one engine, and
promoting a panel is a param change with no remount. **Every plan in every lane has landed** — the
strip under the stage says what the student just did and what followed, the dock beside it holds the
controls, the scenarios and the maths, the track under both runs an authored lesson that draws the
market up curve by curve and brings its other panels in as events, the lesson ends by asking the
student to move demand themselves and marking where they put it, a curve that will not go where it
is pulled now says why rather than simply stopping, and where a curve *was* is one word on the curve
itself rather than a second copy of it.

## Reading order

- Starting from nothing: ~~**P0**~~ (done — read [P0-findings](P0-findings.md) instead),
  ~~**P2**~~ (done), ~~**P1**~~ (code done; the npm unpublish and repo archive are the user's to
  run), ~~**P5**~~ (done — `prev` ships, documented in
  [02-parameters-and-interactions](../schema/02-parameters-and-interactions.md#remembering-the-previous-state-prev)).
  All four were independent of every fork and none was blocked on a decision.
- Deciding the architecture: **P3** first, since its finding that `Scale`'s `rangeMin`/`rangeMax` are
  constants rather than updatables (`packages/engine/src/ts/view/scale.ts:34-36`) is what makes
  Fork 1 = A cheap.
- Chasing the product: ~~**P8**~~ is done — `affected` and object titles from P6, somewhere to render
  from P7, and a "before" from P5's snapshot. ~~**P9**~~ (done) took the `getParams()` metadata for
  its sliders and gave the "why?" affordance somewhere to go. ~~**P10**~~ (done) turned P6's declared
  steps into a scrubbable track and an authored lesson, and did *not* register as a dock instrument —
  the track is a row of its own under the stage. ~~**P11**~~ (done) filled P10's `ask` slot: the app
  grades, the schema declares only the target, and the verdict lives in a row of its own rather than
  in the strip, because P10's arbitration would wipe a prompt off the screen the moment a student
  moved something to answer it. ~~**P12**~~ (done) went back to the strip for the one thing it could
  not say: why a curve stopped. It entered P10's arbitration at the top without the rule needing a
  clause — a refusal is the student's own action, in which nothing moved. ~~**P13**~~ (done) is the
  last, and the only one that adds no behaviour at all: it collapses the hand-written ghost into a
  flag on the object it is a ghost of.

## Findings that cut across the set

1. **An expression that parses is not an expression that means what it says.** Five costumes so
   far, four of them silent, and the silent ones all found by asking the engine for a *number*
   rather than looking at a picture.

   *It fails to parse and reads as true.* `model.evaluate` returns the expression *as a string* when
   mathjs cannot parse it (`packages/engine/src/ts/model/model.ts`) — deliberately, since colors and
   label text legitimately fail — and a non-empty string is truthy. `model.evaluate` returns the
   expression *as a string* when mathjs cannot parse it
   (`packages/engine/src/ts/model/model.ts:180-188`) — deliberately, since colors and label text
   legitimately fail to parse — and a non-empty string is truthy. P0 ran it: a quiz predicate with a
   typo renders as *always correct*, emits **no warning**, and reaches the screen. This settles
   Fork 3. See [P0-findings](P0-findings.md) §4; pinned in
   `packages/engine/src/__tests__/authoring_contracts.test.ts`.

   P6 met it again with teeth: mathjs has no `&&`, so every `show` written with one is
   *permanently visible*, and two curves in the econ library had shipped that way. `Model.evaluate`
   now warns when an expression it could not parse contains `&&` or `||` — narrow enough to be
   loud, where the general case must stay quiet.

   *It never reached the parser.* P7 found `evaluate`'s fast path — `if (!isNaN(parseFloat(name)))
   return parseFloat(name)` — reading a numeric *prefix*, so `0.5 * calcs.Qe * (...)` evaluated to
   `0.5`. Every expression beginning with a literal, since the fork.

   *It parsed into something nobody wanted.* mathjs knows units and constants, so `label: { text:
   'S' }` resolved to siemens and `'E'` to Euler's number; KaTeX threw on them and the label drew
   nothing at all. Two econ objects shipped with an invisible `E`.

   *It fails to parse and reads as **false**.* P12 found the first costume's mirror image. The same
   returned string, put in a comparison instead of a predicate, is falsy — so a restriction naming
   something that is not there refuses **every** change to **every** param, permanently, and says
   nothing. Truthy in a `show`, falsy in a restriction, from one fallback. **The meaning of a failed
   parse depends on where the value lands, and the author cannot see where it lands.**

   *It fails to parse and is **drawn**.* P13 found the third position. mathjs has no string `+`, so
   `"D" + idioms.newValueLabel` throws, and the returned source text lands in a `label` — where it
   is rendered, as LaTeX, on the diagram. Truthy in a `show`, falsy in a restriction, legible in a
   label: one fallback, three meanings, and the only one that announces itself does so purely
   because something happened to draw it.

   The habit that catches all five: **assert the value, not the shape.**

2. **Author-supplied names already survive** — and were also being *copied*. `GraphObject` fills a
   random name only as a *default* via `setDefaults`, so an author's name reaches the parsed data.
   What P6 found on top: a point's droplines and labels are built by copying its def after the name
   is stamped, so three objects answered to one name. Invisible while a name was only a calc key,
   wrong the moment it became an address. Both halves are now pinned in `object_identity.test.ts`.

3. **What the engine will not tell you, a host will duplicate — and then disagree with.**
   `kg:param_changed` said what *changed* and what *moved*, and never what anything *is*, so P7's
   study screen had two ways to put a number beside a panel: reach into the model, or write the
   calc out a second time in its own code. The second is how a readout ends up disagreeing with the
   diagram beside it. The event now carries `calcs`, `getCalcs()` gives them at rest, and a delta is
   an ordinary calc over `prev`. General form: **a value the engine computes and does not publish
   will be recomputed, worse, somewhere else.**

4. **Multi-param updates are not atomic, and fail silently.** Found by P0 (§7), owned by no plan,
   and now shipped around twice — Scenarios (P9) and lesson steps (P10) both send one `update` call
   and state the exposure rather than resolving it.
   `kg.update({ params: [...] })` applies params one at a time and validates each alone, so a legal
   destination reached through an illegal interim is rejected halfway and rolled back with no
   diagnostic — leaving a state that is neither the start nor the target. Every scenario, lesson step
   and question setup that moves more than one param is order-dependent today. A batched update that
   validates once at the end is a precondition for P10 and P11. It is why P6's `steps` hands a
   step's `set` params back to the host rather than applying them: choosing the order is a decision
   that has to be made with the diagram in view, and the engine should not make it quietly.

5. **Panel geometry is one classification away from being animatable.** Confirmed and done by P3:
   positions already composed as expressions through `addDefs` and were frozen only because `Scale`
   listed `rangeMin`/`rangeMax` as constants. Promotion is now a param change with no remount.

6. **A property being listed as updatable does not mean anything draws it.** P4's "Current state"
   read `Axis`'s updatables list and concluded that the axis title could already be changed at
   runtime. `Axis.redraw()` had never drawn `label` — the title is a separate `Label` object built
   at construction — so the list was describing a property that was evaluated on every tick and read
   by nobody. The same section read `setProperties(def, 'updatables', [])` in `Curve` as *emptying*
   the list when the function appends, and concluded stroke width was frozen when it had always
   moved. Three of that section's claims were wrong in both directions, and every one of them was
   settled in minutes by mounting a diagram and changing a param. **The declaration is not the
   behaviour; run it.** `updatables_contract.test.ts` now pins what actually responds.

7. **A documented event is not an emitted one.** `kg:param_changed`, `kg:curve_dragged` and
   `kg:node_hover` were declared, documented as firing, and wired to React callback props — and
   nothing in the engine emitted any of them, because the React tests emit them by hand against a
   mock. P6 emits all three. Worth carrying forward as a habit: an integration point that is only
   exercised through a mock is not exercised.

8. **A stage draws one thing several times, and the difference between a name and a title is the
   whole of it.** A name is an *address* — a calc key, a lesson step's target, a thing an expression
   refers to — and two objects answering to one is a fault (P6 made the engine warn about it). A
   *title* is what the thing is called in prose, and three drawings of one market genuinely share
   one. The study screen had conflated them since P7 and warned six times on every load. Narration
   is what made the distinction pay: it groups by title, so one demand curve in three panels is
   said once, while the addresses stay distinct. **Ask which of the two a field is before reusing
   it for the other.**

9. **What the engine does not publish, it also forbids.** Finding 3 said a value the engine computes
   and withholds gets recomputed, worse, elsewhere. P8 met the other half: `Param.precision` was
   withheld, and a host's only alternatives were to hardcode a decimal count or clone the engine's
   `decimalPlaces`. Neither is "worse somewhere else" — both are a second definition of the same
   fact. `getParams()` publishes it, and the same call carries `presentation`, without which a host
   cannot tell a param the student moved from one describing how the diagram is shown.


10. **An engine with two memories has two clocks, and a host reads whichever it asks for.** `prev` is
    seeded at construction, so a diagram's ghosts always have a "before". `getSnapshot()` returns
    `null` until a gesture has incremented `snapshotSeq`. Between page load and the student's first
    drag those disagree — and P9 found it in the plainest possible form: applying a scenario moved
    all three panels, drew every ghost, lit every delta chip, and the narration strip underneath read
    *"Drag a curve to see what it changes."* 516 unit tests passed through it; a screenshot did not.

    The remedy was already written down — `kg.snapshot()`'s own comment names "applying a scenario"
    as the first boundary the engine cannot see — which makes this less a defect than an
    under-advertised obligation. It is now part of the instrument contract, and the test asserts the
    *order*, since snapshotting after the change marks the wrong state. **P10 and P11 inherit this
    directly:** a lesson step and a quiz reveal are the other two examples in that same comment.

11. **Reading the plan against the code before building it paid every time, and is now the habit.**
    P9's read caught six things and predicted an integration defect — a dock slider that would have
    strobed the narration strip, found in advance rather than afterwards. P10's caught ten, two of
    which needed *running* rather than reading and were both engine defects: the step param was not
    marked presentation, so advancing a build-up drew ghosts over an untouched diagram, and a step
    could not reveal a panel at all — a graph's axes and axis titles are never named, so the plan's
    own `reveal: [firmPanel]`, and the same example in the schema doc, were both fiction. Neither
    would have survived a minute of the running app, and neither was visible in the source. P12's
    caught eight and moved the payload; P13's caught eight and moved the feature onto a different
    set of objects entirely.

    The habit generalises: **a plan written before its dependencies landed is a description of a
    tree that no longer exists**, and P10 and P11 were both written before P7, P8 and P9.

12. **A layout in fractions and furniture in pixels have to meet somewhere.** `arrange` reports
    fractions so it can be scale-free; the engine places an axis title 40px past the axis. Every
    arrangement so far kept a rail between the focal panel and the bottom edge, which hid the
    mismatch. Give one panel the whole stage — which is what a lesson's first step does — and the
    axis title lands on whatever is underneath. The reserve belongs in neither: it is fixed pixels
    in the host's CSS, because a fraction that reserves 44px on one screen reserves 90 on another
    and the label does not grow.

13. **A test can pin a coincidence.** "The focal panel is drawn in full" had been passing since P7
    by four pixels — 424px against P4's 420px `compact` threshold at the suite's viewport — and a
    single new row under the stage ended it. The behaviour was not wrong; the margin was. Where a
    test asserts a *level* that the engine picks from a measured size, it is asserting something
    about the viewport, and the viewport should be chosen deliberately rather than inherited from a
    device preset.

14. **A property that reports the right value and is read by nobody passes every test that asks it
    what it says.** This is finding 6 with the sharpest possible edge. P0 measured `draggable` going
    true → false → true across updates, called it "the claim most likely to be wrong in practice",
    and concluded freeze-on-commit was authorable. The field was right and nothing consulted it:
    `Listener.onChange` moved the param regardless. P11 measured the *param* instead and found the
    curve still dragging after a commit. **Assert the effect. A field is not a behaviour, and a
    field that has been carefully verified is still not a behaviour.**

15. **Half the state in the engine and half in React survives only until the engine is rebuilt.**
    `Stage` rebuilds its config — remounting the engine — when the box's quantised aspect ratio
    changes. Correct, and cheap, until a lesson existed: a rebuilt engine starts from the config, so
    `params.step` goes back to 0, every reveal is undone and the student's drag is discarded, while
    the track underneath still reads "8 / 9". Nothing announced it. Whatever the host keeps outside
    the engine, it owes the engine back after a remount — and `onReady` firing again is the only
    notice it gets. Found by screenshotting the finished feature; the capture resized the viewport
    and the diagram in the picture was empty.

16. **An ordering contract with a library is decided by where the handlers are attached, and the
    docs do not say where the library attached its own.** The engine's gesture contract is
    `beginGesture` *before* the value moves. Mantine's `Slider` handles keys in `onKeyDownCapture`
    on its own root, set after `...others`, and calls `onChange` and `onChangeEnd` inside that one
    handler — so the obvious wiring, a bubble-phase `onKeyDown` prop, runs after the change. The
    dock had shipped that way since P9: arrow keys drew no ghost, narrated nothing, and left a
    gesture open. The mouse path was fine, which is why nothing caught it until a plan needed the
    keyboard to be a first-class input.

17. **Before adding a channel, find the message that will go down it in the app you actually have.**
    P12's outline was a restriction-rollback event, and this repo's app declares no restrictions and
    cannot honestly declare one — its params' own bounds are its real constraint. The event would
    have shipped with a payload nobody had ever looked at, which is finding 7 arriving one step
    earlier: not "an integration point exercised only through a mock", but an integration point with
    no counterpart at all. What saved it was a comment the app had already written about a different
    risk — "the study diagram declares no restrictions, so nothing here can trip today; that is luck,
    not design."

18. **A behaviour reachable only by dragging has no jsdom test, and the substitute is a mock.** The
    dock's sliders take their ends from the param, so no control in the app can *ask* for a value
    out of range; only a drag can. And a drag cannot be synthesised in jsdom — `d3.pointer` falls
    back to `getBoundingClientRect`, jsdom returns zeros, so the pointer never moves and the param
    is asked for the value it already holds. The proof has to be a browser test, and reaching for a
    unit test there means asserting the wiring rather than the behaviour. Worth knowing *before*
    writing the feature, because it decides where the evidence will come from.

19. **Reuse buys you the features you did not know were attached.** P13's ghosts are revealed by
    whatever lesson step reveals the object they shadow, and nothing in P13 makes that happen: the
    ghost is built with P6's `anonymizeCopy`, which records `partOf`, and P6's `compileSteps`
    matches on `partOf`. Two plans that never referred to each other composed correctly because the
    second used the first's mechanism rather than a parallel one.

    Every other finding here is a warning; this is the constructive form of the same observation.
    The warning it implies is real too — a parallel mechanism has to *re-earn* every feature built
    on the original, and will be found not to have, one at a time, on screen.

20. **Before a diagnostic fires, ask who wrote the thing it is complaining about.** The engine warns
    an author whose calc reads `prev.calcs`, because that is a stored value rather than a fixpoint.
    It walked every calc in the map — and objects publish their own defs into that same map as they
    parse, so any object bound to the previous state put the spelling there itself. The advice was
    being given to authors who had written the exact thing the documentation demonstrates, and
    P13 would have made the *engine* the author of it on every ghosted point.

    One scan was answering two questions over two different sets: whether anything mentions `prev`
    (which decides whether a second evaluation pass is paid for, and must see everything) and
    whether a person wrote `prev.calcs` (which is advice, and must see only what a person wrote).
    Recorded as [NOTES.md](../../NOTES.md) issue 17.

## Conventions

Every plan follows the same headings: Goal, Why this shape, Current state, Approach,
API / schema surface, Tests, Risks and unknowns, Done when, Out of scope. Claims about current
behaviour cite `path:line`. Where a plan could not verify something, it says so rather than
assuming.

# P9 — The instrument dock

**Lane:** app
**Depends on:** P7 (the region it occupies); P1 (Mantine as the only theming system); P8 for the
"why?" that opens the Maths instrument, and for the commit boundary a slider has to respect
**Unblocks:** P10 and P11, which plug in as further instruments
**Status:** Draft, read against the code 2026-09-02 before building — see
[Read against the code](#read-against-the-code-2026-09-02) for what the draft had wrong. Current
state below is corrected; the record of what changed is at the bottom.

## Goal

One docked region beside the stage holding several instruments, exactly one open at a time, with
the stage never moving when the instrument changes. This plan builds the shell and its first three
instruments — **Explore** (sliders), **Scenarios** (named param sets), **Maths** (the calc typeset
with today's values) — and defines the slot that Build and Lesson later plug into.

## Why this shape

Five learning modes looked like five features competing for one screen. They are five projections of
the config the engine already takes, so they do not need five places — they need one region that
changes what it points at. The stage stays nailed down and only the instrument beside it changes,
which is what lets a student's spatial memory hold across modes.

The Maths instrument is the clearest example of the reframe paying off: `calcs` hold their own
formulas as strings — `Qe: '(params.a - params.c)/2'` — so a maths explainer is that string typeset
with today's numbers substituted. Not a second body of content someone writes and keeps in sync with
the diagram. That is the difference between a feature that scales across a curriculum and one that
is written by hand per diagram and rots.

## Current state

Verified 2026-09-02, after P7 and P8 landed. Every citation below was re-read; the draft's were all
stale by 40–270 lines, which is what happens to `path:line` in a plan written three plans ago.

- `apps/web/src/StudyScreen.tsx` is the screen — a `Stage` with panel chrome, a mode control and the
  narration strip under it. The draft's "App.tsx renders one diagram with no controls at all" was
  true of P7's predecessor and is not true now. `App.tsx` is the `AppShell` around it.
- `Param` carries what a slider needs — `name`, `label`, `value`, `min`, `max`, `round`,
  `precision` — and P8 published all of it plus `presentation` through `KineticGraph.getParams()`
  (`packages/engine/src/ts/model/param.ts:133-149`, `packages/engine/src/ts/kg.ts:246`). The app
  already calls it: `StudyScreen` filters out presentation params to decide what narration may
  mention.
- **A boolean param is coerced to a number before anything can see it was one.** `View.parse` maps
  every param through `+value` (`packages/engine/src/ts/view/view.ts:220`), and `+true` is `1`, so
  `Param` is constructed from `value: 1` with the ordinary numeric defaults. Two consequences, and
  the second is the one that matters:
  - `Param`'s boolean branch (`packages/engine/src/ts/model/param.ts:98-113`) never runs on the
    mount path. It assigns no `precision`, which `ParamInfo` declares required — `info()` copies a
    field never set, and `formatted()` throws `invalid format: .undefinedf` out of d3 — but only a
    directly-constructed `Param` can reach it. A latent trap rather than a live defect, and cheap
    to close.
  - **Nothing downstream can tell a toggle from a small integer**, which is the real problem and is
    not fixable in the app: by `getParams()` the param is a number with numeric bounds. The
    information exists only at the moment it is destroyed, so the engine records `isBoolean` there
    and reports it.
- `updateParams([{name, value}])` reaches the engine through the hook
  (`packages/react/src/useEquilibria.ts:182-186`), which calls `instance.update({ params })`; the
  engine walks the array and calls `model.updateParam` per entry
  (`packages/engine/src/ts/kg.ts:135-149`). `Stage` does not forward it — a host reaches the engine
  through `onReady`, which is how `StudyScreen` already holds it.
- **Restrictions are validated per param, not per batch, and a rejection rolls back silently**
  (`packages/engine/src/ts/model/model.ts:497-548`), so a two-param scenario can be refused halfway
  even though its destination is legal. This is the plans README's finding 4. The study diagram
  declares **no restrictions at all**, so Scenarios can ship without resolving it — but it must not
  be *assumed* resolved.
- `beginGesture()` / `endGesture()` exist on the engine and on the hook
  (`packages/engine/src/ts/kg.ts:171-177`, `packages/react/src/useEquilibria.ts:192-199`) and
  coalesce a host-driven scrub into one snapshot. **They emit no event.** `kg:curve_dragged` is
  raised only by in-diagram dragging (`packages/engine/src/ts/controller/interactionHandler.ts:135`),
  which is the only thing feeding the narration strip's commit boundary today.
- Calcs are plain strings evaluated by mathjs against a flat scope
  (`packages/engine/src/ts/model/model.ts:364-410`); an expression that cannot be parsed is returned
  **as the string**, which the Maths instrument will meet and must not render as a value.
- mathjs 11.12 is present and `parse(...).toTex()` works on every calc in the study diagram — but
  emits the scope prefix literally: `(params.a - params.c)/2` becomes
  `\frac{\left( params.a- params.c\right)}{2}`. Readable LaTeX needs a stripping pass first.
- KaTeX CSS is imported by the **engine** (`packages/engine/src/ts/kg.ts:13`), so anything that
  mounts a diagram has it. The draft's worry that P1 moved this burden to the app is unfounded.
- `Stage` measures its own container with a `ResizeObserver` (`packages/react/src/Stage.tsx:153`)
  and `arrange()` takes that measured box, not the viewport
  (`packages/react/src/arrangement.ts:44-53`). A dock that occupies space shrinks the stage and the
  stage re-arranges itself; nothing has to tell it.
- `AppShell.Aside` is a native fixed right-hand region with its own responsive collapse
  (`docs/reference/mantine-llms-full.txt:1934`). It collapses; it does not become a bottom sheet.
- `NarrationStrip` already accepts `onWhy(calc)` and computes `line.whyTarget`, but `StudyScreen`
  deliberately does not pass it — "a 'why?' that opens nothing is worse than none"
  (`apps/web/src/NarrationStrip.tsx:38-45`, `apps/web/src/StudyScreen.tsx:212`). This plan supplies
  the destination.

## Approach

1. **Build the shell first, with two throwaway instruments.** A dock that switches content without
   moving the stage is the whole architectural claim; prove it before investing in any instrument's
   internals. Right column on desktop, bottom sheet below ~900px, driven from the same arrangement
   data as P7 so the breakpoint exists once.

2. **Define the instrument contract.** Each instrument is `{ id, label, icon, Component }` and
   receives the diagram config, current param/calc values, and `updateParams`. Nothing else — an
   instrument that needs more is a sign the contract is wrong. Build (P10) and Lesson (P11) register
   through this same shape.

3. **Explore.** One Mantine `Slider` per param, from `label`, `min`, `max`, `round` as the step,
   and `precision` for the readout — all of it from `getParams()`, none of it re-derived. Fix the
   boolean `precision` gap in the engine first (see current state); it is three lines and a test,
   and every other option is the app inventing a number the engine already owes it. Boolean-shaped
   params get a `Switch` or nothing, never a 0–100 slider.

   **A slider drag must be bracketed, and the strip must be told.** Two separate obligations that
   the draft collapsed into one. `beginGesture()`/`endGesture()` make the engine take one snapshot
   for the whole scrub, so the ghosts are drawn against where the drag started. But they emit no
   event, and the strip's notion of "still dragging" is fed only by `kg:curve_dragged`, which a
   slider does not raise — so without a second wire the strip narrates *every tick* as settled and
   the `aria-live` region announces each frame. That is precisely the strobe P8 exists to prevent,
   arriving through the door P8 was not watching. The dock and the strip are both app code, so the
   wire is a callback, not an engine change.

4. **Scenarios.** Named param sets — `{ id, label, description?, params: {a: 26, c: 1} }` — applied
   through a single `updateParams` call. Two open questions to settle with a spike rather than an
   argument: whether the per-param restriction validation rejects legitimate multi-param scenarios
   (P0 step 7), and whether applying one should be instant or animated. **Recommend instant with the
   narration strip explaining what changed** — an animation of two curves moving simultaneously is
   pretty and teaches less than a sentence naming the shift. Where scenarios are declared is a
   content-model decision shared with P10; keep them beside the diagram config for now and expect to
   move them.

5. **Maths.** Show the calc's expression, then the same expression with param values substituted,
   then the result — three lines, the middle one doing the teaching. `toTex` is confirmed as the
   route and confirmed as insufficient on its own: it renders `params.a` literally, so a student
   reads `params.a` where `a` belongs. Strip the `params.` / `calcs.` / `prev.calcs.` prefixes
   before typesetting, and treat the prefix map as the place that decides how `prev` is *spoken* —
   "before" rather than a dotted path. Calcs that do not parse at all (colors, label text, forward
   references) must be detected and shown as plain monospace, which is honest and still useful;
   rendering them as broken maths is not. Entry point is P8's "why?", which arrives with a calc
   name, so the instrument must open *focused on one calc* — and wiring `onWhy` in `StudyScreen` is
   part of this step, not a separate one.

6. **One at a time, and keyboard reachable.** Tabs or a segmented control; arrow-key navigation
   between instruments; the open instrument's content is a labelled region. Opening an instrument
   must not steal focus from the diagram mid-interaction.

7. **The dock's width must not depend on its contents.** The draft said "do not let the dock
   resize the stage", which is both unachievable and unnecessary: `Stage` measures its own box with
   a `ResizeObserver`, so a dock that takes space shrinks the stage and the stage re-arranges by
   itself, correctly and without being told. What must never happen is the stage moving *because
   the open instrument changed* — so the dock is a fixed width and an instrument with a long
   scenario list scrolls internally.

   Watch the second-order effect instead: `FILMSTRIP_BELOW_PX` is 900 and is measured on the
   **stage**, so at 1280px with the navbar expanded (300) and a 360px dock the stage lands near
   620px and the rail silently becomes a horizontal filmstrip. That may be the right answer, but it
   should be a decision rather than a surprise.

## API / schema surface

App-internal:

```ts
interface Instrument {
  id: 'explore' | 'scenarios' | 'maths' | 'build' | 'lesson';
  label: string;
  Component: React.FC<InstrumentProps>;
}

interface InstrumentProps {
  params: ParamInfo[];                 // the engine's own, via getParams()
  calcs: Record<string, number | string>;
  updateParams(next: { name: string; value: number }[]): void;

  /**
   * Bracket a continuous control. `begin` takes one snapshot for the whole
   * scrub and tells the narration strip an interaction is in flight; `end`
   * closes both. Any instrument with a drag owes this pair — see Approach 3.
   */
  beginGesture(): void;
  endGesture(): void;

  focus?: { calc?: string };   // set by P8's "why?"
}
```

`ParamInfo` is the engine's exported type, not an app-side restatement of it. An instrument that
needs a param's `precision` is asking the engine the same question the diagram asked, and there
should be one answer.

Scenarios, provisionally, alongside the diagram config:

```yaml
scenarios:
  - id: demand-shock
    label: Demand shock
    params: { a: 26 }
```

## Tests

- `apps/web/src/__tests__/dock.test.tsx` — switching instruments does not change the stage's
  computed size; only one instrument is rendered at a time; keyboard navigation moves between them;
  the open instrument is a labelled region.
- `apps/web/src/__tests__/explore.test.tsx` — a slider renders from param metadata with the right
  step and readout precision; moving it calls `updateParams`; a boolean-shaped param does not get a
  continuous slider; a scrub calls `beginGesture` once at the start and `endGesture` once at the
  end, not per tick.
- `packages/engine/src/__tests__/…` — `getParams()` reports a `number` precision for a boolean
  param, and `formatted()` on one does not throw. The engine defect Explore is blocked on, pinned
  where the engine's other host-surface contracts are.
- The strobe, asserted where it can actually fail: driving a slider through a scrub leaves the
  strip's live region written **once**, with the arrow form absent mid-drag. A unit test of the
  dock cannot catch this — the wire runs through `StudyScreen` — so it belongs with the browser
  tests in `apps/web/tests/app.spec.ts` beside P8's own.
- `apps/web/src/__tests__/scenarios.test.tsx` — applying a scenario issues one `updateParams` call
  with every param in the set; a scenario naming an unknown param fails loudly in dev.
- `apps/web/src/__tests__/maths.test.tsx` — a simple calc renders as expression, substitution and
  result; a calc that cannot be parsed falls back to monospace instead of broken KaTeX; opening with
  `focus.calc` shows that calc first.

## Risks and unknowns

Four of the draft's six were settled by reading the code; what is left is genuinely open.

- **`toTex` output quality**, still the largest unknown and now partly measured. It parses every
  calc in the study diagram, so the risk is not failure but *ugliness* — and bad typesetting is
  worse than none because it looks authoritative. Look at a dozen real calcs after the prefix
  stripping before committing to it.
- **Per-param restriction validation may still break multi-param scenarios** on a diagram that
  declares restrictions. The study diagram declares none, so this plan can ship without an answer —
  which is a reprieve, not a resolution, and the batched-update work stays owed to P10/P11.
- **Boolean params remain indistinguishable from numeric ones** by the time the app sees them.
  Their missing `precision` is currently the only tell, and that is a bug rather than a signal; once
  it is fixed the tell disappears with it. Detecting them properly needs a convention the engine
  declares — flag it rather than sniffing `min === 0 && max === 100`.
- **A fixed dock width interacts with the rail's filmstrip breakpoint** (step 7). The arrangement
  decides, but the dock must accept being told to be 300px.

Settled by reading the code, and recorded here so they are not re-litigated: KaTeX CSS ownership
(the engine imports it), whether `AppShell` suits a five-region screen (`AppShell.Aside` is exactly
this), whether the dock must feed the arrangement (it must not), and the narrow-laptop arithmetic
(the draft's stage-plus-rail configuration cannot occur — below 900px the rail is already a
filmstrip).

## Done when

- [ ] The dock switches instruments with no change to the stage's geometry.
- [ ] Explore drives every numeric param with correct step and precision, and `precision` is a
      number for every param the engine reports — booleans included.
- [ ] A slider scrub is one interaction to the strip and one snapshot to the engine: no arrow form
      mid-drag, one announcement at the end.
- [ ] Scenarios apply as one update, with the restriction question answered rather than assumed.
- [ ] Maths shows expression → substitution → result, degrades honestly, and opens focused from
      P8's "why?".
- [ ] The whole dock is keyboard operable and correctly labelled.
- [ ] Build and Lesson can register through the instrument contract without changing the shell.

## Read against the code (2026-09-02)

The plan was read line by line against the tree before any of it was built, because it was written
before P7 and P8 landed and both changed its premises. Six corrections, and the pattern in them is
worth more than any one: **five of the six were the plan describing a world that a later plan had
already changed**, and the sixth was a defect that only appears if you run the thing.

1. **A boolean param has no `precision`, and `ParamInfo` says it must.** The constructor assigns it
   in the numeric branch only (`packages/engine/src/ts/model/param.ts:98-113`), so `info()` copies
   an unassigned field and the key is absent from the object — while the exported type declares
   `precision: number`, required. `formatted()` on the same param throws `invalid format:
   .undefinedf` out of d3. Found by constructing a `Param` and printing `info()` rather than by
   reading the constructor, which is the README's finding 6 in miniature: *the declaration is not
   the behaviour; run it.* It is also finding 3 wearing a new hat — the value the engine owes a host
   is missing rather than wrong, and the host's only alternatives are to invent a number or crash.

   The uncomfortable corollary: the missing key is currently the *only* way an app can tell a
   boolean param from a numeric one, which is the draft's "indistinguishable" risk being solved by
   accident. Fixing the bug removes the tell. Both halves need an answer, and the answer to the
   second is a convention the engine declares, not a sniff test on `min === 0 && max === 100`.

2. **KaTeX CSS was never the app's problem.** The draft carried a risk that P1 moved the stylesheet
   import out of the React package, leaving the app to load it or render the Maths instrument
   unstyled. The **engine** imports it (`packages/engine/src/ts/kg.ts:13`), so anything mounting a
   diagram already has it. A risk that survives into a plan unchecked costs the same attention as a
   real one.

3. **The dock cannot resize the stage wrongly, because nothing tells the stage its size.** Step 7
   was built on the stage being arranged from the viewport minus the dock's fixed width. `Stage`
   measures its own box with a `ResizeObserver` and `arrange()` consumes that measurement, so a dock
   that takes space shrinks the stage and the stage re-arranges itself. The obligation the step was
   reaching for is real but narrower: the dock's width must not depend on which instrument is open.

4. **The narrow-laptop arithmetic described an impossible screen.** The risk imagined a 620px stage
   beside a 190px rail. `FILMSTRIP_BELOW_PX` is 900 and is measured on the stage, so a 620px stage
   has already dropped the rail for a filmstrip. The real effect is worth watching and is the
   opposite of the one written down: opening a 360px dock on a 1280px viewport is what *causes* that
   transition.

5. **`AppShell` was already the right shell.** `AppShell.Aside` is a native fixed right-hand region
   with responsive collapse. The one thing it does not do is become a bottom sheet, so step 1's
   sub-900px behaviour needs a `Drawer` rather than a prop.

6. **A slider will strobe the narration strip, and P8 cannot stop it.** `kg:curve_dragged` is
   emitted only by in-diagram dragging
   (`packages/engine/src/ts/controller/interactionHandler.ts:135`), and it is the only thing feeding
   the strip's "still dragging" state. A dock slider fires `kg:param_changed` per tick with that
   state false, so every tick narrates as **settled** and the `aria-live` region announces every
   frame — the exact failure P8's commit-boundary design exists to prevent, reached through a door
   P8 had no reason to watch. `beginGesture()`/`endGesture()` solve the *snapshot* half and emit
   nothing, so they cannot solve this half.

   General form, and the reason this one is worth carrying forward: **a guarantee that holds for the
   engine's own interactions is not a guarantee about interactions, and the second host control is
   where you find out.** The fix is small because both parties are app code; the lesson is that P10
   and P11 will each add controls with the same obligation.

Every `path:line` in the original draft had drifted — by 40 to 270 lines — and each was re-anchored
rather than deleted. Two claims were left exactly as written because they are still true and still
load-bearing: restrictions validate per param and roll back silently, and an unparseable calc comes
back as its own string.

## Out of scope

- The Build instrument (P10) and Lesson (P11) — this plan defines their slot only.
- Where scenarios and lessons ultimately live as content. A real content model is its own piece of
  work and is called out in the breakdown as such.
- Authoring UI for any of it. This plan renders what an author wrote; it does not help them write it.

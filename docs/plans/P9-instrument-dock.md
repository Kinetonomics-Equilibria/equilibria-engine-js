# P9 — The instrument dock

**Lane:** app
**Depends on:** P7 (the region it occupies); P1 (Mantine as the only theming system)
**Unblocks:** P10 and P11, which plug in as further instruments
**Status:** Draft plan — not implemented

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

- `apps/web/src/App.tsx` renders one diagram with no controls at all — the comment in it notes the
  engine is headless and that slider UI for params "is the app's job", with `updateParams` exposed
  for exactly that.
- `Param` carries everything a slider needs: `name`, `label`, `value`, `min`, `max`, `round`, and
  `precision` derived from `round` (`packages/engine/src/ts/model/param.ts:36-70`). Booleans are
  coerced to 0/1 with min 0, max 100, round 1 (`:54-58`) — a slider must not be offered for those.
- `updateParams([{name, value}])` reaches the engine through the hook
  (`packages/react/src/useEquilibria.ts:160-164`), which calls `instance.update({ params })`;
  the engine walks the array and calls `model.updateParam` per entry
  (`packages/engine/src/ts/kg.ts:86-99`).
- **Restrictions are validated per param, not per batch** (`packages/engine/src/ts/model/model.ts:231-262`),
  so a two-param scenario can be rejected halfway if the intermediate state is illegal even though
  the destination is fine. P0 step 7 tests this; it is the main unknown for Scenarios.
- Calcs are plain strings evaluated by mathjs against a flat scope
  (`packages/engine/src/ts/model/model.ts:143-190`); unparseable expressions are returned **as the
  string**, which the Maths instrument will encounter and must not render as if it were a value.
- KaTeX is already a dependency and the engine renders labels with it
  (`packages/engine/src/ts/view/viewObjects/label.ts:130-138`), so typesetting in the dock adds no
  new dependency — though P1 removes the React package's stylesheet import, so the app must ensure
  KaTeX CSS is loaded for its own use.
- Mantine 9 is the app's UI library; the vendored docs are at `docs/reference/mantine-llms-full.txt`
  (grep `^### <Component>`), and should be consulted rather than guessed at.

## Approach

1. **Build the shell first, with two throwaway instruments.** A dock that switches content without
   moving the stage is the whole architectural claim; prove it before investing in any instrument's
   internals. Right column on desktop, bottom sheet below ~900px, driven from the same arrangement
   data as P7 so the breakpoint exists once.

2. **Define the instrument contract.** Each instrument is `{ id, label, icon, Component }` and
   receives the diagram config, current param/calc values, and `updateParams`. Nothing else — an
   instrument that needs more is a sign the contract is wrong. Build (P10) and Lesson (P11) register
   through this same shape.

3. **Explore.** One Mantine `Slider` per param, from `label`, `min`, `max`, `round` as the step, and
   `precision` for the readout. Skip params that are boolean-shaped (see current state) or offer a
   `Switch` instead — detecting them may require a convention, since the engine has already coerced
   them to numbers by the time the app sees them; flag this rather than guessing. Dragging a slider
   calls `updateParams` continuously, which the narration strip (P8) must treat as one interaction.

4. **Scenarios.** Named param sets — `{ id, label, description?, params: {a: 26, c: 1} }` — applied
   through a single `updateParams` call. Two open questions to settle with a spike rather than an
   argument: whether the per-param restriction validation rejects legitimate multi-param scenarios
   (P0 step 7), and whether applying one should be instant or animated. **Recommend instant with the
   narration strip explaining what changed** — an animation of two curves moving simultaneously is
   pretty and teaches less than a sentence naming the shift. Where scenarios are declared is a
   content-model decision shared with P10; keep them beside the diagram config for now and expect to
   move them.

5. **Maths.** Show the calc's expression, then the same expression with param values substituted,
   then the result — three lines, the middle one doing the teaching. Work out how far a raw mathjs
   string can be turned into readable KaTeX: mathjs can parse to a node tree and emit LaTeX
   (`toTex`), which is likely the right route, but the engine's calcs include forms that do not
   parse at all (colors, label text, forward references) and those must be detected and skipped
   rather than rendered as broken maths. When a calc cannot be typeset, show the plain expression in
   monospace — honest and still useful. Entry point is P8's "why?", which arrives with a calc name,
   so the instrument must support being opened *focused on one calc*.

6. **One at a time, and keyboard reachable.** Tabs or a segmented control; arrow-key navigation
   between instruments; the open instrument's content is a labelled region. Opening an instrument
   must not steal focus from the diagram mid-interaction.

7. **Do not let the dock resize the stage.** The stage's size comes from P7's arrangement, which is
   computed from the viewport and the dock's *fixed* width — not from the dock's content. An
   instrument with a long scenario list scrolls internally.

## API / schema surface

App-internal:

```ts
interface Instrument {
  id: 'explore' | 'scenarios' | 'maths' | 'build' | 'lesson';
  label: string;
  Component: React.FC<InstrumentProps>;
}

interface InstrumentProps {
  params: ParamState[];
  calcs: Record<string, number | string>;
  updateParams(next: { name: string; value: number }[]): void;
  focus?: { calc?: string };   // set by P8's "why?"
}
```

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
  continuous slider.
- `apps/web/src/__tests__/scenarios.test.tsx` — applying a scenario issues one `updateParams` call
  with every param in the set; a scenario naming an unknown param fails loudly in dev.
- `apps/web/src/__tests__/maths.test.tsx` — a simple calc renders as expression, substitution and
  result; a calc that cannot be parsed falls back to monospace instead of broken KaTeX; opening with
  `focus.calc` shows that calc first.

## Risks and unknowns

- **Per-param restriction validation may break multi-param scenarios.** This is the single unknown
  that could reshape step 4 into engine work (a batched update path). P0 answers it.
- `toTex` output quality on real calcs is unproven, and bad typesetting is worse than none because it
  looks authoritative. Budget time to look at the output for a dozen real calcs before committing.
- Boolean params are indistinguishable from numeric ones by the time the app sees them; without a
  convention the Explore instrument will offer nonsense sliders for toggles.
- KaTeX CSS ownership moves in P1. If the app forgets to load it, the maths instrument renders
  unstyled and it will look like a P9 bug.
- The dock's fixed width versus a narrow laptop: at 1280px, a 360px dock plus a 620px stage plus a
  190px rail plus gutters is tight. The arrangement function decides, but the dock must accept being
  told to be 300px.
- Mantine's `AppShell` may not be the right shell for a five-region screen; check before building
  the dock inside it.

## Done when

- [ ] The dock switches instruments with no change to the stage's geometry.
- [ ] Explore drives every numeric param with correct step and precision.
- [ ] Scenarios apply as one update, with the restriction question answered rather than assumed.
- [ ] Maths shows expression → substitution → result, degrades honestly, and opens focused from
      P8's "why?".
- [ ] The whole dock is keyboard operable and correctly labelled.
- [ ] Build and Lesson can register through the instrument contract without changing the shell.

## Out of scope

- The Build instrument (P10) and Lesson (P11) — this plan defines their slot only.
- Where scenarios and lessons ultimately live as content. A real content model is its own piece of
  work and is called out in the breakdown as such.
- Authoring UI for any of it. This plan renders what an author wrote; it does not help them write it.

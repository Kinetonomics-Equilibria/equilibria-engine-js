# P15 — The stage, when it isn't a chart

**Lane:** app + bindings ·
**Depends on:** P7 (the stage), P10 (one timeline), P11 (the attempt loop), P14 (which curve moves) ·
**Unblocks:** lessons that teach with a picture as well as a diagram ·
**Status:** 🚧 **In progress** — phases 1 (the cover), 2 (the picture step) and 3 (the recap) landed
2026-10-21; phase 4 to follow, its own commit.

## Goal

Let a lesson put something other than a diagram on the stage, in four places and no more:

1. **A cover**, before the first step, in place of the empty axes the stage showed there.
2. **A picture step**: one step shows a picture or an animation across the whole stage. Its words
   stay on the lesson card.
3. **A recap**, at the last step: each question the lesson asked, and how the student did.
4. **A picture beside the diagram**: during a question, a news clipping joins the stage's
   arrangement as a panel of its own — on the rail, promotable, travelling like the US$ panel —
   while the diagram stays workable.

## Why this shape

Before this, everything on the stage was a panel the engine drew, so a lesson could only teach by
moving curves, and before "Start lesson" it showed a pair of labelled axes with nothing in them —
the first thing a student saw of a lesson said nothing about it. The mockups ("Stage beyond
charts") tried the four ideas against the screen's own rules (docs/design.md), and the shape here
is what survived that:

- **The words keep their home.** A step's words are on the lesson card; the stage gets the picture.
  Nothing a step says is said twice. The cover is the one place with prose on the stage, because
  before the first step there is no step to say it.
- **Covers, pictures and recaps lie *over* the stage, not instead of it.** At those moments there
  is no diagram worth arranging, and the engine's always-present panels (the market's frame) cannot
  be "un-arrived". So a sheet lies over the stage while the stage stays mounted, inert and at its
  size: the step after finds the engine, its `prev` snapshot and its box exactly as they were, and
  nothing on the screen resizes.
- **The clipping is a real panel.** It answers a different question from the diagram (*what
  happened?*) and has to be read beside it while the student works, which is what the rail is for.
  Being a panel gets it the arrangement, promotion, the 300ms travel and the phone's shelf for free
  — but the stage could only arrange engine panels, so this is the one phase that changes
  `packages/react`.

## Read against the code (2026-10-21)

- **Hiding the stage with `visibility: hidden` would have broken seven Playwright waits** —
  `page.locator('.kg-container svg').waitFor()` waits for *visible*, at `fx.spec.ts:148`,
  `app.spec.ts:154`, `:636`, `:693` and more, and `scripts/screenshot.mjs:71`, all at the start
  where the cover is up. An opaque sheet laid over the stage, with the stage `inert`, breaks none
  of them: Playwright's visibility is about boxes, not occlusion.
- **New step fields are safe on the engine's step objects.** The engine only checks `reveal` names
  (`packages/engine/src/ts/KGAuthor/parsers/steps.ts:133`) and ignores keys it does not know, so
  `picture`, `aside` and `recap` ride on `LessonStep` beside `say` and `ask`. They must never go in
  `reveal`, which would warn and fail `lessons.test.ts`'s "reveals only things that exist".
- **The stage's panel list comes only from the config's `CustomLayout`** (`Stage.tsx:166`), and
  every entry becomes an engine `Graph` that needs axes. `stageConfig` is rebuilt whenever that list
  changes — a rebuild is a new model, which forgets `prev`. So a panel the app draws has to be
  arranged without ever being part of the engine's key list (phase 4).
- **Nothing records how a question went.** `TrackState.resolved` holds indices only, and the one
  `attempt` is deliberately not persisted (`StudyScreen.tsx:332-341`). The recap needs an outcome
  per question, recorded where `resolve` is dispatched (phase 3).
- **The stage's margin is a fraction of its width** (`PAD = 0.018`, `arrangement.ts:170`), which a
  CSS padding in percent is too, on every side. Exported as `STAGE_PAD` so the cover's sheet sits
  where a lone panel's sheet would.

## Approach

### Phase 1 — the cover ✅

- `track.ts`: `slideAt(steps, position, hasCover)` says what covers the stage (the cover at
  position 0, when the lesson has one); `partCounts(steps, part)` counts a part the way a student
  would — in questions if it asks any, in steps otherwise — and gives each step's kinds.
- `StageSheet` (new): the sheet over the stage — the page's colour round a paper sheet inset by
  `STAGE_PAD`, the paper's head, a body that scrolls. `container-type: size`, so what it holds can
  answer to its height.
- `LessonCover` (new): the picture (its still, if it moves), the question as a heading, the hook,
  and the parts as an ordered list with bars drawn like the track's (`ui/track.module.css`, which
  `LessonCard`'s markers restate because a `::before` cannot compose). No Start button: the card
  keeps it, and tests expect one.
- `StudyScreen`: the stage inside `.stageLayer` (`height: 100%`, `inert` under a sheet); the sheet
  beside it in `.stageBox` (`position: relative`); the Focus/Grid control disabled, not hidden, so
  the title's line keeps its height. Never over the instruments.
- Content: a cover for both lessons. The A$ one has a picture (`lessons/pictures/fx-cover.svg`, an
  ore carrier leaving port, flat shapes in slate and a terracotta that is no curve's colour).

### Phase 2 — the picture step ✅

- `LessonStep.picture` names a key in `pictures`; `slideAt` returns `{ kind: 'picture' }` at that
  step. A picture step draws nothing on the diagram under it — no `reveal`, `try` or `ask`.
- `PictureSheet` (new): the `StageSheet` with the picture's name as its eyebrow and, for a picture
  with a `still`, Pause/Play in the head's action slot. Pausing is showing the still, because an
  animated image in an `<img>` cannot be paused; playing remounts the moving one (`key`), so it
  starts again rather than resuming wherever the browser's clock had it. Reduced motion is read
  before the first paint (`useReducedMotion(false, { getInitialValueInEffect: false })`), so a
  student who asked for less sees the still with not one frame moving first.
- `StudyScreen`: the picture sheet when the slide is a picture; every picture fetched while the
  cover is read, both frames; "What changed" rests under any sheet (`line = REST`, no refusal) —
  the step after the picture's own `set`s would otherwise be narrated over a picture of something
  else — and says the diagram is back at the next step; "Reset the diagram to this step" is not
  offered under a sheet.
- Content: the A$ lesson's first step is now "Who wants Australian dollars?" with the picture
  `trade` (`fx-trade.svg`, and `fx-trade-still.svg`, the same drawing with the motion off): what
  Australia sells leaving for buyers overseas, and A$ coming back in the demand curve's blue. The
  old first step keeps the demand curve and its key term, retitled "Demand for A$ slopes down", and
  says its second paragraph — the slope — on its own.

### Phase 3 — the recap ✅

- `track.ts`: `TrackState.outcomes`, by step index — `{ how: 'first' }`, `{ how: 'retry', goes }`
  or `{ how: 'shown' }` — written by `resolve`, which now carries one, at the early return that
  already kept a question from being resolved twice; so the first outcome is the one kept, and a
  student who was shown an answer and went back to get it right was still shown it.
  `LessonStep.recap: { takeaway }`; `slideAt` returns `{ kind: 'recap' }` at that step.
- `StudyScreen`: `onCommit` resolves with `first` at one commit and `retry` with the count after
  more; `onReveal` with `shown`. `recapCases` builds a case per question before the recap: its step
  title, its cause in the chain's words (`rise` for a question answered up, `fall` down, the label
  where the lesson has none), its curve's colour, its explanation, its outcome. For this session
  only, like the attempt it is read from.
- `LessonRecap` (new, presentational): a card per case, two to a line where the sheet is 600px or
  more; the cause marked as "What changed" marks it, a ring in the curve's colour beside words in
  the text's (orange words on white would not be read); the outcome in teal for right — "Right
  first time", "Right on the second go", "Right after 4 goes" — and grey for "You used Show me";
  the takeaway in the `why` callout, "In short". The sheet is "How you went".
- Content: the A$ lesson's "Over to you" recaps the four cases. Its first paragraph was the rule,
  so the rule became the takeaway — said once, under the cases — and the card says "Here's how you
  went on the four cases." The supply and demand lesson has no recap yet.

### Phase 4 — the picture beside the diagram

`Stage` gains `hostPanels` and `renderPanel`: panels the app draws, arranged after the diagram's,
given no engine params, and drawn in a layer between the canvas and the chrome. The A$ lesson's
first question shows its news report there.

## API / schema surface

```ts
// packages/react — arrangement.ts / index.ts
export const STAGE_PAD = PAD;                                      // NEW (phase 1)

// apps/web — lessons/content.ts
interface StudyContent {
    cover?: LessonCover;                                           // NEW (phase 1)
    pictures?: Record<string, Picture>;                            // NEW (phase 1)
}
interface LessonCover { question: string; hook: string; picture?: string }   // NEW
interface Picture { name: string; src: string; alt: string; still?: string } // NEW

// apps/web — track/track.ts
interface LessonStep { picture?: string }                          // NEW (phase 2)
interface LessonStep { recap?: { takeaway: string } }              // NEW (phase 3)
interface TrackState { outcomes: Record<number, Outcome> }         // NEW (phase 3)
type Outcome = { how: 'first' } | { how: 'retry'; goes: number } | { how: 'shown' };  // NEW
// TrackAction 'resolve' now carries `outcome: Outcome`             // CHANGED (phase 3)
type Slide = { kind: 'cover' } | { kind: 'picture'; picture: string }
    | { kind: 'recap'; takeaway: string };                         // NEW; a kind per phase
function slideAt(steps, position, hasCover): Slide | null;         // NEW
function partCounts(steps, part): { steps; questions; kinds };     // NEW
```

## Tests

Phase 1:

- `track.test.ts` — what covers the stage, and how a part is counted.
- `lessons.test.ts` — every lesson's cover asks its question in a line ending "?", at most 60
  characters, not containing the lesson's title; its hook is one paragraph of at most 220; every
  picture named exists, and has a name and alt text.
- `lesson.test.tsx` — the cover stands in for the empty diagram, with the stage inert and Grid
  disabled; it lays out three parts, the last counted in questions; it gives way at the first step
  and comes back before it; it is never over the instruments.
- `foreignExchange.test.tsx` — the A$ cover's picture, question, and parts as the track will draw
  them.
- `app.spec.ts` — the cover is up at the start; Tab never stops inside the stage under it; the
  diagram's box is the same before and after Start.
- `fx.spec.ts` — the cover's parts row, with its question bars the very yellow of the track's
  question markers.

Phase 2:

- `track.test.ts` — the picture at a step that shows one, and nothing at a step that does not.
- `lessons.test.ts` — every picture a step names exists, its alt text is at most 250 characters, a
  step's SVG or GIF has a still, and a picture step reveals, offers and asks nothing.
- `foreignExchange.test.tsx` — step 1 shows who needs A$ across the stage, the diagram inert under
  it and the step's words only on the card; Pause shows the still and Play the animation; a
  student who has asked for less motion starts on the still; the next step's demand curve takes
  over.
- `fx.spec.ts` — under the suite's reduced motion the picture opens on its still with Play, plays
  on request, and the diagram's box is the same at the cover, the picture and the next step; with
  motion it moves, and pauses on its still.

Phase 3:

- `track.test.ts` — the recap at a step that looks back; how a question went is recorded, and the
  first outcome is kept when it is answered again.
- `lessons.test.ts` — a recap comes after a question, its takeaway is a paragraph, and it asks
  nothing of the diagram.
- `foreignExchange.test.tsx` — the four questions answered right, wrong then right, shown, and
  right: the recap says each as it went, with the chain's clauses and the takeaway; going back to
  the shown one and getting it right leaves it shown.
- `fx.spec.ts` — the outcomes on the sheet, right and shown in different colours, the takeaway, and
  Tab never stopping in the inert stage under the recap.

## Risks and unknowns

- A phone's stage is short; the cover drops its picture below 460px of sheet height and shrinks its
  type below 480px of width, rather than scrolling the question away.
- `inert` is not enforced by jsdom, so the keyboard claims are Playwright's.

## Done when

- [x] Phase 1: the cover, both lessons — unit, screen and browser tests above, all green.
- [x] Phase 2: the picture step — tests above, all green.
- [x] Phase 3: the recap — tests above, all green.
- [ ] Phase 4: the picture beside the diagram.

## Out of scope

- A cover or picture that plays sound, or video. A picture is an image file.
- Mini charts and before→after numbers in the recap (the mockup drew both).
- Remembering outcomes across sessions: there is still no progress model.

## Findings

- **A picture's own canvas decides its type size.** The first drawing of the A$ trade picture was
  960 wide, and `object-fit: contain` drew it at three quarters of that on a laptop's stage — its
  13px labels came out at 10. Redrawn at 760 wide, about the stage's width, it is drawn at nearly
  its own size. On a phone it is still drawn at under half, and its labels are small; the alt text
  says everything it shows. A picture meant for a phone as well would want a narrower drawing.
- **Playwright finds a button's icon as an image.** A Tabler icon is an `<svg>`, which the
  accessibility tree reports with the `img` role, so `getByRole('img')` inside the picture's sheet
  found the picture and the Pause icon. The browser tests find the picture by its `<img>` element.

# The A$ lesson — findings

**Status:** Built 2026-10-19, on top of the uncommitted work already in the tree (labels inside the
diagram, words and numbers on the study screen). Not a numbered plan: a test of the study screen as it
stands — engine, stage, track, strip, dock and question loop — against a topic it was not built for.
**Source:** the Unit 5.2 slides, *The Foreign Exchange Market* (23 slides: exchange rate as a price,
appreciation and depreciation, the FX market diagram, four determinants, four practice scenarios),
recast for Australian students with the A$ as the reference currency.
**Where it lives:** [`apps/web/src/lessons/foreignExchange.ts`](../../apps/web/src/lessons/foreignExchange.ts),
opened from the navbar ("Exchange rates (A$)") or at `?lesson=fx`.
**Pinned by:** `apps/web/src/__tests__/lessons.test.ts` (every lesson's content, as data),
`apps/web/src/__tests__/foreignExchange.test.tsx` (a real engine; every rate a sentence quotes is read
back off the diagram's captions), `apps/web/tests/fx.spec.ts` (real drags, read back through the axes).

## What was built

**The market for the A$**, quoted the way the RBA quotes it: the price of A$1 in US$, on a price axis
from US$0.40 to US$0.90. Demand for A$ is the world buying Australian exports and assets; supply of A$
is Australians buying imports, travel and assets abroad. Both curves are dragged sideways.

```
demand for A$   Q = demand − 100·(e − 0.65)      e* = 0.65 + (demand − supply)/200
supply of A$    Q = supply + 100·(e − 0.65)      Q* = (demand + supply)/2
```

`demand` and `supply` start at 50 and move in steps of 2, which is one US cent on the rate. A shift of
10 moves the rate five cents: A$1 = US$0.65 → US$0.70.

**The same trades from the US side**, as a second panel. Whoever buys A$ pays in US$, so demand for A$
*is* the supply of US$, and the price of US$1 is 1/e. Same colours, same people: blue is the world
buying A$, orange is Australians selling it. This is the slides' recurring point — "the dollar
appreciates, the pound depreciates" — drawn rather than said, and nothing synchronises the panels: they
are two drawings of two params.

**A 14-step lesson** in the slides' order — demand, supply, the rate, the US side, an iron-ore boom
(appreciation), the price axis as the A$'s strength, Australians holidaying abroad (depreciation) — then
**four questions**, one per determinant on the slides: the RBA lifting the cash rate (interest rates),
Australian prices rising faster than US prices (relative prices), China's steel mills cutting back
(trading partners' incomes and the iron-ore price), a downturn at home (Australian incomes). Tastes
are the holiday step.

**Eight scenarios** in the dock, each a one-click determinant that says which curve it moves and why:
iron ore soars, the RBA lifts rates, China slows, Australians holiday abroad, Australian prices rise
faster, the Fed lifts rates, Australians buy fewer imports, and back to the baseline.

## Verdicts

| # | What the topic needed | Verdict |
|---|---|---|
| 1 | Two currencies, two panels, one market | **Holds** |
| 2 | Curves that shift sideways, *said* sideways | **Holds** — by writing the curves the other way round |
| 3 | A rate axis that starts at US$0.40 and reads to the cent | **Holds** |
| 4 | Ghosts, scenarios, the maths explainer, a remount mid-question | **Holds** |
| 5 | A second lesson on the screen | **Needed a change — made** |
| 6 | A verdict about a curve the student moved sideways | **Needed a change — made** |
| 7 | Questions about two different curves | **Needed a change — made** |
| 8 | Asking *which* curve moves | **Fails** — the question loop cannot ask it |
| 9 | Showing the answer to a direction-only question | **Fails** — there is nothing to draw |
| 10 | A lesson sentence longer than one line | **Fails** — clipped at an ellipsis; now a test |
| 11 | Saying "the A$ appreciates" when it does | **Not supported** — only the lesson's own sentences say it |
| 12 | Narrating a move that shows up in both panels | **Partly** — long, and silent past two curves |
| 13 | Captions with longer numbers than the first lesson's | **Partly** — the names give way |
| 14 | Grabbing demand where it crosses supply | **Fails quietly** — supply comes away instead |

## 1–4. What held

**One engine, two panels.** The A$ and US$ markets are two `CustomLayout` panels over the same params,
and a drag in either moves both. Nothing in the app was needed for that; it is the reason the stage is
built the way it is.

**Sideways, said sideways.** The first lesson's phrasebook is "literal geometry, on purpose" — a demand
curve dragged by its intercept is reported as moving *up* — and it says why it will not say "shifts
right" until a descriptor carries the slope. For an FX lesson that matters more than anywhere: an
increase in the supply of A$ is a shift *right*, and "supply of A$ shifts down" teaches the wrong idiom.

The engine already had the answer, it just was not used. A `Line` always samples along x unless it is
vertical (`packages/engine/src/ts/KGAuthor/graphObjects/line.ts:132`), so a sideways shift is measured as
a vertical one. A `Curve` whose `fn` mentions `(y)` is a function of y
(`packages/engine/src/ts/KGAuthor/parsers/parsingFunctions.ts:305`) and is sampled at fixed y
(`packages/engine/src/ts/view/viewObjects/curve.ts:121`) — so written as `Q = f(e)`, a shift is
horizontal, the engine reports `axis: 'x'`, and the strip says *"demand for A$ shifts to the right and
supply of US$ shifts to the right"* with no change to the engine or the phrasebook. The drag is
`horizontal:` (`packages/engine/src/ts/controller/listeners/dragListener.ts:44`), which adds the
drag's own `dx`, in quantity units, to the param.

Worth writing into the authoring docs: **write a curve as a function of the axis you want it to shift
along.** It is the cheapest fix for the phrasebook's open question, for every market where the idiom is
horizontal.

**A rate axis that does not start at zero.** `xAxis.intercept: 0.4` draws the quantity axis at the
bottom of the rate range, and the droplines drop to it (`packages/engine/src/ts/KGAuthor/graphObjects/point.ts:82`);
`yAxis.tickPrecision: 2` prints `0.40 … 0.90`. Both were there. `intercept` is in the schema docs
([04](../schema/04-graphs-and-scales.md)) as "where this axis crosses the other axis", without saying the
droplines follow it; `tickPrecision` is mentioned only in P4's plan.

**Ghosts, scenarios, maths, remounts.** `ghost:` on a function-of-y curve works as on a line, labels
and all. The Maths tab typesets the lesson's own formula with live values —
`0.65 + (60 − 50)/200 = 0.70` — with no content written for it. A question in progress survives the
engine being rebuilt when the question row changes the stage's shape.

## 5–7. What needed a change

**A second lesson.** `StudyScreen` imported one diagram's seven exports by name and printed one
heading, so it could only ever be about supply and demand. It now takes a `content` prop — a
`StudyContent` (`apps/web/src/lessons/content.ts`) carrying exactly those seven things plus the
heading — and `App` mounts it keyed by lesson, so another lesson is another screen rather than one
screen's track and question carried into a diagram they were never about. The first lesson is
unchanged: `studyDiagram.ts` is untouched and wrapped by `lessons/supplyAndDemand.ts`. The navbar's
second column, previously placeholder links, lists the lessons; `?lesson=fx` opens one directly, and the
back button returns to the last.

**"You moved it up."** A question's direction is defined on the param's value
(`apps/web/src/quiz/grade.ts`), and the verdict printed it as `up` / `down`. For a curve dragged
sideways the param rises as the curve moves right, so a student who pulled supply of A$ right was told
they moved it up. A lesson can now say how each param's direction reads (`directionWords`), and the
verdict says *"Wrong direction — you moved it left, and it should go right."* The default is unchanged
(`apps/web/src/quiz/verdict.ts:47`).

**Two askable curves.** Arming a question wrote the start and answer lines for the asked param only.
With questions about both demand and supply, the other curve's pair kept whatever the previous question
left, and a verdict that set `revealed` would draw a dotted "answer" to a question nobody was asking.
`parkApparatus` (`apps/web/src/quiz/apparatus.ts`) now parks every other askable param's lines on that
curve's current position, and the remount restore puts them back. A diagram with one askable param —
the first lesson — writes nothing more than before.

## 8. Which curve moves — fails

The slides' practice asks three things of each scenario: which curve moves, which way, and whether the
currency appreciates. The question loop can ask the second. It marks one named param, and it only counts
a move of *that* param as an attempt (`apps/web/src/StudyScreen.tsx:374`), so a student who reaches for
supply when the question is about demand is told *"You did not move it."* — which is false. So every
prompt here names its curve ("Move demand for A$, then check"), and the hardest third of the skill is
given away.

**Proposal.** A question names the right param among candidates — `ask: { param: 'demand', among:
['demand', 'supply'], direction: 'up' }`. Every candidate is listened to; every candidate freezes on
commit (both curves already carry `draggable: 'not(params.submitted)'`); the grade gains a *wrong curve*
outcome with its own sentence ("This one works through demand for A$ — supply should stay where it
was"); and the question row offers a slider per candidate, labelled, so the keyboard path makes the same
choice the mouse does. P11-sized, and the single change that would most improve this lesson.

## 9. Showing a direction-only answer — fails

Every question here is direction only, on purpose: the slides never ask *how far*, and a target would
have the verdict tell a student that the RBA's decision "belongs at 60", a number the lesson made up.
But a question without a target has no drawable answer
(`apps/web/src/StudyScreen.tsx:163`), so **"Show me" draws nothing**: the verdict's sentence names the
right direction, and the diagram goes on showing the student's wrong one.

**Proposal.** An `illustrate` amount on a direction-only question — "draw it shifted 10 the right way,
as an illustration" — that the reveal draws with the answer line it already has, and that the grade never
reads.

## 10. One line of strip — fails, and is now a test

A step's sentence is shown in the narration strip, which is one line that never grows
(`apps/web/src/NarrationStrip.module.css:73`) — growing would take height from the stage and rebuild the
engine. The first draft's sentences ran to 200 characters and were cut off mid-word at an ellipsis. The
lesson was rewritten as 14 one-idea steps of at most 112 characters, splitting *the shift* from *what
the shift did to each currency*.

That is a real constraint on authors, and it was invisible: nothing failed. `lessons.test.ts` now holds
every lesson's sentences to 120 characters — the first lesson passes as it stands — and documents why. A
question's prompt is exempt; the question row wraps.

**Proposal.** Either keep the constraint and put it in front of authors, or let a long sentence show in
full on demand (hover, or a second line only while a step is speaking, which does not move the stage
because it reserves the line).

## 11. "The A$ appreciates" — not supported

The vocabulary the topic is about is never generated. The strip reports `A$1 = US$0.65 → US$0.70` and
the caption a ▲; the words *appreciates* and *depreciates* appear only in the lesson's own sentences, so a
student exploring freely after the lesson never sees them attached to what they did.

**Proposal.** An optional meaning on a narrated calc — `{ name: 'rate', rises: 'the A$ appreciates',
falls: 'the A$ depreciates' }` — rendered after its clause and spoken in the screen-reader sentence. It
was not built here because `narrate.ts` and `NarrationStrip.tsx` carry another session's uncommitted
work.

## 12. Narrating a move seen in both panels — partly

Because the US$ panel's curves have titles, one drag is narrated as two shifts: *"demand for A$ shifts
to the right and supply of US$ shifts to the right"* — 72 characters, which pushes the US$1 and Q*
clauses off the one-line strip at 1280px (clipped from the end, by design; the A$1 rate still shows). A
scenario moving both curves would name four objects, and the mechanism clause refuses more than two
(`apps/web/src/narration/phrasebook.ts:111`) and says nothing. That is why every scenario here moves one
curve, as the slides do — though Australian textbooks usually have a rate rise move both (inflow up,
outflow down).

## 13. Captions with longer numbers — partly

The caption room and the narrow-grid rule were measured against the first lesson's widest number line,
"TR $196.00 ▲ $160.00" at 159px (`apps/web/src/StudyScreen.tsx:123`, `:143`). "A$1 = US$0.70 ▲ US$0.05"
is wider, so in the grid the panel's name was squeezed to "Marke…". Shortened to "A$ market" and
"US$ market"; the room is still one lesson's measurement.

## 14. Grabbing demand at the crossing — fails quietly

Found by the browser suite rather than by looking: a drag that starts where demand and supply cross
takes whichever curve was drawn last, which is supply. The test "dragged demand right" and the rate
*fell*. A student aiming at the equilibrium to move demand will move supply, and the strip will tell
them so — correctly, about the wrong curve. Not FX-specific, but an FX lesson has students drag both
curves far more than the first lesson does.

## Smaller things

- **One key press is one gesture.** Answering by keyboard narrates the last press, `57 → 58`, not the
  move since the question began. Each press here is a cent, so it shows.
- **`s` is seconds.** mathjs typesets a param named `s` upright (`\mathrm{s}`) beside an italic `d`.
  The params are called `demand` and `supply`, which reads better in the Maths tab anyway.
- **The cause clause is abstract.** "Demand for A$ 50 → 60" names the curve's quantity at US$0.65, which
  no student has reason to know — the first lesson's "a 20.0 → 26.0" has the same problem.
- **A rebuild is a blank frame.** The stage remounts the engine when the question row arrives or changes
  height, and the diagram is blank for about 50ms. A screenshot can catch it.

## Economics to review

These are decisions a teacher should check, not facts the code settled:

1. **The quote.** US$ per A$ (A$1 = US$0.65), as the RBA and the news quote it. The slides quote the
   other way for their own currency pair, and say why it matters ("depends which currency you are
   converting") — which the second panel is for.
2. **The US$ side counts the trades in A$.** Counted in US$, the mirror of a linear demand for A$ bends
   backwards over most of this range. Counting the same trades in A$ keeps both panels exact and both
   curves monotone, at the cost of an axis that reads "Quantity traded (A$)" on the US$ market.
3. **One curve per determinant**, as the slides do it. A rate rise moves only demand for A$ here.
4. **Relative prices work through imports** (supply of A$ rises), as the slides' rupee example does; the
   export side (demand for A$ falls) is equally right and would move the rate the same way.
5. **Only the US$.** No trade-weighted index, and no third currency: "selling A$ for holiday money" means
   for foreign currency in general.

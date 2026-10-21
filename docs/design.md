# The study screen's design language

How the study app (`apps/web`) decides what goes on screen, where, and how it
looks — written down so that the next panel, card or lesson is built the same
way as the last one, rather than each being argued from scratch.

The people it is for are Year 10 to first-year students, mostly in Australia,
mostly on a school laptop, learning to reason about a market. What they are
learning is a **chain**: something happens, a curve shifts, the price and the
quantity follow. The screen exists to make that chain visible and to put the
student's hands on the first link of it. Everything below serves that.

## The idea in one line

> **Every card answers one question a student would ask, and the cards are
> stacked in the order the questions come.**

Where am I? What can I do? What did that do? Why? A student who has used the
screen for five minutes knows where each answer lives, and stops spending
attention on finding things.

## Principles

1. **One question per card.** The lesson card answers *what is this step
   saying?*; the instruments, *what can I change?*; "What changed", *what did
   that do?*; each panel's sheet, *what does this market look like now?* A new
   piece of information goes on the card whose question it answers. If it
   answers none of them, it is a new card — or it is not needed. Before the
   first step the stage answers *what is this lesson about?*, on a cover over
   the diagram (P15); the words of a step are never on the stage, which shows
   what the diagram would have.

2. **Cause above effect, everywhere.** The side column reads top to bottom in
   the order a student works: where they are, what they can move, what moving
   it did. The chain inside "What changed" reads the same way: what moved, what
   that did to the curves, what followed. Spatial order is causal order, so the
   layout teaches the reasoning before a word is read.

3. **Words before symbols.** Plain words first, the economics word second, the
   letter last. A slider says who is behind its curve ("People overseas paying
   for Australian exports, holidays and assets") before it says 50. A move is
   reported as "The A$ appreciates  US$0.65 → US$0.70", not "A$1 = ▲". And the
   words are the lesson's own — the steps that teach appreciation are titled
   with the very phrases the chain uses — so exploring and the lesson describe
   one event one way.

4. **One home for each kind of information.** The chain lives in "What
   changed" and nowhere else on that screen; a number is printed once per place
   it appears, by one formatter, with one label and unit. A home keeps its
   place when it has nothing to say: "What changed" is the column's bottom
   third from the first page, and until the lesson has drawn something that
   could change, it says what it is waiting for.

5. **Nothing moves under the pointer.** The side column has a fixed width, so
   nothing in it can resize the diagram, and its two cards have fixed heights,
   so nothing in one can move the other: a slider never slides out from under
   the student who is holding it. Content that cannot fit scrolls inside its
   card, never the page.

6. **Colour means one thing.** A colour that always means the same thing can be
   read without reading. Numbers never get a verdict colour: a falling price is
   good news for someone, so arrows and amounts carry the direction, in grey.

   | Colour | Means | Where |
   | --- | --- | --- |
   | Blue (primary) | You can act here; where you are | buttons, links, the current step |
   | Light blue | A word to learn | key-term callouts |
   | Yellow | A question waiting for you | the question callout, its progress marker, the cover's bars for a question |
   | Teal | The reasoning | "Why" after a question; a right answer |
   | Grey | Numbers, and things to try | chips, the chain's arrows, try-it callouts |
   | The curves' colours | The market itself | the diagram, the slider that moves each curve, and the chain's markers for what moved and the curves it moved |

7. **Calm by default, depth on demand.** Each card shows the headline and puts
   the depth one press away: "Why? See the maths" opens the formula behind the
   first effect; a scenario carries its reasoning in one line; "Try this" offers
   questions and marks nothing. A curve that reaches the end of its range gets a
   note with an information mark, never an error.

## The side column

Beside the stage, 320px wide, the screen's full height, two cards 12px apart:

```
 While a lesson runs                 With the lesson put away

 ┌────────────────────────┐          ┌────────────────────────┐ ┬
 │ Lesson Explore Scen… … │          │ Lesson Explore Scen… … │ │ where you are,
 │ Part 2 of 3 · …        │          │ Demand for A$       50 │ │ what you can do
 │ ▬▬▬▬ ▬▬▬▬▬ ▬▬▬▬        │          │ who it is              │ │
 │ Demand for A$ …        │          │ ━━━━━━━○━━━━━━━━━━━━━━ │ │ two thirds
 │ step words, key term,  │          │ Try this               │ │
 │ the question or try-it │          │ ○ …                    │ │
 │ Back      1 of 5  Next │          │                        │ │
 ├────────────────────────┤          ├────────────────────────┤ ┼
 │ What changed     Undo  │          │ What changed     Undo  │ │ what it did
 │ ○ Demand … increases   │          │ ○ ·  ●  …              │ │
 │ ● The A$ appreciates   │          │                        │ │ one third
 └────────────────────────┘          └────────────────────────┘ ┴
```

- One card holds the lesson and the instruments under one row of tabs —
  Lesson, Explore, Scenarios, Maths — one open at a time, and only the open one
  mounted. Opening an instrument's tab puts the lesson away and hands the
  instruments the whole diagram; the Lesson tab brings the lesson back where it
  was left, its market, ghost and question with it. Finish, at the last step,
  opens Explore. The tabs are the way out, so the lesson has no close here.
- The tabs' card is the top two thirds of the column and "What changed" the
  bottom third, whatever either holds and whichever tab is open. A long step
  scrolls between the lesson's head and its Back and Next, which hold still; an
  instrument scrolls inside its tab; a long chain scrolls under "What changed"'s
  head. Four calcs of maths fit their tab at 1440×900; below about 875px tall
  the Maths tab scrolls.
- The tabs are each as wide as their name, sharing out what is left, and the
  open one is no bolder than the rest, so opening one moves no other.
- On a phone there is no column: the lesson goes under the stage at a fixed
  height, the instruments into a bottom sheet, and the chain into the one-line
  strip under the stage (`NarrationStrip`) — the same narration, at the density
  a phone has room for. The two never appear together and announce the same
  sentence.

### Why the chain left the strip

The strip under the stage is one line that must never grow — a strip that grew
would shrink the diagram under the student's pointer. So it clipped a long
chain from the end, and the end is the effects: after moving supply of A$ by
two, the strip showed the cause and the shifting curves and **not the change in
the exchange rate**, which is the thing the student moved something to see. The
lesson's words left the strip for the same reason (see `LessonCard`). Beside the
stage the column's width is already the stage's loss, so the chain costs the
diagram nothing there, gets the room to be read whole, and sits directly under
the controls that cause it. The strip's height went back to the diagram.

## The kit

Reusable pieces, in `apps/web/src`. Reach for these before writing new CSS.

| Piece | Where | What it is |
| --- | --- | --- |
| Paper | `ui/paper.module.css` `.paper` | The one surface: white, hairline edge, 12px corner, a shadow only just there. Every card and every panel sheet composes it. Corner and shadow are tokens in `index.css` (`--paper-radius`, `--paper-shadow`). |
| Card head | `ui/paper.module.css` `.head`, `.eyebrow` | What the card is, small and grey at the left; the card's one action at the right (the lesson's close on a phone, "What changed"'s Undo). |
| Callout | `ui/callout.module.css` | A tinted box inside a card, toned by kind: `term`, `ask`, `try`, `why`, with `.label` for its name. The only place these colours are defined. |
| Param control | `ParamControl.tsx` | Name and value on a line, who it is under them, the slider across the card. Explore, a lesson's try-it and its question use it; the question's stops moving once it is answered, and Enter answers. Drawn in its curve's colour where the lesson names one, the theme's blue where it does not. The gesture wiring is `ParamSlider`'s. |
| The chain | `NarrationCard.tsx` | Cause, curves, effects down a rail, each in the lesson's words with its numbers was → now; the first two marked in their curves' colour, read from the engine. Rendered from `narrate()`; decides nothing. |
| Action row | `dock/Scenarios.tsx` | Something to press that needs its reason beside it: the name, the reasoning under it, an arrow — all one button. |
| Prompt list | `dock/Explore.tsx` | Suggestions under a "Try this" eyebrow, with hollow markers: things to do, not tasks to tick. |
| Stage sheet | `StageSheet.tsx` | A sheet over the whole stage, for a moment with no diagram to show: paper, inset by the stage's own margin (`STAGE_PAD`), with the card head and a body that scrolls. The stage stays mounted under it, inert and at its size. |
| Track bars | `ui/track.module.css` `.bar` | A step drawn as a bar, yellow when it asks a question. The cover's parts use it; the lesson card's markers restate it, because a `::before` cannot compose. |

Compose rather than copy: `composes: paper from './ui/paper.module.css';` at the
top of a card's class, then only what is particular to that card.

## What a lesson supplies

The components hold no economics. Everything a student reads comes from the
lesson's `StudyContent` (`lessons/content.ts`), so a teacher's edit is a data
change:

| Field | Read by | Write it as |
| --- | --- | --- |
| `paramWords.about` | Explore, under each control | Who is behind the curve, one short sentence. Not the unit. |
| `paramWords.rise` / `fall` | The chain's cause | A whole clause, present tense, sentence case: "Supply of A$ increases". |
| `paramWords.curve` | The chain's markers, and the param's slider | The colour its curve is drawn in, as the diagram names it: `demand` for `color: 'colors.demand'`. Every curve the param moves should be drawn in it. |
| `narratedCalcs[].rise` / `fall` | The chain's effects | The step title that teaches it: "The A$ appreciates", "Sellers earn more". Mind reciprocals — a dearer US$1 is a US$ that has *appreciated*. |
| `explorePrompts` | "Try this" | Two or three open questions, each answerable with the controls on screen. |
| `scenarios[].description` | Scenarios | The reasoning: who needs A$ or sells them, so which curve, which way. |
| step `term` | The lesson card | A word, and what it means, the first time it is used. |
| `cover` | The stage, before the first step | A question the lesson answers, one line ending "?", and a hook of one short paragraph. Not the lesson's title over again. |
| `pictures` | The cover, and steps that show one | An imported image file, its name in a few words, and alt text that says what it shows. Anything that moves has a `still`. |

Every field is optional. Without words a clause is shown by its label, as the
first version of the screen did, so a lesson can gain them one at a time.

## Writing for the screen

- Present tense, sentence case, plain words first: "Demand for A$ increases".
- Name the people behind a curve, not the curve: "Australians paying for
  imports" says more than "Supply of A$".
- Numbers as the diagram prints them: `formatValue`, the narrated label and
  unit, tabular digits, was → now. Never a colour for a direction.
- Nothing scolds. A limit is "at the top of its range in this diagram"; a wrong
  answer gets a reason and a way to try again.

## Adding something new

1. **Which question does it answer?** Put it on that card. If it answers a new
   question, it is a new card, placed where that question comes in the order.
2. **Must it always be visible?** If not, put it behind a tab, a link or "Why?".
3. **Does it change size?** The cards beside the stage do not, so it scrolls
   inside the card it is on. Put it below the controls whose effect it shows,
   never above them, so that scrolling to it never hides them.
4. **Does it need a colour?** Use a callout tone. A new meaning is a new colour,
   added to the table above first.
5. **Does it print a number?** Through `formatValue`, with the narrated label
   and unit, so it agrees with every other place that number appears.
6. **Does it say anything?** Write the words in the lesson's content, in the
   lesson's vocabulary, not in the component.

## Next

- **Words in the refusal.** "a is at the top of its range" uses the param's
  label; with `paramWords` it could say which curve.

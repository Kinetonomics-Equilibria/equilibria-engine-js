# The study screen's design language

How the study app (`apps/web`) decides what goes on screen, where, and how it
looks — written down so that the next panel, card or lesson is built the same
way as the last one, rather than each being argued from scratch. What is drawn
inside a panel — its caption, axes, curves, labels and annotations — has a file
of its own, [`chart-design.md`](./chart-design.md).

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
   the diagram, and at the end *how did I go?*, on a recap (P15); the words of
   a step are never on the stage, which shows what the diagram would have.

2. **Cause above effect, everywhere.** The side column reads top to bottom in
   the order a student works: where they are, what they can move, what moving
   it did. The chain inside "What changed" reads the same way: what moved, what
   that did to the curves, what followed. Spatial order is causal order, so the
   layout teaches the reasoning before a word is read.

3. **Words before symbols.** Plain words first, the economics word second, the
   letter last. A slider says who is behind its curve ("People overseas paying
   for Australian exports, holidays and assets") before it says 50. A move is
   reported as "The AUD appreciates  USD 0.65 → USD 0.70", not "AUD 1 = ▲". And the
   words are the lesson's own — the steps that teach appreciation are titled
   with the very phrases the chain uses — so exploring and the lesson describe
   one event one way.

4. **One home for each kind of information.** The chain lives in "What
   changed" and nowhere else on that screen; a number is printed once per place
   it appears, by one formatter, with one label and unit. A home keeps its
   place when it has nothing to say: "What changed" is the column's bottom
   third from the first page, and until the lesson has drawn something that
   could change, it says what it is waiting for.

5. **Nothing moves under the pointer.** The side column's width is set by the
   window alone, so nothing in it can resize the diagram, and its two cards
   have fixed heights, so nothing in one can move the other: a slider never
   slides out from under the student who is holding it. Content that cannot
   fit scrolls inside its card, never the page.

6. **Colour means one thing.** A colour that always means the same thing can be
   read without reading. Numbers never get a verdict colour: a falling price is
   good news for someone, so arrows and amounts carry the direction, in grey.

   | Colour | Means | Where |
   | --- | --- | --- |
   | Blue (primary) | You can act here; where you are | buttons, links, the current step, Present while presenting |
   | Light blue | A word to learn | key-term callouts |
   | Yellow | A question waiting for you | the question callout, its progress marker, the cover's bars for a question |
   | Teal | The reasoning | "Why" after a question; a right answer, in a verdict and in the recap; the recap's takeaway |
   | Grey | Numbers, and things to try | chips, the chain's arrows, try-it callouts; an answer the student was shown, in the recap |
   | The curves' colours | The market itself | the diagram, the slider that moves each curve, and the chain's markers for what moved and the curves it moved |

7. **Calm by default, depth on demand.** Each card shows the headline and puts
   the depth one press away: "Why? See the maths" opens the formula behind the
   first effect; a scenario carries its reasoning in one line; "Try this" offers
   questions and marks nothing. A curve that reaches the end of its range just
   stops there: the slider already shows the number, so nothing is said.

## The title line

```
 The Australian dollar, and what moves it       Focus│Grid  ┊  ↺ Reset  ▭
```

- The lesson's title, and at its end the tools that act on the whole stage:
  Focus | Grid, a hairline, Reset, then Present (`TitleLine`). Share goes
  after Present when it is built (see "Reserved for later"), so none of
  these has to move.
- Not over the stage, where a tool lands on a panel's caption, and not in
  the side column, whose cards each answer one question that none of these
  answers.
- One line beside the stage, whatever the window, so the stage's height
  never depends on it. Where the line runs short the tools' names go first,
  measured against the lesson's own title rather than set at a breakpoint;
  where even that leaves the title too long, it is cut with an ellipsis
  rather than wrapped. Reset says its name from about 1040px, and the A$
  lesson's title is whole from about 985px; at 900px it reads "The
  Australian dollar, and w…".
- Reset says its name; Present is an icon, with "Present to a class" as its
  label and its tooltip. Reset's icon has its name as a tooltip once the
  name has gone.
- Under a sheet, Focus | Grid and Reset are disabled, not hidden. Present
  still works: a cover is worth showing a class.
- On a phone there is no room for the row: Focus | Grid stays, a `⋯` beside
  it holds Reset, and the title wraps, as it always has. Present is not
  offered there. The `⋯` and the
  instruments' door are as tall as the toggle and 6px apart, which keeps the
  first lesson's title to three lines while exploring; in the lesson the `⋯`
  still costs the title a line, about 26px of the stage.

### Reset

- Puts the diagram back where the open tab or step began. During the lesson
  that is the step's own market: the diagram's, with every step's `set` up
  to here over it, so a curve no step sets goes back where the diagram drew
  it. A question's curves go back where the question found them, which is
  where it is marked from. Under an instrument, it is the market the
  instruments were handed.
- It is how a step's own market comes back after scrubbing back, which
  un-draws and leaves the student's values alone. It took the place of the
  lesson card's "Reset the diagram to this step", which put back only what
  the steps had set.
- A move like any other: it takes the engine's snapshot first, as a scenario
  does, so "What changed" reports it and Undo brings the student's curves
  back. That is why it never asks "Are you sure?".
- Greyed, not hidden, when nothing would change.
- It does not move the lesson's place or forget an answer: a curve whose
  answer is in stays where it was answered. The lesson's own Back and track
  move the lesson.

### Present

- The whole page full screen with the rail put away, for a classroom
  projector. The rail is about the app, and a class has no use for it, so
  the stage gets its width; it is inert while it is away, so the keyboard
  cannot reach it.
- Nothing else changes: the stage notices its new size and arranges itself,
  as it does when the window changes, and the lesson, the side column and
  whatever the student had done stay as they were.
- Esc comes back, and so does Present again, which shows pressed (light
  blue, "where you are") while the page is presenting. Whether it is
  presenting is the browser's to say (`present.ts`): Esc is the browser's
  key and never reaches the page, so the screen reads
  `document.fullscreenElement` rather than keeping a flag that Esc would
  leave behind.
- Not offered on a phone, and not where the browser cannot go full screen
  (Safari on an iPhone).

## Links

```
 ?lesson=fx&step=7&arrange=grid&focus=mirror&supply=56
```

- A link is a view: the lesson, the open tab or the lesson's step, each
  param the student can move that is not where the lesson puts it, the
  arrangement and the panel at the front (`links.ts`). "The start of the
  lesson" is just `?lesson=fx`.
- Readable query parameters beside `?lesson=`, named after the params, so a
  teacher can see what a link will open before sending it: `step` or `tab`,
  then `arrange=grid` and `focus` where they are not the lesson's own, then
  the params. Where the lesson puts a param is the step's market, as Reset
  has it; under an instrument, the diagram's own.
- The address follows the view. A lesson change is pushed, as the lesson
  alone; anything else replaces, so Back goes to the last lesson rather than
  the last drag, and the address bar is always the link to this view. Each
  history entry is left at the view its lesson was left at, so Back opens
  that lesson there.
- Written when the view settles, the boundary the narration keeps: a drag is
  written once, when it is let go. A held arrow key commits on every repeat,
  so writes are at least 350ms apart, the newest replacing one that waits,
  because a browser stops taking them past a rate.
- Opening at a link is a restore, in the order every restore uses: the
  market back, then the engine's snapshot. Nothing is drawn or said for a
  move nobody made: no ghost, no change chip, "What changed" at rest. Reset
  puts back the step's market, or under an instrument the one the link
  opened with.
- **A link never carries an answer.** A question a link opens at is
  unanswered, whoever sent it, and its curves are where the step puts them,
  which is where it is marked from, so the student's answer is never
  written. A link to a step past a question opens at the first unanswered
  one, as the lesson puts it, without the link's params: they were the
  market after the answer, and could be it.
- A link that names a param the lesson no longer has opens without it, and
  so does one whose value is not a number or whose param is not the
  student's to move; a step past the end is the end, and a lesson that has
  gone opens the first lesson at its start. Lessons change, and links handed
  out last term should still open. The address then says what did.
- A phone writes what a laptop does, so one link opens on either: the open
  instrument is the tab, sheet up or down. A phone opened at a tab leaves
  the sheet down with the lesson put away, since what was sent is the
  diagram and the sheet would cover it.
- No lesson may give a param one of the address's own names: `lesson`,
  `step`, `tab`, `arrange`, `focus`. A test checks.

## The side column

Beside the stage, the screen's full height, two cards 12px apart. It is 320px
wide on a laptop and grows with the window to 380px (`clamp(320px, 20vw,
380px)`): at 320 a line of the lesson is about 42 characters, short of
comfortable reading, and on a large screen the focal panel is held by the
stage's height, so the width the column takes there was slack beside it. Grid,
whose panels sit side by side and are held by the stage's width, pays for it,
which is why the column stops at 380.

```
 While a lesson runs                 With the lesson put away

 ┌────────────────────────┐          ┌────────────────────────┐ ┬
 │ Lesson Explore Scen… … │          │ Lesson Explore Scen… … │ │ where you are,
 │ Part 2 of 3 · …        │          │ Demand for AUD      50 │ │ what you can do
 │ ▬▬▬▬ ▬▬▬▬▬ ▬▬▬▬        │          │ who it is              │ │
 │ Demand for AUD …       │          │ ━━━━━━━○━━━━━━━━━━━━━━ │ │ two thirds
 │ step words, key term,  │          │ Try this               │ │
 │ the question or try-it │          │ ○ …                    │ │
 │ Back      1 of 5  Next │          │                        │ │
 ├────────────────────────┤          ├────────────────────────┤ ┼
 │ What changed     Undo  │          │ What changed     Undo  │ │ what it did
 │ ○ Demand … increases   │          │ ○ ·  ●  …              │ │
 │ ● The AUD appreciates  │          │                        │ │ one third
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
chain from the end, and the end is the effects: after moving supply of AUD by
two, the strip showed the cause and the shifting curves and **not the change in
the exchange rate**, which is the thing the student moved something to see. The
lesson's words left the strip for the same reason (see `LessonCard`). Beside the
stage the column's width is already the stage's loss, so the chain costs the
diagram nothing there, gets the room to be read whole, and sits directly under
the controls that cause it. The strip's height went back to the diagram.

### The stage's margin

The panels' sheets sit in from the stage's edge by `STAGE_PAD`, half the gap
between two panels. The page has a margin of its own round the stage, and with
both at the full gap a sheet stood about 43px off the side column, whose own
cards are 12px apart. The title and the intro above the stage are inset by the
same margin, so their edges are the sheets' edges and the stage reads as one
block under its title.

## The kit

Reusable pieces, in `apps/web/src`. Reach for these before writing new CSS.

| Piece | Where | What it is |
| --- | --- | --- |
| Title line | `TitleLine.tsx` | The lesson's title and the stage's tools on one line that never wraps: the tools' names go first, then the title is cut. On a phone the tools but Focus \| Grid are in a `⋯`, and Present is not offered. |
| Paper | `ui/paper.module.css` `.paper` | The one surface: white, hairline edge, 12px corner, a shadow only just there. Every card and every panel sheet composes it. Corner and shadow are tokens in `index.css` (`--paper-radius`, `--paper-shadow`). |
| Card head | `ui/paper.module.css` `.head`, `.eyebrow` | What the card is, small and grey at the left; the card's one action at the right (the lesson's close on a phone, "What changed"'s Undo). |
| Callout | `ui/callout.module.css` | A tinted box inside a card, toned by kind: `term`, `ask`, `try`, `why`, with `.label` for its name. The only place these colours are defined. |
| Param control | `ParamControl.tsx` | Name and value on a line, who it is under them, the slider across the card. Explore, a lesson's try-it and its question use it; the question's stops moving once it is answered, and Enter answers. Drawn in its curve's colour where the lesson names one, the theme's blue where it does not. The gesture wiring is `ParamSlider`'s. |
| The chain | `NarrationCard.tsx` | Cause, curves, effects down a rail, each in the lesson's words with its numbers was → now; the first two marked in their curves' colour, read from the engine. Rendered from `narrate()`; decides nothing. |
| Action row | `dock/Scenarios.tsx` | Something to press that needs its reason beside it: the name, the reasoning under it, an arrow — all one button. |
| Prompt list | `dock/Explore.tsx` | Suggestions under a "Try this" eyebrow, with hollow markers: things to do, not tasks to tick. |
| Stage sheet | `StageSheet.tsx` | A sheet over the whole stage, for a moment with no diagram to show: paper, inset by the stage's own margin (`STAGE_PAD`), with the card head and a body that scrolls. The stage stays mounted under it, inert and at its size. |
| Picture sheet | `PictureSheet.tsx` | A step's picture on a stage sheet, as large as the sheet allows and never cropped, with Pause/Play in the head when it moves. Pausing shows its still; reduced motion starts there. |
| Report panel | `AsidePanel.tsx` | A report beside the diagram, as a panel of the stage's own (`hostPanels`): captioned by its name, read at the front with its picture and note, words first as a glyph. Where its glyph is too short for the words, its caption says the headline. |
| Recap | `LessonRecap.tsx` | The lesson's questions looked back over: a card each with its title, its cause marked in its curve's colour, its explanation and how it went; then the takeaway in the `why` callout. Presentational — the screen builds the cases. |
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
| `paramWords.rise` / `fall` | The chain's cause | A whole clause, present tense, sentence case: "Supply of AUD increases". |
| `paramWords.curve` | The chain's markers, and the param's slider | The colour its curve is drawn in, as the diagram names it: `demand` for `color: 'colors.demand'`. Where the param moves curves in two panels, the colour of the first panel's: demand for AUD is blue, though in the USD market it moves the orange supply of USD. |
| `narratedCalcs[].rise` / `fall` | The chain's effects | The step title that teaches it: "The AUD appreciates", "Sellers earn more". Mind reciprocals — a dearer USD 1 is a USD that has *appreciated*. |
| `explorePrompts` | "Try this" | Two or three open questions, each answerable with the controls on screen. |
| `scenarios[].description` | Scenarios | The reasoning: who needs AUD or sells them, so which curve, which way. |
| step `term` | The lesson card | A word, and what it means, the first time it is used. |
| `cover` | The stage, before the first step | A question the lesson answers, one line ending "?", and a hook of one short paragraph. Not the lesson's title over again. |
| step `picture` | The stage, at that step | A key in `pictures`. The step's words stay on the card and say what the picture is for; the step draws nothing on the diagram under it. |
| step `recap.takeaway` | The recap, under the cases | The rule every question was an instance of, in one paragraph. Said here and not on the card as well. |
| `asides`, step `aside` | A panel beside the diagram, at that step | The event a question turns on, as a report: a name for its caption ("News report"), a headline, one sentence, and a note that says it is made up. It is part of the question's prompt, so it names no curve the question offers — and the card does not tell the story again. |
| `pictures` | The cover, and steps that show one | An imported image file, its name in a few words, and alt text that says what it shows. Anything that moves has a `still`. |
| step `focus` | The stage, when the lesson passes that step going forward | The key of a panel that arrives to take over the lesson, such as the market after a chart of one buyer. Panels arrive in declared order, on the rail; this puts one at the front instead. Once, at the step that reveals it or later. |

Every field is optional. Without words a clause is shown by its label, as the
first version of the screen did, so a lesson can gain them one at a time.

## Writing for the screen

- Present tense, sentence case, plain words first: "Demand for AUD increases".
- Name the people behind a curve, not the curve: "Australians paying for
  imports" says more than "Supply of AUD".
- Numbers as the diagram prints them: `formatValue`, the narrated label and
  unit, tabular digits, was → now. Never a colour for a direction.
- Nothing scolds. A rule the diagram can't break gets a note with an
  information mark, never an error; a wrong answer gets a reason and a way to
  try again.
- A picture says in its alt text what it shows, in a sentence or two, because a
  student who cannot see it is owed what it says. Anything that moves has a
  still to pause on, and is drawn about as wide as the stage, so its labels are
  drawn at the size they were written.
- A report a question is about is made up, and says so: a lesson's numbers are
  its own, and a real report quoted at a class would be quoted out of its time.

## Adding something new

1. **Which question does it answer?** Put it on that card. If it answers a new
   question, it is a new card, placed where that question comes in the order.
   A tool for the whole stage or page answers no card's question: it goes on
   the title line, and "Reserved for later" may already have its place there.
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

## Reserved for later

Places kept for tools that are not built yet, so that the first one built
lands where the rest expect it and none of them has to move another. Nothing
in this section is on the screen today but the profile circle at the rail's
foot, which the tools to come there are placed around.

### The rest of the title line

```
 The Australian dollar, and what moves it    Focus│Grid  ┊  ↺ Reset  ▭  ⇪ Share
```

- Share joins [the title line](#the-title-line) after Present, at the far
  end because it is the page's, not the stage's.
- Share says its name. Where the line runs short it goes with Reset's,
  before the title is cut.
- Under a sheet, Share still works.

### Share

One menu for everything that leaves the screen:

```
 The link, QR code and embed open at
 [ This view | The start of the lesson ]
 ──────────────────────────────
 Copy link
 Show a QR code
 Embed…
 ──────────────────────────────
 Download the diagram       PNG
 Print or save as PDF
```

- Each item says under its name what it does, in a few plain words.
- "Opens at" decides what the link, the QR code and the embed carry. The
  download and the print are always this view. This view is [the
  link](#links) the address bar already holds.
- The QR code goes on a stage sheet (`StageSheet`), as large as the diagram
  was, so a class can scan it from the board, with the short link beside it
  for anyone who would rather type.
- Embed opens a dialog: the whole lesson or the diagram only, where it opens,
  and the code to copy.
- Download gives the panels as drawn, as a picture for notes, slides or an
  assignment.
- Print is a print stylesheet, not an export of its own: the lesson's title,
  the view's settings in words, the diagram, the chain from "What changed",
  and a QR code back to the view. The browser's dialog saves it as a PDF.
- On a phone there is no room for the row. Focus | Grid stays, and a `⋯`
  beside it holds Reset, Copy link, the phone's own share sheet ("Send
  with…"), Download and Print. QR, Embed and Present are for bigger screens.

### The rail's foot

The profile circle is at the very bottom of the rail, and Settings is in its
menu. Help goes above the circle, in the rail itself, a press away rather than
in a menu. Once there are accounts the circle shows the student's initials,
the menu opens with their name, and Sign out goes at its end, under Settings.
All of it is about the app rather than the diagram, so it belongs to the rail,
apart from the places to go.

### Embeds

- `/embed/<lesson>?layout=full` or `layout=diagram`, plus the same view as a
  link. The code is an iframe whose `title` is the lesson's.
- **The whole lesson** is the study screen less the rail: the title line, the
  stage and the side column. Share becomes "Open in Kinetonomics", which
  opens the app at the same view in a tab of its own. It wants about
  1000 × 640; narrower, it takes the stacked layout the screen already has
  for a phone.
- **The diagram only** is the stage, still draggable, with one line under it:
  Reset at one end and "Open the full lesson" at the other. No tabs, no
  lesson and no "What changed". It fits a 640px column.
- An embed saves nothing to the page it is on. Each student who opens it has
  their own copy, and nothing they do leaves their browser.

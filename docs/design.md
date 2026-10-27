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
   | A topic's colour | Which topic, only ever as a dot before its name | the Lessons panel, and over the lesson's title. Beside the name, so a teal topic is never read as the reasoning |

7. **Calm by default, depth on demand.** Each card shows the headline and puts
   the depth one press away: "Why? See the maths" opens the formula behind the
   first effect; a scenario carries its reasoning in one line; "Try this" offers
   questions and marks nothing. A curve that reaches the end of its range just
   stops there: the slider already shows the number, so nothing is said.

## The title line

```
 ● International economics                              ╭─────────────────╮
 The Australian dollar, and what moves it               │ ◉  ↺  ┊  ▭  ⇪   │
                                                        ╰─────────────────╯
```

- The lesson's title under the topic the Lessons panel lists it in, and at
  its end the tools that act on the whole stage: the arrangement and Reset,
  a hairline, then Present (`TitleLine`) and Share at the far end, because
  it is the page's rather than the stage's. The hairline parts what a sheet
  over the stage disables from what still works under one.
- The title is on the page, not on paper. Every sheet on the screen answers
  a student's question; the title names the page they are all on, so it
  sits on the desk above them, the one thing there. The tools are in a
  capsule of paper, because they are things to press, and so they read as
  one set rather than loose glyphs on the desk, a greyed one included.
- The topic is small and grey over the title, after the dot the Lessons
  panel draws before the topic's name, in the topic's colour, so the two
  read as one place. A lesson no topic lists has its title alone.
- No sentence under the title. It used to say how to read the price axis,
  which the axis's own title says, and to follow the lesson or drag a curve,
  which the cover and the lesson card say. It cost the stage a line.
- Not over the stage, where a tool lands on a panel's caption, and not in
  the side column, whose cards each answer one question that none of these
  answers.
- The topic and the title are one block beside the stage, whatever the
  window, so the stage's height never depends on them; the capsule is
  centred on the two. Every tool is an icon, so the tools are as wide
  whatever the lesson, and where the title is too long for what they leave
  it is cut with an ellipsis rather than wrapped. The A$ lesson's title is
  whole from about 945px.
- Each icon has no border, a round grey wash under the pointer that follows
  the capsule's ends, and its name as its label and its tooltip: Reset,
  "Present to a class", Share. The glyphs are 20px, larger than a menu
  item's 16px, since with no border the glyph is all there is of the tool;
  the buttons stay 30px, 2px apart, with 3px of capsule round them. A greyed
  one stays borderless rather than filling grey. Present shows pressed
  while the page is presenting.
- The arrangement is one icon, the arrangement the stage is in — an eye for
  Focus, four squares for Grid — and a press switches to the other, icon and
  all. Its tooltip names the arrangement and then, quieter, what a press does
  ("Focus  Switch to Grid"); its label is the press ("Switch to Grid"), so a
  screen reader says what it will do.
- Under a sheet, the arrangement and Reset are disabled, not hidden. Present
  and Share still work: a cover is worth showing a class, and worth a link.
- On a phone there is no room for the row: the arrangement stays, a `⋯`
  beside it holds Reset and Share's items, and the title wraps, as it always
  has. Present and the QR code are not offered there. The `⋯` and the
  instruments' door are in the capsule beside the arrangement, as tall as
  it and as close, which keeps the first lesson's title to two lines,
  exploring or in the lesson.

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

### Share

One menu for everything that leaves the screen (`ShareMenu`):

```
 Copy link
 Show a QR code
 ──────────────────────────
 Download the diagram   PNG
 Print or save as PDF
```

- Each item is its name and nothing under it. A sentence under every name
  made the menu twice as tall to read for no choice it helped with. Once an
  item has done its job its name says so ("Copied", "Drawing it…"); where
  the browser refuses, a small grey line under the name says what to do
  instead. The menu is as wide whatever it says, and the line Share is on
  never changes width, so nothing on it moves.
- The link and the QR code open the lesson at its start: `?lesson=fx`. What
  a class or a friend needs is the lesson, and a choice between this view
  and the start, above the items, was one more thing to read before any of
  them. Anyone who wants this view has it in the address bar, which always
  holds [the link](#links) to it. The download and the print are always this
  view, and the printed page's code goes back to it.
- Copy link copies by the browser's clipboard, and by selecting and copying
  where that is refused, as it often is inside another site's frame. Where
  both are refused it says so and gives the link to type.
- The QR code goes on a stage sheet, as large as the stage allows, so a
  class can scan it from the board, with the link beside it for anyone who
  would rather type (`QrSheet`). There is no shortener behind the app, so
  the link is written as typed, without `https://`. Done or Esc puts it
  away. While it is up the stage's tools are disabled as under any sheet; "What changed" goes on saying what
  it said, since the diagram under it is still the view.
- Download gives the stage as drawn — sheets, curves, labels and captions,
  not the column beside it — as a PNG at twice the screen's pixels, for
  notes, slides or an assignment. It is named for the view: "Exchange rates
  (AUD), step 7.png".
- Print is a print stylesheet, not an export of its own: the lesson's topic
  and title; the view in words (`PrintedView`) — where in the lesson, which
  panel is in front, and each param moved from where the lesson puts it —
  with a QR code back to the view and its link; the diagram, scaled as drawn to the
  paper's 680px; and the chain from "What changed", left off at rest. No
  rail, tools or tabs. The browser's dialog saves it as a PDF, and printing
  from the browser's own menu gives the same page.
- Download and Print are of the diagram, so they are greyed under the
  lesson's own sheets — the cover, a picture, the recap — where there is
  no diagram to give.
- On a phone the `⋯` holds Reset, Copy link, the phone's own share sheet
  ("Send with…") where it has one, Download and Print. A phone's link is
  the lesson's too.
- Embed… joins the menu with [Embeds](#embeds), after Show a QR code. Where
  an embed opens is asked in its own dialog, since a class page is where a
  particular view is worth fixing.

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
cards are 12px apart. The title line above the stage is inset by the same
margin, so its edges are the sheets' edges and the stage reads as one block
under its title.

## The kit

Reusable pieces, in `apps/web/src`. Reach for these before writing new CSS.

| Piece | Where | What it is |
| --- | --- | --- |
| Title line | `TitleLine.tsx` | The lesson's topic over its title, and the stage's tools in a capsule of paper beside them; the title never wraps: the tools are borderless round icons, named in their tooltips, and the title is cut where it meets them. The arrangement is one icon that switches Focus and Grid. On a phone the tools but the arrangement are in a `⋯`, and Present is not offered. |
| QR code | `QrCode.tsx` | A link as a QR code, one SVG path that scales sharp to any size, black on white whatever the theme because that is what a camera reads. Share's sheet and the printed page use it. |
| Paper | `ui/paper.module.css` `.paper` | The one surface: white, hairline edge, 12px corner, a shadow only just there. Every card and every panel sheet composes it, and so does the title line's capsule, with its own corner. Corner and shadow are tokens in `index.css` (`--paper-radius`, `--paper-shadow`). |
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

## Pages to come

Proposed, not built: until it is, everything above describes the screen as it
is. The app grows from one page, a lesson with its instruments beside it, to
three places a student can go, **Lessons**, the **Playground** and **In the
news**, and a Home that points at them. It is written down before any of it is
built, so the first one built lands where the others expect it.

### Why the lesson and the instruments part

- The tab row draws Lesson, Explore, Scenarios and Maths as four of a kind,
  and they are not. A lesson has a place, a cover, questions, answers and a
  recap; the instruments are tools that keep none of that. The screen already
  knows it: the lesson is one pane and the instruments another, with a choice
  of instrument inside it.
- Much of what is hardest on the screen exists to join the two: putting the
  lesson away and bringing it back where it was left, its market, ghost and
  question with it; Reset meaning one thing under the lesson and another under
  an instrument; a link that carries a step or a tab.
- For a student halfway through a question, three tabs beside the lesson are
  three ways out of it.
- What parts them is who is driving. The lesson leads; in the playground the
  student does; a story starts from something that happened. All three are
  drawn on the same diagrams, in the same words, by the same engine.

### Models

- A **model** is what the playground lists, and what a lesson and a story are
  drawn on: a diagram, its panels, the words for its params and effects, its
  maths, its "Try this" prompts and its scenarios. A **lesson** is a cover,
  steps, questions and a recap over one model. A **story** is a real event,
  told against one model.
- Today each lesson brings its own diagram and instruments in `StudyContent`,
  so the first step is a split of that type, which no student sees: the
  model's fields leave the lesson (see
  [What each supplies](#what-each-supplies)), and the lesson names its model.
- Several lessons may share a model: demand's shifters, elasticity and a price
  ceiling are all one market. So the playground's list stays short as the
  lessons grow, which is the sign it is a list of something else.
- A model is named for what it draws, in plain words: "The market for the
  Australian dollar". Never a lesson's title, so the Lessons panel and the
  Playground panel never read as one list twice.
- The words for a param are its model's, so a lesson, the playground and a
  story say "Demand for A$ increases" the same way (principle 3) by
  construction rather than by care.

### The rail

| Icon | Place | A press |
| --- | --- | --- |
| `IconHome2` | Home | Opens Home |
| `IconBook2` | Lessons | Brings out the Lessons panel |
| `IconChartPpf` | Playground | Brings out the Playground panel |
| `IconNews` | In the news | Brings out the In the news panel |

- Four places, in the order a student meets them: where to start, then learn
  it, play with it, see it happen. Each is an icon with its name in its
  tooltip, as Home and Lessons are today. Help and the profile circle stay at
  the rail's foot, apart from the places to go.
- The chart Lessons has today goes to the Playground, which is where the
  charts are, and Lessons becomes a book.
- Lessons, Playground and In the news each bring out a panel beside the rail
  listing what is in them, as Lessons does today; choosing from it opens that
  thing and puts the panel away. Home has no panel: it is a page.
- No place has a page that is only its list. A list is a panel, or a part of
  Home, and a press in it opens a lesson, a model or a story, so no page in
  the app has nothing on it to do but choose.
- The Playground panel is arranged as the Lessons panel is, in the same
  strands and topics with the same dots, so a model sits under the topic its
  lessons do. The In the news panel is newest first, under each month: a
  story's date, its topic's dot and its headline.
- The rail lights the place the open page belongs to (`PAGE_SECTION`, today
  always Lessons), and the icon whose panel is out, as now.
- On a phone the burger opens the overlay at the panel of the open page's
  place, rather than always at Lessons.

### Home

- Where the app opens, at `/`. Today the app opens on the first lesson
  listed, which is why The economic problem is listed after Markets though a
  course meets it first (`lessons/index.ts`). Once Home is where the app
  opens, the Lessons panel can follow a course.
- A page that points: the three places, each with a line saying what is in
  it and a way in, and the latest stories from In the news, newest first, as a
  feed: each its date, its topic's dot and its headline, a press from the
  story itself.
- The stories are on Home because they are the one part of the app that
  changes without a lesson changing, and Home is where a student arrives.
- Its design is to come. What is settled is that every press on Home opens a
  thing, a lesson, a model or a story, or a place's panel; never a list page.

### Lessons

```
 ┌────────────────────────┐ ┬
 │ Lesson                 │ │
 │ Part 2 of 3 · …        │ │
 │ ▬▬▬▬ ▬▬▬▬▬ ▬▬▬▬        │ │ two thirds
 │ step words, key term,  │ │
 │ the question or try-it │ │
 │ Back      1 of 5  Next │ │
 ├────────────────────────┤ ┼
 │ What changed     Undo  │ │ one third
 │ ○ Demand … increases   │ │
 └────────────────────────┘ ┴
```

- The study screen as it is, less Explore, Scenarios and Maths. The lesson
  card has the column's top two thirds to itself, with a card head of its own
  where the tab row was. "What changed" keeps the bottom third, since the
  lesson's try-its and questions move curves.
- Nothing on the lesson page leads out of the lesson but the rail. A student
  who wants the market to themselves finishes the lesson or takes the rail;
  neither is on the card beside a question.
- Finish, at the last step, opens the playground at the lesson's model and at
  the market the lesson ended on. It is pushed, as a change of lesson is, so
  Back returns to the recap. The recap's line says where Finish goes:
  "Finish, and this market is yours in the Playground."
- "Why? See the maths" is not offered, as today: it is offered only with the
  lesson put away. The maths is the playground's.
- Reset is the step's market, as now. What it does under an instrument moves
  to the playground.
- On a phone, as now: the lesson under the stage and the chain in the strip,
  less the instruments' door in the capsule and the bottom sheet behind it.
- Share as now: the link opens the lesson at its start.

### The Playground

```
 ┌────────────────────────┐ ┬
 │ Explore Scenarios Maths│ │
 │ Demand for A$       50 │ │
 │ who it is              │ │ two thirds
 │ ━━━━━━━○━━━━━━━━━━━━━━ │ │
 │ Try this               │ │
 │ ○ …                    │ │
 ├────────────────────────┤ ┼
 │ What changed     Undo  │ │ one third
 │ ○ ·  ●  …              │ │
 └────────────────────────┘ ┴
```

- One model to a page. The title line is the model's topic over its name, with
  the same tools: the arrangement, Reset, Present and Share.
- The stage draws all of the model's panels from the start. A lesson brings
  them in step by step; a student who has come to play has nothing to be
  brought to.
- The column is today's with the lesson put away: one card of three tabs,
  Explore, Scenarios and Maths, with Explore open first, and "What changed"
  under it, at the same heights and scrolling the same way.
- "Why? See the maths" opens the Maths tab at the calc, as it does today with
  the lesson put away.
- Reset puts back the market the page opened with: the model's own, or the
  one a link, a lesson's Finish or a story handed it.
- Share's link is this view, params and all, where a lesson's is its start. A
  lesson has a start worth more than any view of it; a market has none, and a
  teacher who set one up to show a class wants that one.
- On a phone there is no lesson to hold the place under the stage, so the
  instruments take it, at the height the lesson has, tabs and all, and the
  bottom sheet goes. The chain stays in the strip.

### In the news

- A story is something that happened, Australian first: the RBA moves the
  cash rate, the iron ore price falls, a drought cuts a harvest. It is told
  against one model: what happened, which curve that moves and which way, and
  why.
- Its page is built from pieces the kit already has. The title line is the
  story's topic and date over its headline. The stage is the model, with the
  story at the front as a report panel (`AsidePanel`), drawn as a lesson's
  aside is. The column's top card holds the reasoning as an action row: who,
  which curve, which way; pressing it makes the move, as a scenario does, so
  "What changed" tells the chain. Under it, "Open in the Playground" opens the
  market the move made.
- A story is real, so it is dated and sourced: its date first, its outlet
  named and linked. The headline and sentence are written for the app in
  plain words, never the article's own text.
- The real numbers are in the story's words only. The diagram's numbers are
  the model's, and the report's note says so: the diagram shows which way
  something moved, not how far.
- A story is true of its day and stays so. It never expires, and a link to it
  keeps opening, with its date; it leaves Home's feed as newer stories
  arrive.
- A lesson's reports stay made up ([Writing for the screen](#writing-for-the-screen)).
  A story is the one place the app reports a real event, because it carries
  its date and a lesson does not.

### Addresses

```
 /                                       Home
 /lessons/fx?step=7&arrange=grid         a lesson, at a view
 /playground/aud?tab=maths&supply=56     a model, at a view
 /news/2026-11-rba-cash-rate             a story
```

- Each place is a path, so a teacher can read what a link opens before
  sending it; after the `?` the view is written as now.
- Opening another page, lesson, model or story is pushed; anything else
  replaces, as now, so Back goes to the last thing opened, not the last drag.
- Old addresses open what they opened, because links handed out last term
  should still open. `?lesson=fx&step=7` is that lesson at that step;
  `?lesson=fx&tab=scenarios&supply=56` is the playground at the lesson's
  model, at that tab and market.
- `step` belongs to a lesson and `tab` to the playground. `lesson` leaves the
  query for the path, but stays reserved, since old links carry it.
- Netlify serves `index.html` for every path (a `/* /index.html 200`
  rewrite), which today's single address does not need.

### What each supplies

- **A model:** its id and name, `diagram`, `panels`, `narratedCalcs`,
  `explainedCalcs`, `paramMeanings`, `paramWords`, `directionWords`,
  `questionApparatus`, `explorePrompts` and `scenarios`, each written as
  [What a lesson supplies](#what-a-lesson-supplies) says now.
- **A lesson:** its id, label and title, `cover`, `goals`, `pictures`,
  `asides`, its steps, and the model it is drawn on.
- **A story:**

| Field | Read by | Write it as |
| --- | --- | --- |
| `date` | The title line, the In the news panel, Home | The day it happened, not the day it was written up. |
| `headline` | The title line, the report panel, the In the news panel, Home | Plain words, present tense, sentence case: "The RBA raises the cash rate". |
| `body` | The report panel | One sentence of what happened, with its real numbers. |
| `source` | The report panel | The outlet's name and a link to the article. |
| `model` | The stage | The model the story is told against. |
| `move` | The action row | The params it moves and which way, as a scenario's set. |
| `reasoning` | The action row | Who, which curve, which way, as `scenarios[].description` is written. |

### What changes when it is built

Each of these sections is rewritten as the page it describes is built:

- [The title line](#the-title-line): the phone's capsule loses the
  instruments' door; the playground's title is a model's, and a story's
  carries its date.
- [Share](#share): what the link opens, per page.
- [Links](#links): the paths above, the redirects from old addresses, and the
  reserved names.
- [The side column](#the-side-column): no tab row beside a lesson; three tabs
  in the playground; the phone's bottom sheet goes.
- [Reset](#reset): its sentence about an instrument moves to the playground.
- [What a lesson supplies](#what-a-lesson-supplies): split three ways, as
  above.
- [Embeds](#embeds): the diagram-only embed is the playground's stage, and its
  link opens the Playground.
- The rail, `DoubleNavbar.tsx`: its places and panels, as above.

### Still open

- Where the playground points back to the lessons on its model. None of the
  column's cards answers "where can I learn this?", so by principle 1 it is a
  card of its own or nothing.
- Whether a story asks a question, as a lesson's step does, or only shows.
- Home's design.
- Who writes the stories, how often, and how many Home shows.

## Reserved for later

Places kept for tools that are not built yet, so that the first one built
lands where the rest expect it and none of them has to move another. Nothing
in this section is on the screen today but the profile circle at the rail's
foot, which the tools to come there are placed around. Reset, Present, Share
and Links were kept here once, and are built.

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
- Embed… in [Share](#share) opens a dialog: the whole lesson or the diagram
  only, where it opens, and the code to copy.
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

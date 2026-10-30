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
   saying?*; the instruments, *what can I change?*; "What changed", at the
   foot of either, *what did that do?*; each panel's sheet, *what does this market look like now?* A new
   piece of information goes on the card whose question it answers. If it
   answers none of them, it is a new card — or it is not needed. Before the
   first step the stage answers *what is this lesson about?*, on a cover over
   the diagram, and at the end *how did I go?*, on a recap (P15); the words of
   a step are never on the stage, which shows what the diagram would have.

2. **Cause above effect, everywhere.** The side column reads top to bottom in
   the order a student works: where they are, what they can move, what moving
   it did. The chain inside "What changed" reads the same way: what moved, what
   that did to the curves, why that led where it did, what followed. Spatial
   order is causal order, so the layout teaches the reasoning before a word is
   read.

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
   place when it has nothing to say: "What changed" is the foot of the
   column's card from the first page, as tall at rest as after a move, and
   until the lesson has drawn something that could change, it says what it
   is waiting for.

5. **Nothing moves under the pointer.** The side column's width is set by the
   window alone (and by Present, which changes the window too), so nothing in
   it can resize the diagram. Its card is the column's height and "What
   changed" at its foot one height of its own, whatever either says, so
   nothing in one can move the other: a slider never slides out from under
   the student who is holding it. Content that cannot fit scrolls inside its
   place, never the page; what the foot cannot say is a press away, on a
   sheet the student asked for.

6. **Colour means one thing.** A colour that always means the same thing can be
   read without reading. Numbers never get a verdict colour: a falling price is
   good news for someone, so arrows and amounts carry the direction, in grey.

   | Colour | Means | Where |
   | --- | --- | --- |
   | Blue (primary) | You can act here; where you are | buttons, links, the current step, Present while presenting |
   | Light blue | A word to learn | key-term callouts |
   | Yellow | A question waiting for you | the question callout, its progress marker, the cover's bars for a question |
   | Teal | The reasoning | "Why" after a question, and in the whole chain of "What changed"; a right answer, in a verdict and in the recap; the recap's takeaway |
   | Grey | Numbers, and things to try | chips, the chain's arrows, try-it callouts; an answer the student was shown, in the recap |
   | The curves' colours | The market itself | the diagram, the slider that moves each curve, and the chain's markers for what moved and the curves it moved |
   | A topic's colour | Which topic, only ever as a dot: before its name, or before a story's headline | the Lessons and Playground panels, and over the page's title; before each headline in the In the news panel and Home's feed, with the topic's name there for a screen reader. Beside words, so a teal topic is never read as the reasoning |

7. **Calm by default, depth on demand.** Each card shows the headline and puts
   the depth one press away: "What changed" says what moved and what followed
   first, and "See why" opens the rest of the chain and the reason under it;
   "Why? See the maths" opens the formula behind the first effect; a scenario carries its reasoning in one line; "Try this" offers
   questions and marks nothing. A curve that reaches the end of its range just
   stops there: the slider already shows the number, so nothing is said.

## The title line

```
 ● International economics                              ╭─────────────────╮
 The Australian dollar, and what moves it               │ ◉  ↺  ┊  ▭  ⇪   │
                                                        ╰─────────────────╯
 ● International economics · 29 September 2026          ╭─────────────────╮
 The RBA raises the cash rate to 4.60%                  │ ◉  ↺  ┊  ▭  ⇪   │
                                                        ╰─────────────────╯
```

- The page's title under its topic, and at its end the tools that act on
  the whole stage: the arrangement and Reset,
  a hairline, then Present (`TitleLine`) and Share at the far end, because
  it is the page's rather than the stage's. The hairline parts what a sheet
  over the stage disables from what still works under one.
- The title is on the page, not on paper. Every sheet on the screen answers
  a student's question; the title names the page they are all on, so it
  sits on the desk above them, the one thing there. The tools are in a
  capsule of paper, because they are things to press, and so they read as
  one set rather than loose glyphs on the desk, a greyed one included.
- A lesson's title is its own, under the topic the Lessons panel lists it
  in. In the playground the title is the model's name, under the topic of
  the first lesson drawn on it, which is where the Playground panel lists it.
  A story's title is its headline, under its model's topic and then the day
  it happened, after a middle dot on the same small line: a story is true of
  its day, so the day is said before anything else about it.
- The topic is small and grey over the title, after the dot the panels
  draw before the topic's name, in the topic's colour, so the two read as
  one place. A page no topic lists has its title alone, and so does Home,
  which has no tools either: it has no stage for them to act on.
- No sentence under the title. It used to say how to read the price axis,
  which the axis's own title says, and to follow the lesson or drag a curve,
  which the cover and the lesson card say. It cost the stage a line.
- Not over the stage, where a tool lands on a panel's caption, and not in
  the side column, whose card and its foot each answer a question that none
  of these answers.
- The topic and the title are one block beside the stage, whatever the
  window, so the stage's height never depends on them; the capsule is
  centred on the two. Every tool is an icon, so the tools are as wide
  whatever the lesson, and where the title is too long for what they leave
  it is cut with an ellipsis rather than wrapped. The A$ lesson's title is
  whole from about 945px.
- Presenting, the topic and title are drawn as large as the side column
  (`--present-zoom`, 1.5; see [Present](#present)), and the tools stay as
  they are. At that size a cut title would lose its last words on a
  1280-wide projector, so it wraps instead, onto two lines of about the same
  length (`text-wrap: balance`). That makes the stage a line shorter on that
  page, the one place its height depends on the title: a title is the same at
  every step, so nothing moves under a pointer for it.
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
  has. Present and the QR code are not offered there. The `⋯` is in the
  capsule beside the arrangement, as tall as it and as close, which keeps
  the first lesson's title to two lines. The instruments are under the
  stage there (see [The side column](#the-side-column)), so they need no
  door in the capsule.

### Reset

- Puts the diagram back where the step began, or where the playground
  opened. In a lesson that is the step's own market: the diagram's, with
  every step's `set` up to here over it, so a curve no step sets goes back
  where the diagram drew it. A question's curves go back where the question
  found them, which is where it is marked from. In the playground it is the
  market the page opened with: the model's own, or the one a link, a
  lesson's Finish or a story handed it. On a story's page it is the market
  the page opened with too, so a story's move is undone by Reset as by Undo.
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
- The words a class reads from across the room are drawn 1.5 times as large
  (`--present-zoom` in `index.css`, a CSS `zoom` under `:fullscreen`). The
  chart's text was made large enough for a projector, and the column's 15px
  body and 12px heads were not. 1.3 was tried first and was still too small.
  - **The side column**, width and all. Everything in it grows together, so
    a line holds the words it did and the card is the one students know. At
    1280×800 the column is 480px and the stage keeps about 750px; a long step
    scrolls after about eight lines. See [The side column](#the-side-column).
  - **The topic and title** above the stage, but not the tools beside them.
    A long title wraps; see [The title line](#the-title-line).
  - **A report's words** (`AsidePanel`), when it is at the front of Focus,
    the panel's `full` level. Its picture, its sheet and its caption stay the
    stage's, as every chart's do. In Grid a report is `compact`, and its words
    at this size would lose the note under them, so there it stays as it is.
- Nothing else changes: the stage notices its new size and arranges itself,
  as it does when the window changes, and the lesson, what is in the side
  column and whatever the student had done stay as they were.
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
- In a lesson the link and the QR code open the lesson at its start:
  `lessons/fx`. What a class or a friend needs is the lesson, and a choice
  between this view and the start, above the items, was one more thing to
  read before any of them. Anyone who wants this view has it in the address
  bar, which always holds [the link](#links) to it.
- In the playground they are this view, params and all:
  `playground/aud?tab=scenarios&supply=56`. A lesson has a start worth more
  than any view of it; a market has none, and a teacher who set one up to
  show a class wants that one.
- On a story's page they open the story, as a lesson's open the lesson:
  `news/2026-09-rba-cash-rate`, the report at the front and the move not
  yet made, whatever the view. What happened is worth more than any view of
  it, and the move is the student's to make. The QR code's sheet says
  "Opens the story".
- The download and the print are always this view, and the printed page's
  code goes back to it.
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
  paper's 680px; and the whole chain from "What changed", as its sheet says
  it, since paper has no "See all" to press (`NarrationPrinted`), left off at
  rest. No rail, tools or tabs. The browser's dialog saves it as a PDF, and printing
  from the browser's own menu gives the same page.
- Download and Print are of the diagram, so they are greyed under the
  lesson's own sheets — the cover, a picture, the recap — where there is
  no diagram to give.
- On a phone the `⋯` holds Reset, Copy link, the phone's own share sheet
  ("Send with…") where it has one, Download and Print. A phone's link is
  the one a laptop would give on the same page.
- Embed… joins the menu with [Embeds](#embeds), after Show a QR code. Where
  an embed opens is asked in its own dialog, since a class page is where a
  particular view is worth fixing.

## Links

```
 lessons/fx?step=7&arrange=grid&focus=mirror&supply=56
 playground/aud?tab=maths&supply=56
 news/2026-09-rba-cash-rate?demand=60
```

- A link is a page and a view of it (`links.ts`). The page is the path: a
  lesson, `lessons/<id>`; a model in the playground, `playground/<id>`; or a
  story, `news/<id>`, its id the year and month it happened and a few words
  for what. So a teacher can read what a link opens before sending it. The
  view is after the `?`: the lesson's step or the playground's open tab,
  each param the student can move that is not where the page puts it, the
  arrangement and the panel at the front. "The start of the lesson" is just
  `lessons/fx`, a model at its own market with Explore open is just
  `playground/aud`, and a story with its report at the front and its move
  not made is just `news/2026-09-rba-cash-rate`.
- Readable query parameters, named after the params: `step` or `tab`, then
  `arrange=grid` and `focus` where they are not the page's own, then the
  params. `step` belongs to a lesson and `tab` to the playground, and every
  page ignores the other's; a story has neither. Where a lesson puts a param
  is the step's market, as Reset has it; where the playground or a story
  puts one is the model's own, so a story's move is in its address once it
  is made.
- Addresses are written from the app's root, so the app can be served
  anywhere. Netlify serves `index.html` for every path (a `/* /index.html
  200` rewrite in `netlify.toml`), and the root itself is [Home](#home),
  which has no view to write.
- The address follows the view. Opening another page — from the rail, from
  Home, by Finish or by a story's "Open in the Playground" — is pushed, as
  its path alone or as Finish writes it; anything else replaces, so Back
  goes to the last page rather than the last drag, and the address bar is
  always the link to this view. Each history entry is left at the view its
  page was left at, so Back opens that page there.
- Written when the view settles, the boundary the narration keeps: a drag is
  written once, when it is let go. A held arrow key commits on every repeat,
  so writes are at least 350ms apart, the newest replacing one that waits,
  because a browser stops taking them past a rate.
- Opening at a link is a restore, in the order every restore uses: the
  market back, then the engine's snapshot. Nothing is drawn or said for a
  move nobody made: no ghost, no change chip, "What changed" at rest. Reset
  puts back the step's market, or in the playground the one the link
  opened with.
- **A link never carries an answer.** A question a link opens at is
  unanswered, whoever sent it, and its curves are where the step puts them,
  which is where it is marked from, so the student's answer is never
  written. A link to a step past a question opens at the first unanswered
  one, as the lesson puts it, without the link's params: they were the
  market after the answer, and could be it.
- Back is not a link. A lesson's history entry remembers which questions
  were answered, and how, in the browser's own state for that entry, which
  never leaves the tab: Back to a lesson opens it where it was left, past
  the questions already answered, so Back from the playground after Finish
  is the lesson's end and not its first question asked again.
- A link that names a param the page no longer has opens without it, and
  so does one whose value is not a number or whose param is not the
  student's to move; a step past the end is the end, and a lesson or model
  that has gone opens the first lesson, or the first model, at its start.
  Lessons change, and links handed out last term should still open. A story
  is never taken away, and an id that names none opens Home rather than
  another story, which would be another day's news; so does a path the app
  does not have. The address then says what did.
- Addresses from before the pages open what they opened, and the address
  then says where that is now: `?lesson=fx&step=7` is that lesson at that
  step, and `?lesson=fx&tab=scenarios&supply=56` is the playground at the
  lesson's model, at that tab and market.
- A phone writes what a laptop does, so one link opens on either.
- No model may give a param one of the address's own names: `lesson`,
  `step`, `tab`, `arrange`, `focus`. `lesson` is in the path now, and stays
  reserved, since old links carry it. A test checks.

## The side column

Beside the stage, the screen's full height, one card with "What changed" at its
foot. It is 320px
wide on a laptop and grows with the window to 456px (`clamp(320px, 24vw,
456px)`): at 320 a line of the lesson is about 42 characters, short of
comfortable reading, and on a 16:9 screen the focal panel is held by the
stage's height, so the width the column takes there was slack beside it.
Grid, whose panels sit side by side and are held by the stage's width, pays
about half of what the column takes, per panel, which is why the column stops
at 456; so does Focus on a 16:10 screen, where the focal panel and the rail
beside it are held by the width:

| Window | Column | Focus, focal panel | Grid, each panel |
| --- | --- | --- | --- |
| 1366×768 | 320 → 328 | 546, as it was | 372 → 368 |
| 1440×900 | 320 → 346 | 662 → 642 | 408 → 395 |
| 1512×982 | 320 → 363 | 717 → 684 | 443 → 422 |
| 1728×1117 | 346 → 415 | 862 → 809 | 506 → 473 |
| 1920×1080 | 380 → 456 | 849, as it was | 582 → 546 |

It grows from 1333px and not before. At 1366×768, the commonest school
laptop, the stage is 926px wide, and under 900 (`FILMSTRIP_BELOW_PX`) the rail
goes under the focal panel and the focal panel goes from 546px to 381px. A
flat 352px there did that; 24vw is 328 and leaves the stage 918. Presenting,
it is all 1.5 times as large and keeps the rule it had, from 480px to 570px
(see [Present](#present)): zoom multiplies a `vw` too, and 24vw at 1.5 times
put the rail under the focal panel on a 1470×956 MacBook Air.

```
 A lesson                            The playground

 ┌────────────────────────┐          ┌────────────────────────┐ ┬
 │ Lesson                 │          │ Explore Scenarios Maths│ │ where you are,
 │ Part 2 of 3 · …        │          │ Demand for AUD      50 │ │ what you can do
 │ ▬▬▬▬ ▬▬▬▬▬ ▬▬▬▬        │          │ who it is              │ │
 │ Demand for AUD …       │          │ ━━━━━━━○━━━━━━━━━━━━━━ │ │ the rest of
 │ step words, key term,  │          │ Try this               │ │ the column
 │ the question or try-it │          │ ○ …                    │ │
 │                        │          │                        │ │
 ├────────────────────────┤          ├────────────────────────┤ ┼
 │ What changed     Undo  │          │ What changed     Undo  │ │ what it did
 │ ○ Demand … increases   │          │ ○ Demand … increases   │ │
 │ ● The AUD appreciates  │          │ ● The AUD appreciates  │ │ 142px
 │      0.65 → 0.70       │          │      0.65 → 0.70       │ │
 │ See all 5 changes ⌃    │          │ See all 6 changes ⌃    │ │
 ├────────────────────────┤          └────────────────────────┘ ┴
 │ Back      1 of 5  Next │
 └────────────────────────┘
```

- Beside a lesson the card is the lesson's, with a card head of its own,
  "Lesson", as "What changed" has. Nothing on it leads out of the lesson but
  Finish, at the last step, which opens the playground (see
  [Lessons](#lessons)); the rail is the other way out.
- In the playground the card holds the instruments under one row of
  tabs, Explore, Scenarios and Maths, Explore open first, one open at a time
  and only the open one mounted.
- Beside a story the card is the story's, "What it moves" (`StoryCard`):
  the move as an action row, its reasoning under it, and "Open in the
  Playground" under that. See [In the news](#in-the-news).
- The card is the column's height, and "What changed" is its foot,
  `NarrationFoot`: under the step's words and controls, or the open
  instrument, and over Back and Next where a lesson has them, so the eye
  passes it on the way on. The foot is one height whatever it says — about
  142px, four lines of the chain under its head — at rest, mid-drag and
  after a move. A long step scrolls between the lesson's head and the foot,
  which hold still with Back and Next; an instrument scrolls inside its
  tab. At 1440×900 a step has 585px, where it had about 420 while "What
  changed" was a card of its own. Four calcs of maths fit their tab at
  1440×900.
- The foot says the chain's two ends: what moved, in words, and the effect
  the lesson ranks first, with its numbers. The cause's numbers are the
  slider's own, and the curve a student dragged has no number they set; on
  the sheet they are said. Mid-drag the two are readings, the label and the
  number now, as the strip's are. A refusal (P12) takes the ends' place on
  the foot, since it is the newer news, and is said above the chain on the
  sheet.
- The chain says only what the stage draws. The engine leaves out a curve it
  is not drawing, and the screen leaves out a panel's headline number until
  the lesson has brought that panel in (`leaveOut`): in the A$ lesson's first
  part a move has no "The USD depreciates", since there is no USD market on
  the screen to see it in. The foot, the strip, the printed page and the
  sentence a screen reader hears all say the same chain.
- "See all 6 changes" counts every clause the chain has, and opens it on a
  sheet that rises from the foot over the card's body, up to the card's
  head — the lesson's place, or the tabs — and no further, so the lesson's
  way on and the other tabs are always there. It rises as one sheet: at
  first it is the foot, head and all, in the foot's place, and it slides up
  over the body with its head on its top edge, quick to start and slowing
  as it lands (`--sheet-rise`, 340ms). Put away, it goes back down into
  the foot the same way, out of reach as it goes, with the body back as it
  starts down, and fades into the foot as it lands, so the sheet's rows give
  way to the foot's. With reduced motion it comes and goes at once.
  "Show less" is on the sheet's last line, where "See all" was, so a
  second press in the same place puts it back, and focus follows the press
  to it. Esc puts it back too, and so
  does moving on, to another step or another tab, since what the student
  moved to is on the card under it. Nothing else does: a student who opened
  it is reading what the next move does, so through a drag on the diagram
  it says each thing the foot would — what it is waiting for as the drag
  starts, the readings as it goes, the whole chain when it lands — and after
  Undo it says what it is waiting for. Under the sheet the body is hidden as
  well as covered (`.stack` in `ui/paper.module.css`), so neither the
  keyboard nor a screen reader reaches words nobody can see. "Why? See the
  maths" is on the sheet, under the chain. With a reason the press is "See
  why, and all 6 changes", or "See why" where the ends are every change
  there is; without one, where the ends are the whole chain, it is "See the
  numbers"; where it would show nothing more it is not offered.
- The sheet is the chain set as the card's words are: at their reading size,
  15px, with each clause's words whole on a line and its numbers under them,
  a size down, at the words' left edge. Beside its numbers in the column's
  320px one clause in two broke over two lines, some after their first word,
  with the numbers at the right edge, away from their words. The chain's two
  ends, what moved and the effect ranked first, are its boldest words; the
  effects after the first are in plain type, so the eye finds the ends
  first. The foot keeps its one-line rows, where a clause is cut rather than
  wrapped.
- Between the curves and what followed, the sheet says why the one led to
  the other, in the lesson's words (`paramWords.because`): "At the old price,
  buyers now want more than sellers offer, so some buyers miss out and the
  price is pushed up until the two match again." It is a reason, not an
  event, so it has no marker and the rail runs past it; it is in the `why`
  callout, named "Why", as a question's reasoning is. Only where one param
  moved and something followed: two causes can push the price opposite ways.
  The foot has no room for it, so the press names it — "See why, and all 6
  changes" — since it is the one thing on the sheet that is not more of what
  the foot shows. The printed page and the screen reader's sentence say it
  too. See [Why the chain says why](#why-the-chain-says-why).
- After a move made all at once — a step's, a scenario's, Reset, a story's
  move — what moved is there at once and what followed comes after it in
  turn: the curves at 160ms, the reason at 260ms, the effects at 360ms. The order the chain is
  read in is said a second time by when. After a drag it is all there when
  the student lets go, since the chain has already unfolded under their
  hand; with reduced motion it is always all there at once.
- The tabs are each as wide as their name, sharing out what is left, and the
  open one is no bolder than the rest, so opening one moves no other.
- The tabs float over the top of the open instrument, which scrolls up under
  them rather than being cut off at their edge. What passes under is frosted:
  blurred 6px and washed with the card's paper at half strength, fading out
  over 12px under the track, and the track is a tint, so the frost shows
  through it. Light enough that a line going under is still seen as a line:
  at 10px and 70% the 13px text vanished and the bar read as a white band.
  "What changed"'s sheet stops under the tabs and is drawn over the frost.
- On a phone there is no column: the lesson, a story's card, or in the
  playground the instruments, tabs and all, go under the stage at one fixed
  height, with no foot, and the
  chain into the one-line strip under the stage (`NarrationStrip`) — the same
  narration, at the density a phone has room for. The two never appear
  together and announce the same sentence. Nothing is in a bottom sheet: a
  sheet over the diagram hid what moving a slider did.

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

### Why the chain says why

The chain showed *that*: demand increases, demand shifts up, the price rises.
It never said *why* the price rose, and that is the step a student most often
leaves out of the chain they are asked to write: that at the old price
buyers now want more than sellers offer, and that this is what pushes the
price up until the two match. No number on the screen says it, and the ghost
curve and the arrow on the diagram show where the market went, not what
drove it there.

A page that describes the market as it stands, a few sentences rewritten as
the student drags, was weighed and left. It describes a state, "when the
price is above P*, quantity supplied exceeds quantity demanded", and these
markets always land back at equilibrium, so after every move it would say
the one sentence it said before. What changes from move to move is the
reason, and it depends on which curve moved and which way, not on how far.
So it is one sentence for each param each way, written by the lesson in its
own words, said where it belongs in the chain, and only where it is true of
every move that way. A param for which no one sentence is, such as the café's
specialisation, has none.

### Why the chain became a foot

"What changed" was a card of its own, the column's bottom third, and that was
the wrong shape for what it says. Most of the time in a lesson it has nothing
to say, and it held a third of the column to say "drag a curve"; when something
did move, six lines landed at once in the corner, away from the diagram where
the student was looking, in a third too short to read them with any room. A
place, for something that is an event.

So it became the foot of the one card: the chain's two ends, which are the
chain a new learner needs, in a few lines that never change height, on the way
from the step's words to Next; and the whole chain one press away, with more
room than the third ever had. It gave the step back about 160px at 1440×900 and
the gap and padding of a second card. A collapsed line alone was weighed and
left: the chain is what the screen exists to teach, and a student who has to
press to see any of it mostly will not.

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
| Title line | `TitleLine.tsx` | The lesson's topic over its title, and the stage's tools in a capsule of paper beside them; the title never wraps but when presenting: the tools are borderless round icons, named in their tooltips, and the title is cut where it meets them. The arrangement is one icon that switches Focus and Grid. On a phone the tools but the arrangement are in a `⋯`, and Present is not offered. |
| QR code | `QrCode.tsx` | A link as a QR code, one SVG path that scales sharp to any size, black on white whatever the theme because that is what a camera reads. Share's sheet and the printed page use it. |
| Paper | `ui/paper.module.css` `.paper` | The one surface: white, hairline edge, 12px corner, a shadow only just there. Every card and every panel sheet composes it, and so does the title line's capsule, with its own corner. Corner and shadow are tokens in `index.css` (`--paper-radius`, `--paper-shadow`). |
| Stack | `ui/paper.module.css` `.stack` | A card's body and "What changed" under it, between the card's head and its way on: the room the foot's sheet rises into. While the sheet is up the body is hidden as well as covered, once the sheet has risen over it, and is a layer under the sheet, so nothing on it is drawn over the sheet as it rises; the stack is cut at its edge, since the sheet comes up from below it and goes back down there. |
| Card head | `ui/paper.module.css` `.head`, `.eyebrow` | What the card is, small and grey at the left ("Lesson" beside the stage, "What changed"); the card's one action at the right ("What changed"'s Undo). |
| Callout | `ui/callout.module.css` | A tinted box inside a card, toned by kind: `term`, `ask`, `try`, `why`, with `.label` for its name. The only place these colours are defined. |
| Param control | `ParamControl.tsx` | Name and value on a line, who it is under them, the slider across the card. Explore, a lesson's try-it and its question use it; the question's stops moving once it is answered, and Enter answers. Drawn in its curve's colour where the lesson names one, the theme's blue where it does not. The gesture wiring is `ParamSlider`'s. |
| The chain | `NarrationFoot.tsx` | "What changed", at the foot of the column's card: the chain's two ends at one height whatever they say, and the whole chain on a sheet that rises over the card ("See all"), at the card's reading size. Cause, curves, the reason in a `why` callout, effects down a rail, each in the lesson's words with its numbers was → now; the first two marked in their curves' colour, read from the engine; what followed comes in turn after a move made at once. `NarrationPrinted` is the whole chain on paper. Rendered from `narrate()`; decides nothing. |
| Action row | `dock/Scenarios.tsx` `ActionRow` | Something to press that needs its reason beside it: the name, the reasoning under it, an arrow — all one button. A row that opens a page is a real link; a row that is a place has the rail's icon before its name. Scenarios, a story's move and Home's places use it. |
| Prompt list | `dock/Explore.tsx` | Suggestions under a "Try this" eyebrow, with hollow markers: things to do, not tasks to tick. |
| Stage sheet | `StageSheet.tsx` | A sheet over the whole stage, for a moment with no diagram to show: paper, inset by the stage's own margin (`STAGE_PAD`), with the card head and a body that scrolls. The stage stays mounted under it, inert and at its size. |
| Picture sheet | `PictureSheet.tsx` | A step's picture on a stage sheet, as large as the sheet allows and never cropped, with Pause/Play in the head when it moves. Pausing shows its still; reduced motion starts there. |
| Report panel | `AsidePanel.tsx` | A report beside the diagram, as a panel of the stage's own (`hostPanels`): captioned by its name, read at the front with its picture and note, words first as a glyph. Where its glyph is too short for the words, its caption says the headline. A story's names its source, linked where it is read. |
| Story card | `StoryCard.tsx` | A story's card beside the stage: "What it moves", its move as an action row, greyed once made, and "Open in the Playground" under it, with "What changed" at its foot. |
| Home | `Home.tsx` | The page the app opens on: its title on the desk, then "Where to go", the three places as action rows, and "Latest in the news", the newest stories as a feed. |
| Recap | `LessonRecap.tsx` | The lesson's questions looked back over: a card each with its title, its cause marked in its curve's colour, its explanation and how it went; then the takeaway in the `why` callout. Presentational — the screen builds the cases. |
| Track bars | `ui/track.module.css` `.bar` | A step drawn as a bar, yellow when it asks a question. The cover's parts use it; the lesson card's markers restate it, because a `::before` cannot compose. |

Compose rather than copy: `composes: paper from './ui/paper.module.css';` at the
top of a card's class, then only what is particular to that card.

## What a lesson supplies

The components hold no economics. Everything a student reads comes from the
lesson's `StudyContent` and the `StudyModel` it is drawn on, or in the
playground the model alone (`lessons/content.ts`), so a teacher's edit is a
data change. `paramWords`,
`narratedCalcs`, `explorePrompts` and `scenarios` are the model's; the rest
are the lesson's own:

| Field | Read by | Write it as |
| --- | --- | --- |
| `paramWords.about` | Explore, under each control | Who is behind the curve, one short sentence. Not the unit. |
| `paramWords.rise` / `fall` | The chain's cause | A whole clause, present tense, sentence case: "Supply of AUD increases". |
| `paramWords.because` | The whole chain, between the curves and what followed | Why the move led to what followed, one sentence each way, true however far the param moves: "At the old price, buyers now want more than sellers offer, so some buyers miss out and the price is pushed up until the two match again." Not the move again, and not the numbers. Left out where no one sentence is true of every move. |
| `paramWords.curve` | The chain's markers, and the param's slider | The colour its curve is drawn in, as the diagram names it: `demand` for `color: 'colors.demand'`. Where the param moves curves in two panels, the colour of the first panel's: demand for AUD is blue, though in the USD market it moves the orange supply of USD. |
| `narratedCalcs[].rise` / `fall` | The chain's effects | The step title that teaches it: "The AUD appreciates", "Sellers earn more". Mind reciprocals — a dearer USD 1 is a USD that has *appreciated*. |
| `explorePrompts` | "Try this" | Two or three open questions, each answerable with the controls on screen. |
| `scenarios[].description` | Scenarios | The reasoning: who needs AUD or sells them, so which curve, which way. |
| step `term` | The lesson card | A word, and what it means, the first time it is used. |
| `cover` | The stage, before the first step | A question the lesson answers, one line ending "?", and a hook of one short paragraph. Not the lesson's title over again. |
| step `picture` | The stage, at that step | A key in `pictures`. The step's words stay on the card and say what the picture is for; the step draws nothing on the diagram under it. |
| step `recap.takeaway` | The recap, under the cases | The rule every question was an instance of, in one paragraph. Said here and not on the card as well. |
| `asides`, step `aside` | A panel beside the diagram, at that step | The event a question turns on, as a report: a name for its caption ("News report"), a headline, one sentence, and a note that says it is made up. It is part of the question's prompt, so it names no curve the question offers — and the card does not tell the story again. A real event is a story, below, and never an aside. |
| `pictures` | The cover, and steps that show one | An imported image file, its name in a few words, and alt text that says what it shows. Anything that moves has a `still`. |
| step `focus` | The stage, when the lesson passes that step going forward | The key of a panel that arrives to take over the lesson, such as the market after a chart of one buyer. Panels arrive in declared order, on the rail; this puts one at the front instead. Once, at the step that reveals it or later. |

Every field is optional. Without words a clause is shown by its label, as the
first version of the screen did, so a lesson can gain them one at a time.

A story (`news/stories.ts`, a `Story`) has fields of its own, all of them
required, since a story without its date, its source or its move is not one.
Its words are the app's: the source is where a student goes for the
article's.

| Field | Read by | Write it as |
| --- | --- | --- |
| `id` | Its address, `news/<id>` | The year and month it happened, then a few words for what: `2026-09-rba-cash-rate`. |
| `date` | The title line, the In the news panel, Home | The day it happened, not the day it was written up, as digits: `2026-09-29`. |
| `headline` | The title line, the report panel, the In the news panel, Home | Plain words, present tense, sentence case, no full stop: "The RBA raises the cash rate to 4.60%". |
| `body` | The report panel | One sentence of what happened, with its real numbers. |
| `source` | The report panel | The outlet's name as a student would know it, and a link to the article or the statement it was checked against. |
| `model` | The stage | The model the story is told against. |
| `move` | The action row | Where it leaves each param it moves, from the model's own market, as a scenario's set: which way is the point, and how far is the model's, so a move goes as far as the model's scenarios do. |
| `reasoning` | The action row | Who, which curve, which way, as `scenarios[].description` is written, ending on the curve and the way: "…: demand for AUD rises." |

The note under every story's report is the app's, not the story's: "The
diagram shows which way this moves the market, not how far" (`STORY_NOTE`).

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
- A story is real, and checked against its source before it is written: the
  event, its date and its numbers. One that cannot be checked is left out.
  Its numbers are in its words only; the diagram's are the model's.

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

The app grows from one page, a lesson with its instruments beside it, to
three places a student can go, **Lessons**, the **Playground** and **In the
news**, and a Home that points at them. It was written down before any of it
was built, so the first one built lands where the others expect it.

**Built:** models and all four places — the Lessons page, the Playground,
In the news and Home — with their addresses and their places on the rail,
and the sections above describe them. **Still to come:** what [Embeds](#embeds)
becomes now the lesson and the playground are parted, and the questions
under [Still open](#still-open).

### Why the lesson and the instruments part

- The tab row drew Lesson, Explore, Scenarios and Maths as four of a kind,
  and they were not. A lesson has a place, a cover, questions, answers and a
  recap; the instruments are tools that keep none of that. The screen already
  knew it: the lesson was one pane and the instruments another, with a choice
  of instrument inside it.
- Much of what was hardest on the screen existed to join the two: putting the
  lesson away and bringing it back where it was left, its market, ghost and
  question with it; Reset meaning one thing under the lesson and another under
  an instrument; a link that carried a step or a tab. Parting them took all
  of that out.
- For a student halfway through a question, three tabs beside the lesson were
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
- Built: a lesson names its model (`StudyContent.model`, a `StudyModel`),
  whose fields are listed under [What each supplies](#what-each-supplies),
  and the screen adds the lesson's steps to the model's config as it hands
  it to the engine, so the diagram is the same whichever lesson draws it.
  For now each model sits beside its one lesson, in that lesson's file. The
  playground's list is read off the lessons (`MODELS`), so a model is in it
  once a lesson on it is listed.
- A model's own expressions may read the step a lesson has reached: the
  café draws Z before its choices and again once the lesson is over. The
  playground hands the engine no steps, so it declares that param itself,
  past every lesson's end — the model as a student who had seen every step
  would find it.
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
  tooltip. Help and the profile circle stay at the rail's foot, apart from
  the places to go.
- Built (`DoubleNavbar.tsx`). Home's press opens Home, pushed as any page
  is, and puts away a panel that is out. Home's own list of the places reads
  the rail's icons and names (`RAIL`), so the two say each place one way.
- The chart Lessons had goes to the Playground, which is where the charts
  are, and Lessons is a book.
- Lessons, Playground and In the news each bring out a panel beside the rail
  listing what is in them; choosing from it opens that thing and puts the
  panel away. Home has no panel: it is a page.
- No place has a page that is only its list. A list is a panel, or a part of
  Home, and a press in it opens a lesson, a model or a story, so no page in
  the app has nothing on it to do but choose.
- The Playground panel is arranged as the Lessons panel is, in the same
  strands and topics with the same dots, so a model sits under the topic of
  the first lesson drawn on it, once. Either panel opens on the topic of the
  open page, so the Playground panel beside a lesson opens where its model
  is; from Home, which is under no topic, both open where a course starts.
  The In the news panel is newest first, under each month, a heading as a
  strand's is: a row a story, its day ("29 Sep"), its topic's dot and its
  headline, which wraps rather than being cut. A story has no topic to drop
  down to, since it is found by when it happened; the dot says which topic
  it is told in, and the topic's name is there for a screen reader.
- The rail lights the place the open page belongs to, and the icon whose
  panel is out.
- On a phone the burger opens the overlay at the panel of the open page's
  place, and on Home at the Lessons panel, where a course starts.

### Home

```
 Learn it, play with it, see it happen

 ┌──────────────────────────────────┐ ┌──────────────────────────────────┐
 │ Where to go                      │ │ Latest in the news               │
 │ ▤  Lessons                     → │ │ 15 Oct 2026  ● Iron ore falls  → │
 │    Each idea built up a step …   │ │ 29 Sep 2026  ● The RBA raises  → │
 │ ⌒  Playground                  → │ │ 16 Sep 2026  ● The US Federal  → │
 │    A market to yourself: drag …  │ └──────────────────────────────────┘
 │ ▦  In the news                 → │
 │    Real events, and which …      │
 └──────────────────────────────────┘
```

Built, at `/` (`Home.tsx`).

- Where the app opens. The root is Home, and so is a path the app does not
  have. So the Lessons panel follows a course (`lessons/index.ts`): The
  economic problem, then Markets, demand's determinants before the whole
  market.
- A page that points, and nothing else. It answers the two questions a
  student arriving has, a card each, side by side where both fit at a
  comfortable line and one over the other where they do not: "Where to go"
  and "Latest in the news". Each card is paper with a card head, as every
  card on the study screen is, and the rows on them are action rows.
- Its title is on the desk above the cards, as a page's title is, and says
  what the three places are for, in the order the rail has them: "Learn it,
  play with it, see it happen". No topic over it and no tools beside it: it
  is in no topic, and has no stage.
- "Where to go" is the three places, each with the rail's icon and name, a
  line saying what is in it, and the arrow. A press brings out that place's
  panel, as its icon on the rail would — on a phone, the overlay at that
  panel — opened where a course starts. So Home is also where the rail is
  learnt, and the way in to each place is the place's own list, not a copy
  of it.
- "Latest in the news" is the three newest stories (`ON_HOME`), newest
  first: each its date, its topic's dot and its headline, and the arrow, the
  whole row a link to the story. On a phone the date goes over the headline,
  so the headline has the row. The rest are in the In the news panel, a
  press away on the rail or on "Where to go".
- The stories are on Home because they are the one part of the app that
  changes without a lesson changing, and Home is where a student arrives.
- Every press on Home opens a thing, a lesson, a model or a story, or a
  place's panel; never a list page.

### Lessons

```
 ┌────────────────────────┐ ┬
 │ Lesson                 │ │
 │ Part 2 of 3 · …        │ │
 │ ▬▬▬▬ ▬▬▬▬▬ ▬▬▬▬        │ │
 │ step words, key term,  │ │ the column
 │ the question or try-it │ │
 ├────────────────────────┤ │
 │ What changed     Undo  │ │
 │ ○ Demand … increases   │ │
 │ ● The AUD appreciates  │ │
 ├────────────────────────┤ │
 │ Back      1 of 5  Next │ │
 └────────────────────────┘ ┴
```

Built, at `lessons/<id>`.

- The study screen less Explore, Scenarios and Maths. The lesson card has the
  column to itself, with a card head of its own where the tab row was.
  "What changed" is its foot, over Back and Next, since the lesson's steps,
  try-its and questions move curves.
- Nothing on the lesson page leads out of the lesson but the rail. A student
  who wants the market to themselves finishes the lesson or takes the rail;
  neither is on the card beside a question. The card has no close, on a
  phone either.
- Finish, at the last step, opens the playground at the lesson's model and at
  the market the lesson ended on, written in the playground's address as a
  link would write it. It is pushed, as a change of lesson is, and the
  lesson's own entry remembers its answers, so Back returns to the recap
  with its questions on it. The line under the recap says where Finish goes:
  "Finish, and this market is yours in the Playground", and each lesson's
  last step says so in its own words.
- "Why? See the maths" is not offered. The maths is the playground's.
- Reset is the step's market.
- On a phone: the lesson under the stage and the chain in the strip, with
  no instruments' door in the capsule.
- Share's link opens the lesson at its start.

### The Playground

```
 ┌────────────────────────┐ ┬
 │ Explore Scenarios Maths│ │
 │ Demand for A$       50 │ │
 │ who it is              │ │ the column
 │ ━━━━━━━○━━━━━━━━━━━━━━ │ │
 │ Try this               │ │
 │ ○ …                    │ │
 ├────────────────────────┤ │
 │ What changed     Undo  │ │
 │ ○ ·  ●  …              │ │
 └────────────────────────┘ ┴
```

Built, at `playground/<id>`.

- One model to a page. The title line is the model's topic over its name, with
  the same tools: the arrangement, Reset, Present and Share.
- The stage draws all of the model's panels from the start. A lesson brings
  them in step by step; a student who has come to play has nothing to be
  brought to.
- The column is one card of three tabs, Explore, Scenarios and Maths, with
  Explore open first, and "What changed" at its foot, at the same height and
  scrolling the same way as a lesson's. Its sheet rises over the open
  instrument and not the tabs, and opening another tab puts it back.
- "Why? See the maths" opens the Maths tab at the calc.
- Reset puts back the market the page opened with: the model's own, or the
  one a link, a lesson's Finish or a story handed it.
- Share's link is this view, params and all, where a lesson's is its start. A
  lesson has a start worth more than any view of it; a market has none, and a
  teacher who set one up to show a class wants that one.
- On a phone there is no lesson to hold the place under the stage, so the
  instruments take it, at the height the lesson has, tabs and all, and there
  is no bottom sheet. The chain stays in the strip.

### In the news

```
 ┌─────────────────────────────────┐ ┌──────────┐ ┌────────────────────────┐ ┬
 │           News report           │ │AUD market│ │ What it moves          │ │
 │ The RBA raises the cash rate …  │ │          │ │ Show it on the       → │ │
 │ The Reserve Bank lifted the …   │ └──────────┘ │ diagram                │ │ the column
 │ Source: Reserve Bank of Austr…  │ ┌──────────┐ │ Higher interest rates… │ │
 │ The diagram shows which way …   │ │USD market│ │ Open in the          → │ │
 │                                 │ │          │ │ Playground             │ │
 │                                 │ └──────────┘ ├────────────────────────┤ │
 │                                 │              │ What changed     Undo  │ │
 └─────────────────────────────────┘              └────────────────────────┘ ┴
```

Built, at `news/<id>`, with its stories in `apps/web/src/news/`.

- A story is something that happened, Australian first: the RBA moves the
  cash rate, the iron ore price falls, a tax on petrol is halved. It is told
  against one model: what happened, which curve that moves and which way, and
  why.
- Its page is built from pieces the kit already has. The title line is the
  story's topic and date over its headline. The stage is the model whole, as
  the playground has it, with the story at the front as a report panel
  (`AsidePanel`, captioned "News report"), drawn as a lesson's aside is; the
  model's panels are on the rail beside it, a press away.
- The column's card is "What it moves" (`StoryCard`). Its action row is
  "Show it on the diagram", with the reasoning under it — who, which curve,
  which way — and pressing it makes the move, as a scenario does: the
  snapshot, then every param it names in one update, so "What changed"
  tells the chain and Undo takes it back. It is greyed once the market is
  where the move puts it, as Reset is when nothing would change. Under it,
  "Open in the Playground" opens the market the move made, pushed as Finish
  is, so Back is the story. It is the same address whether or not the move
  has been made, since it is the news's market and not the student's view,
  and it is a real link, so it opens in a tab of its own where asked.
- No instruments and no Maths beside a story, so no "Why?": the story's page
  is about one move, and the playground is a press away for everything else.
  The curves can still be dragged, as in the playground, and Reset puts back
  the market the page opened with.
- A story is real, so it is dated and sourced: its date first, its outlet
  named and linked under its sentence, opening in a tab of its own. The
  headline and sentence are written for the app in plain words, never the
  article's own text.
- The real numbers are in the story's words only. The diagram's numbers are
  the model's, and the report's note says so: "The diagram shows which way
  this moves the market, not how far."
- **A story only shows; it asks nothing.** A lesson's question is marked on
  where the student's curve lands, and a story's diagram shows which way,
  not how far: the only thing true enough to mark is the way, which the
  reasoning beside it has already said. Asking it would be asking the
  student to read the answer back. A question about real news belongs in a
  lesson, with a made-up report, where the lesson's numbers are its own.
- A story is true of its day and stays so. It never expires, and a link to it
  keeps opening, with its date; it leaves Home's feed as newer stories
  arrive.
- A lesson's reports stay made up ([Writing for the screen](#writing-for-the-screen)).
  A story is the one place the app reports a real event, because it carries
  its date and a lesson does not.
- On a phone the story's card goes under the stage in the lesson card's
  place and at its height, and the chain into the strip, as on every page.
  The report is captioned there by its headline until it is brought to the
  front.

### Addresses

```
 /                                       Home
 /lessons/fx?step=7&arrange=grid         a lesson, at a view
 /playground/aud?tab=maths&supply=56     a model, at a view
 /news/2026-09-rba-cash-rate             a story
```

Built, as [Links](#links) describes.

- Each place is a path, so a teacher can read what a link opens before
  sending it; after the `?` the view is written as it was.
- Opening another page, lesson, model or story is pushed; anything else
  replaces, so Back goes to the last thing opened, not the last drag.
- Old addresses open what they opened, because links handed out last term
  should still open. `?lesson=fx&step=7` is that lesson at that step;
  `?lesson=fx&tab=scenarios&supply=56` is the playground at the lesson's
  model, at that tab and market.
- `step` belongs to a lesson and `tab` to the playground. `lesson` leaves the
  query for the path, but stays reserved, since old links carry it.
- A story that is not there, and a path the app does not have, open Home,
  and the address becomes the root.
- Netlify serves `index.html` for every path (a `/* /index.html 200`
  rewrite in `netlify.toml`).

### What each supplies

- **A model:** its id and name, `diagram`, `panels`, `narratedCalcs`,
  `explainedCalcs`, `paramMeanings`, `paramWords`, `directionWords`,
  `questionApparatus`, `explorePrompts` and `scenarios`, each written as
  [What a lesson supplies](#what-a-lesson-supplies) says now.
- **A lesson:** its id, label and title, `cover`, `goals`, `pictures`,
  `asides`, its steps, and the model it is drawn on.
- **A story:** its id, `date`, `headline`, `body`, `source`, `model`, `move`
  and `reasoning`, written as the story's table under [What a lesson
  supplies](#what-a-lesson-supplies) says.

### What changes when it is built

Each of these sections is rewritten as the page it describes is built.
Rewritten for the Lessons page and the Playground: [The title
line](#the-title-line), [Share](#share), [Links](#links), [The side
column](#the-side-column), [Reset](#reset) and the rail. Rewritten for In
the news and Home: [The title line](#the-title-line), for a story's date;
[Share](#share) and [Links](#links), for a story's address and what its
link opens; [What a lesson supplies](#what-a-lesson-supplies), for a
story's fields; the kit; and the rail. Still to come:

- [Embeds](#embeds): the diagram-only embed is the playground's stage, and its
  link opens the Playground.

### Still open

- Where the playground points back to the lessons on its model. None of the
  column's cards answers "where can I learn this?", so by principle 1 it is a
  card of its own or nothing.
- Who writes the stories, and how often. For now they are written by hand
  in `news/stories.ts`, each checked against its source on the day it is
  written. Home shows the three newest, which is settled
  ([Home](#home)), and a story asks no question, which is settled too
  ([In the news](#in-the-news)).

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

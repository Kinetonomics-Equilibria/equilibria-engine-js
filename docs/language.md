# The app's language

This file sets out how the app speaks to a student, so that every lesson, news
story and button sounds like the same person. It covers every word a student
reads. [`design.md`](./design.md) decides where words go on the screen, and
[`chart-design.md`](./chart-design.md) decides how a chart is labelled. This file
decides how the words are written.

The readers are Year 10 to first-year students, mostly in Australia. Some are
meeting economics for the first time, and some will repeat what they read here
in an assessment. The writing has to work for both groups, so it is friendly in
its explanations and exact in its definitions.

## The idea in one line

> **Write like a patient tutor sitting beside the student, who explains one
> thing at a time, in the order it happens, in full sentences.**

The reference is Khan Academy's economics writing. It is informative, it takes
its time, and it works through each idea with the reader.

The app used to sound different. It was terse and very sure of itself, and it
read as though the lesson was clever and the student was not. Space on the
screen is limited, but a short sentence can still be a kind one. When a sentence
has to choose between sounding sharp and being clear, it should be clear.

## Principles

### 1. Work beside the student

A lesson is something the tutor and the student do together. Use "we" and
"let's" for the thinking you do together, "you" when the student is in the
example, and "economists" when the word or the method belongs to the subject.

Offer the student something to do, rather than ordering them to do it. "You can
move the demand curve below" is an invitation. A command is only for operating
the screen, such as "press Check", and it should say nothing about what the
student will discover.

Never promise a reward for following orders. "Work out what airlines weigh up
and you can say which way supply will move" sets the student a task and holds
back the point of it. The lesson should say what it is going to explain.

Never suggest that something is easy. A student who is finding it hard hears
that they are slow.

### 2. Explain forwards

Say things in the order they happen. A reader should know what a sentence is
about from its first few words, and should never have to reach the end and then
read it again. A step usually runs in this order.

1. The situation.
2. What changes.
3. What happens as a result, and why.
4. What economists call it.

The general idea can come before the example, and the example before the name of
the idea, but the cause never comes after its effect. These are the backwards
patterns to avoid.

| Pattern | Backwards | Forwards |
| --- | --- | --- |
| A command used as an "if" | "Put sausage rolls up a dollar and the canteen makes more on each one." | "Suppose the canteen raises the price of a sausage roll by $1. The canteen earns more on each roll." |
| The question held to the end | "Whether it comes out ahead depends on how much students respond." | "The canteen's revenue may rise or fall. The result depends on how much students respond." |
| The noun held back behind a colon | "The new panel shows the money that changes hands: the price times the quantity sold." | "The new panel shows total revenue. Total revenue is the price multiplied by the quantity sold." |
| The effect before the action | "Move demand yourself and watch revenue follow it." | "You can move the demand curve below to see how revenue changes." |
| The example before the subject | "Plane tickets, and what shifts supply" | "Supply and its determinants" |
| The reveal | "That's the price elasticity of demand: how much students respond." | "This number is the price elasticity of demand. It tells us how much students respond to a change in price." |

### 3. Write full sentences

Use a few more words than the idea strictly needs. A sentence has a subject
and a verb, and it can be read aloud without sounding like a telegram. Keep each
sentence to about 25 words, and split one that runs on.

Repeat the noun where a pronoun could point at two things. "The canteen sells
fewer rolls" is clearer than "it sells fewer". Say "the demand curve" until the
step has only one curve to talk about.

Show the arithmetic in words beside the numbers, as a tutor would at a whiteboard.
"Each extra toastie costs 40 ÷ 20 = 2 coffees" tells the student where the 2 came
from.

### 4. Step the reasoning out

One idea to a step, and one point to a paragraph. Three short paragraphs are
easier to read in the side column than two long ones, because the gap between them
shows where one thought ends and the next begins.

Use a list wherever the words are a list, and for a calculation done in stages. PETPIG's six letters are a list, and so are the two percentages behind an
elasticity. A list is written in `say` with each line starting `- `.

An idea that needs more room than this is two steps.

### 5. Be honest about what is known

Economics describes tendencies, and a model is a simplification. Say so.

- Use "usually", "tends to", "most" and "in this model" where they are true.
- Use "suppose" for anything made up for the lesson.
- Keep real events dated and sourced, as [`design.md`](./design.md#in-the-news)
  describes.
- Leave out words that claim more than the writing can back up, such as "nobody",
  "always", "really" and "obviously".

### 6. Define terms so they can be used in an exam

A key term is something a student may write in an assessment, so it has to be
correct and complete on its own. See [Definitions](#definitions).

### 7. Keep titles informative

A title says what the page teaches. It does not tease, and it does not lead with
the example.

- **A lesson's title** is the economics. "Price elasticity of demand", never
  "Sausage rolls, and price elasticity". The example belongs on the cover.
- **A page's title** says what is on the page. Home is "Economics lessons,
  diagrams and news".
- **A part's title** names what the part covers: "Why demand slopes down".
- **A step's title** names the step's one idea or event in a few words: "Quantity
  demanded rises".
- **A model's name** says what it draws: "Demand for Air Jordans". It is never a
  lesson's title ([`design.md`](./design.md#models)).

No title has a colon, and none has the shape "X, and what Y".

### 8. Keep the punctuation plain

- **Avoid the colon.** A colon makes the reader wait for the point, and it is the
  usual sign of a backwards sentence. Split the sentence in two, or use "which",
  "such as" or "so". A step that introduces a list ends its sentence with a full
  stop.
- **Avoid dashes as punctuation** for the same reason. The minus sign in −10% is
  a minus sign, and it stays.
- **Avoid exclamation marks.** Warmth comes from the patience of the writing.
- **Use brackets only for an abbreviation or a unit**: "production possibility
  curve (PPC)".
- **Use Australian spelling**: "favourable", "specialised", "labour".
- **Use contractions sparingly** in explanations. "Don't" sounds like a person.
  Definitions have no contractions at all.
- **Write numbers as the diagram prints them.** See
  [Writing for the screen](./design.md#writing-for-the-screen).

## Definitions

Every key term lives in one place, `apps/web/src/lessons/glossary.ts`. A step
takes its term from there (`term: GLOSSARY.marginalUtility`) and never writes one
of its own, so a student sees one definition of each word across the whole app.

A definition follows these rules.

- **It is one or two complete sentences, and it starts with the term.** "Marginal
  utility is the additional satisfaction a consumer gains from consuming one more
  unit of a good or service." A student should be able to write it down as it
  stands.
- **It is about economics, not the lesson's example.** The Air Jordans belong in
  the step's words. "Like Adidas sneakers instead of Air Jordans" is an example,
  and a definition with an example in it is not yet a definition.
- **It uses the subject's standard words**, such as "consumers", "firms", "good
  or service", "willing and able", "at each price", "over a given period" and
  "all else being equal". Each of these is there for a reason. Demand without
  "willing and able" is only a wish.
- **It says how to calculate the term, if it has a formula**, in words: "the
  percentage change in quantity demanded divided by the percentage change in
  price".
- **It says what the term looks like on a diagram, where that is part of the
  meaning**, in its own sentence: "It is shown by a point outside the PPC."
- **It draws the line between terms that are easily confused.** A change in demand
  is a shift of the curve, and a change in quantity demanded is a movement along
  it. Each definition says which it is, and what causes it.
- **It has no "you", no contractions and no "like".**

Check a new definition against a syllabus or a textbook before it goes in. The
step's words explain the idea in plain language, and the definition says it
exactly, so a step can say "the extra satisfaction from one more pair" above a
definition that says "additional satisfaction".

## Field by field

These are the places words go, and how to write each one. The limits on length
are in [`lesson-authoring.md`](./lesson-authoring.md#4-the-words).

| Field | How to write it | Example |
| --- | --- | --- |
| Lesson `title`, `label` | The economics, as a plain noun phrase | "The terms of trade" |
| `goals` | What the student will understand, as noun phrases that finish "In this lesson" | "The difference between moving along the demand curve and shifting it" |
| `cover.question` | One real question that the lesson answers, in plain words | "Why does the Australian dollar rise and fall?" |
| `cover.hook` | The situation, then "In this lesson we" and what the lesson covers | "Australia sells iron ore and buys phones. … In this lesson we measure this change with the terms of trade." |
| Part titles | What the part covers | "When the AUD moves" |
| Step `title` | The step's one idea or event | "The AUD appreciates" |
| Step `say` | The situation, the change, the result and the name, stepped out | See [Before and after](#before-and-after) |
| A step that hands over a control | An invitation that says what to look for | "You can move the price below to count the pairs you would buy." |
| A question's prompt | The event, then a plain question, then how to answer | "What moves, and which way? Move it on the diagram, then press Check." |
| `ask.explain` | The reasoning in order, from the event to the curve to the result | "Teenagers earn more, and Air Jordans are a normal good, so fans want more pairs at every price. Demand increases and the curve shifts to the right." |
| `recap.takeaway` | The general rule, in plain sentences | "A change in a good's own price moves buyers along the demand curve." |
| `paramWords.about` | Who or what is behind the control, in a short sentence or two | "The price Nike charges for a pair." |
| `paramWords.rise`, `fall` | A whole clause in the present tense | "Demand for Air Jordans increases" |
| `paramWords.because` | One sentence of reasoning, true of every move that way | "At the old price, buyers now want more than sellers offer, so some buyers miss out and the price is pushed up until the two match again." |
| `narratedCalcs[].meaning` | What the number is, in a phrase | "The price of USD 1 in AUD" |
| `explorePrompts` | Open questions the controls can answer | "How can you make quantity demanded rise without moving the demand curve?" |
| `scenarios[].description` | The cause, then the result as a sentence of its own | "A substitute gets cheaper, so fans want fewer Jordans at every price. Demand decreases." |
| An aside's report | A plain news item, with a note that says it is made up | "A made-up report, for this question" |
| A story's `body` | What happened, in neutral language, with its real numbers | "The Reserve Bank lifted the cash rate by 0.25 percentage points to 4.60%." |
| A story's `reasoning` | Who acts, then the curve and the direction as a sentence of its own | "Higher interest rates here draw investors overseas into Australian bonds. Demand for AUD rises." |

## The interface

Buttons, hints and feedback are written under the same rules, with less room.

- **A button** is one to three words, and it starts with what it does: "Check",
  "Try again", "Show me". This is the one place a command is always right.
- **A heading or label** is a noun phrase: "What changed", "Key term". Where a label
  needs a separator, the app uses a middle dot, as in "Part 2 of 3 · When demand
  changes".
- **A hint** is a full sentence that says how to use the screen: "Drag a curve to
  see what it changes."
- **Feedback** says what the student did before it says what is right, and it never
  opens with "Wrong". It gives a reason and a way to try again.
- **A refusal or an error** says what happened, and whose problem it is if it is
  the app's. Nothing scolds.

## Words to use

| Write | Instead of | Because |
| --- | --- | --- |
| Suppose | Say | "Say" reads as an order, and "suppose" marks the example as made up |
| Notice, you can see | Watch | "Watch" is an order, and it asks the student to wait for something |
| You can move | Move, Try | An invitation, unless the step truly needs the move |
| costs more, more expensive | dearer, dear | Plainer for a student, and clearer for anyone learning English |
| does not move, does not change | stays put | The exact claim |
| earns, receives | takes, makes | "Takes" and "makes" can mean profit, and revenue is not profit |
| at most | tops | Plain English |
| total revenue | the money that changes hands | The subject's own term |
| falls, rises | soars, jumps, plunges | Use the plain word unless the size is the point |
| to the right, to the left | right, left | "Shifts to the right" reads as a sentence |

Leave these out altogether: "obviously", "clearly", "of course", "simply", "just",
"easy", "really", "actually", "suddenly", "nobody", "work out", "tops".

In a step's words, "buyers" and "sellers" are fine, and they keep the example
alive. Definitions use "consumers" and "firms" or "producers", because those are
the words an exam will use.

## Before and after

Each pair is a real line from the app, before and after this guide.

| Where | Before | After |
| --- | --- | --- |
| Lesson title | "Plane tickets, and what shifts supply" | "Supply and its determinants" |
| A step | "The new panel shows the money that changes hands: the price times the quantity sold." | "The new panel shows total revenue, which is the price multiplied by the quantity sold." |
| A step | "Move demand yourself and watch revenue follow it." | "You can move the demand curve below to see how revenue changes." |
| A cover | "Put sausage rolls up a dollar and the canteen makes more on each one, but sells fewer. Whether it comes out ahead depends on how much students respond, and that depends on where else they can go." | "Suppose a school canteen raises the price of a sausage roll by $1. The canteen earns more on each roll, but it sells fewer rolls. In this lesson we measure how much students respond to a price change, and what that means for the canteen's revenue." |
| A cover | "Some weeks there's a flight to Melbourne every half hour, and some weeks airlines cut back. Work out what airlines weigh up and you can say which way supply will move." | "Airlines run more flights between Sydney and Melbourne in some weeks than in others. In this lesson we look at how an airline decides how many flights to run, and at the six factors that shift supply." |
| A definition | "Marginal cost: The extra cost of producing one more unit: here, one more flight." | "Marginal cost is the additional cost of producing one more unit of a good or service." |
| A definition | "Demand: How much buyers are willing and able to buy at each price." | "Demand is the quantity of a good or service that consumers are willing and able to buy at each price over a given period." |

One step shows how the principles work together. It used to read like this.

> Say seats on the route sell for $200: the dotted line, P. Your first three
> flights cover their costs at that fare, so you run 3. Your fourth needs $250, so
> you don't run it.
>
> Move the fare and count how many flights you'd run.

It held two ideas, so it became two steps. This is the first.

> Now let's add a fare. Suppose seats on the route sell for $200, which is shown
> by the dotted line labelled P.
>
> Your first three flights cover their costs at this fare, so you run 3. Your
> fourth flight needs $250, so you don't run it.

This is the second, with the slider and the key term.

> You can move the fare below to count the flights you would run at each fare.
>
> As the fare rises, more flights cover their costs, so you run more. This pattern
> is called the law of supply.

## What the tests hold

`apps/web/src/__tests__/language.test.ts` reads every lesson, model and story, and
fails on what a machine can recognise.

- A colon or a dash used as punctuation.
- A title in the shape "X, and what Y".
- A word from the lists above.
- A command used as an "if", and a promised reward ("and you can").
- A key term that is not from the glossary, or a definition that does not start
  with its term or that has "you" in it.

`apps/web/src/__tests__/lessons.test.ts` holds the lengths. The tests cannot hear a
sentence, so the rest of this file relies on the writer reading it aloud.

## Before a lesson ships

Read each step aloud and ask these questions.

1. Does it sound like someone helping, or like someone showing off?
2. Does each sentence say what it is about in its first few words?
3. Could a student who got the last step wrong still follow this one?
4. Does each paragraph make one point?
5. Could a student copy each key term into an exam and be marked correct?
6. Does the title say what is taught?

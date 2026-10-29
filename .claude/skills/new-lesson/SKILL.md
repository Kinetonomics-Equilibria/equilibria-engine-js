---
name: new-lesson
description: >
  Write a new lesson for the study app (apps/web), or a new model for it to be drawn on. Use this
  skill when asked to add, write, create or draft a lesson, or to teach a topic in the app: it
  says where the lesson goes, what to copy, the order to write it in, and which parts of the
  design docs each step needs. Not for changing the study screen itself, or an existing lesson's
  words alone.
---

# A new lesson

A lesson is its words, its steps and its model, made into the app's `StudyContent` by
`defineLesson` (`apps/web/src/lessons/kit/lesson.ts`), and drawn with the chart kit
(`apps/web/src/lessons/kit/chart.ts`). The guide is
[`docs/lesson-authoring.md`](../../../docs/lesson-authoring.md): read it first, and follow it
in its order. This skill is the short form.

## Before you write

- Read `docs/lesson-authoring.md`, then each section of `docs/design.md` and
  `docs/chart-design.md` it points to as you reach that step, as `CLAUDE.md` asks.
- The students are Year 10 to first-year, mostly in Australia: Australian examples, `$` for
  Australian dollars, the RBA rather than the Fed.
- Pick a topic and an example a student has lived: the Air Jordans, plane tickets to
  Melbourne, a café's Saturday morning.

## Write it

1. Copy `apps/web/src/lessons/_template/` to `apps/web/src/lessons/<id>/`: `chart.ts`,
   `steps.ts` and `index.ts`.
2. The model and its ranges (`chart.ts`): `PARAMS` and `CALCS`. Ranges that keep every curve
   on the axes at both ends.
3. The panels (`chart.ts`): `curve`, `equilibrium`, `axis`, `priceAxis` and the rest from the
   kit. A raw engine object only where the kit has nothing, given the house rules by hand; a
   rule broken on purpose says so in `breaksRule`.
4. The steps (`steps.ts`): one idea each. Find a step with `stepTitled`, never `findIndex`.
5. The words (`index.ts`): the lesson's, and the model's `narratedCalcs`, `paramWords`,
   `scenarios` and the rest.
6. The questions: from the baseline, offering every curve that could move, naming none.
7. List it in `CURRICULUM` (`apps/web/src/lessons/index.ts`), add its model's id to
   `MODELS` in `apps/web/tests/chart.spec.ts`, and write `<name>.test.tsx` holding every
   number a step states to the diagram.

Don't write what the kit works out: a question's params, a panel's change calc, a ghost's
`show`, a drag's `draggable`, a curve's `srTitle`, an escaped `$`.

## Check it

```bash
npm test
```

```bash
npm run typecheck
```

```bash
PORT=5181 npm run test:browser
```

On a port of its own: the suite, and the screenshot script, use whatever dev server is already
on theirs, which may be another checkout's. Edit nothing under `apps/web` while it runs.

Then look at it, in Focus and in the grid, at 1440×900 and on a phone: a link opens a lesson
at a step, `lessons/<id>?step=4`, but draws no ghost and no chip, so walk the steps that move
something in the browser as well. `docs/lesson-authoring.md` has the screenshot command.

When something in the guide was wrong, or you had to read the kit's source to find out how to
do a thing, fix the guide too.

# Working in this repo

The app is for Year 10 to first-year students, mostly in Australia. Everything
they see follows two written design languages. Read the one that applies before
you change anything a student will see:

- **A chart**, or anything inside a panel's sheet: a lesson's diagram config,
  its caption, axes, curves, points, labels, droplines or annotations. Read
  [`docs/chart-design.md`](./docs/chart-design.md).
- **A card, a panel's chrome, or anything else on the study screen.** Read
  [`docs/design.md`](./docs/design.md).
- **A new lesson.** Read [`docs/lesson-authoring.md`](./docs/lesson-authoring.md)
  first, and start from `apps/web/src/lessons/_template/`. It says which
  sections of the two above each step needs.

Follow them as written. When a chart has to break a rule, say why beside the
config, in a `breaksRule: { rule, why }` on the object, which the chart rules
test reads. Don't copy a pattern listed under "Where today's charts
differ" in `chart-design.md`: those are known departures, not examples.

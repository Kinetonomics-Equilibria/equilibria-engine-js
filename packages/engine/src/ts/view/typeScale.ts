/**
 * The sizes a diagram's labels are set in, in points (a label's `fontSize`
 * unit: 12pt is 16px).
 *
 * Two of them, and an author normally sets neither (docs/chart-design.md).
 * Words and the marks that go with a point or an axis — axis titles, a
 * dropline's value, a point's letter, an annotation — are `LABEL_SIZE`. A
 * curve's symbol, `D` or `PPC`, is `SYMBOL_SIZE`, a step larger, since it
 * names the thing the chart is about.
 *
 * 14px and 16px, for a student reading the diagram up close on a laptop, and
 * never smaller: 14px is the least anything a student reads is set in, and
 * tick numbers, which d3 draws rather than a label, are 14px to match
 * (kgjs-theme.css). They were 16px and 18.7px, so a chart could be read on a
 * projector at 100% zoom, and the symbols at that size, LRAS and SRPC, were
 * the heaviest marks on the chart. A projected chart is in Present, which
 * draws every label a quarter larger (`--kg-type-scale`, see `paintScale`),
 * 17.5px and 20px. A grid panel draws its symbols at `LABEL_SIZE`
 * (KGAuthor/parsers/density.ts).
 */
export const LABEL_SIZE = 10.5;
export const SYMBOL_SIZE = 12;

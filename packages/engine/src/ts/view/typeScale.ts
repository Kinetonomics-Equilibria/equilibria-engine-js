/**
 * The sizes a diagram's labels are set in, in points (a label's `fontSize`
 * unit: 12pt is 16px).
 *
 * Two of them, and an author normally sets neither (docs/chart-design.md).
 * Words and the marks that go with a point or an axis — axis titles, a
 * dropline's `P*`, a point's letter, an annotation — are `LABEL_SIZE`. A
 * curve's symbol, `D` or `PPC`, is `SYMBOL_SIZE`, a step larger, since it
 * names the thing the chart is about.
 *
 * Raised from 10 and 12 so a chart can be read on a projector at the front of
 * a classroom, at 100% zoom, as well as on a laptop. Tick numbers, which d3
 * draws rather than a label, are set to match in kgjs-theme.css.
 */
export const LABEL_SIZE = 12;
export const SYMBOL_SIZE = 14;

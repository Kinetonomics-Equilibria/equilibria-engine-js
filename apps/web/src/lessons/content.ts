import type { LessonStep } from '../track/track';
import type { NarratedCalc } from '../narration/narrate';
import type { Scenario } from '../dock/Scenarios';
import type { Direction } from '../quiz/grade';

/**
 * Everything the study screen needs to know about one lesson, in one object.
 *
 * Until there were two lessons this was seven loose exports beside the one
 * diagram, imported by name into the screen — which is how the screen came to
 * be about supply and demand rather than about whatever it was handed. Nothing
 * here is new: each field is one of those exports, or a sentence the screen
 * used to hard-code. What is new is that they travel together, so a second
 * lesson is a second object and not a second screen.
 *
 * Still not a content model. A real one would live somewhere a teacher could
 * edit, version and assign; this keeps the lessons as data so that moving them
 * there is a cut and a paste, which was the condition the first one was
 * written under.
 */
export interface StudyContent {
    /** Its address: `?lesson=<id>`, and the key the screen is mounted under. */
    id: string;

    /** The navbar's word for it. Short — it sits in a column of links. */
    label: string;

    /** The heading over the stage, and the sentence under it. */
    title: string;
    intro: string;

    /** The engine config: params, calcs, `steps` and a `CustomLayout`. */
    diagram: Record<string, unknown>;

    /** The same array as `diagram.steps`, typed for the app's own keys. */
    lesson: LessonStep[];

    /** What each panel is called and which calc its caption headlines. */
    panels: readonly PanelSpec[];

    /** The numbers the strip reports, and what each is called everywhere. */
    narratedCalcs: NarratedCalc[];

    /** The calcs the Maths instrument typesets, by name. */
    explainedCalcs: Record<string, string>;

    /** Which params draw a question's start and answer, per askable param. */
    questionApparatus: Record<string, { start: string; answer: string }>;

    /** Named param sets for the Scenarios instrument. */
    scenarios: Scenario[];

    /**
     * How a param's rise and fall read in a verdict, where "up" would be wrong.
     *
     * A question's `direction` is defined on the param's *value*, and for a
     * curve dragged by its intercept that is also which way it went on screen.
     * A curve dragged sideways is the other case: its param rises as it moves
     * right, and "you moved it up" said of a curve the student pulled right is
     * a sentence about the model's bookkeeping, not about what they did.
     */
    directionWords?: Record<string, Record<Direction, string>>;
}

export interface PanelSpec {
    key: string;
    name: string;
    /** A calc in `narratedCalcs`, whose label, unit and decimals the caption uses. */
    headline: string;
    /** The calc that says how far the headline has moved since the snapshot. */
    delta: string;
}

/**
 * The calcs worth explaining: every one except the deltas.
 *
 * `calcs.Pe - prev.calcs.Pe` is a true formula and a useless explanation — it
 * says a change is a change. What a student asking "why?" wants is where the
 * *level* comes from. Derived from the config rather than restated, so a calc
 * added to a diagram appears in the Maths instrument without anyone listing it.
 */
export function explainable(calcs: Record<string, string>): Record<string, string> {
    return Object.keys(calcs)
        .filter(name => !/^d[A-Z]/.test(name))
        .reduce((out, name) => {
            out[name] = calcs[name];
            return out;
        }, {} as Record<string, string>);
}

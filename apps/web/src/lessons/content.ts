import type { LessonStep } from '../track/track';
import type { NarratedCalc, Reading } from '../narration/narrate';
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

    /**
     * What the stage shows before the first step, in place of an empty frame.
     *
     * The lesson card says what the student will be able to do (`goals`); the
     * cover says why they would want to — a question the lesson answers, and a
     * sentence or two that makes it a real one. Optional: without it the stage
     * shows the diagram's frame, as it always did.
     */
    cover?: LessonCover;

    /**
     * The lesson's pictures, by name, for the cover and the steps that show one.
     *
     * Image files imported by the lesson, so a missing one fails the build
     * rather than showing a broken image to a class.
     */
    pictures?: Record<string, Picture>;

    /**
     * What a step shows beside the diagram, by name: a report a question is
     * about, read while the student works on the diagram.
     *
     * Not a `PanelSpec`. It has no number to headline and is not drawn by the
     * engine; the stage arranges it as a panel of its own (`hostPanels`) while
     * its step is on screen, and the screen draws it there.
     */
    asides?: Record<string, Aside>;

    /**
     * What the student will be able to do by the end, for the lesson card's
     * first page: three short lines, said before the first step, so the steps
     * that follow have somewhere to go.
     */
    goals: string[];

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

    /**
     * What a param in those formulas means, in words, for the Maths key.
     *
     * The engine's `label` says it when the author gave one, and this is for
     * when that is not enough — or not there. A param with no label is labelled
     * with its own name, which is how the first lesson's `a` and `c` reach a
     * student: as letters in a formula with nothing anywhere saying what they
     * are. Giving them engine labels instead would rename them in the strip and
     * the sliders too, where the letter is the point and the width is spent.
     */
    paramMeanings?: Record<string, string>;

    /**
     * Things to try in Explore, once the lesson is put away: two or three open
     * questions a student answers by moving something, so free play has a
     * point. Nothing marks them — the lesson's questions are the marked ones —
     * and each should be answerable with the controls the diagram offers.
     */
    explorePrompts?: string[];

    /**
     * What each param a student can move stands for, in their words: who it
     * is, under its control in Explore, and what its rise and fall mean, at
     * the head of the chain in "What changed", marked in its curve's colour.
     *
     * The words a student is learning to use, so they are the lesson's own —
     * "Demand for A$ increases" is a step title as well. Every field is
     * optional, and a param with none is shown by its label, as it was.
     */
    paramWords?: Record<string, ParamWords>;

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

/** A param, as a student is told about it. See `StudyContent.paramWords`. */
export interface ParamWords extends Reading {
    /**
     * Who or what the param stands for: one short sentence, under the control
     * that moves it. Not the number's unit — `paramMeanings` says that, in the
     * Maths key — but the people behind the curve, so a slider is a thing in
     * the world and not a number on a track.
     */
    about?: string;

    /**
     * The colour its curve is drawn in, by the name the diagram draws it with:
     * `'demand'` for a curve drawn `color: 'colors.demand'`.
     *
     * "What changed" marks the param's clause in that colour, and the curves
     * it moved under it, so "Demand for A$ increases" is tied to the blue line
     * it shifted; and the param's slider is drawn in it, wherever one is
     * handed out, so the control is tied to the same line. A name and not a value, because the engine is what knows
     * which blue `demand` is (`getColors()`), and a value written here would
     * be a second palette. The chain says it of every curve the param
     * moves, so every one of them should be drawn in it.
     */
    curve?: string;
}

/** The stage before the lesson starts. See `StudyContent.cover`. */
export interface LessonCover {
    /** The question the lesson answers, as its headline: one line, ending in "?". */
    question: string;
    /** Why it is worth asking: one short paragraph, in the lesson's own voice. */
    hook: string;
    /** A key in `StudyContent.pictures`, drawn across the top of the cover. */
    picture?: string;
}

/**
 * A picture a lesson shows: an image file, and what it shows in words.
 *
 * `alt` is not optional. A picture on the stage stands where the diagram would
 * be, and a student who cannot see it is owed what it says.
 *
 * `still` is a frame of a picture that moves — an animated SVG or GIF, which
 * an `<img>` cannot pause. Pause swaps it in, and a student who has asked for
 * less motion sees it first, so anything that moves for more than a few
 * seconds has a way to stop.
 */
export interface Picture {
    /** What it is, in a few words: the head of the sheet it is shown on. */
    name: string;
    src: string;
    alt: string;
    still?: string;
}

/**
 * A report beside the diagram: the event a question turns on, said as the
 * news would say it, so the step's words on the card can be the question alone.
 *
 * Made up, and it says so (`note`): a lesson's numbers are its own, and a real
 * report quoted at a class would be quoted out of its time.
 */
export interface Aside {
    /** What it is, in a few words: the caption over its panel, "In the news". */
    name: string;
    /** What happened, as a headline. */
    headline: string;
    /** One sentence more: who does what because of it. */
    body: string;
    /** A line under it, smaller: "A made-up report, for this question". */
    note?: string;
    /** A key in `StudyContent.pictures`, drawn with it where there is room. */
    picture?: string;
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

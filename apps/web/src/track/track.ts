import type { StepDefinition } from 'equilibria-engine-js';
import type { Question } from '../quiz/grade';

/**
 * One ordered track: build-up, staged reveal and lesson, as the same thing.
 *
 * Step-by-step drawing is steps within one diagram; a panel arriving is a step
 * that reveals a panel; a lesson is the whole track with sentences attached.
 * Built separately they are three controls and three content formats, so this
 * is one list and one position. Free exploration is beside the lesson rather
 * than in it — the screen shows the instruments or the lesson, never both — and
 * draws the diagram as the track's end does, with everything revealed.
 *
 * Pure, and returning structure rather than performing anything. What a step
 * *does* to the engine — the snapshot, the param update — is ordered by the
 * screen, because the ordering is the part that goes wrong (P9 finding 1) and
 * it should be visible where someone can read it.
 *
 * The state is one number and a list of answered questions. Everything else is
 * derived, and that is deliberate: what is revealed *is* `params.step`, and the
 * params a step established are its `set` blocks accumulated. A second copy of
 * either is the plans README's finding 3 waiting to happen — a value the engine
 * already holds, recomputed worse, somewhere else.
 */

/**
 * A question. P11 owns what is inside; the track only knows that it stops.
 *
 * Its prompt is the step's own `say`, not a field of its own: one set of words
 * per step, written one way, and shown on the lesson card above the question's
 * controls like any other step's.
 */
export type LessonQuestion = Question;

/**
 * A step, as the author writes it.
 *
 * `reveal` and `set` are the engine's and are compiled by it (`compileSteps`);
 * `say` and `ask` are the app's and ride on the same objects. One list in the
 * config, handed to the engine and handed back by `kg.steps()`, so there is no
 * app-side list shadowing an engine one and no way for the two to disagree
 * about how many steps there are or what order they are in.
 */
export interface LessonStep extends StepDefinition {
    /**
     * What the step is about, in a few words: the heading on the lesson card.
     *
     * A student scanning back through the lesson reads these, and a screen
     * reader names the step's marker by it, so it says the idea ("The A$
     * appreciates") and not what the step does to the diagram.
     */
    title?: string;

    /**
     * What the student reads at this step, on the lesson card.
     *
     * One idea, in a sentence or three. A blank line starts a new paragraph,
     * and two short paragraphs are easier to take in than one long one: the
     * first says what happens, the second what it means. The card has room for
     * that now. The strip it used to share was one line, so every step had to
     * fit in about 110 characters and came out clipped.
     */
    say?: string;

    /**
     * A word the step introduces, with what it means in plain English.
     *
     * At most one per step: a term is shown in a box of its own, and two boxes
     * would be two new ideas at once. A step that uses a word an earlier step
     * defined does not define it again.
     */
    term?: { word: string; meaning: string };

    /**
     * The name of the part this step begins.
     *
     * Written on the first step of a part only; the steps after it belong to it
     * until another step names a new one. Parts are how a lesson of fourteen
     * steps reads as three short ones, and the card says which the student is in.
     */
    part?: string;

    /** A question that stops the track until it is answered. */
    ask?: LessonQuestion;

    /**
     * The controls a "see what happens when" step hands the student, on the
     * lesson card under its words: a slider per param, in this order, named by
     * `label` because a param's own label is often a letter.
     *
     * The lesson card holds no instruments, so this is the only way a step can
     * put a control in front of the student. A step that asks a question
     * offers its own controls and does not need these as well.
     */
    try?: LessonTry[];

    /**
     * A picture this step shows across the whole stage, by its key in the
     * lesson's `pictures`.
     *
     * For an idea a diagram cannot show — who the buyers of a currency are,
     * and what they are buying — said in a picture while the step's words say
     * it on the lesson card, as every step's do. The diagram waits under it,
     * so a picture step draws nothing on it: no `reveal`, and nothing for the
     * student to try or answer, because there is nothing on the stage to do it
     * with.
     *
     * The app's, like `say`: the engine ignores keys it does not know, and only
     * checks the names in `reveal`.
     */
    picture?: string;

    /**
     * This step looks back over the lesson's questions, on the stage: each
     * one, what it turned on, and how the student did — then `takeaway`, the
     * rule the questions were all instances of, said once.
     *
     * For the step that ends a lesson's questions, so it comes after them, and
     * like a picture step it asks nothing of the diagram under it.
     */
    recap?: { takeaway: string };

    /**
     * A report this step shows beside the diagram, by its key in the lesson's
     * `asides`: the event a question turns on, while the student answers it.
     *
     * A panel of its own on the stage, arranged with the diagram's — on the
     * rail, promotable — for this step only. The step's words then need not
     * tell the story the report does, and should not: one home for it.
     */
    aside?: string;

    /**
     * The panel this step brings to the front, by its key.
     *
     * For a panel that arrives to take over the lesson rather than to sit
     * beside it: the market, after a step or two about one buyer. Panels
     * arrive in the order they are declared, so a later one comes in on the
     * rail, and this is what puts it at the front instead. Said once, at the
     * step it applies to, and applied whenever the lesson passes that step
     * going forward, a jump past it included; the student can promote another
     * panel after it, and the steps that follow leave their choice alone.
     *
     * The app's, like `aside`. The panel must have arrived by this step.
     */
    focus?: string;
}

/** One control a step hands the student: which param, and what to call it. */
export interface LessonTry {
    param: string;
    label: string;
}

export interface TrackState {
    /** Steps applied. 0 is before the first; `steps.length` is the end. */
    position: number;
    /** Indices of `ask` steps that have been answered. */
    resolved: number[];
    /**
     * How each answered question went, by its step's index, for the recap.
     *
     * The first answer, kept: a student who goes back to a question they were
     * shown and answers it is not recorded as having got it right first time.
     * For this session only, like the attempt it is read from — there is still
     * no progress model to keep it in.
     */
    outcomes: Record<number, Outcome>;
}

/**
 * How a question was finished: right at the first commit, right after `goes`
 * commits, or shown the answer.
 */
export type Outcome =
    | { how: 'first' }
    | { how: 'retry'; goes: number }
    | { how: 'shown' };

export type TrackAction =
    | { type: 'goTo'; position: number }
    | { type: 'next' }
    | { type: 'back' }
    | { type: 'resolve'; index: number; outcome: Outcome };

export const AT_START: TrackState = { position: 0, resolved: [], outcomes: {} };

/** What a step does, for the marker that stands for it. */
export type StepKind = 'reveal' | 'set' | 'say' | 'try' | 'ask';

/**
 * The kinds a step combines, in the order they are read.
 *
 * A step that brings a panel in should not look like one that asks a question:
 * the ordering along the track is real information and the marker is where it
 * is carried.
 */
export function stepKinds(step: LessonStep): StepKind[] {
    const kinds: StepKind[] = [];
    if (step.reveal && step.reveal.length > 0) kinds.push('reveal');
    if (step.set && Object.keys(step.set).length > 0) kinds.push('set');
    if (step.say) kinds.push('say');
    if (step.try && step.try.length > 0) kinds.push('try');
    if (step.ask) kinds.push('ask');
    return kinds;
}

/**
 * The furthest position the student may reach.
 *
 * A step carrying an `ask` may be *arrived at* — that is how the question gets
 * on screen — and not passed until it is answered. So the track stops one past
 * the first unanswered question, and never stops going back: a student who
 * cannot answer must still be able to look at what led up to it.
 */
export function maxPosition(state: TrackState, steps: LessonStep[]): number {
    for (let i = 0; i < steps.length; i++) {
        if (steps[i].ask && state.resolved.indexOf(i) < 0) return i + 1;
    }
    return steps.length;
}

export function isBlocked(state: TrackState, steps: LessonStep[]): boolean {
    return state.position >= maxPosition(state, steps) && state.position < steps.length;
}

export function trackReducer(state: TrackState, action: TrackAction, steps: LessonStep[]): TrackState {
    switch (action.type) {
        case 'next':
            return trackReducer(state, { type: 'goTo', position: state.position + 1 }, steps);

        case 'back':
            return trackReducer(state, { type: 'goTo', position: state.position - 1 }, steps);

        case 'goTo': {
            const position = Math.max(0, Math.min(action.position, maxPosition(state, steps)));
            return position === state.position ? state : { ...state, position: position };
        }

        case 'resolve':
            if (state.resolved.indexOf(action.index) > -1) return state;
            return {
                ...state,
                resolved: state.resolved.concat(action.index).sort((a, b) => a - b),
                outcomes: { ...state.outcomes, [action.index]: action.outcome }
            };

        default:
            return state;
    }
}

/**
 * The params every step up to `position` established, later steps winning.
 *
 * Derived rather than accumulated as the student moves, which is what makes
 * "reset to this step" mean what it says: the state the author described at
 * step 4 is every `set` from 1 to 4, not the last one they happened to write.
 */
export function paramsAt(steps: LessonStep[], position: number): Record<string, number> {
    const out: Record<string, number> = {};
    steps.slice(0, Math.max(0, position)).forEach(function (step) {
        Object.keys(step.set || {}).forEach(function (name) {
            out[name] = (step.set as Record<string, number>)[name];
        });
    });
    return out;
}

/**
 * The params a move from `from` to `to` should apply.
 *
 * Forward only, and the asymmetry is the plan's central pedagogy decision:
 * **reveals reverse and param changes do not.** Reveals reverse for free — the
 * compiled predicate is `params.step >= n` — while a student who has dragged the
 * curve since step 2 would have their work thrown away by a scrub that restored
 * the authored numbers. So going back un-draws and leaves the values alone, and
 * a step that needs its own state offers "reset to this step" as something the
 * student chooses rather than something navigation does to them.
 *
 * It will feel wrong to somebody whichever way it goes, and it wants trying with
 * a real student rather than settling by argument.
 */
export function paramsBetween(steps: LessonStep[], from: number, to: number): { name: string; value: number }[] {
    if (to <= from) return [];
    const applied: Record<string, number> = {};
    steps.slice(from, to).forEach(function (step) {
        Object.keys(step.set || {}).forEach(function (name) {
            applied[name] = (step.set as Record<string, number>)[name];
        });
    });
    return Object.keys(applied).map(name => ({ name: name, value: applied[name] }));
}

/** The sentence for the step just applied, or null before the first step. */
export function sayAt(steps: LessonStep[], position: number): string | null {
    const step = steps[position - 1];
    return step && step.say ? step.say : null;
}

/** A run of steps under one name, by position: `first` to `last`, both included. */
export interface LessonPart {
    title: string;
    first: number;
    last: number;
}

/**
 * The lesson's parts, in order.
 *
 * A part runs from the step that names it to the step before the next one that
 * does. Steps before the first name are a part with no title, so every step
 * belongs to exactly one part and the positions are never renumbered: a part
 * groups the track and does not replace it.
 */
export function partsOf(steps: LessonStep[]): LessonPart[] {
    const parts: LessonPart[] = [];
    steps.forEach(function (step, i) {
        const position = i + 1;
        if (parts.length === 0 || step.part) {
            parts.push({ title: step.part || '', first: position, last: position });
        } else {
            parts[parts.length - 1].last = position;
        }
    });
    return parts;
}

/** The part a position is in, and its index, or null at the start. */
export function partAt(parts: LessonPart[], position: number): { part: LessonPart; index: number } | null {
    for (let i = 0; i < parts.length; i++) {
        if (position >= parts[i].first && position <= parts[i].last) return { part: parts[i], index: i };
    }
    return null;
}

/**
 * How long a part is, said the way a student would count it.
 *
 * A part that asks questions is counted in questions, because that is what it
 * will ask of them — "Your turn" is four cases to work out, and the step after
 * them that sends the student on is not a fifth. Every other part is counted in
 * steps. `kinds` is each step's, for a cover that draws the part the way the
 * lesson card's track will.
 */
export function partCounts(steps: LessonStep[], part: LessonPart): {
    steps: number; questions: number; kinds: StepKind[][];
} {
    const inPart = steps.slice(part.first - 1, part.last);
    return {
        steps: inPart.length,
        questions: inPart.filter(step => !!step.ask).length,
        kinds: inPart.map(stepKinds)
    };
}

/**
 * What covers the stage, when something does.
 *
 * Most of a lesson is the diagram, and this is the exception: a moment when
 * there is no diagram worth looking at, so the stage shows something else and
 * the diagram waits under it, mounted and exactly the size it was. Before the
 * first step that is the lesson's cover — the axes the stage would otherwise
 * show there are an empty frame, which says nothing about what is coming. At a
 * step that names a picture, it is the picture; at a recap, the recap.
 *
 * Null while the student is exploring is the caller's business, not this
 * function's: it knows the track, not which tab is open.
 */
export type Slide =
    | { kind: 'cover' }
    | { kind: 'picture'; picture: string }
    | { kind: 'recap'; takeaway: string };

export function slideAt(steps: LessonStep[], position: number, hasCover: boolean): Slide | null {
    if (position === 0) return hasCover && steps.length > 0 ? { kind: 'cover' } : null;
    const step = steps[position - 1];
    if (step && step.picture) return { kind: 'picture', picture: step.picture };
    if (step && step.recap) return { kind: 'recap', takeaway: step.recap.takeaway };
    return null;
}

/** The question the track is stopped on, or null. */
export function askAt(steps: LessonStep[], position: number): LessonQuestion | null {
    const step = steps[position - 1];
    return step && step.ask ? step.ask : null;
}

/** The report beside the diagram at `position`, or null. */
export function asideAt(steps: LessonStep[], position: number): string | null {
    const step = steps[position - 1];
    return step && step.aside ? step.aside : null;
}

/**
 * The panel to bring to the front on moving from `from` to `to`: the one
 * named by the last step passed on the way that names one, or null.
 *
 * Passed, not landed on, so a student who jumps from the start to a question
 * meets the market at the front, as one who stepped through would have.
 * Moving back passes nothing: it leaves the focus wherever the student had it.
 */
export function focusBetween(steps: LessonStep[], from: number, to: number): string | null {
    for (let position = to; position > from; position--) {
        const step = steps[position - 1];
        if (step && step.focus) return step.focus;
    }
    return null;
}

/** The controls the step at `position` hands the student, or none. */
export function tryAt(steps: LessonStep[], position: number): LessonTry[] {
    const step = steps[position - 1];
    return step && step.try ? step.try : [];
}

/**
 * Which panels have arrived at `position`.
 *
 * The same rule the engine applies to objects, and it has to be: a panel no step
 * names is on screen from the start, and one a step reveals arrives at that step.
 * If this disagreed with the compiled `show` predicates the stage would arrange
 * a panel whose contents are hidden, or hide one it had made room for.
 */
export function revealedPanels(steps: LessonStep[], position: number, panels: string[]): string[] {
    const revealedAt: Record<string, number> = {};
    steps.forEach(function (step, i) {
        (step.reveal || []).forEach(function (name) {
            if (panels.indexOf(name) > -1 && !(name in revealedAt)) revealedAt[name] = i + 1;
        });
    });
    return panels.filter(key => !(key in revealedAt) || position >= revealedAt[key]);
}

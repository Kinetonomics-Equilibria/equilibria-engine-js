import type { StepDefinition } from 'equilibria-engine-js';
import type { Question } from '../quiz/grade';

/**
 * One ordered track: build-up, staged reveal and lesson, as the same thing.
 *
 * Step-by-step drawing is steps within one diagram; a panel arriving is a step
 * that reveals a panel; a lesson is the whole track with sentences attached.
 * Built separately they are three controls and three content formats, so this
 * is one list and one position, and free exploration is that position at its
 * end rather than a mode beside it.
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
 * Its prompt is the step's own `say`, not a field of its own: one sentence per
 * step, written one way. Where that sentence is *rendered* differs — a plain
 * step's goes to the narration strip and a question's goes to the question row,
 * because P10's arbitration would otherwise wipe the question off the screen
 * the moment the student moved something to answer it.
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
    /** A sentence for the student, shown in the narration strip. */
    say?: string;
    /** A question that stops the track until it is answered. */
    ask?: LessonQuestion;
}

export interface TrackState {
    /** Steps applied. 0 is before the first; `steps.length` is the end. */
    position: number;
    /** Indices of `ask` steps that have been answered. */
    resolved: number[];
}

export type TrackAction =
    | { type: 'goTo'; position: number }
    | { type: 'next' }
    | { type: 'back' }
    | { type: 'resolve'; index: number };

export const AT_START: TrackState = { position: 0, resolved: [] };

/** What a step does, for the marker that stands for it. */
export type StepKind = 'reveal' | 'set' | 'say' | 'ask';

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
            return { ...state, resolved: state.resolved.concat(action.index).sort((a, b) => a - b) };

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

/** The question the track is stopped on, or null. */
export function askAt(steps: LessonStep[], position: number): LessonQuestion | null {
    const step = steps[position - 1];
    return step && step.ask ? step.ask : null;
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

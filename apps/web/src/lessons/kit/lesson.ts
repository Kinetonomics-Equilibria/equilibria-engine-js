import { STEP_PARAM } from 'equilibria-engine-js';
import type { LessonStep } from '../../track/track';
import { candidatesOf } from '../../quiz/grade';
import { explainable } from '../content';
import type { PanelSpec, StudyContent, StudyModel } from '../content';
import { QUESTION_PARAMS, answerOf, startOf } from './question';

/**
 * A lesson, from what only its author can say (P16).
 *
 * Four lessons in, a quarter to a third of each was wiring: the question's
 * params, the change each panel's caption shows, and lists that had to agree
 * with something written elsewhere in the same file. Each lesson wrote its own
 * copy, and a fact written twice is a fact that will one day be written two
 * ways. `defineLesson` works those out from the rest, so a lesson is its words,
 * its steps and its model, and the model is its params, calcs and panels:
 *
 * - the question's params: the three every question shares, and a start and
 *   an answer for each param a step asks about, bounded like that param;
 * - which of them draws a question about which param (`questionApparatus`);
 * - the change calc for each panel's headline, `d` and its name (`dPe` for
 *   `Pe`), which the panel's caption chip shows;
 * - the calcs the Maths tab explains, unless the lesson chooses its own.
 *
 * What an author hands it is plain data — strings, numbers and arrays — so a
 * lesson can one day be read from a file a teacher edits, with a loader in
 * front of this rather than a rewrite.
 */

/** A param, as the engine takes it. */
export interface ParamDefinition {
    name: string;
    label?: string;
    value: number;
    min: number;
    max: number;
    round: number;
    presentation?: boolean;
}

/** A panel: what the app calls it and headlines it with, and what the engine draws in it. */
export interface PanelDefinition {
    key: string;
    /** The chart's title, over its plot: one to three words (docs/chart-design.md). */
    name: string;
    /** The calc its caption headlines, from the model's `narratedCalcs`. */
    headline: string;
    xAxis: object;
    yAxis: object;
    /** What is drawn in it, in the order it is drawn. */
    objects: object[];
}

/** A model, as an author writes it. See `StudyModel` for every field not here. */
export interface ModelSpec extends Omit<StudyModel, 'diagram' | 'panels' | 'explainedCalcs' | 'questionApparatus'> {
    /** The params a student moves. A question's own are worked out. */
    params: ParamDefinition[];
    /** The levels. A panel's change calc is worked out from its headline. */
    calcs: Record<string, string>;
    panels: PanelDefinition[];
    /**
     * The calcs the Maths tab explains, where a lesson chooses: every level,
     * by default. A lesson that gives its own says why beside them.
     */
    explainedCalcs?: Record<string, string>;
}

/** A lesson, as an author writes it. See `StudyContent` for every field not here. */
export interface LessonSpec extends Omit<StudyContent, 'lesson' | 'model'> {
    steps: LessonStep[];
    /** The diagram the lesson is drawn on. */
    model: ModelSpec;
}

const capitalised = (name: string) => name[0].toUpperCase() + name.slice(1);

/** The calc that says how far `headline` has moved since the snapshot: `dPe`. */
export const changeOf = (headline: string) => 'd' + capitalised(headline);

/**
 * The params a question can be about, in the order the model declares them:
 * every param a step's `ask` names, as its answer or among its choices.
 *
 * Every one a question offers needs drawing, not only the right one: a
 * student who moves the wrong curve is told it should have stayed where it
 * was, and its start line is where it was (P14).
 */
export function askedParams(steps: LessonStep[], params: ParamDefinition[]): string[] {
    const asked = steps.flatMap(step => step.ask ? candidatesOf(step.ask) : []);
    return params.map(p => p.name).filter(name => asked.indexOf(name) > -1);
}

export function defineLesson(spec: LessonSpec): StudyContent {
    const { steps, model, ...words } = spec;
    const { params, calcs, panels, explainedCalcs, ...said } = model;

    const asked = askedParams(steps, params);
    const named = (name: string) => params.filter(p => p.name === name)[0];

    const questionParams: ParamDefinition[] = [
        // Declared whether or not a step asks anything: the screen writes
        // them whenever it puts a question away, which it does on every load.
        ...QUESTION_PARAMS.map(name => ({ name, value: 0, min: 0, max: 1, round: 1, presentation: true })),
        // Bounded like the param each is a copy of, because each is drawn as
        // that param's curve is.
        ...asked.flatMap(name => {
            const { value, min, max, round } = named(name);
            return [startOf(name), answerOf(name)].map(copy => ({ name: copy, value, min, max, round, presentation: true }));
        })
    ];

    // The deltas are calcs like any other. `prev.calcs` is the state at the
    // last snapshot, the one the ghosts are drawn from, so a chip and a ghost
    // always describe the same movement.
    const changes: Record<string, string> = {};
    panels.forEach(panel => {
        changes[changeOf(panel.headline)] = `calcs.${panel.headline} - prev.calcs.${panel.headline}`;
    });

    const questionApparatus: StudyModel['questionApparatus'] = {};
    asked.forEach(name => { questionApparatus[name] = { start: startOf(name), answer: answerOf(name) } });

    const built: StudyModel = {
        ...said,
        diagram: {
            schema: 'EconSchema',
            params: [...params, ...questionParams],
            calcs: { ...calcs, ...changes },
            // The rects are missing on purpose. `Stage` computes them from the
            // space it is given and writes them in, which is what lets the
            // arrangement follow the viewport and a promotion be a param change
            // rather than a rebuild.
            layout: {
                CustomLayout: {
                    panels: panels.map(({ key, xAxis, yAxis, objects }) => ({ key, xAxis, yAxis, objects }))
                }
            }
        },
        panels: panels.map((panel): PanelSpec =>
            ({ key: panel.key, name: panel.name, headline: panel.headline, delta: changeOf(panel.headline) })),
        explainedCalcs: explainedCalcs || explainable(calcs),
        questionApparatus
    };

    return { ...words, lesson: steps, model: built };
}

/**
 * The number of the step titled `title`, counting the first as 1: the value
 * `params.step` has once that step is applied.
 *
 * Throws for a title no step has. `findIndex` would give -1, and the step
 * number 0, at which `params.step >= 0` is true from before the first step —
 * a thing meant to arrive at a step that is there all along, saying nothing.
 */
export function stepTitled(steps: LessonStep[], title: string): number {
    const index = steps.findIndex(step => step.title === title);
    if (index < 0) throw new Error(`No step is titled "${title}"`);
    return index + 1;
}

/** The number of the step that reveals `name`. Throws for a name no step reveals. */
export function stepRevealing(steps: LessonStep[], name: string): number {
    const index = steps.findIndex(step => (step.reveal || []).indexOf(name) > -1);
    if (index < 0) throw new Error(`No step reveals "${name}"`);
    return index + 1;
}

/** The number of the first step that asks a question. Throws for a lesson that asks none. */
export function firstQuestion(steps: LessonStep[]): number {
    const index = steps.findIndex(step => !!step.ask);
    if (index < 0) throw new Error('No step asks a question');
    return index + 1;
}

/** True from step `n` on: once it is applied, and at every step after it. */
export const fromStep = (n: number) => `params.${STEP_PARAM} >= ${n}`;

/** True before step `n` is applied. */
export const untilStep = (n: number) => `params.${STEP_PARAM} < ${n}`;

/** True at step `n` only. */
export const atStep = (n: number) => `params.${STEP_PARAM} == ${n}`;

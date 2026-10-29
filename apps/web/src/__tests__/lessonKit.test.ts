import { describe, it, expect } from 'vitest';
import {
    askedParams, atStep, defineLesson, firstQuestion, fromStep, stepRevealing, stepTitled, untilStep
} from '../lessons/kit/lesson';
import type { LessonSpec, ParamDefinition } from '../lessons/kit/lesson';
import { QUESTION_PARAMS, answerOf, questionState, startOf } from '../lessons/kit/question';
import type { LessonStep } from '../track/track';

/**
 * What `defineLesson` works out, so that a lesson does not write it (P16).
 *
 * Each case is a lesson as small as shows it: a model with a param or three,
 * a calc, a panel, and the steps that ask about them.
 */

const PRICE: ParamDefinition = { name: 'price', label: 'The price', value: 300, min: 200, max: 400, round: 10 };
const DEMAND: ParamDefinition = { name: 'demand', value: 200, min: 100, max: 300, round: 10 };
const HOURS: ParamDefinition = { name: 'h', value: 20, min: 10, max: 30, round: 1 };
const COFFEES: ParamDefinition = { name: 'C', value: 10, min: 5, max: 15, round: 0.5 };
const TOASTIES: ParamDefinition = { name: 'T', value: 5, min: 2.5, max: 7.5, round: 0.5 };

const asking = (param: string, among?: string[]): LessonStep =>
    ({ title: `Which way does ${param} go?`, ask: { param, direction: 'up', ...(among ? { among } : {}) } });

const lesson = (params: ParamDefinition[], steps: LessonStep[], extra: Partial<LessonSpec['model']> = {}) => defineLesson({
    id: 'small', label: 'Small', title: 'A small lesson', goals: ['One', 'Two'],
    steps,
    model: {
        id: 'small', name: 'A small model',
        params,
        calcs: { q: 'params.demand - (params.price - 300)', Qd: 'calcs.q' },
        panels: [{ key: 'market', name: 'Market', headline: 'Qd', xAxis: {}, yAxis: {}, objects: [] }],
        narratedCalcs: [{ name: 'Qd', label: 'Quantity demanded' }],
        scenarios: [],
        ...extra
    }
});

const paramsOf = (built: ReturnType<typeof lesson>) => built.model.diagram.params as ParamDefinition[];
const named = (built: ReturnType<typeof lesson>, name: string) => paramsOf(built).filter(p => p.name === name)[0];

describe('the question\'s params', () => {

    it('are the three every question shares, and a start and an answer for the one it asks about', () => {
        const built = lesson([PRICE, DEMAND], [asking('demand')]);
        expect(paramsOf(built).map(p => p.name)).toEqual([
            'price', 'demand', 'asking', 'submitted', 'revealed', 'startDemand', 'answerDemand'
        ]);
        expect(built.model.questionApparatus).toEqual({ demand: { start: 'startDemand', answer: 'answerDemand' } });
    });

    it('are bounded like the param they copy, are presentation, and are not labelled', () => {
        const built = lesson([PRICE, DEMAND], [asking('price', ['price', 'demand'])]);
        ['startPrice', 'answerPrice'].forEach(name => {
            expect(named(built, name)).toEqual({ name, value: 300, min: 200, max: 400, round: 10, presentation: true });
        });
        QUESTION_PARAMS.forEach(name => {
            expect(named(built, name)).toEqual({ name, value: 0, min: 0, max: 1, round: 1, presentation: true });
        });
    });

    // A student who moves the wrong curve is told it should have stayed where
    // it was, and its start line is where it was.
    it('count a param a question offers but is not about', () => {
        const built = lesson([PRICE, DEMAND], [asking('demand', ['price', 'demand'])]);
        expect(Object.keys(built.model.questionApparatus)).toEqual(['price', 'demand']);
        expect(askedParams([asking('demand', ['price', 'demand'])], [PRICE, DEMAND])).toEqual(['price', 'demand']);
    });

    it('come in the order the model declares its params, whatever order they are asked in', () => {
        const built = lesson([HOURS, COFFEES, TOASTIES], [asking('T'), asking('h'), asking('C')]);
        expect(paramsOf(built).map(p => p.name).slice(3 + QUESTION_PARAMS.length)).toEqual([
            'startH', 'answerH', 'startC', 'answerC', 'startT', 'answerT'
        ]);
        expect(named(built, 'answerT')).toEqual(
            { name: 'answerT', value: 5, min: 2.5, max: 7.5, round: 0.5, presentation: true });
    });

    it('leave a param nobody asks about alone, and still declare the three', () => {
        const built = lesson([PRICE, DEMAND], [{ title: 'Nothing asked' }]);
        expect(paramsOf(built).map(p => p.name)).toEqual(['price', 'demand', 'asking', 'submitted', 'revealed']);
        expect(built.model.questionApparatus).toEqual({});
    });

    it('are written by name from one list the screen uses too', () => {
        expect(questionState({ revealed: 1, asking: 1 })).toEqual([
            { name: 'asking', value: 1 }, { name: 'revealed', value: 1 }
        ]);
        expect(startOf('a')).toBe('startA');
        expect(answerOf('demand')).toBe('answerDemand');
    });
});

describe('the rest of the model', () => {

    it('has a change calc for each panel\'s headline, and the panel shows it', () => {
        const built = lesson([PRICE, DEMAND], []);
        expect((built.model.diagram.calcs as Record<string, string>).dQd).toBe('calcs.Qd - prev.calcs.Qd');
        expect(built.model.panels).toEqual([{ key: 'market', name: 'Market', headline: 'Qd', delta: 'dQd' }]);
    });

    it('explains every level by default, and keeps the calcs a lesson chooses', () => {
        expect(lesson([PRICE, DEMAND], []).model.explainedCalcs).toEqual({
            q: 'params.demand - (params.price - 300)', Qd: 'calcs.q'
        });
        expect(lesson([PRICE, DEMAND], [], { explainedCalcs: { Qd: 'calcs.q' } }).model.explainedCalcs)
            .toEqual({ Qd: 'calcs.q' });
    });

    it('hands the engine only what it draws: the panel\'s name and headline are the app\'s', () => {
        const built = lesson([PRICE, DEMAND], []);
        expect((built.model.diagram.layout as any).CustomLayout.panels).toEqual([
            { key: 'market', xAxis: {}, yAxis: {}, objects: [] }
        ]);
        expect(built.model.diagram.steps).toBeUndefined();
    });
});

describe('a step, by its title', () => {

    const STEPS: LessonStep[] = [
        { title: 'One', reveal: ['demand'] },
        { title: 'Two' },
        { title: 'Three', ask: { param: 'demand', direction: 'up' } }
    ];

    it('is numbered from 1, as `params.step` counts', () => {
        expect(stepTitled(STEPS, 'Two')).toBe(2);
        expect(stepRevealing(STEPS, 'demand')).toBe(1);
        expect(firstQuestion(STEPS)).toBe(3);
    });

    // `findIndex` gives -1, and the step number 0, where `params.step >= 0`
    // is true from the start: a thing meant to arrive that is there all along.
    it('throws for a title, a name or a question that is not there', () => {
        expect(() => stepTitled(STEPS, 'Four')).toThrow(/Four/);
        expect(() => stepRevealing(STEPS, 'supply')).toThrow(/supply/);
        expect(() => firstQuestion(STEPS.slice(0, 2))).toThrow();
    });

    it('gives the expressions a lesson writes', () => {
        expect(fromStep(2)).toBe('params.step >= 2');
        expect(untilStep(2)).toBe('params.step < 2');
        expect(atStep(2)).toBe('params.step == 2');
    });
});

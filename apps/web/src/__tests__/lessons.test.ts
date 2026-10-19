import { describe, it, expect } from 'vitest';
import type { ParamInfo } from 'equilibria-engine-js';
import { LESSONS, lessonById } from '../lessons';
import type { StudyContent } from '../lessons';
import { paramsAt } from '../track/track';
import { candidatesOf, nearestAchievable, validateChoice, validateQuestion } from '../quiz/grade';
import { parkApparatus } from '../quiz/apparatus';
import { verdictFor } from '../quiz/verdict';
import { grade } from '../quiz/grade';

/**
 * Every lesson, held to the things a lesson can get wrong without anything
 * failing on screen.
 *
 * Each check here is a mistake that renders: a step revealing a name nothing
 * answers to does nothing, a scenario naming a param the diagram lacks is
 * disabled with a red note, a question nobody can answer looks exactly like a
 * student who cannot do economics, and a sentence too long for the strip is
 * cut off at an ellipsis. None of them throws. So they are checked over the
 * lesson as data, for every lesson the app offers — the second lesson is the
 * reason this exists, and the third will be the reason it pays.
 */

interface ParamDef {
    name: string;
    value: number;
    min: number;
    max: number;
    round: number;
    presentation?: boolean;
    label?: string;
}

const paramsOf = (lesson: StudyContent) => (lesson.diagram.params as ParamDef[]);

const paramNamed = (lesson: StudyContent, name: string) =>
    paramsOf(lesson).filter(p => p.name === name)[0];

/** What the engine would report for a declared param, near enough to mark against. */
function infoOf(def: ParamDef, value = def.value): ParamInfo {
    const decimals = (String(def.round).split('.')[1] || '').length;
    return {
        name: def.name, label: def.label || def.name, value,
        min: def.min, max: def.max, round: def.round, precision: decimals,
        presentation: !!def.presentation, isBoolean: false
    };
}

/** Every object name in every panel, and every panel key: what a step can reveal. */
function revealable(lesson: StudyContent): Set<string> {
    const layout = (lesson.diagram.layout as any).CustomLayout;
    const names = new Set<string>();
    layout.panels.forEach((panel: any) => {
        names.add(panel.key);
        panel.objects.forEach((object: any) => {
            if (object.def && object.def.name) names.add(object.def.name);
        });
    });
    return names;
}

const onGrid = (def: ParamDef, value: number) =>
    Math.abs(nearestAchievable(infoOf(def), value) - value) < 1e-9;

/**
 * The most a step's sentence can say on one line of the narration strip.
 *
 * The strip is one line that never grows — growing would take height from the
 * stage and rebuild the engine — so a longer sentence is cut off at an ellipsis.
 * Measured: the strip's sentence is about 760px wide at its narrowest beside the
 * dock (a 1100px window) and the sans-serif runs a little over 6px a character.
 * A question's prompt is exempt: it sits in the question row, which wraps.
 */
const STRIP_CHARACTERS = 120;

describe.each(LESSONS.map(lesson => [lesson.id, lesson] as const))('the "%s" lesson', (_id, lesson) => {

    it('hands the engine the very steps the screen walks', () => {
        expect(lesson.diagram.steps).toBe(lesson.lesson);
    });

    it('reveals only things that exist', () => {
        const known = revealable(lesson);
        lesson.lesson.forEach((step, i) => {
            (step.reveal || []).forEach(name => {
                expect(known.has(name), `step ${i + 1} reveals "${name}"`).toBe(true);
            });
        });
    });

    it('sets only params it declares, inside their ranges and on their grid', () => {
        lesson.lesson.forEach((step, i) => {
            Object.keys(step.set || {}).forEach(name => {
                const def = paramNamed(lesson, name), value = (step.set as Record<string, number>)[name];
                expect(def, `step ${i + 1} sets "${name}"`).toBeDefined();
                expect(value).toBeGreaterThanOrEqual(def.min);
                expect(value).toBeLessThanOrEqual(def.max);
                expect(onGrid(def, value), `step ${i + 1} sets ${name} = ${value}, off its grid`).toBe(true);
            });
        });
    });

    it('says each step\'s sentence in one line of the strip', () => {
        lesson.lesson.forEach((step, i) => {
            if (!step.say || step.ask) return;
            expect(step.say.length, `step ${i + 1}: "${step.say}"`).toBeLessThanOrEqual(STRIP_CHARACTERS);
        });
    });

    it('asks only questions a student can answer, about params it can draw', () => {
        lesson.lesson.forEach((step, i) => {
            if (!step.ask) return;
            const def = paramNamed(lesson, step.ask.param);
            // Where the question starts is wherever the steps up to it left
            // that param — which is the value the screen arms it from.
            const start = paramsAt(lesson.lesson, i + 1)[step.ask.param] ?? (def ? def.value : 0);

            expect(validateQuestion(step.ask, def ? infoOf(def, start) : undefined, start),
                `question at step ${i + 1}`).toEqual([]);

            // Every curve it offers, not only the right one, needs a start line:
            // a student who moves the wrong curve is told it should have stayed
            // where it was, and the dashed line is where it was (P14).
            const offered = candidatesOf(step.ask);
            const infos = offered
                .map(name => paramNamed(lesson, name))
                .filter(Boolean)
                .map(def => infoOf(def, paramsAt(lesson.lesson, i + 1)[def.name] ?? def.value));
            expect(validateChoice(step.ask, infos), `question at step ${i + 1}`).toEqual([]);

            offered.forEach(param => {
                const apparatus = lesson.questionApparatus[param];
                expect(apparatus, `no apparatus draws "${param}"`).toBeDefined();
                [apparatus.start, apparatus.answer].forEach(name => {
                    const drawn = paramNamed(lesson, name);
                    expect(drawn, `apparatus param "${name}"`).toBeDefined();
                    expect(drawn.presentation, `"${name}" must be presentation`).toBe(true);
                });
            });
        });
    });

    /**
     * A question that asks which curve moves cannot name it in its prompt.
     *
     * Nothing fails on screen when it does — the question is simply half as
     * hard as it says, which is how the A$ lesson's first draft read ("Move
     * demand for A$, then check"). The labels are the sliders' names, so a
     * prompt that used one would be pointing at a control — and naming the
     * curve that should stay put gives the answer away just as surely.
     */
    it('keeps the choice out of the prompt of a question that offers one', () => {
        lesson.lesson.forEach((step, i) => {
            if (!step.ask || candidatesOf(step.ask).length < 2) return;
            candidatesOf(step.ask).forEach(name => {
                const def = paramNamed(lesson, name);
                const label = (def && def.label ? def.label : name).toLowerCase();
                expect((step.say || '').toLowerCase(), `step ${i + 1} names "${label}"`).not.toContain(label);
            });
        });
    });

    it('offers scenarios the diagram can apply', () => {
        lesson.scenarios.forEach(scenario => {
            Object.keys(scenario.params).forEach(name => {
                const def = paramNamed(lesson, name), value = scenario.params[name];
                expect(def, `scenario "${scenario.label}" sets "${name}"`).toBeDefined();
                expect(value).toBeGreaterThanOrEqual(def.min);
                expect(value).toBeLessThanOrEqual(def.max);
                expect(onGrid(def, value), `scenario "${scenario.label}" is off ${name}'s grid`).toBe(true);
            });
        });
    });

    it('captions each panel with a number it narrates, and a change it computes', () => {
        const calcs = lesson.diagram.calcs as Record<string, string>;
        const narrated = lesson.narratedCalcs.map(c => c.name);
        lesson.panels.forEach(panel => {
            expect(narrated, `panel "${panel.key}" headlines "${panel.headline}"`).toContain(panel.headline);
            expect(calcs[panel.delta], `panel "${panel.key}" delta "${panel.delta}"`).toBeDefined();
        });
        narrated.forEach(name => expect(calcs[name], `narrated calc "${name}"`).toBeDefined());
    });
});

describe('finding a lesson by its address', () => {

    it('opens the lesson an id names', () => {
        expect(lessonById('fx').id).toBe('fx');
        expect(lessonById('market').id).toBe('market');
    });

    it('opens the first lesson for an id that names nothing, rather than nothing', () => {
        expect(lessonById('nonsense')).toBe(LESSONS[0]);
        expect(lessonById(null)).toBe(LESSONS[0]);
    });

    it('gives every lesson its own address', () => {
        const ids = LESSONS.map(l => l.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
});

describe('the other curves\' question apparatus', () => {

    const apparatus = {
        demand: { start: 'startDemand', answer: 'answerDemand' },
        supply: { start: 'startSupply', answer: 'answerSupply' }
    };

    it('is parked on the other curve, start and answer both', () => {
        const values = [{ name: 'demand', value: 50 }, { name: 'supply', value: 44 }];
        expect(parkApparatus('demand', apparatus, values)).toEqual([
            { name: 'startSupply', value: 44 },
            { name: 'answerSupply', value: 44 }
        ]);
    });

    it('leaves the asked curve\'s own apparatus to the question', () => {
        const values = [{ name: 'demand', value: 50 }, { name: 'supply', value: 44 }];
        const written = parkApparatus('supply', apparatus, values).map(p => p.name);
        expect(written).toEqual(['startDemand', 'answerDemand']);
    });

    it('writes nothing for a diagram with one askable param', () => {
        expect(parkApparatus('a', { a: { start: 'startA', answer: 'answerA' } },
            [{ name: 'a', value: 20 }])).toEqual([]);
    });
});

describe('a verdict about a curve that moves sideways', () => {

    const fx = lessonById('fx');
    const demand = infoOf(paramNamed(fx, 'demand'));
    const words = fx.directionWords!.demand;
    const RIGHT = { param: 'demand', direction: 'up' as const };

    it('says which way the student moved it in the lesson\'s words', () => {
        expect(verdictFor(RIGHT, grade(RIGHT, 50, 60, demand), 60, demand, words).direction)
            .toBe('Right direction — you moved it right.');
        expect(verdictFor(RIGHT, grade(RIGHT, 50, 40, demand), 40, demand, words).direction)
            .toBe('Wrong direction — you moved it left, and it should go right.');
    });

    it('still says up and down for a lesson that gives no words', () => {
        expect(verdictFor(RIGHT, grade(RIGHT, 50, 60, demand), 60, demand).direction)
            .toBe('Right direction — you moved it up.');
    });
});

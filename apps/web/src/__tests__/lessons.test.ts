import { describe, it, expect } from 'vitest';
import type { ParamInfo } from 'equilibria-engine-js';
import { LESSONS, lessonById } from '../lessons';
import type { StudyContent } from '../lessons';
import { paramsAt, partsOf, revealedPanels } from '../track/track';
import { candidatesOf, nearestAchievable, validateChoice, validateQuestion } from '../quiz/grade';
import { parkApparatus } from '../quiz/apparatus';
import { verdictFor } from '../quiz/verdict';
import { grade } from '../quiz/grade';
import katex from 'katex';
import {
    lessonSymbols, referencesOf, toResultTex, toSubstitutedTex, toSymbolicTex, toWorkingTex
} from '../dock/mathsText';
import type { NarratedCalc } from '../narration/narrate';

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
 * How much a step may say: the chunking the lesson card is built for, held.
 *
 * One idea per step, said in a short title and at most two short paragraphs —
 * what happens, then what it means. The limits are generous for a sentence
 * and tight for a lecture: a paragraph of 220 characters is about six lines of
 * the card at its narrowest, 320px, and two of them, a title and a key term still
 * fit a laptop's column without scrolling. A step that needs more is two
 * steps. A title is read on the progress bar's markers as well as over the
 * words, so it is a few words, not a sentence.
 */
const TITLE_CHARACTERS = 40;
const PARAGRAPHS = 2;
const PARAGRAPH_CHARACTERS = 220;
/** An explanation is shown under a verdict, in a smaller box than the step's words. */
const EXPLAIN_CHARACTERS = 200;
/** Alt text is read in one breath by a screen reader: what the picture shows, not all of it. */
const ALT_CHARACTERS = 250;
/** A cover's question is its headline: one line at a laptop's stage width. */
const COVER_QUESTION_CHARACTERS = 60;

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

    // The card holds no instruments, so what a step hands the student is all
    // they can move from it: it has to be a param the diagram has, named in
    // words, and not a second set of controls beside a question's own.
    it('hands the student only params it declares, and never beside a question', () => {
        lesson.lesson.forEach((step, i) => {
            (step.try || []).forEach(offered => {
                expect(paramNamed(lesson, offered.param), `step ${i + 1} offers "${offered.param}"`).toBeDefined();
                expect(offered.label, `step ${i + 1} offers "${offered.param}" unnamed`).toBeTruthy();
            });
            expect(!!step.ask && !!step.try, `step ${i + 1} asks and offers controls too`).toBe(false);
        });
    });

    it('gives every step a short title', () => {
        lesson.lesson.forEach((step, i) => {
            expect(step.title, `step ${i + 1} has no title`).toBeTruthy();
            expect(step.title!.length, `step ${i + 1}: "${step.title}"`).toBeLessThanOrEqual(TITLE_CHARACTERS);
        });
    });

    it('says one idea per step, in at most two short paragraphs', () => {
        lesson.lesson.forEach((step, i) => {
            const paragraphs = (step.say || '').split(/\n\s*\n/);
            expect(paragraphs.length, `step ${i + 1}`).toBeLessThanOrEqual(PARAGRAPHS);
            paragraphs.forEach(p => {
                expect(p.length, `step ${i + 1}: "${p}"`).toBeLessThanOrEqual(PARAGRAPH_CHARACTERS);
            });
        });
    });

    // A word defined twice is a word the second step did not trust the first
    // to have taught, and a second box saying the same thing.
    it('defines each key term once', () => {
        const words = lesson.lesson.filter(step => step.term).map(step => step.term!.word);
        expect(new Set(words).size).toBe(words.length);
    });

    it('groups its steps into a few named parts, starting with the first', () => {
        const parts = partsOf(lesson.lesson);
        expect(lesson.lesson[0].part, 'the first step names its part').toBeTruthy();
        expect(parts.length).toBeGreaterThanOrEqual(2);
        expect(parts.length).toBeLessThanOrEqual(4);
    });

    // A right answer reached by luck and a student who pressed "Show me" are
    // both missing the same thing: why.
    it('explains every question once it is finished', () => {
        lesson.lesson.forEach((step, i) => {
            if (!step.ask) return;
            expect(step.ask.explain, `question at step ${i + 1}`).toBeTruthy();
            expect(step.ask.explain!.length, `question at step ${i + 1}`).toBeLessThanOrEqual(EXPLAIN_CHARACTERS);
        });
    });

    // A recap looks back over questions, so it comes after one; its rule is a
    // paragraph, like a step's; and the diagram is under it, so it asks
    // nothing of the diagram either.
    it('recaps only after a question, in a paragraph, asking nothing of the diagram', () => {
        lesson.lesson.forEach((step, i) => {
            if (!step.recap) return;
            expect(lesson.lesson.slice(0, i).some(earlier => !!earlier.ask), `step ${i + 1} recaps nothing`)
                .toBe(true);
            expect(step.recap.takeaway.length, `step ${i + 1}'s takeaway`).toBeLessThanOrEqual(PARAGRAPH_CHARACTERS);
            expect(step.ask || step.try || step.picture || step.reveal, `step ${i + 1} recaps and more`)
                .toBeFalsy();
        });
    });

    it('says what the student will learn, before the first step', () => {
        expect(lesson.goals.length).toBeGreaterThanOrEqual(2);
        expect(lesson.goals.length).toBeLessThanOrEqual(4);
    });

    // The cover is read once, by someone deciding whether to start: a question
    // on a line, and a paragraph no longer than one of a step's. It must not
    // say the lesson's title over again — the title is over the stage already,
    // and a heading containing it is a second heading by that name.
    it('asks its question on the cover in a line, and says why in a paragraph', () => {
        if (!lesson.cover) return;
        const { question, hook } = lesson.cover;
        expect(question.endsWith('?'), question).toBe(true);
        expect(question.length, question).toBeLessThanOrEqual(COVER_QUESTION_CHARACTERS);
        expect(question.indexOf(lesson.title), question).toBe(-1);
        expect(hook.split(/\n\s*\n/).length, hook).toBe(1);
        expect(hook.length, hook).toBeLessThanOrEqual(PARAGRAPH_CHARACTERS);
    });

    it('shows only pictures it has, and says what each one shows', () => {
        const pictures = lesson.pictures || {};
        const named = (lesson.cover && lesson.cover.picture ? [lesson.cover.picture] : [])
            .concat(lesson.lesson.filter(step => step.picture).map(step => step.picture!));
        named.forEach(key => expect(pictures[key], `the lesson shows "${key}"`).toBeDefined());
        Object.keys(pictures).forEach(key => {
            expect(pictures[key].alt.trim(), `"${key}" has no alt text`).toBeTruthy();
            expect(pictures[key].alt.length, `"${key}"'s alt text`).toBeLessThanOrEqual(ALT_CHARACTERS);
            expect(pictures[key].name.trim(), `"${key}" has no name`).toBeTruthy();
        });
    });

    // An animated SVG or GIF cannot be paused in an <img>, so a step's picture
    // in either format without a still may be one that moves with no way to
    // stop it (WCAG 2.2.2). The cover shows its picture's still if it has one,
    // and is not held to this: a cover is read, not watched.
    it('gives every step picture that could move a still to pause on', () => {
        const pictures = lesson.pictures || {};
        lesson.lesson.forEach((step, i) => {
            const picture = step.picture ? pictures[step.picture] : undefined;
            if (picture && /\.(svg|gif)(\?|$)/i.test(picture.src)) {
                expect(picture.still, `step ${i + 1}'s picture has no still`).toBeTruthy();
            }
        });
    });

    // The diagram is under the picture, so a step that shows one has nothing
    // on the stage to draw, try or answer.
    it('shows a picture only at a step that asks nothing of the diagram', () => {
        lesson.lesson.forEach((step, i) => {
            if (!step.picture) return;
            expect(step.reveal, `step ${i + 1} reveals under its picture`).toBeUndefined();
            expect(step.try, `step ${i + 1} offers controls under its picture`).toBeUndefined();
            expect(step.ask, `step ${i + 1} asks under its picture`).toBeUndefined();
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
            // A report beside the question is part of its prompt.
            const told = step.aside && lesson.asides ? lesson.asides[step.aside] : undefined;
            const prompt = [step.say, told && told.headline, told && told.body].filter(Boolean).join(' ');
            candidatesOf(step.ask).forEach(name => {
                const def = paramNamed(lesson, name);
                const label = (def && def.label ? def.label : name).toLowerCase();
                expect(prompt.toLowerCase(), `step ${i + 1} names "${label}"`).not.toContain(label);
            });
        });
    });

    // A focus on a panel the stage has not arranged yet is quietly ignored:
    // the stage puts the first panel that has arrived at the front instead.
    it('brings to the front only a panel it has, once it has arrived', () => {
        const keys = lesson.panels.map(p => p.key);
        lesson.lesson.forEach((step, i) => {
            if (!step.focus) return;
            expect(keys, `step ${i + 1} focuses "${step.focus}"`).toContain(step.focus);
            expect(revealedPanels(lesson.lesson, i + 1, keys), `step ${i + 1} focuses "${step.focus}" early`)
                .toContain(step.focus);
        });
    });

    it('shows beside a step only reports it has', () => {
        lesson.lesson.forEach((step, i) => {
            if (!step.aside) return;
            const told = (lesson.asides || {})[step.aside];
            expect(told, `step ${i + 1} shows "${step.aside}"`).toBeDefined();
            expect(told.headline.trim() && told.body.trim(), `"${step.aside}" says nothing`).toBeTruthy();
            if (told.picture) expect((lesson.pictures || {})[told.picture], `"${step.aside}"'s picture`).toBeDefined();
            // A report is a panel's name on the stage beside the diagram's own:
            // it cannot share a key with one.
            expect(lesson.panels.some(p => p.key === step.aside), `"${step.aside}" is a panel's key`).toBe(false);
        });
    });

    // "What changed" marks a cause in its curve's colour, and the curves it
    // moved in the same one beside the first of them, so that is a claim about
    // everything the param draws in the first panel it draws in — and a marker
    // in the wrong colour renders as happily as the right. A later panel may
    // show the same trades from the other side, where the param moves a curve
    // of the other kind in that kind's colour (the FX lesson's USD market):
    // still one of the lesson's curve colours, never a raw one.
    it('names, for each param it colours, the colour of everything that param draws first', () => {
        const panels = (lesson.diagram.layout as any).CustomLayout.panels as any[];
        const words = Object.values(lesson.paramWords || {});
        const curveColours = words.filter(w => w.curve).map(w => `colors.${w.curve}`);
        Object.keys(lesson.paramWords || {}).forEach(name => {
            const curve = lesson.paramWords![name].curve;
            if (!curve) return;
            const mentions = new RegExp(`params\\.${name}\\b`);
            const drawnIn = panels
                .map(panel => (panel.objects as any[]).filter(object => mentions.test(JSON.stringify(object.def))))
                .filter(drawn => drawn.length > 0);
            expect(drawnIn.length, `param "${name}" draws something`).toBeGreaterThan(0);
            drawnIn[0].forEach(object => {
                expect(object.def.color, `"${object.def.name}", drawn by "${name}"`).toBe(`colors.${curve}`);
            });
            drawnIn.slice(1).flat().forEach(object => {
                expect(curveColours, `"${object.def.name}", drawn by "${name}"`).toContain(object.def.color);
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

    // What the Maths instrument sets for every calc it explains, built as it
    // builds it, with every value a 1 — the TeX does not depend on the numbers,
    // and a lesson's calcs are only numbers once an engine has solved them.
    // KaTeX renders an error in red rather than throwing, so a calc that
    // typeset into nonsense would look, to everything but this, like maths.
    it('typesets every calc it explains, in its own symbols', () => {
        const narrated: Record<string, NarratedCalc> = {};
        lesson.narratedCalcs.forEach(c => { narrated[c.name] = c });
        const symbols = lessonSymbols(narrated);
        const ones = (expression: string) => {
            const out: Record<string, number> = {};
            referencesOf(expression).forEach(r => { out[r.name] = 1 });
            return out;
        };

        Object.keys(lesson.explainedCalcs).forEach(name => {
            const expression = lesson.explainedCalcs[name];
            const formula = toSymbolicTex(expression, symbols);
            const substituted = toSubstitutedTex(expression, ones(expression), ones(expression), null, () => 2);
            expect(formula, `calc "${name}" parses`).not.toBeNull();
            expect(substituted, `calc "${name}" substitutes`).not.toBeNull();

            const tex = toWorkingTex(symbols('calcs', name), [formula, substituted, toResultTex(1, 2)]);
            expect(() => katex.renderToString(tex, { throwOnError: true, displayMode: true }), tex).not.toThrow();
            // Every calc it uses is written as the lesson writes it, not by key.
            referencesOf(expression).filter(r => r.scope === 'calcs').forEach(r => {
                expect(lesson.narratedCalcs.map(c => c.name), `calc "${name}" uses "${r.name}"`).toContain(r.name);
            });
            expect(narrated[name], `calc "${name}" is named`).toBeDefined();
        });
    });

    // The key above the formulas says what each letter means. A letter with
    // nothing to say is left out of it, which is right for a param and wrong
    // for a lesson: it is a letter in a formula that nothing explains.
    it('says what every letter in its formulas means', () => {
        const meanings = lesson.paramMeanings || {};
        Object.keys(lesson.explainedCalcs).forEach(name => {
            referencesOf(lesson.explainedCalcs[name]).filter(r => r.scope === 'params').forEach(r => {
                const def = paramNamed(lesson, r.name);
                expect(meanings[r.name] || (def.label !== undefined && def.label !== def.name),
                    `param "${r.name}" in calc "${name}"`).toBeTruthy();
            });
        });
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
            .toBe('You moved it right, which is the right direction.');
        expect(verdictFor(RIGHT, grade(RIGHT, 50, 40, demand), 40, demand, words).direction)
            .toBe('You moved it left, but this change moves it right.');
    });

    it('still says up and down for a lesson that gives no words', () => {
        expect(verdictFor(RIGHT, grade(RIGHT, 50, 60, demand), 60, demand).direction)
            .toBe('You moved it up, which is the right direction.');
    });
});

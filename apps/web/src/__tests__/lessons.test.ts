import { describe, it, expect } from 'vitest';
import type { ParamInfo } from 'equilibria-engine-js';
import { CURRICULUM, LESSONS, MODELS, lessonById, modelById, modelsOf, topicOfModel } from '../lessons';
import type { StudyModel } from '../lessons';
import { TEMPLATE } from '../lessons/_template';
import { paramsAt, partsOf, revealedPanels } from '../track/track';
import { candidatesOf, nearestAchievable, validateChoice, validateQuestion } from '../quiz/grade';
import { parkApparatus } from '../quiz/apparatus';
import { verdictFor } from '../quiz/verdict';
import { grade } from '../quiz/grade';
import katex from 'katex';
import {
    lessonSymbols, referencesOf, toResultTex, toSubstitutedTex, toSymbolicTex, toWorkingTex
} from '../dock/mathsText';
import { formatValue } from '../narration/narrate';
import type { NarratedCalc } from '../narration/narrate';

/**
 * Every lesson, and every model one is drawn on, held to the things either can
 * get wrong without anything failing on screen.
 *
 * Each check here is a mistake that renders: a step revealing a name nothing
 * answers to does nothing, a scenario naming a param the diagram lacks is
 * disabled with a red note, a question nobody can answer looks exactly like a
 * student who cannot do economics, and a sentence too long for the strip is
 * cut off at an ellipsis. None of them throws. So they are checked over the
 * lesson as data, for every lesson the app offers — the second lesson is the
 * reason this exists, and the third will be the reason it pays.
 *
 * And for the template (`lessons/_template`), which no student sees: it is the
 * lesson a new one is copied from, so it is held to everything a listed one is.
 */

interface ParamDef {
    name: string;
    value: number;
    min: number;
    max: number;
    round: number;
    precision?: number;
    presentation?: boolean;
    label?: string;
}

const paramsOf = (model: StudyModel) => (model.diagram.params as ParamDef[]);

const paramNamed = (model: StudyModel, name: string) =>
    paramsOf(model).filter(p => p.name === name)[0];

/** What the engine would report for a declared param, near enough to mark against. */
function infoOf(def: ParamDef, value = def.value): ParamInfo {
    const decimals = (String(def.round).split('.')[1] || '').length;
    return {
        name: def.name, label: def.label || def.name, value,
        min: def.min, max: def.max, round: def.round,
        precision: def.precision === undefined ? decimals : def.precision,
        presentation: !!def.presentation, isBoolean: false
    };
}

/** Every object name in every panel, and every panel key: what a step can reveal. */
function revealable(model: StudyModel): Set<string> {
    const layout = (model.diagram.layout as any).CustomLayout;
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

describe.each([...LESSONS, TEMPLATE].map(lesson => [lesson.id, lesson] as const))('the "%s" lesson', (_id, lesson) => {

    const { model } = lesson;

    it('reveals only things that exist', () => {
        const known = revealable(model);
        lesson.lesson.forEach((step, i) => {
            (step.reveal || []).forEach(name => {
                expect(known.has(name), `step ${i + 1} reveals "${name}"`).toBe(true);
            });
        });
    });

    it('sets only params it declares, inside their ranges and on their grid', () => {
        lesson.lesson.forEach((step, i) => {
            Object.keys(step.set || {}).forEach(name => {
                const def = paramNamed(model, name), value = (step.set as Record<string, number>)[name];
                expect(def, `step ${i + 1} sets "${name}"`).toBeDefined();
                expect(value).toBeGreaterThanOrEqual(def.min);
                expect(value).toBeLessThanOrEqual(def.max);
                expect(onGrid(def, value), `step ${i + 1} sets ${name} = ${value}, off its grid`).toBe(true);
            });
        });
    });

    // "What changed" prints a param at its precision, which is its `round`'s
    // unless it says otherwise: a price in 10c steps came out "4.5 → 5.5"
    // under a step that said "$5.50". So a price a step sets, and says in
    // dollars and cents, is printed in dollars and cents.
    it('prints a price a step sets as the step says it, in dollars and cents', () => {
        lesson.lesson.forEach((step, i) => {
            Object.keys(step.set || {}).forEach(name => {
                const value = (step.set as Record<string, number>)[name], cents = value.toFixed(2);
                if ((step.say || '').indexOf('$' + cents) < 0) return;
                expect(formatValue(value, infoOf(paramNamed(model, name)).precision), `step ${i + 1}'s ${name}`)
                    .toBe(cents);
            });
        });
    });

    // The card holds no instruments, so what a step hands the student is all
    // they can move from it: it has to be a param the diagram has, named in
    // words, and not a second set of controls beside a question's own.
    it('hands the student only params it declares, and never beside a question', () => {
        lesson.lesson.forEach((step, i) => {
            (step.try || []).forEach(offered => {
                expect(paramNamed(model, offered.param), `step ${i + 1} offers "${offered.param}"`).toBeDefined();
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
            const def = paramNamed(model, step.ask.param);
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
                .map(name => paramNamed(model, name))
                .filter(Boolean)
                .map(def => infoOf(def, paramsAt(lesson.lesson, i + 1)[def.name] ?? def.value));
            expect(validateChoice(step.ask, infos), `question at step ${i + 1}`).toEqual([]);

            offered.forEach(param => {
                const apparatus = model.questionApparatus[param];
                expect(apparatus, `no apparatus draws "${param}"`).toBeDefined();
                [apparatus.start, apparatus.answer].forEach(name => {
                    const drawn = paramNamed(model, name);
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
                const def = paramNamed(model, name);
                const label = (def && def.label ? def.label : name).toLowerCase();
                expect(prompt.toLowerCase(), `step ${i + 1} names "${label}"`).not.toContain(label);
            });
        });
    });

    // A focus on a panel the stage has not arranged yet is quietly ignored:
    // the stage puts the first panel that has arrived at the front instead.
    it('brings to the front only a panel it has, once it has arrived', () => {
        const keys = model.panels.map(p => p.key);
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
            expect(model.panels.some(p => p.key === step.aside), `"${step.aside}" is a panel's key`).toBe(false);
        });
    });
});

describe.each([...MODELS, TEMPLATE.model].map(model => [model.id, model] as const))('the "%s" model', (_id, model) => {

    // The steps are a lesson's, and the screen adds them to the config it
    // hands the engine. A model with steps of its own would hide what they
    // reveal from a student who has the diagram with no lesson running.
    it('leaves its steps to the lessons drawn on it', () => {
        expect(model.diagram.steps).toBeUndefined();
    });

    // The engine keeps the first of two objects with one name, warns, and
    // shares its calcs with the second. The kit names a question's lines for
    // the param they draw, so a curve asked about in two panels was one pair
    // of lines twice, and nothing on screen said so.
    it('gives every object a name of its own', () => {
        const panels = (model.diagram.layout as any).CustomLayout.panels as any[];
        const names = panels.flatMap(panel => (panel.objects as any[]).map(object => object.def && object.def.name))
            .filter(name => !!name);
        expect(names.filter((name, i) => names.indexOf(name) !== i)).toEqual([]);
    });

    // "What changed" marks a cause in its curve's colour, and the curves it
    // moved in the same one beside the first of them, so that is a claim about
    // everything the param draws in the first panel it draws in — and a marker
    // in the wrong colour renders as happily as the right. A later panel may
    // show the same trades from the other side, where the param moves a curve
    // of the other kind in that kind's colour (the FX lesson's USD market):
    // still one of the lesson's curve colours, never a raw one.
    //
    // An area is not a curve the chain marks: it takes the colour of what it
    // belongs to ("Points and areas" in `docs/chart-design.md`), so revenue is
    // green whichever param sizes it. It was held here only when its shape
    // named a param outright, as the elasticity lesson's price-by-quantity
    // does, and not when it went through calcs, as the market lesson's does.
    it('names, for each param it colours, the colour of everything that param draws first', () => {
        const panels = (model.diagram.layout as any).CustomLayout.panels as any[];
        const words = Object.values(model.paramWords || {});
        const curveColours = words.filter(w => w.curve).map(w => `colors.${w.curve}`);
        const isArea = (object: any) => object.type === 'Area' || object.type === 'Rectangle';
        Object.keys(model.paramWords || {}).forEach(name => {
            const curve = model.paramWords![name].curve;
            if (!curve) return;
            const mentions = new RegExp(`params\\.${name}\\b`);
            const drawnIn = panels
                .map(panel => (panel.objects as any[])
                    .filter(object => !isArea(object) && mentions.test(JSON.stringify(object.def))))
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
        model.scenarios.forEach(scenario => {
            Object.keys(scenario.params).forEach(name => {
                const def = paramNamed(model, name), value = scenario.params[name];
                expect(def, `scenario "${scenario.label}" sets "${name}"`).toBeDefined();
                expect(value).toBeGreaterThanOrEqual(def.min);
                expect(value).toBeLessThanOrEqual(def.max);
                expect(onGrid(def, value), `scenario "${scenario.label}" is off ${name}'s grid`).toBe(true);
            });
        });
    });

    it('captions each panel with a number it narrates, and a change it computes', () => {
        const calcs = model.diagram.calcs as Record<string, string>;
        const narrated = model.narratedCalcs.map(c => c.name);
        model.panels.forEach(panel => {
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
        model.narratedCalcs.forEach(c => { narrated[c.name] = c });
        const symbols = lessonSymbols(narrated);
        const ones = (expression: string) => {
            const out: Record<string, number> = {};
            referencesOf(expression).forEach(r => { out[r.name] = 1 });
            return out;
        };

        Object.keys(model.explainedCalcs).forEach(name => {
            const expression = model.explainedCalcs[name];
            const formula = toSymbolicTex(expression, symbols);
            const substituted = toSubstitutedTex(expression, ones(expression), ones(expression), null, () => 2);
            expect(formula, `calc "${name}" parses`).not.toBeNull();
            expect(substituted, `calc "${name}" substitutes`).not.toBeNull();

            const tex = toWorkingTex(symbols('calcs', name), [formula, substituted, toResultTex(1, 2)]);
            expect(() => katex.renderToString(tex, { throwOnError: true, displayMode: true }), tex).not.toThrow();
            // Every calc it uses is written as the lesson writes it, not by key.
            referencesOf(expression).filter(r => r.scope === 'calcs').forEach(r => {
                expect(model.narratedCalcs.map(c => c.name), `calc "${name}" uses "${r.name}"`).toContain(r.name);
            });
            expect(narrated[name], `calc "${name}" is named`).toBeDefined();
        });
    });

    // The key above the formulas says what each letter means. A letter with
    // nothing to say is left out of it, which is right for a param and wrong
    // for a lesson: it is a letter in a formula that nothing explains.
    it('says what every letter in its formulas means', () => {
        const meanings = model.paramMeanings || {};
        Object.keys(model.explainedCalcs).forEach(name => {
            referencesOf(model.explainedCalcs[name]).filter(r => r.scope === 'params').forEach(r => {
                const def = paramNamed(model, r.name);
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

    // The app opens on Home, so the panel is free to follow a course: the
    // economic problem, then demand's determinants and supply's, then the
    // whole market.
    it('lists the lessons in the order a course meets them', () => {
        expect(CURRICULUM[0].topics.map(t => t.id)).toEqual(['economic-problem', 'markets']);
        expect(LESSONS.map(l => l.id).slice(0, 4)).toEqual(['ppc', 'demand', 'supply', 'market']);
    });

    it('gives every lesson its own address', () => {
        const ids = LESSONS.map(l => l.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    // The template is for an author to copy, and nothing a student should
    // find: no strand lists it, so neither the Lessons panel nor the
    // Playground does, and its address opens the first lesson.
    it('lists the template nowhere a student looks', () => {
        expect(LESSONS.map(l => l.id)).not.toContain(TEMPLATE.id);
        expect(MODELS.map(m => m.id)).not.toContain(TEMPLATE.model.id);
        expect(lessonById(TEMPLATE.id)).toBe(LESSONS[0]);
    });
});

describe('the models', () => {

    // The playground's list is read off the lessons, so the two panels cannot
    // disagree about what exists.
    it('are every model a lesson is drawn on, once each, in the order the lessons list them', () => {
        const drawnOn = LESSONS.map(lesson => lesson.model).filter((model, i, all) => all.indexOf(model) === i);
        expect(MODELS).toEqual(drawnOn);
    });

    it('opens the model an id names, and the first for an id that names nothing', () => {
        expect(modelById('aud').id).toBe('aud');
        expect(modelById('nonsense')).toBe(MODELS[0]);
        expect(modelById(null)).toBe(MODELS[0]);
    });

    // So a model sits in the Playground panel under the topic its lessons do,
    // with the same dot, and once.
    it('puts every model under the topic of the first lesson drawn on it, and nowhere else', () => {
        const listed = CURRICULUM.flatMap(strand => strand.topics.flatMap(topic =>
            modelsOf(topic).map(model => ({ model: model.id, topic: topic.id }))));
        expect(listed.map(l => l.model)).toEqual(MODELS.map(m => m.id));
        listed.forEach(l => expect(topicOfModel(l.model)!.id, l.model).toBe(l.topic));
    });

    it('gives every model its own id', () => {
        const ids = MODELS.map(m => m.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    // A list of models that read as the lessons over again would be a list
    // nobody could choose from.
    it('names every model for what it draws, never as a lesson is titled', () => {
        MODELS.forEach(model => {
            expect(model.name.trim(), `"${model.id}" has no name`).toBeTruthy();
            LESSONS.forEach(lesson => {
                expect(model.name, `"${model.id}"`).not.toBe(lesson.title);
                expect(model.name, `"${model.id}"`).not.toBe(lesson.label);
            });
        });
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
    const demand = infoOf(paramNamed(fx.model, 'demand'));
    const words = fx.model.directionWords!.demand;
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

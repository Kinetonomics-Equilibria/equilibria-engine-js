import { describe, it, expect } from 'vitest';
import { LESSONS, MODELS } from '../lessons';
import type { StudyContent, StudyModel } from '../lessons';
import { TEMPLATE } from '../lessons/_template';
import { GLOSSARY } from '../lessons/glossary';
import { STORIES } from '../news';

/**
 * The app's language, held wherever a machine can hear it.
 *
 * `docs/language.md` says how the app speaks to a student: beside them, in
 * the order things happen, in full sentences, with definitions they could use
 * in an exam. A test cannot hear a sentence, so this checks the marks a
 * backwards or commanding sentence leaves behind, over every word a lesson,
 * model or story supplies, and the template that new lessons are copied from.
 */

/** A piece of writing, and where it is, so a failure names what to fix. */
type Said = [where: string, text: string];

/** A step's words, line by line, without the marks that make a line a list item. */
const linesOf = (say: string) => say.split('\n').map(line => line.replace(/^- /, '')).filter(Boolean);

function lessonWords(lesson: StudyContent): Said[] {
    const said: Said[] = [['title', lesson.title], ['label', lesson.label]];
    lesson.goals.forEach(goal => said.push(['goal', goal]));
    if (lesson.cover) said.push(['cover question', lesson.cover.question], ['cover hook', lesson.cover.hook]);
    Object.entries(lesson.pictures || {}).forEach(([key, picture]) => {
        said.push([`picture ${key} name`, picture.name], [`picture ${key} alt`, picture.alt]);
    });
    Object.entries(lesson.asides || {}).forEach(([key, aside]) => {
        said.push([`aside ${key}`, aside.headline], [`aside ${key}`, aside.body]);
        if (aside.note) said.push([`aside ${key}`, aside.note]);
    });
    lesson.lesson.forEach((step, i) => {
        const at = `step ${i + 1}`;
        if (step.part) said.push([`${at} part`, step.part]);
        if (step.title) said.push([`${at} title`, step.title]);
        linesOf(step.say || '').forEach(line => said.push([at, line]));
        if (step.ask && step.ask.explain) said.push([`${at} explain`, step.ask.explain]);
        if (step.recap) said.push([`${at} takeaway`, step.recap.takeaway]);
    });
    return said;
}

function modelWords(model: StudyModel): Said[] {
    const said: Said[] = [['name', model.name]];
    model.narratedCalcs.forEach(calc => {
        [calc.meaning, calc.rise, calc.fall].forEach(text => {
            if (text) said.push([`calc ${calc.name}`, text]);
        });
    });
    Object.entries(model.paramWords || {}).forEach(([name, words]) => {
        [words.about, words.rise, words.fall, words.because?.rise, words.because?.fall].forEach(text => {
            if (text) said.push([`param ${name}`, text]);
        });
    });
    Object.entries(model.paramMeanings || {}).forEach(([name, text]) => said.push([`param ${name} meaning`, text]));
    model.explorePrompts.forEach(prompt => said.push(['explore prompt', prompt]));
    model.scenarios.forEach(scenario => {
        said.push([`scenario ${scenario.id}`, scenario.label]);
        if (scenario.description) said.push([`scenario ${scenario.id}`, scenario.description]);
    });
    return said;
}

/** Words that claim too much, talk down, or are the app's old shorthand. */
const LEAVE_OUT = new RegExp('\\b(' + [
    'obviously', 'clearly', 'of course', 'simply', 'just', 'easy', 'easily', 'really', 'actually',
    'suddenly', 'nobody', 'work out', 'tops', 'dear', 'dearer', 'dearest', 'stays put', 'soars?', 'watch'
].join('|') + ')\\b', 'i');

/** Each pattern a sentence must not have, and what to write instead. */
const PATTERNS: [string, RegExp][] = [
    ['a colon: split the sentence, or use "which", "such as" or "so"', /:/],
    ['a dash: split the sentence', /[—–]| - /],
    ['an exclamation mark', /!/],
    ['a word to leave out', LEAVE_OUT],
    ['"say" as "suppose"', /(^|[.?!]\s+)(Now )?[Ss]ay\b/],
    ['a promised reward: say what the lesson covers', /\band you can\b/i],
    ['a command used as an "if": start with "Suppose"', /^(Put|Follow|Move|Change|Cut|Raise|Drag)\b[^.?]*\band (the|watch|you)\b/],
    ['a question held to the end: state the result first', /^Whether\b/],
    ['a reveal: name the idea in a sentence of its own', /\bThat's (why|the|what)\b/]
];

const spoken = (said: Said[]) => said.map(([where, text]) => `${where}: ${text}`);

const offending = (said: Said[], pattern: RegExp) =>
    spoken(said.filter(([, text]) => pattern.test(text)));

/** A title that opens on an example, or teases: "Plane tickets, and what shifts supply". */
const TEASING_TITLE = /, and /;

const TERMS = Object.values(GLOSSARY);

describe.each([...LESSONS, TEMPLATE].map(lesson => [lesson.id, lesson] as const))('the "%s" lesson\'s words', (_id, lesson) => {

    it.each(PATTERNS)('has no %s', (_rule, pattern) => {
        expect(offending(lessonWords(lesson), pattern)).toEqual([]);
    });

    it('titles itself with what it teaches', () => {
        expect(lesson.title).not.toMatch(TEASING_TITLE);
        expect(lesson.label).not.toMatch(TEASING_TITLE);
    });

    it('takes each key term from the glossary', () => {
        lesson.lesson.forEach((step, i) => {
            if (!step.term) return;
            expect(TERMS, `step ${i + 1}, "${step.term.word}"`).toContainEqual(step.term);
        });
    });
});

describe.each([...MODELS, TEMPLATE.model].map(model => [model.id, model] as const))('the "%s" model\'s words', (_id, model) => {

    it.each(PATTERNS)('has no %s', (_rule, pattern) => {
        expect(offending(modelWords(model), pattern)).toEqual([]);
    });

    it('asks open questions in "Try this"', () => {
        model.explorePrompts.forEach(prompt => expect(prompt, prompt).toMatch(/\?$/));
    });
});

describe('the news stories\' words', () => {

    const said = STORIES.flatMap((story): Said[] => [
        [`${story.id} headline`, story.headline],
        [`${story.id} body`, story.body],
        [`${story.id} reasoning`, story.reasoning]
    ]);

    it.each(PATTERNS)('have no %s', (_rule, pattern) => {
        expect(offending(said, pattern)).toEqual([]);
    });
});

describe('the glossary', () => {

    /** A student may copy these into an assessment, so no definition can lean on the room around it. */
    const MEANING_CHARACTERS = 220;

    describe.each(TERMS.map(term => [term.word, term] as const))('"%s"', (word, { meaning }) => {

        it('is a complete sentence that starts with the term', () => {
            const first = word.split(' and ')[0].replace(/ \(.*\)$/, '');
            expect(meaning).toMatch(new RegExp(`^((A|An|The) )?${first}`, 'i'));
            expect(meaning).toMatch(/\b(is|are|occurs|means|states|uses|calculates)\b/);
            expect(meaning).toMatch(/\.$/);
            expect(meaning.length).toBeLessThanOrEqual(MEANING_CHARACTERS);
        });

        it.each(PATTERNS)('has no %s', (_rule, pattern) => {
            expect(pattern.test(meaning)).toBe(false);
        });

        // A definition is about economics, not the lesson's example, and it
        // is written as a student would write it in an assessment.
        it('speaks of no one in particular, without contractions or examples', () => {
            expect(meaning).not.toMatch(/\b(you|your|we|our|like)\b/i);
            expect(meaning).not.toMatch(/n't\b|'re\b|'ve\b|'ll\b|\b(it|that|here|there|what)'s\b/i);
        });
    });

    it('holds only terms a lesson uses', () => {
        const used = [...LESSONS, TEMPLATE].flatMap(lesson => lesson.lesson.map(step => step.term));
        TERMS.forEach(term => expect(used, term.word).toContainEqual(term));
    });
});

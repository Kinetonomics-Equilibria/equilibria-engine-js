import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MODELS } from '../lessons';
import { TEMPLATE } from '../lessons/_template';
import type { StudyModel } from '../lessons';
import { ANSWER_SUFFIX, AXIS_SYMBOLS, CURVE_SYMBOLS, GHOST_SUFFIX, MEANINGS } from '../lessons/kit/chart';

/**
 * The house rules for a chart (`docs/chart-design.md`), checked over every
 * panel of every model a lesson is drawn on.
 *
 * Only the rules a machine can check: a `fontSize` set by hand, a colour by a
 * name the table does not have, a dropline labelled with a symbol nobody has
 * defined. The rest — a label at the end with the most open space, one idea
 * per annotation — are still looked at. Each check is named after the section
 * of the doc it comes from, and a failure names the object, so it says what
 * to read and what to change.
 *
 * A check is never loosened to let a chart pass. A chart that breaks a rule
 * on purpose says so, and why, where the doc asks it to.
 */

const DOC = readFileSync(resolve(__dirname, '../../../../docs/chart-design.md'), 'utf8');

/** The lines of one `## ` section of the doc, under its heading. */
const section = (heading: string): string[] => {
    const lines = DOC.split('\n');
    const start = lines.indexOf('## ' + heading);
    if (start < 0) throw new Error(`chart-design.md has no section "${heading}"`);
    const end = lines.findIndex((line, i) => i > start && line.startsWith('## '));
    return lines.slice(start + 1, end < 0 ? lines.length : end);
};

/** The Colour section's table of names: each name, and the hue it is drawn in. */
const HUES: Record<string, string> = {};
section('Colour').forEach(line => {
    const row = /^\| `(\w+)` \| (\w+) \|/.exec(line);
    if (row) HUES[row[1]] = row[2];
});

/**
 * The kit's symbols are written as the engine is given them, and the doc's
 * table as a student reads them; `asRead` turns one into the other, and a test
 * below holds the two lists to each other, so a symbol added to the doc and
 * not the kit fails, and the other way round.
 */
const asRead = (tex: string) => tex
    .replace('\\text{PPC}', 'PPC')
    .replace('^*', '\\*')
    .replace('_0', '₀')
    .replace('_1', '₁')
    .replace(/_([a-z])/, '<sub>$1</sub>');

/** The letters a point may never be given, because the symbol list has them. */
const NOT_A_POINT = ['P', 'Q', 'D', 'S', 'E'];


interface Drawn {
    panel: string;
    type: string;
    name: string;
    def: any;
}

const panelsOf = (model: StudyModel) =>
    (model.diagram.layout as any).CustomLayout.panels as { key: string; xAxis: any; yAxis: any; objects: any[] }[];

const drawnIn = (model: StudyModel): Drawn[] => panelsOf(model).flatMap(panel =>
    panel.objects.map(object => ({
        panel: panel.key, type: object.type, name: object.def.name, def: object.def
    })));

/**
 * Whether an object breaks `rule` on purpose: it said so, and why, in its
 * `breaksRule`, which the kit keeps on the model. The rule is skipped for
 * that object and no other.
 */
const departs = (model: StudyModel, drawn: Drawn, rule: string) =>
    (model.brokenRules || []).some(b => b.object === drawn.name && b.rule === rule);

/** Every value of a key anywhere in a definition, however deep. */
const valuesOf = (key: string, value: unknown): unknown[] => {
    if (Array.isArray(value)) return value.flatMap(v => valuesOf(key, v));
    if (value && typeof value === 'object') {
        return Object.keys(value as object).flatMap(k =>
            (k === key ? [(value as any)[k]] : []).concat(valuesOf(key, (value as any)[k])));
    }
    return [];
};

const isCurve = (drawn: Drawn) => drawn.type === 'Line' || drawn.type === 'Curve';
const isArea = (drawn: Drawn) => drawn.type === 'Area' || drawn.type === 'Rectangle';

/** What a label says, if the object or its `label` carries one. */
const labelOf = (drawn: Drawn): { text: string; plainText?: boolean } | undefined => {
    if (drawn.type === 'Label') return drawn.def;
    return drawn.def.label && typeof drawn.def.label.text === 'string' ? drawn.def.label : undefined;
};

const AXIS: readonly string[] = AXIS_SYMBOLS, CURVES: readonly string[] = CURVE_SYMBOLS;

const isSymbol = (text: string) =>
    AXIS.indexOf(text) > -1 ||
    CURVES.some(s => text === s || text === s + GHOST_SUFFIX || text === s + ANSWER_SUFFIX);

/** A point's letter: a lone capital, or the one before a state ("Z · inefficient"). */
const letterIn = (text: string): string | undefined => {
    const lone = /^([A-Z])$/.exec(text);
    if (lone) return lone[1];
    const stated = /^concat\("([A-Z]) ·/.exec(text);
    return stated ? stated[1] : undefined;
};

const where = (drawn: Drawn) => `"${drawn.name}" in the ${drawn.panel} panel`;

describe('the rules themselves', () => {

    it('name every colour the doc\'s table lists, with its hue, and the kit draws in those', () => {
        expect(Object.keys(HUES).length).toBeGreaterThan(0);
        Object.keys(HUES).forEach(name => expect(HUES[name], name).toMatch(/^[a-z]+$/));
        expect([...MEANINGS].sort()).toEqual(Object.keys(HUES).sort());
    });

    it('know exactly the symbols the doc\'s list has', () => {
        const listed = section('Symbols')
            .map(line => /^\| ([^|]+) \| /.exec(line))
            .filter((row): row is RegExpExecArray => !!row && row[1].trim() !== 'Symbol' && !/^-+$/.test(row[1].trim()))
            // "A, B, C…" is the points' letters, which are not symbols.
            .filter(row => row[1].indexOf('…') < 0)
            .flatMap(row => row[1].split(', ').map(s => s.trim()));
        const known = AXIS.concat(CURVES, CURVES.map(s => s + GHOST_SUFFIX), CURVES.map(s => s + ANSWER_SUFFIX))
            .map(asRead);
        expect([...known].sort()).toEqual([...listed].sort());
    });

    // An object that breaks a rule on purpose names the rule's section and
    // says why, and the doc lists it where the charts differ: both ways, so a
    // line in the doc outlives no reason in the config, nor the other way.
    it('skip a rule only where the config says why, and the doc says the chart differs', () => {
        const differs = section('Where today\'s charts differ').join('\n');
        const broken = MODELS.flatMap(m => m.brokenRules || []);
        broken.forEach(b => {
            expect(section(b.rule).length, `"${b.object}" breaks "${b.rule}"`).toBeGreaterThan(0);
            expect(b.why.trim(), `"${b.object}" says why`).toBeTruthy();
            expect(differs, `"${b.object}" breaks "${b.rule}"`).toContain('`' + b.object + '`');
        });
        const objects = new Set(MODELS.flatMap(drawnIn).map(d => d.name));
        (differs.match(/`[^`]+`/g) || []).map(name => name.slice(1, -1)).filter(name => objects.has(name)).forEach(name => {
            expect(broken.map(b => b.object), `the doc says "${name}" differs`).toContain(name);
        });
    });
});

// The template's too, which no student sees, because a new lesson starts as a copy of it.
describe.each([...MODELS, TEMPLATE.model].map(model => [model.id, model] as const))('the "%s" model\'s charts', (_id, model) => {

    const drawn = drawnIn(model);

    it('set no type size: Type', () => {
        drawn.forEach(d => expect(valuesOf('fontSize', d.def), where(d)).toEqual([]));
        panelsOf(model).forEach(panel =>
            expect(valuesOf('fontSize', [panel.xAxis, panel.yAxis]), `${panel.key}'s axes`).toEqual([]));
    });

    it('set no line weight, and draw a line\'s style for when it is: Lines', () => {
        drawn.forEach(d => {
            expect(valuesOf('strokeWidth', d.def), where(d)).toEqual([]);
            expect([undefined, 'dashed', 'dotted'], `${where(d)} is ${d.def.lineStyle}`).toContain(d.def.lineStyle);
            // Dashed and faint is where it was. A ghost is the engine's, from
            // `ghost:`, so the one dashed line drawn by hand is a question's
            // start, shown while the question is.
            if (d.def.lineStyle === 'dashed') {
                expect(d.def.strokeOpacity, `${where(d)} is dashed, so 35%`).toBe(0.35);
                expect(d.def.show, `${where(d)} is dashed, so a question's start`).toBe('params.asking');
            }
            // Dotted is something to read against, at full strength.
            if (d.def.lineStyle === 'dotted') {
                expect(d.def.strokeOpacity, `${where(d)} is dotted, so 100%`).toBeUndefined();
            }
        });
    });

    it('colour everything by what it means, in four hues at most: Colour', () => {
        panelsOf(model).forEach(panel => {
            const hues = new Set<string>();
            drawn.filter(d => d.panel === panel.key).forEach(d => {
                valuesOf('color', d.def).forEach(color => {
                    const named = /^colors\.(\w+)$/.exec(String(color));
                    expect(named && HUES[named[1]], `${where(d)} is coloured "${color}"`).toBeTruthy();
                    if (named && HUES[named[1]] && HUES[named[1]] !== 'grey') hues.add(HUES[named[1]]);
                });
            });
            expect(hues.size, `the ${panel.key} panel: ${[...hues].join(', ')}`).toBeLessThanOrEqual(4);
        });
    });

    it('title both axes in words, with no bare $: Axes', () => {
        panelsOf(model).forEach(panel => {
            [['x', panel.xAxis], ['y', panel.yAxis]].forEach(([which, axis]) => {
                const title = axis && typeof axis.title === 'string' ? axis.title.trim() : '';
                const named = `the ${panel.key} panel's ${which} axis, "${title}"`;
                expect(title.length, named).toBeGreaterThan(1);
                expect(title, named).not.toMatch(/^\\?[A-Za-z]['^_*]*$/);
                expect(title, named).not.toMatch(/(^|[^\\])\$/);
                expect(title[0], `${named}, in sentence case`).toBe(title[0].toUpperCase());
            });
        });
    });

    it('label every curve where it is, by its symbol, and every dropline: Labels on the plot', () => {
        drawn.forEach(d => {
            expect(valuesOf('bgcolor', d.def), `${where(d)} has a box`).toEqual([]);
            if (isCurve(d) && d.def.lineStyle === undefined) {
                const label = labelOf(d);
                expect(label && CURVES.indexOf(label.text) > -1, `${where(d)} is labelled ${label && label.text}`)
                    .toBe(true);
            }
            if (isCurve(d) && d.def.lineStyle === 'dotted') {
                const label = labelOf(d);
                expect(label && CURVES.map(s => s + ANSWER_SUFFIX).indexOf(label.text) > -1,
                    `${where(d)}, an answer, is labelled ${label && label.text}`).toBe(true);
            }
            if (d.def.ghost && typeof d.def.ghost === 'object' && d.def.ghost.label !== undefined) {
                expect(d.def.ghost.label, `${where(d)}'s ghost`).toBe(GHOST_SUFFIX);
            }
            if (d.def.droplines && !departs(model, d, 'Droplines')) {
                ['vertical', 'horizontal'].forEach(side => {
                    const symbol = d.def.droplines[side];
                    if (symbol === undefined) return;
                    expect(AXIS, `${where(d)}'s ${side} dropline`).toContain(symbol);
                });
            }
            // A word is plain text, in the app's typeface; `\text{}` is for a
            // symbol on the list, and maths italic for the rest of the list.
            const label = labelOf(d);
            if (label && !isSymbol(label.text)) {
                expect(label.text, `${where(d)} says "${label.text}"`).not.toContain('\\text{');
                expect(label.plainText, `${where(d)} says "${label.text}", a word`).toBe(true);
            }
        });
    });

    it('never letters a point with a symbol\'s letter: Labels on the plot/Points', () => {
        drawn.forEach(d => {
            const letters = [d.type === 'Point' ? letterIn(d.def.title || '') : undefined]
                .concat(labelOf(d) && labelOf(d)!.plainText ? [letterIn(labelOf(d)!.text)] : []);
            letters.forEach(letter => {
                if (letter) expect(NOT_A_POINT, `${where(d)} is lettered ${letter}`).not.toContain(letter);
            });
        });
    });

    it('shades an area at 20%, or 8% for context, and sizes a point by its role: Points and areas', () => {
        drawn.forEach(d => {
            if (isArea(d)) expect([undefined, 0.08], `${where(d)}'s fill`).toContain(d.def.opacity);
            if (d.type === 'Point' && d.def.r !== undefined) {
                expect(d.def.r, `${where(d)}'s radius`).toBe(6);
                expect(d.def.drag, `${where(d)} is a handle, at radius 6`).toBeDefined();
            }
        });
    });

    // What a student is meant to find: what they can drag, and every curve
    // drawn now. A curve carried an empty <title> until each was given one.
    it('names everything a student can drag, and every curve: Accessibility', () => {
        drawn.forEach(d => {
            if (!d.def.drag && !(isCurve(d) && d.def.lineStyle === undefined)) return;
            expect(typeof d.def.srTitle === 'string' && d.def.srTitle.trim() !== '', `${where(d)} has no srTitle`)
                .toBe(true);
        });
    });
});

/**
 * The chart holds still (principle 5) needs a browser: where a label lands is
 * the engine's sum in pixels. `tests/chart.spec.ts` moves each param to the
 * ends of its range in each model's playground, one model at a time from its
 * own list — which this holds to the models there are.
 */
describe('the hold-still check', () => {
    it('visits every model', () => {
        const spec = readFileSync(resolve(__dirname, '../../tests/chart.spec.ts'), 'utf8');
        const listed = /const MODELS = \[([^\]]*)\]/.exec(spec);
        expect(listed, 'tests/chart.spec.ts lists its models').toBeTruthy();
        const ids = (listed![1].match(/'[^']+'/g) || []).map(s => s.slice(1, -1));
        expect([...ids].sort()).toEqual(MODELS.map(m => m.id).sort());
    });
});

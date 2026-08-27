import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KGAuthorClasses } from '../ts/KGAuthor/classRegistry';
import * as KGAuthorIndex from '../ts/KGAuthor/index';
import { ViewObjectClasses } from '../ts/view/viewObjects/index';

/**
 * Diagram definitions name their classes as strings, so a class that is not in
 * one of these registries is not a compile error — it is a `type not found`
 * warning at parse time and an object silently missing from the diagram.
 *
 * The KGAuthor registry is the fragile one. Its consumers cannot import the
 * barrel (that would close an import cycle), so they import the empty object in
 * classRegistry.ts and the barrel fills it with getters as it evaluates. That
 * wiring lives in generated output, which is exactly how it got dropped once
 * before.
 */

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('KGAuthorClasses registry', () => {
    it('is populated once the barrel has been imported', () => {
        expect(Object.keys(KGAuthorClasses).length).toBeGreaterThan(0);
    });

    it('holds every class the barrel exports, bound to the same constructor', () => {
        const exported = Object.keys(KGAuthorIndex);
        expect(exported.length).toBeGreaterThan(0);

        const missing = exported.filter(name => !(name in KGAuthorClasses));
        expect(missing).toEqual([]);

        for (const name of exported) {
            expect(KGAuthorClasses[name]).toBe((KGAuthorIndex as any)[name]);
        }
    });

    // The classes other classes construct by name while the barrel is still
    // evaluating — the lookups that fail first when the wiring is missing.
    it.each(['Point', 'Segment', 'Rectangle', 'Marker', 'Graph', 'OneGraph'])(
        'resolves %s to a constructor',
        name => {
            expect(typeof KGAuthorClasses[name]).toBe('function');
        }
    );

    // Hand-maintained in the barrel for a while, and pointed at a module that
    // no longer exists in one generated revision.
    it.each([
        'Dropline',
        'VerticalDropline',
        'CrossGraphVerticalDropline',
        'HorizontalDropline',
        'CrossGraphHorizontalDropline'
    ])('resolves %s to a constructor', name => {
        expect(typeof KGAuthorClasses[name]).toBe('function');
    });
});

describe('ViewObjectClasses registry', () => {
    it('holds every view object the barrel exports', () => {
        expect(Object.keys(ViewObjectClasses).length).toBeGreaterThan(0);

        for (const name of ['Point', 'Segment', 'Curve', 'Label', 'Axis']) {
            expect(typeof (ViewObjectClasses as any)[name]).toBe('function');
        }
    });
});

describe('generated indices', () => {
    it('match what generateIndices.mjs would write', () => {
        // Throws on a non-zero exit, with the script's own message naming the
        // stale file. A new class file that nobody added to a barrel, and a
        // hand-edit to a barrel that regenerating would undo, both land here.
        expect(() =>
            execFileSync('node', ['scripts/generateIndices.mjs', '--check'], {
                cwd: packageRoot,
                encoding: 'utf8',
                stdio: 'pipe'
            })
        ).not.toThrow();
    });
});

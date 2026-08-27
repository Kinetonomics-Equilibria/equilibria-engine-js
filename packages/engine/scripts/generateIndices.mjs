/**
 * Regenerates the barrel index for each directory of classes the engine looks
 * up by name at runtime.
 *
 * KGAuthor's barrel cannot simply be `export const KGAuthorClasses = AllClasses`.
 * Diagram definitions name their classes as strings, so graph.ts,
 * parsingFunctions.ts, graphObject.ts, rectangle.ts and segment.ts all have to
 * resolve a name to a constructor while the barrel is still evaluating — and
 * importing the barrel from those modules would close an import cycle. They
 * import the empty object in classRegistry.ts instead, and the barrel installs
 * a lazy getter for every export onto it once the re-exports are bound. That
 * wiring IS the registry: emitting a plain re-export here would leave
 * classRegistry empty and every lookup by name would fail, so it is generated
 * rather than hand-appended.
 *
 * Usage:
 *   node scripts/generateIndices.mjs           rewrite the index files
 *   node scripts/generateIndices.mjs --check   verify they are up to date
 *
 * --check writes nothing and exits non-zero on drift; the class-registry test
 * runs it so a stale index fails the suite instead of the build.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as glob from 'glob';

// Resolve everything against the package, not the caller's cwd, so the script
// behaves the same from an npm script, from the repo root, and from a test.
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TARGETS = [
    { dir: 'src/ts/view/viewObjects', name: 'ViewObjectClasses' },
    { dir: 'src/ts/KGAuthor', name: 'KGAuthorClasses', registryModule: './classRegistry' }
];

/**
 * Every `export class` in the directory, as `{ className, modulePath }`, in a
 * stable order: files sorted by path, classes in declaration order. Sorting is
 * explicit because glob's own traversal order is an implementation detail — a
 * dependency bump reordering it would show up as phantom drift.
 */
function collectClasses(absDir) {
    const files = glob.sync('**/*.ts', { cwd: absDir })
        .filter(file => !file.endsWith('index.ts') && !file.endsWith('.d.ts'))
        .sort();

    const found = [];
    const homes = new Map();

    for (const file of files) {
        const content = fs.readFileSync(path.join(absDir, file), 'utf8');
        const modulePath = './' + file.replace(/\\/g, '/').replace(/\.ts$/, '');
        // Anchored so a commented-out `// export class Foo` is not picked up.
        for (const match of content.matchAll(/^[ \t]*export class ([A-Za-z0-9_]+)/gm)) {
            const className = match[1];
            const home = homes.get(className);
            if (home) {
                throw new Error(
                    `Duplicate class '${className}' in ${absDir}: declared in both ` +
                    `${home} and ${modulePath}. A barrel can only export one of them — ` +
                    `delete the stale copy before regenerating.`
                );
            }
            homes.set(className, modulePath);
            found.push({ className, modulePath });
        }
    }

    return found;
}

function buildIndex({ dir, name, registryModule }) {
    const classes = collectClasses(path.join(packageRoot, dir));

    let content = classes
        .map(({ className, modulePath }) => `export { ${className} } from '${modulePath}';`)
        .join('\n');
    content += `\n\nimport * as AllClasses from './index';\n`;

    if (registryModule) {
        content += `import { ${name} } from '${registryModule}';\n\n`;
        content += 'for (const key in AllClasses) {\n';
        content += `    Object.defineProperty(${name}, key, {\n`;
        content += '        get: () => (AllClasses as any)[key],\n';
        content += '        enumerable: true\n';
        content += '    });\n';
        content += '}\n';
    } else {
        content += `export const ${name} = AllClasses;\n`;
    }

    return content;
}

const check = process.argv.includes('--check');
let stale = 0;

for (const target of TARGETS) {
    const indexPath = path.join(packageRoot, target.dir, 'index.ts');
    const expected = buildIndex(target);
    const actual = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : null;

    if (check) {
        if (actual !== expected) {
            stale++;
            console.error(`Out of date: ${target.dir}/index.ts — run \`npm run generate:indices\`.`);
        }
        continue;
    }

    if (actual === expected) {
        console.log(`Unchanged ${target.dir}/index.ts`);
    } else {
        fs.writeFileSync(indexPath, expected);
        console.log(`Generated ${target.dir}/index.ts`);
    }
}

if (check && stale > 0) {
    process.exit(1);
}

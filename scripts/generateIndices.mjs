import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';

function generateIndex(dir, name) {
    const files = glob.sync(`${dir}/**/*.ts`);
    let exportStatements = [];
    let classNames = [];

    for (const file of files) {
        if (file.endsWith('index.ts') || file.endsWith('.d.ts')) continue;
        const content = fs.readFileSync(file, 'utf8');
        const matches = content.match(/export class ([a-zA-Z0-9_]+)/g);
        if (matches) {
            matches.forEach(m => {
                const className = m.replace('export class ', '');
                classNames.push(className);
                // get path relative to the directory we are indexing
                let relPath = path.relative(dir, file).replace(/\\/g, '/').replace('.ts', '');
                exportStatements.push(`export { ${className} } from './${relPath}';`);
            });
        }
    }

    let indexContent = exportStatements.join('\n') + '\n\n';
    indexContent += `import * as AllClasses from './index';\n`;
    indexContent += `export const ${name} = AllClasses;\n`;

    fs.writeFileSync(path.join(dir, 'index.ts'), indexContent);
    console.log(`Generated ${dir}/index.ts`);
}

generateIndex('src/ts/view/viewObjects', 'ViewObjectClasses');
generateIndex('src/ts/KGAuthor', 'KGAuthorClasses');

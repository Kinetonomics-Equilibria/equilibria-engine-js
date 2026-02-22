import * as fs from 'fs';
import * as glob from 'glob';

const files = glob.sync('src/ts/**/*.ts');
let fixedCount = 0;
for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');

    // Remove botched literals from previous script
    if (content.includes('\\n}\\n')) {
        content = content.replace(/\\n\}\\n/g, '');
    }

    // We only want to append a bracket if the file is one of the broken ones.
    // We know they are broken if they don't end properly. 
    // Actually, let's just use the exact list from the TS error log.
    fs.writeFileSync(file, content);
}

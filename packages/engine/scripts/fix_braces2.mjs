import * as fs from 'fs';
import * as glob from 'glob';

const files = glob.sync('src/ts/**/*.ts');
for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('\\n}\\n')) {
        content = content.replace(/\\n\}\\n/g, '\n}\n');
        fs.writeFileSync(file, content);
        console.log("Fixed " + file);
    }
}

import * as fs from 'fs';

const log = fs.readFileSync('ts_errors.txt', 'utf8');
const lines = log.split('\n');
const fixedFiles = new Set();

for (const line of lines) {
    const match = line.match(/(src\/ts\/.*?\.ts)\(/);
    if (match) {
        const filename = match[1];
        if (!fixedFiles.has(filename)) {
            fixedFiles.add(filename);
            try {
                fs.appendFileSync(filename, '\n}\n');
                console.log("Fixed " + filename);
            } catch (e) {
                console.error("Error writing to", filename, e);
            }
        }
    }
}

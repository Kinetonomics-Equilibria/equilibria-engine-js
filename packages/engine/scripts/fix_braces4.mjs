import * as fs from 'fs';

const log = fs.readFileSync('ts_errors.txt', 'utf8');
const lines = log.split('\n');

for (const line of lines) {
    if (line.includes('src/ts/') && line.trim().match(/^[0-9]+/)) {
        // Line looks like: "     1  src/ts/view/scale.ts:62"
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
            const filename = parts[1].split(':')[0];
            try {
                fs.appendFileSync(filename, '\n}\n');
                console.log("Fixed " + filename);
            } catch (e) {
                console.error("Error writing to", filename, e);
            }
        }
    }
}

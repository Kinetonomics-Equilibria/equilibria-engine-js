import { execSync } from 'child_process';
import * as fs from 'fs';

let passes = 0;
while (passes < 5) {
    passes++;
    console.log("Pass", passes);
    try {
        execSync('npx tsc --noEmit', { stdio: 'pipe' });
        console.log("Compilation successful!");
        break; // No errors
    } catch (e) {
        const output = e.stdout ? e.stdout.toString() : e.toString();
        const lines = output.split('\n');
        let fixedCount = 0;
        const fixedFiles = new Set();

        for (const line of lines) {
            // ts error format: src/ts/KGAuthor/graphObjects/line.ts(212,1): error TS1005: '}' expected.
            const match = line.match(/(src\/ts\/.*?\.ts)\([0-9]+,[0-9]+\): error TS1005: '\}' expected/);
            if (match) {
                const filename = match[1];
                if (!fixedFiles.has(filename)) {
                    fixedFiles.add(filename);
                    try {
                        fs.appendFileSync(filename, '\n}\n');
                        console.log("Appended } to " + filename);
                        fixedCount++;
                    } catch (err) {
                        console.error("Error writing to", filename, err);
                    }
                }
            }
        }

        if (fixedCount === 0) {
            console.log("No missing braces found in this pass. Remaining errors might be different.");
            break;
        }
    }
}

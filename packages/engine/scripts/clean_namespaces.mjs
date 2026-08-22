import * as fs from 'fs';
import * as path from 'path';

const layouts = [
    "src/ts/KGAuthor/layouts/oneGraph.ts",
    "src/ts/KGAuthor/layouts/fourGraphs.ts",
    "src/ts/KGAuthor/layouts/twoHorizontalGraphs.ts",
    "src/ts/KGAuthor/layouts/twoVerticalGraphs.ts",
    "src/ts/KGAuthor/layouts/rectanglePlusTwoSquares.ts",
    "src/ts/KGAuthor/layouts/html.ts",
    "src/ts/KGAuthor/layouts/gameMatrix.ts",
    "src/ts/KGAuthor/layouts/threeHorizontalGraphs.ts",
    "src/ts/KGAuthor/layouts/layout.ts"
];

for (const file of layouts) {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) continue;

    let text = fs.readFileSync(filePath, 'utf8');

    // Remove references
    text = text.replace(/\/\/\/ <reference path=".*?" \/>\n*/g, '');

    // Remove module KGAuthor {
    text = text.replace(/module KGAuthor {\n*/g, '');

    // Remove the last } in the file
    const lastBraceIndex = text.lastIndexOf("}");
    if (lastBraceIndex !== -1) {
        text = text.substring(0, lastBraceIndex) + text.substring(lastBraceIndex + 1);
    }

    fs.writeFileSync(filePath, text);
    console.log("Cleaned namespaces from", file);
}

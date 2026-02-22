import * as fs from 'fs';
import * as path from 'path';

function stripFrom(file, patterns) {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) return;
    let text = fs.readFileSync(filePath, 'utf8');
    for (const p of patterns) {
        text = text.replace(p, '');
    }
    fs.writeFileSync(filePath, text);
    console.log("Stripped from", file);
}

const UI_BLOCKS = [
    /if\s*\([^\{]*'sidebar'\)[^\{]*\{[\s\S]*?Sidebar\(sidebarDef\)\);\s*\n\s*\}/g,
    /if\s*\([^\{]*'mathbox'\)[^\{]*\{[\s\S]*?MathboxContainer\(mathboxDef\)\);\s*\n\s*\}/g,
    /if\s*\([^\{]*'mathbox'\)[^\{]*\{[\s\S]*?Mathbox\(mathboxDef\)\);\s*\n\s*\}/g,
    /l\.subObjects\.push\(new MathboxContainer\(mathboxDef\)\);/g,
    /l\.subObjects\.push\(new Sidebar\(sidebarDef\)\);/g,
    /l\.subObjects\.push\(new Mathbox\(mathboxDef\)\);/g,
    /dc\.subObjects\.push\(new KGAuthor\.PositionedDiv\(def,\s*dc\)\);/g,
    /ggb\.subObjects\.push\(new GeoGebraApplet\(def\)\);/g,
    /sidebar\s*=\s*new Sidebar\(sidebarDef\);/g,
    /export\s+class\s+\w+Sidebar\s+extends\s+\w+\s*\{[\s\S]*?\n\s*\}/g,
    /export\s+class\s+\w+Mathbox\s+extends\s+\w+\s*\{[\s\S]*?\n\s*\}/g
];

['src/ts/KGAuthor/layouts/oneGraph.ts', 'src/ts/KGAuthor/layouts/fourGraphs.ts', 'src/ts/KGAuthor/layouts/twoHorizontalGraphs.ts', 'src/ts/KGAuthor/layouts/twoVerticalGraphs.ts', 'src/ts/KGAuthor/layouts/rectanglePlusTwoSquares.ts', 'src/ts/KGAuthor/positionedObjects/divContainer.ts', 'src/ts/KGAuthor/positionedObjects/ggbContainer.ts'].forEach(f => stripFrom(f, UI_BLOCKS));


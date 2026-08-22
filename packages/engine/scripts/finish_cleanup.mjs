import * as fs from 'fs';
import * as path from 'path';

function removeFromFile(file, search, replace) {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) return;
    let text = fs.readFileSync(filePath, 'utf8');
    text = text.replace(search, replace);
    fs.writeFileSync(filePath, text);
    console.log("Cleaned", file);
}

// 2. Remove Explanation from layout.ts
removeFromFile('src/ts/KGAuthor/layouts/layout.ts', /if\s*\(def\.hasOwnProperty\('explanation'\)\)\s*\{[\s\S]*?Explanation\(def\.explanation\)\);\s*\n\s*\}/g, '');

// 3. Remove mathboxFn from UnivariateFunction, MultivariateFunction, ParametricFunction
removeFromFile('src/ts/math/univariateFunction.ts', /mathboxFn:\s*\(maxY[^;]*;\n/g, '');
removeFromFile('src/ts/math/univariateFunction.ts', /mathboxFn\(mathbox[^}]*\}[^}]*\}[^}]*\}[^}]*\}/g, '');
removeFromFile('src/ts/math/multivariateFunction.ts', /mathboxFn:\s*\([^;]*;\n/g, '');
removeFromFile('src/ts/math/multivariateFunction.ts', /mathboxFn\(mathbox[^}]*\}[^}]*\}[^}]*\}[^}]*\}/g, '');
removeFromFile('src/ts/math/parametricFunction.ts', /mathboxFn:\s*\([^;]*;\n/g, '');
removeFromFile('src/ts/math/parametricFunction.ts', /mathboxFn\(mathbox[^}]*\}[^}]*\}[^}]*\}[^}]*\}/g, '');

// 4. Fix katex in label.ts
removeFromFile('src/ts/view/viewObjects/label.ts', /import \* as d3 from "d3";/, 'import * as d3 from "d3";\nimport katex from "katex";');

// 5. Fix Node in tree.ts
removeFromFile('src/ts/KGAuthor/positionedObjects/tree.ts', /import \{ NodeDefinition \} from "\.\.\/graphObjects\/point";/, 'import { NodeDefinition, Node } from "../graphObjects/point";');

// 6. Fix KGAuthor map in graph.ts and positionedObject.ts
removeFromFile('src/ts/KGAuthor/positionedObjects/graph.ts', /KGAuthor\[obj\.type\]/g, 'KGAuthorClasses[obj.type]');
removeFromFile('src/ts/KGAuthor/positionedObjects/graph.ts', /KGAuthor\[lookup\.markerType\]/g, 'KGAuthorClasses[lookup.markerType]');
removeFromFile('src/ts/KGAuthor/positionedObjects/graph.ts', /import \{ GraphDefinition \} from "\.\/positionedObject";/, 'import { GraphDefinition } from "./positionedObject";\nimport { KGAuthorClasses } from "../index";');

removeFromFile('src/ts/KGAuthor/positionedObjects/positionedObject.ts', /KGAuthor\.extractTypeAndDef/g, 'extractTypeAndDef');
removeFromFile('src/ts/KGAuthor/positionedObjects/positionedObject.ts', /import \{ extractTypeAndDef \} from "\.\.\/parsers\/parsingFunctions";/g, ''); // prevent dupes
removeFromFile('src/ts/KGAuthor/positionedObjects/positionedObject.ts', /import \{ GraphObject \} from "\.\.\/graphObjects\/graphObject";/, 'import { GraphObject } from "../graphObjects/graphObject";\nimport { extractTypeAndDef } from "../parsers/parsingFunctions";');


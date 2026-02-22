import * as fs from 'fs';
import * as path from 'path';

function replaceInFile(file, search, replace) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
        const text = fs.readFileSync(filePath, 'utf8');
        fs.writeFileSync(filePath, text.replace(search, replace));
    }
}

// Fix default exports for mathjs
replaceInFile('src/ts/math/multivariateFunction.ts', /import math from "mathjs";/g, 'import * as math from "mathjs";');
replaceInFile('src/ts/math/parametricFunction.ts', /import math from "mathjs";/g, 'import * as math from "mathjs";');
replaceInFile('src/ts/model/model.ts', /import math from "mathjs";/g, 'import * as math from "mathjs";');

// Fix overrides
replaceInFile('src/ts/math/mathFunction.ts', /\s*public hasChanged: boolean;/g, '');
replaceInFile('src/ts/view/scale.ts', /\s*public name;/g, '');
replaceInFile('src/ts/view/viewObjects/rectangle.ts', /\s*public clipPath2;/g, '');
replaceInFile('src/ts/view/viewObjects/rectangle.ts', /\s*public rootElement2;/g, '');

console.log("Fixed misc TS issues.");

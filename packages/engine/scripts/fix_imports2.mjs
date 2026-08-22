import fs from 'fs';
import { globSync } from 'glob';

const dir = './src/ts/KGAuthor/';
const files = globSync(dir + '**/*.ts', { posix: true });

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;

    // Replace view/viewObjects with KGAuthor/graphObjects
    content = content.replace(/((?:\.\.\/)+)view\/viewObjects\//g, '$1KGAuthor/graphObjects/');

    // Fix KGAuthor. calls in linearEquilibrium.ts
    // In linearEquilibrium.ts: new KGAuthor.EconLinearDemand -> import it
    if (file.includes('linearEquilibrium.ts')) {
        content = content.replace(/new KGAuthor\./g, 'new ');
        if (!content.includes('import { EconLinearDemand }')) {
            content = 'import { EconLinearDemand } from "./linearDemand";\n' + content;
        }
        if (!content.includes('import { EconLinearSupply }')) {
            content = 'import { EconLinearSupply } from "./linearSupply";\n' + content;
        }
        // fix intersection import
        if (!content.includes('import { lineIntersection }')) {
            content = 'import { lineIntersection } from "../../../graphObjects/line";\n' + content;
        }
    }

    if (file.includes('linearMonopoly.ts')) {
        content = content.replace(/new KGAuthor\./g, 'new ');
        if (!content.includes('import { EconLinearDemand }')) {
            content = 'import { EconLinearDemand } from "../equilibrium/linearDemand";\n' + content;
        }
        if (!content.includes('import { EconLinearMC }')) {
            content = 'import { EconLinearMC } from "./linearMC";\n' + content;
        }
        // fix intersection import
        if (!content.includes('import { lineIntersection }')) {
            content = 'import { lineIntersection } from "../../../graphObjects/line";\n' + content;
        }
    }

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated imports in ${file}`);
    }
});

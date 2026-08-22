import fs from 'fs';
import { globSync } from 'glob';

const dir = './src/ts/view/viewObjects/';
const files = globSync(dir + '**/*.ts', { posix: true });

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    const regex1 = /([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_\.]+)\.append\(['"]([a-zA-Z0-9_:]+)['"]\)/g;

    let newContent = content.replace(regex1, (match, objName, propName, parentName, tagName) => {
        let cleanTag = tagName.includes(':') ? tagName.split(':')[1] : tagName;
        return `${objName}.${propName} = ${parentName}.selectAll('${cleanTag}.${propName}-' + ${objName}.id).data([1]).join('${tagName}').attr('class', '${propName}-' + ${objName}.id)`;
    });

    if (content !== newContent) {
        fs.writeFileSync(file, newContent, 'utf8');
        console.log(`Updated ${file}`);
    }
});

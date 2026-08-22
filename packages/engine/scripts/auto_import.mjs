import { Project } from "ts-morph";

const project = new Project({
    tsConfigFilePath: "tsconfig.json",
});

const sourceFiles = project.getSourceFiles("src/ts/**/*.ts");
let count = 0;

for (const sf of sourceFiles) {
    if (sf.getFilePath().includes('node_modules')) continue;
    const oldText = sf.getFullText();

    // Auto fix missing imports
    sf.fixMissingImports();

    if (sf.getFullText() !== oldText) {
        count++;
        console.log("Fixed imports in", sf.getFilePath());
    }
}

project.saveSync();
console.log(`Auto-imported missing symbols in ${count} files.`);

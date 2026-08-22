import { Project } from "ts-morph";
import * as fs from "fs";
import * as path from "path";
import * as glob from "glob";

// Step 1: Regex strip `module KG {` and `}` and `<reference>`
const files = glob.sync("src/**/*.ts");

for (const file of files) {
    let content = fs.readFileSync(file, "utf8");

    // Remove reference tags
    content = content.replace(/\/\/\/ <reference path="[^"]+" ?\/>\n?/g, "");

    // Remove module KG {
    content = content.replace(/module KG\s*\{/g, "");

    // Remove the last } in the file
    const lastBraceIndex = content.lastIndexOf("}");
    if (lastBraceIndex !== -1) {
        content = content.substring(0, lastBraceIndex) + content.substring(lastBraceIndex + 1);
    }

    // Replace export with export (just formatting fix if needed, but keeping it as is)
    // Actually, everything inside was indented. We can leave indentation for now.

    // Also: mathFunction has KG.Model.evaluate
    content = content.replace(/KG\.Model/g, "Model");
    content = content.replace(/KG\./g, ""); // DANGEROUS! let's be careful.

    fs.writeFileSync(file, content);
}

// Step 2: Use ts-morph to fix missing imports
const project = new Project({
    tsConfigFilePath: "tsconfig.json"
});

project.addSourceFilesAtPaths("src/**/*.ts");

const sourceFiles = project.getSourceFiles();

// Sometimes fix missing imports needs the index
// But ts-morph's fixMissingImports works file by file
for (const sourceFile of sourceFiles) {
    sourceFile.fixMissingImports();
}

project.saveSync();
console.log("Refactoring complete");

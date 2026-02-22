import { Project } from "ts-morph";

const project = new Project();
project.addSourceFilesAtPaths("src/ts/KGAuthor/**/*.ts");
const sourceFiles = project.getSourceFiles();

for (const sf of sourceFiles) {
    let text = sf.getFullText();
    const originalText = text;

    // strip the module wrapper
    text = text.replace(/module KGAuthor \{/g, "");

    if (text !== originalText) {
        // replace last brace that closed the module
        const lastBraceIndex = text.lastIndexOf("}");
        if (lastBraceIndex !== -1) {
            text = text.substring(0, lastBraceIndex) + text.substring(lastBraceIndex + 1);
        }
        sf.replaceWithText(text);
    }
}

project.saveSync();
console.log("Refactored KGAuthor namespaces!");

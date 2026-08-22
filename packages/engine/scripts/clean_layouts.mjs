import { Project } from "ts-morph";

const project = new Project({ tsConfigFilePath: "tsconfig.json" });

const layouts = [
    "src/ts/KGAuthor/layouts/oneGraph.ts",
    "src/ts/KGAuthor/layouts/fourGraphs.ts",
    "src/ts/KGAuthor/layouts/twoHorizontalGraphs.ts",
    "src/ts/KGAuthor/layouts/twoVerticalGraphs.ts",
    "src/ts/KGAuthor/layouts/rectanglePlusTwoSquares.ts",
    "src/ts/KGAuthor/layouts/html.ts"
];

for (const file of layouts) {
    const sf = project.getSourceFile(file);
    if (!sf) continue;

    sf.getClasses().forEach(c => {
        const name = c.getName();
        if (name && (name.includes("Sidebar") || name.includes("GeoGebra") || name.includes("Mathbox"))) {
            console.log("Removing class", name, "from", file);
            c.remove();
        }
    });
}
project.saveSync();

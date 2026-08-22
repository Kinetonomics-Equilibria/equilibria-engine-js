import { parse } from './src/ts/KGAuthor/parsers/parsingFunctions.js';

const areaShadingConfig = {
    params: [{ name: "cutoff", value: 5, min: 0, max: 10, round: 0.1 }],
    calcs: {},
    layout: {
        OneGraph: {
            graph: {
                xAxis: { title: "X", min: 0, max: 10 },
                yAxis: { title: "Y", min: 0, max: 10 },
                objects: [
                    { type: "Curve", def: { fn: "0.5 * x + 2", color: "blue", areaBelow: { fill: "blue", opacity: 0.2, max: "params.cutoff" } } }
                ]
            }
        }
    }
};

let data = JSON.parse(JSON.stringify(areaShadingConfig));
let parsedData = { layers: [[], [], [], []], divs: [], calcs: {}, custom: "" };
const layoutType = Object.keys(data.layout)[0];
data.objects = [{ type: layoutType, def: data.layout[layoutType] }];

let result = parse(data.objects, parsedData);
let areas = result.layers[0].filter((o: any) => o.type === "Area");
console.log(JSON.stringify(areas[0].def, null, 2));

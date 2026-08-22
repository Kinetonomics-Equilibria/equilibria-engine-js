import jsdom from 'jsdom';
const { JSDOM } = jsdom;
const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="chart"></div></body></html>`);
global.window = dom.window;
global.document = dom.window.document;

import * as KG from './dist/kgjs.es.js';

try {
    const finalData = {
        layout: {
            OneGraph: {
                graph: {
                    xAxis: { title: "X", min: 0, max: 10 },
                    yAxis: { title: "Y", min: 0, max: 10 },
                    objects: [
                        { type: "Label", def: { text: "Hello", x: 5, y: 5 } }
                    ]
                }
            }
        }
    };
    const view = new KG.KineticGraph(finalData);
    view.mount(document.getElementById("chart"));
    console.log("SUCCESS");
} catch(e) {
    console.error("CRASH:", e.message);
}

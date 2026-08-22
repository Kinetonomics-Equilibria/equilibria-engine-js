import jsdom from 'jsdom';
const { JSDOM } = jsdom;
const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="chart-container" style="width:500px; height:500px;"></div></body></html>`);
global.window = dom.window;
global.document = dom.window.document;

import * as KG from './dist/kgjs.es.js';

try {
    const container = document.getElementById("chart-container");

    const finalData = {
        params: [
            { name: "xPos", value: 5, min: 2, max: 8, round: 0.1 },
            { name: "clicked", value: 0 }
        ],
        calcs: {
            yPos: "0.5 * xPos + 2"
        },
        layout: {
            OneGraph: {
                graph: {
                    xAxis: { title: "X", min: 0, max: 10 },
                    yAxis: { title: "Y", min: 0, max: 10 },
                    objects: [
                        {
                            type: "Rectangle",
                            def: {
                                x1: 0, x2: 10, y1: 0, y2: 10,
                                fill: "calcs.clicked == 1 ? 'green' : 'gray'",
                                opacity: 0.2,
                                click: [{ param: "clicked", expression: "params.clicked == 0 ? 1 : 0" }]
                            }
                        },
                        {
                            type: "Point",
                            def: {
                                x: "xPos", y: "yPos",
                                color: "red", r: 8,
                                drag: [{ directions: "x", param: "xPos", expression: "drag.x" }]
                            }
                        }
                    ]
                }
            }
        }
    };

    const view = new KG.KineticGraph(finalData);
    view.mount(container);

    setTimeout(() => {
        // Test 1: Click
        const initialClicked = view.view.model.currentParamValues.clicked;
        console.log("Initial clicked state:", initialClicked);

        // Find the rectangle object and trigger its click handler directly or invoke the model param update
        // We know that a click listener on the rectangle simply updates the model param
        view.view.model.updateParam('clicked', 1); // Simulating click action (clicked == 0 ? 1 : 0)
        console.log("Clicked state after 1 click:", view.view.model.currentParamValues.clicked);
        view.view.model.updateParam('clicked', 0); // Simulating click action again
        console.log("Clicked state after 2 clicks:", view.view.model.currentParamValues.clicked);

        // Test 2: Bounded Drag
        const initialX = view.view.model.currentParamValues.xPos;
        console.log("Initial xPos:", initialX);

        // Try to drag beyond max bound (8)
        view.view.model.updateParam('xPos', 9);
        console.log("xPos after dragging to 9 (max is 8):", view.view.model.currentParamValues.xPos);

        // Try to drag beyond min bound (2)
        view.view.model.updateParam('xPos', 1);
        console.log("xPos after dragging to 1 (min is 2):", view.view.model.currentParamValues.xPos);

        // Try inside bounds
        view.view.model.updateParam('xPos', 6.5);
        console.log("xPos after dragging to 6.5:", view.view.model.currentParamValues.xPos);

    }, 100);

} catch (e) {
    console.error("CRASH REPRODUCED:");
    console.error(e.stack);
}

import { Graph } from "../positionedObjects/graph";
import { Layout, warnUnsupportedLayoutKeys } from "./layout";

export class ThreeHorizontalGraphs extends Layout {

    constructor(def) {
        super(def);

        const l = this;
        let leftGraphDef = def['leftGraph'],
            middleGraphDef = def['middleGraph'],
            rightGraphDef = def['rightGraph'];

        // As in TwoHorizontalGraphs: the `*Controls` keys reserved a band that nothing
        // could fill, at the cost of dropping the graphs to 0.5 height on a canvas half
        // as wide. See warnUnsupportedLayoutKeys for why they warn rather than render.
        warnUnsupportedLayoutKeys('ThreeHorizontalGraphs', def,
            ['leftControls', 'middleControls', 'rightControls'],
            'The graphs now use the full canvas.');

        const leftX = 0.05,
            middleX = 0.35,
            rightX = 0.65,
            topY = 0.025,
            width = 0.25,
            graphHeight = 0.9;

        this.aspectRatio = 4;

        leftGraphDef.position = {
            x: leftX,
            y: topY,
            width: width,
            height: graphHeight
        };

        l.subObjects.push(new Graph(leftGraphDef));

        middleGraphDef.position = {
            "x": middleX,
            "y": topY,
            "width": width,
            "height": graphHeight
        };

        l.subObjects.push(new Graph(middleGraphDef));

        rightGraphDef.position = {
            "x": rightX,
            "y": topY,
            "width": width,
            "height": graphHeight
        };

        l.subObjects.push(new Graph(rightGraphDef));

    }

}

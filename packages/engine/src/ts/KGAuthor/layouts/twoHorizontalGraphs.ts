
import { Graph } from "../positionedObjects/graph";
import { Layout, warnUnsupportedLayoutKeys } from "./layout";

export class TwoHorizontalGraphs extends Layout {

    constructor(def) {
        super(def);

        const l = this;
        let leftGraphDef = def['leftGraph'],
            rightGraphDef = def['rightGraph'];

        // `leftControls` / `rightControls` used to reserve a band below the graphs and
        // shrink them to 0.5 height on a 1.8 canvas to make room for it. Nothing was
        // ever drawn there, so the band was 40% of a taller canvas left blank. The keys
        // now warn and the graphs use the full canvas.
        warnUnsupportedLayoutKeys('TwoHorizontalGraphs', def, ['leftControls', 'rightControls'],
            'The graphs now use the full canvas.');

        const leftX = 0.12,
            rightX = 0.58,
            topY = 0.1,
            width = 0.35,
            graphHeight = 0.9;

        this.aspectRatio = 2.5;

        leftGraphDef.position = {
            x: leftX,
            y: topY,
            width: width,
            height: graphHeight
        };

        l.subObjects.push(new Graph(leftGraphDef));

        rightGraphDef.position = {
            "x": rightX,
            "y": topY,
            "width": width,
            "height": graphHeight
        };

        l.subObjects.push(new Graph(rightGraphDef));

    }

}

export class GameMatrixPlusGraph extends Layout {

    constructor(def) {
        super(def);

        const l = this;
        let graphDef = def['graph'];

        // The left 40% of this canvas was reserved for a game matrix the engine cannot
        // draw, and was therefore permanently blank. The class is kept rather than
        // deleted so an existing config gets a full-width graph and an explicit message,
        // instead of the "Unknown object type" warning and an empty container that
        // deleting it would produce.
        warnUnsupportedLayoutKeys('GameMatrixPlusGraph', def, ['game'],
            'The graph now uses the full canvas; render the matrix in the host.');

        graphDef.position = {
            x: 0.15,
            y: 0.1,
            width: 0.74,
            height: 0.7
        };

        l.subObjects.push(new Graph(graphDef));

    }

}

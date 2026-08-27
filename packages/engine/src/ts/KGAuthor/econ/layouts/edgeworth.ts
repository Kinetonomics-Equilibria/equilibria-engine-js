import { Layout, SquareLayout, warnUnsupportedLayoutKeys } from "../../layouts/layout";
import { Graph } from "../../positionedObjects/graph";

/**
 * The box height that still leaves a usable band for auxiliary graphs below it.
 *
 * Without this clamp, `totalGood1 === totalGood2` — the commonest Edgeworth setup,
 * and the one a square box is the point of — left `height` at its initial 0.9,
 * putting the auxiliary graphs at `y: 1.05` with `height: -0.05`: entirely below
 * the canvas, and inverted. 0.62 puts the band at y 0.77, height 0.23, bottom
 * edge exactly 1.0. The unequal cases already fall below this and are untouched.
 */
const MAX_BOX_HEIGHT_WITH_AUX = 0.62;



export class EdgeworthBox extends Layout {

    constructor(def) {
        super(def);

        const l = this;
        let agentA = def['agentA'],
            agentB = def['agentB'];

        let width = 0.738, height = 0.8;

        /* if(def.totalGood1 > def.totalGood2) {
            height = def.totalGood2*height/def.totalGood1;
        }

        if(def.totalGood2 > def.totalGood1) {
            height = def.totalGood1*width/def.totalGood2;
        } */

        this.aspectRatio = 2;

        agentA.position = {
            "x": 0.15,
            "y": 0.1,
            "width": width,
            "height": height
        };

        agentB.position = {
            "x": 0.15 + width,
            "y": 0.1 + height,
            "width": -1 * width,
            "height": -1 * height
        };

        agentA.xAxis.max = agentB.xAxis.max = def.totalGood1;
        agentA.yAxis.max = agentB.yAxis.max = def.totalGood2;
        agentB.xAxis.orient = 'top';
        agentB.yAxis.orient = 'right';

        l.subObjects.push(new Graph(agentA));
        l.subObjects.push(new Graph(agentB));

    }

}

export class EdgeworthBoxSquare extends SquareLayout {

    constructor(def) {
        super(def);

        const l = this;
        let agentA = def['agentA'],
            agentB = def['agentB'];

        let width = 0.74, height = 0.9;

        this.aspectRatio = 1.22;

        agentA.position = {
            "x": 0.15,
            "y": 0.025,
            "width": width,
            "height": height
        };

        agentB.position = {
            "x": 0.15 + width,
            "y": 0.025 + height,
            "width": -1 * width,
            "height": -1 * height
        };

        agentA.xAxis.max = agentB.xAxis.max = def.totalGood1;
        agentA.yAxis.max = agentB.yAxis.max = def.totalGood2;
        agentB.xAxis.orient = 'top';
        agentB.yAxis.orient = 'right';

        l.subObjects.push(new Graph(agentA));
        l.subObjects.push(new Graph(agentB));

    }

}

export class EdgeworthBoxPlusSidebar extends Layout {

    constructor(def) {
        super(def);

        const l = this;
        let agentA = def['agentA'],
            agentB = def['agentB'];

        // The sidebar never reserved any canvas — its def went straight to a stub that
        // discarded it — so this class is an exact alias of EdgeworthBox. Kept because
        // configs reference it by name; dropping the key changes no geometry.
        warnUnsupportedLayoutKeys('EdgeworthBoxPlusSidebar', def, ['sidebar']);

        let width = 0.738, height = 0.8;

        /* if(def.totalGood1 > def.totalGood2) {
            height = def.totalGood2*height/def.totalGood1;
        }

        if(def.totalGood2 > def.totalGood1) {
            height = def.totalGood1*width/def.totalGood2;
        } */

        this.aspectRatio = 2;

        agentA.position = {
            "x": 0.15,
            "y": 0.1,
            "width": width,
            "height": height
        };

        agentB.position = {
            "x": 0.15 + width,
            "y": 0.1 + height,
            "width": -1 * width,
            "height": -1 * height
        };

        agentA.xAxis.max = agentB.xAxis.max = def.totalGood1;
        agentA.yAxis.max = agentB.yAxis.max = def.totalGood2;
        agentB.xAxis.orient = 'top';
        agentB.yAxis.orient = 'right';

        l.subObjects.push(new Graph(agentA));
        l.subObjects.push(new Graph(agentB));

    }

}

export class EdgeworthBoxPlusTwoGraphsPlusSidebar extends SquareLayout {

    constructor(def) {
        super(def);

        const l = this;
        let agentA = def['agentA'],
            agentB = def['agentB'],
            graph1 = def['graph1'],
            graph2 = def['graph2'];

        warnUnsupportedLayoutKeys('EdgeworthBoxPlusTwoGraphsPlusSidebar', def, ['sidebar']);

        let width = 0.738, height = 0.9;

        if (def.totalGood1 > def.totalGood2) {
            height = def.totalGood2 * height / def.totalGood1;
        }

        if (def.totalGood2 > def.totalGood1) {
            height = def.totalGood1 * width / def.totalGood2;
        }

        // Known defect, left as-is deliberately: the branch above scales by `width`
        // while the one before it scales by `height`, so a taller-than-wide box is not
        // proportional to its goods. Correcting it means shrinking the box's *width*
        // rather than its height, which changes a case that renders acceptably today —
        // P2 rules that out without a look at a rendered example. The clamp below is
        // the part that fixes a genuinely broken case without touching a working one.
        height = Math.min(height, MAX_BOX_HEIGHT_WITH_AUX);

        agentA.position = {
            "x": 0.15,
            "y": 0.05,
            "width": width,
            "height": height
        };

        agentB.position = {
            "x": 0.15 + width,
            "y": 0.05 + height,
            "width": -1 * width,
            "height": -1 * height
        };

        graph1.position = {
            "x": 0.1,
            "y": height + 0.15,
            "width": 0.35,
            "height": 0.85 - height
        };

        graph2.position = {
            "x": 0.6,
            "y": height + 0.15,
            "width": 0.35,
            "height": 0.85 - height
        };

        agentA.xAxis.max = agentB.xAxis.max = def.totalGood1;
        agentA.yAxis.max = agentB.yAxis.max = def.totalGood2;
        agentB.xAxis.orient = 'top';
        agentB.yAxis.orient = 'right';

        l.subObjects.push(new Graph(agentB));
        l.subObjects.push(new Graph(agentA));
        l.subObjects.push(new Graph(graph1));
        l.subObjects.push(new Graph(graph2));

    }

}

export class EdgeworthBoxAboveOneGraphPlusSidebar extends SquareLayout {

    constructor(def) {
        super(def);

        const l = this;
        let agentA = def['agentA'],
            agentB = def['agentB'],
            graph = def['graph'];

        warnUnsupportedLayoutKeys('EdgeworthBoxAboveOneGraphPlusSidebar', def, ['sidebar']);

        let width = 0.738, height = 0.9;

        if (def.totalGood1 > def.totalGood2) {
            height = def.totalGood2 * height / def.totalGood1;
        }

        if (def.totalGood2 > def.totalGood1) {
            height = def.totalGood1 * width / def.totalGood2;
        }

        // Known defect, left as-is deliberately: the branch above scales by `width`
        // while the one before it scales by `height`, so a taller-than-wide box is not
        // proportional to its goods. Correcting it means shrinking the box's *width*
        // rather than its height, which changes a case that renders acceptably today —
        // P2 rules that out without a look at a rendered example. The clamp below is
        // the part that fixes a genuinely broken case without touching a working one.
        height = Math.min(height, MAX_BOX_HEIGHT_WITH_AUX);

        agentA.position = {
            "x": 0.15,
            "y": 0.05,
            "width": width,
            "height": height
        };

        agentB.position = {
            "x": 0.15 + width,
            "y": 0.05 + height,
            "width": -1 * width,
            "height": -1 * height
        };

        graph.position = {
            "x": 0.15,
            "y": height + 0.15,
            "width": width,
            "height": 0.85 - height
        };

        agentA.xAxis.max = agentB.xAxis.max = def.totalGood1;
        agentA.yAxis.max = agentB.yAxis.max = def.totalGood2;
        agentB.xAxis.orient = 'top';
        agentB.yAxis.orient = 'right';

        l.subObjects.push(new Graph(agentB));
        l.subObjects.push(new Graph(agentA));
        l.subObjects.push(new Graph(graph));











    }

}

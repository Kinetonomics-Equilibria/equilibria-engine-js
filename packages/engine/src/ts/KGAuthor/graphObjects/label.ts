import { randomString } from "../../model/updateListener";
import { setDefaults } from "../../util";
import { ViewDefinition } from "../../view/view";
import { GraphObjectGeneratorDefinition, GraphObjectGenerator } from "../defObjects/graphObjectGenerator";
import { GraphObject, GraphObjectDefinition } from "./graphObject";
import { Graph } from "../positionedObjects/graph";

export interface LabelDefinition extends GraphObjectDefinition {
    text: string;
    x?: any;
    y?: any;
    coordinates?: any[];
    fontSize?: number;
    xPixelOffset?: number;
    yPixelOffset?: number;
    rotate?: number;
    align?: string;
    position?: string;
    /** What kind of chrome this label is; see `AXIS_TITLE` in graphObjects/axis.ts. */
    furniture?: string;
    /**
     * The ways the point this label names can be dragged, `x`, `y` or `xy`,
     * so the label sits clear of the arrows its handle draws round it
     * (view/handles.ts). Set by a point on its own label.
     */
    besideHandle?: string;
    /** Drawn on the other side of its anchor when this side runs off the plot. */
    flipToFit?: boolean;
}

/**
 * How far a label beside a point that can be dragged sits from it, at the
 * least: past the tips of its handle's arrows, 18px out, and their white edge.
 */
const BESIDE_HANDLE_X = 20, BESIDE_HANDLE_Y = 22;

export class Label extends GraphObject {

    public type: string;

    constructor(def: LabelDefinition, graph: Graph) {
        // A position is a little way off the anchor, in pixels: enough to
        // clear a point of radius 7 and a 3px line with 16px text beside them
        // (view/typeScale.ts). They were 5 across and 10 up, for 13px labels
        // beside points of radius 6.
        if (def.hasOwnProperty('position')) {
            const pos = def.position.toLowerCase();
            switch (pos) {
                case 'bl':
                    def.xPixelOffset = 8;
                    def.yPixelOffset = 12;
                    def.align = 'left';
                    break;
                case 'tr':
                    def.xPixelOffset = -8;
                    def.yPixelOffset = -14;
                    def.align = 'right';
                    break;
                case 'tl':
                    def.xPixelOffset = 8;
                    def.yPixelOffset = -14;
                    def.align = 'left';
                    break;
                case 'br':
                    def.xPixelOffset = -8;
                    def.yPixelOffset = 12;
                    def.align = 'right';
                    break;
                case 't':
                    def.xPixelOffset = 0;
                    def.yPixelOffset = -14;
                    def.align = 'center';
                    break;
                case 'b':
                    def.xPixelOffset = 0;
                    def.yPixelOffset = 12;
                    def.align = 'center';
                    break;
                case 'l':
                    def.xPixelOffset = 8;
                    def.yPixelOffset = 0;
                    def.align = 'left';
                    break;
                case 'r':
                    def.xPixelOffset = -8;
                    def.yPixelOffset = 0;
                    def.align = 'right';
                    break;
                default:
                    console.warn(`Unknown label position "${def.position}". Supported: bl, br, tl, tr, t, b, l, r.`);
                    break;
            }
        }
        // Beside a point that can be dragged, further out, past the arrows
        // round it: a label to one side clears the arrows pointing sideways,
        // and one above or below clears those pointing up and down. A label
        // in a corner is already clear of arrows pointing up and down.
        if (def.besideHandle) {
            const away = (offset: number, least: number) => offset < 0 ? Math.min(offset, -least) : Math.max(offset, least);
            if (def.besideHandle.indexOf('x') > -1 && def.align !== 'center' && def.xPixelOffset !== undefined) {
                def.xPixelOffset = away(def.xPixelOffset, BESIDE_HANDLE_X);
            }
            if (def.besideHandle.indexOf('y') > -1 && def.align === 'center' && def.yPixelOffset !== undefined) {
                def.yPixelOffset = away(def.yPixelOffset, BESIDE_HANDLE_Y);
            }
        }
        delete def.besideHandle;
        super(def, graph);
        this.type = 'Label';
        this.extractCoordinates();
    }

    parseSelf(parsedData: ViewDefinition) {
        parsedData.divs.push({ type: this.type, def: this.def });
        return parsedData;
    }
}

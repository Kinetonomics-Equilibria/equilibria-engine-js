import { AuthoringObject } from "../parsers/authoringObject";

/**
 * Report a layout def key the engine accepts but cannot draw.
 *
 * `Controls`, `GameMatrix` and `Sidebar` were never implemented — the classes the
 * layouts referred to are not exported from KGAuthor, and the `DivContainer` that
 * would have held them was a stub that discarded its def. Two of the layouts also
 * changed the geometry of the graphs that *did* render in order to reserve canvas
 * for a widget that could not exist.
 *
 * Rather than implement three UI widgets inside a headless renderer — against the
 * engine/host boundary stated in `docs/index.md` — the keys now warn by name. This
 * matches the house style for a wrong answer the engine cannot give: say so once,
 * name the thing, and carry on (`parsers/parsingFunctions.ts`, `model.ts`).
 *
 * @param consequence appended when dropping the key also moved the graphs.
 */
export function warnUnsupportedLayoutKeys(className: string, def: any, keys: string[], consequence?: string) {
    if (!def) return;
    keys.forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(def, key)) {
            console.warn(
                `${className}: "${key}" is not rendered by the engine. Controls, game matrices and ` +
                `sidebars are the host application's responsibility.` + (consequence ? ` ${consequence}` : ``)
            );
        }
    });
}



export class Layout extends AuthoringObject {

    public aspectRatio: number;
    public nosvg: boolean;

    constructor(def) {
        super(def);
        this.aspectRatio = 2;
        this.nosvg = false;

        let l = this;


    }

    parseSelf(parsedData) {
        parsedData.aspectRatio = this.aspectRatio;
        parsedData.nosvg = this.nosvg;
        return parsedData;
    }

}

export class SquareLayout extends Layout {

    // creates a square layout (aspect ratio of 1) within the main body of the text
    // to make a square graph, the ratio of width to height should be 0.82

    constructor(def) {
        super(def);
        this.aspectRatio = 1.22;
    }
}


export class WideRectangleLayout extends Layout {

    // creates a rectangle, twice as wide as it is high, within the main body of the text
    // to make a square graph, the ratio of width to height should be 0.41

    constructor(def) {
        super(def);
        this.aspectRatio = 2.44;
    }
}


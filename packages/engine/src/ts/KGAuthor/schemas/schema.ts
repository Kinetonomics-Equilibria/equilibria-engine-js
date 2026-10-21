import { setDefaults } from "../../util";
import { ViewDefinition } from "../../view/view";
import { AuthoringObjectDefinition, AuthoringObject } from "../parsers/authoringObject";



export interface SchemaDefinition extends AuthoringObjectDefinition {
    custom: string;
    idioms: any;
    colors: any;
}

export class Schema extends AuthoringObject {

    public colors: {};
    public idioms: {};
    public idiomMenu: any[];

    constructor(def: SchemaDefinition) {

        const palette = {
            blue: 'd3.schemeCategory10[1]',     //#1f77b4
            // Not d3's #ff7f0e, which is 2.5:1 on white: under the 3:1 a line
            // needs to be seen at all, and supply is drawn in it. This is the
            // same hue, darkened in HCL until it clears 3:1 (3.3:1). A label
            // in it is darkened further, to 4.5:1, by `readableOn`.
            orange: "'#e56a00'",
            green: 'd3.schemeCategory10[3]',    //#2ca02c
            red: 'd3.schemeCategory10[4]',      //#d62728
            purple: 'd3.schemeCategory10[5]',   //#9467bd
            brown: 'd3.schemeCategory10[6]',    //#8c564b
            magenta: 'd3.schemeCategory10[7]',  //#e377c2
            grey: 'd3.schemeCategory10[8]',     //#7f7f7f
            gray: 'd3.schemeCategory10[8]',     //#7f7f7f
            olive: 'd3.schemeCategory10[9]'     //#bcbd22
        };

        for (const color in def.colors) {
            const colorName = def.colors[color];
            if (palette.hasOwnProperty(colorName)) {
                def.colors[color] = palette[colorName];
            }
        }

        def.colors = setDefaults(def.colors || {}, palette);

        super(def);

        this.colors = def.colors;
        this.idioms = def.idioms;

    }

    parseSelf(parsedData: ViewDefinition) {
        const colors = this.colors;
        parsedData.colors = setDefaults(parsedData.colors || {}, colors);
        parsedData.idioms = this.idioms || parsedData.idioms;
        return parsedData;
    }

}

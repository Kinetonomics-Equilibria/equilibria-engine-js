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
            orange: 'd3.schemeCategory10[2]',   //#ff7f0e
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

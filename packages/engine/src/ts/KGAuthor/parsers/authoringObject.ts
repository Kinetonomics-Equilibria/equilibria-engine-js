import { ViewDefinition } from "../../view/view";
import { Graph } from "../positionedObjects/graph";



export interface AuthoringObjectDefinition {
    name?: string;
    /** Human name for prose about this object; see `GraphObjectDefinition.title`. */
    title?: string;
    /** Set on a decoration (a dropline, an axis label) to name what it belongs to. */
    partOf?: string;
    tabbable?: boolean;
    srTitle?: string;
    srDesc?: string;
}

export interface IAuthoringObject {
    parse: (parsedData: ViewDefinition) => ViewDefinition;
}

export class AuthoringObject implements IAuthoringObject {

    public name: any;
    public title: any;
    public def: any;
    public subObjects: AuthoringObject[];
    public tabbable: boolean;
    public srTitle: string;
    public srDesc: string;

    constructor(def: AuthoringObjectDefinition) {
        this.def = def;
        this.name = def.name;
        this.title = def.title;
        this.subObjects = [];


        if (def.hasOwnProperty('srTitle')) {
            this.srTitle = def.srTitle;
            this.tabbable = true;
        }

        if (def.hasOwnProperty('srDesc')) {
            this.srDesc = def.srDesc;
            this.tabbable = true;
        }
    }

    parseSelf(parsedData: ViewDefinition) {
        return parsedData;
    }

    parse(parsedData: ViewDefinition) {
        this.subObjects.forEach(function (obj) {
            parsedData = obj.parse(parsedData);
        });
        delete this.subObjects;
        parsedData = this.parseSelf(parsedData);
        return parsedData;
    }

    addSecondGraph(graph2: Graph) {
        let def = this.def;
        if (def.hasOwnProperty('yScale2Name')) {
            def.xScale2Name = graph2.xScale.name;
            def.yScale2Name = graph2.yScale.name;
        }
        this.subObjects.forEach(function (obj) {
            obj.addSecondGraph(graph2);
        });
    }

}


import { ViewDefinition } from "../../view/view";
import { GraphObjectGenerator } from "./graphObjectGenerator";



    export class DefObject extends GraphObjectGenerator {

        constructor(def, graph) {
            def.inDef = true;
            super(def, graph);
        }

        parseSelf(parsedData: ViewDefinition) {
            delete this.def.clipPathName;
            parsedData.clipPaths.push(this.def);
            return parsedData;
        
    


}

}

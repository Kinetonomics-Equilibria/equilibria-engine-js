import { ViewDefinition } from "../../view/view";
import { DefObject } from "./defObject";



    export class ClipPath extends DefObject {

        parseSelf(parsedData: ViewDefinition) {
            delete this.def.clipPathName;
            parsedData.clipPaths.push(this.def);
            return parsedData;
        
    


}

}

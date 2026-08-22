import { ViewDefinition } from "../../view/view";
import { DefObject } from "./defObject";



    export class Marker extends DefObject {

        public refX;
        public maskPath;
        public markerType;

        constructor(def,graph) {
            super(def,graph);
            this.maskPath = def.maskPath;
        }

        parseSelf(parsedData: ViewDefinition) {
            parsedData.markers.push(this.def);
            return parsedData;
        
    


}

}

import { setProperties } from "../../util";
import { ViewObjectDefinition, ViewObject } from "./viewObject";


    export interface MarkerDefinition extends ViewObjectDefinition {
        name: string;
        refX: number;
        maskPath: string;
        arrowPath: string;
        url: string;
    }

    export class Marker extends ViewObject {

        private maskPath;
        private arrowPath;
        private arrowElement;

        constructor(def: MarkerDefinition) {
            setProperties(def,'constants',['maskPath','arrowPath']);
            setProperties(def,'updatables',['color']);
            super(def);
        }

        draw(layer) {
            let m = this;
            layer.append("svg:path")
                .attr("d", m.maskPath)
                .attr("fill", "white");

            m.arrowElement = layer.selectAll('path.arrowElement-' + m.id).data([1]).join('svg:path').attr('class', 'arrowElement-' + m.id)
                .attr("d", m.arrowPath);
            return m;

        }

        redraw() {
            let m = this;
            m.arrowElement.attr("fill", m.color);
            return m;
        }

    

}

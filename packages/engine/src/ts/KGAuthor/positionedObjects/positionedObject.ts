import { randomString } from "../../model/updateListener";
import { setDefaults } from "../../util";
import { ViewDefinition } from "../../view/view";
import { AuthoringObject } from "../parsers/authoringObject";
import { addDefs, extractTypeAndDef } from "../parsers/parsingFunctions";



    export interface AxisDefinition {
        min: any;
        max: any;
        title: string;
        orient: string;
        log: boolean;
    }

    export class Scale extends AuthoringObject {

        public min;
        public max;
        public intercept;

        constructor(def) {
            setDefaults(def, {
                intercept: 0
            });
            super(def);
            this.min = def.domainMin;
            this.max = def.domainMax;
            this.intercept = def.intercept;
        }

        parseSelf(parsedData: ViewDefinition) {
            parsedData.scales.push(this.def);
            return parsedData;
        }

    }

    export interface PositionedObjectDefinition {
        position: {
            x: any;
            y: any;
            width: any;
            height: any;
        }
        xAxis?: AxisDefinition,
        yAxis?: AxisDefinition
    }

    export class PositionedObject extends AuthoringObject {
        public xScale;
        public yScale;

        constructor(def) {

            setDefaults(def, {xAxis: {}, yAxis: {}});
            setDefaults(def.xAxis, {min: 0, max: 10, intercept: 0, title: '', orient: 'bottom'});
            setDefaults(def.yAxis, {min: 0, max: 10, intercept: 0, title: '', orient: 'left'});

            super(def);

            const po = this,
                xMin = def.xAxis.min,
                xMax = def.xAxis.max,
                xIntercept = def.xAxis.intercept,
                xLog = def.xAxis.log,
                yMin = def.yAxis.min,
                yMax = def.yAxis.max,
                yIntercept = def.yAxis.intercept,
                yLog = def.yAxis.log,
                leftEdge = def.position.x,
                rightEdge = addDefs(def.position.x, def.position.width),
                bottomEdge = addDefs(def.position.y, def.position.height),
                topEdge = def.position.y;

            // A named panel names its scales. `CustomLayout` sets `name` from the host's
            // panel key, and the scale name is the only part of a panel that survives
            // parsing — the authoring objects are discarded, while `parsedData.scales`
            // is what every view object resolves against. So this is what makes a panel
            // addressable from outside at all. Unnamed panels keep the random names.
            const scaleName = function (axis: string) {
                return po.name ? po.name + '_' + axis : randomString(10);
            };

            po.xScale = new Scale({
                "name": scaleName('x'),
                "axis": "x",
                "domainMin": xMin,
                "domainMax": xMax,
                "rangeMin": leftEdge,
                "rangeMax": rightEdge,
                "log": xLog,
                "intercept": xIntercept
            });

            po.yScale = new Scale({
                "name": scaleName('y'),
                "axis": "y",
                "domainMin": yMin,
                "domainMax": yMax,
                "rangeMin": bottomEdge,
                "rangeMax": topEdge,
                "log": yLog,
                "intercept": yIntercept
            });

            po.subObjects = [po.xScale, po.yScale];

            if(po.def.hasOwnProperty('objects')) {
                po.def.objects.map(extractTypeAndDef);
            }

        

    


}

}

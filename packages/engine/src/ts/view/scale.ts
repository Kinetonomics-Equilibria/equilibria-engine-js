import * as d3 from "d3";
import { UpdateListenerDefinition, UpdateListener } from "../model/updateListener";
import { setDefaults } from "../util";



export interface ScaleDefinition extends UpdateListenerDefinition {
    name: string;
    axis: 'x' | 'y';
    domainMin: any;
    domainMax: any;
    rangeMin: any;
    rangeMax: any;
    log?: boolean;
    intercept?: any;
}

export interface IScale {
    scale: d3.ScaleLinear<Range, Range>
}

export class Scale extends UpdateListener implements IScale {
    public axis;
    public scale;
    public domainMin;
    public domainMax;
    public rangeMin;
    public rangeMax;
    public extent;
    public intercept;

    constructor(def: ScaleDefinition) {
        setDefaults(def, {
            log: false
        });
        // `rangeMin`/`rangeMax` are the panel's edges as fractions of the canvas, and
        // they are updatables rather than constants so a panel can *move*. A constant is
        // read once, in the UpdateListener constructor, and is coerced with parseFloat —
        // so a composed expression like "(params.focus==0?0.05:0.62)+(0.3)" stayed a
        // string forever and reached `rangeMin * extent` as NaN. As an updatable it is
        // evaluated on every model update, which is what makes promoting a panel a param
        // change rather than a remount. Scales are registered as update listeners before
        // any view object (view.ts creates them first), so an object always reads a range
        // its scale has already recomputed this tick.
        def.constants = ['axis', 'name'];
        def.updatables = ['domainMin', 'domainMax', 'intercept', 'rangeMin', 'rangeMax'];
        super(def);
        this.scale = def.log ? d3.scaleLog() : d3.scaleLinear();
        this.update(true);
    }

    update(force) {
        let s = super.update(force);
        if (s.extent != undefined) {
            const rangeMin = s.rangeMin * s.extent,
                rangeMax = s.rangeMax * s.extent;
            s.scale.domain([s.domainMin, s.domainMax]);
            s.scale.range([rangeMin, rangeMax]);
        }
        return s;
    }

    updateDimensions(width, height) {
        let s = this;
        s.extent = (s.axis == 'x') ? width : height;
        return s.update(true);
    }




}

import { Model } from "./model";



export interface RestrictionDefinition {
    expression: string;
    type: string;
    min?: string;
    max?: string;
}

export interface IRestriction {
    valid: (model: Model) => boolean;
}

export class Restriction implements IRestriction {

    private expression: string;
    private type: string;
    private min: any;
    private max: any;

    constructor(def: RestrictionDefinition) {

        this.expression = def.expression;
        this.type = def.type;
        this.min = def.min;
        this.max = def.max;
    }

    valid(model: Model) {
        const r = this,
            value = model.evaluate(r.expression);

        let isValid = true;
        if (r.min !== undefined) {
            isValid = isValid && (value >= model.evaluate(r.min));
        }
        if (r.max !== undefined) {
            isValid = isValid && (value <= model.evaluate(r.max));
        }
        return isValid;
    }




}

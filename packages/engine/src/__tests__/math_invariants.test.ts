import { describe, it, expect } from 'vitest';
import { Model } from '../ts/model/model';
import { KineticGraph } from '../ts/kg';

describe('Math Invariants', () => {
    it('evaluates mathjs expressions correctly after JSON parse', () => {
        const config = {
            params: [
                { name: 'P', value: 50, max: 100 },
                { name: 'a', value: 100, max: 200 },
                { name: 'b', value: 1, max: 10 }
            ],
            calcs: {
                Qd: "params.a - params.b*params.P"
            }
        };

        const model = new Model(config);
        expect((model.currentParamValues as any).P).toBe(50);
        expect((model.currentCalcValues as any).Qd).toBe(50);

        // update
        model.updateParam('P', 20);
        model.update(true);
        expect((model.currentCalcValues as any).Qd).toBe(80);
    });
});

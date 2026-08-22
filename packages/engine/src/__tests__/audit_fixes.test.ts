import { describe, it, expect, vi } from 'vitest';
import { Model } from '../ts/model/model';
import { Param } from '../ts/model/param';

describe('Audit Fix: cycleParam', () => {
    it('advances the param value by 1', () => {
        const config = {
            params: [{ name: 'step', value: 0, min: 0, max: 3, round: 1 }],
            calcs: {},
            colors: {},
            idioms: {}
        };
        const model = new Model(config);
        expect(model.currentParamValues['step']).toBe(0);

        model.cycleParam('step');
        expect(model.currentParamValues['step']).toBe(1);

        model.cycleParam('step');
        expect(model.currentParamValues['step']).toBe(2);

        model.cycleParam('step');
        expect(model.currentParamValues['step']).toBe(3);

        // At max, should reset to 0
        model.cycleParam('step');
        expect(model.currentParamValues['step']).toBe(0);
    });
});

describe('Audit Fix: getParam null safety', () => {
    it('returns undefined and warns for unknown param names', () => {
        const config = {
            params: [{ name: 'x', value: 5 }],
            calcs: {},
            colors: {},
            idioms: {}
        };
        const model = new Model(config);
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        const result = model.getParam('nonexistent');
        expect(result).toBeUndefined();
        expect(warnSpy).toHaveBeenCalledWith('Param "nonexistent" not found.');

        // updateParam, toggleParam, cycleParam should not crash
        expect(() => model.updateParam('nonexistent', 10)).not.toThrow();
        expect(() => model.toggleParam('nonexistent')).not.toThrow();
        expect(() => model.cycleParam('nonexistent')).not.toThrow();

        warnSpy.mockRestore();
    });
});

describe('Audit Fix: Param NaN guard', () => {
    it('falls back to min for non-numeric values', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        const param = new Param({ name: 'bad', value: 'hello' as any, min: 2, max: 10, round: 1, label: '' });
        expect(param.value).toBe(2);
        expect(warnSpy).toHaveBeenCalled();

        warnSpy.mockRestore();
    });

    it('falls back to 0 when min is also NaN', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        const param = new Param({ name: 'bad', value: 'hello' as any, min: 'also_bad' as any, max: 10, round: 1, label: '' });
        expect(param.value).toBe(0);

        warnSpy.mockRestore();
    });
});

import { describe, it, expect } from 'vitest';
import {
    axis, contextArea, curve, equilibrium, namedArea, priceAxis, priceLine, pricePoint, questionLines, readout
} from '../lessons/kit/chart';
import { defineLesson } from '../lessons/kit/lesson';

/**
 * What the chart kit draws by default (P16): one definition of a curve drawn
 * three times, the rules a helper follows without being asked, and a rule
 * broken on purpose that never reaches the engine.
 */

const demandAt = (q: string) => `${q} - ((y) - 300)`;

const DEMAND = {
    name: 'marketDemand', title: 'demand', meaning: 'demand' as const, symbol: 'D' as const,
    moves: ['demand'],
    shape: (p: Record<string, string>) => ({ fn: demandAt(p.demand), samplePoints: 2 }),
    labelAt: (p: Record<string, string>) => ({ y: `max(40, ${p.demand} - 160)` })
};

const defOf = (object: object) => (object as { def: Record<string, any> }).def;

describe('a curve', () => {

    it('is solid, in its meaning\'s colour, labelled with its symbol and named for a screen reader', () => {
        const [now] = curve(DEMAND);
        expect(now).toEqual({
            type: 'Curve',
            def: {
                name: 'marketDemand', title: 'demand',
                fn: 'params.demand - ((y) - 300)', samplePoints: 2,
                color: 'colors.demand',
                srTitle: 'Demand',
                label: { text: 'D', y: 'max(40, params.demand - 160)' }
            }
        });
    });

    it('nobody asks about has no start line and no answer line', () => {
        expect(curve(DEMAND)).toHaveLength(1);
    });

    it('a question asks about draws its start and its answer from its own shape, with the question\'s params', () => {
        const [, start, answer] = curve({ ...DEMAND, asked: true });
        expect(defOf(start)).toEqual({
            name: 'questionStartDemand', title: '',
            fn: 'params.startDemand - ((y) - 300)', samplePoints: 2,
            color: 'colors.demand', lineStyle: 'dashed', strokeOpacity: 0.35,
            show: 'params.asking'
        });
        expect(defOf(answer)).toEqual({
            name: 'questionAnswerDemand', title: '',
            fn: 'params.answerDemand - ((y) - 300)', samplePoints: 2,
            color: 'colors.demand', lineStyle: 'dotted',
            label: { text: 'D_1', y: 'max(40, params.answerDemand - 160)' },
            show: 'params.revealed and (params.answerDemand != params.startDemand)'
        });
    });

    // The café's curve is drawn from three params a question can be about.
    it('drawn from several params draws its answer once any of them has moved', () => {
        const [, answer] = questionLines({
            meaning: 'ppf', symbol: '\\text{PPC}', moves: ['h', 'C'],
            shape: p => ({ xFn: `${p.h} * ${p.C}` }), labelAt: () => ({ t: 1.35 })
        });
        expect(defOf(answer).xFn).toBe('params.answerH * params.answerC');
        expect(defOf(answer).show).toBe('params.revealed and (params.answerH != params.startH or params.answerC != params.startC)');
        expect(defOf(answer).label.text).toBe('\\text{PPC}_1');
    });

    it('stops being draggable once an answer is committed, and its ghost stands down for a question', () => {
        const [now] = curve({ ...DEMAND, drag: [{ horizontal: 'demand' }], ghost: true });
        expect(defOf(now).drag).toEqual([{ horizontal: 'demand', draggable: 'not(params.submitted)' }]);
        expect(defOf(now).ghost).toEqual({ show: 'not(params.asking)', label: '_0' });
    });
});

describe('the other helpers', () => {

    it('escape a $ in an axis title, once', () => {
        expect(axis('Price ($)', 0, 20).title).toBe('Price (\\$)');
        expect(axis('Price (\\$)', 0, 20).title).toBe('Price (\\$)');
        expect(priceAxis(500)).toEqual({ title: 'Price (\\$)', min: 0, max: 500 });
        expect(axis('USD per AUD', 0.4, 0.9, { tickPrecision: 2 })).toEqual(
            { title: 'USD per AUD', min: 0.4, max: 0.9, tickPrecision: 2 });
    });

    it('draw the equilibrium in green, read off both axes, and unlettered', () => {
        expect(defOf(equilibrium({ name: 'eq', x: 'calcs.Qe', y: 'calcs.Pe', droplines: ['Q^*', 'P^*'] }))).toEqual({
            name: 'eq', title: 'equilibrium', x: 'calcs.Qe', y: 'calcs.Pe',
            color: 'colors.equilibriumPrice',
            droplines: { vertical: 'Q^*', horizontal: 'P^*' },
            srTitle: 'Equilibrium'
        });
    });

    it('draw a price line dotted, with P on the price axis', () => {
        const [line, symbol] = priceLine({ param: 'price', across: [0, 5], meaning: 'price' });
        expect(defOf(line)).toMatchObject({ a: [0, 'params.price'], b: [5, 'params.price'], lineStyle: 'dotted', color: 'colors.price' });
        expect(defOf(symbol)).toMatchObject({ x: 'AXIS', y: 'params.price', text: 'P' });
    });

    // The answer about the price moves the point along the curve as the
    // question found it.
    it('put the answer to a question about a price on the curve as it was found', () => {
        const [start, answer, now] = pricePoint({
            name: 'atPrice', meaning: 'choice', price: 'price', on: ['demand'],
            at: p => `${p.demand} - (${p.price} - 300)`, quantity: 'Q_d', srTitle: 'At the price', asked: true
        });
        expect(defOf(start).x).toBe('params.startDemand - (params.startPrice - 300)');
        expect(defOf(answer).x).toBe('params.startDemand - (params.answerPrice - 300)');
        expect(defOf(answer).droplines).toEqual({ horizontal: 'P_1' });
        expect(defOf(now)).toMatchObject({ x: 'params.demand - (params.price - 300)', y: 'params.price',
            droplines: { vertical: 'Q_d', horizontal: 'P' }, ghost: { show: 'not(params.asking)' } });
    });

    it('shade a named area at 20% and a context area at 8%', () => {
        expect(defOf(namedArea({ name: 'cs', meaning: 'demand', shape: { fn1: '1' }, srTitle: 'Consumer surplus' })).opacity)
            .toBeUndefined();
        expect(defOf(contextArea({ name: 'can', meaning: 'ppf', shape: { fn1: '1' }, srTitle: 'What it can make' })))
            .toMatchObject({ opacity: 0.08, title: '', color: 'colors.ppf' });
    });

    it('hang a readout\'s lines from the corner, 24px apart', () => {
        expect(defOf(readout({ name: 'r', line: 1, text: '"x"', corner: [158, 320], meaning: 'choice' })))
            .toMatchObject({ x: 158, y: 320, align: 'right', yPixelOffset: -36, plainText: true });
    });
});

describe('a rule broken on purpose', () => {

    const broken = {
        type: 'Point',
        def: {
            name: 'pair1', x: 1, y: 400, color: 'colors.demand',
            droplines: { vertical: '', horizontal: '' },
            breaksRule: { rule: 'Droplines', why: 'Each lands on a tick.' }
        }
    };

    const built = defineLesson({
        id: 'small', label: 'Small', title: 'A small lesson', goals: ['One', 'Two'], steps: [],
        model: {
            id: 'small', name: 'A small model', params: [], calcs: { n: '1' },
            panels: [{ key: 'you', name: 'You', headline: 'n', xAxis: axis('Pairs', 0, 5), yAxis: priceAxis(500), objects: [broken] }],
            narratedCalcs: [{ name: 'n', label: 'Pairs' }], scenarios: []
        }
    });

    it('never reaches the engine', () => {
        const drawn = (built.model.diagram.layout as any).CustomLayout.panels[0].objects[0];
        expect(drawn.def.breaksRule).toBeUndefined();
        expect(JSON.stringify(built.model.diagram)).not.toContain('breaksRule');
        expect(drawn.def.name).toBe('pair1');
    });

    it('is kept on the model, with its reason, for the test that checks the rules', () => {
        expect(built.model.brokenRules).toEqual([{ object: 'pair1', rule: 'Droplines', why: 'Each lands on a tick.' }]);
    });
});

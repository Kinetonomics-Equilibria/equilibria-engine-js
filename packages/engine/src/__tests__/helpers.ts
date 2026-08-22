import { KineticGraph } from '../ts/kg';

/**
 * Shared test helpers.
 *
 * The engine renders a diagram; what it *means* lives in the model's calcs.
 * Asserting on rendered geometry only tells you that something was drawn, which
 * is why several wrong-answer defects survived a green suite — a diagram that
 * solves the wrong equilibrium still emits paths and still contains no "NaN".
 * `mountObjects()` exposes the evaluated calcs so tests can assert the numbers.
 */

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 400;

/**
 * jsdom never performs layout, so clientWidth/clientHeight are always 0 and
 * every scale maps to NaN. Call this in a `beforeAll` before mounting anything.
 */
export function stubContainerLayout(width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT) {
    Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {
        get() { return width; }, configurable: true
    });
    Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
        get() { return height; }, configurable: true
    });
}

export interface MountResult {
    kg: KineticGraph;
    container: HTMLElement;
    /** mount() reports failures via an 'error' event rather than throwing. */
    error: any;
    /** Evaluated calc values — the numbers the diagram actually resolved to. */
    calcs: any;
    html: string;
    /** Drawn elements, excluding the transparent dragPath hit areas. */
    shapeCount: number;
    destroy: () => void;
}

export interface MountOptions {
    params?: any[];
    calcs?: Record<string, any>;
    schema?: string;
    xAxis?: any;
    yAxis?: any;
}

/** Mount a list of graph objects in a OneGraph layout and return what it resolved to. */
export function mountObjects(objects: any[], options: MountOptions = {}): MountResult {
    const {
        params = [],
        calcs,
        schema = 'EconSchema',
        xAxis = { title: 'x', min: 0, max: 30 },
        yAxis = { title: 'y', min: 0, max: 30 }
    } = options;

    const config: any = {
        schema,
        params,
        layout: { OneGraph: { graph: { xAxis, yAxis, objects } } }
    };
    if (calcs) config.calcs = calcs;

    return mountConfig(config);
}

/** Mount a complete engine config and return what it resolved to. */
export function mountConfig(config: any): MountResult {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let error: any = null;
    const kg = new KineticGraph(config);
    kg.on('error', (e: any) => { error = e; });
    kg.mount(container);

    const shapeCount = Array.from(container.querySelectorAll('path,circle,rect,line,text'))
        .filter(el => !(el.getAttribute('class') || '').startsWith('dragPath'))
        .length;

    return {
        kg,
        container,
        error,
        calcs: (kg as any).view?.model?.currentCalcValues,
        html: container.innerHTML,
        shapeCount,
        destroy: () => {
            kg.destroy();
            container.remove();
        }
    };
}

/**
 * Capture console.warn output produced while `fn` runs.
 * Several engine failures are reported as warnings rather than thrown errors.
 */
export function captureWarnings<T>(fn: () => T): { result: T; warnings: string[] } {
    const warnings: string[] = [];
    const original = console.warn;
    console.warn = (...args: any[]) => { warnings.push(args.map(String).join(' ')); };
    try {
        return { result: fn(), warnings };
    } finally {
        console.warn = original;
    }
}

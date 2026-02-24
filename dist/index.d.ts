import * as d3_2 from 'd3';
import { EventEmitter } from 'eventemitter3';

declare interface ClickListenerDefinition extends ListenerDefinition {
    transitions: number[];
}

declare interface ClipPathDefinition {
    name: string;
    paths: TypeAndDef[];
}

declare interface DragListenerDefinition extends ListenerDefinition {
    draggable?: string;
    directions?: string;
    vertical?: string;
    horizontal?: string;
}

declare interface IModel {
    evaluate: (name: string) => any;
    addUpdateListener: (updateListener: UpdateListener) => Model;
    getParam: (name: string) => any;
    updateParam: (name: string, value: any) => void;
    toggleParam: (name: string) => void;
    cycleParam: (name: string) => void;
    update: (force: boolean) => void;
}

declare interface IParam {
    name: string;
    label: string;
    value: number;
    update: (newValue: any) => any;
    formatted: (precision?: number) => string;
}

declare interface IScale {
    scale: d3_2.ScaleLinear<Range, Range>;
}

declare interface IUpdateListener {
    model: Model;
    update: (force: boolean) => UpdateListener;
    hasChanged: boolean;
}

declare interface IView {
    updateDimensions: () => void;
}

export declare const KG_EVENTS: {
    PARAM_CHANGED: string;
    CURVE_DRAGGED: string;
    NODE_HOVER: string;
};

export declare class KineticGraph extends EventEmitter {
    private config;
    private options;
    private container;
    view: View | null;
    private resizeObserver;
    constructor(config: any, options?: KineticGraphOptions);
    mount(containerElement: HTMLElement): void;
    update(newConfig: any): void;
    destroy(): void;
}

export declare interface KineticGraphOptions {
    /** Enable legacy URL query param and div attribute overrides (default: false) */
    legacyUrlOverrides?: boolean;
}

declare interface ListenerDefinition extends UpdateListenerDefinition {
    param: string;
    expression?: string;
}

declare interface MarkerDefinition extends ViewObjectDefinition {
    name: string;
    refX: number;
    maskPath: string;
    arrowPath: string;
    url: string;
}

declare class Model implements IModel {
    private restrictions;
    private updateListeners;
    private params;
    private initialParams;
    private calcs;
    colors: {};
    idioms: {};
    clearColor: string;
    currentParamValues: {};
    currentCalcValues: {};
    currentColors: {};
    currentIdioms: {};
    constructor(parsedData: any);
    addUpdateListener(updateListener: UpdateListener): this;
    resetParams(): void;
    evalParams(): any;
    evalCalcs(): {};
    evalObject(obj: {}, onlyJSMath?: boolean): {};
    evaluate(name: string, onlyJSMath?: boolean): any;
    latexColors(): string;
    getParam(paramName: string): Param;
    updateParam(name: string, newValue: any): void;
    toggleParam(name: string): void;
    cycleParam(name: string): void;
    update(force: boolean): void;
}

declare class Param implements IParam {
    name: string;
    label: string;
    value: any;
    min: number;
    max: number;
    round: number;
    precision: number;
    constructor(def: ParamDefinition);
    update(newValue: any): any;
    formatted(precision?: number): string;
}

declare interface ParamDefinition {
    name: string;
    label: string;
    value: any;
    min?: any;
    max?: any;
    round?: any;
    precision?: any;
}

declare interface RestrictionDefinition {
    expression: string;
    type: string;
    min?: string;
    max?: string;
}

declare class Scale extends UpdateListener implements IScale {
    axis: any;
    scale: any;
    domainMin: any;
    domainMax: any;
    rangeMin: any;
    rangeMax: any;
    extent: any;
    intercept: any;
    constructor(def: ScaleDefinition);
    update(force: any): this;
    updateDimensions(width: any, height: any): this;
}

declare interface ScaleDefinition extends UpdateListenerDefinition {
    name: string;
    axis: 'x' | 'y';
    domainMin: any;
    domainMax: any;
    rangeMin: any;
    rangeMax: any;
    log?: boolean;
    intercept?: any;
}

declare interface TypeAndDef {
    type: string;
    def: any;
}

declare class UpdateListener implements IUpdateListener {
    updatables: string[];
    name: string;
    id: string;
    def: UpdateListenerDefinition;
    model: Model;
    hasChanged: boolean;
    [propName: string]: any;
    constructor(def: UpdateListenerDefinition);
    private updateArray;
    private updateDef;
    update(force: boolean): this;
}

declare interface UpdateListenerDefinition {
    model?: Model;
    updatables?: string[];
    constants?: any[];
}

declare class View implements IView {
    parsedData: any;
    private div;
    private svg;
    private model;
    private scales;
    private aspectRatio;
    private sidebar?;
    private explanation?;
    private svgContainerDiv;
    private clearColor;
    private viewOptions;
    constructor(div: Element, data: ViewDefinition, options?: ViewOptions);
    parse(data: ViewDefinition, div?: any): any;
    render(data: any, div: any): void;
    addViewToDef(def: any, layer: any): any;
    addViewObjects(data: ViewDefinition): void;
    updateDimensions(printing?: boolean): void;
}

declare interface ViewDefinition {
    aspectRatio?: number;
    nosvg?: boolean;
    clearColor?: string;
    schema?: string;
    params?: ParamDefinition[];
    greenscreen?: string;
    calcs?: {};
    templateDefaults?: {};
    colors?: {};
    idioms?: {};
    custom?: string;
    restrictions?: RestrictionDefinition[];
    objects?: TypeAndDef[];
    layout?: TypeAndDef;
    explanation?: TypeAndDef;
    scales?: ScaleDefinition[];
    clipPaths?: ClipPathDefinition[];
    markers?: MarkerDefinition[];
    layers?: TypeAndDef[][];
    divs?: TypeAndDef[];
}

declare interface ViewObjectDefinition extends UpdateListenerDefinition {
    layer?: any;
    name?: string;
    tabbable?: boolean;
    srTitle?: string;
    srDesc?: string;
    show?: any;
    xScale?: Scale;
    yScale?: Scale;
    clipPath?: string;
    clipPath2?: string;
    startArrow?: string;
    endArrow?: string;
    drag?: DragListenerDefinition[];
    click?: ClickListenerDefinition[];
    interactive?: boolean;
    alwaysUpdate?: boolean;
    inDef?: boolean;
    color?: string;
    fill?: string;
    opacity?: string;
    stroke?: string;
    strokeWidth?: string;
    strokeOpacity?: string;
    lineStyle?: string;
    clearColor?: string;
    colorAttributes?: string[];
    useTopScale?: boolean;
    useRightScale?: boolean;
    xScaleName?: string;
    yScaleName?: string;
    clipPathName?: string;
    clipPathName2?: string;
    xScaleMin?: string;
    yScaleMin?: string;
    xScaleMax?: string;
    yScaleMax?: string;
}

declare interface ViewOptions {
    legacyUrlOverrides?: boolean;
}

export { }

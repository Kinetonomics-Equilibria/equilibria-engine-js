/// <reference path='../kg.ts' />

import { Model } from "../model/model";
import { ParamDefinition } from "../model/param";
import { RestrictionDefinition } from "../model/restriction";
import { randomString } from "../model/updateListener";
import { ScaleDefinition, Scale } from "./scale";
import { MarkerDefinition, Marker } from "./viewObjects/marker";
import { ViewObjectDefinition, ViewObject } from "./viewObjects/viewObject";
import { Sample, Movement, describeMovement, noiseFor } from "./movement";
import { KG_EVENTS } from "../constants";
import { parse } from "../KGAuthor/parsers/parsingFunctions";
import { StepDefinition, compileSteps } from "../KGAuthor/parsers/steps";
import {
    AUTO_DENSITY, DensityLevel, DensityPanel, PanelDefinition,
    DENSITY_LEVELS, compileDensity, densityIndex, levelForSize
} from "../KGAuthor/parsers/density";
import "../KGAuthor/index"; // side-effect: registers all KGAuthor classes into the registry
import { ViewObjectClasses } from "./viewObjects/index";
import * as d3 from "d3";



export interface ViewOptions {
    legacyUrlOverrides?: boolean;
    snapshotOn?: 'gesture' | 'change' | 'never';
}

export interface TypeAndDef {
    type: string;
    def: any;
}

export interface ClipPathDefinition {
    name: string;
    paths: TypeAndDef[];
}

export interface ViewDefinition {
    // These are usually specified by the user
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
    /** When the model captures `prev` automatically. See docs/schema/02-parameters-and-interactions.md. */
    snapshotOn?: 'gesture' | 'change' | 'never';
    objects?: TypeAndDef[];
    layout?: TypeAndDef;
    explanation?: TypeAndDef;
    /** Declared build-up order; see KGAuthor/parsers/steps.ts. */
    steps?: StepDefinition[];

    // The rest of these are usually generated
    /** Every graph that was drawn, in construction order; see `PositionedObject.parseSelf`. */
    panels?: PanelDefinition[];
    /** The subset whose density was compiled; see `KGAuthor/parsers/density.ts`. */
    densityPanels?: DensityPanel[];
    scales?: ScaleDefinition[];
    clipPaths?: ClipPathDefinition[];
    markers?: MarkerDefinition[];
    layers?: TypeAndDef[][];
    divs?: TypeAndDef[];
}

export interface IView {
    updateDimensions: () => void;  // called on a window resize event; updates the size of the Container
}

export let viewData = {}

export function addView(name, def) {
    viewData[name] = def;
}


/** One object the app can name, and what it just did. */
export interface AffectedObject {
    name: string;
    title: string;
    movement: Movement;
}

/** The payload of `kg:param_changed`. Additive: `affected` may be empty. */
export interface ParamChangedEvent {
    name: string;
    value: any;
    previousValue: any;
    params: { [name: string]: any };
    /**
     * Every calc, as it now stands.
     *
     * The event said what *changed* and what *moved*, and not what anything
     * *is* — so a host wanting to put a number beside a diagram had to either
     * reach into the model or re-derive the calc in its own code, which is the
     * duplication the calcs exist to prevent. A delta belongs here too, and is
     * an ordinary calc over `prev`: `'calcs.Pe - prev.calcs.Pe'` is computed by
     * the engine, from the same snapshot the ghosts are drawn from.
     *
     * A shallow copy, matching `getSnapshot()`: nested calc objects are shared,
     * so treat them as read-only.
     */
    calcs: { [name: string]: any };
    affected: AffectedObject[];
}

export class View implements IView {

    public parsedData;

    /**
     * Every drawn object, kept so the view can be asked what moved.
     *
     * They were previously constructed and dropped on the floor — the model held
     * them as update listeners and nothing else could reach them, which is why
     * the engine could not answer "which object did that param move?".
     */
    public viewObjects: ViewObject[] = [];

    /**
     * The event emitter, installed by `KineticGraph` after construction.
     *
     * Declared here rather than bolted on as `(view as any).emitter`, because
     * the view now decides whether to do work based on whether anyone is
     * listening.
     */
    public emitter: any = null;

    /**
     * Geometry as it was at the last snapshot, keyed by view-object id.
     *
     * Keyed by `id` and not by `name`: one object may legitimately be drawn as
     * several curves sharing a name (an indifference curve either side of its
     * asymptote), and keying by name would silently keep only the last.
     */
    private geometryAtSnapshot: { [id: string]: Sample[] } = {};

    /**
     * The panels whose level the engine chooses, resolved once.
     *
     * Held rather than filtered on demand because the refresh runs on every
     * accepted param change — a drag is ~60 a second — and the overwhelmingly
     * common case is a config with none, which should cost a length check.
     */
    private autoDensityPanels: DensityPanel[] = [];
    private div: any;
    private svg: any;
    private model: Model;
    private scales: Scale[];
    private aspectRatio: number;
    private svgContainerDiv: any;
    private clearColor: string;
    private viewOptions: ViewOptions;

    constructor(div: Element, data: ViewDefinition, options?: ViewOptions) {
        this.viewOptions = options || {};
        this.render(data, div);
    }

    parse(data: ViewDefinition, div?) {

        if (data.hasOwnProperty('templateDefaults')) {
            // Any terms not defined in the user's overrides should revert to the template defaults
            const defaults = data.templateDefaults;
            let dataString = JSON.stringify(data);
            for (const key in defaults) {
                let searchTerm = new RegExp("template.\\b" + key + "\\b", "g");
                let replaceTerm = defaults[key];
                dataString = dataString.replace(searchTerm, replaceTerm);
            }
            data = JSON.parse(dataString);
        }

        data.schema = data.schema || "Schema";

        const useLegacyOverrides = !!this.viewOptions.legacyUrlOverrides;

        // Only read URL params if legacy overrides are enabled
        let urlParams: URLSearchParams | null = null;
        if (useLegacyOverrides) {
            try {
                urlParams = new URLSearchParams(window.location.search);
            } catch (e) {
                // window.location may not be available in headless/SSR environments
            }
        }

        // override params
        data.params = (data.params || []).map(function (paramData) {
            if (useLegacyOverrides) {
                // allow author to override initial parameter values by specifying them as div attributes
                if (div && div.hasAttribute && div.hasAttribute(paramData.name)) {
                    paramData.value = div.getAttribute(paramData.name)
                }

                // allow user to override parameter values by specifying them in the URL
                if (urlParams) {
                    const urlParamValue = urlParams.get(paramData.name);
                    if (urlParamValue) {
                        paramData.value = urlParamValue
                    }
                }
            }

            // Recorded before any of the coercions below, because each of them
            // destroys the evidence: a param declared `true` leaves here as the
            // number 1 with numeric bounds, and nothing downstream can tell it
            // from a small integer. A host building a control panel needs to —
            // offering a continuous slider for a toggle is the visible failure —
            // and `Param` cannot work it out either, since `+true` has already
            // happened by the time it is constructed.
            if (typeof paramData.value == 'boolean'
                || paramData.value == 'true' || paramData.value == 'false') {
                paramData.isBoolean = true;
            }

            // convert boolean params from strings to numbers
            if (paramData.value == 'true') {
                paramData.value = 1;
            }
            if (paramData.value == 'false') {
                paramData.value = 0;
            }

            // convert numerical params from strings to numbers. `+true` is 1, so
            // this is also what erases a real boolean — the string forms above
            // only ever arrive from a div attribute or a URL override.
            paramData.value = isNaN(+paramData.value) ? paramData.value : +paramData.value;

            return paramData;
        });

        // allow author to set clear color as div attribute (legacy mode only)
        if (useLegacyOverrides && div && div.hasAttribute && div.hasAttribute("clearColor")) {
            data.clearColor = div.getAttribute("clearColor")
        }


        let parsedData: ViewDefinition = {
            templateDefaults: data.templateDefaults || {},
            aspectRatio: data.aspectRatio || 1,
            clearColor: data.clearColor || "#FFFFFF",
            params: data.params || [],
            calcs: data.calcs || {},
            colors: data.colors || {},
            custom: data.custom || "",
            idioms: data.idioms || {},
            restrictions: data.restrictions,
            // The constructor option wins over the config key, matching legacyUrlOverrides.
            snapshotOn: this.viewOptions.snapshotOn || data.snapshotOn,
            clipPaths: data.clipPaths || [],
            markers: data.markers || [],
            scales: data.scales || [{
                name: 'x',
                axis: 'x' as const,
                rangeMin: 0,
                rangeMax: 1,
                domainMin: 0,
                domainMax: 1
            },
            {
                name: 'y',
                axis: 'y' as const,
                rangeMin: 0,
                rangeMax: 1,
                domainMin: 0,
                domainMax: 1
            }],
            layers: data.layers || [[], [], [], []],
            divs: data.divs || []
        };

        data.objects = data.objects || [];

        if (data.hasOwnProperty('layout')) {
            if (data.layout.hasOwnProperty('type')) {
                data.objects.push(data.layout)
            } else {
                const layoutType = Object.keys(data.layout)[0],
                    layoutDef = data.layout[layoutType];
                data.objects.push({ type: layoutType, def: layoutDef });
            }
        }

        if (data.hasOwnProperty('explanation')) {
            // There is no `Explanation` class exported from KGAuthor, so this only ever
            // produced `Unknown object type "Explanation"` and was dropped. Prose beside a
            // diagram is the host application's job — say so by name, as the layout keys do.
            console.warn(
                'View: "explanation" is not rendered by the engine. Prose beside a diagram is ' +
                "the host application's responsibility."
            );
        }

        if (data.hasOwnProperty('schema')) {
            if (useLegacyOverrides && urlParams && urlParams.get('custom')) {
                parsedData.custom = urlParams.get('custom');
            }
            data.objects.push({ type: data.schema, def: { custom: parsedData.custom } })
        }



        parsedData = parse(data.objects, parsedData);

        // After parse, not before: a step names objects, and the objects do not
        // exist until the layout and its composites have been built.
        if (data.steps) {
            parsedData.steps = data.steps;
            parsedData = compileSteps(data.steps, parsedData);
        }

        // After steps, for the same reason and one more: both conjoin into
        // `show`, and a step's reveal predicate and a density level are two
        // independent claims about whether an object is on screen. Composing
        // them in either order gives the same conjunction; composing only one
        // would be a silent wrong answer.
        parsedData = compileDensity(parsedData);

        return parsedData;
    }

    render(data, div) {
        let view = this;
        const parsedData = view.parse(data, div);



        div.innerHTML = "";

        view.aspectRatio = data.aspectRatio || parsedData.aspectRatio || 1;
        view.model = new Model(parsedData);

        // Two scales with one name is a silent wrong answer: `addViewToDef`'s lookup
        // keeps the *last* match, so every object naming that scale is drawn against
        // whichever panel happened to be built second.
        const scaleNamesSeen: { [name: string]: boolean } = {};
        parsedData.scales.forEach(function (def: ScaleDefinition) {
            if (scaleNamesSeen[def.name]) {
                console.warn(
                    `View: two scales are named "${def.name}". Objects referring to it will be drawn ` +
                    `against the last one defined. Panel keys and graph names must be unique.`
                );
            }
            scaleNamesSeen[def.name] = true;
        });

        // create scales
        view.scales = parsedData.scales.map(function (def: ScaleDefinition) {
            def.model = view.model;
            return new Scale(def);
        });

        // create the div for the view
        view.div = d3.select(div)
            .style('position', 'relative');


        // create a spacer div to make sure text flows properly around the graph
        view.svgContainerDiv = view.div.append('div')
            .style('position', 'absolute')
            .style('left', '0px')
            .style('top', '0px');

        // create the SVG element for the view
        if (!parsedData.nosvg) {
            view.svg = view.svgContainerDiv.append('svg')
                .style('overflow', 'visible')
                .style('pointer-events', 'none');
        }

        // Before the objects are built, not after: `addViewObjects` ends by
        // calling `updateDimensions`, which resolves every `auto` panel's level
        // from its measured size — and it reads that list off `parsedData`. Set
        // afterwards, the first frame drew at full detail and only corrected on
        // the next resize.
        this.parsedData = parsedData;
        view.autoDensityPanels = (parsedData.densityPanels || [])
            .filter((p: DensityPanel) => p.declared === AUTO_DENSITY);
        view.addViewObjects(parsedData);

        // The "before" every later comparison is made against. Taken once here so
        // the very first interaction has one, then re-taken on every snapshot.
        view.captureGeometry();

        view.model.onSnapshot = function () { view.captureGeometry() };
        view.model.onParamChange = function (change) {
            // Density first, so the payload below describes a diagram that has
            // finished responding. A panel promoted by a param change grows in
            // the same tick, and an `auto` panel that grew past a threshold has
            // to change level with it or the promotion animates into a glyph.
            if (view.refreshAutoDensity()) view.model.update(false);
            view.reportParamChange(change);
        };
    }

    /** The scale of that name, or null. Duplicated names keep the last, which `render` warns about. */
    private getScale(name): Scale | null {
        let result: Scale | null = null;
        this.scales.forEach(function (scale) {
            if (scale.name == name) {
                result = scale;
            }
        });
        return result;
    }

    // add view information (model, layer, scales) to an object
    addViewToDef(def, layer) {
        const view = this;

        const getScale = (name) => view.getScale(name);

        def.model = view.model;
        // A live reference, not the emitter itself: `KineticGraph` installs the
        // emitter after the view is built, so an object that captured it here
        // would capture null.
        def.view = view;
        def.layer = layer;
        def.svgContainerDiv = view.svgContainerDiv;
        def.xScale = getScale(def['xScaleName']);
        def.yScale = getScale(def['yScaleName']);
        if (def.hasOwnProperty('xScale2Name')) {
            def.xScale2 = getScale(def['xScale2Name']);
            def.yScale2 = getScale(def['yScale2Name']);

            // A cross-graph object whose second graph was never wired used to take the
            // whole diagram down: the object reads `xScale2.scale` while drawing, that
            // threw, and mount() reported a failed render with nothing on screen. The
            // two ways to get here are both authoring errors worth naming — a layout
            // that never linked its panels (the name is still the empty string it was
            // declared with), and a link to a panel key that does not exist.
            if (!def.xScale2 || !def.yScale2) {
                def.unresolvedSecondGraph = def['xScale2Name'] || def['yScale2Name'] || '(unlinked)';
            }
        }
        return def;
    }

    // create view objects
    addViewObjects(data: ViewDefinition) {

        const view = this;

        let defURLS = {};

        if (view.svg) {
            const defLayer = view.svg.append('defs');

            // create ClipPaths, generate their URLs, and add their paths to the SVG defs element.
            if (data.clipPaths.length > 0) {
                data.clipPaths.forEach(function (def: ClipPathDefinition) {
                    const clipPathURL = randomString(10);
                    const clipPathLayer = defLayer.append('clipPath').attr('id', clipPathURL);
                    def.paths.forEach(function (td) {
                        td.def.inDef = true;
                        if (Object.prototype.hasOwnProperty.call(ViewObjectClasses, td.type)) {
                            new ViewObjectClasses[td.type](view.addViewToDef(td.def, clipPathLayer));
                        } else {
                            console.warn("ViewObject type not found in ViewObjectClasses: ", td.type);
                        }
                    });
                    defURLS[def.name] = clipPathURL;
                });
            }

            // create Markers, generate their URLs, and add their paths to the SVG defs element.
            if (data.markers.length > 0) {
                data.markers.forEach(function (def: MarkerDefinition) {
                    const markerURL = randomString(10);
                    def.url = markerURL;
                    defURLS[def.name] = markerURL;

                    const markerLayer = defLayer.append('marker')
                        .attr('id', markerURL)
                        .attr("refX", def.refX)
                        .attr("refY", 6)
                        .attr("markerWidth", 13)
                        .attr("markerHeight", 13)
                        .attr("orient", "auto")
                        .attr("markerUnits", "userSpaceOnUse");

                    view.addViewToDef(def, markerLayer);
                    new Marker(def);
                });
            }


            // add layers of objects
            data.layers.forEach(function (layerTds: TypeAndDef[]) {
                if (layerTds.length > 0) {
                    const layer = view.svg.append('g');
                    layerTds.forEach(function (td) {
                        let def: ViewObjectDefinition = td.def;
                        if (def.hasOwnProperty('clipPathName')) {
                            def.clipPath = defURLS[def['clipPathName']]
                        }
                        if (def.hasOwnProperty('clipPathName2')) {
                            def.clipPath2 = defURLS[def['clipPathName2']]
                        }
                        if (def.hasOwnProperty('startArrowName')) {
                            def.startArrow = defURLS[def['startArrowName']]
                        }
                        if (def.hasOwnProperty('endArrowName')) {
                            def.endArrow = defURLS[def['endArrowName']]
                        }
                        def = view.addViewToDef(def, layer);
                        if (def['unresolvedSecondGraph']) {
                            console.warn(
                                `View: ${td.type} refers to a second graph "${def['unresolvedSecondGraph']}" that ` +
                                `no scale is named after, so it was not drawn. A cross-graph object needs its ` +
                                `panels linked — in CustomLayout that is "linkTo".`
                            );
                        } else if (Object.prototype.hasOwnProperty.call(ViewObjectClasses, td.type)) {
                            view.viewObjects.push(new ViewObjectClasses[td.type](def));
                        } else {
                            console.warn("ViewObject type not found in ViewObjectClasses: ", td.type);
                        }
                    })
                }
            });

        } // close view.svg check

        // process divs (like labels that overlay the svg)
        if (data.divs && data.divs.length > 0) {
            const divLayer = view.svgContainerDiv;
            data.divs.forEach(function (td: TypeAndDef) {
                let def: ViewObjectDefinition = td.def;
                def = view.addViewToDef(def, divLayer);
                if (Object.prototype.hasOwnProperty.call(ViewObjectClasses, td.type)) {
                    view.viewObjects.push(new ViewObjectClasses[td.type](def));
                } else {
                    console.warn("ViewObject type not found in ViewObjectClasses: ", td.type);
                }
            });
        }

        view.updateDimensions();
    }

    /**
     * The objects the engine is willing to describe: the ones with a human name,
     * that are on screen, and whose geometry means something.
     *
     * A title is the gate because an untitled object has nothing an app could
     * call it — narration would be reduced to reading out `KGID_9fA…`. Hidden
     * objects are excluded because they also do not redraw, so their sampled
     * geometry is whatever it was when they were last visible; saying that a
     * curve nobody can see shifted right would be both useless and wrong.
     */
    private narratableObjects(): ViewObject[] {
        return this.viewObjects.filter(function (vo) {
            return !!vo.title && !!vo.show && !vo.inDef;
        });
    }

    /**
     * Record where everything is now, as the state later changes are measured
     * against. Called as `prev` is captured, so a ghost and a sentence about the
     * same interaction are always describing the same "before".
     */
    captureGeometry() {
        const view = this;
        view.geometryAtSnapshot = {};
        view.narratableObjects().forEach(function (vo) {
            const samples = vo.sampleGeometry();
            if (samples) view.geometryAtSnapshot[vo.id] = samples;
        });
    }

    /**
     * Which named objects have moved since the snapshot, and how.
     *
     * Measured against the snapshot rather than against the previous frame, so
     * a drag reports the whole movement from where the student grabbed it —
     * the same comparison `prev.changed` makes, which is what keeps the ghost
     * and the sentence describing one event rather than two.
     */
    whatMoved(): AffectedObject[] {
        const view = this;
        const affected: AffectedObject[] = [];

        view.narratableObjects().forEach(function (vo) {
            const before = view.geometryAtSnapshot[vo.id],
                after = vo.sampleGeometry();
            if (!before || !after) return;

            const movement = describeMovement(
                before, after,
                noiseFor(vo.xScale.domainMin, vo.xScale.domainMax),
                noiseFor(vo.yScale.domainMin, vo.yScale.domainMax)
            );
            if (movement) {
                affected.push({ name: vo.name, title: vo.title, movement: movement });
            }
        });

        return affected;
    }

    /**
     * Announce an accepted param change, with what it did to the diagram.
     *
     * Nothing is measured when nothing is listening. Comparing geometry is
     * cheap — a subtraction per sampled point, against data the redraw beside
     * it already generated — but "cheap" is not "free" on a path that runs
     * sixty times a second, and a diagram with no host attached should not pay
     * for a feature no one asked for.
     */
    private reportParamChange(change: { name: string, value: any, previousValue: any }) {
        const view = this;
        if (!view.emitter || view.emitter.listenerCount(KG_EVENTS.PARAM_CHANGED) === 0) return;

        const payload: ParamChangedEvent = {
            name: change.name,
            value: change.value,
            previousValue: change.previousValue,
            params: { ...view.model.currentParamValues },
            calcs: { ...view.model.currentCalcValues },
            affected: view.whatMoved()
        };
        view.emitter.emit(KG_EVENTS.PARAM_CHANGED, payload);
    }

    /**
     * A panel's short side, in pixels.
     *
     * The scales hold the panel's edges as fractions and its `extent` as the
     * canvas dimension along that axis, both already recomputed for this tick —
     * so the panel's box is available without measuring the DOM, which is what
     * makes this cheap enough to run on a param change.
     */
    private panelShortSidePx(panel: DensityPanel): number {
        const view = this,
            xs = view.getScale(panel.xScaleName),
            ys = view.getScale(panel.yScaleName);
        if (!xs || !ys || xs.extent == undefined || ys.extent == undefined) return NaN;
        const width = Math.abs(xs.rangeMax - xs.rangeMin) * xs.extent,
            height = Math.abs(ys.rangeMax - ys.rangeMin) * ys.extent;
        return Math.min(width, height);
    }

    /**
     * Choose a level for every `auto` panel from its measured size, and report
     * whether any of them moved.
     *
     * Written straight onto the param rather than through `updateParam`, and
     * the difference matters: a density change is the layout answering a
     * question about itself, not a student changing the state. Going through
     * `updateParam` would submit it to the restrictions — a level could be
     * *rejected*, leaving a panel drawing furniture it has no room for — and
     * would announce a `kg:param_changed` that no one caused. The caller
     * broadcasts once instead.
     */
    private refreshAutoDensity(): boolean {
        const view = this,
            panels = view.autoDensityPanels;
        if (panels.length === 0) return false;

        let changed = false;
        panels.forEach(function (panel) {
            const px = view.panelShortSidePx(panel);
            if (!isFinite(px)) return;
            const param = view.model.getParam(panel.param);
            if (!param) return;
            const wanted = densityIndex(levelForSize(px));
            if (param.value !== wanted) {
                param.update(wanted);
                changed = true;
            }
        });
        return changed;
    }

    /**
     * Set one panel's level of detail.
     *
     * A param update and nothing else, so a panel changes level without a
     * remount — which is what lets it change *as* it grows, rather than
     * snapping when the animation ends.
     */
    setDensity(key: string, level: DensityLevel) {
        const view = this,
            panels: DensityPanel[] = (view.parsedData && view.parsedData.densityPanels) || [],
            panel = panels.filter(p => p.key === key)[0];

        if (!panel) {
            const known = panels.map(p => `"${p.key}"`).join(', ');
            console.warn(`setDensity: no panel "${key}" declares a density, so there is nothing to set. ` +
                (known ? `Panels that do: ${known}.` : `Declare "density" on a panel to make it settable.`));
            return;
        }

        if (DENSITY_LEVELS.indexOf(level) < 0) {
            console.warn(`setDensity: "${level}" is not a level. Use one of ${DENSITY_LEVELS.join(', ')}.`);
            return;
        }

        if (panel.declared === AUTO_DENSITY) {
            console.warn(`setDensity: panel "${key}" is declared density "${AUTO_DENSITY}", so the engine ` +
                `will choose again from its measured size on the next update and overwrite this. ` +
                `Declare a level instead of "${AUTO_DENSITY}" to drive it from the host.`);
        }

        view.model.updateParam(panel.param, densityIndex(level));
    }

    // update dimensions, either when first rendering or when the window is resized
    updateDimensions(printing?: boolean) {
        let view = this;

        printing = !!printing;

        //console.log('printing is ', printing);

        let width = 0, height = 0, displayHeight = 0;

        if (printing) {

            width = 600;
            height = width / view.aspectRatio;
            displayHeight = height + 20
        } else {
            // read the client width of the enclosing div and calculate the height using the aspectRatio
            let clientWidth = view.div.node().clientWidth;

            width = clientWidth;
            height = width / view.aspectRatio;

            displayHeight = height + 10

        }

        view.div.style('height', displayHeight + 'px');


        // set the height of the div

        // `svgContainerDiv` is deliberately unsized: it is a zero-size positioning origin
        // at (0,0), which is all the absolutely positioned label divs need. It used to carry
        // .style('width', <number>) calls, which d3 stringified to "800" — not a valid CSS
        // length, so the browser discarded them. Do not "fix" those by adding px; that would
        // give the div a real box for the first time and move every label.

        if (view.svg) {
            // set the dimensions of the svg — attributes, not styles, are what size it
            view.svg.attr('width', width);
            view.svg.attr('height', height);
        }

        // adjust all of the scales to be proportional to the new dimensions
        view.scales.forEach(function (scale) {
            scale.updateDimensions(width, height);
        });

        // Between the scales and the broadcast: an `auto` panel's level is a
        // function of the size just computed, and setting it here means the one
        // update below carries both the new geometry and the level that goes
        // with it, rather than drawing the old level for a frame.
        view.refreshAutoDensity();

        // once the scales are updated, update the coordinates of all view objects
        view.model.update(true);
    }
}



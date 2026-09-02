import { getDefinitionProperty } from "./parsingFunctions";
import { ViewDefinition } from "../../view/view";

/**
 * Declared build-up order.
 *
 * `show: 'params.step >= 3'` per object already works, and P0 confirmed it in
 * practice, un-revealing on the way back included. So this adds no capability —
 * it removes an authoring cost that was measured rather than guessed: 24
 * characters on every object, the step number duplicated into each one, and
 * renumbering a step means editing all of them.
 *
 * It therefore compiles down to exactly that mechanism instead of introducing a
 * second one. There is one code path for visibility, hand-written `show`
 * expressions keep working, and an author can mix the two.
 *
 * What is deliberately *not* here is the timeline: scrubbing, back and forward,
 * lesson prompts, and applying a step's `set` params. The engine supplies
 * addressable objects and a reveal predicate; the app owns the rest (P10).
 */

export interface StepDefinition {
    /**
     * What to reveal at this step: an object's name, or a panel's key. Whatever
     * a step reveals stays revealed at later ones.
     */
    reveal?: string[];
    /**
     * Params this step establishes. **Read, not applied** — see `steps()` on
     * `KineticGraph`. Applying them is the host's business because a multi-param
     * update is not atomic today: the engine validates each param alone, so a
     * legal destination reached through an illegal interim is rejected halfway
     * and rolled back silently. Ordering that safely needs to be a decision
     * someone makes, not one the engine makes quietly.
     */
    set?: { [paramName: string]: any };
}

/** The param the compiled predicates read. Authors may declare it themselves. */
export const STEP_PARAM = 'step';

/**
 * Every parsed object that can carry a `show`, across the layers and the divs.
 *
 * Exported because density compiles the same way steps do — over the parsed
 * objects, conjoining predicates — and two walks of `layers`/`divs` that could
 * drift apart would be one walk too many.
 */
export function allObjects(parsedData: ViewDefinition): any[] {
    const layers: any[] = (parsedData.layers || []) as any[];
    return layers.reduce((all: any[], layer: any[]) => all.concat(layer), [])
        .concat(parsedData.divs || []);
}

/**
 * Combine a reveal predicate with whatever the author already wrote.
 *
 * Conjunction rather than replacement, and the choice is worth stating: an
 * object that is revealed at step 2 *and* conditional on `params.showMR` is
 * making two claims, and honouring one by discarding the other would be a
 * silent wrong answer of exactly the kind this engine keeps producing. Both
 * hold, or the object stays hidden.
 */
export function combineShow(existing: any, predicate: string): string {
    if (existing === undefined || existing === null || existing === true || existing === 'true') {
        return predicate;
    }
    // `and`, not `&&`. mathjs has no `&&` operator: it throws, `evaluate()`
    // catches, and the expression comes back as its own source string — which is
    // non-empty and therefore truthy, so an object written that way is
    // permanently visible. See Model.evaluate's diagnostic.
    return `(${getDefinitionProperty(String(existing))} and (${predicate}))`;
}

/**
 * Rewrite `show` on every object a step names, and make sure the param those
 * predicates read exists.
 */
export function compileSteps(steps: StepDefinition[], parsedData: ViewDefinition): ViewDefinition {

    if (!Array.isArray(steps) || steps.length === 0) return parsedData;

    const objects = allObjects(parsedData);

    // Panels by key, so a reveal can name one. The scale name rather than the
    // key is what an object actually carries, which is why this is a lookup
    // rather than a string comparison — the same tie `compileDensity` uses.
    const panelScales: { [key: string]: string } = {};
    ((parsedData.panels || []) as any[]).forEach(function (panel) {
        if (panel && panel.name) panelScales[panel.name] = panel.xScaleName;
    });

    // An object is revealed by its own name, by the name of the thing it is
    // part of, or by the key of the panel it is drawn in.
    //
    // The first two are the same claim at two scales: a point's droplines and
    // axis labels are separate objects with their own names, and revealing "the
    // equilibrium" plainly means revealing what hangs off it. The third is a
    // scale up again, and it is the only way to reveal a panel's *frame* — a
    // graph's axes and their titles are built from `xAxis`/`yAxis` and never
    // named, so a pre-declared panel that is not yet in the lesson would
    // otherwise sit there showing an empty labelled box.
    const matching = function (name: string): any[] {
        const scale = panelScales[name];
        return objects.filter(o => o.def && (
            o.def.name === name ||
            o.def.partOf === name ||
            (scale !== undefined && o.def.xScaleName === scale)
        ));
    };

    const revealedAt: { [name: string]: number } = {};

    // Which reveal already claimed an object, by def identity. Two names can
    // reach one object — a panel key and an object's own name — and the
    // predicates conjoin, so the later step silently wins. That is a defensible
    // resolution and an indefensible way to learn about it.
    const claimedBy = new WeakMap<object, { name: string; step: number }>();

    steps.forEach(function (step, i) {
        const stepNumber = i + 1;
        (step.reveal || []).forEach(function (name) {

            if (Object.prototype.hasOwnProperty.call(revealedAt, name)) {
                console.warn(`steps: "${name}" is revealed at step ${revealedAt[name]} and again at ` +
                    `step ${stepNumber}. An object is revealed once; the earlier step wins.`);
                return;
            }

            const found = matching(name);

            if (found.length === 0) {
                console.warn(`steps: step ${stepNumber} reveals "${name}", which is not the name of any ` +
                    `object or panel in this diagram. Nothing was hidden, so the step will appear to do ` +
                    `nothing. Only objects the author named, and panels with a key, are addressable.`);
                return;
            }

            revealedAt[name] = stepNumber;
            found.forEach(function (o) {
                const claim = claimedBy.get(o.def);
                if (claim && claim.step !== stepNumber) {
                    console.warn(`steps: "${o.def.name}" is revealed at step ${claim.step} as ` +
                        `"${claim.name}" and again at step ${stepNumber} as "${name}". Both predicates ` +
                        `hold, so it appears at step ${Math.max(claim.step, stepNumber)}.`);
                }
                claimedBy.set(o.def, { name: name, step: stepNumber });
                o.def.show = combineShow(o.def.show, `params.${STEP_PARAM} >= ${stepNumber}`);
            });
        });
    });

    // Declare the param the predicates read, unless the author already has —
    // they may want their own range, rounding or starting step.
    const params: any[] = (parsedData.params || []) as any[];
    if (!params.some(p => p.name === STEP_PARAM)) {
        params.push({
            name: STEP_PARAM,
            value: 0,
            min: 0,
            max: steps.length,
            round: 1,
            // Where the build-up has got to, not anything the student moved.
            // `prev.changed` gates every ghost an author draws and counts any
            // non-presentation param that differs from the snapshot, so without
            // this flag advancing a step draws a dashed ghost of a curve nobody
            // touched, and a shift arrow to go with it. The density param
            // carries it for the same reason.
            presentation: true
        });
        parsedData.params = params;
    }

    return parsedData;
}

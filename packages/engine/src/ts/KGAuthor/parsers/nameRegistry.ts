/**
 * Object names double as calc keys: a line named `demand` publishes its slope,
 * intercepts and points at `calcs.demand`, which is what expressions such as
 * `calcs.demand.PQ.y` read. Most objects default to a random name, but the econ
 * objects default to a semantic one - `demand`, `supply`, `equilibrium`,
 * `monopoly`, `ppf` - so that an author who never names anything can still refer
 * to the curve they drew.
 *
 * Two unnamed objects of the same kind therefore claimed the same key, and
 * `Line.parseSelf` merges into `parsedData.calcs` with `setDefaults`, which
 * skips keys that already exist. The first writer won and the second curve's
 * calcs were silently dropped: the second demand curve in a diagram reported
 * the first one's slope and intercepts.
 *
 * The registry keeps that convenience without the collision. The first claim on
 * a base name is handed out unqualified, so every config that already refers to
 * `calcs.demand` keeps working, and later claims get a numbered variant
 * (`demand2`, `demand3`, ...). Names the author wrote themselves are never
 * rewritten - that would break the author's own references - but they are
 * registered, so a generated name never lands on top of one, and a duplicate
 * explicit name warns instead of silently dropping calcs.
 *
 * Scope is one parse of one diagram: `parse()` resets the registry before
 * building the object tree, so names are stable across mounts and independent
 * between diagrams on the same page.
 */

let claimedNames: { [name: string]: boolean } = {};

/**
 * Defs whose name has already been registered.
 *
 * An econ composite claims its name and then calls `super(def)` with the *same*
 * def object, so `GraphObject` sees a name that is already spoken for. Without a
 * marker the second pass reads as a duplicate and warns about a collision the
 * author did not cause. Held by def identity rather than by a property, so
 * nothing lands in the parsed output.
 */
let claimedDefs: WeakSet<object> = new WeakSet();

export function resetNameRegistry() {
    claimedNames = {};
    claimedDefs = new WeakSet();
}

/**
 * Claims a name the author supplied. Returns it unchanged - authors' references
 * point at this exact key - but warns when something already holds it, since
 * whichever object parses second will lose its calcs.
 */
export function claimName(name: string): string {
    if (claimedNames[name]) {
        console.warn(`Duplicate object name "${name}": its calcs (calcs.${name}) are shared between objects, and only the first one parsed is kept. Give each object a distinct name.`);
    }
    claimedNames[name] = true;
    return name;
}

/**
 * Returns an unclaimed name for an object the author did not name: `base` for
 * the first claim, then `base2`, `base3`, and so on.
 */
export function defaultName(base: string): string {
    if (!claimedNames[base]) {
        claimedNames[base] = true;
        return base;
    }
    let n = 2;
    while (claimedNames[base + n]) {
        n++;
    }
    claimedNames[base + n] = true;
    return base + n;
}

/**
 * Registers a def's author-supplied name, once.
 *
 * Every graph object goes through here, not only the econ ones: a name is how an
 * object is addressed from outside — by narration, by a lesson step, by a host
 * asking what moved — so two objects answering to one name is a fault whatever
 * their type. Returns true if this call is what registered it.
 */
export function claimNameOnce(def): boolean {
    if (!def || !def.hasOwnProperty('name') || claimedDefs.has(def)) return false;
    claimedDefs.add(def);
    if (isGeneratedName(def.name)) return false;
    claimName(def.name);
    return true;
}

/**
 * Is this a name the engine minted rather than a name someone chose?
 *
 * `randomString` prefixes every default it hands out, which is the only
 * available signal by the time a def reaches `GraphObject` — the author's name
 * and a default already applied to a copied def look identical there. A
 * generated name is not an address: nothing refers to it, two objects carrying
 * the same one is not an authoring error, and warning about it would report a
 * collision the author cannot see or fix.
 */
export function isGeneratedName(name: any): boolean {
    return typeof name === 'string' && name.indexOf('KGID_') === 0;
}

/**
 * Marks a def as another *piece of the same object*, so it carries the name it
 * was copied with but does not claim it a second time.
 *
 * A curve drawn in two branches — an indifference curve either side of its
 * asymptote, a function sampled over two ranges — is one thing the author named
 * once, and its parts deliberately merge into one calc entry. That is the
 * opposite case from `anonymizeCopy`: there the copy is a different object and
 * must not inherit the name; here it is the same object and must.
 */
export function reuseName(def) {
    if (def) claimedDefs.add(def);
    return def;
}

/**
 * Strips identity from a def copied to build a *decoration* of the original —
 * a dropline, an axis label, a curve's own label.
 *
 * `copyJSON(def)` is taken after the parent has already been stamped with a
 * name, so without this the dropline hanging off a point called `equilibrium`
 * is also called `equilibrium`, and so is its axis label. That was invisible
 * while a name was only a calc key that decorations never write to. It stops
 * being invisible the moment a name is an address: three objects answer to it,
 * and a title meant for one of them narrates as three.
 */
export function anonymizeCopy(def) {
    // Keep a back-reference to what this decorates. It is the only thing that
    // still ties the two together once the name is gone, and a lesson step that
    // reveals a point plainly means to reveal its droplines with it.
    if (def && def.name && !def.partOf) def.partOf = def.name;
    delete def.name;
    delete def.title;
    return def;
}

/**
 * Assigns `def.name` for an econ object with a semantic default: registers the
 * author's name if there is one, otherwise generates a unique default.
 *
 * `title` is the human name the same object answers to in prose — "demand" where
 * the drawn label is `D` and the name is a calc key. It is defaulted here rather
 * than left to authors because a narration feature that only works on
 * hand-titled diagrams works on almost none of them. The rules, in order: the
 * author's `title` wins; then the author's `name`, which is already a word they
 * chose for this object; otherwise the composite's own word, carrying the
 * registry's numbering so a second demand curve is "demand 2" rather than a
 * second thing called "demand".
 */
export function setEconName(def, base: string, title?: string) {
    const authorNamed = def.hasOwnProperty('name');
    def.name = authorNamed ? claimName(def.name) : defaultName(base);
    claimedDefs.add(def);

    if (!def.hasOwnProperty('title')) {
        if (authorNamed) {
            def.title = def.name;
        } else {
            const suffix = def.name.slice(base.length);
            def.title = (title || base) + (suffix ? ' ' + suffix : '');
        }
    }

    return def;
}

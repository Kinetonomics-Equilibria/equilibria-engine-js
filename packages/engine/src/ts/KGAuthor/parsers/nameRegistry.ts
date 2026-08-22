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

export function resetNameRegistry() {
    claimedNames = {};
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
 * Assigns `def.name` for an econ object with a semantic default: registers the
 * author's name if there is one, otherwise generates a unique default.
 */
export function setEconName(def, base: string) {
    def.name = def.hasOwnProperty('name') ? claimName(def.name) : defaultName(base);
    return def;
}

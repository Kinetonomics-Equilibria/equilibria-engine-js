export function setDefaults(def: any, defaults: any) {
    if (!def) def = {};
    for (let key in defaults) {
        if (!def.hasOwnProperty(key)) {
            def[key] = defaults[key];
        }
    }
    return def;
}

export function setProperties(def: any, propertyName: string, properties: string[]) {
    if (!def[propertyName]) {
        def[propertyName] = [];
    }
    properties.forEach(function (prop) {
        def[propertyName].push(prop);
    });
    return def;
}

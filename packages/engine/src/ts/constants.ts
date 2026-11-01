export const KG_EVENTS = {
    PARAM_CHANGED: 'kg:param_changed',
    /** A change the diagram would not make: a param bound, or an author's restriction. */
    PARAM_BLOCKED: 'kg:param_blocked',
    CURVE_DRAGGED: 'kg:curve_dragged',
    NODE_HOVER: 'kg:node_hover'
};

/**
 * The class on a handle's group (view/handles.ts). Exported for a host that
 * draws a picture of a diagram: a handle is there to be dragged, so it has no
 * place on a picture, as the print stylesheet has it off the paper. Find them
 * and hide them before drawing, since a copy of an SVG takes the page's
 * stylesheets with it in no way a rule here could reach.
 */
export const KG_HANDLE_CLASS = 'kg-handle';

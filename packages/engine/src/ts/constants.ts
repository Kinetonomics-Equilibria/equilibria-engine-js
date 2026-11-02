export const KG_EVENTS = {
    PARAM_CHANGED: 'kg:param_changed',
    /** A change the diagram would not make: a param bound, or an author's restriction. */
    PARAM_BLOCKED: 'kg:param_blocked',
    CURVE_DRAGGED: 'kg:curve_dragged',
    NODE_HOVER: 'kg:node_hover'
};

/** The class on a handle's group (view/handles.ts), which the theme and `view/picture.ts` find it by. */
export const KG_HANDLE_CLASS = 'kg-handle';

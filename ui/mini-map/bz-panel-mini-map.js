const BZ_LAYERS = {
    "bz-discovery-layer": "LOC_UI_MINI_MAP_BZ_DISCOVERY",
    "bz-fortification-layer": "LOC_TAG_CONSTRUCTIBLE_FORTIFICATION",
    "bz-religion-layer": "LOC_UI_MINI_MAP_RELIGION",
};
class bzPanelMiniMap {
    static c_prototype;
    constructor(component) {
        component.bzComponent = this;
        this.component = component;
        this.patchPrototypes(this.component);
    }
    patchPrototypes(component) {
        const c_prototype = Object.getPrototypeOf(component);
        if (bzPanelMiniMap.c_prototype == c_prototype) return;
        // patch component methods
        const proto = bzPanelMiniMap.c_prototype = c_prototype;
        // afterInitialize
        const afterInitialize = this.afterInitialize;
        const onInitialize = proto.onInitialize;
        proto.onInitialize = function(...args) {
            const c_rv = onInitialize.apply(this, args);
            const after_rv = afterInitialize.apply(this.bzComponent, args);
            return after_rv ?? c_rv;
        }
    }
    beforeAttach() { }
    afterAttach() { }
    beforeDetach() { }
    afterDetach() { }
    onAttributeChanged(_name, _prev, _next) { }
    afterInitialize() {
        for (const [layer, name] of Object.entries(BZ_LAYERS)) {
            this.component.createLayerCheckbox(name, layer);
        }
    }
}

Controls.decorate('lens-panel', (component) => new bzPanelMiniMap(component));

const BZ_KEYS_TO_ADD = [
    "open-bz-units-panel",
    "toggle-bz-culture-borders-layer",
    "toggle-bz-city-borders-layer",
    "toggle-bz-discovery-layer",
    "toggle-bz-fortification-layer",
    "toggle-bz-religion-layer",
    "toggle-bz-route-layer",
    "toggle-bz-terrain-layer",
];
class bzEditorKeyboardMapping {
    static c_prototype;
    constructor(component) {
        component.bzComponent = this;
        this.component = component;
        this.patchPrototypes(this.component);
    }
    patchPrototypes(component) {
        const c_prototype = Object.getPrototypeOf(component);
        if (bzEditorKeyboardMapping.c_prototype == c_prototype) return;
        // patch component methods
        const proto = bzEditorKeyboardMapping.c_prototype = c_prototype;
        // afterAddActionsForContext
        const afterAddActionsForContext = this.afterAddActionsForContext;
        const addActionsForContext = proto.addActionsForContext;
        proto.addActionsForContext = function(...args) {
            const c_rv = addActionsForContext.apply(this, args);
            const after_rv = afterAddActionsForContext.apply(this.bzComponent, args);
            return after_rv ?? c_rv;
        }
    }
    beforeAttach() { }
    afterAttach() { }
    beforeDetach() { }
    afterDetach() { }
    onAttributeChanged(_name, _prev, _next) { }
    afterAddActionsForContext(inputContext) {
        for (const actionIdString of BZ_KEYS_TO_ADD) {
            const actionId = Input.getActionIdByName(actionIdString);
            if (!actionId) {
                console.error(`bz-editor-keyboard-mapping: getActionIdByName failed for ${actionIdString}`);
                continue;
            }
            if (this.component.mappingDataMap.has(actionId)) {
                // This action has already been added. Skip it!
                continue;
            }
            this.component.actionContainer.appendChild(this.component.createActionEntry(actionId, inputContext));
        }
    }
}

Controls.decorate('editor-keyboard-mapping', (component) => new bzEditorKeyboardMapping(component));

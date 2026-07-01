const BZ_KEYS_TO_ADD = [
    "bz-set-active-fxs-default-lens",
    "bz-set-active-fxs-settler-lens",
    "bz-set-active-fxs-continent-lens",
    "bz-set-active-fxs-trade-lens",
    "bz-set-active-fxs-general-appeal-lens",
    "bz-set-active-fxs-discovery-lens",
    "bz-set-active-bz-religion-lens",
    "bz-set-active-bz-commander-lens",
    "bz-set-active-dmt-map-tack-lens",
    "open-bz-city-panel",
    "open-bz-units-panel",
    "toggle-bz-culture-borders-layer",
    "toggle-bz-city-borders-layer",
    "toggle-bz-discovery-layer",
    "toggle-bz-fortification-layer",
    "toggle-bz-religion-layer",
    "toggle-bz-route-layer",
    "toggle-bz-terrain-layer",
    "toggle-bz-wonder-layer",
    "toggle-fxs-conquest-layer",
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

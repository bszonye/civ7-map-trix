const BZ_KEYS_TO_ADD = [
    "bz-capital-city",
    "open-bz-city-panel",
    "open-bz-units-panel",
    "open-bz-lens-panel",
    "toggle-fxs-default-lens",
    "toggle-fxs-settler-lens",
    "toggle-fxs-continent-lens",
    "toggle-fxs-trade-lens",
    "toggle-fxs-general-appeal-lens",
    "toggle-fxs-discovery-lens",
    "toggle-bz-religion-lens",
    "toggle-bz-commander-lens",
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
    static c = null;
    constructor(component) {
        this.component = component;
        this.component.bzMapTrix = this;
        this.patchPrototype(Object.getPrototypeOf(component));
    }
    patchPrototype(proto) {
        if (bzEditorKeyboardMapping.c) return;  // one-time initialization
        // patch EditorKeyboardMapping methods & properties
        const c = bzEditorKeyboardMapping.c = { proto };
        // afterAddActionsForContext
        c.addActionsForContext = c.proto.addActionsForContext;
        c.proto.addActionsForContext = function(...args) {
            const crv = c.addActionsForContext.apply(this, args);
            const arv = this.bzMapTrix.afterAddActionsForContext(...args);
            return arv ?? crv;
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

import bzMapTrixOptions, { bzCommanderLens } from '/bz-map-trix/ui/options/bz-map-trix-options.js';
import { b as InputEngineEventName } from '/core/ui/input/input-support.chunk.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { L as LensManager } from '/core/ui/lenses/lens-manager.chunk.js';
// guarantee import order for patching
import '/base-standard/ui/interface-modes/interface-mode-unit-selected.js';
import '/base-standard/ui/lenses/layer/hexgrid-layer.js';
import '/base-standard/ui/lenses/lens/default-lens.js';
import '/base-standard/ui/lenses/lens/discovery-lens.js';

const BZ_LENSES = {
    "fxs-discovery-lens": "LOC_DISTRICT_BZ_DISCOVERY",
    "bz-religion-lens": "LOC_UI_MINI_MAP_RELIGION",
    "bz-commander-lens": "LOC_UI_MINI_MAP_COMMANDER",
};
const BZ_LAYERS = {
    "bz-discovery-layer": "LOC_UI_MINI_MAP_BZ_DISCOVERY",
    "bz-culture-borders-layer": "LOC_UI_MINI_MAP_BZ_BORDERS",
    "bz-fortification-layer": "LOC_UI_MINI_MAP_BZ_FORTIFICATION",
    "bz-city-borders-layer": "LOC_UI_MINI_MAP_BZ_CITY_BORDERS",
    "bz-route-layer": "LOC_UI_MINI_MAP_BZ_ROUTE",
    "bz-religion-layer": "LOC_UI_MINI_MAP_RELIGION",
    "bz-terrain-layer": "LOC_UI_MINI_MAP_BZ_TERRAIN",
    "bz-wonder-layer": "LOC_UI_PRODUCTION_WONDERS",
};
const BZ_EXTRA_LAYERS = {
    "fxs-settler-lens": [ "bz-city-borders-layer", ],
    "fxs-trade-lens": [ "bz-city-borders-layer", ],
    "mod-fortified-district-lens": [
        "fxs-resource-layer",
        "fxs-operation-target-layer",
        "bz-discovery-layer",
        "bz-fortification-layer",
    ],
};

// extend LensManager layer serialization
const LMproto = Object.getPrototypeOf(LensManager);
// patch LensManager.toggleLayer
const LM_toggleLayer = LMproto.toggleLayer;
LMproto.toggleLayer = function(...args) {
    const [layerType, options] = args;
    if (options?.serialize === true) {
        const force = options?.force;
        const enable = force ?? !this.enabledLayers.has(layerType);
        this.bzSerializeLayer(layerType, enable);
        // reconcile border layers
        if (layerType == "bz-city-borders-layer") {
            this.bzSerializeLayer("bz-culture-borders-layer", !enable);
        } else if (layerType == "bz-culture-borders-layer") {
            this.bzSerializeLayer("bz-city-borders-layer", false);
        }
    }
    LM_toggleLayer.apply(this, args);
}
// add LensManager.bzSerializeLayer
LMproto.bzSerializeLayer = function(layerType, enable) {
    const id = LensManager.getLayerOption(layerType);
    if (!id || id == layerType) return;  // option name not set
    const lensType = LensManager.getActiveLens();
    const optionName = `bz-map-trix.${lensType}.${id}`;
    const ovalue = UI.getOption("user", "Mod", optionName);
    const value = enable ? 1 : 0;
    if (value == ovalue) return;  // unchanged
    UI.setOption("user", "Mod", optionName, value);
    // Configuration.getUser().saveCheckpoint();
}
// restore serialized layers just before default interface startup
window.addEventListener("interface-mode-ready", (_event) => {
    for (const [lensType, lens] of LensManager.lenses.entries()) {
        for (const layerType of LensManager.layers.keys()) {
            const layerOption = LensManager.getLayerOption(layerType);
            if (!layerOption) continue;
            const optionName = `bz-map-trix.${lensType}.${layerOption}`;
            const ovalue = UI.getOption("user", "Mod", optionName);
            if (ovalue == null) {
                continue;  // not set
            } else if (ovalue) {
                lens.activeLayers.add(layerType);
            } else {
                lens.activeLayers.delete(layerType);
            }
            lens.allowedLayers.delete(layerType);
            console.warn(`LENS ${optionName}=${ovalue}`);
        }
    }
});


// recon units: instead of CoreClass, use fxs-discovery-lens rules
const reconUnits = new Set();
GameInfo.TypeTags.forEach((tag) => {
    if (tag.Tag == "UNIT_CLASS_AUTOEXPLORE") reconUnits.add(tag.Type);
});
if (GameInfo.Ages.lookup(Game.age).AgeType == "AGE_EXPLORATION") {
    GameInfo.Units.forEach((row) => {
        if (row.FormationClass == "FORMATION_CLASS_NAVAL") reconUnits.add(row.UnitType);
    });
}
// extend UnitSelectedInterfaceMode.setUnitLens(unitID)
function bzSetUnitLens(unitID) {
    const unit = Units.get(unitID);
    if (!unit) return true;  // hand off errors to original method
    const info = GameInfo.Units.lookup(unit.type);
    const isRecon = reconUnits.has(info.UnitType);
    const isMilitary = info.CoreClass == "CORE_CLASS_MILITARY" && !isRecon;
    const skips = getLensSkips();
    let lens;
    if (info.FoundCity || info.MakeTradeRoute || info.ExtractsArtifacts) {
        // don't interfere with fxs lenses
    } else if (skips.has(info.UnitType) || skips.has(info.UnitMovementClass)) {
        // don't interfere with other mods
    } else if (info.SpreadCharges) {
        lens = "bz-religion-lens";
    } else switch (bzMapTrixOptions.commanders) {
        case bzCommanderLens.RECON:
            if (isRecon) lens = "bz-commander-lens";
            // falls through
        case bzCommanderLens.MILITARY:
            if (isMilitary) lens = "bz-commander-lens";
            // falls through
        case bzCommanderLens.COMMANDERS:
            if (unit.isCommanderUnit) lens = "bz-commander-lens";
    }
    if (!lens) return true;  // hand off to original method
    LensManager.setActiveLens(lens);
}
// skip lens activation for units handled by other lens mods
const BZ_MOD_SKIPS = {
    "mod-discovery-lens": ["UNIT_MOVEMENT_CLASS_RECON", "UNIT_MOVEMENT_CLASS_NAVAL"],
    "mod-fortified-district-lens": ["UNIT_ARMY_COMMANDER", "UNIT_AERODROME_COMMANDER"],
};
const BZ_SKIPS = new Set();  // cache
function getLensSkips() {
    if (BZ_SKIPS.size) return BZ_SKIPS;
    BZ_SKIPS.add("UNIT_SETTLER");  // ensure a non-empty set
    for (const [mod, skips] of Object.entries(BZ_MOD_SKIPS)) {
        if (LensManager.lenses.has(mod)) skips.forEach(skip => BZ_SKIPS.add(skip));
    }
    return BZ_SKIPS;
}
// patch UnitSelectedInterfaceMode.setUnitLens (calling it as a fallback)
engine.whenReady.then(() => {
    const USIM = InterfaceMode.getInterfaceModeHandler("INTERFACEMODE_UNIT_SELECTED");
    const prototype = Object.getPrototypeOf(USIM);
    const original = prototype.setUnitLens;
    prototype.setUnitLens = function(...args) {
        const rv = bzSetUnitLens.apply(this, args);
        if (rv) return original.apply(this, args);
    }
});
// patch new layers into other lenses (activeLayers)
for (const [lensType, lens] of LensManager.lenses.entries()) {
    const active = lens.activeLayers;
    const allowed = lens.allowedLayers;
    // add extra default layers
    const extra = new Set(BZ_EXTRA_LAYERS[lensType] ?? []);
    for (const layerType of extra) active.add(layerType);
    // swap in modded borders
    if (active.has("bz-city-borders-layer")) {
        // already configured
    } else if (active.has("fxs-city-borders-layer")) {
        active.add("bz-city-borders-layer");
    } else if (active.has("fxs-culture-borders-layer")) {
        active.add("bz-culture-borders-layer");
    }
    active.delete("fxs-city-borders-layer");
    active.delete("fxs-culture-borders-layer");
    // add discovery layer to every lens that allows Resources
    if (active.has("fxs-resource-layer") || allowed.has("fxs-resource-layer")) {
        active.add("bz-discovery-layer");
    }
    // fix Hex Grid configurability (use "allowed" instead of "active")
    if (active.has("fxs-hexgrid-layer")) {
        active.delete("fxs-hexgrid-layer");
        allowed.add("fxs-hexgrid-layer");
    }
}
// fix Hex Grid initial visibility
if (!LensManager.enabledLayers.has("fxs-hexgrid-layer")) {
    const hexGrid = LensManager.layers.get("fxs-hexgrid-layer");
    hexGrid.removeLayer();
}
// override vanilla layer configuration system
const defaultLens = LensManager.lenses.get("fxs-default-lens");
for (const layerType of defaultLens.allowedLayers) {
    defaultLens.activeLayers.add(layerType);  // enable optional layers by default
}
defaultLens.allowedLayers.clear();
const discoveryLens = LensManager.lenses.get("fxs-discovery-lens");
discoveryLens.allowedLayers.delete("fxs-yields-layer");
delete discoveryLens.skipCachingEnabledLayers;

// PanelMiniMap extensions
const BZ_ICON_CITY_BUTTON = "blp:Yield_Cities";
const BZ_ICON_UNIT_BUTTON = "blp:Action_Promote";
Controls.preloadImage(BZ_ICON_CITY_BUTTON, "bz-mini-map");
Controls.preloadImage(BZ_ICON_UNIT_BUTTON, "bz-mini-map");
Controls.preloadImage("blp:hud_sub_circle_bk", "bz-mini-map");
Controls.preloadImage("blp:hud_sub_circle_hov", "bz-mini-map");
class bzPanelMiniMap {
    static c_prototype;
    static instance;
    static toggleCooldownTimer = 500;
    citySubpanel = null;
    unitsSubpanel = null;
    engineInputListener = this.onEngineInput.bind(this);
    cityHotkeyListener = this.onCityHotkey.bind(this);
    unitsHotkeyListener = this.onUnitsHotkey.bind(this);
    toggleCooldown = 0;
    toggleQueued = false;
    constructor(component) {
        bzPanelMiniMap.instance = this;
        this.component = component;
        component.bzComponent = this;
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
    afterInitialize() {
        this.component.Root.classList.add("bz-mini-map");
        this.component.addSubpanel(
            "bz-city-panel",
            "LOC_UI_RESOURCE_ALLOCATION_SETTLEMENTS",
            BZ_ICON_CITY_BUTTON,
        );
        this.citySubpanel = this.component.subpanels.at(-1);
        this.cityButton = this.component.miniMapButtonRow.lastChild;
        this.cityButton.classList.add("bz-city-button");
        this.component.addSubpanel(
            "bz-units-panel",
            "LOC_UI_PRODUCTION_UNITS",
            BZ_ICON_UNIT_BUTTON,
        );
        this.unitsSubpanel = this.component.subpanels.at(-1);
        this.unitsButton = this.component.miniMapButtonRow.lastChild;
        this.cityButton.classList.add("bz-units-button");
    }
    beforeAttach() { }
    afterAttach() {
        window.addEventListener("hotkey-open-bz-city-panel", this.cityHotkeyListener);
        window.addEventListener("hotkey-open-bz-units-panel", this.unitsHotkeyListener);
        this.component.Root
            .addEventListener(InputEngineEventName, this.engineInputListener);
    }
    beforeDetach() {
        window.removeEventListener("hotkey-open-bz-city-panel", this.cityHotkeyListener);
        window.removeEventListener("hotkey-open-bz-units-panel", this.unitsHotkeyListener);
        this.component.Root
            .removeEventListener(InputEngineEventName, this.engineInputListener);
    }
    afterDetach() { }
    togglePanel(panel) {
        this.toggleQueued = true;
        if (this.toggleCooldown) return;
        // limit panel toggles to 4 per second
        // (avoids crashes in the minimap)
        const toggle = () => {
            if (this.toggleQueued) {
                this.toggleCooldown =
                    setTimeout(() => toggle(), bzPanelMiniMap.toggleCooldownTimer);
                if (panel) {
                    this.component.toggleSubpanel(panel);
                } else {
                    this.component.closeSubpanels();
                }
            } else {
                this.toggleCooldown = 0;
            }
            this.toggleQueued = false;
        }
        toggle();
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        switch (inputEvent.detail.name) {
            case "keyboard-escape":
                if (this.component.chatPanelState) {
                    this.component.toggleChatPanel();
                }
                if (this.component.lensPanelState) {
                    this.component.toggleLensPanel();
                }
                // fall through
            case "cancel":
            case "sys-menu":
                if (this.component.activeSubpanel) {
                    this.togglePanel();
                }
                inputEvent.stopPropagation();
                inputEvent.preventDefault();
                break;
        }
    }
    onCityHotkey(_event) {
        this.togglePanel(this.citySubpanel);
    }
    onUnitsHotkey(_event) {
        this.togglePanel(this.unitsSubpanel);
    }
}
Controls.decorate("panel-mini-map", (val) => new bzPanelMiniMap(val));

// LensPanel extensions
class bzLensPanel {
    static c_prototype;
    constructor(component) {
        component.bzComponent = this;
        this.component = component;
    }
    beforeAttach() { }
    afterAttach() {
        for (const [lens, name] of Object.entries(BZ_LENSES)) {
            this.component.createLensButton(name, lens, "lens-group");
        }
        for (const [layer, name] of Object.entries(BZ_LAYERS)) {
            this.component.createLayerCheckbox(name, layer);
        }
        // hide checkboxes for fxs borders (added by Border Toggles)
        for (const layer of ["fxs-city-borders-layer", "fxs-culture-borders-layer"]) {
            const checkbox = this.component.layerElementMap[layer];
            if (checkbox) checkbox.parentElement.style.display = "none";
        }
    }
    beforeDetach() { }
    afterDetach() { }
}
Controls.decorate("lens-panel", (component) => new bzLensPanel(component));

export { bzPanelMiniMap };

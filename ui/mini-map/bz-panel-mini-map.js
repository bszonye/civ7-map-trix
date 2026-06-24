import bzMapTrixOptions, { bzCommanderLens } from '/bz-map-trix/ui/options/bz-map-trix-options.js';
import { InputEngineEventName } from '/core/ui/input/input-support.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import LensManager from '/core/ui/lenses/lens-manager.js';
// guarantee import order for patching
import '/base-standard/ui/interface-modes/interface-mode-unit-selected.js';
import '/base-standard/ui/lenses/layer/conquest-layer.js';
import '/base-standard/ui/lenses/layer/hexgrid-layer.js';
import '/base-standard/ui/lenses/lens/default-lens.js';
import '/base-standard/ui/lenses/lens/discovery-lens.js';

const LENS_CATALOG_OBJECT_NAME = "tracked-lens";

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
const FXS_USER_CONFIG_LENSES = [
    "fxs-continent-lens",
    "fxs-discovery-lens",
    "fxs-general-appeal-lens",
    "fxs-settler-lens",
];

// fix missing layer configuration
const fxsConquestLayer = LensManager.layers.get("fxs-conquest-layer");
fxsConquestLayer.getOptionName = () => { return "ShowMapConquest"; }

// extend LensManager layer serialization
const LMproto = Object.getPrototypeOf(LensManager);
// add LensManager.bzLayerID
LMproto.bzLayerID = function(layerID, lensType) {
    // returns layerID.lensType for non-default lenses
    const lensID = lensType ?? this.activeLens;
    if (lensID && lensID != "fxs-default-lens") return `${layerID}.${lensID}`;
    return layerID;
}
// patch LensManager.getSerializedState
LMproto.getSerializedState = function(layerType) {
  const id = LensManager.getLayerOption(layerType);
  if (id != layerType) {
      return this.readTrackedLayer(layerType);
  }
  return void 0;
}
// patch LensManager.readTrackedLayer
LMproto.readTrackedLayer = function(layerType) {
    const layerID = this.getLayerOption(layerType);
    const id = this.bzLayerID(layerID);
    // const enable = LM_readTrackedLayer.apply(this, [id]);
    const value = Configuration.getGame().isHotsteat ?
        this.currentCatalog.getObject(LENS_CATALOG_OBJECT_NAME).read(id) :
        UI.getOption("user", "GamePlay", id);
    console.warn(`TRIX RTL ${id} = ${value}`);
    if (value != null) return !!value;
    const lens = this.lenses.get(this.activeLens ?? "fxs-default-lens");
    const active = lens.activeLayers.has(layerType);
    console.warn(`TRIX RTL ${layerType} = ${active}`);
    return !!active;
}
// patch LensManager.writeTrackedLayer
const LM_writeTrackedLayer = LMproto.writeTrackedLayer;
LMproto.writeTrackedLayer = function(...args) {
    const [layerID, enable] = args;
    const id = this.bzLayerID(layerID);
    console.warn(`TRIX WTL ${id} = ${enable}`);
    LM_writeTrackedLayer.apply(this, [id, enable]);
    // reconcile border layers
    if (layerID == "bz-city-borders-layer") {
        const id = this.bzLayerID("bz-culture-borders-layer");
        LM_writeTrackedLayer.apply(this, [id, !enable]);
    } else if (layerID == "bz-culture-borders-layer") {
        const id = this.bzLayerID("bz-city-borders-layer");
        LM_writeTrackedLayer.apply(this, [id, false]);
    }
}
// patch LensManager.getActiveLayers
const _LM_getActiveLayers = LMproto.getActiveLayers;
LMproto.getActiveLayers = function(lens) {
    const activeLayers = lens.activeLayers;
    if (lens.useUserConfig) {
        for (const layer of this.layers) {
            const layerName = layer[0];
            const optionID = this.getLayerOption(layerName);
            if (optionID != layerName) {
                const shouldEnable = this.readTrackedLayer(layerName);
                if (shouldEnable && !activeLayers.has(layerName)) {
                    activeLayers.add(layerName);
                } else if (!shouldEnable && activeLayers.has(layerName)) {
                    activeLayers.delete(layerName);
                }
            }
        }
    }
    return activeLayers;
}


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
const discoveryLens = LensManager.lenses.get("fxs-discovery-lens");
discoveryLens.allowedLayers.delete("fxs-yields-layer");
discoveryLens.allowedLayers.delete("fxs-conquest-layer");
delete discoveryLens.skipCachingEnabledLayers;
// enable user configuration for vanilla lenses
for (const lensType of FXS_USER_CONFIG_LENSES) {
    const lens = LensManager.lenses.get(lensType)
    lens.useUserConfig = true;
}

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
    layerHotkeyListener = this.onLayerHotkey.bind(this);
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
        window.addEventListener("layer-hotkey", this.layerHotkeyListener);
        this.component.Root
            .addEventListener(InputEngineEventName, this.engineInputListener);
    }
    beforeDetach() {
        window.removeEventListener("hotkey-open-bz-city-panel", this.cityHotkeyListener);
        window.removeEventListener("hotkey-open-bz-units-panel", this.unitsHotkeyListener);
        window.removeEventListener("layer-hotkey", this.layerHotkeyListener);
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
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == "toggle-fxs-conquest-layer") {
            LensManager.toggleLayer("fxs-conquest-layer", { serialize: true });
        }
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

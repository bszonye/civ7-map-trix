import bzMapTrixOptions, { bzCommanderLens } from '/bz-map-trix/ui/options/bz-map-trix-options.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { L as LensManager } from '/core/ui/lenses/lens-manager.chunk.js';
// guarantee import order for patching
import '/base-standard/ui/interface-modes/interface-mode-unit-selected.js';
import '/base-standard/ui/lenses/lens/default-lens.js';

const BZ_LENSES = {
    "bz-commander-lens": "LOC_UI_MINI_MAP_COMMANDER",
    "bz-religion-lens": "LOC_UI_MINI_MAP_RELIGION",
};
const BZ_LAYERS = {
    "bz-discovery-layer": "LOC_UI_MINI_MAP_BZ_DISCOVERY",
    "bz-culture-borders-layer": "LOC_UI_MINI_MAP_BZ_BORDERS",
    "bz-fortification-layer": "LOC_UI_MINI_MAP_BZ_FORTIFICATION",
    "bz-city-borders-layer": "LOC_UI_MINI_MAP_BZ_CITY_BORDERS",
    "bz-route-layer": "LOC_UI_MINI_MAP_BZ_ROUTE",
    "bz-religion-layer": "LOC_UI_MINI_MAP_RELIGION",
    "bz-terrain-layer": "LOC_UI_MINI_MAP_BZ_TERRAIN",
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
const defaultLens = LensManager.lenses.get("fxs-default-lens");
defaultLens.activeLayers.delete("fxs-culture-borders-layer");
for (const layer of Object.keys(BZ_LAYERS)) {
    defaultLens.allowedLayers.add(layer);
}
// mini-map extensions
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
    onAttributeChanged(_name, _prev, _next) { }
}

// extend UnitSelectedInterfaceMode.setUnitLens(unitID)
function bzSetUnitLens(unitID) {
    const unit = Units.get(unitID);
    if (!unit) return true;  // hand off errors to original method
    const info = GameInfo.Units.lookup(unit.type);
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
            if (info.CoreClass == "CORE_CLASS_RECON") lens = "bz-commander-lens";
            // falls through
        case bzCommanderLens.MILITARY:
            if (info.CoreClass == "CORE_CLASS_MILITARY") lens = "bz-commander-lens";
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
// patch new layers into registered lenses
engine.whenReady.then(() => {
    for (const [lensType, lens] of LensManager.lenses.entries()) {
        const layers = lens.activeLayers;
        // swap in modded borders
        if (layers.has("fxs-culture-borders-layer")) {
            layers.delete("fxs-culture-borders-layer");
            layers.add("bz-culture-borders-layer");
        }
        if (layers.has("fxs-city-borders-layer")) {
            layers.delete("fxs-city-borders-layer");
            layers.add("bz-city-borders-layer");
        }
        // add extra default layers
        const extra = new Set(BZ_EXTRA_LAYERS[lensType] ?? []);
        if (layers.has("fxs-resource-layer")) extra.add("bz-discovery-layer");
        for (const layerType of extra) layers.add(layerType);
        // if lens is already active, enable any registered layers
        // (event handlers will take care of borders)
        if (lensType == LensManager.activeLens) {
            for (const layerType of extra) {
                if (LensManager.layers.get(layerType)) LensManager.enableLayer(layerType);
            }
        }
    }
});

Controls.decorate("lens-panel", (component) => new bzLensPanel(component));

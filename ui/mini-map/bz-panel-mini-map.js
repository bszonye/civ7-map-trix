import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import '/base-standard/ui/interface-modes/interface-mode-unit-selected.js';
import LensManager from '/core/ui/lenses/lens-manager.js';
const BZ_LENSES = {
    "bz-commander-lens": "LOC_UI_MINI_MAP_COMMANDER",
    "bz-religion-lens": "LOC_UI_MINI_MAP_RELIGION",
};
const BZ_LAYERS = {
    "bz-culture-borders-layer": "LOC_UI_MINI_MAP_BZ_BORDERS",
    "bz-city-borders-layer": "LOC_UI_MINI_MAP_BZ_CITY_BORDERS",
    "bz-discovery-layer": "LOC_UI_MINI_MAP_BZ_DISCOVERY",
    "bz-fortification-layer": "LOC_UI_MINI_MAP_BZ_FORTIFICATION",
    "bz-religion-layer": "LOC_UI_MINI_MAP_RELIGION",
    "bz-terrain-layer": "LOC_UI_MINI_MAP_BZ_TERRAIN",
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
        for (const [lens, name] of Object.entries(BZ_LENSES)) {
            this.component.createLensButton(name, lens, "lens-group");
        }
        for (const [layer, name] of Object.entries(BZ_LAYERS)) {
            this.component.createLayerCheckbox(name, layer);
        }
    }
}

// units handled by other lens mods
const BZ_SKIPS = new Set();  // cache
const BZ_MOD_SKIPS = {
    'mod-discovery-lens': ['UNIT_MOVEMENT_CLASS_RECON', 'UNIT_MOVEMENT_CLASS_NAVAL'],
    'mod-fortified-district-lens': ['UNIT_ARMY_COMMANDER', 'UNIT_AERODROME_COMMANDER'],
};
function getLensSkips() {
    if (BZ_SKIPS.size) return BZ_SKIPS;
    BZ_SKIPS.add('UNIT_SETTLER');  // ensure a non-empty set
    for (const [mod, skips] of Object.entries(BZ_MOD_SKIPS)) {
        if (LensManager.lenses.has(mod)) skips.forEach(skip => BZ_SKIPS.add(skip));
    }
    console.warn(`TRIX SKIPS ${[...BZ_SKIPS]}`);
    return BZ_SKIPS;
}

// extend UnitSelectedInterfaceMode
const USIM = InterfaceMode.getInterfaceModeHandler('INTERFACEMODE_UNIT_SELECTED');
const USIMproto = Object.getPrototypeOf(USIM);
const USIM_setUnitLens = USIMproto.setUnitLens;
USIMproto.setUnitLens = function(...args) {
    const [id] = args;
    const unit = Units.get(id);
    // let the original method report errors
    if (!unit) return USIM_setUnitLens.apply(this, args);
    const info = GameInfo.Units.lookup(unit.type);
    // console.warn(`TRIX ${Object.entries(info).filter(i => i[1]).map(i => i.join(':'))}`);
    // console.warn(`TRIX ${Object.entries(unit).filter(i => typeof i[1] === 'boolean').map(i => i.join(':'))}`);
    const skips = getLensSkips();
    if (info.FoundCity || info.MakeTradeRoute || info.ExtractsArtifacts) {
        // don't interfere with fxs lenses
    } else if (skips.has(info.UnitType) || skips.has(info.UnitMovementClass)) {
        // don't interfere with other mods
    } else if (info.SpreadCharges) {
        LensManager.setActiveLens('bz-religion-lens');
        return;
    } else if (unit.isCommanderUnit || info.CoreClass == "CORE_CLASS_MILITARY") {
        LensManager.setActiveLens('bz-commander-lens');
        return;
    }
    return USIM_setUnitLens.apply(this, args);
}

Controls.decorate('lens-panel', (component) => new bzPanelMiniMap(component));

import LensManager, { BaseSpriteGridLensLayer, LensActivationEventName } from '/core/ui/lenses/lens-manager.js';
;
const SPRITE_PLOT_POSITION = { x: 0, y: 0, z: 0 };
var SpriteGroup;
(function (SpriteGroup) {
    SpriteGroup[SpriteGroup["All"] = 0] = "All";
})(SpriteGroup || (SpriteGroup = {}));
class bzFortificationLensLayer extends BaseSpriteGridLensLayer {
    constructor() {
        super([
            { handle: SpriteGroup.All, name: "bzFortificationLayer_SpriteGroup", spriteMode: SpriteMode.Default },
        ]);
        this.onLayerHotkeyListener = this.onLayerHotkey.bind(this);
        this.onLensActivationListener = this.onLensActivation.bind(this);
    }
    initLayer() {
        this.updateMap();
        this.setVisible(SpriteGroup.All, false);
        engine.on('PlotVisibilityChanged', this.onPlotChange, this);
        engine.on('ConstructibleAddedToMap', this.onPlotChange, this);
        engine.on('ConstructibleRemovedFromMap', this.onPlotChange, this);
        engine.on('DistrictControlChanged', this.onPlotChange, this);
        window.addEventListener('layer-hotkey', this.onLayerHotkeyListener);
        window.addEventListener(LensActivationEventName, this.onLensActivationListener);
    }
    updateMap() {
        const width = GameplayMap.getGridWidth();
        const height = GameplayMap.getGridHeight();
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                this.updatePlot({ x, y });
            }
        }
    }
    updatePlot(loc) {
        this.clearPlot(SpriteGroup.All, loc);
        const observer = GameContext.localObserverID;
        const revealed = GameplayMap.getRevealedState(observer, loc.x, loc.y);
        if (revealed == RevealedStates.HIDDEN) return;
        const districtID = MapCities.getDistrict(loc.x, loc.y);
        if (!districtID) return;  // wilderness
        const district = Districts.get(districtID);
        if (!district.cityId) return;  // village
        if (district.type == DistrictTypes.RURAL) return;  // rural
        // console.warn(`TRIX DISTRICT=${JSON.stringify(district)}`);
        const cons = MapConstructibles.getHiddenFilteredConstructibles(loc.x, loc.y);
        for (const con of cons) {
            const item = Constructibles.getByComponentID(con);
            if (!item) continue;
            // console.warn(`TRIX CON=${JSON.stringify(item)}`);
            const info = GameInfo.Constructibles.lookup(item.type);
            if (!info.DistrictDefense) continue;
            const controller = Players.get(district.controllingPlayer);
            const civ = GameInfo.Civilizations.lookup(controller.civilizationType);
            const asset = UI.getIconBLP(civ.CivilizationType);
            this.addSprite(SpriteGroup.All, loc, asset, SPRITE_PLOT_POSITION, { scale: 1 });
            return;
        }
    }
    onPlotChange(data) {
        this.updatePlot(data.location);
    }
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == 'toggle-bz-fortification-layer') {
            LensManager.toggleLayer('bz-fortification-layer');
        }
    }
    onLensActivation(event) {
        if (event.detail.activeLens == 'fxs-default-lens' && !event.detail.prevLens) {
            // LensManager.enableLayer('bz-fortification-layer');
        }
    }
}
LensManager.registerLensLayer('bz-fortification-layer', new bzFortificationLensLayer());

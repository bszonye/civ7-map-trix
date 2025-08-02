import '/bz-map-trix/ui/lenses/layer/bz-fortification-layer.js';  // force layer order
import LensManager, { BaseSpriteGridLensLayer, LensActivationEventName } from '/core/ui/lenses/lens-manager.js';
;
const SPRITE_PLOT_POSITION = { x: 0, y: -18, z: 5 };
var SpriteGroup;
(function (SpriteGroup) {
    SpriteGroup[SpriteGroup["All"] = 0] = "All";
})(SpriteGroup || (SpriteGroup = {}));
class bzReligionLensLayer extends BaseSpriteGridLensLayer {
    constructor() {
        super([
            { handle: SpriteGroup.All, name: "bzReligionLayer_SpriteGroup", spriteMode: SpriteMode.Billboard },
        ]);
        this.onLayerHotkeyListener = this.onLayerHotkey.bind(this);
        this.onLensActivationListener = this.onLensActivation.bind(this);
    }
    initLayer() {
        this.updateMap();
        this.setVisible(SpriteGroup.All, false);
        engine.on('PlotVisibilityChanged', this.onPlotChange, this);
        engine.on('CityReligionChanged', this.onMapChange, this);
        engine.on('RuralReligionChanged', this.onMapChange, this);
        engine.on('UrbanReligionChanged', this.onMapChange, this);
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
        const city = Cities.get(district.cityId);
        if (!city.Religion) return;
        let religionID = -1;
        switch (district.type) {
            case DistrictTypes.CITY_CENTER:
            case DistrictTypes.URBAN:
                religionID = city.Religion.urbanReligion;
                break;
            case DistrictTypes.RURAL:
                religionID = city.Religion.ruralReligion;
                break;
        }
        if (religionID == -1) return;
        const info = GameInfo.Religions.lookup(religionID);
        const asset = UI.getIconBLP(info.ReligionType);
        this.addSprite(SpriteGroup.All, loc, asset, SPRITE_PLOT_POSITION, { scale: 0.5 });
    }
    onMapChange() {
        this.updateMap();
    }
    onPlotChange(data) {
        this.updatePlot(data.location);
    }
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == 'toggle-bz-religion-layer') {
            LensManager.toggleLayer('bz-religion-layer');
        }
    }
    onLensActivation(event) {
        if (event.detail.activeLens == 'fxs-default-lens' && !event.detail.prevLens) {
            // LensManager.enableLayer('bz-religion-layer');
        }
    }
}
LensManager.registerLensLayer('bz-religion-layer', new bzReligionLensLayer());

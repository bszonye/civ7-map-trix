import '/bz-map-trix/ui/lenses/layer/bz-fortification-layer.js';  // force layer order
import LensManager, { BaseSpriteGridLensLayer } from '/core/ui/lenses/lens-manager.js';

const SPRITE_PLOT_POSITION = { x: 0, y: -18, z: 5 };
const SPRITE_SCALE = 1;
const SPRITE_ALT = "buildicon_open";
var SpriteGroup;
(function (SpriteGroup) {
    SpriteGroup[SpriteGroup["bzReligion"] = 0] = "bzReligion";
    SpriteGroup[SpriteGroup["All"] = Number.MAX_VALUE] = "All";
})(SpriteGroup || (SpriteGroup = {}));
class bzReligionLensLayer extends BaseSpriteGridLensLayer {
    constructor() {
        super([
            { handle: SpriteGroup.bzReligion, name: "bzReligionLayer_SpriteGroup", spriteMode: SpriteMode.Billboard },
        ]);
        this.onLayerHotkeyListener = this.onLayerHotkey.bind(this);
        this.upscaleMultiplier = 1;  // prevent UI scaling
    }
    initLayer() {
        this.updateMap();
        this.setVisible(SpriteGroup.All, false);
        engine.on('PlotVisibilityChanged', this.onPlotChange, this);
        engine.on('CityReligionChanged', this.onMapChange, this);
        engine.on('RuralReligionChanged', this.onMapChange, this);
        engine.on('UrbanReligionChanged', this.onMapChange, this);
        window.addEventListener('layer-hotkey', this.onLayerHotkeyListener);
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
        const asset = this.getReligionIcon(info.ReligionType);
        const pos = SPRITE_PLOT_POSITION;
        const scale = SPRITE_SCALE;
        if (asset) {
            this.addSprite(SpriteGroup.bzReligion, loc, asset, pos, { scale });
        } else {
            // show the IconString over the alternate icon
            this.addSprite(SpriteGroup.bzReligion, loc, SPRITE_ALT, pos, { scale });
            const text = info.IconString.toUpperCase();
            const fontSize = 24 / (text.length + 1);
            const font = { fonts: ["TitleFont"], fontSize, faceCamera: true, };
            this.addText(SpriteGroup.bzReligion, loc, text, pos, font);
        }
    }
    getReligionIcon(icon) {
        const blp = UI.getIconBLP(icon);
        const url = UI.getIconURL(icon);
        // sprites only support built-in BLPs, for now
        if (url == `blp:${blp}` || url == `fs://game/${blp}`) return blp;
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
}
LensManager.registerLensLayer('bz-religion-layer', new bzReligionLensLayer());

import { L as LensManager } from '/core/ui/lenses/lens-manager.chunk.js';
// load mini-map first to configure allowed layers for default lens
import '/bz-map-trix/ui/mini-map/bz-panel-mini-map.js';

const SPRITE_OFFSET = { x: 0, y: 0, z: 5 };
const SPRITE_SCALE = 2;
var SpriteGroup;
(function (SpriteGroup) {
    SpriteGroup[SpriteGroup["bzFortification"] = 0] = "bzFortification";
    SpriteGroup[SpriteGroup["All"] = Number.MAX_VALUE] = "All";
})(SpriteGroup || (SpriteGroup = {}));
class bzFortificationLensLayer {
    bzSpriteGrid = WorldUI.createSpriteGrid(
        "bzFortificationLayer_SpriteGroup",
        SpriteMode.Default
    );
    onLayerHotkeyListener = this.onLayerHotkey.bind(this);
    initLayer() {
        this.updateMap();
        this.bzSpriteGrid.setVisible(false);
        engine.on('PlotVisibilityChanged', this.onPlotChange, this);
        engine.on('ConstructibleAddedToMap', this.onPlotChange, this);
        engine.on('ConstructibleRemovedFromMap', this.onPlotChange, this);
        engine.on('DistrictControlChanged', this.onPlotChange, this);
        window.addEventListener('layer-hotkey', this.onLayerHotkeyListener);
    }
    applyLayer() {
        this.bzSpriteGrid.setVisible(true);
    }
    removeLayer() {
        this.bzSpriteGrid.setVisible(false);
    }
    getOptionName() {
        return "bzShowMapFortifications";
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
        this.bzSpriteGrid.clearPlot(loc);
        const observer = GameContext.localObserverID;
        const revealed = GameplayMap.getRevealedState(observer, loc.x, loc.y);
        if (revealed == RevealedStates.HIDDEN) return;
        const districtID = MapCities.getDistrict(loc.x, loc.y);
        if (!districtID) return;  // wilderness
        const district = Districts.get(districtID);
        if (!district.cityId) return;  // village
        if (district.type == DistrictTypes.RURAL) return;  // rural
        const cons = MapConstructibles.getHiddenFilteredConstructibles(loc.x, loc.y);
        for (const con of cons) {
            const item = Constructibles.getByComponentID(con);
            if (!item) continue;
            const info = GameInfo.Constructibles.lookup(item.type);
            if (!info?.DistrictDefense) continue;
            const controller = Players.get(district.controllingPlayer);
            const civ = GameInfo.Civilizations.lookup(controller.civilizationType);
            const asset = this.getCivilizationIcon(civ.CivilizationType);
            const params = { scale: SPRITE_SCALE };
            this.bzSpriteGrid.addSprite(loc, asset, SPRITE_OFFSET, params);
            return;
        }
    }
    getCivilizationIcon(icon) {
        const blp = UI.getIconBLP(icon);
        const url = UI.getIconURL(icon);
        // sprites only support built-in BLPs, for now
        if (url == `blp:${blp}` || url == `fs://game/${blp}`) return blp;
        return "Action_Fortify";
    }
    onPlotChange(data) {
        this.updatePlot(data.location);
    }
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == 'toggle-bz-fortification-layer') {
            LensManager.toggleLayer('bz-fortification-layer');
        }
    }
}
LensManager.registerLensLayer('bz-fortification-layer', new bzFortificationLensLayer());

import LensManager, { BaseSpriteGridLensLayer, LensActivationEventName } from '/core/ui/lenses/lens-manager.js';

const BZ_DEFAULT_LENSES = [];
const SPRITE_PLOT_POSITION = { x: 0, y: 0, z: 10 };
const SPRITE_SCALE = 1;
const _SPRITE_SIZE = 64 * SPRITE_SCALE;
var SpriteGroup;
(function (SpriteGroup) {
    SpriteGroup[SpriteGroup["bzFortification"] = 0] = "bzFortification";
    SpriteGroup[SpriteGroup["All"] = Number.MAX_VALUE] = "All";
})(SpriteGroup || (SpriteGroup = {}));
class bzFortificationLensLayer extends BaseSpriteGridLensLayer {
    constructor() {
        super([
            { handle: SpriteGroup.bzFortification, name: "bzFortificationLayer_SpriteGroup", spriteMode: SpriteMode.Default },
        ]);
        this.defaultLenses = new Set(BZ_DEFAULT_LENSES);  // initialization tracker
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
        const cons = MapConstructibles.getHiddenFilteredConstructibles(loc.x, loc.y);
        for (const con of cons) {
            const item = Constructibles.getByComponentID(con);
            if (!item) continue;
            const info = GameInfo.Constructibles.lookup(item.type);
            if (!info?.DistrictDefense) continue;
            const controller = Players.get(district.controllingPlayer);
            const civ = GameInfo.Civilizations.lookup(controller.civilizationType);
            const asset = this.getCivilizationIcon(civ.CivilizationType);
            this.addSprite(SpriteGroup.bzFortification, loc, asset, SPRITE_PLOT_POSITION, { scale: SPRITE_SCALE });
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
    onLensActivation(event) {
        if (this.defaultLenses.has(event.detail.activeLens)) {
            LensManager.enableLayer('bz-fortification-layer');
            this.defaultLenses.delete(event.detail.activeLens);
        }
    }
}
LensManager.registerLensLayer('bz-fortification-layer', new bzFortificationLensLayer());

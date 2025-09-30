import { L as LensManager, b as LensLayerEnabledEventName } from '/core/ui/lenses/lens-manager.chunk.js';
import { O as OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.chunk.js';
// load mini-map first to configure allowed layers for default lens
import '/bz-map-trix/ui/mini-map/bz-panel-mini-map.js';

var BorderStyleTypes;
(function (BorderStyleTypes) {
    BorderStyleTypes["Closed"] = "CultureBorder_Closed";
    BorderStyleTypes["CityStateClosed"] = "CultureBorder_CityState_Closed";
    BorderStyleTypes["CityStateOpen"] = "CultureBorder_CityState_Open";
})(BorderStyleTypes || (BorderStyleTypes = {}));

const BZ_GRID_SIZE = GameplayMap.getGridWidth() * GameplayMap.getGridHeight();
const BZ_GROUP_MAX = 65534;
const BZ_VILLAGE_PRIMARY = 0xff000000;
const BZ_VILLAGE_SECONDARY = 0xffffffff;
const BZ_VILLAGE_STYLE = {
    style: BorderStyleTypes.CityStateOpen,
    primaryColor: BZ_VILLAGE_PRIMARY,
    secondaryColor: BZ_VILLAGE_SECONDARY
};
const thicknessZoomMultiplier = 3;
function borderGroup(id) {
    if (typeof id === 'number') return id < 0 ? id : BZ_GROUP_MAX - id;
    if (id.id == -1) return borderGroup(id.owner);
    const city = Cities.get(id);
    return city ? GameplayMap.getIndexFromLocation(city.location) : -1;
}
class bzCityBordersLayer {
    constructor() {
        this.cityOverlayGroup = WorldUI.createOverlayGroup("bzCityBorderOverlayGroup", OVERLAY_PRIORITY.CULTURE_BORDER);
        this.borderOverlay = this.cityOverlayGroup.addBorderOverlay(BZ_VILLAGE_STYLE);
        this.lastZoomLevel = -1;
        this.onLayerHotkeyListener = this.onLayerHotkey.bind(this);
        this.onLensLayerEnabledListener = this.onLensLayerEnabled.bind(this);
        this.onPlotOwnershipChanged = (data) => {
            const plotIndex = GameplayMap.getIndexFromLocation(data.location);
            if (data.priorOwner != PlayerIds.NO_PLAYER) {
                this.borderOverlay.clearPlotGroups(plotIndex);
            }
            if (data.owner != PlayerIds.NO_PLAYER && Players.isAlive(data.owner)) {
                const loc = data.location;
                const cid = GameplayMap.getOwningCityFromXY(loc.x, loc.y);
                const group = borderGroup(cid);
                const style = this.getPlayerStyle(data.owner);
                this.borderOverlay.setPlotGroups(plotIndex, group);
                this.borderOverlay.setGroupStyle(group, style);
            }
        };
        this.onCameraChanged = (camera) => {
            if (this.lastZoomLevel != camera.zoomLevel) {
                this.lastZoomLevel = camera.zoomLevel;
                // Set thickness to 0 when zoomed all the way in.
                const scale = camera.zoomLevel * thicknessZoomMultiplier;
                this.borderOverlay.setThicknessScale(scale);
            }
        };
    }
    getPlayerStyle(player) {
        if (typeof player === 'number') player = Players.get(player);
        if (player.isIndependent) return BZ_VILLAGE_STYLE;
        const style = player.isMajor ? BorderStyleTypes.Closed :
            BorderStyleTypes.CityStateClosed;
        const primaryColor = UI.Player.getPrimaryColorValueAsHex(player.id);
        const secondaryColor = UI.Player.getSecondaryColorValueAsHex(player.id);
        return { style, primaryColor, secondaryColor };
    }
    updateBorders() {
        this.borderOverlay.clear();
        // update player colors
        for (const player of Players.getEverAlive()) {
            const style = this.getPlayerStyle(player);
            const group = borderGroup(player.id);
            this.borderOverlay.setGroupStyle(group, style);
        }
        // update independent powers
        for (let plotIndex=0; plotIndex < BZ_GRID_SIZE; ++plotIndex) {
            const loc = GameplayMap.getLocationFromIndex(plotIndex);
            const ownerID = GameplayMap.getOwner(loc.x, loc.y);
            const owner = Players.get(ownerID);
            if (!owner || !owner.isAlive || !owner.isIndependent) continue;
            const group = borderGroup(ownerID);
            this.borderOverlay.setPlotGroups(plotIndex, group);
        }
        // update city overlays
        for (const player of Players.getAlive()) {
            const style = this.getPlayerStyle(player);
            for (const city of player.Cities?.getCities() ?? []) {
                const cityPlots = city.getPurchasedPlots();
                const group = borderGroup(city.id);
                this.borderOverlay.setPlotGroups(cityPlots, group);
                this.borderOverlay.setGroupStyle(group, style);
            }
        }
    }
    initLayer() {
        this.updateBorders();
        engine.on('CameraChanged', this.onCameraChanged);
        engine.on('PlotOwnershipChanged', this.onPlotOwnershipChanged);
        window.addEventListener('layer-hotkey', this.onLayerHotkeyListener);
        window.addEventListener(LensLayerEnabledEventName, this.onLensLayerEnabledListener);
        this.cityOverlayGroup.setVisible(false);
    }
    applyLayer() {
        this.updateBorders();
        this.cityOverlayGroup.setVisible(true);
    }
    removeLayer() {
        this.cityOverlayGroup.setVisible(false);
    }
    getOptionName() {
        return "bzShowMapCityBorders";
    }
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == 'toggle-bz-city-borders-layer') {
            LensManager.toggleLayer('bz-city-borders-layer');
        }
    }
    onLensLayerEnabled(event) {
        if (event.detail.layer == 'fxs-city-borders-layer') {
            // replace the vanilla city borders
            console.warn('bz-city-borders-layer: fxs borders replaced');
            LensManager.enableLayer('bz-city-borders-layer');
            // delay switch to avoid crashing Border Toggles
            setTimeout(() => LensManager.disableLayer('fxs-city-borders-layer'));
        }
    }
}
LensManager.registerLensLayer('bz-city-borders-layer', new bzCityBordersLayer());

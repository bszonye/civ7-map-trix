import LensManager, { LensActivationEventName, LensLayerEnabledEventName } from '/core/ui/lenses/lens-manager.js';
import { OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.js';
var BorderStyleTypes;
(function (BorderStyleTypes) {
    BorderStyleTypes["Closed"] = "CultureBorder_Closed";
    BorderStyleTypes["CityStateClosed"] = "CultureBorder_CityState_Closed";
    BorderStyleTypes["CityStateOpen"] = "CultureBorder_CityState_Open";
})(BorderStyleTypes || (BorderStyleTypes = {}));

const BZ_DEFAULT_LENSES = [];
const BZ_GRID_SIZE = GameplayMap.getGridWidth() * GameplayMap.getGridHeight();
const BZ_VILLAGE_PRIMARY = 0xff000000;
const BZ_VILLAGE_SECONDARY = 0xffffffff;
const BZ_VILLAGE_STYLE = {
    style: BorderStyleTypes.CityStateOpen,
    primaryColor: BZ_VILLAGE_PRIMARY,
    secondaryColor: BZ_VILLAGE_SECONDARY
};
const thicknessZoomMultiplier = 3;
function borderGroup(id) {
    if (typeof id === 'number') return id < 0 ? id : id + BZ_GRID_SIZE;
    if (id.id == -1) return borderGroup(id.owner);
    const city = Cities.get(id);
    return city ? GameplayMap.getIndexFromLocation(city.location) : -1;
}
class bzCityBordersLayer {
    constructor() {
        this.defaultLenses = new Set(BZ_DEFAULT_LENSES);  // initialization tracker
        this.cityOverlayGroup = WorldUI.createOverlayGroup("bzCityBorderOverlayGroup", OVERLAY_PRIORITY.CULTURE_BORDER);
        this.borderOverlay = this.cityOverlayGroup.addBorderOverlay(BZ_VILLAGE_STYLE);
        this.lastZoomLevel = -1;
        this.onLayerHotkeyListener = this.onLayerHotkey.bind(this);
        this.onLensActivationListener = this.onLensActivation.bind(this);
        this.onLensLayerEnabledListener = this.onLensLayerEnabled.bind(this);
        this.onPlotOwnershipChanged = (data) => {
            const t1 = performance.now();
            const plotIndex = GameplayMap.getIndexFromLocation(data.location);
            if (data.priorOwner != PlayerIds.NO_PLAYER) {
                this.borderOverlay.clearPlotGroups(plotIndex);
            }
            if (data.owner != PlayerIds.NO_PLAYER && Players.isAlive(data.owner)) {
                const loc = data.location;
                const cid = GameplayMap.getOwningCityFromXY(loc.x, loc.y);
                this.borderOverlay.setPlotGroups(plotIndex, borderGroup(cid));
                const city = Cities.get(cid);
                if (!city || city.location.x == loc.x && city.location.y == loc.y) {
                    console.warn(`TRIX UPDATE-STYLES`);
                    this.updateStyles();
                }
            }
            const t2 = performance.now();
            console.warn(`TRIX U=${t2-t1}ms`);
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
        if (player.isIndependent) return BZ_VILLAGE_STYLE;
        const style = player.isMajor ? BorderStyleTypes.Closed :
            BorderStyleTypes.CityStateClosed;
        const primaryColor = UI.Player.getPrimaryColorValueAsHex(player.id);
        const secondaryColor = UI.Player.getSecondaryColorValueAsHex(player.id);
        return { style, primaryColor, secondaryColor };
    }
    updateStyles() {
        for (const player of Players.getEverAlive()) {
            const style = this.getPlayerStyle(player);
            this.borderOverlay.setGroupStyle(borderGroup(player.id), style);
            for (const city of player.Cities?.getCities() ?? []) {
                this.borderOverlay.setGroupStyle(borderGroup(city.id), style);
            }
        }
    }
    updateBorders() {
        const t1 = performance.now();
        this.borderOverlay.clear();
        // update independent powers
        for (let plotIndex=0; plotIndex < BZ_GRID_SIZE; ++plotIndex) {
            const loc = GameplayMap.getLocationFromIndex(plotIndex);
            const ownerID = GameplayMap.getOwner(loc.x, loc.y);
            const owner = Players.get(ownerID);
            if (!owner || !owner.isAlive || !owner.isIndependent) continue;
            this.borderOverlay.setPlotGroups(plotIndex, borderGroup(ownerID));
        }
        // update city overlays
        for (const player of Players.getAlive()) {
            for (const city of player.Cities?.getCities() ?? []) {
                const cityPlots = city.getPurchasedPlots();
                this.borderOverlay.setPlotGroups(cityPlots, borderGroup(city.id));
            }
        }
        this.updateStyles();
        const t2 = performance.now();
        console.warn(`TRIX C=${t2-t1}ms`);
        console.warn(`TRIX GRID=${BZ_GRID_SIZE}`);
    }
    initLayer() {
        this.updateBorders();
        engine.on('CameraChanged', this.onCameraChanged);
        engine.on('PlotOwnershipChanged', this.onPlotOwnershipChanged);
        window.addEventListener('layer-hotkey', this.onLayerHotkeyListener);
        window.addEventListener(LensActivationEventName, this.onLensActivationListener);
        window.addEventListener(LensLayerEnabledEventName, this.onLensLayerEnabledListener);
        this.cityOverlayGroup.setVisible(false);
    }
    applyLayer() {
        this.cityOverlayGroup.setVisible(true);
        // make city and empire borders mutually exclusive
        if (LensManager.isLayerEnabled('bz-culture-borders-layer')) {
            LensManager.disableLayer('bz-culture-borders-layer');
        }
    }
    removeLayer() {
        this.cityOverlayGroup.setVisible(false);
    }
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == 'toggle-bz-city-borders-layer') {
            // toggle between city limits and culture borders
            if (LensManager.isLayerEnabled('bz-city-borders-layer')) {
                LensManager.enableLayer('bz-culture-borders-layer');
            } else {
                LensManager.enableLayer('bz-city-borders-layer');
            }
        }
    }
    onLensActivation(event) {
        if (this.defaultLenses.has(event.detail.activeLens)) {
            LensManager.enableLayer('bz-city-borders-layer');
            LensManager.disableLayer('bz-culture-borders-layer');
            this.defaultLenses.delete(event.detail.activeLens);
        }
    }
    onLensLayerEnabled(event) {
        if (event.detail.layer == 'fxs-city-borders-layer') {
            // replace the vanilla city borders
            LensManager.disableLayer('fxs-city-borders-layer');
            LensManager.enableLayer('bz-city-borders-layer');
        }
    }
}
LensManager.registerLensLayer('bz-city-borders-layer', new bzCityBordersLayer());

import LensManager, { LensActivationEventName, LensLayerDisabledEventName, LensLayerEnabledEventName } from '/core/ui/lenses/lens-manager.js';
import { OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.js';
var BorderStyleTypes;
(function (BorderStyleTypes) {
    BorderStyleTypes["Closed"] = "CultureBorder_Closed";
    BorderStyleTypes["CityStateClosed"] = "CultureBorder_CityState_Closed";
    BorderStyleTypes["CityStateOpen"] = "CultureBorder_CityState_Open";
})(BorderStyleTypes || (BorderStyleTypes = {}));

const BZ_DEFAULT_LENSES = [];
const BZ_GRID_SIZE = GameplayMap.getGridWidth() * GameplayMap.getGridHeight();
const BZ_GROUP_MAX = 65534;
const BZ_VILLAGE_PRIMARY = 0xff000000;
const BZ_VILLAGE_SECONDARY = 0xffffffff;
const BZ_VILLAGE_STYLE = {
    style: BorderStyleTypes.CityStateOpen,
    primaryColor: BZ_VILLAGE_PRIMARY,
    secondaryColor: BZ_VILLAGE_SECONDARY,
};
const thicknessZoomMultiplier = 3;
function borderGroup(id) {
    if (typeof id === 'number') return id < 0 ? id : BZ_GROUP_MAX - id;
    if (id.id == -1) return borderGroup(id.owner);
    const city = Cities.get(id);
    return city ? GameplayMap.getIndexFromLocation(city.location) : -1;
}
class bzCultureBordersLayer {
    constructor() {
        this.defaultLenses = new Set(BZ_DEFAULT_LENSES);  // initialization tracker
        this.cultureOverlayGroup = WorldUI.createOverlayGroup("bzCultureBorderOverlayGroup", OVERLAY_PRIORITY.CULTURE_BORDER);
        this.borderOverlay = this.cultureOverlayGroup.addBorderOverlay(BZ_VILLAGE_STYLE);
        this.lastZoomLevel = -1;
        this.onLayerHotkeyListener = this.onLayerHotkey.bind(this);
        this.onLensActivationListener = this.onLensActivation.bind(this);
        this.onLensLayerDisabledListener = this.onLensLayerDisabled.bind(this);
        this.onLensLayerEnabledListener = this.onLensLayerEnabled.bind(this);
        this.onPlotOwnershipChanged = (data) => {
            const plotIndex = GameplayMap.getIndexFromLocation(data.location);
            if (data.priorOwner != PlayerIds.NO_PLAYER) {
                this.borderOverlay.clearPlotGroups(plotIndex);
            }
            if (data.owner != PlayerIds.NO_PLAYER && Players.isAlive(data.owner)) {
                const group = borderGroup(data.owner);
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
            const group = borderGroup(player.id);
            for (const city of player.Cities?.getCities() ?? []) {
                const cityPlots = city.getPurchasedPlots();
                this.borderOverlay.setPlotGroups(cityPlots, group);
            }
        }
    }
    initLayer() {
        this.updateBorders();
        engine.on('CameraChanged', this.onCameraChanged);
        engine.on('PlotOwnershipChanged', this.onPlotOwnershipChanged);
        window.addEventListener('layer-hotkey', this.onLayerHotkeyListener);
        window.addEventListener(LensActivationEventName, this.onLensActivationListener);
        window.addEventListener(LensLayerDisabledEventName, this.onLensLayerDisabledListener);
        window.addEventListener(LensLayerEnabledEventName, this.onLensLayerEnabledListener);
        this.cultureOverlayGroup.setVisible(false);
    }
    applyLayer() {
        if (LensManager.isLayerEnabled('bz-city-borders-layer')) return;
        this.updateBorders();
        this.cultureOverlayGroup.setVisible(true);
    }
    removeLayer() {
        this.cultureOverlayGroup.setVisible(false);
    }
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == 'toggle-bz-culture-borders-layer') {
            LensManager.toggleLayer('bz-culture-borders-layer');
        }
    }
    onLensActivation(event) {
        // enable this layer the first time a default lens activates
        if (this.defaultLenses.has(event.detail.activeLens)) {
            LensManager.enableLayer('bz-culture-borders-layer');
            this.defaultLenses.delete(event.detail.activeLens);
        }
    }
    onLensLayerDisabled(event) {
        if (event.detail.layer == 'bz-culture-borders-layer') {
            // when Borders are off, City Limits must be off too
            if (LensManager.isLayerEnabled('bz-city-borders-layer')) {
                LensManager.disableLayer('bz-city-borders-layer');
            }
        } else if (event.detail.layer == 'bz-city-borders-layer') {
            // when City Limits turn off, reapply Borders
            if (LensManager.isLayerEnabled('bz-culture-borders-layer')) {
                this.applyLayer();
            }
        }
    }
    onLensLayerEnabled(event) {
        if (event.detail.layer == 'fxs-culture-borders-layer') {
            // replace the vanilla empire borders
            LensManager.disableLayer('fxs-culture-borders-layer');
            LensManager.enableLayer('bz-culture-borders-layer');
        } else if (event.detail.layer == 'bz-city-borders-layer') {
            // when City Limits are on, Borders must be on (but hidden)
            if (LensManager.isLayerEnabled('bz-culture-borders-layer')) {
                this.removeLayer();
            } else {
                LensManager.enableLayer('bz-culture-borders-layer');
            }
        }
    }
}
LensManager.registerLensLayer('bz-culture-borders-layer', new bzCultureBordersLayer());

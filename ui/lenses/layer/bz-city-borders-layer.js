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
const BZ_NO_CITY = { owner: -1, id: -1, type: 1 };
const BZ_VILLAGE_PRIMARY = 0xff000000;
const BZ_VILLAGE_SECONDARY = 0xffffffff;
const BZ_VILLAGE_STYLE = {
    style: BorderStyleTypes.CityStateOpen,
    primaryColor: BZ_VILLAGE_PRIMARY,
    secondaryColor: BZ_VILLAGE_SECONDARY
};
const thicknessZoomMultiplier = 3;
class bzCityBordersLayer {
    constructor() {
        this.defaultLenses = new Set(BZ_DEFAULT_LENSES);  // initialization tracker
        this.cityOverlayGroup = WorldUI.createOverlayGroup("bzCityBorderOverlayGroup", OVERLAY_PRIORITY.CULTURE_BORDER);
        // border overlay storage
        this.cityOverlays = new Map();  // plot -> overlay
        this.villageOverlays = new Map();  // player ID -> overlay
        this.plotOwners = new Array(BZ_GRID_SIZE).fill(BZ_NO_CITY);
        this.lastZoomLevel = -1;
        this.onLayerHotkeyListener = this.onLayerHotkey.bind(this);
        this.onLensActivationListener = this.onLensActivation.bind(this);
        this.onLensLayerEnabledListener = this.onLensLayerEnabled.bind(this);
        this.onPlotOwnershipChanged = (data) => {
            const loc = data.location;
            const plotIndex = GameplayMap.getIndexFromLocation(loc);
            const was = this.plotOwners[plotIndex];
            const now = GameplayMap.getOwningCityFromXY(loc.x, loc.y);
            if (was.owner == now.owner && was.id == now.id) return;
            this.updateBorders();
        };
        this.onCameraChanged = (camera) => {
            if (this.lastZoomLevel != camera.zoomLevel) {
                this.lastZoomLevel = camera.zoomLevel;
                // Set thickness to 0 when zoomed all the way in.
                const scale = camera.zoomLevel * thicknessZoomMultiplier;
                this.cityOverlays.forEach((o) => o.setThicknessScale(scale));
                this.villageOverlays.forEach((o) => o.setThicknessScale(scale));
            }
        };
    }
    updateBorders() {
        // configure player styles
        const styles = [];
        for (const player of Players.getAlive()) {
            const style = player.isMajor ? BorderStyleTypes.Closed :
                BorderStyleTypes.CityStateClosed;
            const primaryColor = UI.Player.getPrimaryColorValueAsHex(player.id);
            const secondaryColor = UI.Player.getSecondaryColorValueAsHex(player.id);
            styles[player.id] = player.isIndependent ? BZ_VILLAGE_STYLE :
                { style, primaryColor, secondaryColor };
        }
        // reset existing overlays
        for (const overlay of this.cityOverlays.values()) overlay.clear();
        for (const overlay of this.villageOverlays.values()) overlay.clear();
        // initialize new village overlays
        for (const player of Players.getAlive()) {
            if (this.villageOverlays.has(player.id)) continue;
            const overlay = this.cityOverlayGroup.addBorderOverlay(BZ_VILLAGE_STYLE);
            this.villageOverlays.set(player.id, overlay);
        }
        // update owners and overlays
        // TODO: use improved logic from bz-culture-borders-layer
        for (const [plotIndex, oldOwner] of this.plotOwners.entries()) {
            const loc = GameplayMap.getLocationFromIndex(plotIndex);
            const plotOwner = GameplayMap.getOwningCityFromXY(loc.x, loc.y);
            this.plotOwners[plotIndex] = plotOwner;
            if (!Players.isAlive(plotOwner.owner)) continue;
            if (plotOwner.id == -1) {
                // village
                const overlay = this.villageOverlays.get(plotOwner.owner);
                overlay.setPlotGroups([plotIndex], 0);
                continue;
            }
            // city
            const city = Cities.get(plotOwner);
            if (loc.x != city.location.x || loc.y != city.location.y) continue;
            const style = styles[plotOwner.owner];
            let overlay = this.cityOverlays.get(plotIndex);
            if (!overlay) {
                overlay = this.cityOverlayGroup.addBorderOverlay(style);
                this.cityOverlays.set(plotIndex, overlay);
            } else if (plotOwner.owner != oldOwner.owner) {
                overlay.setDefaultStyle(style);
            }
            const cityPlots = city.getPurchasedPlots();
            overlay.setPlotGroups(cityPlots, 0);
        }
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

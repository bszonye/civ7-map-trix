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
        this.playerOverlays = new Map();  // player ID -> overlay
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
                this.playerOverlays.forEach((o) => o.setThicknessScale(scale));
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
    updateBorders() {
        const t1 = performance.now();
        // reset existing overlays
        for (const overlay of this.cityOverlays.values()) overlay.clear();
        for (const overlay of this.playerOverlays.values()) overlay.clear();
        // configure player overlays and styles
        const styles = [];
        for (const player of Players.getAlive()) {
            const style = styles[player.id] = this.getPlayerStyle(player);
            console.warn(`TRIX CSTYLE ${player.id} = ${style.style}`);
            const overlay = this.playerOverlays.get(player.id);
            if (overlay) {
                overlay.setDefaultStyle(style);
            } else {
                const overlay = this.cityOverlayGroup.addBorderOverlay(style);
                this.playerOverlays.set(player.id, overlay);
            }
        }
        // update plot owners and independents
        for (const plotIndex of this.plotOwners.keys()) {
            const loc = GameplayMap.getLocationFromIndex(plotIndex);
            const plotOwner = GameplayMap.getOwningCityFromXY(loc.x, loc.y);
            this.plotOwners[plotIndex] = plotOwner;
            // only collect living independents
            const owner = Players.get(plotOwner.owner);
            if (!owner || !owner.isAlive || !owner.isIndependent) continue;
            const overlay = this.playerOverlays.get(plotOwner.owner);
            overlay.setPlotGroups(plotIndex, 0);
        }
        // update city overlays
        for (const player of Players.getAlive()) {
            for (const city of player.Cities?.getCities() ?? []) {
                const plotIndex = GameplayMap.getIndexFromLocation(city.location);
                let overlay = this.cityOverlays.get(plotIndex);
                if (overlay) {
                    overlay.setDefaultStyle(styles[city.owner]);
                } else {
                    overlay = this.cityOverlayGroup.addBorderOverlay(styles[city.owner]);
                    this.cityOverlays.set(plotIndex, overlay);
                }
                const cityPlots = city.getPurchasedPlots();
                overlay.setPlotGroups(cityPlots, 0);
            }
        }
        const t2 = performance.now();
        console.warn(`TRIX C=${t2-t1}ms`);
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

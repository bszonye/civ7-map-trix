import { L as LensManager, c as LensLayerDisabledEventName, b as LensLayerEnabledEventName } from '/core/ui/lenses/lens-manager.chunk.js';
import { O as OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.chunk.js';
// load mini-map first to configure allowed layers for default lens
import '/bz-map-trix/ui/mini-map/bz-panel-mini-map.js';

// safely test whether a layer is enabled
function isLayerEnabled(layerType) {
    if (!LensManager.layers.get(layerType)) return false;
    return LensManager.isLayerEnabled(layerType);
}

var BorderStyleTypes;
(function (BorderStyleTypes) {
    BorderStyleTypes["Closed"] = "CultureBorder_Closed";
    BorderStyleTypes["Open"] = "CultureBorder_Open";
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
    secondaryColor: BZ_VILLAGE_SECONDARY,
};
const thicknessZoomMultiplier = 3;
function borderGroup(id) {
    if (typeof id === "number") return id < 0 ? id : BZ_GROUP_MAX - id;
    if (id.id == -1) return borderGroup(id.owner);
    const city = Cities.get(id);
    return city ? GameplayMap.getIndexFromLocation(city.location) : -1;
}
class bzCultureBordersLayer {
    constructor() {
        this.cultureOverlayGroup = WorldUI.createOverlayGroup("bzCultureBorderOverlayGroup", OVERLAY_PRIORITY.CULTURE_BORDER);
        this.borderOverlay = this.cultureOverlayGroup.addBorderOverlay(BZ_VILLAGE_STYLE);
        this.openBorders = new Set();
        this.lastZoomLevel = -1;
        this.onLayerHotkeyListener = this.onLayerHotkey.bind(this);
        this.onLensLayerDisabledListener = this.onLensLayerDisabled.bind(this);
        this.onLensLayerEnabledListener = this.onLensLayerEnabled.bind(this);
        const borderEvents = [
            Database.makeHash("DIPLOMACY_ACTION_DECLARE_WAR"),
            Database.makeHash("DIPLOMACY_ACTION_FORM_ALLIANCE"),
            Database.makeHash("DIPLOMACY_ACTION_OPEN_BORDERS"),
        ];
        this.onDiplomacyEvent = (event) => {
            if (borderEvents.includes(event.actionType)) this.updateBorderStyles();
        };
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
        if (typeof player === "number") player = Players.get(player);
        if (player.isIndependent) return BZ_VILLAGE_STYLE;
        const style =
            this.openBorders.has(player.id) ? BorderStyleTypes.Open :
            player.isMajor ? BorderStyleTypes.Closed :
            BorderStyleTypes.CityStateClosed;
        const primaryColor = UI.Player.getPrimaryColorValueAsHex(player.id);
        const secondaryColor = UI.Player.getSecondaryColorValueAsHex(player.id);
        return { style, primaryColor, secondaryColor };
    }
    updateBorderStyles() {
        // update set of players with open borders
        this.openBorders.clear();
        const localID = GameContext.localObserverID;
        const diploOpen = Database.makeHash("DIPLOMACY_ACTION_OPEN_BORDERS");
        // record open borders agreements
        Game.Diplomacy.getPlayerEvents(localID)
            .filter(e => e.actionType == diploOpen && e.initialPlayer == localID)
            .forEach(e => this.openBorders.add(e.targetPlayer));
        // record alliances
        Players.getAlive()
            .filter(p => p.isMajor && p.Diplomacy.hasAllied(localID))
            .forEach(p => this.openBorders.add(p.id));
        // update styles
        for (const player of Players.getEverAlive()) {
            const style = this.getPlayerStyle(player);
            const group = borderGroup(player.id);
            this.borderOverlay.setGroupStyle(group, style);
        }
    }
    updateBorders() {
        this.borderOverlay.clear();
        // update border colors and styles
        this.updateBorderStyles();
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
        engine.on("CameraChanged", this.onCameraChanged);
        engine.on("DiplomacyEventStarted", this.onDiplomacyEvent);
        engine.on("DiplomacyEventEnded", this.onDiplomacyEvent);
        engine.on("PlotOwnershipChanged", this.onPlotOwnershipChanged);
        window.addEventListener("layer-hotkey", this.onLayerHotkeyListener);
        window.addEventListener(LensLayerDisabledEventName, this.onLensLayerDisabledListener);
        window.addEventListener(LensLayerEnabledEventName, this.onLensLayerEnabledListener);
        this.cultureOverlayGroup.setVisible(false);
    }
    applyLayer() {
        if (isLayerEnabled("bz-city-borders-layer")) return;
        this.updateBorders();
        this.cultureOverlayGroup.setVisible(true);
    }
    removeLayer() {
        this.cultureOverlayGroup.setVisible(false);
    }
    getOptionName() {
        return "bzShowMapCultureBorders";
    }
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == "toggle-bz-culture-borders-layer") {
            LensManager.toggleLayer("bz-culture-borders-layer");
        }
    }
    onLensLayerDisabled(event) {
        if (event.detail.layer == "bz-culture-borders-layer") {
            // when Borders are off, City Limits must be off too
            if (isLayerEnabled("bz-city-borders-layer")) {
                LensManager.disableLayer("bz-city-borders-layer");
            }
        } else if (event.detail.layer == "bz-city-borders-layer") {
            // when City Limits turn off, reapply Borders
            if (isLayerEnabled("bz-culture-borders-layer")) {
                this.applyLayer();
            }
        }
    }
    onLensLayerEnabled(event) {
        if (event.detail.layer == "fxs-culture-borders-layer") {
            // replace the vanilla empire borders
            console.warn("bz-culture-borders-layer: fxs borders replaced");
            LensManager.enableLayer("bz-culture-borders-layer");
            // delay switch to avoid crashing Border Toggles
            setTimeout(() => LensManager.disableLayer("fxs-culture-borders-layer"));
        } else if (event.detail.layer == "bz-city-borders-layer") {
            // when City Limits are on, Borders must be on (but hidden)
            if (isLayerEnabled("bz-culture-borders-layer")) {
                this.removeLayer();
            } else {
                LensManager.enableLayer("bz-culture-borders-layer");
            }
        }
    }
}
const instance = new bzCultureBordersLayer();
// if layer is not configured, enable it by default
const option = UI.getOption("user", "Gameplay", instance.getOptionName());
if (option == null) UI.setOption("user", "Gameplay", instance.getOptionName(), 1);
// register lens
LensManager.registerLensLayer("bz-culture-borders-layer", instance);

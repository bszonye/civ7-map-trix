import { gatherMovementObstacles } from '/bz-map-trix/ui/tooltips/bz-plot-tooltip.js';
import LensManager, { LensActivationEventName } from '/core/ui/lenses/lens-manager.js';
import { OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.js';
;
const BZ_DEFAULT_LENSES = [];
// adapted from ui/tooltips/bz-plot-tooltip.js
const BZ_OVERLAY = {
    debug: 0x80ff00ff,
    TERRAIN_OCEAN: 0,
    TERRAIN_HILL: 0xff3b6074,             // #c7b28a66 TODO
    FEATURE_CLASS_VEGETATED: 0xff0a714a,  // #aaff0033 TODO
    FEATURE_CLASS_WET: 0xff717115,        // #55ffff33 TODO
    RIVER_MINOR: 0x55ffaa55,              // #55aaff66 TODO
    RIVER_NAVIGABLE: 0x55ffaa55,          // #55aaff66 TODO
    ROUTE_BRIDGE: 0xffc4c9d4,             // #d4c9c4cc TODO
    ROUTE_FERRY: 0xffc4c9d4,              // #d4c9c4cc TODO
    ROUTE_RAILROAD: 0xffccc4c2,           // #c2c4cccc TODO
    ROUTE_ROAD: 0xffacd2e5,               // #e5d2accc TODO
};
class bzTerrainLensLayer {
    constructor() {
        this.defaultLenses = new Set(BZ_DEFAULT_LENSES);  // initialization tracker
        this.terrainOverlayGroup = WorldUI.createOverlayGroup("bzTerrainOverlayGroup", OVERLAY_PRIORITY.PLOT_HIGHLIGHT);
        this.terrainOverlay = this.terrainOverlayGroup.addPlotOverlay();
        this.obstacles = gatherMovementObstacles("UNIT_MOVEMENT_CLASS_FOOT");
        this.onLayerHotkeyListener = this.onLayerHotkey.bind(this);
        this.onLensActivationListener = this.onLensActivation.bind(this);
    }
    clearOverlay() {
        this.terrainOverlayGroup.clearAll();
        this.terrainOverlay.clear();
    }
    initLayer() {
        engine.on('RouteAddedToMap', this.onMapChange, this);
        engine.on('RouteChanged', this.onMapChange, this);
        engine.on('RouteRemovedFromMap', this.onMapChange, this);
        window.addEventListener('layer-hotkey', this.onLayerHotkeyListener);
        window.addEventListener(LensActivationEventName, this.onLensActivationListener);
    }
    applyLayer() {
        this.updateMap();
    }
    removeLayer() {
        this.clearOverlay();
    }
    getObstacleColor(loc) {
        // rivers
        // TODO
        // terrain obstacles
        const tid = GameplayMap.getTerrainType(loc.x, loc.y);
        const tinfo = GameInfo.Terrains.lookup(tid);
        if (tinfo) {
            const type = tinfo.TerrainType;
            if (this.obstacles.has(type)) return BZ_OVERLAY[type];
        }
        // feature obstacles
        const fid = GameplayMap.getFeatureType(loc.x, loc.y);
        const finfo = GameInfo.Features.lookup(fid);
        if (finfo) {
            const type = finfo.FeatureType;
            if (this.obstacles.has(type)) return BZ_OVERLAY[finfo.FeatureClassType];
        }
        return 0;
    }
    getRouteColor(loc) {
        const id = GameplayMap.getRouteType(loc.x, loc.y);
        const info = GameInfo.Routes.lookup(id);
        if (!info) return 0;
        if (GameplayMap.isFerry(loc.x, loc.x)) return BZ_OVERLAY.ROUTE_FERRY;
        if (info.PlacementRequiresRoutePresent) return BZ_OVERLAY.ROUTE_RAILROAD;
        return BZ_OVERLAY.ROUTE_ROAD;
    }
    updateMap() {
        this.clearOverlay();
        const width = GameplayMap.getGridWidth();
        const height = GameplayMap.getGridHeight();
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                this.updatePlot({ x, y });
            }
        }
    }
    updatePlot(loc) {
        const plotIndex = GameplayMap.getIndexFromLocation(loc);
        const fillColor = this.getObstacleColor(loc);
        const edgeColor = this.getRouteColor(loc);
        this.terrainOverlay.addPlots(plotIndex, { fillColor, edgeColor });
    }
    onMapChange() {
        this.updateMap();
    }
    onPlotChange(data) {
        this.updatePlot(data.location);
    }
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == 'toggle-bz-terrain-layer') {
            LensManager.toggleLayer('bz-terrain-layer');
        }
    }
    onLensActivation(event) {
        if (this.defaultLenses.has(event.detail.activeLens)) {
            LensManager.enableLayer('bz-terrain-layer');
            this.defaultLenses.delete(event.detail.activeLens);
        }
    }
}
LensManager.registerLensLayer('bz-terrain-layer', new bzTerrainLensLayer());

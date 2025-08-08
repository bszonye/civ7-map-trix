import { gatherMovementObstacles } from '/bz-map-trix/ui/tooltips/bz-plot-tooltip.js';
import LensManager, { LensActivationEventName } from '/core/ui/lenses/lens-manager.js';
import { OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.js';

const BZ_DEFAULT_LENSES = ['fxs-default-lens'];
// adapted from ui/tooltips/bz-plot-tooltip.js
const BZ_OVERLAY = {
    TERRAIN_HILL: { fillColor: 0xdd446677, edgeColor: 0xff446677, },
    FEATURE_CLASS_VEGETATED: { fillColor: 0xdd005533, edgeColor: 0xff005533, },
    FEATURE_CLASS_WET: { fillColor: 0xdd666600, edgeColor: 0xff666600, },
    RIVER_MINOR: { fillColor: 0x66ffaa55, edgeColor: 0xffffaa55, },
    RIVER_NAVIGABLE: { fillColor: 0x66ffaa55, edgeColor: 0xffffaa55, },
}
class bzTerrainLensLayer {
    constructor() {
        this.defaultLenses = new Set(BZ_DEFAULT_LENSES);  // initialization tracker
        this.terrainOverlayGroup = WorldUI.createOverlayGroup("bzTerrainOverlayGroup", OVERLAY_PRIORITY.PLOT_HIGHLIGHT);
        this.terrainOverlay = this.terrainOverlayGroup.addPlotOverlay();
        this.obstacles = gatherMovementObstacles("UNIT_MOVEMENT_CLASS_FOOT");
        this.onLayerHotkeyListener = this.onLayerHotkey.bind(this);
        this.onLensActivationListener = this.onLensActivation.bind(this);
    }
    initLayer() {
        this.updateMap();
        window.addEventListener('layer-hotkey', this.onLayerHotkeyListener);
        window.addEventListener(LensActivationEventName, this.onLensActivationListener);
        this.terrainOverlayGroup.setVisible(false);
    }
    applyLayer() {
        this.updateMap();
        this.terrainOverlayGroup.setVisible(true);
    }
    removeLayer() {
        this.terrainOverlayGroup.setVisible(false);
    }
    getTerrainStyle(loc) {
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
        // rivers
        const rid = GameplayMap.getRiverType(loc.x, loc.y);
        if (rid == RiverTypes.RIVER_NAVIGABLE) return BZ_OVERLAY.RIVER_NAVIGABLE;
        if (rid == RiverTypes.RIVER_MINOR) return BZ_OVERLAY.RIVER_MINOR;
        return null;
    }
    updateMap() {
        this.terrainOverlayGroup.clearAll();
        this.terrainOverlay.clear();
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
        const terrainStyle = this.getTerrainStyle(loc);
        if (terrainStyle) this.terrainOverlay.addPlots(plotIndex, terrainStyle);
    }
    onMapChange() {
        this.updateMap();
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

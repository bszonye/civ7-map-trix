import { gatherMovementObstacles } from '/bz-map-trix/ui/tooltips/bz-plot-tooltip.js';
import LensManager, { LensActivationEventName } from '/core/ui/lenses/lens-manager.js';
import { OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.js';

const BZ_DEFAULT_LENSES = ['fxs-default-lens'];
// adapted from ui/tooltips/bz-plot-tooltip.js
// hill        #e1caaa  oklch(0.85 0.05 75)   #5f5343  oklch(0.45 0.03 75)
// vegetated   #6ba211  oklch(0.65 0.17 130)  #3b4f25  oklch(0.40 0.07 130)
// wet         #08a2af  oklch(0.65 0.11 205)  #00525a  oklch(0.40 0.07 205)
// floodplain  #6ab3fd  oklch(0.75 0.13 250)  #6d4d3e  oklch(0.45 0.05 45)
// river:      #6ab3fd  oklch(0.75 0.13 250)  #36587b  oklch(0.45 0.07 250)
const BZ_OVERLAY = {
    TERRAIN_HILL: { fillColor: 0xaaaacae1, edgeColor: 0xff43535f, },
    FEATURE_CLASS_VEGETATED: { fillColor: 0xaa11a26b, edgeColor: 0xff254f3b, },
    FEATURE_CLASS_WET: { fillColor: 0xaaafa208, edgeColor: 0xff5a5200, },
    FEATURE_CLASS_FLOODPLAIN: { fillColor: 0x99fdb36a, edgeColor: 0xff3e4d6d, },
    RIVER_MINOR: { fillColor: 0x99fdb36a, edgeColor: 0xff7b5836, },
    RIVER_NAVIGABLE: { fillColor: 0x99fdb36a, edgeColor: 0xff7b5836, },
}
const BZ_NO_OUTLINE = {
    style: "CultureBorder_Closed",
    primaryColor: 0,
    secondaryColor: 0,
};
class bzTerrainLensLayer {
    constructor() {
        this.defaultLenses = new Set(BZ_DEFAULT_LENSES);  // initialization tracker
        this.terrainOverlayGroup = WorldUI.createOverlayGroup("bzTerrainOverlayGroup", OVERLAY_PRIORITY.PLOT_HIGHLIGHT);
        this.terrainOverlay = this.terrainOverlayGroup.addPlotOverlay();
        this.terrainOutline = this.terrainOverlayGroup.addBorderOverlay(BZ_NO_OUTLINE);
        this.outlineGroup = new Map();
        this.obstacles = gatherMovementObstacles("UNIT_MOVEMENT_CLASS_FOOT");
        this.onLayerHotkeyListener = this.onLayerHotkey.bind(this);
        this.onLensActivationListener = this.onLensActivation.bind(this);
    }
    initLayer() {
        for (const [type, overlay] of Object.entries(BZ_OVERLAY)) {
            const style = {
                style: "CultureBorder_Closed",
                primaryColor: overlay.edgeColor,
                secondaryColor: overlay.edgeColor,
            }
            const group = this.outlineGroup.size;
            this.terrainOutline.setGroupStyle(group, style);
            this.outlineGroup.set(type, group);
        }
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
    getTerrainType(loc) {
        // terrain obstacles
        const tid = GameplayMap.getTerrainType(loc.x, loc.y);
        const tinfo = GameInfo.Terrains.lookup(tid);
        if (tinfo) {
            const type = tinfo.TerrainType;
            if (this.obstacles.has(type)) return type;
        }
        // feature obstacles
        const fid = GameplayMap.getFeatureType(loc.x, loc.y);
        const finfo = GameInfo.Features.lookup(fid);
        if (finfo) {
            const type = finfo.FeatureType;
            const ctype = finfo.FeatureClassType;
            if (this.obstacles.has(type)) return ctype;
            if (ctype == "FEATURE_CLASS_FLOODPLAIN") return ctype;
        }
        // rivers
        const rid = GameplayMap.getRiverType(loc.x, loc.y);
        if (rid == RiverTypes.RIVER_NAVIGABLE) return "RIVER_NAVIGABLE";
        if (rid == RiverTypes.RIVER_MINOR) return "RIVER_MINOR";
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
        const type = this.getTerrainType(loc);
        if (type) {
            const overlay = BZ_OVERLAY[type];
            const group = this.outlineGroup.get(type);
            this.terrainOverlay.addPlots(plotIndex, overlay);
            this.terrainOutline.setPlotGroups(plotIndex, group);
        }
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

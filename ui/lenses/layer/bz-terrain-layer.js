import LensManager, { LensActivationEventName } from '/core/ui/lenses/lens-manager.js';
import { OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.js';

const BZ_DEFAULT_LENSES = ['fxs-default-lens'];
// adapted from ui/tooltips/bz-plot-tooltip.js
// hill        #b88255  oklch(0.65 0.09 60)   #633e1d  oklch(0.40 0.07 60)
// vegetated   #6ba211  oklch(0.65 0.17 130)  #3b4f25  oklch(0.40 0.07 130)
// wet         #08a2af  oklch(0.65 0.11 205)  #00525a  oklch(0.40 0.07 205)
// floodplain  #6ab3fd  oklch(0.75 0.13 250)  #6d4d3e  oklch(0.45 0.05 45)
// river:      #6ab3fd  oklch(0.75 0.13 250)  #36587b  oklch(0.45 0.07 250)
const BZ_OVERLAY = {
    TERRAIN_HILL: { fillColor: 0xaa5582b8, edgeColor: 0xff1d3e63, },
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
        // feature types
        const fid = GameplayMap.getFeatureType(loc.x, loc.y);
        if (fid != FeatureTypes.NO_FEATURE) {
            const finfo = GameInfo.Features.lookup(fid);
            const fctype = finfo.FeatureClassType;
            if (Object.hasOwn(BZ_OVERLAY, fctype)) return fctype;
        }
        // river types
        const rid = GameplayMap.getRiverType(loc.x, loc.y);
        switch (rid) {
            case RiverTypes.RIVER_NAVIGABLE:
                return "RIVER_NAVIGABLE";
            case RiverTypes.RIVER_MINOR:
                return "RIVER_MINOR";
        }
        // terrain types
        const tid = GameplayMap.getTerrainType(loc.x, loc.y);
        return GameInfo.Terrains.lookup(tid)?.TerrainType;
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
        const overlay = BZ_OVERLAY[type];
        if (overlay) {
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

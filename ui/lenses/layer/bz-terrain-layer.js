import { gatherMovementObstacles } from '/bz-map-trix/ui/tooltips/bz-plot-tooltip.js';
import { InterfaceMode, InterfaceModeChangedEventName } from '/core/ui/interface-modes/interface-modes.js';
import { L as LensManager } from '/core/ui/lenses/lens-manager.chunk.js';
import ChoosePlotInterfaceMode from '/base-standard/ui/interface-modes/interface-mode-choose-plot.js';
import { O as OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.chunk.js';
import { UpdateOperationTargetEventName } from '/base-standard/ui/lenses/layer/operation-target-layer.js';
// load mini-map first to configure allowed layers for default lens
import '/bz-map-trix/ui/mini-map/bz-panel-mini-map.js';

// adapted from ui/tooltips/bz-plot-tooltip.js
const BZ_OVERLAY = {
    // #c07e45  oklch(0.65 0.11 60)   #633e1d  oklch(0.40 0.07 60)
    TERRAIN_HILL: { fillColor: 0xaa457ec0, edgeColor: 0xff1d3e63, },
    // #6ba211  oklch(0.65 0.17 130)  #3b4f25  oklch(0.40 0.07 130)
    FEATURE_CLASS_VEGETATED: { fillColor: 0xaa11a26b, edgeColor: 0xff254f3b, },
    // #08a2af  oklch(0.65 0.11 205)  #00525a  oklch(0.40 0.07 205)
    FEATURE_CLASS_WET: { fillColor: 0xaaafa208, edgeColor: 0xff5a5200, },
    // #6ab3fd  oklch(0.75 0.13 250)  #6d4d3e  oklch(0.45 0.05 45)
    FEATURE_CLASS_FLOODPLAIN: { fillColor: 0x99fdb36a, edgeColor: 0xff3e4d6d, },
    // #6ab3fd  oklch(0.75 0.13 250)  #36587b  oklch(0.45 0.07 250)
    RIVER_MINOR: { fillColor: 0x99fdb36a, edgeColor: 0xff7b5836, },
    RIVER_NAVIGABLE: { fillColor: 0x99fdb36a, edgeColor: 0xff7b5836, },
}
const BZ_NO_OUTLINE = {
    style: "CultureBorder_Closed",
    primaryColor: 0,
    secondaryColor: 0,
};
class bzTerrainLensLayer {
    terrainOverlayGroup = WorldUI.createOverlayGroup(
        "bzTerrainOverlayGroup",
        OVERLAY_PRIORITY.CONTINENT_LENS  // very low priority
    );
    terrainOverlay = this.terrainOverlayGroup.addPlotOverlay();
    terrainOutline = this.terrainOverlayGroup.addBorderOverlay(BZ_NO_OUTLINE);
    outlineGroup = new Map();
    obstacles = gatherMovementObstacles("UNIT_MOVEMENT_CLASS_FOOT");
    operationPlots = new Set();
    layerHotkeyListener = this.onLayerHotkey.bind(this);
    unitSelectionChangedListener = this.onUnitSelectionChanged.bind(this);
    updateOperationTargetListener = this.onUpdateOperationTarget.bind(this);
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
        window.addEventListener("layer-hotkey", this.layerHotkeyListener);
        window.addEventListener(UpdateOperationTargetEventName, this.updateOperationTargetListener);
        engine.on("UnitSelectionChanged", this.unitSelectionChangedListener);
        this.terrainOverlayGroup.setVisible(false);
    }
    applyLayer() {
        this.updateMap();
        this.terrainOverlayGroup.setVisible(this.getInterfaceModeVisibility());
        window.addEventListener(InterfaceModeChangedEventName, this.onInterfaceModeChanged);
    }
    removeLayer() {
        window.removeEventListener(InterfaceModeChangedEventName, this.onInterfaceModeChanged);
        this.terrainOverlayGroup.setVisible(false);
    }
    getOptionName() {
        return "bzShowMapTerrain";
    }
    getInterfaceModeVisibility() {
        const mode = InterfaceMode.getCurrent();
        const handler = InterfaceMode.getInterfaceModeHandler(mode);
        if (!handler) return true;
        // hide layer in choose-plot interface modes, except move-to
        if (mode == "INTERFACEMODE_MOVE_TO") return true;
        return !Object.prototype.isPrototypeOf.call(
            ChoosePlotInterfaceMode.prototype, handler
        );
    }
    getTerrainType(loc) {
        // feature types
        const fid = GameplayMap.getFeatureType(loc.x, loc.y);
        if (fid != FeatureTypes.NO_FEATURE) {
            const finfo = GameInfo.Features.lookup(fid);
            const ftype = finfo.FeatureType;
            const fctype = finfo.FeatureClassType;
            if (this.obstacles.has(ftype)) return fctype;
            if (fctype == "FEATURE_CLASS_FLOODPLAIN") return fctype;
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
        this.terrainOutline.clear();
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
        if (this.operationPlots.has(plotIndex)) return;
        const type = this.getTerrainType(loc);
        const overlay = BZ_OVERLAY[type];
        if (overlay) {
            const group = this.outlineGroup.get(type);
            this.terrainOverlay.addPlots(plotIndex, overlay);
            this.terrainOutline.setPlotGroups(plotIndex, group);
        }
    }
    onInterfaceModeChanged = () => {
        this.terrainOverlayGroup.setVisible(this.getInterfaceModeVisibility());
    };
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == "toggle-bz-terrain-layer") {
            LensManager.toggleLayer("bz-terrain-layer");
        }
    }
    onUnitSelectionChanged() {
        if (this.operationPlots.size) {
            this.operationPlots = new Set();
            this.updateMap();
        }
    }
    onUpdateOperationTarget(event) {
        this.operationPlots = new Set(event.detail.plots);
        this.updateMap();
    }
}
LensManager.registerLensLayer("bz-terrain-layer", new bzTerrainLensLayer());

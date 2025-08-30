import { gatherMovementObstacles } from '/bz-map-trix/ui/tooltips/bz-plot-tooltip.js';
import { L as LensManager } from '/core/ui/lenses/lens-manager.chunk.js';
import { O as OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.chunk.js';

const BZ_DIRECTIONS = [
    DirectionTypes.DIRECTION_NORTHEAST,  // = 0
    DirectionTypes.DIRECTION_EAST,       // = 1
    DirectionTypes.DIRECTION_SOUTHEAST,  // = 2
    DirectionTypes.DIRECTION_SOUTHWEST,  // = 3
    DirectionTypes.DIRECTION_WEST,       // = 4
    DirectionTypes.DIRECTION_NORTHWEST,  // = 5
];
const BZ_DIRECTION_OFFSET = [
    { x: 16, y: 28 },    // northeast
    { x: 32, y: 0 },     // east
    { x: 16, y: -28 },   // southeast
    { x: -16, y: -28 },  // southwest
    { x: -32, y: 0 },    // west
    { x: -16, y: 28 },   // northwest
];
console.warn(`TRIX ${BZ_DIRECTIONS}`);
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
    terrainSpriteGrid = WorldUI.createSpriteGrid(
        "bzTerrainLayer_SpriteGroup",
        SpriteMode.Billboard
    );
    terrainOverlayGroup = WorldUI.createOverlayGroup(
        "bzTerrainOverlayGroup",
        OVERLAY_PRIORITY.CONTINENT_LENS  // very low priority
    );
    terrainOverlay = this.terrainOverlayGroup.addPlotOverlay();
    terrainOutline = this.terrainOverlayGroup.addBorderOverlay(BZ_NO_OUTLINE);
    outlineGroup = new Map();
    obstacles = gatherMovementObstacles("UNIT_MOVEMENT_CLASS_FOOT");
    onLayerHotkeyListener = this.onLayerHotkey.bind(this);
    cliffAsset = "dip_cancel";
    initLayer() {
        console.warn(`TRIX CLIFF ${this.cliffAsset}`);
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
        this.terrainOverlayGroup.setVisible(false);
        this.terrainSpriteGrid.setVisible(false);
    }
    applyLayer() {
        this.updateMap();
        this.terrainOverlayGroup.setVisible(true);
        this.terrainSpriteGrid.setVisible(true);
    }
    removeLayer() {
        this.terrainOverlayGroup.setVisible(false);
        this.terrainSpriteGrid.setVisible(false);
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
        this.terrainSpriteGrid.clearPlot(loc);
        const plotIndex = GameplayMap.getIndexFromLocation(loc);
        // show obstacles (hills, rivers, swamps, vegetation)
        const type = this.getTerrainType(loc);
        const overlay = BZ_OVERLAY[type];
        if (overlay) {
            const group = this.outlineGroup.get(type);
            this.terrainOverlay.addPlots(plotIndex, overlay);
            this.terrainOutline.setPlotGroups(plotIndex, group);
        }
        // show cliffs
        const zloc = GameplayMap.getElevation(loc.x, loc.y);
        for (const dir of BZ_DIRECTIONS) {
            if (!GameplayMap.isCliffCrossing(loc.x, loc.y, dir)) continue;
            const adj = GameplayMap.getAdjacentPlotLocation(loc, dir);
            const zadj = GameplayMap.getElevation(adj.x, adj.y);
            if (zloc < zadj) continue;  // show sprite at the top
            const offset = BZ_DIRECTION_OFFSET[dir];
            const params = { scale: 1 };
            this.terrainSpriteGrid.addSprite(loc, this.cliffAsset, offset, params);
        }
    }
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == 'toggle-bz-terrain-layer') {
            LensManager.toggleLayer('bz-terrain-layer');
        }
    }
}
LensManager.registerLensLayer('bz-terrain-layer', new bzTerrainLensLayer());

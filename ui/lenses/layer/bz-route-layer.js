import { L as LensManager } from '/core/ui/lenses/lens-manager.chunk.js';
import { U as UpdateGate } from '/core/ui/utilities/utilities-update-gate.chunk.js';

// VFX constants
const BZ_DIRECTION_VFX = [
    6, 1, 2, 3, 4, 5
];
// coordinates for tile edges
const BZ_DIRECTION_OFFSET = [
    { x: 16, y: 28 },    // northeast
    { x: 32, y: 0 },     // east
    { x: 16, y: -28 },   // southeast
    { x: -16, y: -28 },  // southwest
    { x: -32, y: 0 },    // west
    { x: -16, y: 28 },   // northwest
];
const VFX_NAME = 'VFX_3dUI_TradeRoute_01';
const VFX_OFFSET = { x: 0, y: 0, z: 0 };
// #ebb25f  oklch(0.8 0.12 75)  rgb(235, 178, 95)
const BZ_ROAD_RGB = [235/255, 178/255, 95/255];
// #98a7fa  oklch(0.75 0.12 275)  rgb(152, 167, 250)
const BZ_RAILROAD_RGB = [152/255, 167/255, 250/255];

class bzRouteLensLayer {
    cliffAsset = "dip_cancel";
    routeSpriteGrid = WorldUI.createSpriteGrid(
        "bzRouteLayer_SpriteGroup",
        SpriteMode.Billboard
    );
    constructor() {
        // model group for displaying route VFX
        this.routeModelGroup = WorldUI.createModelGroup("bzRouteModelGroup");
        // map data (indexed by plotIndex)
        this.routes = null;  // route segments
        this.visible = null;  // revealed plots (when layer is enabled)
        // route types
        const railTypes = GameInfo.Routes.filter(r => r.RequiredConstructible);
        this.railTypes = new Set(railTypes.map(r => r.$hash));
        // event handlers
        this.updateGate = new UpdateGate(this.updateMap.bind(this));
        this.onRouteChange = () => this.updateGate.call('onRouteChange');
        this.onLayerHotkeyListener = this.onLayerHotkey.bind(this);
    }
    initLayer() {
        this.updateMap();
        engine.on('RouteAddedToMap', this.onRouteChange);
        engine.on('RouteChanged', this.onRouteChange);
        engine.on('RouteRemovedFromMap', this.onRouteChange);
        window.addEventListener('layer-hotkey', this.onLayerHotkeyListener);
        this.routeSpriteGrid.setVisible(false);
    }
    applyLayer() {
        // initialize visibility map but don't reset it (avoids flicker)
        if (!this.visible) this.visible = [];
        this.updateVFX();
        engine.on('PlotVisibilityChanged', this.onVisibilityChange, this);
        this.routeSpriteGrid.setVisible(true);
    }
    removeLayer() {
        // disable VFX handlers and clear the map
        engine.off('PlotVisibilityChanged', this.onVisibilityChange, this);
        this.routeModelGroup.clear();
        this.visible = null;
        this.routeSpriteGrid.setVisible(false);
    }
    updatePlot(loc) {
        // this.routeSpriteGrid.clearPlot(loc);
        const plotIndex = GameplayMap.getIndexFromLocation(loc);
        const links = this.routes[plotIndex] = [];
        const elev = GameplayMap.getElevation(loc.x, loc.y);
        const rtype = GameplayMap.getRouteType(loc.x, loc.y);
        // road & rail links are distinct only if this tile has rail
        const road = [];
        const rail = this.railTypes.has(rtype) ? [] : road;
        for (let dir = 0; dir < DirectionTypes.NUM_DIRECTION_TYPES; ++dir) {
            const adj = GameplayMap.getAdjacentPlotLocation(loc, dir);
            if (GameplayMap.isCliffCrossing(loc.x, loc.y, dir)) {
                // add a sprite at the top of the cliff
                if (elev < GameplayMap.getElevation(adj.x, adj.y)) continue;
                const offset = BZ_DIRECTION_OFFSET[dir];
                const params = { scale: 1 };
                this.routeSpriteGrid.addSprite(loc, this.cliffAsset, offset, params);
                continue;  // no roads across cliffs
            }
            if (rtype == -1) continue;  // no roads through this tile
            const artype = GameplayMap.getRouteType(adj.x, adj.y);
            if (artype == -1) continue;  // no roads in this direction
            const link = this.railTypes.has(artype) ? rail : road;
            link.push(BZ_DIRECTION_VFX[dir]);
        }
        // combine road links into start/end pairs
        for (let i = 0; i < road.length; i+=2) {
            const start = road[i];
            const end = road[i+1] ?? 0;
            const Color3 = BZ_ROAD_RGB;
            links.push({ start, end, Color3 });
        }
        // combine rail links into start/end pairs
        if (rail !== road) {
            for (let i = 0; i < rail.length; i+=2) {
                const start = rail[i];
                const end = rail[i+1] ?? 0;
                const Color3 = BZ_RAILROAD_RGB;
                links.push({ start, end, Color3 });
            }
        }
    }
    updateMap() {
        const p1 = performance.now();
        this.routeSpriteGrid.clear();
        this.routes = [];
        // refresh the route map
        const width = GameplayMap.getGridWidth();
        const height = GameplayMap.getGridHeight();
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const loc = { x, y };
                this.updatePlot(loc);
            }
        }
        const p2 = performance.now();
        console.warn(`TRIX MAP ${(p2-p1).toFixed(1)}ms`);
        // refresh VFX, if enabled
        if (this.visible) {
            this.visible = [];
            this.routeModelGroup.clear();
            this.updateVFX();
        }
        const p3 = performance.now();
        console.warn(`TRIX VFX ${(p3-p2).toFixed(1)}ms`);
    }
    updatePlotVFX(plotIndex) {
        if (this.visible[plotIndex]) return;  // already visible
        const loc = GameplayMap.getLocationFromIndex(plotIndex);
        if (GameplayMap.getRevealedState(GameContext.localObserverID, loc.x, loc.y) ==
            RevealedStates.HIDDEN) return;  // not yet revealed
        this.visible[plotIndex] = true;
        for (const constants of this.routes[plotIndex]) {
            const params = { constants };
            this.routeModelGroup.addVFXAtPlot(VFX_NAME, plotIndex, VFX_OFFSET, params);
        }
    }
    updateVFX() {
        for (const plotIndex of this.routes.keys()) this.updatePlotVFX(plotIndex);
    }
    onVisibilityChange(data) {
        const plotIndex = GameplayMap.getIndexFromLocation(data.location);
        this.updatePlotVFX(plotIndex);
    }
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == 'toggle-bz-route-layer') {
            LensManager.toggleLayer('bz-route-layer');
        }
    }
}
LensManager.registerLensLayer('bz-route-layer', new bzRouteLensLayer());

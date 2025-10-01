import { L as LensManager } from '/core/ui/lenses/lens-manager.chunk.js';
import { U as UpdateGate } from '/core/ui/utilities/utilities-update-gate.chunk.js';
// load mini-map first to configure allowed layers for default lens
import '/bz-map-trix/ui/mini-map/bz-panel-mini-map.js';

const SPRITE_CLIFF = "dip_cancel";
// coordinates for tile edges
const SPRITE_OFFSET = [
    { x: 16, y: 28 },    // northeast
    { x: 32, y: 0 },     // east
    { x: 16, y: -28 },   // southeast
    { x: -16, y: -28 },  // southwest
    { x: -32, y: 0 },    // west
    { x: -16, y: 28 },   // northwest
];
// VFX constants
const VFX_ROUTE = "VFX_3dUI_TradeRoute_01";
const VFX_OFFSET = { x: 0, y: 0, z: 0 };
const VFX_DIRECTION = [ 6, 1, 2, 3, 4, 5 ];  // northeast is 6, not 0
// #ebb25f  oklch(0.8 0.12 75)  rgb(235, 178, 95)
const RGB_ROAD = [235/255, 178/255, 95/255];
// #98a7fa  oklch(0.75 0.12 275)  rgb(152, 167, 250)
const RGB_RAILROAD = [152/255, 167/255, 250/255];

class bzRouteLensLayer {
    routeSpriteGrid = WorldUI.createSpriteGrid(
        "bzRouteLayer_SpriteGroup",
        SpriteMode.Billboard
    );
    routeModelGroup = WorldUI.createModelGroup("bzRouteModelGroup");
    railTypes = new Set(
        GameInfo.Routes.filter(r => r.RequiredConstructible).map(r => r.$hash)
    );
    // map data (indexed by plotIndex)
    routes = null;  // route segments
    visible = null;  // revealed plots (when layer is enabled)
    // event handlers
    updateGate = new UpdateGate(this.updateMap.bind(this));
    onRouteChange = () => this.updateGate.call("onRouteChange");
    onLayerHotkeyListener = this.onLayerHotkey.bind(this);
    initLayer() {
        this.updateMap();
        engine.on("RouteAddedToMap", this.onRouteChange);
        engine.on("RouteChanged", this.onRouteChange);
        engine.on("RouteRemovedFromMap", this.onRouteChange);
        window.addEventListener("layer-hotkey", this.onLayerHotkeyListener);
        this.routeSpriteGrid.setVisible(false);
    }
    applyLayer() {
        // initialize visibility map but don't reset it (avoids flicker)
        if (!this.visible) this.visible = [];
        this.updateVFX();
        engine.on("PlotVisibilityChanged", this.onVisibilityChange, this);
        this.routeSpriteGrid.setVisible(true);
    }
    removeLayer() {
        // disable VFX handlers and clear the map
        engine.off("PlotVisibilityChanged", this.onVisibilityChange, this);
        this.routeModelGroup.clear();
        this.visible = null;
        this.routeSpriteGrid.setVisible(false);
    }
    getOptionName() {
        return "bzShowMapRoads";
    }
    updatePlot(loc) {
        // this.routeSpriteGrid.clearPlot(loc);
        const plotIndex = GameplayMap.getIndexFromLocation(loc);
        const links = this.routes[plotIndex] = [];
        const rtype = GameplayMap.getRouteType(loc.x, loc.y);
        // road & rail links are distinct only if this tile has rail
        const road = [];
        const rail = this.railTypes.has(rtype) ? [] : road;
        for (let dir = 0; dir < DirectionTypes.NUM_DIRECTION_TYPES; ++dir) {
            // note: getAdjacentPlotLocation is slow, only use as needed
            if (GameplayMap.isCliffCrossing(loc.x, loc.y, dir)) {
                // add a sprite at the top of the cliff
                const adj = GameplayMap.getAdjacentPlotLocation(loc, dir);
                if (GameplayMap.getElevation(adj.x, adj.y)
                    <= GameplayMap.getElevation(loc.x, loc.y)) {
                    const offset = SPRITE_OFFSET[dir];
                    this.routeSpriteGrid.addSprite(loc, SPRITE_CLIFF, offset);
                }
                continue;  // no roads across cliffs
            }
            if (rtype == -1) continue;  // no roads through this tile
            const adj = GameplayMap.getAdjacentPlotLocation(loc, dir);
            const artype = GameplayMap.getRouteType(adj.x, adj.y);
            if (artype == -1) continue;  // no roads in this direction
            const link = this.railTypes.has(artype) ? rail : road;
            link.push(VFX_DIRECTION[dir]);
        }
        // combine road links into start/end pairs
        for (let i = 0; i < road.length; i+=2) {
            const start = road[i];
            const end = road[i+1] ?? 0;
            const Color3 = RGB_ROAD;
            links.push({ start, end, Color3 });
        }
        // combine rail links into start/end pairs
        if (rail !== road) {
            for (let i = 0; i < rail.length; i+=2) {
                const start = rail[i];
                const end = rail[i+1] ?? 0;
                const Color3 = RGB_RAILROAD;
                links.push({ start, end, Color3 });
            }
        }
    }
    updateMap() {
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
        // refresh VFX, if enabled
        if (this.visible) {
            this.visible = [];
            this.routeModelGroup.clear();
            this.updateVFX();
        }
    }
    updatePlotVFX(plotIndex) {
        if (this.visible[plotIndex]) return;  // already visible
        const loc = GameplayMap.getLocationFromIndex(plotIndex);
        if (GameplayMap.getRevealedState(GameContext.localObserverID, loc.x, loc.y) ==
            RevealedStates.HIDDEN) return;  // not yet revealed
        this.visible[plotIndex] = true;
        for (const constants of this.routes[plotIndex]) {
            const params = { constants };
            this.routeModelGroup.addVFXAtPlot(VFX_ROUTE, plotIndex, VFX_OFFSET, params);
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
        if (hotkey.detail.name == "toggle-bz-route-layer") {
            LensManager.toggleLayer("bz-route-layer");
        }
    }
}
LensManager.registerLensLayer("bz-route-layer", new bzRouteLensLayer());

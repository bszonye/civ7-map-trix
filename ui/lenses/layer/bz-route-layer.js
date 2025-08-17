import LensManager from '/core/ui/lenses/lens-manager.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';

const BZ_DIRECTIONS = [
    DirectionTypes.NO_DIRECTION,
    DirectionTypes.DIRECTION_EAST,
    DirectionTypes.DIRECTION_SOUTHEAST,
    DirectionTypes.DIRECTION_SOUTHWEST,
    DirectionTypes.DIRECTION_WEST,
    DirectionTypes.DIRECTION_NORTHWEST,
    DirectionTypes.DIRECTION_NORTHEAST,
];
const VFX_NAME = 'VFX_3dUI_TradeRoute_01';
const VFX_OFFSET = { x: 0, y: 0, z: 0 };
// #ebb25f  oklch(0.8 0.12 75)  rgb(235, 178, 95)
const BZ_ROAD_RGB = [235/255, 178/255, 95/255];
// #98a7fa  oklch(0.75 0.12 275)  rgb(152, 167, 250)
const BZ_RAILROAD_RGB = [152/255, 167/255, 250/255];

class bzRouteLensLayer {
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
    }
    applyLayer() {
        // initialize visibility map but don't reset it (avoids flicker)
        if (!this.visible) this.visible = [];
        this.updateVFX();
        engine.on('PlotVisibilityChanged', this.onVisibilityChange, this);
    }
    removeLayer() {
        // disable VFX handlers and clear the map
        engine.off('PlotVisibilityChanged', this.onVisibilityChange, this);
        this.routeModelGroup.clear();
        this.visible = null;
    }
    getPlotRoutes(loc) {
        const links = [];
        if (GameplayMap.getRouteType(loc.x, loc.y) == -1) return links;
        // get route info for [center, east, southest, ..., northeast]
        const drtype = BZ_DIRECTIONS
            .map(i => GameplayMap.getAdjacentPlotLocation(loc, i))
            .map(loc => GameplayMap.getRouteType(loc.x, loc.y));
        // collect all rail-to-rail and road links
        const rail = [];
        const road = [];
        const hasRail = this.railTypes.has(drtype[0]);
        for (const [i, rtype] of drtype.entries()) {
            if (!i) continue;  // skip center
            if (rtype == -1) continue;  // skip missing links
            const link = hasRail && this.railTypes.has(rtype) ? rail : road;
            link.push(i);
        }
        // combine road links into start/end pairs
        for (let i = 0; i < road.length; i+=2) {
            const start = road[i];
            const end = road[i+1] ?? 0;
            const Color3 = BZ_ROAD_RGB;
            links.push({ start, end, Color3 });
        }
        // combine rail links into start/end pairs
        for (let i = 0; i < rail.length; i+=2) {
            const start = rail[i];
            const end = rail[i+1] ?? 0;
            const Color3 = BZ_RAILROAD_RGB;
            links.push({ start, end, Color3 });
        }
        return links;
    }
    updateMap() {
        // refresh the route map
        const width = GameplayMap.getGridWidth();
        const height = GameplayMap.getGridHeight();
        this.routes = [];
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const loc = { x, y };
                const plotIndex = GameplayMap.getIndexFromLocation(loc);
                this.routes[plotIndex] = this.getPlotRoutes(loc);
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
        for (const route of this.routes[plotIndex]) {
            const params = { constants: route };
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

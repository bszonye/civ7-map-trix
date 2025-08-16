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
        this.routeModelGroup = WorldUI.createModelGroup("bzRouteModelGroup");
        this.map = [];
        this.visible = null;
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
        if (!this.visible) this.visible = [];
        this.updateVFX();
        engine.on('PlotVisibilityChanged', this.onVisibilityChange, this);
    }
    removeLayer() {
        engine.off('PlotVisibilityChanged', this.onVisibilityChange, this);
        this.clearVFX(null);
    }
    getPlotRoutes(loc) {
        const links = [];
        if (GameplayMap.getRouteType(loc.x, loc.y) == -1) return links;
        const adj = BZ_DIRECTIONS.map(i => GameplayMap.getAdjacentPlotLocation(loc, i));
        const ids = adj.map(loc => GameplayMap.getRouteType(loc.x, loc.y));
        const types = ids.map(id => GameInfo.Routes.lookup(id));
        const road = [];
        const rail = [];
        const hub = types[0].PlacementRequiresRoutePresent ? rail : road;
        for (const [i, type] of types.entries()) {
            if (!i || !type) continue;  // skip hub and missing links
            (type.PlacementRequiresRoutePresent ? hub : road).push(i);
        }
        for (let i = 0; i < road.length; i+=2) {
            const start = road[i];
            const end = road[i+1] ?? 0;
            const Color3 = BZ_ROAD_RGB;
            links.push({ start, end, Color3 });
        }
        for (let i = 0; i < rail.length; i+=2) {
            const start = rail[i];
            const end = rail[i+1] ?? 0;
            const Color3 = BZ_RAILROAD_RGB;
            links.push({ start, end, Color3 });
        }
        return links;
    }
    updateMap() {
        const width = GameplayMap.getGridWidth();
        const height = GameplayMap.getGridHeight();
        this.map = [];
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const loc = { x, y };
                const plotIndex = GameplayMap.getIndexFromLocation(loc);
                const routes = this.getPlotRoutes(loc);
                this.map[plotIndex] = routes;
            }
        }
        if (this.visible) {
            this.clearVFX();
            this.updateVFX();
        }
    }
    updatePlotVFX(plotIndex) {
        if (this.visible[plotIndex]) return;  // already visible
        const routes = this.map[plotIndex];
        if (!routes.length) return;  // nothing to display
        const loc = GameplayMap.getLocationFromIndex(plotIndex);
        if (GameplayMap.getRevealedState(GameContext.localObserverID, loc.x, loc.y) ==
            RevealedStates.HIDDEN) return;  // not yet revealed
        this.visible[plotIndex] = true;
        for (const route of routes) {
            const params = { constants: route };
            this.routeModelGroup.addVFXAtPlot(VFX_NAME, plotIndex, VFX_OFFSET, params);
        }
    }
    updateVFX() {
        for (const plotIndex of this.map.keys()) this.updatePlotVFX(plotIndex);
    }
    clearVFX(visible = []) {
        this.visible = visible;
        this.routeModelGroup.clear();
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

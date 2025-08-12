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
// #ebb25f  oklch(0.8 0.12 75)  rgb(235, 178, 95)
const BZ_ROAD_RGB = [235/255, 178/255, 95/255];
// #98a7fa  oklch(0.75 0.12 275)  rgb(152, 167, 250)
const BZ_RAILROAD_RGB = [152/255, 167/255, 250/255];

class bzRouteLensLayer {
    constructor() {
        this.routeModelGroup = WorldUI.createModelGroup("bzRouteModelGroup");
        this.map = [];
        this.visible = false;
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
        // show VFX if it isn't already visible (prevents flickering)
        this.updateVFX(!this.visible);
    }
    removeLayer() {
        this.visible = false;
        this.routeModelGroup.clear();
    }
    getRoutes(loc) {
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
                const routes = this.getRoutes(loc);
                for (const route of routes) this.map.push([plotIndex, route]);
            }
        }
        if (this.visible) this.updateVFX();
    }
    updateVFX(visible=this.visible) {
        if (!visible) return;
        this.routeModelGroup.clear();
        for (const [plotIndex, route] of this.map) {
            this.routeModelGroup.addVFXAtPlot("VFX_3dUI_TradeRoute_01", plotIndex, { x: 0, y: 0, z: 0 }, { constants: route });
        }
        this.visible = true;
    }
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == 'toggle-bz-route-layer') {
            LensManager.toggleLayer('bz-route-layer');
        }
    }
}
LensManager.registerLensLayer('bz-route-layer', new bzRouteLensLayer());

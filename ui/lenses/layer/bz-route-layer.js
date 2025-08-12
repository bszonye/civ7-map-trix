import LensManager from '/core/ui/lenses/lens-manager.js';

// #e0b67b  oklch(0.8 0.09 75)  rgb(224, 182, 123)
const BZ_ROAD_RGB = [224/255, 182/255, 123/255];
// #9daae7  oklch(0.75 0.09 275)  rgb(157, 170, 231)
const BZ_RAILROAD_RGB = [157/255, 170/255, 231/255];

class bzRouteLensLayer {
    constructor() {
        this.routeModelGroup = WorldUI.createModelGroup("bzRouteModelGroup");
        this.onLayerHotkeyListener = this.onLayerHotkey.bind(this);
    }
    initLayer() {
        window.addEventListener('layer-hotkey', this.onLayerHotkeyListener);
        console.warn(`TRIX ${Object.getOwnPropertyNames(Object.getPrototypeOf(this.routeModelGroup))}`);
    }
    applyLayer() {
        this.updateMap();
        // this.routeModelGroup.setVisible(true);
    }
    removeLayer() {
        this.routeModelGroup.clear();
        // this.routeModelGroup.setVisible(false);
    }
    getRoutes(loc) {
        const id = GameplayMap.getRouteType(loc.x, loc.y);
        const info = GameInfo.Routes.lookup(id);
        if (!info) return [];
        const color = info.PlacementRequiresRoutePresent ? BZ_RAILROAD_RGB :
            BZ_ROAD_RGB;
        return [
            { start: 1, end: 4, Color3: color },
            { start: 2, end: 5, Color3: color },
            { start: 3, end: 6, Color3: color },
        ];
    }
    updateMap() {
        this.routeModelGroup.clear();
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
        const routes = this.getRoutes(loc);
        for (const route of routes) {
            const index = this.routeModelGroup.addVFXAtPlot("VFX_3dUI_TradeRoute_01", plotIndex, { x: 0, y: 0, z: 0 }, { constants: route });
            console.warn(`TRIX VFX ${index} ${JSON.stringify(this.routeModelGroup.getVFXByIndex(index))}`);
        }
    }
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == 'toggle-bz-route-layer') {
            LensManager.toggleLayer('bz-route-layer');
        }
    }
}
LensManager.registerLensLayer('bz-route-layer', new bzRouteLensLayer());

import LensManager from '/core/ui/lenses/lens-manager.js';

const BZ_ROAD_RGB = [239/255, 200/255, 118/255];
const BZ_RAILROAD_RGB = [164/255, 172/255, 206/255];
class bzRouteLensLayer {
    constructor() {
        this.routeModelGroup = WorldUI.createModelGroup("bzRouteModelGroup");
        this.onLayerHotkeyListener = this.onLayerHotkey.bind(this);
    }
    initLayer() {
        this.updateMap();
        window.addEventListener('layer-hotkey', this.onLayerHotkeyListener);
        // this.routeModelGroup.setVisible(false);
        console.warn(`TRIX ${Object.getOwnPropertyNames(Object.getPrototypeOf(this.routeModelGroup))}`);
    }
    applyLayer() {
        this.updateMap();
        // this.routeModelGroup.setVisible(true);
    }
    removeLayer() {
        // this.routeModelGroup.setVisible(false);
    }
    getRoutes(_loc) {
        // TODO
        return [
            { start: 0, end: 3, Color3: BZ_ROAD_RGB },
            { start: 0, end: 6, Color3: BZ_ROAD_RGB },
            { start: 0, end: 2, Color3: BZ_RAILROAD_RGB },
            { start: 0, end: 5, Color3: BZ_RAILROAD_RGB },
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

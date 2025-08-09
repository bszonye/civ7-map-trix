import LensManager from '/core/ui/lenses/lens-manager.js';
class bzStrategyLens {
    constructor() {
        this.activeLayers = new Set([
            'fxs-hexgrid-layer',
            'fxs-resource-layer',
            'bz-culture-borders-layer',
            'bz-discovery-layer',
            'bz-fortification-layer',
            'bz-terrain-layer',
        ]);
        this.allowedLayers = new Set([
        ]);
    }
}
LensManager.registerLens('bz-strategy-lens', new bzStrategyLens());

import LensManager from '/core/ui/lenses/lens-manager.js';
class bzReligionLens {
    constructor() {
        this.activeLayers = new Set([
            'fxs-hexgrid-layer',
            'fxs-resource-layer',
            'fxs-operation-target-layer',
            'bz-city-borders-layer',
            'bz-discovery-layer',
            'bz-religion-layer',
        ]);
        this.allowedLayers = new Set([
        ]);
    }
}
LensManager.registerLens('bz-religion-lens', new bzReligionLens());

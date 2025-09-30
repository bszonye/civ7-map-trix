import { L as LensManager } from '/core/ui/lenses/lens-manager.chunk.js';
class bzReligionLens {
    constructor() {
        this.activeLayers = new Set([
            'fxs-operation-target-layer',
            'bz-city-borders-layer',
            'bz-discovery-layer',
            'bz-religion-layer',
        ]);
        this.allowedLayers = new Set([
            'fxs-hexgrid-layer',
            'fxs-resource-layer',
        ]);
    }
}
LensManager.registerLens('bz-religion-lens', new bzReligionLens());

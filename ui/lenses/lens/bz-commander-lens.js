import { L as LensManager } from '/core/ui/lenses/lens-manager.chunk.js';
class bzCommanderLens {
    constructor() {
        this.activeLayers = new Set([
            'fxs-hexgrid-layer',
            'fxs-resource-layer',
            'fxs-operation-target-layer',
            'bz-culture-borders-layer',
            'bz-discovery-layer',
            'bz-fortification-layer',
            'bz-route-layer',
            'bz-terrain-layer',
        ]);
        this.allowedLayers = new Set([
        ]);
    }
}
LensManager.registerLens('bz-commander-lens', new bzCommanderLens());

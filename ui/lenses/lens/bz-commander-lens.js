import { L as LensManager } from '/core/ui/lenses/lens-manager.chunk.js';
class bzCommanderLens {
    activeLayers = new Set([
        "fxs-operation-target-layer",
        "bz-culture-borders-layer",
        "bz-discovery-layer",
        "bz-fortification-layer",
        "bz-route-layer",
        "bz-terrain-layer",
    ]);
    allowedLayers = new Set([
        "fxs-hexgrid-layer",
        "fxs-resource-layer",
        "bz-city-borders-layer",
    ]);
    blendEnabledLayersOnTransition = false;
}
LensManager.registerLens("bz-commander-lens", new bzCommanderLens());

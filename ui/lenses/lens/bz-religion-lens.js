import { L as LensManager } from '/core/ui/lenses/lens-manager.chunk.js';
class bzReligionLens {
    activeLayers = new Set([
        "fxs-operation-target-layer",
        "bz-city-borders-layer",
        "bz-discovery-layer",
        "bz-religion-layer",
    ]);
    allowedLayers = new Set([
        "fxs-hexgrid-layer",
        "fxs-resource-layer",
    ]);
    blendEnabledLayersOnTransition = false;
}
LensManager.registerLens("bz-religion-lens", new bzReligionLens());

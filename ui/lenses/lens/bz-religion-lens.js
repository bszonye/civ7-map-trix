import LensManager from '/core/ui/lenses/lens-manager.js';
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
    useUserConfig = true;
    showInMinimap = {
        labelKey: "LOC_UI_MINI_MAP_RELIGION",
        sortOrder: 60
    };
}
LensManager.registerLens("bz-religion-lens", new bzReligionLens());

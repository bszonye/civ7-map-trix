import { A as Audio } from '/core/ui/audio-base/audio-support.chunk.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { L as LensManager } from '/core/ui/lenses/lens-manager.chunk.js';
// guarantee import order for patching
import '/base-standard/ui/interface-modes/interface-mode-ranged-attack.js';

// configure lenses just before default interface startup
window.addEventListener("interface-mode-ready", (_event) => {
    for (const [lensType, lens] of LensManager.lenses.entries()) {
        for (const layerType of LensManager.layers.keys()) {
            const layerOption = LensManager.getLayerOption(layerType);
            if (!layerOption) continue;
            const optionName = `bz-map-trix.${lensType}.${layerOption}`;
            const ovalue = UI.getOption("user", "Mod", optionName);
            if (ovalue == null) {
                continue;  // not set
            } else if (ovalue) {
                lens.activeLayers.add(layerType);
            } else {
                lens.activeLayers.delete(layerType);
            }
            lens.allowedLayers.delete(layerType);
            console.warn(`LENS ${optionName}=${ovalue}`);
        }
    }
});

// patch RangedAttackInterfaceMode.decorate() method
const RAIM = InterfaceMode.getInterfaceModeHandler("INTERFACEMODE_RANGE_ATTACK");
const RAIM_prototype = Object.getPrototypeOf(RAIM);
RAIM_prototype.decorate = function(overlayGroup, _modelGroup) {
    const plotOverlay = overlayGroup.addPlotOverlay();
    const plots = [];
    this.validPlots.forEach((p) => plots.push(p));
    // replace overlay with the bright green used for other unit types
    const GREEN_TRANSPARENT_LINEAR = { x: 0, y: 1, z: 0, w: 0.5 };
    plotOverlay.addPlots(plots, { fillColor: GREEN_TRANSPARENT_LINEAR });
    Audio.playSound("data-audio-plot-select-overlay", "interact-unit");
}

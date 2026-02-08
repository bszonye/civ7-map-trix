import { A as Audio } from '/core/ui/audio-base/audio-support.chunk.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
// guarantee import order for patching
import '/base-standard/ui/interface-modes/interface-mode-ranged-attack.js';

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

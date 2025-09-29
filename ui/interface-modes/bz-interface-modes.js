import { A as Audio } from '/core/ui/input/focus-manager.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { H as HighlightColors } from '/core/ui/utilities/utilities-color.chunk.js';
// guarantee import order for patching
import '/base-standard/ui/interface-modes/interface-mode-ranged-attack.js';

// patch RangedAttackInterfaceMode.decorate() method
engine.whenReady.then(() => {
    const RAIM = InterfaceMode.getInterfaceModeHandler('INTERFACEMODE_RANGE_ATTACK');
    const prototype = Object.getPrototypeOf(RAIM);
    prototype.decorate = RAIM_decorate;
});

function RAIM_decorate(overlayGroup, _modelGroup) {
    console.warn(`TRIX RANGE-ATTACK`);
    const plotOverlay = overlayGroup.addPlotOverlay();
    const plots = [];
    this.validPlots.forEach((p) => plots.push(p));
    // fill range attack overlay for better visibility
    const edgeColor = HighlightColors.unitAttack;
    const fillColor = HighlightColors.unitAttack & 0xffffff | 0x66000000;
    plotOverlay.addPlots(plots, { edgeColor, fillColor });
    Audio.playSound("data-audio-plot-select-overlay", "interact-unit");
}

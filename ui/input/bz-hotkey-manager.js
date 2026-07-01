import HotkeyManager from '/core/ui/input/hotkey-manager.js';
import LensManager from '/core/ui/lenses/lens-manager.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';

const modes = {
    DMT_INTERFACEMODE_MAP_TACK_CHOOSER: "dmt-map-tack-lens",
    DMT_INTERFACEMODE_PLACE_MAP_TACKS: "dmt-map-tack-lens",
    INTERFACEMODE_ACQUIRE_TILE: "fxs-acquire-tile-lens",
    INTERFACEMODE_BONUS_PLACEMENT: "fxs-settler-lens",
    INTERFACEMODE_PLACE_BUILDING: "fxs-building-placement-lens",
}

const HM_handleInput = HotkeyManager.handleInput;
HotkeyManager.handleInput = function(...args) {
    const [inputEvent] = args;
    const status = inputEvent.detail.status;
    if (status == InputActionStatuses.FINISH) {
        const name = inputEvent.detail.name;
        switch (name) {
            case "bz-set-active-fxs-default-lens":
            case "bz-set-active-fxs-settler-lens":
            case "bz-set-active-fxs-continent-lens":
            case "bz-set-active-fxs-trade-lens":
            case "bz-set-active-fxs-general-appeal-lens":
            case "bz-set-active-fxs-discovery-lens":
            case "bz-set-active-bz-religion-lens":
            case "bz-set-active-bz-commander-lens":
            case "bz-set-active-dmt-map-tack-lens": {
                const lens = name.substr("bz-set-active-".length);
                if (LensManager.getActiveLens() != lens) {
                    LensManager.setActiveLens(lens);
                } else {
                    const mode = InterfaceMode.getCurrent();
                    const lens = modes[mode] ?? "fxs-default-lens";
                    LensManager.setActiveLens(lens);
                }
                return false;
            }
            case "open-bz-city-panel":
            case "open-bz-units-panel":
                this.sendHotkeyEvent(name);
                return false;
            case "toggle-bz-culture-borders-layer":
            case "toggle-bz-city-borders-layer":
            case "toggle-bz-discovery-layer":
            case "toggle-bz-fortification-layer":
            case "toggle-bz-religion-layer":
            case "toggle-bz-route-layer":
            case "toggle-bz-terrain-layer":
            case "toggle-bz-wonder-layer":
            case "toggle-fxs-conquest-layer":
                this.sendLayerHotkeyEvent(name);
                return false;
        }
    }
    // default handler
    return HM_handleInput.apply(this, args);
}

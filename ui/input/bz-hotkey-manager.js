import HotkeyManager from '/core/ui/input/hotkey-manager.js';
import LensManager from '/core/ui/lenses/lens-manager.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';

// default lenses for interface modes that don't use fxs-default-lens
const BZ_MODE_DEFAULTS = {
    DMT_INTERFACEMODE_MAP_TACK_CHOOSER: "dmt-map-tack-lens",
    DMT_INTERFACEMODE_PLACE_MAP_TACKS: "dmt-map-tack-lens",
    INTERFACEMODE_ACQUIRE_TILE: "fxs-acquire-tile-lens",
    INTERFACEMODE_PLACE_BUILDING: "fxs-building-placement-lens",
    INTERFACEMODE_CINEMATIC: "fxs-cinematic-lens",
    INTERFACEMODE_PEACE_DEAL: "fxs-diplomacy-lens",
    INTERFACEMODE_DIPLOMACY_PROJECT_REACTION: "fxs-diplomacy-lens",
    INTERFACEMODE_DIPLOMACY_DIALOG: "fxs-diplomacy-lens",
    INTERFACEMODE_DIPLOMACY_HUB: "fxs-diplomacy-lens",
    INTERFACEMODE_CALL_TO_ARMS: "fxs-diplomacy-lens",
    INTERFACEMODE_HOTSEAT: "fxs-hotseat-lens",
    INTERFACEMODE_BONUS_PLACEMENT: "fxs-settler-lens",
}
Loading.runWhenLoaded(() => {
    // after all interface modes are initialized, set the default lens
    // for any that don't use fxs-default-lens.
    for (const [mode, lens] of Object.entries(BZ_MODE_DEFAULTS)) {
        const handler = InterfaceMode.getInterfaceModeHandler(mode);
        if (handler) handler.bzDefaultLens ??= lens;
    }
});

const HM_handleInput = HotkeyManager.handleInput;
HotkeyManager.handleInput = function(...args) {
    const [inputEvent] = args;
    const status = inputEvent.detail.status;
    if (status == InputActionStatuses.FINISH) {
        const name = inputEvent.detail.name;
        switch (name) {
            case "open-bz-city-panel":
            case "open-bz-units-panel":
            case "open-bz-lens-panel":
                this.sendHotkeyEvent(name);
                return false;
            case "toggle-fxs-settler-lens":
            case "toggle-fxs-continent-lens":
            case "toggle-fxs-trade-lens":
            case "toggle-fxs-general-appeal-lens":
            case "toggle-fxs-discovery-lens":
            case "toggle-bz-religion-lens":
            case "toggle-bz-commander-lens": {
                // activate the lens, if it isn't already active
                const lens = name.substr("toggle-".length);
                if (LensManager.getActiveLens() != lens) {
                    LensManager.setActiveLens(lens);
                    return false;
                }
                // else: fall through
            }
            case "toggle-fxs-default-lens": {
                // set the default lens for the current interface mode
                const mode = InterfaceMode.getCurrent();
                const handler = InterfaceMode.getInterfaceModeHandler(mode);
                const lens = handler?.bzDefaultLens ?? "fxs-default-lens";
                LensManager.setActiveLens(lens);
                return false;
            }
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

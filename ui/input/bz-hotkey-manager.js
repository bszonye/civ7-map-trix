import HotkeyManager from '/core/ui/input/hotkey-manager.chunk.js';

const HM_handleInput = HotkeyManager.handleInput;
HotkeyManager.handleInput = function(...args) {
    const [inputEvent] = args;
    const status = inputEvent.detail.status;
    if (status == InputActionStatuses.FINISH) {
        const name = inputEvent.detail.name;
        switch (name) {
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
                this.sendLayerHotkeyEvent(name);
                return false;
        }
    }
    // default handler
    return HM_handleInput.apply(this, args);
}

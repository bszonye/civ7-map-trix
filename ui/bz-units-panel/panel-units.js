import { F as Focus } from '/core/ui/input/focus-support.chunk.js';
import { b as InputEngineEventName } from '../../../core/ui/input/input-support.chunk.js';
import { A as AnchorType } from '/core/ui/panel-support.chunk.js';
import { D as Databind } from '/core/ui/utilities/utilities-core-databinding.chunk.js';
import { C as ComponentID } from '/core/ui/utilities/utilities-component-id.chunk.js';
import { MinimapSubpanel } from '/base-standard/ui/mini-map/panel-mini-map.js';
import { bzUnitList } from '/bz-map-trix/ui/bz-units-panel/model-units.js';

const styles = "fs://game/bz-map-trix/ui/bz-units-panel/panel-units.css";

class bzPanelMiniMap {
    static c_prototype;
    static instance;
    unitsSubpanel = null;
    engineInputListener = this.onEngineInput.bind(this);
    hotkeyListener = this.onHotkey.bind(this);
    toggleCooldown = 0;
    toggleQueued = false;
    constructor(component) {
        bzPanelMiniMap.instance = this;
        this.component = component;
        component.bzComponent = this;
        this.patchPrototypes(this.component);
    }
    patchPrototypes(component) {
        const c_prototype = Object.getPrototypeOf(component);
        if (bzPanelMiniMap.c_prototype == c_prototype) return;
        // patch component methods
        const proto = bzPanelMiniMap.c_prototype = c_prototype;
        // afterInitialize
        const afterInitialize = this.afterInitialize;
        const onInitialize = proto.onInitialize;
        proto.onInitialize = function(...args) {
            const c_rv = onInitialize.apply(this, args);
            const after_rv = afterInitialize.apply(this.bzComponent, args);
            return after_rv ?? c_rv;
        }
    }
    afterInitialize() {
        this.component.Root.classList.add("bz-units");
        this.component.addSubpanel(
            "bz-units-panel",
            "LOC_UI_PRODUCTION_UNITS",
            "blp:Action_Promote",
        );
        this.unitsSubpanel = this.component.subpanels.at(-1);
    }
    beforeAttach() { }
    afterAttach() {
        window.addEventListener("hotkey-open-bz-units-panel", this.hotkeyListener);
        this.component.Root
            .addEventListener(InputEngineEventName, this.engineInputListener);
    }
    beforeDetach() {
        window.removeEventListener("hotkey-open-bz-units-panel", this.hotkeyListener);
        this.component.Root
            .removeEventListener(InputEngineEventName, this.engineInputListener);
    }
    afterDetach() { }
    togglePanel() {
        this.toggleQueued = true;
        if (this.toggleCooldown) return;
        // limit panel toggles to 4 per second
        // (avoids crashes in the minimap)
        const toggle = () => {
            if (this.toggleQueued) {
                this.component.toggleSubpanel(this.unitsSubpanel);
                this.toggleCooldown = setTimeout(() => toggle(), 250);
            } else {
                this.toggleCooldown = 0;
            }
            this.toggleQueued = false;
        }
        toggle();
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        switch (inputEvent.detail.name) {
            case "keyboard-escape":
                if (this.component.chatPanelState) {
                    this.component.toggleChatPanel();
                }
                if (this.component.lensPanelState) {
                    this.component.toggleLensPanel();
                }
                // fall through
            case "cancel":
            case "sys-menu":
                if (this.component.activeSubpanel) {
                    this.togglePanel();
                }
                inputEvent.stopPropagation();
                inputEvent.preventDefault();
                break;
        }
    }
    onHotkey(_event) {
        this.togglePanel();
    }
}
Controls.decorate("panel-mini-map", (val) => new bzPanelMiniMap(val));

class bzUnitsPanel extends MinimapSubpanel {
    panel = document.createElement("fxs-vslot");
    inputContext = InputContext.Dual;
    activateUnitListener = this.activateUnit.bind(this);
    scrollable = document.createElement("fxs-scrollable");
    constructor(root) {
        super(root);
        this.animateInType = this.animateOutType = AnchorType.Fade;
        this.animateOutType = this.animateOutType = AnchorType.Fade;
    }
    onInitialize() {
        super.onInitialize();
        this.panel.setAttribute("data-navrule-up", "stop");
        this.panel.setAttribute("data-navrule-down", "stop");
        this.panel.setAttribute("data-navrule-right", "stop");
        this.panel.setAttribute("data-navrule-left", "stop");
        this.panel.classList.add("mini-map__units-panel", "left-3", "px-2", "py-3");
        const closeNavHelp = document.createElement("fxs-nav-help");
        closeNavHelp.setAttribute("action-key", "inline-cancel");
        closeNavHelp.classList.add("absolute", "-right-4", "-top-3", "z-1");
        Databind.classToggle(closeNavHelp, "hidden", "!{{g_NavTray.isTrayRequired}}");
        this.panel.appendChild(closeNavHelp);
        const unitsPanelContent = document.createElement("div");
        unitsPanelContent.classList.add("mb-5");
        this.panel.appendChild(unitsPanelContent);
        // header
        const header = document.createElement("fxs-header");
        header.classList.add("mb-3", "font-title-base", "text-secondary");
        header.setAttribute("title", "LOC_UI_PRODUCTION_UNITS");
        header.setAttribute("filigree-style", "h4");
        unitsPanelContent.appendChild(header);
        // TODO: filter buttons (land, sea, air, support, civilian)
        // units list
        const frame = document.createElement("div");
        frame.classList.value = "bz-units-frame p-1";
        this.panel.appendChild(frame);
        this.scrollable.classList.value = "bz-units-scrollable";
        frame.appendChild(this.scrollable);
        const list = document.createElement("fxs-vslot");
        this.scrollable.appendChild(list);
        list.classList.value = "font-body-xs";
        Databind.for(list, "g_bzUnitListModel.unitList", "entry");
        {
            const entry = document.createElement("fxs-activatable");
            entry.classList.value = "bz-units-entry flex items-center";
            entry.addEventListener("action-activate", this.activateUnitListener);
            entry.setAttribute("tabindex", "-1");
            Databind.attribute(entry, "data-unit-local-id", "entry.localId");
            // selected
            Databind.classToggle(entry, "bz-units-entry-selected",
                "{{entry.localId}}=={{g_bzUnitListModel.selectedUnit.localId}}");
            // indentation
            Databind.classToggle(entry, "bz-unit-grouped", "{{entry.isGrouped}}");
            // title
            const title = document.createElement("div");
            title.classList.value = "bz-unit-title flex justify-start items-center";
            entry.appendChild(title);
            // promotion
            const promotion = document.createElement("div");
            promotion.classList.value = "bz-unit-promotion size-6 bg-contain";
            Databind.classToggle(entry, "bz-can-promote", "{{entry.canPromote}}");
            Databind.classToggle(entry, "bz-can-upgrade", "{{entry.canUpgrade}}");
            title.appendChild(promotion);
            // icon
            const icon = document.createElement("div");
            icon.classList.value = "bz-unit-icon size-6 bg-contain";
            Databind.bgImg(icon, "entry.icon");
            title.appendChild(icon);
            // name
            const name = document.createElement("div");
            name.classList.value = "bz-unit-name ml-1";
            name.setAttribute("data-bind-attr-data-l10n-id", "{{entry.name}}");
            title.appendChild(name);
            // health
            const health = document.createElement("div");
            health.classList.value =
                "bz-unit-health flex justify-center items-center w-12 mx-1";
            Databind.classToggle(health, "invisible", "!{{entry.hasDamage}}");
            const healthIcon = document.createElement("img");
            healthIcon.classList.value = "size-5 -ml-0\\.5 mr-0\\.5";
            healthIcon.setAttribute("src", "blp:prod_generic");
            health.appendChild(healthIcon);
            const healthText = document.createElement("div");
            healthText.setAttribute("data-bind-attr-data-l10n-id", "{{entry.healthLeft}}");
            health.appendChild(healthText);
            entry.appendChild(health);
            // movement
            const movement = document.createElement("div");
            movement.classList.value =
                "bz-unit-movement flex justify-center items-center w-14 mx-1";
            const moveIcon = document.createElement("img");
            moveIcon.classList.value = "size-5 -ml-1 mr-1";
            Databind.classToggle(moveIcon, "hidden", "9<{{entry.maxMoves}}");
            moveIcon.setAttribute("src", "blp:Action_Move");
            movement.appendChild(moveIcon);
            const moveText = document.createElement("div");
            moveText.setAttribute("data-bind-attr-data-l10n-id", "{{entry.slashMoves}}");
            movement.appendChild(moveText);
            Databind.classToggle(entry, "bz-cannot-move", "!{{entry.canMove}}");
            entry.appendChild(movement);
            // status (activity + garrison)
            const state = document.createElement("div");
            state.classList.value = "bz-unit-status size-6 rounded-xl";
            Databind.classToggle(entry, "bz-unit-garrison", "{{entry.isGarrison}}");
            const activity = document.createElement("div");
            activity.classList.value =
                "bz-unit-activity size-6 bg-contain";
            Databind.bgImg(activity, "entry.activityIcon");
            state.appendChild(activity);
            const district = document.createElement("div");
            district.classList.value = "bz-unit-district size-5 bg-contain";
            Databind.classToggle(district, "hidden", "!!{{entry.activityIcon}}");
            Databind.bgImg(district, "entry.districtIcon");
            state.appendChild(district);
            entry.appendChild(state);
            // finish
            list.appendChild(entry);
        }
        // finish
        this.Root.appendChild(this.panel);
    }
    onAttach() {
        super.onAttach();
        engine.on("UnitSelectionChanged", this.onUnitSelection, this);
        // scroll to the selected unit
        const selected = UI.Player.getHeadSelectedUnit();
        if (selected) {
            // allow for the panel-opening animation
            const interval = setInterval(() => this.scrollToUnit(selected), 100);
            setTimeout(() => clearInterval(interval), 500);
        }
    }
    onDetach() {
        super.onDetach();
        engine.off("UnitSelectionChanged", this.onUnitSelection, this);
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        Focus.setContextAwareFocus(this.panel, this.Root);
    }
    close() {
        super.close();
    }
    scrollToUnit(id) {
        if (ComponentID.isInvalid(id)) return;
        const localId = JSON.stringify(id.id);
        const entry = this.Root.querySelector(`[data-unit-local-id="${localId}"]`);
        console.warn(`TRIX SCROLL ${localId} ${entry?.tagName}`);
        if (!entry) return;
        this.scrollable.component.scrollIntoView(entry);
    }
    activateUnit(event) {
        if (event.target instanceof HTMLElement) {
            const data = event.target.getAttribute("data-unit-local-id");
            if (!data) return;
            if (Input.getActiveDeviceType() == InputDeviceType.Controller) {
                // controller: close panel before selecting unit
                bzPanelMiniMap.instance.togglePanel();
            }
            const localId = JSON.parse(data);
            if (localId) bzUnitList.selectUnit(localId);
        }
    }
    onUnitSelection(event) {
        const id = event?.unit;
        if (ComponentID.isInvalid(id)) return;
        if (!event.selected) return;
        this.scrollToUnit(id);
    }
}
Controls.define("bz-units-panel", {
    createInstance: bzUnitsPanel,
    description: "Units Panel",
    classNames: ["bz-units-panel"],
    styles: [styles],
    tabIndex: -1
});

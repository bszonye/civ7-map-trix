import { F as Focus } from '/core/ui/input/focus-support.chunk.js';
import { b as InputEngineEventName } from '../../../core/ui/input/input-support.chunk.js';
import { A as AnchorType } from '/core/ui/panel-support.chunk.js';
import { D as Databind } from '/core/ui/utilities/utilities-core-databinding.chunk.js';
import { C as ComponentID } from '/core/ui/utilities/utilities-component-id.chunk.js';
import { ScrollIntoViewEvent } from '/core/ui/components/index.js';
import { MinimapSubpanel } from '/base-standard/ui/mini-map/panel-mini-map.js';
import { bzUnitList } from '/bz-map-trix/ui/bz-units-panel/model-units.js';

const styles = "fs://game/bz-map-trix/ui/bz-units-panel/panel-units.css";

Controls.preloadImage("blp:hud_sub_circle_bk", "units-panel");
Controls.preloadImage("blp:hud_sub_circle_hov", "units-panel");

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
    activateTypeListener = this.activateType.bind(this);
    activateUnitListener = this.activateUnit.bind(this);
    modelUpdateListener = this.onModelUpdate.bind(this);
    typesContainer = document.createElement("div");
    unitsContainer = document.createElement("fxs-scrollable");
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
        // header
        const header = document.createElement("fxs-header");
        header.classList.add("mb-2", "font-title-base", "text-secondary");
        header.setAttribute("title", "LOC_UI_PRODUCTION_UNITS");
        header.setAttribute("filigree-style", "h4");
        this.panel.appendChild(header);
        // type buttons
        this.typesContainer.classList.value =
            "bz-unit-types flex justify-center items-center w-full";
        this.panel.appendChild(this.typesContainer);
        const button = document.createElement("div");
        button.classList.value = "bz-type-button-bg bz-icon size-8 relative";
        this.typesContainer.appendChild(button);
        Databind.for(button, "g_bzUnitListModel.typeList", "button");
        {
            const face = document.createElement("fxs-activatable");
            face.classList.value = "bz-type-button bz-icon size-8 absolute";
            face.addEventListener("action-activate", this.activateTypeListener);
            Databind.attribute(face, "data-unit-local-id", "button.localId");
            Databind.tooltip(face, "button.typeName");
            button.appendChild(face);
            const icon = document.createElement("div");
            icon.classList.value = "bz-type-icon bz-icon size-8 absolute";
            Databind.bgImg(icon, "button.icon");
            button.appendChild(icon);
        }
        // units list
        const frame = document.createElement("div");
        frame.classList.value = "bz-units-frame p-1";
        this.panel.appendChild(frame);
        this.unitsContainer.classList.value = "bz-units-scrollable";
        frame.appendChild(this.unitsContainer);
        const row = document.createElement("div");
        this.unitsContainer.appendChild(row);
        Databind.for(row, "g_bzUnitListModel.unitList", "entry");
        {
            const entry = document.createElement("fxs-activatable");
            entry.addEventListener("action-activate", this.activateUnitListener);
            entry.classList.value = "bz-units-entry flex items-center text-xs";
            entry.setAttribute("tabindex", "-1");
            Databind.attribute(entry, "data-unit-local-id", "entry.localId");
            row.appendChild(entry);
            // selected
            Databind.classToggle(entry, "bz-units-entry-selected",
                "{{entry.localId}}=={{g_bzUnitListModel.selectedUnit.localId}}");
            // indentation
            Databind.classToggle(entry, "bz-unit-packed", "{{entry.isPacked}}");
            // title
            const title = document.createElement("div");
            title.classList.value = "bz-unit-title flex justify-start items-center";
            entry.appendChild(title);
            // promotion
            const promotion = document.createElement("div");
            promotion.classList.value = "bz-unit-promotion relative size-6";
            Databind.classToggle(entry, "bz-can-promote", "{{entry.canPromote}}");
            Databind.classToggle(entry, "bz-can-upgrade", "{{entry.canUpgrade}}");
            const promotionBG = document.createElement("div");
            promotionBG.classList.value = "bz-unit-promotion-bg bz-icon absolute";
            promotion.appendChild(promotionBG);
            const promotionIcon = document.createElement("div");
            promotionIcon.classList.value =
                "bz-unit-promotion-icon bz-icon absolute size-6";
            promotion.appendChild(promotionIcon);
            title.appendChild(promotion);
            // icon
            const icon = document.createElement("div");
            icon.classList.value = "bz-unit-icon bz-icon size-6";
            Databind.bgImg(icon, "entry.icon");
            title.appendChild(icon);
            // name
            const name = document.createElement("div");
            name.classList.value = "bz-unit-name ml-1";
            Databind.loc(name, "{{entry.name}}");
            title.appendChild(name);
            // health
            const health = document.createElement("div");
            health.classList.value =
                "bz-unit-health flex justify-end items-center w-12 mx-1";
            Databind.classToggle(entry, "bz-unit-damaged", "{{entry.hasDamage}}");
            Databind.classToggle(health, "hidden", "!{{entry.hasDamage}}");
            const healthIcon = document.createElement("img");
            healthIcon.classList.value = "bz-icon size-5 -ml-0\\.5 mr-0\\.5";
            healthIcon.setAttribute("src", "blp:prod_generic");
            health.appendChild(healthIcon);
            const healthText = document.createElement("div");
            Databind.loc(healthText, "{{entry.healthLeft}}");
            health.appendChild(healthText);
            entry.appendChild(health);
            // movement
            const movement = document.createElement("div");
            movement.classList.value =
                "bz-unit-movement flex justify-center items-center w-14 mx-1";
            const moveIcon = document.createElement("img");
            moveIcon.classList.value = "bz-icon size-5 -ml-1 mr-1";
            Databind.classToggle(moveIcon, "hidden", "5<{{entry.slashMoves.size}}");
            moveIcon.setAttribute("src", "blp:Action_Move");
            movement.appendChild(moveIcon);
            const moveText = document.createElement("div");
            Databind.loc(moveText, "{{entry.slashMoves}}");
            movement.appendChild(moveText);
            Databind.classToggle(entry, "bz-cannot-move", "!{{entry.canMove}}");
            entry.appendChild(movement);
            // status (activity + garrison)
            const state = document.createElement("div");
            state.classList.value = "bz-unit-status relative size-6";
            const garrison = document.createElement("div");
            garrison.classList.value = "bz-unit-garrison-bg bz-icon absolute";
            Databind.classToggle(garrison, "hidden", "!{{entry.isGarrison}}");
            state.appendChild(garrison);
            const activity = document.createElement("div");
            activity.classList.value = "bz-unit-activity bz-icon absolute size-6";
            Databind.bgImg(activity, "entry.activityIcon");
            state.appendChild(activity);
            const district = document.createElement("div");
            district.classList.value = "bz-unit-district bz-icon absolute size-6";
            district.style.backgroundSize = "85%";
            Databind.classToggle(district, "hidden", "{{entry.isBusy}}");
            Databind.bgImg(district, "entry.districtIcon");
            state.appendChild(district);
            entry.appendChild(state);
        }
        // finish
        this.Root.appendChild(this.panel);
    }
    onAttach() {
        super.onAttach();
        window.addEventListener("bz-model-units-update", this.modelUpdateListener);
        // scroll to the selected unit
        const selected = UI.Player.getHeadSelectedUnit();
        if (selected) this.scrollToUnit(selected, 100);
    }
    onDetach() {
        super.onDetach();
        window.removeEventListener("bz-model-units-update", this.modelUpdateListener);
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        Focus.setContextAwareFocus(this.panel, this.Root);
    }
    close() {
        super.close();
    }
    getUnitEntry(id) {
        if (ComponentID.isInvalid(id)) return void 0;
        const localId = JSON.stringify(id.id);
        return this.unitsContainer.querySelector(`[data-unit-local-id="${localId}"]`);
    }
    scrollUnitToTop(id) {
        const target = this.getUnitEntry(id);
        if (!target) return;
        const c = this.unitsContainer.component;
        const areaRect = this.unitsContainer.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        if (c.scrollableContentSize === 0) {
            c.resizeScrollThumb();
        }
        const distToMove = targetRect.top - areaRect.top;
        const anchorAsPercent = distToMove / c.scrollableContentSize;
        const newPosition = c.scrollPosition + anchorAsPercent;
        const maxPosition = 1 - (areaRect.height / c.scrollableContentSize);
        c.scrollToPercentage(Math.min(newPosition, maxPosition));
        target.dispatchEvent(new ScrollIntoViewEvent());
    }
    scrollToUnit(id, interval=0, repeat=5) {
        const entry = this.getUnitEntry(id);
        if (!entry) return;
        this.unitsContainer.component.scrollIntoView(entry);
        if (interval) {
            const handle = setInterval(() =>
                this.unitsContainer.component.scrollIntoView(entry),
                interval
            );
            setTimeout(() => clearInterval(handle), interval * (repeat + 1));
        }
    }
    activateType(event) {
        if (event.target instanceof HTMLElement) {
            const data = event.target.getAttribute("data-unit-local-id");
            if (!data) return;
            const localId = JSON.parse(data);
            const unit = bzUnitList.units.get(localId);
            this.scrollUnitToTop(unit.id);
        }
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
    onModelUpdate() {
        const selected = UI.Player.getHeadSelectedUnit();
        if (selected) this.scrollToUnit(selected, 50);
    }
}
Controls.define("bz-units-panel", {
    createInstance: bzUnitsPanel,
    description: "Units Panel",
    classNames: ["bz-units-panel"],
    styles: [styles],
    tabIndex: -1
});

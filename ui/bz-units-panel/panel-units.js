import { F as Focus } from '/core/ui/input/focus-support.chunk.js';
import { A as AnchorType } from '/core/ui/panel-support.chunk.js';
import { D as Databind } from '/core/ui/utilities/utilities-core-databinding.chunk.js';
import { MinimapSubpanel } from '/base-standard/ui/mini-map/panel-mini-map.js';
import { bzUnitsList } from '/bz-map-trix/ui/bz-units-panel/model-units.js';

const styles = "fs://game/bz-map-trix/ui/bz-units-panel/panel-units.css";

class bzPanelMiniMap {
    static c_prototype;
    unitsSubpanel = null;
    onHotkeyListener = this.onHotkey.bind(this);
    constructor(component) {
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
        window.addEventListener("hotkey-open-bz-units-panel", this.onHotkeyListener);
    }
    beforeDetach() {
        window.removeEventListener("hotkey-open-bz-units-panel", this.onHotkeyListener);
    }
    afterDetach() { }
    onHotkey(_event) {
        this.component.toggleSubpanel(this.unitsSubpanel);
    }
}
Controls.decorate("panel-mini-map", (val) => new bzPanelMiniMap(val));

class bzUnitsPanel extends MinimapSubpanel {
    panel = document.createElement("fxs-vslot");
    inputContext = InputContext.World;
    activateUnitListener = this.activateUnit.bind(this);
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
        const scrollable = document.createElement("fxs-scrollable");
        scrollable.classList.value = "bz-units-scrollable p-1";
        this.panel.appendChild(scrollable);
        const list = document.createElement("fxs-vslot");
        scrollable.appendChild(list);
        list.classList.value = "font-body-xs";
        Databind.for(list, "g_bzUnitsListModel.units", "entry");
        {
            const entry = document.createElement("fxs-activatable");
            entry.classList.value = "bz-units-entry flex items-center";
            entry.addEventListener("action-activate", this.activateUnitListener);
            Databind.attribute(entry, "data-unit-local-id", "entry.localId");
            // selected
            Databind.classToggle(entry, "bz-units-entry-selected",
                "{{entry.localId}}=={{g_bzUnitsListModel.selectedUnit.localId}}");
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
            health.classList.value = "flex justify-center items-center w-14";
            Databind.classToggle(health, "invisible", "!{{entry.hasDamage}}");
            const healthIcon = document.createElement("img");
            healthIcon.classList.value = "size-5 -ml-1\\.5";
            healthIcon.setAttribute("src", "blp:prod_generic");
            health.appendChild(healthIcon);
            const healthText = document.createElement("div");
            healthText.classList.value = "ml-1";
            healthText.setAttribute("data-bind-attr-data-l10n-id", "{{entry.healthLeft}}");
            health.appendChild(healthText);
            entry.appendChild(health);
            // movement
            const movement = document.createElement("div");
            movement.classList.value =
                "bz-unit-movement flex justify-end items-center w-14 mr-1";
            const moveIcon = document.createElement("img");
            moveIcon.classList.value = "size-5 mr-1";
            Databind.classToggle(moveIcon, "hidden", "9<{{entry.maxMoves}}");
            moveIcon.setAttribute("src", "blp:Action_Move");
            movement.appendChild(moveIcon);
            const moveText = document.createElement("div");
            // moveText.classList.value = "ml-1";
            moveText.setAttribute("data-bind-attr-data-l10n-id", "{{entry.slashMoves}}");
            movement.appendChild(moveText);
            Databind.classToggle(entry, "bz-cannot-move", "!{{entry.canMove}}");
            entry.appendChild(movement);
            // activity
            const activity = document.createElement("div");
            activity.classList.value =
                "bz-unit-activity size-6 bg-contain mx-1 rounded-xl";
            Databind.classToggle(activity, "bg-secondary-3", "{{entry.isGarrison}}");
            Databind.bgImg(activity, "entry.activityIcon");
            entry.appendChild(activity);
            // finish
            list.appendChild(entry);
        }
        // finish
        this.Root.appendChild(this.panel);
    }
    onAttach() {
        super.onAttach();
    }
    onDetach() {
        super.onDetach();
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        Focus.setContextAwareFocus(this.lensPanel, this.Root);
    }
    close() {
        super.close();
    }
    activateUnit(event) {
        if (event.target instanceof HTMLElement) {
            const data = event.target.getAttribute("data-unit-local-id");
            if (!data) return;
            const localId = JSON.parse(data);
            if (localId) bzUnitsList.selectUnit(localId);
        }
    }
}
Controls.define("bz-units-panel", {
    createInstance: bzUnitsPanel,
    description: "Units Panel",
    classNames: ["bz-units-panel"],
    styles: [styles],
    tabIndex: -1
});

import { A as Audio } from '/core/ui/audio-base/audio-support.chunk.js';
import { F as Focus } from '/core/ui/input/focus-support.chunk.js';
import { A as AnchorType } from '/core/ui/panel-support.chunk.js';
import { D as Databind } from '/core/ui/utilities/utilities-core-databinding.chunk.js';
import { C as ComponentID } from '/core/ui/utilities/utilities-component-id.chunk.js';
import { U as UpdateGate } from '/core/ui/utilities/utilities-update-gate.chunk.js';
import { MinimapSubpanel } from '/base-standard/ui/mini-map/panel-mini-map.js';
import { bzPanelMiniMap } from '/bz-map-trix/ui/mini-map/bz-panel-mini-map.js';
import { bzUnitList } from '/bz-map-trix/ui/bz-units-panel/model-units.js';

const styles = "fs://game/bz-map-trix/ui/bz-units-panel/panel-units.css";

class bzUnitsPanel extends MinimapSubpanel {
    static savedScrollPosition = 0;
    panel = document.createElement("fxs-vslot");
    inputContext = InputContext.Unit;
    activateTypeListener = this.activateType.bind(this);
    activateUnitListener = this.activateUnit.bind(this);
    modelUpdateListener = this.onModelUpdate.bind(this);
    typesContainer = document.createElement("div");
    unitsContainer = document.createElement("fxs-scrollable");
    scrollPosition = 0;
    scrollUnit = null;
    updateScroll = new UpdateGate(() =>
        this.scrollToPosition(this.scrollPosition, this.scrollUnit));
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
            entry.classList.value =
                "bz-units-entry flex justify-between items-center text-xs";
            entry.setAttribute("tabindex", "-1");
            Databind.attribute(entry, "data-unit-local-id", "entry.localId");
            row.appendChild(entry);
            // selected
            Databind.classToggle(entry, "bz-units-entry-selected",
                "{{entry.localId}}=={{g_bzUnitListModel.selectedUnit.localId}}");
            // indentation
            Databind.classToggle(entry, "bz-unit-packed", "{{entry.isPacked}}");
            // title section (left side)
            const title = document.createElement("div");
            title.classList.value =
                "bz-unit-title flex shrink justify-start items-center";
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
            name.classList.value = "bz-unit-name shrink font-fit-shrink ml-1";
            Databind.loc(name, "{{entry.name}}");
            title.appendChild(name);
            // status section (right side)
            const status = document.createElement("div");
            status.classList.value =
                "bz-unit-status flex flex-none justify-end items-center mx-1";
            entry.appendChild(status);
            // health
            const health = document.createElement("div");
            health.classList.value = "bz-unit-health flex items-center mr-3";
            Databind.classToggle(entry, "bz-unit-damaged", "{{entry.hasDamage}}");
            Databind.classToggle(health, "hidden", "!{{entry.hasDamage}}");
            const healthIcon = document.createElement("img");
            healthIcon.classList.value = "bz-icon size-5 -ml-0\\.5 mr-0\\.5";
            healthIcon.setAttribute("src", "blp:prod_generic");
            health.appendChild(healthIcon);
            const healthText = document.createElement("div");
            Databind.loc(healthText, "{{entry.healthLeft}}");
            health.appendChild(healthText);
            status.appendChild(health);
            // movement
            const movement = document.createElement("div");
            movement.classList.value = "bz-unit-movement flex items-center mr-2";
            const moveIcon = document.createElement("img");
            moveIcon.classList.value = "bz-icon size-5 -ml-0\\.5 mr-0\\.5";
            moveIcon.setAttribute("src", "blp:Action_Move");
            movement.appendChild(moveIcon);
            const moveText = document.createElement("div");
            Databind.loc(moveText, "{{entry.slashMoves}}");
            movement.appendChild(moveText);
            Databind.classToggle(entry, "bz-cannot-move", "!{{entry.canMove}}");
            status.appendChild(movement);
            // activity (operations/garrison)
            const activity = document.createElement("div");
            activity.classList.value = "bz-unit-status relative size-6";
            const garrison = document.createElement("div");
            garrison.classList.value = "bz-unit-garrison-bg bz-icon absolute";
            Databind.classToggle(garrison, "hidden", "!{{entry.isGarrison}}");
            activity.appendChild(garrison);
            const operation = document.createElement("div");
            operation.classList.value = "bz-unit-operation bz-icon absolute size-6";
            Databind.bgImg(operation, "entry.operationIcon");
            activity.appendChild(operation);
            const district = document.createElement("div");
            district.classList.value = "bz-unit-district bz-icon absolute size-6";
            district.style.backgroundSize = "85%";
            Databind.classToggle(district, "hidden", "{{entry.isBusy}}");
            Databind.bgImg(district, "entry.districtIcon");
            activity.appendChild(district);
            status.appendChild(activity);
        }
        // finish
        this.Root.appendChild(this.panel);
    }
    onAttach() {
        super.onAttach();
        window.addEventListener("bz-model-units-update", this.modelUpdateListener);
        // scroll to the selected unit or the last position
        this.scrollPosition = bzUnitsPanel.savedScrollPosition;
        this.scrollUnit = UI.Player.getHeadSelectedUnit();
        if (this.scrollPosition || this.scrollUnit) {
            this.updateScroll.call("onAttach");
        }
        bzPanelMiniMap.toggleCooldownTimer = 250;
    }
    onDetach() {
        super.onDetach();
        window.removeEventListener("bz-model-units-update", this.modelUpdateListener);
        bzUnitsPanel.savedScrollPosition = this.unitsContainer.component.scrollPosition;
        bzPanelMiniMap.toggleCooldownTimer = 500;
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        Focus.setContextAwareFocus(this.panel, this.Root);
    }
    close() {
        super.close();
    }
    getUnitEntry(id) {
        if (!id || ComponentID.isInvalid(id)) return void 0;
        const localId = JSON.stringify(id.id);
        return this.unitsContainer.querySelector(`[data-unit-local-id="${localId}"]`);
    }
    scrollToPosition(position, unitId) {
        let audio = position == -1;
        const scroll = (position, id) => {
            // get unit location (if requested)
            const unit = this.getUnitEntry(id);
            if (id && !unit) return false;
            // get scroll area metrics
            const c = this.unitsContainer.component;
            const curPosition = c.scrollPosition;
            const size = c.scrollableContentSize;
            const area = this.unitsContainer.getBoundingClientRect();
            if (!area?.height || !size) return false;
            const height = area.height / size;
            // find new position
            if (position == null) position = curPosition;
            if (unit) {
                const target = unit?.getBoundingClientRect();
                const topPos = (target.top - area.top) / size + curPosition;
                const botPos = (target.bottom - area.bottom) / size + curPosition;
                if (position == -1) {
                    position = topPos;  // always scroll to top
                } else if (position != 0 && curPosition == 0 && botPos <= 0) {
                    position = 0;  // ignore saved position if already in view at top
                } else if (topPos < position) {
                    position = topPos;
                } else if (position < botPos) {
                    position = botPos;
                }
            }
            // avoid scrolling past end
            const maxPosition = 1 - height;
            const newPosition = Math.min(position, maxPosition);
            // play audio
            if (audio) {
                const sound = newPosition == curPosition ?
                    "data-audio-city-details-exit" :
                    "data-audio-city-details-enter";
                Audio.playSound(sound, "city-actions");
                audio = false;  // only once
            }
            if (newPosition == curPosition) return true;
            this.unitsContainer.component.scrollToPercentage(newPosition);
        }
        if (scroll(position, unitId)) return;
        // repeated attempts: every interval for several attempts
        const handle = setInterval(() => {
            const done = scroll(position, unitId)
            if (done) clearInterval(handle);
        }, 50)
        setTimeout(() => clearInterval(handle), 400);
    }
    activateType(event) {
        if (event.target instanceof HTMLElement) {
            const data = event.target.getAttribute("data-unit-local-id");
            if (!data) return;
            const localId = JSON.parse(data);
            const unit = bzUnitList.units.get(localId);
            this.scrollPosition = -1;
            this.scrollUnit = unit.id;
            this.updateScroll.call("activateType");
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
        this.scrollPosition = void 0;
        this.scrollUnit = UI.Player.getHeadSelectedUnit();
        this.updateScroll.call("onModelUpdate");
    }
}
Controls.define("bz-units-panel", {
    createInstance: bzUnitsPanel,
    description: "Units Panel",
    classNames: ["bz-units-panel"],
    styles: [styles],
    tabIndex: -1
});

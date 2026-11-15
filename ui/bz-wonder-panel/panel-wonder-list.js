import { IsControllerActive } from '/core/ui-next/services/input.js';
import { Focus } from '/core/ui/input/focus-support.js';
import { AnchorType } from '/core/ui/panel-support.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import { MinimapSubpanel, SubpanelCloseEventName } from '/base-standard/ui/mini-map/minimap-support.js';
import { NarrativePopupManager } from '/base-standard/ui/narrative-event/narrative-popup-manager.js';
// production tooltip support
import { ProductionTooltip } from '/base-standard/ui-next/tooltips/production-tooltip.js';
import { render } from '/core/vendor/solid-js/web/dist/web.js';
import { TooltipVerticalPosition, TooltipHorizontalPosition } from '/core/ui-next/components/tooltip.js';
// mod imports
import { bzPanelMiniMap } from '/bz-map-trix/ui/mini-map/bz-panel-mini-map.js';
import { bzWonderList } from '/bz-map-trix/ui/bz-wonder-panel/model-wonder-list.js';

const styles = "fs://game/bz-map-trix/ui/bz-wonder-panel/panel-wonder-list.css";

class bzWonderListPanel extends MinimapSubpanel {
    static savedScrollPosition = 0;
    panel = document.createElement("fxs-vslot");
    inputContext = () => {
      console.log("Input context requested");
      return IsControllerActive() ? InputContext.Shell : InputContext.World;
    };
    activateWonderListener = this.activateWonder.bind(this);
    modelUpdateListener = this.onModelUpdate.bind(this);
    subpanelCloseListener = this.onSubpanelClose.bind(this);
    listContainer = document.createElement("fxs-scrollable");
    scrollArea = document.createElement("div");
    constructor(root) {
        super(root);
        this.animateInType = this.animateOutType = AnchorType.Fade;
        this.animateOutType = this.animateOutType = AnchorType.Fade;
    }
    onInitialize() {
        super.onInitialize();
        this.Root.style.height = bzPanelMiniMap.instance.panelHeightPx;
        this.panel.setAttribute("data-navrule-up", "stop");
        this.panel.setAttribute("data-navrule-down", "stop");
        this.panel.setAttribute("data-navrule-right", "stop");
        this.panel.setAttribute("data-navrule-left", "stop");
        this.panel.className = "mini-map__lens-panel bz-wonder-list-panel grow pointer-events-auto px-2 py-3 flex flex-col justify-start items-center";
        NarrativePopupManager.addIgnoredPanelClass("bz-wonder-panel");
        const closeNavHelp = document.createElement("fxs-nav-help");
        closeNavHelp.setAttribute("action-key", "inline-cancel");
        closeNavHelp.classList.add("absolute", "-right-4", "-top-3", "z-1");
        Databind.classToggle(closeNavHelp, "hidden", "!{{g_NavTray.isTrayRequired}}");
        this.panel.appendChild(closeNavHelp);
        // header
        const header = document.createElement("fxs-header");
        header.setAttribute("title", "LOC_UI_TOGGLE_BZ_WONDER_LIST_PANEL");
        header.setAttribute("filigree-style", "h4");
        this.panel.appendChild(header);
        // wonder list
        const frame = document.createElement("div");
        frame.classList.value = "bz-wonder-list-frame p-1";
        this.panel.appendChild(frame);
        this.listContainer.classList.value = "bz-wonder-list-scrollable";
        frame.appendChild(this.listContainer);
        this.scrollArea.classList.value = "bz-wonder-list-scroll-area flex-col w-full";
        this.listContainer.appendChild(this.scrollArea);
    }
    update() {
        this.scrollArea.innerHTML = "";
        this.renderList(
            "LOC_PLOT_TOOLTIP_IN_PROGRESS",
            bzWonderList.wonderList.inProgress,
        );
        this.renderList(
            "LOC_POLICIES_AVAILABLE_POLICIES",
            bzWonderList.wonderList.available,
        );
        this.renderList(
            "LOC_LEGACIES_COMPLETE",
            bzWonderList.wonderList.complete,
        );
        this.renderList(
            "LOC_TRIUMPH_NOT_AVAILABLE",
            bzWonderList.wonderList.skipped,
        );
        this.scrollArea.firstChild?.classList.replace("mt-2", "mt-px");
    }
    renderList(headline, list) {
        if (!list.length) return;
        const header = document.createElement("fxs-header");
        header.classList.add("mt-2");
        header.setAttribute("text-class", "font-title-sm bz-header");
        header.setAttribute("filigree-style", "none");
        header.setAttribute("title", headline);
        header.classList.toggle("hidden", list.length == 0);
        this.scrollArea.appendChild(header);
        // table rows
        for (const item of list) {
            const row = document.createElement("div");
            row.classList.value = "flex flex-col text-sm";
            this.scrollArea.appendChild(row);
            const subhead = document.createElement("fxs-header");
            subhead.setAttribute("title", item.subhead);
            subhead.setAttribute("text-class", "font-title-xs bz-subhead");
            subhead.setAttribute("filigree-style", "none");
            subhead.classList.toggle("hidden", !item.subhead);
            row.appendChild(subhead);
            const entry = document.createElement("fxs-activatable");
            entry.addEventListener("action-activate", this.activateWonderListener);
            entry.classList.value =
                "bz-wonder-list-entry flex justify-between items-center";
            entry.setAttribute("tabindex", "-1");
            if (item.location) {
                entry.setAttribute("data-wonder-location", JSON.stringify(item.location));
            }
            entry.classList.toggle("text-accent-4", item.isRevealed === false);
            // tooltip
            row.appendChild(entry);
            // wonder description section (left side)
            const wonder = document.createElement("div");
            wonder.classList.value =
                "bz-wonder-list-title flex flex-auto justify-start items-center py-px";
            // entry.appendChild(wonder);
            this.addProductionTooltip(entry, wonder, item);
            // icon
            const icon = document.createElement("div");
            icon.classList.value = "bz-wonder-list-icon bz-icon relative size-6 mx-1";
            icon.classList.toggle("invisible", item.isRacing === true);
            const typeIcon = document.createElement("img");
            typeIcon.classList.value = "absolute size-full";
            typeIcon.src = item.icon;
            icon.appendChild(typeIcon);
            wonder.appendChild(icon);
            // name
            const name = document.createElement("div");
            name.classList.value =
                "bz-wonder-list-name flex-auto font-fit-shrink truncate mx-1";
            name.classList.toggle("invisible", item.isRacing === true);
            name.setAttribute("data-l10n-id", item.name);
            wonder.appendChild(name);
            // build turns
            if (item.buildTurns) {
                const timer = document.createElement("div");
                timer.classList.value =
                    "bz-wonder-build-turns flex items-center justify-center pl-1\\.5 mx-0\\.5";
                const timerTurns = document.createElement("div");
                timerTurns.classList.value = "text-right";
                timerTurns.style.minWidth = "calc(1.2em)";  // two digits
                timerTurns.textContent = item.buildTurns;
                timer.appendChild(timerTurns);
                const timerClock = document.createElement("img");
                timerClock.classList.value = "bz-icon size-6";
                timerClock.src = "blp:hud_turn-timer";
                timer.appendChild(timerClock);
                wonder.appendChild(timer);
            }
            // owner
            if (item.owner != null) {
                const owner = document.createElement("div");
                owner.classList.value =
                    "bz-wonder-owner flex-col justify-center size-6 mx-1 rounded-full";
                owner.style.backgroundColor = item.bgColor;
                owner.setAttribute("data-tooltip-content", item.ownerTooltip);
                entry.appendChild(owner);
                const icon = document.createElement("div");
                icon.classList.value = "bz-icon flex-auto size-6";
                icon.style.backgroundImage = `url(${item.civIcon})`;
                icon.style.filter = `fxs-color-tint(${item.fgColor})`;
                owner.appendChild(icon);
            }
        }
        // finish
        this.Root.appendChild(this.panel);
    }
    onAttach() {
        super.onAttach();
        window.addEventListener(SubpanelCloseEventName, this.subpanelCloseListener);
        window.addEventListener("bz-model-wonder-list-update", this.modelUpdateListener);
        bzPanelMiniMap.toggleCooldownTimer = 250;
        this.disposeTooltips.forEach((dispose) => dispose());
        this.disposeTooltips = [];
        this.update();
    }
    onDetach() {
        super.onDetach();
        window.removeEventListener(SubpanelCloseEventName, this.subpanelCloseListener);
        window.removeEventListener("bz-model-wonder-list-update", this.modelUpdateListener);
        bzPanelMiniMap.toggleCooldownTimer = 500;
        this.disposeTooltips.forEach((dispose) => dispose());
        this.disposeTooltips = [];
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        Focus.setContextAwareFocus(this.panel, this.Root);
    }
    onSubpanelClose(event) {
        if (event.detail.tag == "bz-wonder-panel") this.close();
    }
    close() {
        super.close();
    }
    activateWonder(event) {
        if (event.target instanceof HTMLElement) {
            const data = event.target.getAttribute("data-wonder-location");
            if (!data) return;
            const location = JSON.parse(data);
            Camera.lookAtPlot(location);
        }
    }
    disposeTooltips = [];
    addProductionTooltip(parent, child, data) {
      const dispose = render(
        () => ProductionTooltip({
          children: child,
          name: data.name,
          type: data.type,
          initialHPosition: TooltipHorizontalPosition.RIGHT,
          initialVPosition: TooltipVerticalPosition.AUTO
        }),
        parent
      );
      this.disposeTooltips.push(dispose);
      return dispose;
    }
    onModelUpdate() {
        this.update();
    }
}
Controls.define("bz-wonder-panel", {
    createInstance: bzWonderListPanel,
    description: "Wonder Panel",
    classNames: ["bz-wonder-panel", "relative"],
    styles: [styles],
    tabIndex: -1
});

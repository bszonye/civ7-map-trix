import { Focus } from '/core/ui/input/focus-support.js';
import { AnchorType } from '/core/ui/panel-support.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import { MinimapSubpanel } from '/base-standard/ui/mini-map/panel-mini-map.js';
// production tooltip support
import { ProductionTooltip } from '/base-standard/ui-next/tooltips/production-tooltip.js';
import { render } from '/core/vendor/solid-js/web/dist/web.js';
import { TooltipVerticalPosition, TooltipHorizontalPosition } from '/core/ui-next/components/tooltip.js';
// mod imports
import { bzPanelMiniMap } from '/bz-map-trix/ui/mini-map/bz-panel-mini-map.js';
import { bzWonderList } from '/bz-map-trix/ui/bz-wonder-panel/model-wonder-list.js';

const styles = "fs://game/bz-map-trix/ui/bz-wonder-panel/panel-wonder-list.css";

class bzWonderPanel extends MinimapSubpanel {
    static savedScrollPosition = 0;
    panel = document.createElement("fxs-vslot");
    inputContext = InputContext.World;
    activateWonderListener = this.activateWonder.bind(this);
    modelUpdateListener = this.onModelUpdate.bind(this);
    listContainer = document.createElement("fxs-scrollable");
    scrollArea = document.createElement("div");
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
        this.panel.classList.add("mini-map__wonder-panel", "left-3", "px-2", "py-3");
        const closeNavHelp = document.createElement("fxs-nav-help");
        closeNavHelp.setAttribute("action-key", "inline-cancel");
        closeNavHelp.classList.add("absolute", "-right-4", "-top-3", "z-1");
        Databind.classToggle(closeNavHelp, "hidden", "!{{g_NavTray.isTrayRequired}}");
        this.panel.appendChild(closeNavHelp);
        // header
        const header = document.createElement("fxs-header");
        header.classList.add("mb-2", "font-title-base", "text-secondary");
        header.setAttribute("title", "LOC_UI_PRODUCTION_WONDERS");
        header.setAttribute("filigree-style", "h4");
        header.setAttribute("header-bg-glow", true);
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
            "LOC_POLICIES_AVAILABLE_POLICIES",
            bzWonderList.wonderList.available,
        );
        this.renderList(
            "LOC_PLOT_TOOLTIP_IN_PROGRESS",
            bzWonderList.wonderList.inProgress,
        );
        this.renderList(
            "LOC_LEGACIES_COMPLETE",
            bzWonderList.wonderList.complete,
        );
        this.renderList(
            "LOC_TRIUMPH_NOT_AVAILABLE",
            bzWonderList.wonderList.skipped,
        );
        this.scrollArea.firstChild?.classList.replace("mt-2", "mt-0\\.5");
    }
    renderList(headline, list) {
        const header = document.createElement("fxs-header");
        header.classList.add("font-title-sm", "mt-2");
        header.setAttribute("title", headline);
        header.setAttribute("filigree-style", "h4");
        header.classList.toggle("hidden", list.length == 0);
        this.scrollArea.appendChild(header);
        // table rows
        for (const item of list) {
            const row = document.createElement("div");
            row.classList.value = "flex flex-col text.sm";
            this.scrollArea.appendChild(row);
            const subhead = document.createElement("fxs-header");
            subhead.setAttribute("filigree-style", "none");
            subhead.setAttribute("header-bg-glow", true);
            // match height of entry row (6px above, 3px below)
            subhead.classList.add("font-title-xs", "py-px", "mt-1\\.25", "mb-0\\.5");
            subhead.classList.toggle("hidden", !item.subhead);
            subhead.setAttribute("title", item.subhead);
            row.appendChild(subhead);
            const entry = document.createElement("fxs-activatable");
            entry.addEventListener("action-activate", this.activateWonderListener);
            entry.classList.value =
                "bz-wonder-list-entry flex justify-between items-center py-px";
            entry.setAttribute("tabindex", "-1");
            if (item.location) {
                entry.setAttribute("data-wonder-location", JSON.stringify(item.location));
            }
            entry.classList.toggle("text-accent-4", item.isRevealed === false);
            // title section (left side)
            const title = document.createElement("div");
            title.classList.value =
                "bz-wonder-list-title flex shrink justify-start items-center";
            title.classList.toggle("invisible", item.isRacing === true);
            entry.appendChild(title);
            // icon
            const icon = document.createElement("div");
            icon.classList.value = "bz-wonder-list-icon bz-icon relative size-6 mx-1";
            const typeIcon = document.createElement("img");
            typeIcon.classList.value = "absolute size-full";
            typeIcon.src = item.icon;
            icon.appendChild(typeIcon);
            title.appendChild(icon);
            // name
            const name = document.createElement("div");
            name.classList.value =
                "bz-wonder-list-name shrink font-fit-shrink truncate mx-1";
            name.setAttribute("data-l10n-id", item.name);
            title.appendChild(name);
            // tooltip
            this.addProductionTooltip(row, entry, item);
            // stats section (right side)
            const stats = document.createElement("div");
            stats.classList.value =
                "bz-wonder-list-stats flex flex-none justify-end items-center";
            entry.appendChild(stats);
            // build turns
            if (item.buildTurns) {
                const column = document.createElement("div");
                column.classList.value = "text-center mx-0\\.5";
                column.style.minWidth = "calc(1.2em + 1.6666666667rem)";  // two digits
                stats.appendChild(column);
                const timer = document.createElement("div");
                timer.classList.value =
                    "bz-wonder-build-turns flex items-center justify-center pl-1\\.5";
                const timerTurns = document.createElement("div");
                timerTurns.classList.value = "text-right";
                timerTurns.style.minWidth = "calc(1.2em)";  // two digits
                timerTurns.textContent = item.buildTurns;
                timer.appendChild(timerTurns);
                const timerClock = document.createElement("img");
                timerClock.classList.value = "bz-icon size-6";
                timerClock.src = "blp:hud_turn-timer";
                timer.appendChild(timerClock);
                column.appendChild(timer);
            }
            // owner
            if (item.owner != null) {
                const background = document.createElement("div");
                background.classList.value = "bz-icon relative size-6 mx-1 rounded-full";
                background.style.backgroundColor = item.bgColor;
                stats.appendChild(background);
                const icon = document.createElement("img");
                icon.classList.value = "bz-icon absolute size-6";
                icon.src = item.civIcon;
                icon.style.filter = `fxs-color-tint(${item.fgColor})`;
                background.appendChild(icon);
            }
        }
        // finish
        this.Root.appendChild(this.panel);
    }
    onAttach() {
        super.onAttach();
        window.addEventListener("bz-model-wonder-list-update", this.modelUpdateListener);
        bzPanelMiniMap.toggleCooldownTimer = 250;
        this.disposeTooltips.forEach((dispose) => dispose());
        this.disposeTooltips = [];
        this.update();
    }
    onDetach() {
        super.onDetach();
        window.removeEventListener("bz-model-wonder-list-update", this.modelUpdateListener);
        bzPanelMiniMap.toggleCooldownTimer = 500;
        this.disposeTooltips.forEach((dispose) => dispose());
        this.disposeTooltips = [];
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        Focus.setContextAwareFocus(this.panel, this.Root);
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
          initialVPosition: TooltipVerticalPosition.CENTER
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
    createInstance: bzWonderPanel,
    description: "Wonder Panel",
    classNames: ["bz-wonder-panel"],
    styles: [styles],
    tabIndex: -1
});

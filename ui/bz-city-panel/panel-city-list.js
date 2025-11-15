// TODO: localization
import { F as Focus } from '/core/ui/input/focus-support.chunk.js';
import { A as AnchorType } from '/core/ui/panel-support.chunk.js';
import TooltipManager from '/core/ui/tooltips/tooltip-manager.js';
import { D as Databind } from '/core/ui/utilities/utilities-core-databinding.chunk.js';
import { MinimapSubpanel } from '/base-standard/ui/mini-map/panel-mini-map.js';
import { bzPanelMiniMap } from '/bz-map-trix/ui/mini-map/bz-panel-mini-map.js';
import { bzCityList } from '/bz-map-trix/ui/bz-city-panel/model-city-list.js';

const BZ_CITY_TOOLTIP_STYLE = "bz-city-tooltip";

const styles = "fs://game/bz-map-trix/ui/bz-city-panel/panel-city-list.css";

class bzCityPanel extends MinimapSubpanel {
    static savedScrollPosition = 0;
    panel = document.createElement("fxs-vslot");
    inputContext = InputContext.World;
    activateCityListener = this.activateCity.bind(this);
    listContainer = document.createElement("fxs-scrollable");
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
        this.panel.classList.add("mini-map__city-panel", "left-3", "px-2", "py-3");
        const closeNavHelp = document.createElement("fxs-nav-help");
        closeNavHelp.setAttribute("action-key", "inline-cancel");
        closeNavHelp.classList.add("absolute", "-right-4", "-top-3", "z-1");
        Databind.classToggle(closeNavHelp, "hidden", "!{{g_NavTray.isTrayRequired}}");
        this.panel.appendChild(closeNavHelp);
        // header
        const header = document.createElement("fxs-header");
        header.classList.add("mb-2", "font-title-base", "text-secondary");
        header.setAttribute("title", "LOC_UI_RESOURCE_ALLOCATION_SETTLEMENTS");
        header.setAttribute("filigree-style", "h4");
        this.panel.appendChild(header);
        // city list
        const frame = document.createElement("div");
        frame.classList.value = "bz-city-list-frame p-1";
        this.panel.appendChild(frame);
        this.listContainer.classList.value = "bz-city-list-scrollable";
        frame.appendChild(this.listContainer);
        this.renderList(
            "LOC_UI_SETTLEMENT_TAB_BAR_CITIES",
            "g_bzCityListModel.cityList",
        );
        this.renderList(
            "LOC_UI_SETTLEMENT_TAB_BAR_TOWNS",
            "g_bzCityListModel.townList",
            "mt-2",
        );
    }
    renderList(headline, list, ...style) {
        const hasCityTooltip = TooltipManager.types[BZ_CITY_TOOLTIP_STYLE] != null;
        const header = document.createElement("fxs-header");
        header.classList.add("font-title-sm", "text-secondary");
        if (style.length) header.classList.add(...style);
        header.setAttribute("title", headline);
        header.setAttribute("filigree-style", "h4");
        this.listContainer.appendChild(header);
        // table rows
        const row = document.createElement("div");
        this.listContainer.appendChild(row);
        Databind.for(row, list, "entry");
        {
            const entry = document.createElement("fxs-activatable");
            entry.addEventListener("action-activate", this.activateCityListener);
            entry.classList.value =
                "bz-city-list-entry flex justify-between items-center text-sm py-px";
            entry.setAttribute("tabindex", "-1");
            if (hasCityTooltip) {
                entry.setAttribute("data-tooltip-style", BZ_CITY_TOOLTIP_STYLE);
            }
            Databind.attribute(entry, "data-city-owner", "entry.owner");
            Databind.attribute(entry, "data-city-local-id", "entry.localId");
            Databind.classToggle(entry, "bz-town-has-focus", "!!{{entry.focus}}");
            Databind.classToggle(entry, "bz-town-is-growing", "!!{{entry.isGrowing}}");
            Databind.classToggle(entry, "bz-city-has-unrest", "!!{{entry.hasUnrest}}");
            Databind.classToggle(entry, "bz-city-is-razing", "!!{{entry.isRazing}}");
            row.appendChild(entry);
            // title section (left side)
            const title = document.createElement("div");
            title.classList.value =
                "bz-city-list-title flex shrink justify-start items-center";
            entry.appendChild(title);
            // icon
            const icon = document.createElement("div");
            icon.classList.value = "bz-city-list-icon bz-icon relative size-6";
            const typeIcon = document.createElement("div");
            typeIcon.classList.value = "bz-icon absolute size-full";
            Databind.classToggle(typeIcon, "hidden", "!!{{entry.religionIcon}}");
            Databind.bgImg(typeIcon, "entry.icon");
            icon.appendChild(typeIcon);
            const religionIcon = document.createElement("div");
            religionIcon.classList.value = "bz-icon absolute size-full";
            religionIcon.style.backgroundSize = "1.1111111111rem";
            Databind.bgImg(religionIcon, "entry.religionIcon");
            icon.appendChild(religionIcon);
            title.appendChild(icon);
            // name
            const name = document.createElement("div");
            name.classList.value =
                "bz-city-list-name shrink font-fit-shrink truncate mx-1";
            Databind.loc(name, "{{entry.name}}");
            title.appendChild(name);
            // stats section (right side)
            const stats = document.createElement("div");
            stats.classList.value =
                "bz-city-list-stats flex flex-none justify-end items-center";
            entry.appendChild(stats);
            function turnTimer(style, turns) {
                const column = document.createElement("div");
                column.classList.add("text-center");
                column.style.width = "calc(1.2em + 1.6666666667rem)";  // two digits
                const timer = document.createElement("div");
                timer.classList.value = style;
                timer.classList.add("flex", "items-center", "justify-center", "pl-1\\.5");
                Databind.classToggle(column, "invisible", `{{${turns}}}==-1`);
                const timerTurns = document.createElement("div");
                timerTurns.classList.value = "text-right";
                timerTurns.style.width = "calc(1.2em)";  // two digits
                Databind.value(timerTurns, turns);
                timer.appendChild(timerTurns);
                const timerClock = document.createElement("div");
                timerClock.classList.value = "bz-icon size-6";
                timerClock.style.backgroundImage = "url('hud_turn-timer')";
                timer.appendChild(timerClock);
                column.appendChild(timer);
                stats.appendChild(column);
                return column;
            }
            // population
            const growth = document.createElement("div");
            growth.classList.value = "bz-city-growth flex items-center";
            const population = document.createElement("div");
            population.classList.value = "bz-city-list-population text-center mx-1";
            population.style.width = "1.2em";  // two digits
            Databind.value(population, "{{entry.population}}");
            growth.appendChild(population);
            const growthTurns = turnTimer(
                "bz-city-growth-turns",
                "entry.growthTurns",
            );
            growthTurns.classList.add("mx-1");
            growth.appendChild(growthTurns);
            stats.appendChild(growth);
            // city queue
            const queue = document.createElement("div");
            Databind.classToggle(queue, "hidden", "{{entry.isTown}}");
            queue.classList.value = "bz-city-queue flex items-center";
            const queueTurns = turnTimer(
                "bz-city-queue-turns",
                "entry.queueTurns",
            );
            queueTurns.classList.add("mx-1");
            queue.appendChild(queueTurns);
            const qslot = document.createElement("div");
            qslot.classList.value = "bz-city-list-queue-slot relative size-6 mx-1";
            const queueBG = document.createElement("div");
            queueBG.classList.value = "bz-city-list-queue-bg absolute size-full";
            Databind.classToggle(queueBG, "hidden", "!{{entry.queueIcon}}");
            qslot.appendChild(queueBG);
            const queueIcon = document.createElement("div");
            queueIcon.classList.value = "bz-city-list-queue-icon bz-icon size-full";
            Databind.bgImg(queueIcon, "entry.queueIcon");
            if (!hasCityTooltip) Databind.tooltip(queueIcon, "entry.queueTooltip");
            qslot.appendChild(queueIcon);
            queue.appendChild(qslot);
            stats.appendChild(queue);
            // town focus
            const focus = document.createElement("div");
            Databind.classToggle(focus, "hidden", "!{{entry.isTown}}");
            focus.classList.value = "bz-city-list-focus relative size-6 mx-1";
            const focusBG = document.createElement("div");
            focusBG.classList.value = "bz-city-list-focus-bg absolute size-full";
            Databind.classToggle(focusBG, "hidden", "!{{entry.focusIcon}}");
            focus.appendChild(focusBG);
            const focusIcon = document.createElement("div");
            focusIcon.classList.value = "bz-city-list-focus-icon bz-icon size-full";
            Databind.bgImg(focusIcon, "entry.focusIcon");
            Databind.tooltip(focusIcon, "entry.focusTooltip");
            focus.appendChild(focusIcon);
            stats.appendChild(focus);
            // unrest and razing
            const unrest = document.createElement("div");
            unrest.classList.value = "bz-city-list-unrest hidden relative size-6 mx-1";
            const unrestBG = document.createElement("div");
            unrestBG.classList.value = "bz-city-list-unrest-bg absolute size-full";
            unrest.appendChild(unrestBG);
            const unrestIcon = document.createElement("div");
            unrestIcon.classList.value = "bz-city-list-unrest-icon bz-icon size-full";
            Databind.bgImg(unrestIcon, "entry.unrestIcon");
            unrest.appendChild(unrestIcon);
            stats.appendChild(unrest);
        }
        // finish
        this.Root.appendChild(this.panel);
    }
    onAttach() {
        super.onAttach();
        window.addEventListener("bz-model-city-list-update", this.modelUpdateListener);
        bzPanelMiniMap.toggleCooldownTimer = 250;
    }
    onDetach() {
        super.onDetach();
        window.removeEventListener("bz-model-city-list-update", this.modelUpdateListener);
        bzPanelMiniMap.toggleCooldownTimer = 500;
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        Focus.setContextAwareFocus(this.panel, this.Root);
    }
    close() {
        super.close();
    }
    activateCity(event) {
        if (event.target instanceof HTMLElement) {
            const data = event.target.getAttribute("data-city-local-id");
            if (!data) return;
            const localId = JSON.parse(data);
            const city = bzCityList.cities.get(localId);
            Camera.lookAtPlot(city.location);
        }
    }
}
Controls.define("bz-city-panel", {
    createInstance: bzCityPanel,
    description: "City Panel",
    classNames: ["bz-city-panel"],
    styles: [styles],
    tabIndex: -1
});

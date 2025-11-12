import { F as Focus } from '/core/ui/input/focus-support.chunk.js';
import { A as AnchorType } from '/core/ui/panel-support.chunk.js';
import { D as Databind } from '/core/ui/utilities/utilities-core-databinding.chunk.js';
import { MinimapSubpanel } from '/base-standard/ui/mini-map/panel-mini-map.js';
import { bzPanelMiniMap } from '/bz-map-trix/ui/mini-map/bz-panel-mini-map.js';
import { bzCityList } from '/bz-map-trix/ui/bz-city-panel/model-city-list.js';

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
        const row = document.createElement("div");
        this.listContainer.appendChild(row);
        Databind.for(row, "g_bzCityListModel.cityList", "entry");
        {
            const entry = document.createElement("fxs-activatable");
            entry.addEventListener("action-activate", this.activateCityListener);
            entry.classList.value =
                "bz-city-list-entry flex justify-between items-center text-sm py-px";
            entry.setAttribute("tabindex", "-1");
            Databind.attribute(entry, "data-city-local-id", "entry.localId");
            row.appendChild(entry);
            // title section (left side)
            const title = document.createElement("div");
            title.classList.value =
                "bz-city-list-title flex shrink justify-start items-center";
            entry.appendChild(title);
            // icon
            const icon = document.createElement("div");
            icon.classList.value = "bz-city-list-icon bz-icon size-6";
            Databind.bgImg(icon, "entry.icon");
            Databind.tooltip(icon, "entry.iconTT");
            title.appendChild(icon);
            // name
            const name = document.createElement("div");
            name.classList.value = "bz-city-list-name shrink font-fit-shrink overflow-hidden ml-1";
            Databind.loc(name, "{{entry.name}}");
            title.appendChild(name);
            // stats section (right side)
            const stats = document.createElement("div");
            stats.classList.value =
                "bz-city-list-stats flex flex-none justify-end items-center mx-1";
            entry.appendChild(stats);
            // population
            const population = document.createElement("div");
            population.classList.value = "bz-city-list-population mx-1";
            Databind.value(population, "{{entry.population}}");
            stats.appendChild(population);
            // growth turns and queue turns
            function turnTimer(style, turns) {
                const timer = document.createElement("div");
                timer.classList.value = style;
                timer.classList.add(
                    "flex",
                    "items-center",
                    "justify-end",
                    "w-14",
                    // "bg-primary",  // TODO: remove debug
                );
                Databind.classToggle(timer, "invisible", `{{${turns}}}==-1`);
                const timerTurns = document.createElement("div");
                Databind.value(timerTurns, turns);
                timer.appendChild(timerTurns);
                const timerClock = document.createElement("div");
                timerClock.classList.value = "bz-icon size-6";
                timerClock.style.backgroundImage = "url('hud_turn-timer')";
                timer.appendChild(timerClock);
                stats.appendChild(timer);
                return timer;
            }
            const growthTurns = turnTimer(
                "bz-city-growth-turns mr-1",
                "entry.growthTurns",
            );
            stats.appendChild(growthTurns);
            const queueTurns = turnTimer("bz-city-queue-turns", "entry.queueTurns");
            stats.appendChild(queueTurns);
            // project (city production or town focus)
            const project = document.createElement("div");
            project.classList.value = "bz-city-list-project relative size-6 ml-2";
            const projectBG = document.createElement("div");
            projectBG.classList.value = "bz-city-list-project-bg bz-icon absolute size-6";
            Databind.classToggle(projectBG, "hidden", "!{{entry.projectIcon}}");
            Databind.classToggle(projectBG, "bz-city-growing", "{{entry.focusGrowing}}");
            project.appendChild(projectBG);
            const projectIcon = document.createElement("div");
            projectIcon.classList.value = "bz-city-list-project bz-icon absolute size-6";
            Databind.bgImg(projectIcon, "entry.projectIcon");
            Databind.tooltip(projectIcon, "entry.projectTooltip");
            project.appendChild(projectIcon);
            stats.appendChild(project);
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

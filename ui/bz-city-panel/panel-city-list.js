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
                "bz-city-list-entry flex justify-between items-center text-base";
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
            title.appendChild(icon);
            // name
            const name = document.createElement("div");
            name.classList.value = "bz-city-list-name shrink font-fit-shrink ml-1";
            Databind.loc(name, "{{entry.name}}");
            title.appendChild(name);
            // status section (right side)
            const status = document.createElement("div");
            status.classList.value =
                "bz-city-list-status flex flex-none justify-end items-center mx-1";
            entry.appendChild(status);
            // TODO: remove unit info, for reference only
            const isUnit = false;
            if (isUnit) {
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
                activity.classList.value = "bz-unit-activity relative size-6";
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

import { L as LensManager } from '/core/ui/lenses/lens-manager.chunk.js';
import PlotIconsManager from '/core/ui/plot-icons/plot-icons-manager.js';
// load mini-map first to configure allowed layers for default lens
import '/bz-map-trix/ui/mini-map/bz-panel-mini-map.js';

class bzPlotIconWonders extends Component {
    location = { x: -1, y: -1 };
    onInitialize() {
        const wonderType = this.Root.getAttribute("wonder");
        this.location.x = parseInt(this.Root.getAttribute("x") ?? "-1");
        this.location.y = parseInt(this.Root.getAttribute("y") ?? "-1");
        let iconName = wonderType == "NATURAL_WONDER" ?
            "action_naturalartifacts.png" :
            "bz-map-trix/icons/bz-wonder-decoration.png";
        this.Root.style.backgroundImage = `url(fs://game/${iconName})`;
        this.Root.classList.add(
            "size-24",
            "bg-cover",
            "bg-no-repeat",
            "bg-center",
            "cursor-info",
            "pointer-events-auto"
        );
        this.Root.setAttribute("data-pointer-passthrough", "true");
        this.Root.dataset.tooltipStyle = "wonders";
        this.Root.setAttribute("node-id", `${this.location.x},${this.location.y}`);
    }
}
Controls.define("bz-plot-icon-wonders", {
  createInstance: bzPlotIconWonders
});
class bzWonderLensLayer {
    onLayerHotkeyListener = this.onLayerHotkey.bind(this);
    initLayer() {
        window.addEventListener("layer-hotkey", this.onLayerHotkeyListener);
    }
    applyLayer() {
        this.updateMap();
    }
    removeLayer() {
        PlotIconsManager.removePlotIcons("bz-plot-icon-wonders");
    }
    getOptionName() {
        return "bzShowMapDiscoveries";
    }
    updateMap() {
        const width = GameplayMap.getGridWidth();
        const height = GameplayMap.getGridHeight();
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                this.updatePlot({ x, y });
            }
        }
    }
    updatePlot(loc) {
        const observer = GameContext.localObserverID;
        const revealed = GameplayMap.getRevealedState(observer, loc.x, loc.y);
        if (revealed == RevealedStates.HIDDEN) return;
        if (GameplayMap.isNaturalWonder(loc.x, loc.y)) {
            PlotIconsManager.addPlotIcon(
              "bz-plot-icon-wonders", loc, new Map([["wonder", "NATURAL_WONDER"]])
            );
            return;
        }
        const cons = MapConstructibles.getHiddenFilteredConstructibles(loc.x, loc.y);
        for (const con of cons) {
            const item = Constructibles.getByComponentID(con);
            if (!item) continue;
            const info = GameInfo.Constructibles.lookup(item.type);
            if (!info || info.ConstructibleClass != "WONDER") continue;
            console.warn(`TRIX WONDER`);
            PlotIconsManager.addPlotIcon(
              "bz-plot-icon-wonders", loc, new Map([["wonder", "WONDER"]])
            );
            return;
        }
    }
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == "toggle-bz-wonder-layer") {
            LensManager.toggleLayer("bz-wonder-layer");
        }
    }
}
LensManager.registerLensLayer("bz-wonder-layer", new bzWonderLensLayer());

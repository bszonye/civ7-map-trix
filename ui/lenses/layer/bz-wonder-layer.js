import { L as LensManager } from '/core/ui/lenses/lens-manager.chunk.js';
import PlotIconsManager from '/core/ui/plot-icons/plot-icons-manager.js';
// load mini-map first to configure allowed layers for default lens
import '/bz-map-trix/ui/mini-map/bz-panel-mini-map.js';

const UPSCALE_START = 1080;
const BZ_ICON_WONDER = "CITY_WONDERS_LIST";  // TODO
const SPRITE_OFFSET = { x: 0, y: 0, z: 5 };
const SPRITE_SIZE = 1;
var SpriteGroup;
(function (SpriteGroup) {
    SpriteGroup[SpriteGroup["bzWonder"] = 0] = "bzWonder";
    SpriteGroup[SpriteGroup["All"] = Number.MAX_VALUE] = "All";
})(SpriteGroup || (SpriteGroup = {}));
class bzWonderLensLayer {
    bzSpriteGrid = WorldUI.createSpriteGrid(
        "bzWonderLayer_SpriteGroup",
        SpriteMode.Billboard
    );
    upscaleMultiplier = 1;
    onLayerHotkeyListener = this.onLayerHotkey.bind(this);
    initLayer() {
        if (window.innerHeight > UPSCALE_START) {
          this.upscaleMultiplier = window.innerHeight / UPSCALE_START;
        }
        this.updateMap();
        this.bzSpriteGrid.setVisible(false);
        engine.on("PlotVisibilityChanged", this.onPlotChange, this);
        engine.on("ConstructibleAddedToMap", this.onPlotChange, this);
        engine.on("ConstructibleRemovedFromMap", this.onPlotChange, this);
        window.addEventListener("layer-hotkey", this.onLayerHotkeyListener);
    }
    applyLayer() {
        this.bzSpriteGrid.setVisible(true);
    }
    removeLayer() {
        this.bzSpriteGrid.setVisible(false);
        PlotIconsManager.removePlotIcons("bz-plot-icon-wonder");
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
        this.bzSpriteGrid.clearPlot(loc);
        const observer = GameContext.localObserverID;
        const revealed = GameplayMap.getRevealedState(observer, loc.x, loc.y);
        if (revealed == RevealedStates.HIDDEN) return;
        if (GameplayMap.isNaturalWonder(loc.x, loc.y)) {
            console.warn(`TRIX NATURAL`);
            const plotIndex = GameplayMap.getIndexFromLocation(loc);
            PlotIconsManager.addPlotIcon(
              "bz-plot-icon-wonder",
              plotIndex,
              new Map([["archeology", "NATURAL_WONDER"]])
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
            const asset = UI.getIconBLP(BZ_ICON_WONDER);
            const params = { scale: SPRITE_SIZE * this.upscaleMultiplier };
            this.bzSpriteGrid.addSprite(loc, asset, SPRITE_OFFSET, params);
            return;
        }
    }
    onPlotChange(data) {
        this.updatePlot(data.location);
    }
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == "toggle-bz-wonder-layer") {
            LensManager.toggleLayer("bz-wonder-layer");
        }
    }
}
LensManager.registerLensLayer("bz-wonder-layer", new bzWonderLensLayer());

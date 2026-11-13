import LensManager from '/core/ui/lenses/lens-manager.js';
// load mini-map first to configure allowed layers for default lens
import '/bz-map-trix/ui/mini-map/bz-panel-mini-map.js';

// add vanilla lens checkbox
import '/base-standard/ui/lenses/lens/discovery-lens.js';
const fxsDiscoveryLens = LensManager.lenses.get("fxs-discovery-lens");
if (fxsDiscoveryLens) {
    fxsDiscoveryLens.showInMinimap = {
        labelKey: "LOC_SEARCH_TERM_DISCOVERY",
        sortOrder: 50
    };
}

// disable vanilla layer checkbox
import '/base-standard/ui/lenses/layer/discovery-layer.js';
const fxsDiscoveryLayer = LensManager.layers.get("fxs-discovery-layer");
delete fxsDiscoveryLayer?.showInMinimap;

const UPSCALE_START = 1080;
const BZ_ICON_DISCOVERY = "NAR_REW_DEFAULT";
const SPRITE_OFFSET = { x: 0, y: 25, z: 5 };
const SPRITE_SCALE = 3/4;
const SPRITE_SIZE = 64 * SPRITE_SCALE; // pixels wide

class bzDiscoveryLensLayer {
    bzSpriteGrid = WorldUI.createSpriteGrid(
        "bzDiscoveryLayer_SpriteGroup",
        SpriteMode.FixedBillboard
    );
    upscaleMultiplier = 1;
    onLayerHotkeyListener = this.onLayerHotkey.bind(this);
    initLayer() {
        if (window.innerHeight > UPSCALE_START) {
          this.upscaleMultiplier = window.innerHeight / UPSCALE_START;
        }
        this.updateMap();
        this.bzSpriteGrid.setVisible(false);
        engine.on("ConstructibleAddedToMap", this.onPlotChange, this);
        engine.on("ConstructibleRemovedFromMap", this.onPlotChange, this);
        engine.on("PlotVisibilityChanged", this.onPlotChange, this);
        window.addEventListener("layer-hotkey", this.onLayerHotkeyListener);
    }
    applyLayer() {
        this.bzSpriteGrid.setVisible(true);
    }
    removeLayer() {
        this.bzSpriteGrid.setVisible(false);
    }
    showInMinimap = {
        labelKey: "LOC_UI_MINI_MAP_DISCOVERY",
        tooltipKey: "LOC_UI_MINI_MAP_DISCOVERY_TOOLTIP",
        sortOrder: 35
    };
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
        const cons = MapConstructibles.getHiddenFilteredConstructibles(loc.x, loc.y);
        for (const con of cons) {
            const item = Constructibles.getByComponentID(con);
            if (!item) continue;
            const info = GameInfo.Constructibles.lookup(item.type);
            if (!info || !info.Discovery && !info.Archaeology) continue;
            const asset = UI.getIconBLP(BZ_ICON_DISCOVERY, "FONTICON");
            const params = { scale: SPRITE_SIZE * this.upscaleMultiplier };
            this.bzSpriteGrid.addSprite(loc, asset, SPRITE_OFFSET, params);
            return;
        }
    }
    onPlotChange(data) {
        this.updatePlot(data.location);
    }
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == "toggle-bz-discovery-layer") {
            LensManager.toggleLayer("bz-discovery-layer");
        }
    }
}
LensManager.registerLensLayer("bz-discovery-layer", new bzDiscoveryLensLayer());

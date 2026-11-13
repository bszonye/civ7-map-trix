import LensManager from '/core/ui/lenses/lens-manager.js';
import { HexToFloat4 } from '/core/ui/utilities/utilities-color.js';
import { OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.js';
// load mini-map first to configure allowed layers for default lens
import '/bz-map-trix/ui/mini-map/bz-panel-mini-map.js';

// add checkbox for vanilla Discovery lens
import '/base-standard/ui/lenses/lens/discovery-lens.js';
const fxsDiscoveryLens = LensManager.lenses.get("fxs-discovery-lens");
if (fxsDiscoveryLens) {
    fxsDiscoveryLens.showInMinimap = {
        labelKey: "LOC_SEARCH_TERM_DISCOVERY",
        sortOrder: 50
    };
}

// disable checkbox for vanilla Discoveries layer
import '/base-standard/ui/lenses/layer/discovery-layer.js';
const fxsDiscoveryLayer = LensManager.layers.get("fxs-discovery-layer");
delete fxsDiscoveryLayer?.showInMinimap;

const DISCOVERY_BORDER = HexToFloat4(0xffffff, 1);
const DISCOVERY_FADE = HexToFloat4(0x2f47ff, 0.2);

const UPSCALE_START = 1080;
const BZ_ICON_DISCOVERY = "NAR_REW_DEFAULT";
const SPRITE_OFFSET = { x: 0, y: 25, z: 5 };
const SPRITE_SCALE = 3/4;
const SPRITE_SIZE = 64 * SPRITE_SCALE; // pixels wide

class bzDiscoveryLensLayer {
    overlayGroup = WorldUI.createOverlayGroup("bzDiscoveryLens", OVERLAY_PRIORITY.MAX_PRIORITY);
    visiblePlots = new Set();
    plotOverlay = this.overlayGroup.addPlotOverlay();
    borderOverlay = this.overlayGroup.addBorderOverlay({
        style: "CultureBorder_Closed",
        primaryColor: DISCOVERY_BORDER,
        secondaryColor: DISCOVERY_FADE
    });
    spriteGrid = WorldUI.createSpriteGrid(
        "bzDiscoveryLayer_SpriteGroup",
        SpriteMode.FixedBillboard
    );
    upscaleMultiplier = 1;
    onLayerHotkeyListener = this.onLayerHotkey.bind(this);
    onPlotOrConstructibleChanged(data) {
        this.updatePlot(data.location);
    }
    initLayer() {
        if (window.innerHeight > UPSCALE_START) {
          this.upscaleMultiplier = window.innerHeight / UPSCALE_START;
        }
        window.addEventListener("layer-hotkey", this.onLayerHotkeyListener);
        engine.on("PlotVisibilityChanged", this.onPlotOrConstructibleChanged, this);
        engine.on("ConstructibleAddedToMap", this.onPlotOrConstructibleChanged, this);
        engine.on("ConstructibleRemovedFromMap", this.resetOverlay, this);
        this.overlayGroup.setVisible(false);
        this.spriteGrid.setVisible(false);
        this.resetOverlay();
    }
    applyLayer() {
        this.spriteGrid.setVisible(true);
        this.overlayGroup.setVisible(true);
    }
    removeLayer() {
        this.spriteGrid.setVisible(false);
        this.overlayGroup.setVisible(false);
    }
    showInMinimap = {
        labelKey: "LOC_UI_MINI_MAP_DISCOVERY",
        tooltipKey: "LOC_UI_MINI_MAP_DISCOVERY_TOOLTIP",
        sortOrder: 35
    };
    getOptionName() {
        return "bzShowMapDiscoveries";
    }
    resetOverlay() {
        this.visiblePlots.clear();
        this.plotOverlay.clear();
        this.borderOverlay.setThicknessScale(0.66);
        const width = GameplayMap.getGridWidth();
        const height = GameplayMap.getGridHeight();
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                this.updatePlot({ x, y });
            }
        }
    }
    updatePlot(loc) {
        const plot = GameplayMap.getIndexFromLocation(loc);
        if (!this.visiblePlots.has(plot)) {
            this.borderOverlay.clearPlotGroups(plot);
            this.spriteGrid.clearPlot(plot);
        }
        const observer = GameContext.localObserverID;
        const revealed = GameplayMap.getRevealedState(observer, loc.x, loc.y);
        if (revealed == RevealedStates.HIDDEN) return;
        const cons = MapConstructibles.getHiddenFilteredConstructibles(loc.x, loc.y);
        for (const con of cons) {
            const item = Constructibles.getByComponentID(con);
            if (!item) continue;
            const info = GameInfo.Constructibles.lookup(item.type);
            if (!info || !info.Discovery && !info.Archaeology) continue;
            if (this.visiblePlots.has(plot)) continue;
            this.visiblePlots.add(plot);
            const asset = UI.getIconBLP(BZ_ICON_DISCOVERY, "FONTICON");
            const params = { scale: SPRITE_SIZE * this.upscaleMultiplier };
            this.borderOverlay.setPlotGroups(plot, 0);
            this.plotOverlay.addPlots(plot, { fillColor: DISCOVERY_FADE, edgeColor: DISCOVERY_FADE });
            this.spriteGrid.addSprite(plot, asset, SPRITE_OFFSET, params);
            return;
        }
    }
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == "toggle-bz-discovery-layer") {
            LensManager.toggleLayer("bz-discovery-layer");
        }
    }
}
LensManager.registerLensLayer("bz-discovery-layer", new bzDiscoveryLensLayer());

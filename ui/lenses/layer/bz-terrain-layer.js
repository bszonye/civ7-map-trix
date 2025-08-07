import LensManager, { BaseSpriteGridLensLayer, LensActivationEventName } from '/core/ui/lenses/lens-manager.js';
;
const BZ_DEFAULT_LENSES = ['fxs-default-lens'];
const BZ_ICON_DISCOVERY = "NAR_REW_DEFAULT";
const SPRITE_PLOT_POSITION = { x: 0, y: 25, z: 5 };
const SPRITE_SCALE = 3/4;
const SPRITE_SIZE = 64 * SPRITE_SCALE; // pixels wide
var SpriteGroup;
(function (SpriteGroup) {
    SpriteGroup[SpriteGroup["bzTerrain"] = 0] = "bzTerrain";
    SpriteGroup[SpriteGroup["All"] = Number.MAX_VALUE] = "All";
})(SpriteGroup || (SpriteGroup = {}));
class bzTerrainLensLayer extends BaseSpriteGridLensLayer {
    constructor() {
        super([
            { handle: SpriteGroup.bzTerrain, name: "bzTerrainLayer_SpriteGroup", spriteMode: SpriteMode.FixedBillboard },
        ]);
        this.defaultLenses = new Set(BZ_DEFAULT_LENSES);  // initialization tracker
        this.onLayerHotkeyListener = this.onLayerHotkey.bind(this);
        this.onLensActivationListener = this.onLensActivation.bind(this);
    }
    initLayer() {
        this.updateMap();
        this.setVisible(SpriteGroup.All, false);
        engine.on('PlotVisibilityChanged', this.onPlotChange, this);
        engine.on('ConstructibleAddedToMap', this.onPlotChange, this);
        engine.on('ConstructibleRemovedFromMap', this.onPlotChange, this);
        window.addEventListener('layer-hotkey', this.onLayerHotkeyListener);
        window.addEventListener(LensActivationEventName, this.onLensActivationListener);
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
        this.clearPlot(SpriteGroup.All, loc);
        const observer = GameContext.localObserverID;
        const revealed = GameplayMap.getRevealedState(observer, loc.x, loc.y);
        if (revealed == RevealedStates.HIDDEN) return;
        const cons = MapConstructibles.getHiddenFilteredConstructibles(loc.x, loc.y);
        for (const con of cons) {
            const item = Constructibles.getByComponentID(con);
            if (!item) continue;
            const info = GameInfo.Constructibles.lookup(item.type);
            if (!info?.Discovery) continue;
            const asset = UI.getIconBLP(BZ_ICON_DISCOVERY);
            this.addSprite(SpriteGroup.bzTerrain, loc, asset, SPRITE_PLOT_POSITION, { scale: SPRITE_SIZE });
            return;
        }
    }
    onPlotChange(data) {
        this.updatePlot(data.location);
    }
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == 'toggle-bz-terrain-layer') {
            LensManager.toggleLayer('bz-terrain-layer');
        }
    }
    onLensActivation(event) {
        if (this.defaultLenses.has(event.detail.activeLens)) {
            LensManager.enableLayer('bz-terrain-layer');
            this.defaultLenses.delete(event.detail.activeLens);
        }
    }
}
LensManager.registerLensLayer('bz-terrain-layer', new bzTerrainLensLayer());

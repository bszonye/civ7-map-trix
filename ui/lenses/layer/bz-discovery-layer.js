import LensManager, { BaseSpriteGridLensLayer, LensActivationEventName } from '/core/ui/lenses/lens-manager.js';
;
const BZ_ICON_DISCOVERY = "NAR_REW_DEFAULT";
const SPRITE_PLOT_POSITION = { x: 0, y: 25, z: 5 };
const SPRITE_SIZE = 42; // pixels wide
var SpriteGroup;
(function (SpriteGroup) {
    SpriteGroup[SpriteGroup["All_Discoveries"] = 0] = "All_Discoveries";
})(SpriteGroup || (SpriteGroup = {}));
class bzDiscoveryLensLayer extends BaseSpriteGridLensLayer {
    constructor() {
        super([
            { handle: SpriteGroup.All_Discoveries, name: "AllDiscoveries_SpriteGroup", spriteMode: SpriteMode.FixedBillboard },
        ]);
        this.onLayerHotkeyListener = this.onLayerHotkey.bind(this);
        this.onLensActivationListener = this.onLensActivation.bind(this);
    }
    /**
     * @implements ILensLayer
     */
    initLayer() {
        const player = Players.get(GameContext.localPlayerID);
        if (!player) {
            console.log(`bz-discovery-layer: initLayer() Failed to find player for ${GameContext.localPlayerID}`);
            return;
        }
        const width = GameplayMap.getGridWidth();
        const height = GameplayMap.getGridHeight();
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const resource = GameplayMap.getResourceType(x, y);
                if (resource == ResourceTypes.NO_RESOURCE) {
                    continue;
                }
                const resourceDefinition = GameInfo.Resources.lookup(resource);
                if (resourceDefinition) {
                    // If we're a treasure resource in a distant land we can create treasure fleets
                    this.addResourceSprites({ location: { x: x, y: y }, resource: resourceDefinition.ResourceType, class: resourceDefinition.ResourceClassType, canCreatetreasureFleet: false });
                }
                else {
                    console.error(`Could not find resource with type ${resource}.`);
                }
            }
        }
        this.spriteGrids.forEach(grid => grid.setVisible(false)); // Not shown until requested to be visible.
        window.addEventListener('layer-hotkey', this.onLayerHotkeyListener);
        window.addEventListener(LensActivationEventName, this.onLensActivationListener);
    }
    addResourceSprites(entry) {
        const asset = UI.getIconBLP(BZ_ICON_DISCOVERY);
        this.addSprite(SpriteGroup.All_Discoveries, entry.location, asset, SPRITE_PLOT_POSITION, { scale: SPRITE_SIZE });
    }
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == 'toggle-bz-discovery-layer') {
            LensManager.toggleLayer('bz-discovery-layer');
        }
    }
    onLensActivation(event) {
        if (event.detail.activeLens == 'fxs-default-lens' && !event.detail.prevLens) {
            LensManager.enableLayer('bz-discovery-layer');
        }
    }
}
LensManager.registerLensLayer('bz-discovery-layer', new bzDiscoveryLensLayer());

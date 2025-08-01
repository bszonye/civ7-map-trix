import LensManager, { BaseSpriteGridLensLayer, LensActivationEventName } from '/core/ui/lenses/lens-manager.js';
;
const SPRITE_PLOT_POSITION = { x: 0, y: 0, z: 0 };
var SpriteGroup;
(function (SpriteGroup) {
    SpriteGroup[SpriteGroup["All_Fortification"] = 0] = "All_Fortification";
})(SpriteGroup || (SpriteGroup = {}));
class bzFortificationLensLayer extends BaseSpriteGridLensLayer {
    constructor() {
        super([
            { handle: SpriteGroup.All_Fortification, name: "AllFortification_SpriteGroup", spriteMode: SpriteMode.Default },
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
            console.log(`bz-fortification-layer: initLayer() Failed to find player for ${GameContext.localPlayerID}`);
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
        const asset = UI.getIconBLP("CIVILIZATION_AMERICA");
        this.addSprite(SpriteGroup.All_Fortification, entry.location, asset, SPRITE_PLOT_POSITION, { scale: 2 });
    }
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == 'toggle-bz-fortification-layer') {
            LensManager.toggleLayer('bz-fortification-layer');
        }
    }
    onLensActivation(event) {
        if (event.detail.activeLens == 'fxs-default-lens' && !event.detail.prevLens) {
            // LensManager.enableLayer('bz-fortification-layer');
        }
    }
}
LensManager.registerLensLayer('bz-fortification-layer', new bzFortificationLensLayer());

import LensManager, { BaseSpriteGridLensLayer } from '/core/ui/lenses/lens-manager.js';
;
const SPRITE_PLOT_POSITION = { x: 0, y: 25, z: 5 };
const RESOURCE_SIZE = 42; // pixels wide
const TYPE_SIZE = 20; // pixels wide
const TYPE_OFFSET = { x: -12, y: -12 };
const TREASURE_FLEET_TYPE_SIZE = 42; // pixels wide
const TREASURE_FLEET_TYPE_OFFSET = { x: -5, y: -12 };
var SpriteGroup;
(function (SpriteGroup) {
    SpriteGroup[SpriteGroup["All_Resources"] = 0] = "All_Resources";
    SpriteGroup[SpriteGroup["All_Resources_Class_Type"] = 1] = "All_Resources_Class_Type";
    SpriteGroup[SpriteGroup["All"] = Number.MAX_VALUE] = "All";
})(SpriteGroup || (SpriteGroup = {}));
class bzReligionLensLayer extends BaseSpriteGridLensLayer {
    constructor() {
        super([
            { handle: SpriteGroup.All_Resources, name: "AllResources_SpriteGroup", spriteMode: SpriteMode.Billboard },
            { handle: SpriteGroup.All_Resources_Class_Type, name: "AllResourcesClassType_SpriteGroup", spriteMode: SpriteMode.Billboard }
        ]);
        this.resourceAddedToMapListener = (data) => { this.onResourceAddedToMap(data); };
        this.resourceRemovedFromMapListener = (data) => { this.onResourceRemovedFromMap(data); };
        this.onLayerHotkeyListener = this.onLayerHotkey.bind(this);
    }
    /**
     * @implements ILensLayer
     */
    initLayer() {
        engine.on('ResourceAddedToMap', this.resourceAddedToMapListener);
        engine.on('ResourceRemovedFromMap', this.resourceRemovedFromMapListener);
        const player = Players.get(GameContext.localPlayerID);
        if (!player) {
            console.log(`bz-religion-layer: initLayer() Failed to find player for ${GameContext.localPlayerID}`);
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
                    if (resourceDefinition.ResourceClassType == "RESOURCECLASS_TREASURE" && player.isDistantLands({ x: x, y: y })) {
                        this.addResourceSprites({ location: { x: x, y: y }, resource: resourceDefinition.ResourceType, class: resourceDefinition.ResourceClassType, canCreatetreasureFleet: true });
                    }
                    else {
                        this.addResourceSprites({ location: { x: x, y: y }, resource: resourceDefinition.ResourceType, class: resourceDefinition.ResourceClassType, canCreatetreasureFleet: false });
                    }
                }
                else {
                    console.error(`Could not find resource with type ${resource}.`);
                }
            }
        }
        this.spriteGrids.forEach(grid => grid.setVisible(false)); // Not shown until requested to be visible.
        window.addEventListener('layer-hotkey', this.onLayerHotkeyListener);
    }
    addResourceSprites(entry) {
        const asset = UI.getIconBLP(entry.resource);
        const assetFow = UI.getIconBLP(entry.resource, "FOW");
        this.addSpriteFOW(SpriteGroup.All_Resources, entry.location, asset, assetFow, SPRITE_PLOT_POSITION, { scale: RESOURCE_SIZE });
        const blpName = entry.canCreatetreasureFleet ? "RESOURCECLASS_TREASURE_FLEET" : entry.class;
        const scale = entry.canCreatetreasureFleet ? TREASURE_FLEET_TYPE_SIZE : TYPE_SIZE;
        const offset = entry.canCreatetreasureFleet ? TREASURE_FLEET_TYPE_OFFSET : TYPE_OFFSET;
        const typeasset = UI.getIconBLP(blpName);
        const typeassetFow = UI.getIconBLP(blpName, "FOW");
        this.addSpriteFOW(SpriteGroup.All_Resources_Class_Type, entry.location, typeasset, typeassetFow, SPRITE_PLOT_POSITION, { scale: scale, offset: offset });
    }
    onResourceAddedToMap(data) {
        const player = Players.get(GameContext.localPlayerID);
        if (!player) {
            console.log(`bz-religion-layer: onResourceAddedToMap() Failed to find player for ${GameContext.localPlayerID}`);
            return;
        }
        const resourceDefinition = GameInfo.Resources.lookup(data.resourceType);
        if (resourceDefinition) {
            // There are sometimes ResourceAddedToMap events on visibility changes that already have
            // FoW sprite icons from initLayer(), clear old icons to avoid stacking duplicates
            this.clearPlot(SpriteGroup.All, data.location);
            if (resourceDefinition.ResourceClassType == "RESOURCECLASS_TREASURE" && player.isDistantLands({ x: data.location.x, y: data.location.y })) {
                this.addResourceSprites({ location: data.location, resource: resourceDefinition.ResourceType, class: resourceDefinition.ResourceClassType, canCreatetreasureFleet: true });
            }
            else {
                this.addResourceSprites({ location: data.location, resource: resourceDefinition.ResourceType, class: resourceDefinition.ResourceClassType, canCreatetreasureFleet: false });
            }
        }
        else {
            console.error(`Could not find resource with type ${data.resourceType}.`);
        }
    }
    onResourceRemovedFromMap(data) {
        this.clearPlot(SpriteGroup.All, data.location);
    }
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == 'toggle-bz-religion-layer') {
            LensManager.toggleLayer('bz-religion-layer');
        }
    }
}
LensManager.registerLensLayer('bz-religion-layer', new bzReligionLensLayer());

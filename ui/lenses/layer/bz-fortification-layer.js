import LensManager from '/core/ui/lenses/lens-manager.js';
import { ConstructibleHasTagType } from '/base-standard/ui/utilities/utilities-tags.js';
// load mini-map first to configure allowed layers for default lens
import '/bz-map-trix/ui/mini-map/bz-panel-mini-map.js';

const SPRITE_OFFSET = { x: 0, y: 0, z: 5 };
const SPRITE_SCALE = 2;

function plotDefense(loc) {
    const plotIndex = GameplayMap.getIndexFromLocation(loc);
    const modifiers = [];
    // fortifications
    const fortifications = MapConstructibles
        .getHiddenFilteredConstructibles(loc.x, loc.y)
        .map(id => {
            const item = Constructibles.getByComponentID(id);
            if (!item.complete || item.damaged) return null;
            const info = item && GameInfo.Constructibles.lookup(item.type);
            const type = info?.ConstructibleType;
            if (!type || !ConstructibleHasTagType(type, "FORTIFICATION")) return null;
            return { ...item, info };
        }).filter(e => e);
    for (const fort of fortifications) {
        if (fort.info.DistrictDefense) continue;  // no defense bonus
        const defense = parseInt(GlobalParameters.COMBAT_UNIT_FORTIFICATION_BONUS);
        const label = "LOC_COMBAT_PREVIEW_FORTIFIED_DEFENSE_DESC";
        const name = Locale.compose(label, defense);
        modifiers.push({ defense, name });
    }
    // districts with intact defenses ignore terrain bonuses
    const districtID = MapCities.getDistrict(loc.x, loc.y);
    const district = districtID && Districts.get(districtID);
    if (district?.isDefensible && fortifications.find(f => f.info?.DistrictDefense)) {
        const defense = modifiers.reduce((sum, m) => sum + m.defense, 0);
        return { defense, district, fortifications, modifiers };
    }
    // feature types
    const fid = GameplayMap.getFeatureType(loc.x, loc.y);
    if (fid != FeatureTypes.NO_FEATURE) {
        const feature = GameInfo.Features.lookup(fid);
        const defense = parseInt(feature.DefenseModifier ?? "0");
        if (Number.isNaN(defense)) {
            // ignore
        } else if (defense && feature.FeatureClassType == "FEATURE_CLASS_VEGETATED") {
            const name =
                Locale.compose("LOC_COMBAT_PREVIEW_VEGETATION_DEFENSE_BONUS", defense);
            modifiers.push({ defense, name });
        } else if (defense) {
            const label = 0 <= defense ?
                "LOC_COMBAT_PREVIEW_FEATURE_DEFENSE_BONUS" :
                "LOC_COMBAT_PREVIEW_FEATURE_DEFENSE_PENALTY";
            const name = Locale.compose(label, defense, feature.Name);
            modifiers.push({ defense, name });
        }
    }
    // river types
    const rid = GameplayMap.getRiverType(loc.x, loc.y);
    if (rid != RiverTypes.NO_RIVER) {
        const defense = parseInt(GlobalParameters.COMBAT_RIVER_DEFENSE_PENALTY);
        const name =
            Locale.compose("LOC_COMBAT_PREVIEW_RIVER_DEFENSE_PENALTY_DESC", defense);
        modifiers.push({ defense, name });
    }
    // terrain types
    const tid = GameplayMap.getTerrainType(loc.x, loc.y);
    const terrain = GameInfo.Terrains.lookup(tid);
    if (terrain?.TerrainType == "TERRAIN_HILL") {  // rough terrain bonus
        const defense = parseInt(GlobalParameters.COMBAT_ROUGH_TERRAIN_DEFENSE_BONUS);
        const name = Locale.compose("LOC_COMBAT_PREVIEW_ROUGH_TERRAIN_BONUS", defense);
        modifiers.push({ defense, name });
    } else if (terrain) {  // general terrain bonuses
        const defense = parseInt(terrain.DefenseModifier ?? "0");
        if (defense && !Number.isNaN(defense)) {
            const label = 0 <= defense ?
                "LOC_COMBAT_PREVIEW_TERRAIN_BONUS_DESC" :
                "LOC_COMBAT_PREVIEW_TERRAIN_PENALTY";
            const name = Locale.compose(label, defense);
            modifiers.push({ defense, name });
        }
    }
    // plot effects (temporary fortification)
    // omitted from "fortifications" list, which the plot tooltip uses
    // to construct a keyword tag.  the tooltip displays this effect as
    // an alert instead.
    const effects = MapPlotEffects.getPlotEffects(plotIndex);
    for (const effect of effects) {
        if (!effect.onlyVisibleToOwner || effect.owner == GameContext.localPlayerID) {
            const info = GameInfo.PlotEffects.lookup(effect.effectType);
            const defense = parseInt(info?.Defense);
            if (defense && !Number.isNaN(defense)) {
                const label = "LOC_COMBAT_PREVIEW_FORTIFIED_DEFENSE_DESC";
                const name = Locale.compose(label, defense);
                modifiers.push({ defense, name });
            }
        }
    }
    // gather results
    const defense = modifiers.reduce((sum, m) => sum + m.defense, 0);
    return { district, defense, fortifications, modifiers };
}

class bzFortificationLensLayer {
    backOffset = { x: 0, y: -19, z: 0 };
    textOffset = { x: -0.5, y: -18, z: 0 };
    bonusBack = "unit_combat-shadow";
    penaltyBack = "unit_combat-shadow_red";
    backOptions = { scale: 1, alpha: 0.66 };
    textOptions = { fonts: ["TitleFont"], fontSize: 6, faceCamera: true };
    bzSpriteGrid = WorldUI.createSpriteGrid(
        "bzFortificationLayer_SpriteGroup",
        SpriteMode.Default
    );
    onLayerHotkeyListener = this.onLayerHotkey.bind(this);
    initLayer() {
        this.updateMap();
        this.bzSpriteGrid.setVisible(false);
        engine.on("PlotVisibilityChanged", this.onPlotChange, this);
        engine.on("ConstructibleAddedToMap", this.onPlotChange, this);
        engine.on("ConstructibleRemovedFromMap", this.onPlotChange, this);
        engine.on("DistrictControlChanged", this.onPlotChange, this);
        engine.on("PlotEffectAddedToMap", this.onPlotChange, this);
        engine.on("PlotEffectRemovedFromMap", this.onPlotChange, this);
        window.addEventListener("layer-hotkey", this.onLayerHotkeyListener);
    }
    applyLayer() {
        this.bzSpriteGrid.setVisible(true);
    }
    removeLayer() {
        this.bzSpriteGrid.setVisible(false);
    }
    getOptionName() {
        return "bzShowMapFortifications";
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
        const { defense, district, modifiers } = plotDefense(loc);
        if (defense || modifiers.length) {
            const plot = GameplayMap.getIndexFromLocation(loc);
            const isBonus = 0 <= defense;
            const back = isBonus ? this.bonusBack : this.penaltyBack;
            const value = isBonus ? `+${defense}` : defense.toString();
            this.bzSpriteGrid.addSprite(plot, back, this.backOffset, this.backOptions);
            this.bzSpriteGrid.addText(plot, value, this.textOffset, this.textOptions);
        }
        if (!district?.isDefensible) return;
        const controller = Players.get(district.controllingPlayer);
        const civ = GameInfo.Civilizations.lookup(controller.civilizationType);
        const asset = this.getCivilizationIcon(civ.CivilizationType);
        const params = { scale: SPRITE_SCALE };
        this.bzSpriteGrid.addSprite(loc, asset, SPRITE_OFFSET, params);
    }
    getCivilizationIcon(icon) {
        const blp = UI.getIconBLP(icon);
        const url = UI.getIconURL(icon);
        // sprites only support built-in BLPs, for now
        if (url == `blp:${blp}` || url == `fs://game/${blp}`) return blp;
        return "fi_action_fortify_64";
    }
    onPlotChange(data) {
        this.updatePlot(data.location);
    }
    onLayerHotkey(hotkey) {
        if (hotkey.detail.name == "toggle-bz-fortification-layer") {
            LensManager.toggleLayer("bz-fortification-layer");
        }
    }
}
LensManager.registerLensLayer("bz-fortification-layer", new bzFortificationLensLayer());

export { plotDefense };

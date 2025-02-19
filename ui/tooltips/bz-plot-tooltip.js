/**
 * Plot Tooltips
 * @copyright 2022, Firaxis Gmaes
 * @description The tooltips that appear based on the cursor hovering over world plots.
 */
import "/base-standard/ui/tooltips/plot-tooltip.js";

import TooltipManager, { PlotTooltipPriority } from '/core/ui/tooltips/tooltip-manager.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import DistrictHealthManager from '/base-standard/ui/district/district-health-manager.js';
import LensManager from '/core/ui/lenses/lens-manager.js';

const DEBUG_GRAY = ["background-color", "rgba(141, 151, 166, 0.5)"];
const DEBUG_RED = ["background-color", "rgba(150, 57, 57, .35)"];
const DEBUG_GREEN = ["background-color", "rgba(57, 150, 57, .35)"];
const DEBUG_BLUE = ["background-color", "rgba(57, 57, 150, .35)"];

const BZ_DOT_DIVIDER = Locale.compose("LOC_PLOT_DIVIDER_DOT");

const BZ_WILDERNESS_NAME = GameInfo.Districts.lookup(DistrictTypes.WILDERNESS).Name;
const BZ_VILLAGE_TYPES = ["IMPROVEMENT_VILLAGE", "IMPROVEMENT_ENCAMPMENT"];

const BZ_YIELD_TOTAL_RURAL = "CITY_RURAL";
const BZ_YIELD_TOTAL_URBAN = "CITY_URBAN";

const BZ_YIELD_COLOR = {
    "YIELD_CULTURE": "#bf99e6",  // violet
    "YIELD_DIPLOMACY": "#99e6bf",  // teal
    "YIELD_FOOD": "#a6cc33",  // green
    "YIELD_GOLD": "#f0c442",  // yellow
    "YIELD_HAPPINESS": "#ff9933",  // orange
    "YIELD_PRODUCTION": "#a33d29",  // brown
    "YIELD_SCIENCE": "#80bfff",  // blue
    null: "#d9c8a6",  // pale gold
}

const BZ_BORDER_WIDTH = "0.1111111111rem";
const BZ_BORDER_MARGIN = `calc(${BZ_BORDER_WIDTH} - var(--padding-left-right))`;
const BZ_BORDER_PADDING = `calc(var(--padding-left-right) - ${BZ_BORDER_WIDTH})`;

function adjacencyYield(building) {
    if (!building) return [];
    const adjTypes = GameInfo.Constructible_Adjacencies.filter(at =>
        at.ConstructibleType == building.ConstructibleType && !at.RequiresActivation
    );
    const adjYields = adjTypes.map(at => GameInfo.Adjacency_YieldChanges.find(
        ay => ay.ID == at.YieldChangeId));
    const yieldSet = new Set(adjYields.map(ay => ay.YieldType));
    return [...yieldSet];
}
function dotJoin(list) {
    // join text with dots after removing empty elements
    return list.filter(e => e).join(" " + BZ_DOT_DIVIDER + " ");
}
// lay out a column of constructibles and their construction notes
function layoutConstructibles(layout, constructibles) {
    for (const c of constructibles) {
        // TODO: adjust spacing
        const ttConstructible = document.createElement("div");
        ttConstructible.classList.value = "flex flex-col items-center text-xs mt-1";
        const ttName = document.createElement("div");
        ttName.classList.value = "font-title uppercase leading-tight text-accent-2";
        // ttName.style.setProperty(...DEBUG_RED);
        ttName.setAttribute("data-l10n-id", c.info.Name);
        ttConstructible.appendChild(ttName);
        const notes = dotJoin(c.notes.map(e => Locale.compose(e)));
        if (notes) {
            const ttState = document.createElement("div");
            ttState.classList.value = "leading-none";
            ttState.style.setProperty("font-size", "85%");
            // ttState.style.setProperty(...DEBUG_GREEN);
            ttState.innerHTML = notes;
            ttConstructible.appendChild(ttState);
        }
        layout.appendChild(ttConstructible);
    }
}
// lay out a paragraph of rules text
function layoutRules(layout, text) {
    const ttDescription = document.createElement("div");
    ttDescription.classList.value = "flex flex-col my-1";
    // ttDescription.style.setProperty(...DEBUG_GRAY);
    const description = splitModifiers(Locale.compose(text));
    for (const line of description) {
        const ttLine = document.createElement("div");
        ttLine.classList.value = "text-xs leading-snug text-center";
        ttLine.setAttribute("data-l10n-id", line);
        ttDescription.appendChild(ttLine);
    }
    layout.appendChild(ttDescription);
}
// split yield modifiers into separate lines to avoid layout bugs
function splitModifiers(text) {
    // examples:
    // +10[icon:YIELD_PRODUCTION] Production
    // +1[icon:YIELD_CULTURE] Culture and[icon:YIELD_GOLD] Gold
    const yieldModifierPattern = /\s*(\S*\[icon:\w+\]\S*\s+\S+(?:\s+\S*\[icon:\w+\]\S*\s+\S+)?)\s+/u;
    const lines = text.split(yieldModifierPattern);
    console.warn(`TRIX ${lines}`);
    return lines;
}

class PlotTooltipType {
    constructor() {
        this.plotCoord = null;
        this.isShowingDebug = false;
        this.tooltip = document.createElement('fxs-tooltip');
        this.container = document.createElement('div');
        this.yieldsFlexbox = document.createElement('div');
        this.totalYields = 0;
        this.tooltip.classList.value = "plot-tooltip max-w-96 text-xs leading-tight";
        this.tooltip.appendChild(this.container);
        this.agelessBuildings = this.buildingsTagged("AGELESS");
        this.extraBuildings = this.buildingsTagged("IGNORE_DISTRICT_PLACEMENT_CAP");
        this.largeBuildings = this.buildingsTagged("FULL_TILE");
        Loading.runWhenFinished(() => {
            for (const y of GameInfo.Yields) {
                const url = UI.getIcon(`${y.YieldType}`, "YIELD");
                Controls.preloadImage(url, 'plot-tooltip');
            }
            for (const y of [BZ_YIELD_TOTAL_RURAL, BZ_YIELD_TOTAL_URBAN]) {
                const url = UI.getIcon(y, "YIELD");
                Controls.preloadImage(url, 'plot-tooltip');
            }
        });
    }
    getHTML() {
        return this.tooltip;
    }
    isUpdateNeeded(plotCoord) {
        // Check if the plot location has changed, if not return early, otherwise cache it and rebuild.
        if (this.plotCoord != null) {
            if (plotCoord.x == this.plotCoord.x && plotCoord.y == this.plotCoord.y) {
                return false;
            }
        }
        this.plotCoord = plotCoord; // May be cleaner to recompute in update but at cost of computing 2nd time.
        return true;
    }
    reset() {
        this.container.innerHTML = '';
        this.yieldsFlexbox.innerHTML = '';
        this.totalYields = 0;
    }
    update() {
        if (this.plotCoord == null) {
            console.error("Tooltip was unable to read plot values due to a coordinate error.");
            return;
        }
        this.isShowingDebug = UI.isDebugPlotInfoVisible(); // Ensure debug status hasn't changed
        // Obtain names and IDs
        const loc = this.plotCoord;
        const plotIndex = GameplayMap.getIndexFromLocation(loc);
        const playerID = GameplayMap.getOwner(loc.x, loc.y);
        const cityID = GameplayMap.getOwningCityFromXY(loc.x, loc.y);
        const districtID = MapCities.getDistrict(loc.x, loc.y);
        const routeName = this.getRouteName();
        // player, city, district objects
        const player = Players.get(playerID);
        const city = cityID ? Cities.get(cityID) : null;
        const district = districtID ? Districts.get(districtID) : null;
        // collect yields first, to inform panel layouts
        this.collectYields(loc, GameContext.localPlayerID, city);
        // Top Section
        if (LensManager.getActiveLens() == "fxs-settler-lens") {
            //Add more details to the tooltip if we are in the settler lens
            const localPlayer = Players.get(GameContext.localPlayerID);
            if (!localPlayer) {
                console.error("plot-tooltip: Attempting to update settler tooltip, but no valid local player!");
                return;
            }
            const localPlayerDiplomacy = localPlayer?.Diplomacy;
            if (localPlayerDiplomacy === undefined) {
                console.error("plot-tooltip: Attempting to update settler tooltip, but no valid local player Diplomacy object!");
                return;
            }
            else if (!GameplayMap.isWater(loc.x, loc.y) && !GameplayMap.isImpassable(loc.x, loc.y) && !GameplayMap.isNavigableRiver(loc.x, loc.y)) {
                //Dont't add any extra tooltip to mountains, oceans, or navigable rivers, should be obvious enough w/o them
                const settlerTooltip = document.createElement("div");
                settlerTooltip.classList.add("plot-tooltip__settler-tooltip");
                const localPlayerAdvancedStart = localPlayer?.AdvancedStart;
                if (localPlayerAdvancedStart === undefined) {
                    console.error("plot-tooltip: Attempting to update settler tooltip, but no valid local player advanced start object!");
                    return;
                }
                //Show why we can't settle here
                if (!GameplayMap.isPlotInAdvancedStartRegion(GameContext.localPlayerID, loc.x, loc.y) && !localPlayerAdvancedStart?.getPlacementComplete()) {
                    settlerTooltip.classList.add("blocked-location");
                    settlerTooltip.innerHTML = Locale.compose("LOC_PLOT_TOOLTIP_CANT_SETTLE_TOO_FAR");
                }
                else if (!localPlayerDiplomacy.isValidLandClaimLocation(loc, true /*bIgnoreFriendlyUnitRequirement*/)) {
                    settlerTooltip.classList.add("blocked-location");
                    if (GameplayMap.isCityWithinMinimumDistance(loc.x, loc.y)) {
                        settlerTooltip.innerHTML = Locale.compose("LOC_PLOT_TOOLTIP_CANT_SETTLE_TOO_CLOSE");
                    }
                    else if (GameplayMap.getResourceType(loc.x, loc.y) != ResourceTypes.NO_RESOURCE) {
                        settlerTooltip.innerHTML = Locale.compose("LOC_PLOT_TOOLTIP_CANT_SETTLE_RESOURCES");
                    }
                }
                else if (!GameplayMap.isFreshWater(loc.x, loc.y)) {
                    settlerTooltip.classList.add("okay-location");
                    settlerTooltip.innerHTML = Locale.compose("LOC_PLOT_TOOLTIP_NO_FRESH_WATER");
                }
                this.container.appendChild(settlerTooltip);
                this.appendDivider();
            }
        }
        this.appendGeographyPanel(loc);
        // Trade Route Info
        if (routeName) {
            const toolTipRouteInfo = document.createElement("div");
            toolTipRouteInfo.classList.add("plot-tooltip__trade-route-info");
            toolTipRouteInfo.innerHTML = routeName;
            this.container.appendChild(toolTipRouteInfo);
        }
        // fortifications & environmental effects like snow
        this.appendPlotEffects(plotIndex);
        // civ & settlement panel
        if (player) this.appendSettlementPanel(loc, player, city);
        // determine the hex tile type
        // hex tile panel
        this.appendHexPanel(loc, city, district);
        // yields panel
        this.container.appendChild(this.yieldsFlexbox);
        // unit info panel
        // TODO: refactor this into a method
        this.addUnitInfo(loc);
        UI.setPlotLocation(loc.x, loc.y, plotIndex);
        // Adjust cursor between normal and red based on the plot owner's hostility
        if (!UI.isCursorLocked()) {
            const localPlayerID = GameContext.localPlayerID;
            const topUnit = this.getTopUnit(loc);
            let showHostileCursor = false;
            let owningPlayerID = GameplayMap.getOwner(loc.x, loc.y);
            // if there's a unit on the plot, that player overrides the tile's owner
            if (topUnit) {
                owningPlayerID = topUnit.owner;
            }
            const revealedState = GameplayMap.getRevealedState(localPlayerID, loc.x, loc.y);
            if (Players.isValid(localPlayerID) && Players.isValid(owningPlayerID) && (revealedState == RevealedStates.VISIBLE)) {
                const owningPlayer = Players.get(owningPlayerID);
                // Is it an independent?
                if (owningPlayer?.isIndependent) {
                    let independentID = PlayerIds.NO_PLAYER;
                    if (topUnit) {
                        // We got the player from the unit, so use the unit
                        independentID = Game.IndependentPowers.getIndependentPlayerIDFromUnit(topUnit.id);
                    }
                    else {
                        // Get the independent from the plot, can reutrn -1
                        independentID = Game.IndependentPowers.getIndependentPlayerIDAt(loc.x, loc.y);
                    }
                    if (independentID != PlayerIds.NO_PLAYER) {
                        const relationship = Game.IndependentPowers.getIndependentRelationship(independentID, localPlayerID);
                        if (relationship == IndependentRelationship.HOSTILE) {
                            showHostileCursor = true;
                        }
                    }
                }
                else {
                    var hasHiddenUnit = false;
                    if (topUnit?.hasHiddenVisibility) {
                        hasHiddenUnit = true;
                    }
                    const localPlayer = Players.get(localPlayerID);
                    if (localPlayer) {
                        const localPlayerDiplomacy = localPlayer.Diplomacy;
                        if (localPlayerDiplomacy) {
                            if (localPlayerDiplomacy.isAtWarWith(owningPlayerID) && !hasHiddenUnit) {
                                showHostileCursor = true;
                            }
                        }
                    }
                }
            }
            if (showHostileCursor) {
                UI.setCursorByURL("fs://game/core/ui/cursors/enemy.ani");
            }
            else {
                UI.setCursorByType(UIHTMLCursorTypes.Default);
            }
        }
    }
    isBlank() {
        if (this.plotCoord == null) {
            return true;
        }
        const localPlayerID = GameContext.localPlayerID;
        const revealedState = GameplayMap.getRevealedState(localPlayerID, this.plotCoord.x, this.plotCoord.y);
        if (revealedState == RevealedStates.HIDDEN) {
            return true;
        }
        // If a unit is selected, check if over our own unit an enemy unit and prevent the plot tooltip from displaying.
        const selectedUnitID = UI.Player.getHeadSelectedUnit();
        if (selectedUnitID && ComponentID.isValid(selectedUnitID)) {
            const plotUnits = MapUnits.getUnits(this.plotCoord.x, this.plotCoord.y);
            if (plotUnits.length > 0) {
                // Hovering over your selected unit; don't show the plot tooltip
                if (plotUnits.find(e => ComponentID.isMatch(e, selectedUnitID))) {
                    return true;
                }
                let args = {};
                args.X = this.plotCoord.x;
                args.Y = this.plotCoord.y;
                let combatType = Game.Combat.testAttackInto(selectedUnitID, args);
                if (combatType != CombatTypes.NO_COMBAT) {
                    return true;
                }
            }
        }
        return false;
    }
    appendDivider() {
        const divider = document.createElement("div");
        divider.classList.add("plot-tooltip__Divider", "my-2");
        this.container.appendChild(divider);
    }
    getContinentName(loc) {
        const continentType = GameplayMap.getContinentType(loc.x, loc.y);
        const continent = GameInfo.Continents.lookup(continentType);
        if (continent && continent.Description) {
            return continent.Description;
        }
        else {
            return "";
        }
    }
    getConstructibleInfo(loc) {
        const constructibleInfo = [];
        const constructibles = MapConstructibles.getHiddenFilteredConstructibles(loc.x, loc.y);
        for (const constructible of constructibles) {
            const instance = Constructibles.getByComponentID(constructible);
            if (!instance || instance.location.x != loc.x || instance.location.y != loc.y) continue;
            const info = GameInfo.Constructibles.lookup(instance.type);
            if (!info) continue;
            const isBuilding = info.ConstructibleClass == "BUILDING";
            const isWonder = info.ConstructibleClass == "WONDER";
            const isImprovement = info.ConstructibleClass == "IMPROVEMENT";
            if (!(isWonder || isBuilding || isImprovement)) {
                continue;
            }
            const notes = [];

            const isComplete = instance.complete;
            const isDamaged = instance.damaged;
            const isExtra = this.extraBuildings.has(info.ConstructibleType);
            const isLarge = this.largeBuildings.has(info.ConstructibleType);
            const isAgeless = this.agelessBuildings.has(info.ConstructibleType);
            const currentAge = GameInfo.Ages.lookup(Game.age).ChronologyIndex;
            const age = isAgeless ? currentAge - 0.5 :
                GameInfo.Ages.lookup(info.Age ?? "")?.ChronologyIndex ?? 0;
            const isObsolete = isBuilding && Math.ceil(age) != currentAge;
            const uniqueTrait =
                isBuilding ?
                GameInfo.Buildings.lookup(info.ConstructibleType).TraitType :
                isImprovement ?
                GameInfo.Improvements.lookup(info.ConstructibleType).TraitType :
                null;
            const isCurrent = isComplete && !isDamaged && !isObsolete && !isExtra;

            if (isDamaged) notes.push("LOC_PLOT_TOOLTIP_DAMAGED");
            if (!isComplete) notes.push("LOC_PLOT_TOOLTIP_IN_PROGRESS");
            if (uniqueTrait) {
                notes.push("LOC_STATE_BZ_UNIQUE");
            } else if (isAgeless && !isWonder) {
                notes.push("LOC_UI_PRODUCTION_AGELESS");
            } else if (isObsolete) {
                notes.push("LOC_STATE_BZ_OBSOLETE");
                const ageName = GameInfo.Ages.lookup(info.Age).Name;
                if (ageName) notes.push(Locale.compose(ageName));
            }
            constructibleInfo.push({
                info, age, isCurrent, isExtra, isLarge, notes, uniqueTrait
            });
        };
        constructibleInfo.sort((a, b) =>
            (b.isExtra ? -1 : b.age) - (a.isExtra ? -1 : a.age));
        return constructibleInfo;
    }
    appendGeographyPanel(loc) {
        // show geographical features
        const terrainLabel = this.getTerrainLabel(loc);
        const biomeLabel = this.getBiomeLabel(loc);
        const featureLabel = this.getFeatureLabel(loc);
        const riverLabel = this.getRiverLabel(loc);
        const continentName = this.getContinentName(loc);
        const distantLandsLabel = this.getDistantLandsLabel(loc);
        const ttGeo = document.createElement("div");
        ttGeo.classList.value = "text-xs leading-tight text-center";
        // show terrain & biome
        const ttTerrain = document.createElement("div");
        ttTerrain.classList.value = "text-secondary font-title uppercase";
        const title = biomeLabel ?
            Locale.compose("{1_TerrainName} {2_BiomeName}", terrainLabel, biomeLabel) :
            terrainLabel;
        ttTerrain.setAttribute('data-l10n-id', title);
        ttGeo.appendChild(ttTerrain);
        if (featureLabel) {
            const tt = document.createElement("div");
            tt.setAttribute('data-l10n-id', featureLabel);
            ttGeo.appendChild(tt);
        }
        if (riverLabel) {
            const tt = document.createElement("div");
            tt.setAttribute('data-l10n-id', riverLabel);
            ttGeo.appendChild(tt);
        }
        if (continentName) {
            const tt = document.createElement("div");
            const text = [continentName, distantLandsLabel].map(e => Locale.compose(e));
            tt.setAttribute('data-l10n-id', dotJoin(text));
            ttGeo.appendChild(tt);
        }
        this.container.appendChild(ttGeo);
    }
    appendHexPanel(loc, city, district) {
        switch (district?.type) {
            case DistrictTypes.CITY_CENTER:
            case DistrictTypes.URBAN:
                this.appendUrbanPanel(loc, city, district);
                break;
            case DistrictTypes.WONDER:
                this.appendWonderPanel(loc);
                break;
            case DistrictTypes.RURAL:
            case DistrictTypes.WILDERNESS:
            default:
                this.appendRuralPanel(loc, city, district);
        }
    }
    appendSettlementPanel(loc, player, city) {
        console.warn(`TRIX ${player.id} ${city?.name}`);
        this.addOwnerInfo(loc, player);
        // TODO
    }
    getPlayerName(player) {
        if (player == null) return "";
        const localPlayerID = GameContext.localPlayerID;
        const name =
            player.id == localPlayerID ?
            Locale.compose("LOC_LEADER_BZ_YOU", player.name) :
            player.isMinor || player.isIndependent ?
            Locale.compose("LOC_LEADER_BZ_PEOPLE_NAME", player.name) :
            Locale.compose(player.name);
        return name;
    }
    getCivName(player, fullName=false) {
        if (player == null) return "";
        const civName = fullName || player.isMinor || player.isIndependent ?
            player.civilizationFullName :  // "Venice"
            player.civilizationName;  // "Spain"
        const name = player.isIndependent ?  // add "Village" to independents
            Locale.compose("LOC_CIVILIZATION_INDEPENDENT_SINGULAR", civName) :
            Locale.compose(civName);
        return name;
    }
    getCivRelationship(player) {
        const localPlayerID = GameContext.localPlayerID;
        // relationship
        if (player.isMinor || player.isIndependent) {
            const hostile = player.Diplomacy?.isAtWarWith(localPlayerID);
            const relationship = hostile ? "LOC_INDEPENDENT_RELATIONSHIP_HOSTILE" : "LOC_INDEPENDENT_RELATIONSHIP_FRIENDLY";
            return relationship;
        }
        // TODO: determine relationships for major civs
        return null;
    }
    getTerrainLabel(loc) {
        const terrainType = GameplayMap.getTerrainType(loc.x, loc.y);
        const terrain = GameInfo.Terrains.lookup(terrainType);
        if (terrain) {
            if (this.isShowingDebug) {
                // despite being "coast" this is a check for a lake
                if (terrain.TerrainType == "TERRAIN_COAST" && GameplayMap.isLake(loc.x, loc.y)) {
                    return Locale.compose('{1_Name} ({2_Value})', "LOC_TERRAIN_LAKE_NAME", terrainType.toString());
                }
                return Locale.compose('{1_Name} ({2_Value})', terrain.Name, terrainType.toString());
            }
            else {
                // despite being "coast" this is a check for a lake
                if (terrain.TerrainType == "TERRAIN_COAST" && GameplayMap.isLake(loc.x, loc.y)) {
                    return "LOC_TERRAIN_LAKE_NAME";
                }
                return terrain.Name;
            }
        }
        else {
            return "";
        }
    }
    getBiomeLabel(loc) {
        const biomeType = GameplayMap.getBiomeType(loc.x, loc.y);
        const biome = GameInfo.Biomes.lookup(biomeType);
        // Do not show a label if marine biome.
        if (biome && biome.BiomeType != "BIOME_MARINE") {
            if (this.isShowingDebug) {
                return Locale.compose('{1_Name} ({2_Value})', biome.Name, biomeType.toString());
            }
            else {
                return biome.Name;
            }
        }
        else {
            return "";
        }
    }
    getResource() {
        if (this.plotCoord) {
            const resourceType = GameplayMap.getResourceType(this.plotCoord.x, this.plotCoord.y);
            return GameInfo.Resources.lookup(resourceType);
        }
        return null;
    }
    getRouteName() {
        const routeType = GameplayMap.getRouteType(this.plotCoord.x, this.plotCoord.y);
        const route = GameInfo.Routes.lookup(routeType);
        const isFerry = GameplayMap.isFerry(this.plotCoord.x, this.plotCoord.y);
        let returnString = "";
        if (route) {
            if (isFerry) {
                returnString = Locale.compose(route.Name) + " " + Locale.compose("LOC_PLOT_DIVIDER_DOT") + " " + Locale.compose("LOC_NAVIGABLE_RIVER_FERRY");
            }
            else {
                returnString = Locale.compose(route.Name);
            }
        }
        return returnString;
    }
    appendPlotEffects(plotIndex) {
        // TODO: placement & formatting
        // PLOTEFFECT_BURNED
        // PLOTEFFECT_DIGSITE_NAME
        // PLOTEFFECT_FLOODED
        // PLOTEFFECT_IS_BURNING_NAME
        // PLOTEFFECT_PLAGUE_NAME
        // PLOTEFFECT_RADIOACTIVE_FALLOUT_NAME
        // PLOTEFFECT_SAND
        // PLOTEFFECT_SNOW_LIGHT
        // PLOTEFFECT_SNOW_MEDIUM
        // PLOTEFFECT_SNOW_HEAVY
        // PLOTEFFECT_STONE_TRAP_NAME
        // PLOTEFFECT_UNIT_FORTIFICATIONS
        const plotEffects = MapPlotEffects.getPlotEffects(plotIndex);
        if (!plotEffects) return;
        const localPlayerID = GameContext.localPlayerID;
        for (const item of plotEffects) {
            if (item.onlyVisibleToOwner && item.owner != localPlayerID) continue;
            const effectInfo = GameInfo.PlotEffects.lookup(item.effectType);
            if (!effectInfo) return;
            this.appendDivider();
            const toolTipPlotEffectsText = document.createElement("div");
            toolTipPlotEffectsText.classList.add("plot-tooltip__plot-effect-text");
            toolTipPlotEffectsText.setAttribute('data-l10n-id', effectInfo.Name);
            this.container.appendChild(toolTipPlotEffectsText);
        }
    }
    getTopUnit(loc) {
        let plotUnits = MapUnits.getUnits(loc.x, loc.y);
        if (plotUnits && plotUnits.length > 0) {
            const topUnit = Units.get(plotUnits[0]);
            return topUnit;
        }
        return null;
    }
    addOwnerInfo(loc, player) {
        const filteredConstructibles = MapConstructibles.getHiddenFilteredConstructibles(loc.x, loc.y);
        const constructibles = MapConstructibles.getConstructibles(loc.x, loc.y);
        if (!player || !Players.isAlive(player.id)) {
            return;
        }
        if (filteredConstructibles.length == 0 && filteredConstructibles.length != constructibles.length) {
            return;
        }
        this.appendDivider();
        const plotTooltipOwner = document.createElement("div");
        plotTooltipOwner.classList.add("plot-tooltip__owner-leader-text");
        const owner = dotJoin([this.getPlayerName(player), this.getCivName(player)]);
        plotTooltipOwner.innerHTML = owner;
        this.container.appendChild(plotTooltipOwner);
        const relationship = this.getCivRelationship(player);
        if (relationship) {
            const plotTooltipOwnerRelationship = document.createElement("div");
            plotTooltipOwnerRelationship.classList.add("plot-tooltip__owner-relationship-text");
            plotTooltipOwnerRelationship.classList.value = "text-xs leading-tight text-center";
            plotTooltipOwnerRelationship.setAttribute('data-l10n-id', relationship);
            this.container.appendChild(plotTooltipOwnerRelationship);
        }
        if (player.isMinor || player.isIndependent) {
            // city-state unique bonus
            // TODO: formatting
            const bonusType = Game.CityStates.getBonusType(player.id);
            const bonus = GameInfo.CityStateBonuses.find(t => t.$hash == bonusType);
            if (bonus) {
                const ttBonusName = document.createElement("div");
                ttBonusName.classList.add("font-title", "text-xs", "uppercase");
                ttBonusName.setAttribute('data-l10n-id', bonus.Name);
                this.container.appendChild(ttBonusName);
                const ttDescription = document.createElement("div");
                ttDescription.classList.value = "text-xs leading-tight text-center";
                ttDescription.setAttribute('data-l10n-id', bonus.Description);
                this.container.appendChild(ttDescription);
            }
        }
    }
    getRiverLabel(loc) {
        const riverType = GameplayMap.getRiverType(loc.x, loc.y);
        if (riverType != RiverTypes.NO_RIVER) {
            let riverNameLabel = GameplayMap.getRiverName(loc.x, loc.y);
            if (!riverNameLabel) {
                switch (riverType) {
                    case RiverTypes.RIVER_MINOR:
                        riverNameLabel = "LOC_MINOR_RIVER_NAME";
                        break;
                    case RiverTypes.RIVER_NAVIGABLE:
                        riverNameLabel = "LOC_NAVIGABLE_RIVER_NAME";
                        break;
                }
            }
            return riverNameLabel;
        }
        else {
            return "";
        }
    }
    getDistantLandsLabel(loc) {
        const localPlayer = Players.get(GameContext.localPlayerID);
        return localPlayer?.isDistantLands(loc) ?
            "LOC_RESOURCE_GENERAL_TYPE_DISTANT_LANDS" : "";
    }
    getFeatureLabel(loc) {
        let label = '';
        const featureType = GameplayMap.getFeatureType(loc.x, loc.y);
        const feature = GameInfo.Features.lookup(featureType);
        if (feature && !feature.Tooltip) {  // BZ
            label = feature.Name;
        }
        if (GameplayMap.isVolcano(loc.x, loc.y)) {
            const active = GameplayMap.isVolcanoActive(loc.x, loc.y);
            const volcanoStatus = (active) ? 'LOC_VOLCANO_ACTIVE' : 'LOC_VOLCANO_NOT_ACTIVE';
            const volcanoName = GameplayMap.getVolcanoName(loc.x, loc.y);
            const volcanoDetailsKey = (volcanoName) ? 'LOC_UI_NAMED_VOLCANO_DETAILS' : 'LOC_UI_VOLCANO_DETAILS';
            label = Locale.compose(volcanoDetailsKey, label, volcanoStatus, volcanoName);
        }
        return label;
    }
    addUnitInfo(loc) {
        const localPlayerID = GameContext.localObserverID;
        if (GameplayMap.getRevealedState(localPlayerID, loc.x, loc.y) != RevealedStates.VISIBLE) {
            return this;
        }
        let topUnit = this.getTopUnit(loc);
        if (topUnit) {
            if (!Visibility.isVisible(localPlayerID, topUnit?.id)) {
                return this;
            }
        }
        else {
            return this;
        }
        const player = Players.get(topUnit.owner);
        if (!player) {
            return this;
        }
        if (player.id == localPlayerID) {
            return this;
        }
        let unitName = Locale.compose(topUnit.name);
        this.appendDivider();
        const toolTipUnitInfo = document.createElement("div");
        toolTipUnitInfo.classList.add("plot-tooltip__unitInfo");
        toolTipUnitInfo.innerHTML = unitName;
        this.container.appendChild(toolTipUnitInfo);
        const plotOwner = GameplayMap.getOwner(this.plotCoord.x, this.plotCoord.y);
        if (plotOwner != topUnit.owner) {
            const toolTipUnitCiv = document.createElement("div");
            toolTipUnitCiv.classList.add("plot-tooltip__Civ-Info");
            if (player.isIndependent) {
                const independentID = Game.IndependentPowers.getIndependentPlayerIDFromUnit(topUnit.id);
                if (independentID != PlayerIds.NO_PLAYER) {
                    const indy = Players.get(independentID);
                    if (indy) {
                        toolTipUnitCiv.innerHTML = Locale.compose("LOC_CIVILIZATION_INDEPENDENT_SINGULAR", Locale.compose(indy.civilizationFullName));
                        this.container.appendChild(toolTipUnitCiv);
                        const relationship = Game.IndependentPowers.getIndependentHostility(independentID, localPlayerID);
                        const toolTipUnitRelationship = document.createElement("div");
                        toolTipUnitRelationship.classList.add("plot-tooltip__Unit-Relationship-Info");
                        toolTipUnitRelationship.innerHTML = Locale.compose("LOC_INDEPENDENT_RELATIONSHIP") + ": " + Locale.compose(relationship);
                        this.container.appendChild(toolTipUnitRelationship);
                    }
                }
            }
            else {
                const toolTipUnitOwner = document.createElement('div');
                toolTipUnitOwner.classList.add('plot-tooltip__owner-leader-text');
                toolTipUnitOwner.innerHTML = Locale.stylize(player.name);
                this.container.appendChild(toolTipUnitOwner);
                toolTipUnitCiv.innerHTML = Locale.compose(player.civilizationFullName);
                this.container.appendChild(toolTipUnitCiv);
            }
        }
        return this;
    }
    collectYields(loc, playerID, city) {
        this.yieldsFlexbox.classList.value = "plot-tooltip__resourcesFlex";
        this.yieldsFlexbox.innerHTML = '';
        this.totalYields = 0;
        const fragment = document.createDocumentFragment();
        // one column per yield type
        GameInfo.Yields.forEach(info => {
            const amount = GameplayMap.getYield(loc.x, loc.y, info.YieldType, playerID);
            if (amount > 0) {
                this.totalYields += amount;
                const col = this.yieldColumn(info.YieldType, amount, info.Name);
                fragment.appendChild(col);
            }
        });
        if (!this.totalYields) return;  // no yields to show
        // total yield column
        const icon = city ? BZ_YIELD_TOTAL_URBAN : BZ_YIELD_TOTAL_RURAL;
        const col = this.yieldColumn(icon, this.totalYields, "LOC_YIELD_BZ_TOTAL");
        fragment.appendChild(col);
        // set column width based on number of digits
        // (class names are misleading, possibly an off-by-one error?)
        const yieldWidth = this.totalYields.toString().length;
        if (yieldWidth > 2) {
            this.yieldsFlexbox.classList.add(yieldWidth == 3 ?
                'resourcesFlex--double-digits' :  // 3-digit numbers
                'resourcesFlex--triple-digits');  // 4-digit numbers
        }
        this.yieldsFlexbox.appendChild(fragment);
    }
    yieldColumn(icon, amount, name) {
        const isTotal = name == "LOC_YIELD_BZ_TOTAL";
        const ttIndividualYieldFlex = document.createElement("div");
        ttIndividualYieldFlex.classList.add("plot-tooltip__IndividualYieldFlex");
        if (isTotal) ttIndividualYieldFlex.classList.add("ml-0\\.5");  // extra room
        const ariaLabel = `${Locale.toNumber(amount)} ${Locale.compose(name)}`;
        ttIndividualYieldFlex.ariaLabel = ariaLabel;
        const yieldIconCSS = UI.getIconCSS(icon, "YIELD");
        const yieldIconShadow = document.createElement("div");
        yieldIconShadow.classList.add("plot-tooltip__IndividualYieldIcons-Shadow");
        yieldIconShadow.style.backgroundImage = yieldIconCSS;
        ttIndividualYieldFlex.appendChild(yieldIconShadow);
        const yieldIcon = document.createElement("div");
        yieldIcon.classList.add("plot-tooltip__IndividualYieldIcons");
        yieldIcon.style.backgroundImage = yieldIconCSS;
        yieldIconShadow.appendChild(yieldIcon);
        const ttIndividualYieldValues = document.createElement("div");
        ttIndividualYieldValues.classList.add("plot-tooltip__IndividualYieldValues", "font-body");
        if (isTotal) ttIndividualYieldValues.classList.add("text-secondary");
        ttIndividualYieldValues.textContent = amount.toString();
        ttIndividualYieldFlex.appendChild(ttIndividualYieldValues);
        return ttIndividualYieldFlex;
    }
    setWarningBannerStyle(element) {
        element.style.setProperty("margin-left", BZ_BORDER_MARGIN);
        element.style.setProperty("margin-right", BZ_BORDER_MARGIN);
        element.style.setProperty("padding-left", BZ_BORDER_PADDING);
        element.style.setProperty("padding-right", BZ_BORDER_PADDING);
        element.style.setProperty("background-color", "#3a0806");
    }
    appendDistrictDefense(loc) {
        const districtID = MapCities.getDistrict(loc.x, loc.y);
        if (!districtID) return;
        // occupation status
        const district = Districts.get(districtID);
        if (district.owner != district.controllingPlayer) {
            const conqueror = Players.get(district.controllingPlayer);
            const conquerorName = this.getCivName(conqueror, true);
            const conquerorText = Locale.compose("{1_Term} {2_Subject}", "LOC_PLOT_TOOLTIP_CONQUEROR", conquerorName);
            const ttConqueror = document.createElement("div");
            ttConqueror.classList.value = "text-xs leading-tight text-center";
            ttConqueror.style.setProperty("color", "#cea92f");  // amber
            this.setWarningBannerStyle(ttConqueror);
            ttConqueror.innerHTML = conquerorText;
            this.container.appendChild(ttConqueror);
        }
        // district health
        const playerID = GameplayMap.getOwner(loc.x, loc.y);
        const playerDistricts = Players.Districts.get(playerID);
        if (!playerDistricts) return;
        // This type is unresolved, is it meant to be number instead?
        const currentHealth = playerDistricts.getDistrictHealth(loc);
        const maxHealth = playerDistricts.getDistrictMaxHealth(loc);
        const isUnderSiege = playerDistricts.getDistrictIsBesieged(loc);
        if (!DistrictHealthManager.canShowDistrictHealth(currentHealth, maxHealth)) {
            return;
        }
        const districtContainer = document.createElement("div");
        districtContainer.classList.add("plot-tooltip__district-container");
        this.setWarningBannerStyle(districtContainer);  // fix margins
        const districtTitle = document.createElement("div");
        districtTitle.classList.add("plot-tooltip__district-title", "plot-tooltip__lineThree");
        districtTitle.innerHTML = isUnderSiege ? Locale.compose("LOC_PLOT_TOOLTIP_UNDER_SIEGE") : Locale.compose("LOC_PLOT_TOOLTIP_HEALING_DISTRICT");
        const districtHealth = document.createElement("div");
        districtHealth.classList.add("plot-tooltip__district-health");
        const healthCaption = document.createElement("div");
        healthCaption.classList.add("plot-tooltip__health-caption", "plot-tooltip__lineThree");
        healthCaption.innerHTML = currentHealth + '/' + maxHealth;
        districtHealth.appendChild(healthCaption);
        districtContainer.appendChild(districtTitle);
        districtContainer.appendChild(districtHealth);
        this.container.appendChild(districtContainer);
    }
    // BZ utility methods
    buildingsTagged(tag) {
        return new Set(GameInfo.TypeTags.filter(e => e.Tag == tag).map(e => e.Type));
    }
    appendUrbanPanel(loc, city, district) {  // includes CITY_CENTER
        const constructibles = this.getConstructibleInfo(loc);
        const buildings = constructibles.filter(e => e.age != -1);
        let hexName = GameInfo.Districts.lookup(district?.type).Name;
        let hexDescription;
        // set name & description
        if (district.type == DistrictTypes.CITY_CENTER) {
            if (city.isTown) {
                // city-state or town hall
                const player = Players.get(city.owner);
                hexName = player.isMinor ?
                    "LOC_DISTRICT_BZ_CITY_STATE" :
                    "LOC_DISTRICT_BZ_TOWN_CENTER";
            }
        } else if (buildings.length == 0) {
            // urban tile with canceled production
            hexName = "LOC_DISTRICT_BZ_URBAN_VACANT";
        } else if (buildings.length >= 2 && buildings.every(b => b.isCurrent)) {
            const unique = buildings[0].uniqueTrait;
            if (buildings.every(b => b.uniqueTrait = unique)) {
                const uq = GameInfo.UniqueQuarters.find(e => e.TraitType == unique);
                hexName = uq.Name;
                hexDescription = uq.Description;
            } else {
                hexName = "LOC_DISTRICT_BZ_URBAN_QUARTER";
            }
        } else {
            hexName = "LOC_DISTRICT_BZ_URBAN_DISTRICT";
        }
        // title bar
        this.appendTitleDivider(Locale.compose(hexName));
        this.appendDistrictDefense(this.plotCoord);
        // panel interior
        const layout = document.createElement("div");
        layout.classList.value = "flex flex-col items-center max-w-80";
        // unique quarter tooltip
        if (hexDescription) layoutRules(layout, hexDescription);
        // constructibles
        layoutConstructibles(layout, constructibles);
        // add to tooltip
        this.container.appendChild(layout);
        // bottom bar
        this.appendUrbanDivider(buildings.filter(e => !e.isExtra));
    }
    appendWonderPanel(loc) {
        const constructibles = this.getConstructibleInfo(loc);
        if (constructibles.length != 1) {
            console.error(`expected exactly one wonder, got ${constructibles.length}`);
            if (!constructibles.length) return;
        }
        const wonder = constructibles[0]?.info;
        const notes = constructibles[0]?.notes;
        this.appendTitleDivider(Locale.compose(wonder.Name));
        const layout = document.createElement("div");
        layout.classList.add("flex", "flex-col", "items-center", "max-w-80");
        if (notes) {
            const ttState = document.createElement("div");
            ttState.classList.value = "leading-none";
            ttState.style.setProperty("font-size", "85%");
            ttState.innerHTML = dotJoin(notes.map(e => Locale.compose(e)));
            layout.appendChild(ttState);
        }
        layoutRules(layout, wonder.Tooltip);
        this.container.appendChild(layout);
        this.appendIconDivider(wonder.ConstructibleType);
    }
    appendRuralPanel(loc, city, district) {
        const constructibles = this.getConstructibleInfo(loc);
        const improvement = constructibles[0]?.info;
        const improvementType = improvement?.ConstructibleType;
        let hexName;
        let hexDescription;
        let hexIcon;
        let resourceIcon;
        // special tile types: natural wonder, resource
        const featureType = GameplayMap.getFeatureType(loc.x, loc.y);
        const feature = GameInfo.Features.lookup(featureType);
        const hexResource = this.getResource();
        // set name & description
        if (feature && feature.Tooltip) {
            hexName = feature.Name;
            hexDescription = feature.Tooltip;
        } else if (hexResource) {
            hexName = hexResource.Name;
            hexDescription = hexResource.Tooltip;
            resourceIcon = hexResource.ResourceType;
        } else if (district?.type) {
            hexName = GameInfo.Districts.lookup(district?.type).Name;
        } else if (!improvement && this.totalYields == 0) {
            return;  // nothing to show and nothing to follow
        } else if (city) {
            hexName = "LOC_DISTRICT_BZ_UNDEVELOPED";
        } else {
            hexName = BZ_WILDERNESS_NAME;
        }
        // get the panel icon and adjust the title if necessary
        if (!improvement) {
            // no improvements, no icon
            hexIcon = null;
        } else if (BZ_VILLAGE_TYPES.includes(improvementType)) {
            // encampments and villages get icons based on their unique improvements,
            // appropriate for the age and minor civ type
            hexName = "LOC_DISTRICT_BZ_INDEPENDENT";
            hexIcon = this.getVillageIcon(loc);
        } else if (improvement?.Discovery) {
            // discoveries don't have a standard icon, so let's use this nice map
            hexName = "LOC_DISTRICT_BZ_DISCOVERY";
            hexIcon = "url('blp:tech_cartography')";
        } else {
            // use the standard icon for the improvement
            hexIcon = improvementType;
        }
        // title bar
        if (hexName) this.appendTitleDivider(Locale.compose(hexName));
        // panel interior
        const layout = document.createElement("div");
        layout.classList.add("flex", "flex-col", "items-center", "max-w-80");
        // optional description
        if (hexDescription) layoutRules(layout, hexDescription);
        // constructibles
        layoutConstructibles(layout, constructibles);
        // add to tooltip
        this.container.appendChild(layout);
        // bottom bar
        if (hexIcon) {
            this.appendIconDivider(hexIcon, resourceIcon);
        } else if (resourceIcon) {
            this.appendIconDivider(resourceIcon);
        } else if (hexDescription) {
            this.appendDivider(resourceIcon);
        }
    }
    getVillageIcon(loc) {
        const villages = {
            "MILITARISTIC": [
                "IMPROVEMENT_HILLFORT",
                "IMPROVEMENT_KASBAH",
                "IMPROVEMENT_SHORE_BATTERY",
            ],
            "CULTURAL": [
                "IMPROVEMENT_MEGALITH",
                "IMPROVEMENT_STONE_HEAD",
                "IMPROVEMENT_OPEN_AIR_MUSEUM",
            ],
            "ECONOMIC": [
                "IMPROVEMENT_SOUQ",
                "IMPROVEMENT_TRADING_FACTORY",
                "IMPROVEMENT_ENTREPOT",
            ],
            "SCIENTIFIC": [
                "IMPROVEMENT_ZIGGURAT",
                "IMPROVEMENT_MONASTERY",
                "IMPROVEMENT_INSTITUTE",
            ]
        };
        // get the minor civ type
        const playerID = GameplayMap.getOwner(loc.x, loc.y);
        const player = Players.get(playerID);
        let ctype = "MILITARISTIC";  // default
        GameInfo.Independents.forEach(i => {
            if (player.civilizationAdjective == i.CityStateName) ctype = i.CityStateType;
        });
        // get the current age
        const age = GameInfo.Ages.lookup(Game.age).ChronologyIndex;
        // select an icon
        const icons = villages[ctype ?? "MILITARISTIC"];
        const icon = icons[Math.min(age, icons.length-1)];
        return icon;
    }
    appendFlexDivider(center, style=null) {
        const layout = document.createElement("div");
        layout.classList.add("flex", "flex-row", "justify-between", "items-center");
        layout.classList.add("self-center", "-mx-6", "flex-auto");
        if (style) layout.classList.add(style);
        this.container.appendChild(layout);
        // left frame
        const lineLeft = document.createElement("div");
        lineLeft.classList.add("h-0\\.5", "flex-auto", "min-w-6", "ml-1\\.5");
        lineLeft.style.setProperty("background-image", "linear-gradient(to left, #8D97A6, rgba(141, 151, 166, 0))");
        layout.appendChild(lineLeft);
        // content
        layout.appendChild(center);
        // right frame
        const lineRight = document.createElement("div");
        lineRight.classList.add("h-0\\.5", "flex-auto", "min-w-6", "mr-1\\.5");
        lineRight.style.setProperty("background-image", "linear-gradient(to right, #8D97A6, rgba(141, 151, 166, 0))");
        layout.appendChild(lineRight);
    }
    appendTitleDivider(text=BZ_DOT_DIVIDER) {
        const layout = document.createElement("div");
        layout.classList.add("self-center", "text-center", "mx-3", "max-w-80");
        layout.classList.add("font-title", "uppercase", "text-sm", "leading-tight");
        layout.innerHTML = text;
        this.appendFlexDivider(layout, "mt-1");
    }
    appendIconDivider(icon, overlay=null) {
        // icon divider with optional overlay
        if (!icon.startsWith("url(")) icon = UI.getIconCSS(icon);
        if (overlay && !overlay.startsWith("url(")) overlay = UI.getIconCSS(overlay);
        const layout = document.createElement("div");
        layout.classList.add("flex-grow", "relative", "my-1");
        const base = document.createElement("div");
        base.classList.add("bg-contain", "bg-center", "size-12", "mx-3");
        base.style.backgroundImage = icon;
        layout.appendChild(base);
        if (overlay) {
            const over = document.createElement("div");
            over.classList.add("bg-contain", "bg-center", "size-9", "mx-3");
            over.classList.add("absolute", "top-1\\.5", "left-1\\.5");
            over.style.backgroundImage = overlay;
            layout.appendChild(over);
        }
        this.appendFlexDivider(layout);
    }
    appendUrbanDivider(buildings) {
        // there are at least two building slots (unless one is large)
        const slots = [...buildings];
        if (slots.length < 2 && !buildings[0]?.isLarge)
            slots.push(...[null, null].slice(buildings.length));
        // render the icons
        const layout = document.createElement("div");
        layout.classList.value = "flex flex-grow relative m-2";
        for (let slot of slots) {
            if (!slot) {
                // show an empty slot with a transparent yield ring
                const ttFrame = document.createElement("div");
                ttFrame.classList.value = "border-2 rounded-full my-1 mx-1\\.5";
                ttFrame.style.setProperty("border-color", "rgba(0, 0, 0, 0)");
                const ttIcon = document.createElement("div");
                ttIcon.classList.value = "bg-contain bg-center size-12";
                ttIcon.style.backgroundImage = UI.getIconCSS("BUILDING_OPEN");
                ttFrame.appendChild(ttIcon);
                layout.appendChild(ttFrame);
                continue;
            }
            // if the building has more than one yield type, like the
            // Palace, use one type for the ring and one for the glow
            const yields = adjacencyYield(slot.info);
            const slotColor = BZ_YIELD_COLOR[yields[0] ?? null];
            const glowColor = BZ_YIELD_COLOR[yields[1] ?? yields[0] ?? null];
            // ring the slot with an appropriate color for the yield
            const ttFrame = document.createElement("div");
            ttFrame.classList.value = "border-2 rounded-full my-1 mx-1\\.5";
            ttFrame.style.setProperty("border-color", slotColor);
            // also glow if the building is fully operational
            if (slot.isCurrent) ttFrame.style.setProperty(
                "box-shadow", `0rem 0rem 0.33333rem 0.16667rem ${glowColor}`);
            // display the icon
            const ttIcon = document.createElement("div");
            ttIcon.classList.value = "bg-contain bg-center size-12";
            ttIcon.style.backgroundImage = UI.getIconCSS(slot.info.ConstructibleType);
            ttFrame.appendChild(ttIcon);
            layout.appendChild(ttFrame);
        }
        this.appendFlexDivider(layout);
    }
}
TooltipManager.registerPlotType('plot', PlotTooltipPriority.LOW, new PlotTooltipType());

//# sourceMappingURL=file:///base-standard/ui/tooltips/plot-tooltip.js.map

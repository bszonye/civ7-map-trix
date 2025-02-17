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

const TEXT_XXS = ["font-size", "0.6666666667rem"];

const BZ_DOT_DIVIDER = Locale.compose("LOC_PLOT_DIVIDER_DOT");

const WILDERNESS_NAME = GameInfo.Districts.lookup(DistrictTypes.WILDERNESS).Name;
const VILLAGE_TYPES = ["IMPROVEMENT_VILLAGE", "IMPROVEMENT_ENCAMPMENT"];

const BZ_BORDER_WIDTH = "0.1111111111rem";
const BZ_BORDER_MARGIN = `calc(${BZ_BORDER_WIDTH} - var(--padding-left-right))`;
const BZ_BORDER_PADDING = `calc(var(--padding-left-right) - ${BZ_BORDER_WIDTH})`;

// TODO: remove these
// const BZ_MAX_WIDTH = "21.3333333333rem";  // from default.css
// const BZ_PADDING_WIDTH = "0.9444444444rem";  // from default.css
// const BZ_ICON_WIDTH = "2.6666666667rem";  // from default.css
// const BZ_ICON_GUTTER = "0.6666666667rem";  // from default.css
// const BZ_INDENT_WIDTH = "3.3333333333rem";  // BZ_ICON_WIDTH + BZ_ICON_GUTTER
// const BZ_OUTSIDE_WIDTH = "1.8888888888rem";  // 2 * BZ_PADDING_WIDTH
const BZ_CONTENT_WIDTH = "19.4444444444rem";  // BZ_MAX_WIDTH - BZ_OUTSIDE_WIDTH
const BZ_DETAIL_WIDTH = "16.1111111111rem";  // BZ_CONTENT_WIDTH - BZ_INDENT_WIDTH

class PlotTooltipType {
    constructor() {
        this.plotCoord = null;
        this.isShowingDebug = false;
        this.tooltip = document.createElement('fxs-tooltip');
        this.container = document.createElement('div');
        this.yieldsFlexbox = document.createElement('div');
        this.totalYields = 0;
        this.tooltip.classList.add('plot-tooltip', 'max-w-96');
        this.tooltip.appendChild(this.container);
        this.agelessBuildings = this.buildingsTagged("AGELESS");
        this.extraBuildings = this.buildingsTagged("IGNORE_DISTRICT_PLACEMENT_CAP");
        Loading.runWhenFinished(() => {
            for (const y of GameInfo.Yields) {
                const url = UI.getIcon(`${y.YieldType}`, "YIELD");
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
        const terrainLabel = this.getTerrainLabel(loc);
        const biomeLabel = this.getBiomeLabel(loc);
        const featureLabel = this.getFeatureLabel(loc);
        const continentName = this.getContinentName(loc);
        const riverLabel = this.getRiverLabel(loc);
        const distantLandsLabel = this.getDistantLandsLabel(loc);
        const routeName = this.getRouteName();
        const hexResource = this.getResource();
        const playerID = GameplayMap.getOwner(loc.x, loc.y);
        const plotIndex = GameplayMap.getIndexFromLocation(loc);
        const cityID = GameplayMap.getOwningCityFromXY(loc.x, loc.y);
        const districtID = MapCities.getDistrict(loc.x, loc.y);
        // city & district objects
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
        // show terrain & biome
        const tooltipFirstLine = document.createElement("div");
        tooltipFirstLine.classList.value = "text-secondary font-title uppercase leading-tight text-center";
        if (biomeLabel) {
            // TODO - Add hard-coded string to localization XML.
            const label = Locale.compose("{1_TerrainName} {2_BiomeName}", terrainLabel, biomeLabel);
            tooltipFirstLine.setAttribute('data-l10n-id', label);
        }
        else {
            tooltipFirstLine.setAttribute('data-l10n-id', terrainLabel);
        }
        this.container.appendChild(tooltipFirstLine);
        // show major geographical features
        const geoStyle = "text-sm leading-tight text-center";
        if (featureLabel) {
            const ttFeature = document.createElement("div");
            ttFeature.classList.value = geoStyle;
            ttFeature.setAttribute('data-l10n-id', featureLabel);
            this.container.appendChild(ttFeature);
        }
        this.appendDotList([continentName, riverLabel], geoStyle);
        if (continentName && distantLandsLabel) {
            const ttLand = document.createElement("div");
            ttLand.style.setProperty(...TEXT_XXS);
            ttLand.classList.value = "leading-none text-center";
            ttLand.setAttribute('data-l10n-id', distantLandsLabel);
            this.container.appendChild(ttLand);
        }
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
        if (city) this.appendSettlementPanel(loc, city, playerID);
        // determine the hex tile type
        // hex tile panel
        this.appendHexPanel(loc, city, district);
        // yields panel
        // TODO: refactor this into a method
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
        //debug info
        if (this.isShowingDebug) {
            const tooltipDebugFlexbox = document.createElement("div");
            tooltipDebugFlexbox.classList.add("plot-tooltip__debug-flexbox");
            this.container.appendChild(tooltipDebugFlexbox);
            this.appendDivider();
            const playerID = GameplayMap.getOwner(loc.x, loc.y);
            const currHp = Players.Districts.get(playerID)?.getDistrictHealth(loc);
            const maxHp = Players.Districts.get(playerID)?.getDistrictMaxHealth(loc);
            const toolTipDebugTitle = document.createElement("div");
            toolTipDebugTitle.classList.add("plot-tooltip__debug-title-text");
            if ((currHp != undefined && currHp != 0) && (maxHp != undefined && maxHp != 0)) {
                toolTipDebugTitle.innerHTML = Locale.compose("LOC_PLOT_TOOLTIP_DEBUG_TITLE") + ": " + currHp + " / " + maxHp;
                tooltipDebugFlexbox.appendChild(toolTipDebugTitle);
            }
            else {
                toolTipDebugTitle.innerHTML = Locale.compose("LOC_PLOT_TOOLTIP_DEBUG_TITLE") + ":";
                tooltipDebugFlexbox.appendChild(toolTipDebugTitle);
            }
            const toolTipDebugPlotCoord = document.createElement("div");
            toolTipDebugPlotCoord.classList.add("plot-tooltip__coordinate-text");
            toolTipDebugPlotCoord.innerHTML = Locale.compose("LOC_PLOT_TOOLTIP_PLOT") + `: (${loc.x},${loc.y})`;
            tooltipDebugFlexbox.appendChild(toolTipDebugPlotCoord);
            const toolTipDebugPlotIndex = document.createElement("div");
            toolTipDebugPlotIndex.classList.add("plot-tooltip__coordinate-text");
            toolTipDebugPlotIndex.innerHTML = Locale.compose("LOC_PLOT_TOOLTIP_INDEX") + `: ${plotIndex}`;
            tooltipDebugFlexbox.appendChild(toolTipDebugPlotIndex);
            const localPlayer = Players.get(GameContext.localPlayerID);
            if (localPlayer != null) {
                if (localPlayer.isDistantLands(loc)) {
                    const toolTipDebugPlotTag = document.createElement("div");
                    toolTipDebugPlotTag.classList.add("plot-tooltip__coordinate-text");
                    toolTipDebugPlotTag.innerHTML = Locale.compose("LOC_PLOT_TOOLTIP_HEMISPHERE_WEST");
                    tooltipDebugFlexbox.appendChild(toolTipDebugPlotTag);
                }
                else {
                    const toolTipDebugPlotTag = document.createElement("div");
                    toolTipDebugPlotTag.classList.add("plot-tooltip__coordinate-text");
                    toolTipDebugPlotTag.innerHTML = Locale.compose("LOC_PLOT_TOOLTIP_HEMISPHERE_EAST");
                    tooltipDebugFlexbox.appendChild(toolTipDebugPlotTag);
                }
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
    appendTooltipInformation(title, text, icon) {  // TODO: remove
        this.appendDivider();
        const layout = document.createElement("div");
        layout.classList.add("flex", "flex-row");
        if (icon) {
            const iconContainer = document.createElement("div");
            iconContainer.classList.add("flex", "flex-col", "justify-center");
            layout.appendChild(iconContainer);
            const iconElement = document.createElement("div");
            iconElement.classList.add("plot-tooltip__large-resource-icon", "mt-2");
            iconElement.style.backgroundImage = icon;
            iconContainer.appendChild(iconElement);
        }
        if (text || title) {
            const textContainer = document.createElement("div");
            textContainer.classList.add("flex", "flex-col", "flex-auto");
            layout.appendChild(textContainer);
            const titleElement = document.createElement("div");
            titleElement.classList.add("font-title", "text-sm", "uppercase");
            titleElement.setAttribute("data-l10n-id", title);
            textContainer.appendChild(titleElement);
            if (text) {
                for (const textLine of text) {
                    const textElement = document.createElement("div");
                    textElement.innerHTML = Locale.stylize(textLine);
                    textContainer.appendChild(textElement);
                }
            }
        }
        this.container.appendChild(layout);
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
        const agelessTypes = new Set(GameInfo.TypeTags.filter(e => e.Tag == "AGELESS").map(e => e.Type));
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
            const state = [];

            const isExtra = this.extraBuildings.has(info.ConstructibleType);
            const isAgeless = this.agelessBuildings.has(info.ConstructibleType);
            const currentAge = GameInfo.Ages.lookup(Game.age).ChronologyIndex;
            const buildingAge = isAgeless ? currentAge :
                GameInfo.Ages.lookup(info.Age ?? "")?.ChronologyIndex ?? 0;
            const isObsolete = isBuilding && buildingAge != currentAge;
            const uniqueTrait =
                isBuilding ?
                GameInfo.Buildings.lookup(info.ConstructibleType).TraitType :
                isImprovement ?
                GameInfo.Improvements.lookup(info.ConstructibleType).TraitType :
                null;

            if (instance.damaged) state.push("LOC_PLOT_TOOLTIP_DAMAGED");
            if (!instance.complete) state.push("LOC_PLOT_TOOLTIP_IN_PROGRESS");
            if (uniqueTrait) {
                state.push("LOC_STATE_BZ_UNIQUE");
            } else if (isAgeless && !isWonder) {
                state.push("LOC_UI_PRODUCTION_AGELESS");
            } else if (isObsolete) {
                state.push("LOC_STATE_BZ_OBSOLETE");
                const ageName = GameInfo.Ages.lookup(info.Age).Name;
                if (ageName) state.push(Locale.compose(ageName));
            }
            // sort by age, with ageless buildings second and walls last
            const sortOrder = isExtra ? -1 : isAgeless ? currentAge - 0.5 : buildingAge;
            constructibleInfo.push({info, uniqueTrait, state, sortOrder});
        };
        constructibleInfo.sort((a, b) => b.sortOrder - a.sortOrder);
        return constructibleInfo;
    }
    // TODO: remove
    BZaddConstructibleInformation(plotCoordinate) {
        const thisAgeBuildings = [];
        const previousAgeBuildings = [];
        const extraBuildings = [];
        const wonders = [];
        const improvements = [];
        const constructibles = MapConstructibles.getHiddenFilteredConstructibles(plotCoordinate.x, plotCoordinate.y);
        const buildingStatus = {
            Unique: new Array(),
            CurrentAge: new Array(),
            PreviousAge: new Array(),
            Extras: new Array(),
            Wonder: new Array(),
            Improvements: new Array()
        };
        constructibles.forEach((item) => {
            const instance = Constructibles.getByComponentID(item);
            if (!instance || instance.location.x != plotCoordinate.x || instance.location.y != plotCoordinate.y) return;
            const info = GameInfo.Constructibles.lookup(instance.type);
            if (!info) return;
            if (info.ConstructibleClass == "BUILDING") {
                const info = GameInfo.Constructibles.lookup(instance.type);
                if (!info) {
                    console.warn("Building constructible without a definition: " + instance.type.toString());
                    return;
                }
                // determine building age
                const iCurrentAge = Game.age;
                const iBuildingAge = Database.makeHash(info.Age ?? "");
                const isAgeless = this.agelessBuildings.has(info.ConstructibleType);
                const isObsolete = !isAgeless && iBuildingAge != iCurrentAge;
                const isExtra = this.extraBuildings.has(info.ConstructibleType);
                const uniqueTrait = GameInfo.Buildings.lookup(info.ConstructibleType).TraitType;
                let ageLabel;
                if (!info) {
                    ageLabel = Locale.compose("LOC_BZ_ERROR_UNKNOWN");
                }
                else if (uniqueTrait) {
                    ageLabel = Locale.compose("LOC_STATE_BZ_UNIQUE");
                    if (!isExtra) buildingStatus.Unique.push(uniqueTrait);
                }
                else if (isAgeless) {
                    ageLabel = Locale.compose("LOC_STATE_BZ_AGELESS");
                }
                else if (isObsolete) {
                    ageLabel = Locale.compose("LOC_STATE_BZ_OBSOLETE");
                }
                // get status (damaged, in progress)
                let statusLabel;
                if (instance.damaged) {
                    statusLabel = Locale.compose("LOC_PLOT_TOOLTIP_DAMAGED");
                }
                else if (!instance.complete) {
                    statusLabel = Locale.compose("LOC_PLOT_TOOLTIP_IN_PROGRESS");
                }
                // format type & status
                const buildingLabel = this.dotJoin([ageLabel, statusLabel]);
                if (this.extraBuildings.has(info.ConstructibleType)) {
                    extraBuildings.push(info);
                    buildingStatus.Extras.push(buildingLabel);
                }
                else if (isObsolete) {
                    previousAgeBuildings.push(info);
                    buildingStatus.PreviousAge.push(buildingLabel);
                }
                else {
                    thisAgeBuildings.push(info);
                    buildingStatus.CurrentAge.push(buildingLabel);
                }
            }
            else if (info.ConstructibleClass == "WONDER") {
                const info = GameInfo.Constructibles.lookup(instance.type);
                if (!info) {
                    console.warn("Wonder constructible without a definition: " + instance.type.toString());
                    return;
                }
                if (instance.damaged) {
                    buildingStatus.Wonder.push(Locale.compose("LOC_PLOT_TOOLTIP_DAMAGED"));
                }
                else if (!instance.complete) {
                    buildingStatus.Wonder.push(Locale.compose("LOC_PLOT_TOOLTIP_IN_PROGRESS"));
                }
                else {
                    buildingStatus.Wonder.push('');
                }
                wonders.push(info);
            }
            else if (info.ConstructibleClass == "IMPROVEMENT") {
                const info = GameInfo.Constructibles.lookup(instance.type);
                if (!info) {
                    console.warn("Improvement constructible without a definition: " + instance.type.toString());
                    return;
                }
                if (instance.damaged) {
                    buildingStatus.Improvements.push(Locale.compose("LOC_PLOT_TOOLTIP_DAMAGED"));
                }
                else if (!instance.complete) {
                    buildingStatus.Improvements.push(Locale.compose("LOC_PLOT_TOOLTIP_IN_PROGRESS"));
                }
                else {
                    buildingStatus.Improvements.push('');
                }
                improvements.push(info);
            }
            else {
                // unknown constructible type
                console.warn("Unknown constructible type: " + info.ConstructibleClass);
                improvements.push(Locale.compose("LOC_BZ_ERROR_UNKNOWN"));
                buildingStatus.Improvements.push('');
            }
        });
        // determine the tile type
        const districtID = MapCities.getDistrict(plotCoordinate.x, plotCoordinate.y);
        const cityID = GameplayMap.getOwningCityFromXY(plotCoordinate.x, plotCoordinate.y);
        const city = cityID ? Cities.get(cityID) : null;
        if (districtID) {
            // city center, quarter, district, wonder, or rural improvement
            const district = Districts.get(districtID);
            const districtType = district?.type ?? DistrictTypes.WILDERNESS;
            // check for special cases: town center, quarter, district
            let tileType;
            if (districtType == DistrictTypes.CITY_CENTER) {
                // possibly a town center, village, or encampment
                if (city?.isTown) {
                    // TODO: distinguish between towns and city-states
                    // tileType = Locale.compose("LOC_DISTRICT_BZ_CITY_STATE");
                    // TODO: also rename "City Hall" to "Town Hall" in towns?
                    tileType = Locale.compose("LOC_DISTRICT_BZ_TOWN_CENTER");
                }
            }
            else if (districtType == DistrictTypes.URBAN) {
                // quarter or district
                if (thisAgeBuildings.length == 2) {
                    const unique = buildingStatus.Unique;
                    if (unique.length == 2 && unique[0] == unique[1]) {
                        // unique quarter
                        const uq = GameInfo.UniqueQuarters.find(e => e.TraitType == unique[0]);
                        tileType = Locale.compose(uq.Name);
                    }
                    // quarter (two current buildings)
                    else tileType = Locale.compose("LOC_DISTRICT_BZ_URBAN_QUARTER");
                }
                else if (thisAgeBuildings.length || previousAgeBuildings.length) {
                    // district (at least one building)
                    tileType = Locale.compose("LOC_DISTRICT_BZ_URBAN_DISTRICT");
                }
                else {
                    // vacant district (canceled building production)
                    tileType = Locale.compose("LOC_DISTRICT_BZ_URBAN_VACANT");
                }
            }
            if (!tileType) {
                // city center, wonder, or rural improvement
                const districtDefinition = GameInfo.Districts.lookup(districtType);
                tileType = Locale.compose(districtDefinition.Name);
            }
            this.appendTitleDivider(tileType);
        }
        else if (city) {
            this.appendTitleDivider(Locale.compose("LOC_DISTRICT_BZ_UNDEVELOPED"));
        }
        else {
            this.appendTitleDivider(WILDERNESS_NAME);
        }
        this.appendConstructibleList(thisAgeBuildings, buildingStatus.CurrentAge);
        this.appendConstructibleList(previousAgeBuildings, buildingStatus.PreviousAge);
        this.appendConstructibleList(extraBuildings, buildingStatus.Extras);
        this.appendConstructibleList(wonders, buildingStatus.Wonder);
        this.appendConstructibleList(improvements, buildingStatus.Improvements);
    }
    appendHexPanel(loc, city, district) {
        switch (district?.type) {
            case DistrictTypes.CITY_CENTER:
            case DistrictTypes.URBAN:
                this.appendUrbanPanel(loc, city, district);
                break;
            case DistrictTypes.WONDER:
                this.appendWonderPanel(loc, city, district);
                break;
            case DistrictTypes.RURAL:
            case DistrictTypes.WILDERNESS:
            default:
                this.appendRuralPanel(loc, city, district);
        }
        // TODO: anything else?
        return;
        // TODO: is any of this still useful?
        if (districtID) {
            // city center, quarter, district, wonder, or rural improvement
            const districtType = district?.type ?? DistrictTypes.WILDERNESS;
            // check for special cases: town center, quarter, district
            let tileType;
            if (districtType == DistrictTypes.CITY_CENTER) {
                // possibly a town center, village, or encampment
                if (city?.isTown) {
                    // TODO: handle minors & villages
                    tileType = Locale.compose("LOC_DISTRICT_BZ_TOWN_CENTER");
                }
            }
            else if (districtType == DistrictTypes.URBAN) {
                // quarter or district
                if (thisAgeBuildings.length == 2) {
                    const unique = buildingStatus.Unique;
                    if (unique.length == 2 && unique[0] == unique[1]) {
                        // unique quarter
                        const uq = GameInfo.UniqueQuarters.find(e => e.TraitType == unique[0]);
                        tileType = Locale.compose(uq.Name);
                    }
                    // quarter (two current buildings)
                    else tileType = Locale.compose("LOC_DISTRICT_BZ_URBAN_QUARTER");
                }
                else if (thisAgeBuildings.length || previousAgeBuildings.length) {
                    // district (at least one building)
                    tileType = Locale.compose("LOC_DISTRICT_BZ_URBAN_DISTRICT");
                }
                else {
                    // vacant district (canceled building production)
                    tileType = Locale.compose("LOC_DISTRICT_BZ_URBAN_VACANT");
                }
            }
            if (!tileType) {
                // city center, wonder, or rural improvement
                const districtDefinition = GameInfo.Districts.lookup(districtType);
                tileType = Locale.compose(districtDefinition.Name);
            }
            this.appendTitleDivider(tileType);
        }
        else if (city) {
            this.appendTitleDivider(Locale.compose("LOC_DISTRICT_BZ_UNDEVELOPED"));
        }
        else {
            this.appendTitleDivider(WILDERNESS_NAME);
        }
    }
    appendSettlementPanel(loc, city, playerID) {
        this.addOwnerInfo(loc, playerID);
        // TODO
    }
    getPlayerName(playerID=null) {
        playerID = playerID ?? GameplayMap.getOwner(this.plotCoord.x, this.plotCoord.y);
        const player = Players.get(playerID);
        if (player == null) {
            return "";
        }
        const localPlayerID = GameContext.localPlayerID;
        const civ = GameInfo.Civilizations.lookup(player.civilizationType);
        const name =
            playerID == localPlayerID ?
            Locale.compose("LOC_LEADER_BZ_YOU", player.name) :
            player.isMinor || player.isIndependent ?
            Locale.compose("LOC_LEADER_BZ_PEOPLE_NAME", player.name) :
            Locale.compose(player.name);
        return name;
    }
    getCivName(playerID=null, fullName=false) {
        playerID = playerID ?? GameplayMap.getOwner(this.plotCoord.x, this.plotCoord.y);
        const player = Players.get(playerID);
        if (player == null) {
            return "";
        }
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
    addOwnerInfo(loc, playerID) {
        const filteredConstructibles = MapConstructibles.getHiddenFilteredConstructibles(loc.x, loc.y);
        const constructibles = MapConstructibles.getConstructibles(loc.x, loc.y);
        const player = Players.get(playerID);
        if (!player || !Players.isAlive(playerID)) {
            return;
        }
        if (filteredConstructibles.length == 0 && filteredConstructibles.length != constructibles.length) {
            return;
        }
        this.appendDivider();
        const plotTooltipOwner = document.createElement("div");
        plotTooltipOwner.classList.add("plot-tooltip__owner-leader-text");
        const owner = this.dotJoin([this.getPlayerName(), this.getCivName()]);
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
            // city-state unique bonus (not very useful)
            const bonusType = Game.CityStates.getBonusType(playerID);
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
        const localPlayerID = GameContext.localPlayerID;
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
        const icon = city ? "CITY_URBAN" : "CITY_RURAL";
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
        const ttIndividualYieldFlex = document.createElement("div");
        ttIndividualYieldFlex.classList.add("plot-tooltip__IndividualYieldFlex");
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
            const conquerorName = this.getCivName(district.controllingPlayer, true);
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
    dotJoin(list) {
        // join text with dots after removing empty elements
        return list.filter(e => e).join(" " + BZ_DOT_DIVIDER + " ");
    }
    appendDotList(list, style=null) {
        list = list.filter(e => e);  // remove empty elements
        if (!list.length) return;
        const ttList = document.createElement("div");
        if (style) ttList.classList.value = style;
        if (list.length == 1) {
            ttList.setAttribute('data-l10n-id', list[0]);
        } else {
            list = list.map(e => Locale.compose(e));
            ttList.innerHTML = list.join(" " + BZ_DOT_DIVIDER + " ");
        }
        this.container.appendChild(ttList);
    }
    appendRuralPanel(loc, city, district) {
        let hexName;
        let hexDescription;
        let hexIcon;
        let resourceIcon;
        // special tile types: natural wonder, resource
        const featureType = GameplayMap.getFeatureType(loc.x, loc.y);
        const feature = GameInfo.Features.lookup(featureType);
        const hexResource = this.getResource();
        const improvements = this.getConstructibleInfo(loc);
        const impInfo = improvements[0]?.info;
        const impType = impInfo?.ConstructibleType;
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
        } else if (improvements.length == 0 && this.totalYields == 0) {
            return;  // nothing to show and nothing to follow
        } else if (city) {
            hexName = "LOC_DISTRICT_BZ_UNDEVELOPED";
        } else {
            hexName = WILDERNESS_NAME;
        }
        // get the panel icon and adjust the title if necessary
        if (improvements.length == 0) {
            // no improvements, no icon
            hexIcon = null;
        } else if (VILLAGE_TYPES.includes(impType)) {
            // encampments and villages get icons based on their unique improvements,
            // appropriate for the age and minor civ type
            hexName = "LOC_DISTRICT_BZ_INDEPENDENT";
            hexIcon = this.getVillageIcon(loc);
        } else if (impInfo?.Discovery) {
            // discoveries don't have a standard icon, so let's use this nice map
            hexName = "LOC_DISTRICT_BZ_DISCOVERY";
            hexIcon = "url('blp:tech_cartography')";
        } else {
            // use the standard icon for the improvement
            hexIcon = impType;
        }
        // title bar
        if (hexName) this.appendTitleDivider(Locale.compose(hexName));
        // TODO: move this to the urban panel
        this.appendDistrictDefense(this.plotCoord);
        // panel interior
        const layout = document.createElement("div");
        layout.classList.add("flex", "flex-col", "items-center", "max-w-80");
        // optional description
        if (hexDescription) {
            // TODO: improve spacing
            const ttDescription = document.createElement("div");
            ttDescription.classList.value = "text-xs leading-tight text-center my-1";
            // ttDescription.style.setProperty(...DEBUG_GRAY);
            ttDescription.setAttribute('data-l10n-id', hexDescription);
            layout.appendChild(ttDescription);
        }
        // constructibles
        for (const imp of improvements) {
            // TODO: adjust spacing
            const ttConstructible = document.createElement("div");
            ttConstructible.classList.value = "flex-col items-center mt-1";
            const ttName = document.createElement("div");
            ttName.classList.value = "font-title uppercase text-xs leading-tight text-accent-2 text-center";
            // ttName.style.setProperty(...DEBUG_RED);
            ttName.setAttribute("data-l10n-id", imp.info.Name);
            ttConstructible.appendChild(ttName);
            const state = this.dotJoin([...imp.state.map(e => Locale.compose(e))]);
            if (state) {
                const ttState = document.createElement("div");
                ttState.style.setProperty(...TEXT_XXS);
                ttState.classList.value = "leading-none text-center";
                // ttState.style.setProperty(...DEBUG_GREEN);
                ttState.innerHTML = state;
                ttConstructible.appendChild(ttState);
            }
            layout.appendChild(ttConstructible);
        }
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
    appendUrbanPanel(loc, city, district) {  // includes CITY_CENTER
        // TODO
    }
    appendWonderPanel(loc, city, district) {
        // TODO
    }
    getVillageIcon(loc) {
        const villages = {
            "MILITARISTIC": [
                "IMPROVEMENT_HILLFORT",
                "IMPROVEMENT_KASBAH",
                "IMPROVEMENT_SHORE_BATTERY"
            ],
            "CULTURAL": [
                "IMPROVEMENT_MEGALITH",
                "IMPROVEMENT_STONE_HEAD",
                "IMPROVEMENT_OPEN_AIR_MUSEUM"
            ],
            "ECONOMIC": [
                "IMPROVEMENT_SOUQ",
                "IMPROVEMENT_TRADING_FACTORY",
                "IMPROVEMENT_ENTREPOT"
            ],
            "SCIENTIFIC": [
                "IMPROVEMENT_ZIGGURAT",
                "IMPROVEMENT_MONASTERY",
                "IMPROVEMENT_INSTITUTE"
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
    appendFlexDivider(center) {
        const layout = document.createElement("div");
        layout.classList.add("flex", "flex-row", "justify-between", "items-center");
        layout.classList.add("self-center", "-mx-6", "flex-auto");
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
        layout.classList.add("self-center", "text-center", "mt-1", "mx-3", "max-w-80");
        layout.classList.add("font-title", "uppercase", "text-sm", "leading-tight");
        layout.innerHTML = text;
        this.appendFlexDivider(layout);
    }
    appendIconDivider(icon, overlay=null) {
        // icon divider with optional overlay
        if (!icon.startsWith("url(")) icon = UI.getIconCSS(icon);
        if (overlay && !overlay.startsWith("url(")) overlay = UI.getIconCSS(overlay);
        const layout = document.createElement("div");
        layout.classList.add("flex-grow", "relative", "mt-1");
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
    appendUrbanDivider(icons, extras=[]) {
        // make sure there are at least two buildings, and stick extras in the middle
        const empty = "BUILDING_OPEN";
        const b1 = icons.length < 1 ? [empty] : [icons[0]];
        const b2 = icons.length < 2 ? [empty] : icons.slice(1);
        const buildings = [...b1, ...extras, ...b2];
        // render the icons
        const layout = document.createElement("div");
        layout.classList.add("flex", "flex-grow", "relative", "mt-2", "mx-2");
        for (let i = 0; i < buildings.length; i++) {
            const ttIcon = document.createElement("div");
            ttIcon.classList.add("bg-contain", "bg-center", "size-12", "mx-1");
            const icon = buildings[i];
            if (!icon.startsWith("url(")) icon = UI.getIconCSS(icon);
            ttIcon.style.backgroundImage = icon;
            layout.appendChild(ttIcon);
        }
        this.appendFlexDivider(layout);
    }
    // TODO: remove
    iconBlock(icon, name, notes, description) {
        const ttIconBlock = document.createElement("div");
        ttIconBlock.classList.add("plot-tooltip__resource-container");
        // ttIconBlock.style.setProperty(...DEBUG_GRAY);
        ttIconBlock.style.setProperty("max-width", BZ_CONTENT_WIDTH);
        ttIconBlock.style.setProperty("margin-bottom", "0.167rem");
        const ttIcon = document.createElement("div");
        ttIcon.classList.add("plot-tooltip__large-resource-icon");
        const ttIconCSS = UI.getIconCSS(icon);
        ttIcon.style.backgroundImage = ttIconCSS;
        ttIcon.style.setProperty("background-size", "contain");
        if (!description) {
            // use a smaller icon for buildings & improvements
            ttIcon.style.setProperty("width", "2rem");
            ttIcon.style.setProperty("height", "2rem");
            ttIcon.style.setProperty("margin-right", "1rem");
            ttIconBlock.style.setProperty("margin-left", "0.3333333333rem");
            ttIconBlock.style.setProperty("margin-right", "0.3333333333rem");
            // also center the text vertically
            ttIconBlock.style.setProperty("align-items", "center");
            ttIconBlock.style.setProperty("width", "auto");
        }
        ttIcon.style.setProperty("flex", "none");
        ttIconBlock.appendChild(ttIcon);
        const ttTextColumn = document.createElement("div");
        ttTextColumn.classList.add("plot-tooltip__resource-details");
        // ttTextColumn.style.setProperty(...DEBUG_RED);
        ttTextColumn.style.setProperty("max-width", BZ_DETAIL_WIDTH);
        const ttName = document.createElement("div");
        ttName.classList.value = 'font-title text-xs text-accent-2 mt-1 uppercase';
        // ttName.style.setProperty(...DEBUG_RED);
        ttName.setAttribute("data-l10n-id", name);
        ttTextColumn.appendChild(ttName);
        if (notes) {
            const ttNotes = document.createElement("div");
            ttNotes.classList.add("plot-tooltip__resource-label_description");
            // ttNotes.style.setProperty(...DEBUG_RED);
            ttNotes.style.setProperty("margin-top", "-0.111rem");
            ttNotes.style.setProperty("margin-bottom", "0.222rem");
            ttNotes.style.setProperty("font-size", "0.667rem");
            ttNotes.style.setProperty("line-height", "0.667rem");
            ttNotes.innerHTML = notes;
            ttTextColumn.appendChild(ttNotes);
        }
        if (description) {
            ttIconBlock.style.setProperty("margin-top", "0.167rem");  // leave a little extra room
            ttTextColumn.style.setProperty("flex", "auto");
            const ttDescription = document.createElement("div");
            ttDescription.classList.add("plot-tooltip__resource-label_description");
            // ttDescription.style.setProperty(...DEBUG_BLUE);
            ttDescription.setAttribute("data-l10n-id", description);
            ttTextColumn.appendChild(ttDescription);
        }
        ttIconBlock.appendChild(ttTextColumn);
        return ttIconBlock;
    }
    // TODO: remove
    appendConstructibleList(infoList, statusList) {
        for (let i = 0; i < infoList.length; i++) {
            const info = infoList[i];
            const icon = info.ConstructibleType;
            const notes = statusList[i];
            const desc = info.ConstructibleClass == "WONDER" ? info.Description : null;
            const ttIconBlock = this.iconBlock(icon, info.Name, notes, desc);
            this.container.appendChild(ttIconBlock);
        }
    }
}
TooltipManager.registerPlotType('plot', PlotTooltipPriority.LOW, new PlotTooltipType());

//# sourceMappingURL=file:///base-standard/ui/tooltips/plot-tooltip.js.map

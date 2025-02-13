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

const BZ_DOT_DIVIDER = Locale.compose("LOC_PLOT_DIVIDER_DOT");

// TODO: remove these
const BZ_MAX_WIDTH = "21.3333333333rem";  // from default.css
const BZ_BORDER_WIDTH = "0.0555555556rem";  // from default.css
const BZ_PADDING_WIDTH = "0.9444444444rem";  // from default.css
const BZ_ICON_WIDTH = "2.6666666667rem";  // from default.css
const BZ_ICON_GUTTER = "0.6666666667rem";  // from default.css
const BZ_OUTSIDE_WIDTH = "calc(2*(" + BZ_BORDER_WIDTH + "+" + BZ_PADDING_WIDTH + "))";
const BZ_CONTENT_WIDTH = "calc(" + BZ_MAX_WIDTH + "-" + BZ_OUTSIDE_WIDTH + ")";
const BZ_INDENT_WIDTH = "calc(" + BZ_ICON_WIDTH + "+" + BZ_ICON_GUTTER + ")";
const BZ_DETAIL_WIDTH = "calc(" + BZ_CONTENT_WIDTH + "-" + BZ_INDENT_WIDTH + ")";

class PlotTooltipType {
    constructor() {
        this.plotCoord = null;
        this.isShowingDebug = false;
        this.tooltip = document.createElement('fxs-tooltip');
        this.container = document.createElement('div');
        this.yieldsFlexbox = document.createElement('div');
        this.tooltip.classList.add('plot-tooltip', 'max-w-96');
        this.tooltip.appendChild(this.container);
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
    }
    update() {
        if (this.plotCoord == null) {
            console.error("Tooltip was unable to read plot values due to a coordinate error.");
            return;
        }
        this.isShowingDebug = UI.isDebugPlotInfoVisible(); // Ensure debug status hasn't changed
        // Obtain names and IDs
        const plotCoord = this.plotCoord;
        const terrainLabel = this.getTerrainLabel(plotCoord);
        const biomeLabel = this.getBiomeLabel(plotCoord);
        const featureLabel = this.getFeatureLabel(plotCoord);
        const continentName = this.getContinentName(plotCoord);
        const riverLabel = this.getRiverLabel(plotCoord);
        const routeName = this.getRouteName();
        const hexResource = this.getResource();
        const playerID = GameplayMap.getOwner(plotCoord.x, plotCoord.y);
        const plotIndex = GameplayMap.getIndexFromLocation(plotCoord);
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
            else if (!GameplayMap.isWater(this.plotCoord.x, this.plotCoord.y) && !GameplayMap.isImpassable(this.plotCoord.x, this.plotCoord.y) && !GameplayMap.isNavigableRiver(this.plotCoord.x, this.plotCoord.y)) {
                //Dont't add any extra tooltip to mountains, oceans, or navigable rivers, should be obvious enough w/o them
                const settlerTooltip = document.createElement("div");
                settlerTooltip.classList.add("plot-tooltip__settler-tooltip");
                const localPlayerAdvancedStart = localPlayer?.AdvancedStart;
                if (localPlayerAdvancedStart === undefined) {
                    console.error("plot-tooltip: Attempting to update settler tooltip, but no valid local player advanced start object!");
                    return;
                }
                //Show why we can't settle here
                if (!GameplayMap.isPlotInAdvancedStartRegion(GameContext.localPlayerID, this.plotCoord.x, this.plotCoord.y) && !localPlayerAdvancedStart?.getPlacementComplete()) {
                    settlerTooltip.classList.add("blocked-location");
                    settlerTooltip.innerHTML = Locale.compose("LOC_PLOT_TOOLTIP_CANT_SETTLE_TOO_FAR");
                }
                else if (!localPlayerDiplomacy.isValidLandClaimLocation(this.plotCoord, true /*bIgnoreFriendlyUnitRequirement*/)) {
                    settlerTooltip.classList.add("blocked-location");
                    if (GameplayMap.isCityWithinMinimumDistance(this.plotCoord.x, this.plotCoord.y)) {
                        settlerTooltip.innerHTML = Locale.compose("LOC_PLOT_TOOLTIP_CANT_SETTLE_TOO_CLOSE");
                    }
                    else if (GameplayMap.getResourceType(this.plotCoord.x, this.plotCoord.y) != ResourceTypes.NO_RESOURCE) {
                        settlerTooltip.innerHTML = Locale.compose("LOC_PLOT_TOOLTIP_CANT_SETTLE_RESOURCES");
                    }
                }
                else if (!GameplayMap.isFreshWater(this.plotCoord.x, this.plotCoord.y)) {
                    settlerTooltip.classList.add("okay-location");
                    settlerTooltip.innerHTML = Locale.compose("LOC_PLOT_TOOLTIP_NO_FRESH_WATER");
                }
                this.container.appendChild(settlerTooltip);
                this.appendDivider();
            }
        }
        const tooltipFirstLine = document.createElement("div");
        tooltipFirstLine.classList.add('text-secondary', 'text-center', 'uppercase', 'font-title');
        if (biomeLabel) {
            // TODO - Add hard-coded string to localization XML.
            const label = Locale.compose("{1_TerrainName} {2_BiomeName}", terrainLabel, biomeLabel);
            tooltipFirstLine.setAttribute('data-l10n-id', label);
        }
        else {
            tooltipFirstLine.setAttribute('data-l10n-id', terrainLabel);
        }
        this.container.appendChild(tooltipFirstLine);
        if (featureLabel) {
            const tooltipSecondLine = document.createElement("div");
            tooltipSecondLine.classList.add("plot-tooltip__lineTwo");
            tooltipSecondLine.setAttribute('data-l10n-id', featureLabel);
            this.container.appendChild(tooltipSecondLine);
        }
        if (continentName) {
            if (riverLabel) {
                const tooltipThirdLine = document.createElement("div");
                tooltipThirdLine.classList.add("plot-tooltip__lineThree");
                // TODO - This hard-coded string should be in loc XML.
                const label = Locale.compose('{1_ContinentName} {LOC_PLOT_DIVIDER_DOT} {2_RiverName}', continentName, riverLabel);
                tooltipThirdLine.setAttribute('data-l10n-id', label);
                this.container.appendChild(tooltipThirdLine);
            }
            else {
                const tooltipThirdLine = document.createElement("div");
                tooltipThirdLine.classList.add("plot-tooltip__lineThree");
                tooltipThirdLine.setAttribute('data-l10n-id', continentName);
                this.container.appendChild(tooltipThirdLine);
            }
        }
        // District Information
        this.addPlotDistrictInformation(this.plotCoord);
        this.BZaddConstructibleInformation(this.plotCoord);
        //Yields Section
        this.yieldsFlexbox.classList.add("plot-tooltip__resourcesFlex");
        this.container.appendChild(this.yieldsFlexbox);
        this.addPlotYields(this.plotCoord, GameContext.localPlayerID);
        this.addOwnerInfo(this.plotCoord, playerID);
        if (hexResource) {
            //add resources to the yield box
            const tooltipIndividualYieldFlex = document.createElement("div");
            tooltipIndividualYieldFlex.classList.add("plot-tooltip__IndividualYieldFlex");
            this.yieldsFlexbox.appendChild(tooltipIndividualYieldFlex);
            const toolTipResourceIconCSS = UI.getIconCSS(hexResource.ResourceType);
            const yieldIconShadow = document.createElement("div");
            yieldIconShadow.classList.add("plot-tooltip__IndividualYieldIcons-Shadow");
            yieldIconShadow.style.backgroundImage = toolTipResourceIconCSS;
            tooltipIndividualYieldFlex.appendChild(yieldIconShadow);
            const yieldIcon = document.createElement("div");
            yieldIcon.classList.add("plot-tooltip__IndividualYieldIcons");
            yieldIcon.style.backgroundImage = toolTipResourceIconCSS;
            yieldIconShadow.appendChild(yieldIcon);
            const toolTipIndividualYieldValues = document.createElement("div");
            toolTipIndividualYieldValues.classList.add("plot-tooltip__IndividualYieldValues", "font-body");
            toolTipIndividualYieldValues.innerHTML = "1"; //TODO: Change This value
            tooltipIndividualYieldFlex.appendChild(toolTipIndividualYieldValues);
            this.appendTooltipInformation(hexResource.Name, [hexResource.Tooltip], toolTipResourceIconCSS);
        }
        // Adds info about constructibles, improvements, and wonders to the tooltip
        this.addPlotEffectNames(plotIndex);
        // Trade Route Info
        if (routeName) {
            this.appendDivider();
            const toolTipRouteInfo = document.createElement("div");
            toolTipRouteInfo.classList.add("plot-tooltip__trade-route-info");
            toolTipRouteInfo.innerHTML = routeName;
            this.container.appendChild(toolTipRouteInfo);
        }
        // Unit Info
        this.addUnitInfo(this.plotCoord);
        UI.setPlotLocation(this.plotCoord.x, this.plotCoord.y, plotIndex);
        // Adjust cursor between normal and red based on the plot owner's hostility
        if (!UI.isCursorLocked()) {
            const localPlayerID = GameContext.localPlayerID;
            const topUnit = this.getTopUnit(this.plotCoord);
            let showHostileCursor = false;
            let owningPlayerID = GameplayMap.getOwner(this.plotCoord.x, this.plotCoord.y);
            // if there's a unit on the plot, that player overrides the tile's owner
            if (topUnit) {
                owningPlayerID = topUnit.owner;
            }
            const revealedState = GameplayMap.getRevealedState(localPlayerID, plotCoord.x, plotCoord.y);
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
                        independentID = Game.IndependentPowers.getIndependentPlayerIDAt(this.plotCoord.x, this.plotCoord.y);
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
            const playerID = GameplayMap.getOwner(this.plotCoord.x, this.plotCoord.y);
            const currHp = Players.Districts.get(playerID)?.getDistrictHealth(this.plotCoord);
            const maxHp = Players.Districts.get(playerID)?.getDistrictMaxHealth(this.plotCoord);
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
            toolTipDebugPlotCoord.innerHTML = Locale.compose("LOC_PLOT_TOOLTIP_PLOT") + `: (${this.plotCoord.x},${this.plotCoord.y})`;
            tooltipDebugFlexbox.appendChild(toolTipDebugPlotCoord);
            const toolTipDebugPlotIndex = document.createElement("div");
            toolTipDebugPlotIndex.classList.add("plot-tooltip__coordinate-text");
            toolTipDebugPlotIndex.innerHTML = Locale.compose("LOC_PLOT_TOOLTIP_INDEX") + `: ${plotIndex}`;
            tooltipDebugFlexbox.appendChild(toolTipDebugPlotIndex);
            const localPlayer = Players.get(GameContext.localPlayerID);
            if (localPlayer != null) {
                if (localPlayer.isDistantLands(this.plotCoord)) {
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
    appendTooltipInformation(title, text, icon) {
        this.appendDivider();
        const layout = document.createElement("div");
        layout.classList.add("flex", "flex-row");
        if (icon) {
            const iconContainer = document.createElement("div");
            iconContainer.classList.add("flex", "flex-col", "justify-center");
            layout.appendChild(iconContainer);
            const iconElement = document.createElement("div");
            iconElement.classList.add("plot-tooltip__large-resource-icon", "my-2");
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
    getContinentName(location) {
        const continentType = GameplayMap.getContinentType(location.x, location.y);
        const continent = GameInfo.Continents.lookup(continentType);
        if (continent && continent.Description) {
            return continent.Description;
        }
        else {
            return "";
        }
    }
    addConstructibleInformation(plotCoordinate) {
        const constructibleTooltipInfo = [];
        const constructibles = MapConstructibles.getHiddenFilteredConstructibles(plotCoordinate.x, plotCoordinate.y);
        const agelessTypes = new Set(GameInfo.TypeTags.filter(e => e.Tag == "AGELESS").map(e => e.Type));
        for (const constructible of constructibles) {
            const instance = Constructibles.getByComponentID(constructible);
            if (instance) {
                const info = GameInfo.Constructibles.lookup(instance.type);
                if (info) {
                    const location = instance.location;
                    const isBuilding = info.ConstructibleClass == "BUILDING";
                    const isWonder = info.ConstructibleClass == "WONDER";
                    const isImprovement = info.ConstructibleClass == "IMPROVEMENT";
                    if (!(isWonder || isBuilding || isImprovement)) {
                        continue;
                    }
                    if (location.x == plotCoordinate.x && location.y == plotCoordinate.y) {
                        let title;
                        let icon;
                        const text = [];
                        const info = GameInfo.Constructibles.lookup(instance.type);
                        if (info) {
                            title = info.Name;
                            icon = UI.getIconCSS(info.ConstructibleType);
                        }
                        else {
                            console.warn("Building constructible without a definition: " + instance.type.toString());
                            title = instance.type.toString(); // TODO: Show nothing or something else? (Pre-vertical slice, show whatever this is that is missing)
                        }
                        const curAge = Game.age;
                        const buildingAge = Database.makeHash(info?.Age ?? "");
                        if (!isWonder) {
                            if (instance.damaged) {
                                text.push("LOC_PLOT_TOOLTIP_DAMAGED");
                            }
                            if (!instance.complete) {
                                text.push("LOC_PLOT_TOOLTIP_IN_PROGRESS");
                            }
                            const ageless = info ? agelessTypes.has(info.ConstructibleType) : false;
                            if (ageless) {
                                text.push("LOC_UI_PRODUCTION_AGELESS");
                            }
                        }
                        if (isWonder && info && info.Description) {
                            text.push(info.Description);
                        }
                        let sortOrder = 2;
                        if (isBuilding || isWonder) {
                            sortOrder = curAge == buildingAge ? 1 : 0;
                        }
                        constructibleTooltipInfo.push({ title, text, icon, sortOrder });
                    }
                }
            }
        }
        ;
        constructibleTooltipInfo.sort((a, b) => a.sortOrder - b.sortOrder);
        for (const info of constructibleTooltipInfo) {
            this.appendTooltipInformation(info.title, info.text, info.icon);
        }
    }
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
                const isAgeless = this.hasConstructibleTag("AGELESS", info);
                const isObsolete = !isAgeless && iBuildingAge != iCurrentAge;
                const isExtra = this.hasConstructibleTag("IGNORE_DISTRICT_PLACEMENT_CAP", info);
                const uniqueTrait = GameInfo.Buildings.lookup(info.ConstructibleType).TraitType;
                let ageLabel;
                if (!info) {
                    ageLabel = Locale.compose("LOC_PLOT_BZ_ERROR_UNKNOWN");
                }
                else if (uniqueTrait) {
                    ageLabel = Locale.compose("LOC_PLOT_BZ_UNIQUE");
                    if (!isExtra) buildingStatus.Unique.push(uniqueTrait);
                }
                else if (isAgeless) {
                    ageLabel = Locale.compose("LOC_PLOT_BZ_AGELESS");
                }
                else if (isObsolete) {
                    ageLabel = Locale.compose("LOC_PLOT_BZ_OBSOLETE");
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
                if (this.hasConstructibleTag("IGNORE_DISTRICT_PLACEMENT_CAP", info)) {
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
                improvements.push(Locale.compose("LOC_PLOT_BZ_ERROR_UNKNOWN"));
                buildingStatus.Improvements.push('');
            }
        });
        // determine the tile type
        const districtId = MapCities.getDistrict(plotCoordinate.x, plotCoordinate.y);
        const cityId = GameplayMap.getOwningCityFromXY(plotCoordinate.x, plotCoordinate.y);
        const city = cityId ? Cities.get(cityId) : null;
        if (districtId) {
            // city center, quarter, district, wonder, or rural improvement
            const district = Districts.get(districtId);
            const districtType = district?.type ?? DistrictTypes.WILDERNESS;
            // check for special cases: town center, quarter, district
            let tileType;
            if (districtType == DistrictTypes.CITY_CENTER) {
                // possibly a town center
                if (city?.isTown) tileType = Locale.compose("LOC_PLOT_BZ_TOWN_CENTER");
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
                    else tileType = Locale.compose("LOC_PLOT_BZ_URBAN_QUARTER");
                }
                else if (thisAgeBuildings.length || previousAgeBuildings.length) {
                    // district (at least one building)
                    tileType = Locale.compose("LOC_PLOT_BZ_URBAN_DISTRICT");
                }
                else {
                    // vacant district (canceled building production)
                    tileType = Locale.compose("LOC_PLOT_BZ_URBAN_VACANT");
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
            this.appendTitleDivider(Locale.compose("LOC_PLOT_BZ_UNDEVELOPED"));
        }
        else {
            const districtDefinition = GameInfo.Districts.lookup(DistrictTypes.WILDERNESS);
            this.appendTitleDivider(Locale.compose(districtDefinition.Name));
        }
        this.appendConstructibleList(thisAgeBuildings, buildingStatus.CurrentAge);
        this.appendConstructibleList(previousAgeBuildings, buildingStatus.PreviousAge);
        this.appendConstructibleList(extraBuildings, buildingStatus.Extras);
        this.appendConstructibleList(wonders, buildingStatus.Wonder);
        this.appendConstructibleList(improvements, buildingStatus.Improvements);
        this.appendRuralPanel(plotCoordinate, districtId, cityId);
    }
    getPlayerName() {
        const playerID = GameplayMap.getOwner(this.plotCoord.x, this.plotCoord.y);
        const player = Players.get(playerID);
        if (player == null) {
            return "";
        }
        const localPlayerID = GameContext.localPlayerID;
        const name = Locale.stylize(player.name) + ((playerID == localPlayerID) ? (" (" + Locale.compose("LOC_PLOT_TOOLTIP_YOU") + ")") : "");
        return name;
    }
    getCivName() {
        const playerID = GameplayMap.getOwner(this.plotCoord.x, this.plotCoord.y);
        const player = Players.get(playerID);
        if (player == null) {
            return "";
        }
        const name = Locale.compose(GameplayMap.getOwnerName(this.plotCoord.x, this.plotCoord.y));
        return name;
    }
    getTerrainLabel(location) {
        const terrainType = GameplayMap.getTerrainType(location.x, location.y);
        const terrain = GameInfo.Terrains.lookup(terrainType);
        if (terrain) {
            if (this.isShowingDebug) {
                // despite being "coast" this is a check for a lake
                if (terrain.TerrainType == "TERRAIN_COAST" && GameplayMap.isLake(location.x, location.y)) {
                    return Locale.compose('{1_Name} ({2_Value})', "LOC_TERRAIN_LAKE_NAME", terrainType.toString());
                }
                return Locale.compose('{1_Name} ({2_Value})', terrain.Name, terrainType.toString());
            }
            else {
                // despite being "coast" this is a check for a lake
                if (terrain.TerrainType == "TERRAIN_COAST" && GameplayMap.isLake(location.x, location.y)) {
                    return "LOC_TERRAIN_LAKE_NAME";
                }
                return terrain.Name;
            }
        }
        else {
            return "";
        }
    }
    getBiomeLabel(location) {
        const biomeType = GameplayMap.getBiomeType(location.x, location.y);
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
    addPlotEffectNames(plotIndex) {
        const plotEffects = MapPlotEffects.getPlotEffects(plotIndex);
        const localPlayerID = GameContext.localPlayerID;
        plotEffects?.forEach((item) => {
            const effectInfo = GameInfo.PlotEffects.lookup(item.effectType);
            if (!item.onlyVisibleToOwner || (item.onlyVisibleToOwner && (item.owner == localPlayerID))) {
                if (effectInfo) {
                    this.appendDivider();
                    const toolTipPlotEffectsText = document.createElement("div");
                    toolTipPlotEffectsText.classList.add("plot-tooltip__plot-effect-text");
                    toolTipPlotEffectsText.setAttribute('data-l10n-id', effectInfo.Name);
                    this.container.appendChild(toolTipPlotEffectsText);
                }
            }
        });
    }
    getTopUnit(location) {
        let plotUnits = MapUnits.getUnits(location.x, location.y);
        if (plotUnits && plotUnits.length > 0) {
            const topUnit = Units.get(plotUnits[0]);
            return topUnit;
        }
        return null;
    }
    /**
     * Add to a plot tooltip information on the plot's owner
     * @param {float2} location The X,Y plot location.
     * @param {playerId} playerID The player associated with the request.
     */
    addOwnerInfo(location, playerID) {
        const filteredConstructibles = MapConstructibles.getHiddenFilteredConstructibles(location.x, location.y);
        const constructibles = MapConstructibles.getConstructibles(location.x, location.y);
        const player = Players.get(playerID);
        if (!player || !Players.isAlive(playerID)) {
            return;
        }
        if (filteredConstructibles.length == 0 && filteredConstructibles.length != constructibles.length) {
            return;
        }
        if (player.isIndependent) {
            this.appendDivider();
            const plotTooltipOwnerLeader = document.createElement("div");
            plotTooltipOwnerLeader.classList.add("plot-tooltip__owner-leader-text");
            plotTooltipOwnerLeader.innerHTML = Locale.compose("LOC_CIVILIZATION_INDEPENDENT_SINGULAR", this.getCivName());
            this.container.appendChild(plotTooltipOwnerLeader);
            const localPlayerID = GameContext.localPlayerID;
            const relationship = GameplayMap.getOwnerHostility(location.x, location.y, localPlayerID);
            if (relationship != null) {
                const plotTooltipOwnerRelationship = document.createElement("div");
                plotTooltipOwnerRelationship.classList.add("plot-tooltip__owner-relationship-text");
                plotTooltipOwnerRelationship.innerHTML = Locale.compose("LOC_PLOT_TOOLTIP_RELATIONSHIP") + ": " + Locale.compose(relationship);
                this.container.appendChild(plotTooltipOwnerRelationship);
            }
            const tooltipCityBonusInfo = document.createElement("div");
            tooltipCityBonusInfo.classList.add("plot-tooltip__unitInfo");
            const bonusType = Game.CityStates.getBonusType(playerID);
            const bonusDefinition = GameInfo.CityStateBonuses.find(t => t.$hash == bonusType);
            tooltipCityBonusInfo.innerHTML = Locale.compose(bonusDefinition?.Name ?? "");
            this.container.appendChild(tooltipCityBonusInfo);
        }
        else if (false) {  // TODO: remove this
            this.appendDivider();
            const plotTooltipOwnerLeader = document.createElement("div");
            plotTooltipOwnerLeader.classList.add("plot-tooltip__owner-leader-text");
            plotTooltipOwnerLeader.innerHTML = this.getPlayerName();
            this.container.appendChild(plotTooltipOwnerLeader);
            const plotTooltipOwnerCiv = document.createElement("div");
            plotTooltipOwnerCiv.classList.add("plot-tooltip__owner-civ-text");
            plotTooltipOwnerCiv.innerHTML = this.getCivName();
            this.container.appendChild(plotTooltipOwnerCiv);
            const districtId = MapCities.getDistrict(location.x, location.y);
            const plotTooltipConqueror = this.getConquerorInfo(districtId);
            if (plotTooltipConqueror) {
                this.container.appendChild(plotTooltipConqueror);
            }
        }
        else {  // BZ
            this.appendDivider();
            const plotTooltipOwner = document.createElement("div");
            plotTooltipOwner.classList.add("plot-tooltip__owner-leader-text");
            const owner = this.dotJoin([this.getPlayerName(), this.getCivName()]);
            plotTooltipOwner.innerHTML = owner;
            this.container.appendChild(plotTooltipOwner);
            const districtId = MapCities.getDistrict(location.x, location.y);
            const plotTooltipConqueror = this.getConquerorInfo(districtId);
            if (plotTooltipConqueror) {
                this.container.appendChild(plotTooltipConqueror);
            }
        }
    }
    getConquerorInfo(districtId) {
        if (!districtId) {
            return null;
        }
        const district = Districts.get(districtId);
        if (!district || !ComponentID.isValid(districtId)) {
            console.error(`plot-tooltip: couldn't find any district with the given id: ${districtId}`);
            return null;
        }
        if (district.owner != district.controllingPlayer) {
            const conqueror = Players.get(district.controllingPlayer);
            if (!conqueror) {
                console.error(`plot-tooltip: couldn't find any civilization with the given player ${district.controllingPlayer}`);
                return null;
            }
            if (conqueror.isIndependent) {
                const plotTooltipOwnerLeader = document.createElement("div");
                plotTooltipOwnerLeader.classList.add("plot-tooltip__owner-leader-text");
                const label = Locale.compose("{1_Term}: {2_Subject}", "LOC_PLOT_TOOLTIP_CONQUEROR", "LOC_PLOT_TOOLTIP_INDEPENDENT_CONQUEROR");
                plotTooltipOwnerLeader.innerHTML = label;
                return plotTooltipOwnerLeader;
            }
            else {
                const conquerorName = Locale.compose(conqueror.civilizationFullName);
                const plotTooltipConqueredCiv = document.createElement("div");
                plotTooltipConqueredCiv.classList.add("plot-tooltip__owner-civ-text");
                const label = Locale.compose("{1_Term}: {2_Subject}", "LOC_PLOT_TOOLTIP_CONQUEROR", conquerorName);
                plotTooltipConqueredCiv.innerHTML = label;
                return plotTooltipConqueredCiv;
            }
        }
        else {
            return null;
        }
    }
    getRiverLabel(location) {
        const riverType = GameplayMap.getRiverType(location.x, location.y);
        if (riverType != RiverTypes.NO_RIVER) {
            let riverNameLabel = GameplayMap.getRiverName(location.x, location.y);
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
    getFeatureLabel(location) {
        let label = '';
        const featureType = GameplayMap.getFeatureType(location.x, location.y);
        const feature = GameInfo.Features.lookup(featureType);
        if (feature && !feature.Tooltip) {  // BZ
            label = feature.Name;
        }
        if (GameplayMap.isVolcano(location.x, location.y)) {
            const active = GameplayMap.isVolcanoActive(location.x, location.y);
            const volcanoStatus = (active) ? 'LOC_VOLCANO_ACTIVE' : 'LOC_VOLCANO_NOT_ACTIVE';
            const volcanoName = GameplayMap.getVolcanoName(location.x, location.y);
            const volcanoDetailsKey = (volcanoName) ? 'LOC_UI_NAMED_VOLCANO_DETAILS' : 'LOC_UI_VOLCANO_DETAILS';
            label = Locale.compose(volcanoDetailsKey, label, volcanoStatus, volcanoName);
        }
        return label;
    }
    addUnitInfo(location) {
        const localPlayerID = GameContext.localObserverID;
        if (GameplayMap.getRevealedState(localPlayerID, location.x, location.y) != RevealedStates.VISIBLE) {
            return this;
        }
        let topUnit = this.getTopUnit(location);
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
    /**
     * Add to a plot tooltip any yields that are greater than 0 for that plot
     * @param {float2} location The X,Y plot location.
     * @param {playerId} playerID The player associated with the request.
     */
    addPlotYields(location, playerID) {
        const fragment = document.createDocumentFragment();
        let maxValueLength = 0;
        GameInfo.Yields.forEach(yield_define => {
            const yield_amount = GameplayMap.getYield(location.x, location.y, yield_define.YieldType, playerID);
            if (yield_amount > 0) {
                const tooltipIndividualYieldFlex = document.createElement("div");
                tooltipIndividualYieldFlex.classList.add("plot-tooltip__IndividualYieldFlex");
                tooltipIndividualYieldFlex.ariaLabel = `${Locale.toNumber(yield_amount)} ${Locale.compose(yield_define.Name)}`;
                fragment.appendChild(tooltipIndividualYieldFlex);
                const yieldIconCSS = UI.getIconCSS(yield_define.YieldType, "YIELD");
                const yieldIconShadow = document.createElement("div");
                yieldIconShadow.classList.add("plot-tooltip__IndividualYieldIcons-Shadow");
                yieldIconShadow.style.backgroundImage = yieldIconCSS;
                tooltipIndividualYieldFlex.appendChild(yieldIconShadow);
                const yieldIcon = document.createElement("div");
                yieldIcon.classList.add("plot-tooltip__IndividualYieldIcons");
                yieldIcon.style.backgroundImage = yieldIconCSS;
                yieldIconShadow.appendChild(yieldIcon);
                const toolTipIndividualYieldValues = document.createElement("div");
                toolTipIndividualYieldValues.classList.add("plot-tooltip__IndividualYieldValues", "font-body");
                const value = yield_amount.toString();
                maxValueLength = Math.max(maxValueLength, value.length);
                toolTipIndividualYieldValues.textContent = value;
                tooltipIndividualYieldFlex.appendChild(toolTipIndividualYieldValues);
            }
        });
        this.yieldsFlexbox.appendChild(fragment);
        // Give all the yields extra room if one of them has extra digits, to keep the spacing even.
        this.yieldsFlexbox.classList.remove('resourcesFlex--double-digits', 'resourcesFlex--triple-digits');
        if (maxValueLength > 2) {
            this.yieldsFlexbox.classList.add(maxValueLength > 3 ? 'resourcesFlex--triple-digits' : 'resourcesFlex--double-digits');
        }
    }
    /**
     * Add to a plot tooltip district info and show it if the health is not 100 nor 0
     * @param {float2} location The X,Y plot location.
    */
    addPlotDistrictInformation(location) {
        const playerID = GameplayMap.getOwner(location.x, location.y);
        const playerDistricts = Players.Districts.get(playerID);
        if (!playerDistricts) {
            return;
        }
        // This type is unresolved, is it meant to be number instead?
        const currentHealth = playerDistricts.getDistrictHealth(location);
        const maxHealth = playerDistricts.getDistrictMaxHealth(location);
        const isUnderSiege = playerDistricts.getDistrictIsBesieged(location);
        if (!DistrictHealthManager.canShowDistrictHealth(currentHealth, maxHealth)) {
            return;
        }
        const districtContainer = document.createElement("div");
        districtContainer.classList.add("plot-tooltip__district-container");
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
    hasConstructibleTag(tag, info) {
        return (info) && GameInfo.TypeTags.find(e => e.Tag == tag && e.Type == info.ConstructibleType);
    }
    dotJoin(list) {
        // join text with dots after removing empty elements
        return list.filter(e => e).join(" " + BZ_DOT_DIVIDER + " ");
    }
    bracketText(text) {
        // wrap non-empty text with brackets
        return text ? "(" + text + ")" : "";
    }
    appendRuralPanel(location, districtId, cityId) {  // includes WILDERNESS
        let hexName;
        let hexDescription;
        // city info
        const district = districtId ? Districts.get(districtId) : null;
        const city = cityId ? Cities.get(cityId) : null;
        // special tile types: natural wonder, resource
        const featureType = GameplayMap.getFeatureType(location.x, location.y);
        const feature = GameInfo.Features.lookup(featureType);
        const hexResource = this.getResource();
        if (feature && feature.Tooltip) {
            hexName = feature.Name;
            hexDescription = feature.Tooltip;
        }
        else if (hexResource) {
            hexName = hexResource.Name;
            hexDescription = hexResource.Tooltip;
        }
        else if (district?.type) {
            hexName = GameInfo.Districts.lookup(district?.type).Name;
        }
        else if (city) {
            hexName = "LOC_PLOT_BZ_UNDEVELOPED";
        }
        else {
            hexName = GameInfo.Districts.lookup(DistrictTypes.WILDERNESS).Name;
        }
        // TODO: icons
        this.appendTitleDivider(Locale.compose(hexName));
        if (hexDescription) {
            // TODO: customize styling
            const ttDescription = document.createElement("div");
            ttDescription.classList.add("plot-tooltip__lineTwo");
            ttDescription.setAttribute('data-l10n-id', hexDescription);
            this.container.appendChild(ttDescription);
        }
        // TODO: buildings
    }
    appendUrbanPanel(TODO) {  // includes CITY_CENTER
        // TODO
    }
    appendWonderPanel(TODO) {
        // TODO
    }
    appendFlexDivider(center) {
        const layout = document.createElement("div");
        layout.classList.add("flex", "flex-row", "justify-between", "items-center");
        layout.classList.add("self-center", "-mx-6", "my-1", "flex-auto");
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
        layout.classList.add("font-title", "text-sm", "uppercase");
        layout.innerHTML = text;
        this.appendFlexDivider(layout);
    }
    appendIconDivider(icon, overlay=null) {
        // icon divider with optional overlay
        const layout = document.createElement("div");
        layout.classList.add("flex-grow", "relative");
        const base = document.createElement("div");
        base.classList.add("bg-contain", "bg-center", "w-12", "h-12", "mx-3", "my-1");
        base.style.backgroundImage = UI.getIconCSS(icon);
        layout.appendChild(base);
        if (overlay) {
            const over = document.createElement("div");
            over.classList.add("bg-contain", "bg-center", "w-9", "h-9", "mx-3", "my-1");
            over.classList.add("absolute", "top-1\\.5", "left-1\\.5");
            over.style.backgroundImage = UI.getIconCSS(overlay);
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
        layout.classList.add("flex", "flex-row", "flex-grow", "relative", "mx-3");
        for (let i = 0; i < buildings.length; i++) {
            const icon = document.createElement("div");
            icon.classList.add("bg-contain", "bg-center", "w-12", "h-12", "mx-1", "my-1");
            icon.style.backgroundImage = UI.getIconCSS(buildings[i]);
            layout.appendChild(icon);
        }
        this.appendFlexDivider(layout);
    }
    iconBlock(icon, name, notes, description) {
        const ttIconBlock = document.createElement("div");
        ttIconBlock.classList.add("plot-tooltip__resource-container");
        // ttIconBlock.style.setProperty("background-color", "rgba(150, 150, 150, .35)");
        ttIconBlock.style.setProperty("max-width", BZ_CONTENT_WIDTH);
        ttIconBlock.style.setProperty("margin-bottom", "0.167rem");
        const ttIcon = document.createElement("div");
        ttIcon.classList.add("plot-tooltip__large-resource-icon");
        // TODO: BUILDING_OPEN icon for empty district slot
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
        // ttTextColumn.style.setProperty("background-color", "rgba(150, 57, 57, .35)");
        ttTextColumn.style.setProperty("max-width", BZ_DETAIL_WIDTH);
        const ttName = document.createElement("div");
        // ttName.classList.add("font-title", "text-sm", "uppercase");
        ttName.classList.add("font-title", "uppercase");
        // ttName.style.setProperty("background-color", "rgba(57, 150, 57, .35)");
        ttName.setAttribute("data-l10n-id", name);
        ttTextColumn.appendChild(ttName);
        if (notes) {
            const ttNotes = document.createElement("div");
            ttNotes.classList.add("plot-tooltip__resource-label_description");
            // ttNotes.style.setProperty("background-color", "rgba(150, 57, 57, .35)");
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
            // ttDescription.style.setProperty("background-color", "rgba(57, 57, 150, .35)");
            ttDescription.setAttribute("data-l10n-id", description);
            ttTextColumn.appendChild(ttDescription);
        }
        ttIconBlock.appendChild(ttTextColumn);
        return ttIconBlock;
    }
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

/**
 * Plot Tooltips
 * @copyright 2022-2025, Firaxis Gmaes
 * @description The tooltips that appear based on the cursor hovering over world plots.
 */
import TooltipManager, { PlotTooltipPriority } from '/core/ui/tooltips/tooltip-manager.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import DistrictHealthManager from '/base-standard/ui/district/district-health-manager.js';
import LensManager from '/core/ui/lenses/lens-manager.js';
class PlotTooltipType {
    constructor() {
        this.plotCoord = null;
        this.isShowingDebug = false;
        this.tooltip = document.createElement('fxs-tooltip');
        this.container = document.createElement('div');
        this.yieldsFlexbox = document.createElement('div');
        this.currentAge = GameInfo.Ages.lookup(Game.age)?.ChronologyIndex ?? 0;
        this.agelessTypes = new Set(GameInfo.TypeTags.filter(e => e.Tag == "AGELESS").map(e => e.Type));
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
        const specialistsLabel = this.getSpecialistDescription();
        const localPlayer = Players.get(GameContext.localPlayerID);
        if (!localPlayer) {
            console.error("plot-tooltip: Failed to find valid local player!");
            return;
        }
        const isDistantLands = localPlayer.isDistantLands(plotCoord);
        // Top Section
        if (LensManager.getActiveLens() == "fxs-settler-lens") {
            //Add more details to the tooltip if we are in the settler lens
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
            tooltipSecondLine.classList.add("plot-tooltip__line");
            tooltipSecondLine.setAttribute('data-l10n-id', featureLabel);
            this.container.appendChild(tooltipSecondLine);
        }
        if (continentName) {
            if (riverLabel) {
                const tooltipThirdLine = document.createElement("div");
                tooltipThirdLine.classList.add("plot-tooltip__line");
                // TODO - This hard-coded string should be in loc XML.
                const label = Locale.compose('{1_ContinentName} {LOC_PLOT_DIVIDER_DOT} {2_RiverName}', continentName, riverLabel);
                tooltipThirdLine.setAttribute('data-l10n-id', label);
                this.container.appendChild(tooltipThirdLine);
            }
            else {
                const tooltipThirdLine = document.createElement("div");
                tooltipThirdLine.classList.add("plot-tooltip__line");
                tooltipThirdLine.setAttribute('data-l10n-id', continentName);
                this.container.appendChild(tooltipThirdLine);
            }
            const landsLine = document.createElement("div");
            landsLine.classList.add("plot-tooltip__line");
            landsLine.setAttribute('data-l10n-id', isDistantLands ? "LOC_PLOT_TOOLTIP_HEMISPHERE_WEST" : "LOC_PLOT_TOOLTIP_HEMISPHERE_EAST");
            this.container.appendChild(landsLine);
        }
        // District Information
        this.addPlotDistrictInformation(this.plotCoord);
        //Yields Section
        this.yieldsFlexbox.classList.add("plot-tooltip__resourcesFlex");
        this.container.appendChild(this.yieldsFlexbox);
        this.addPlotYields(this.plotCoord, GameContext.localPlayerID);
        if (specialistsLabel != "") {
            const specialistText = document.createElement("div");
            specialistText.classList.add("text-center");
            specialistText.innerHTML = specialistsLabel;
            this.container.appendChild(specialistText);
        }
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
            const additionalText = [];
            additionalText.push(Locale.stylize("LOC_RESOURCECLASS_TOOLTIP_NAME", Locale.compose("LOC_" + hexResource.ResourceClassType + "_NAME")));
            additionalText.push(Locale.stylize(hexResource.Tooltip));
            this.appendTooltipInformation(hexResource.Name, additionalText, toolTipResourceIconCSS);
            if (hexResource.ResourceClassType == "RESOURCECLASS_TREASURE") {
                this.appendHeaderDivider(Locale.stylize("LOC_UI_CITY_DETAILS_TREASURE_FLEET"));
                const treasureFleetText = document.createElement('div');
                treasureFleetText.setAttribute('data-l10n-id', 'LOC_CAN_CREATE_TREASURE_FLEET');
                this.container.appendChild(treasureFleetText);
                if (!localPlayer.isDistantLands(this.plotCoord)) {
                    const treasureFleetWillSpawnText = document.createElement('div');
                    treasureFleetWillSpawnText.setAttribute('data-l10n-id', 'LOC_UI_TOOPTIP_TREASURE_HOMELANDS');
                    treasureFleetWillSpawnText.classList.add("text-negative");
                    this.container.appendChild(treasureFleetWillSpawnText);
                }
            }
        }
        // Adds info about constructibles, improvements, and wonders to the tooltip
        this.addConstructibleInformation(this.plotCoord);
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
                    const localPlayerDiplomacy = localPlayer.Diplomacy;
                    if (localPlayerDiplomacy) {
                        if (localPlayerDiplomacy.isAtWarWith(owningPlayerID) && !hasHiddenUnit) {
                            showHostileCursor = true;
                        }
                    }
                }
            }
            if (showHostileCursor) {
                UI.setCursorByType(UIHTMLCursorTypes.Enemy);
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
            let args = {};
            args.X = this.plotCoord.x;
            args.Y = this.plotCoord.y;
            const plotUnits = MapUnits.getUnits(this.plotCoord.x, this.plotCoord.y);
            if (plotUnits.length > 0) {
                // Hovering over your selected unit; don't show the plot tooltip
                if (plotUnits.find(e => ComponentID.isMatch(e, selectedUnitID))) {
                    return true;
                }
            }
            let combatType = Game.Combat.testAttackInto(selectedUnitID, args);
            if (combatType != CombatTypes.NO_COMBAT) {
                return true;
            }
        }
        return false;
    }
    appendHeaderDivider(text) {
        const divider = document.createElement("div");
        divider.classList.add("flex", "flex-row", "items-center", "justify-center", "my-1\\.5");
        const leftDivider = document.createElement("div");
        leftDivider.classList.add("plot-tooltip__TitleLineleft");
        divider.appendChild(leftDivider);
        const tooltipImprovementName = document.createElement("div");
        tooltipImprovementName.classList.add("plot-tooltip__ImprovementName");
        tooltipImprovementName.innerHTML = Locale.compose(text);
        divider.appendChild(tooltipImprovementName);
        const rightDivider = document.createElement("div");
        rightDivider.classList.add("plot-tooltip__TitleLineRight");
        divider.appendChild(rightDivider);
        this.container.appendChild(divider);
    }
    appendDivider() {
        const divider = document.createElement("div");
        divider.classList.add("plot-tooltip__Divider", "my-2");
        this.container.appendChild(divider);
    }
    appendTooltipInformation(title, localizedText, icon, headerText) {
        if (headerText) {
            this.appendHeaderDivider(headerText);
        }
        else if (headerText !== false) {
            this.appendDivider();
        }
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
        if (localizedText || title) {
            const textContainer = document.createElement("div");
            textContainer.classList.add("flex", "flex-col", "flex-auto", "justify-center");
            layout.appendChild(textContainer);
            const titleElement = document.createElement("div");
            titleElement.classList.add("font-title", "text-sm", "uppercase");
            titleElement.setAttribute("data-l10n-id", title);
            textContainer.appendChild(titleElement);
            if (localizedText) {
                for (const textLine of localizedText) {
                    const textElement = document.createElement("div");
                    textElement.innerHTML = textLine;
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
    getConstructibleInfo(constructible, plotCoordinate) {
        const instance = Constructibles.getByComponentID(constructible);
        const info = instance ? GameInfo.Constructibles.lookup(instance.type) : null;
        const location = instance?.location;
        if (instance && info && location && location.x == plotCoordinate.x && location.y == plotCoordinate.y) {
            const type = info.ConstructibleType;
            const age = GameInfo.Ages.lookup(info.Age ?? 0)?.ChronologyIndex ?? 0;
            const isAgeless = this.agelessTypes.has(type);
            const isBuilding = info.ConstructibleClass == "BUILDING";
            const isWonder = info.ConstructibleClass == "WONDER";
            const isImprovement = info.ConstructibleClass == "IMPROVEMENT";
            const uniqueQuarterType = instance.uniqueQuarterType;
            if (isBuilding || isWonder || isImprovement) {
                return {
                    location, type, age, isAgeless, isBuilding, isWonder, isImprovement, uniqueQuarterType,
                    damaged: instance.damaged,
                    complete: instance.complete,
                    overbuildable: isBuilding && !isAgeless && age < this.currentAge,
                    title: info.Name,
                    description: info.Description,
                    icon: UI.getIconCSS(info.ConstructibleType),
                    sortOrder: (isBuilding || isWonder) ? (this.currentAge == age ? 1 : 0) : 2
                };
            }
        }
        return null;
    }
    addConstructibleInformation(plotCoordinate) {
        const plotConstructibles = MapConstructibles.getHiddenFilteredConstructibles(plotCoordinate.x, plotCoordinate.y);
        const constructibles = plotConstructibles
            .map(constructible => this.getConstructibleInfo(constructible, plotCoordinate))
            .filter(c => c != null)
            .sort((a, b) => a.sortOrder - b.sortOrder);
        const isNaturalWonder = GameplayMap.isNaturalWonder(plotCoordinate.x, plotCoordinate.y);
        if (constructibles.length > 0) {
            const district = Districts.getAtLocation(plotCoordinate);
            let districtTitle = null;
            if (district) {
                const districtType = GameInfo.Districts.lookup(district.type)?.DistrictType;
                switch (districtType) {
                    case "DISTRICT_WONDER":
                        districtTitle = "LOC_CONSTRUCTIBLE_CLASS_NAME_WONDER";
                        break;
                    case "DISTRICT_URBAN":
                        if (district.isUniqueQuarter) {
                            districtTitle = "LOC_PLOT_TOOLTIP_UNIQUE_QUARTER";
                        }
                        else if (district.isQuarter) {
                            districtTitle = "LOC_PLOT_TOOLTIP_URBAN_QUARTER";
                        }
                        else {
                            districtTitle = "LOC_PLOT_TOOLTIP_URBAN_DISTRICT";
                        }
                        break;
                    case "DISTRICT_RURAL":
                        districtTitle = isNaturalWonder ? "LOC_PLOT_TOOLTIP_NATURAL_WONDER" : "LOC_PLOT_TOOLTIP_RURAL_DISTRICT";
                        break;
                    case "DISTRICT_CITY_CENTER":
                        districtTitle = "LOC_DISTRICT_CITY_CENTER_NAME";
                        break;
                }
            }
            if (districtTitle) {
                this.appendHeaderDivider(districtTitle);
            }
            else {
                this.appendDivider();
            }
            // Unique Quarter Info
            if (district?.isUniqueQuarter && constructibles.length > 0) {
                const uniqueQuarterConstructible = constructibles.find(c => c.uniqueQuarterType != UniqueQuarterTypes.NO_QUARTER);
                if (uniqueQuarterConstructible) {
                    const uniqueQuarterInfo = GameInfo.UniqueQuarters.lookup(uniqueQuarterConstructible.uniqueQuarterType);
                    if (uniqueQuarterInfo) {
                        const textContainer = document.createElement("div");
                        textContainer.classList.add("flex", "flex-col", "flex-auto");
                        this.container.appendChild(textContainer);
                        const titleElement = document.createElement("div");
                        titleElement.classList.add("font-title", "text-sm", "uppercase", "text-center");
                        titleElement.setAttribute("data-l10n-id", uniqueQuarterInfo.Name);
                        textContainer.appendChild(titleElement);
                        const textElement = document.createElement("div");
                        textElement.innerHTML = Locale.stylize(uniqueQuarterInfo.Description);
                        textContainer.appendChild(textElement);
                    }
                }
            }
        }
        for (const constructible of constructibles) {
            const text = [];
            if (!constructible.isWonder) {
                if (constructible.damaged) {
                    text.push(Locale.compose("LOC_PLOT_TOOLTIP_DAMAGED"));
                }
                if (!constructible.complete) {
                    text.push(Locale.compose("LOC_PLOT_TOOLTIP_IN_PROGRESS"));
                }
                if (constructible.isAgeless) {
                    text.push(Locale.compose("LOC_UI_PRODUCTION_AGELESS"));
                }
                if (constructible.overbuildable) {
                    text.push(Locale.compose("LOC_PLOT_TOOLTIP_OVERBUILDABLE"));
                }
            }
            if (constructible.isWonder && constructible.description) {
                text.push(Locale.stylize(constructible.description));
            }
            this.appendTooltipInformation(constructible.title, text, constructible.icon, false);
        }
        // Free improvement
        if (constructibles.length == 0) {
            const freeConstructible = Districts.getFreeConstructible(plotCoordinate, GameContext.localPlayerID);
            if (freeConstructible) {
                const info = GameInfo.Constructibles.lookup(freeConstructible);
                if (info) {
                    const description = Locale.stylize("LOC_PLOT_TOOLTIP_GROWTH_IMPROVEMENT", Locale.compose(info.Name));
                    const icon = UI.getIconCSS(info.ConstructibleType);
                    this.appendTooltipInformation("", [description], icon, isNaturalWonder ? "LOC_PLOT_TOOLTIP_NATURAL_WONDER" : "LOC_PLOT_TOOLTIP_UNIMPROVED");
                }
            }
        }
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
    getSpecialistDescription() {
        if (this.plotCoord) {
            const cityId = GameplayMap.getOwningCityFromXY(this.plotCoord.x, this.plotCoord.y);
            if (cityId) {
                const city = Cities.get(cityId);
                if (city && city.Workers) {
                    const maxSpecialists = city.Workers.getCityWorkerCap();
                    if (maxSpecialists > 0) {
                        const workerInfo = city.Workers.GetTilePlacementInfo(GameplayMap.getIndexFromXY(this.plotCoord.x, this.plotCoord.y));
                        if (workerInfo.NumWorkers > 0 || !workerInfo.IsBlocked) {
                            return Locale.compose("LOC_PLOT_TOOLTIP_SPECIALISTS_ASSIGNED", workerInfo.NumWorkers, maxSpecialists);
                        }
                    }
                }
            }
        }
        return "";
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
        else {
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
        if (feature) {
            if (feature.Tooltip) {
                label = Locale.compose("{1_FeatureName}: {2_FeatureTooltip}", feature.Name, feature.Tooltip);
            }
            else {
                label = feature.Name;
            }
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
        let unitName = Locale.compose(topUnit.name);
        this.appendDivider();
        const toolTipUnitInfo = document.createElement("div");
        toolTipUnitInfo.classList.add("plot-tooltip__unitInfo");
        toolTipUnitInfo.innerHTML = unitName;
        this.container.appendChild(toolTipUnitInfo);
        const toolTipUnitCiv = document.createElement("div");
        toolTipUnitCiv.classList.add("plot-tooltip__Civ-Info");
        if (player.isMinor || player.isIndependent) {
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
            if (player.id == localPlayerID) {
                toolTipUnitOwner.innerHTML = Locale.stylize(player.name) + " (" + Locale.compose("LOC_PLOT_TOOLTIP_YOU") + ")";
            }
            else {
                toolTipUnitOwner.innerHTML = Locale.stylize(player.name);
            }
            this.container.appendChild(toolTipUnitOwner);
            toolTipUnitCiv.innerHTML = Locale.compose(player.civilizationFullName);
            this.container.appendChild(toolTipUnitCiv);
            const playerDiplomacy = Players.get(localPlayerID)?.Diplomacy;
            if (playerDiplomacy) {
                const relationship = playerDiplomacy.getRelationshipLevelName(player.id);
                if (relationship && player.id != localPlayerID) {
                    const toolTipUnitRelationship = document.createElement("div");
                    toolTipUnitRelationship.classList.add("plot-tooltip__Unit-Relationship-Info");
                    toolTipUnitRelationship.innerHTML = Locale.compose("LOC_PLOT_TOOLTIP_RELATIONSHIP") + ": " + Locale.compose(relationship);
                    this.container.appendChild(toolTipUnitRelationship);
                }
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
        let totalYields = 0;
        for (const yieldInfo of GameInfo.Yields) {
            const yieldAmount = GameplayMap.getYield(location.x, location.y, yieldInfo.YieldType, playerID);
            if (yieldAmount > 0) {
                totalYields += yieldAmount;
                const tooltipIndividualYieldFlex = document.createElement("div");
                tooltipIndividualYieldFlex.classList.add("plot-tooltip__IndividualYieldFlex");
                tooltipIndividualYieldFlex.ariaLabel = `${Locale.toNumber(yieldAmount)} ${Locale.compose(yieldInfo.Name)}`;
                fragment.appendChild(tooltipIndividualYieldFlex);
                const yieldIconCSS = UI.getIconCSS(yieldInfo.YieldType, "YIELD");
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
                const value = yieldAmount.toString();
                maxValueLength = Math.max(maxValueLength, value.length);
                toolTipIndividualYieldValues.textContent = value;
                tooltipIndividualYieldFlex.appendChild(toolTipIndividualYieldValues);
            }
        }
        this.yieldsFlexbox.appendChild(fragment);
        // Give all the yields extra room if one of them has extra digits, to keep the spacing even.
        this.yieldsFlexbox.classList.remove('resourcesFlex--double-digits', 'resourcesFlex--triple-digits');
        if (maxValueLength > 2) {
            this.yieldsFlexbox.classList.add(maxValueLength > 3 ? 'resourcesFlex--triple-digits' : 'resourcesFlex--double-digits');
        }
        if (totalYields > 0) {
            const totalYieldsText = document.createElement("div");
            totalYieldsText.classList.add("text-center");
            totalYieldsText.innerHTML = Locale.compose("LOC_PLOT_TOTAL_YIELDS", Locale.toNumber(totalYields, '0.0'));
            this.container.appendChild(totalYieldsText);
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
        districtTitle.classList.add("plot-tooltip__district-title", "plot-tooltip__line");
        districtTitle.innerHTML = isUnderSiege ? Locale.compose("LOC_PLOT_TOOLTIP_UNDER_SIEGE") : Locale.compose("LOC_PLOT_TOOLTIP_HEALING_DISTRICT");
        const districtHealth = document.createElement("div");
        districtHealth.classList.add("plot-tooltip__district-health");
        const healthCaption = document.createElement("div");
        healthCaption.classList.add("plot-tooltip__health-caption", "plot-tooltip__line");
        healthCaption.innerHTML = currentHealth + '/' + maxHealth;
        districtHealth.appendChild(healthCaption);
        districtContainer.appendChild(districtTitle);
        districtContainer.appendChild(districtHealth);
        this.container.appendChild(districtContainer);
    }
}
TooltipManager.registerPlotType('plot', PlotTooltipPriority.LOW, new PlotTooltipType());
//# sourceMappingURL=file:///base-standard/ui/tooltips/plot-tooltip.js.map

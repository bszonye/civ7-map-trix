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
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';

// box metrics for warning banners
const BZ_BORDER_WIDTH = "0.1111111111rem";  // tooltip main border

// additional CSS definitions
const BZ_HEAD_STYLE = document.createElement('style');
BZ_HEAD_STYLE.textContent = [
`.tooltip.plot-tooltip.bz-tooltip .tooltip__content {
    /* width: 21.3333333333rem;  /* DEBUG */
    padding-top: ${BZ_BORDER_WIDTH};
}`,
// debug highlighting for content boxes
`.bz-tooltip > div > div > div {
    /* background-color: #80808040;  /* DEBUG */
}`,
`.bz-tooltip > div > div > div > div {
    /* background-color: #00c0c080;  /* DEBUG */
}`,
`.bz-tooltip > div > div > div > div p {
    /* background-color: #808080c0;  /* DEBUG */
}`,
`.bz-banner {
    text-align: center;
    margin-left: calc(${BZ_BORDER_WIDTH} - var(--padding-left-right));
    margin-right: calc(${BZ_BORDER_WIDTH} - var(--padding-left-right));
    padding-left: calc(var(--padding-left-right) - ${BZ_BORDER_WIDTH});
    padding-right: calc(var(--padding-left-right) - ${BZ_BORDER_WIDTH});
}`,
// centers blocks of rules text with max-w-60 equivalent
// IMPORTANT: Locale.stylize wraps text in an extra <p> element when it
// contains icons, which interferes with text-align and max-width.  the
// result also changes with single-line vs multi-line text.  these rules
// apply the properties in the correct order & scope to work with all
// combinations (with/without icons, single/multiple lines).
`.bz-tooltip .bz-rules-center {
    width: 100%;
    text-align: center;
    /* background-color: #00808080;  /* DEBUG */
}
.bz-tooltip .bz-rules-max-width {
    width: 100%;
    max-width: 13.3333333333rem;
    /* background-color: #00800080;  /* DEBUG */
}
.bz-tooltip .bz-rules-center p {
    width: 100%;
    /* background-color: #80808080;  /* DEBUG */
}`,
].join('\n');
document.head.appendChild(BZ_HEAD_STYLE);

// horizontal list separator
const BZ_DOT_DIVIDER = Locale.compose("LOC_PLOT_DIVIDER_DOT");

// constructible type for independent settlements
const BZ_VILLAGE_TYPES = ["IMPROVEMENT_VILLAGE", "IMPROVEMENT_ENCAMPMENT"];

// total yield icons
const BZ_YIELD_TOTAL_RURAL = "CITY_RURAL";
const BZ_YIELD_TOTAL_URBAN = "CITY_URBAN";

// color palette
const BZ_COLOR = {
    // game colors
    silver: "#4c5366",  // = primary
    bronze: "#e5d2ac",  // = secondary
    primary: "#4c5366",
    secondary: "#e5d2ac",
    accent: "#616266",
    accent1: "#e5e5e5",
    accent2: "#c2c4cc",
    accent3: "#9da0a6",
    accent4: "#85878c",
    accent5: "#616266",
    accent6: "#05070d",
    // alert colors
    black: "#000000",
    red: "#3a0806",  // danger
    amber: "#cea92f",  // caution
    brown: "#604639",  // note
    // geographic colors
    hill: "#604639",  // Rough terrain
    vegetated: "#445533",  // Vegetated features
    wet: "#335577",  // Wet features
    road: "#ccbbaa",  // Roads & Railroads
    // yield types
    culture: "#bf99e6",  // violet
    diplomacy: "#99e6bf",  // teal
    food: "#a6cc33",  // vegetated
    gold: "#f0c442",  // yellow
    happiness: "#ff9933",  // orange
    production: "#a33d29",  // brown
    science: "#80bfff",  // blue
};
const BZ_ALERT = {
    primary: { "background-color": BZ_COLOR.primary },
    secondary: { "background-color": BZ_COLOR.secondary, "color": BZ_COLOR.black },
    black: { "background-color": BZ_COLOR.black },
    red: { "background-color": BZ_COLOR.red },
    amber: { "background-color": BZ_COLOR.amber, "color": BZ_COLOR.black },
    brown: { "background-color": BZ_COLOR.brown },
    DEBUG: { "background-color": "#80808080" },
}
const BZ_STYLE = {
    road: { "background-color": BZ_COLOR.road, "color": BZ_COLOR.black },
    volcano: BZ_ALERT.amber,
    // obstacle types
    TERRAIN_HILL: { "background-color": BZ_COLOR.hill },
    TERRAIN_OCEAN: {},  // don't need to highlight this
    FEATURE_CLASS_VEGETATED: { "background-color": BZ_COLOR.vegetated },
    FEATURE_CLASS_WET: { "background-color": BZ_COLOR.wet },
    RIVER_MINOR: { "background-color": BZ_COLOR.wet },
    RIVER_NAVIGABLE: { "background-color": BZ_COLOR.wet },
}
// accent colors for building icons
const BZ_YIELD_COLOR = {
    "YIELD_CULTURE": BZ_COLOR.culture,  // violet
    "YIELD_DIPLOMACY": BZ_COLOR.diplomacy,  // teal
    "YIELD_FOOD": BZ_COLOR.food,  // green
    "YIELD_GOLD": BZ_COLOR.gold,  // yellow
    "YIELD_HAPPINESS": BZ_COLOR.happiness,  // orange
    "YIELD_PRODUCTION": BZ_COLOR.production,  // brown
    "YIELD_SCIENCE": BZ_COLOR.science,  // blue
    null: BZ_COLOR.bronze,  //default
}

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
function dotJoinLocale(list) {
    return dotJoin(list.map(s => Locale.compose(s)));
}
function gatherBuildingsTagged(tag) {
    return new Set(GameInfo.TypeTags.filter(e => e.Tag == tag).map(e => e.Type));
}
// get the set of obstacles that end movement for a movement class
const BZ_OBSTACLES = {};  // cache
function gatherMovementObstacles(mclass) {
    if (!mclass) {
        // get the movement class for the selected unit
        const unitID = UI.Player.getHeadSelectedUnit();
        const unit = unitID && Units.get(unitID);
        const unitType = unit && GameInfo.Units.lookup(unit.type);
        mclass = unitType?.UnitMovementClass ?? "UNIT_MOVEMENT_CLASS_FOOT";
    }
    if (mclass in BZ_OBSTACLES) return BZ_OBSTACLES[mclass];
    const obstacles = new Set();
    for (const o of GameInfo.UnitMovementClassObstacles) {
        if (!o.EndsTurn || o.UnitMovementClass != mclass) continue;
        if (o.FeatureType) obstacles.add(o.FeatureType);
        if (o.RiverType) obstacles.add(o.RiverType);
        if (o.TerrainType) obstacles.add(o.TerrainType);
    }
    // set the cache and return it
    return BZ_OBSTACLES[mclass] = obstacles;
}
function getConnections(city) {
    const ids = city?.getConnectedCities();
    let towns = [];
    let cities = [];
    for (const id of ids) {
        const conn = Cities.get(id);
        if (!conn) {
            console.warn(`bz-plot-tooltip: stale connection=${JSON.stringify(id)}`);
        } else if (conn.isTown) {
            towns.push(conn);
        } else {
            cities.push(conn);
        }
    }
    if (towns.length + cities.length == 0) return null;
    return { cities, towns };
}
function getReligionInfo(id) {
    // find a matching player religion, to get custom names
    let religion = GameInfo.Religions.lookup(id);
    const icon = `[icon:${religion.ReligionType}]`;
    let name = religion.Name;
    // find custom religion name, if any
    for (const player of Players.getEverAlive()) {
        const religion = player.Religion;
        if (religion?.getReligionType() != id) continue;
        name = religion.getReligionName();
        break;
    }
    return { name, icon };
}
function getReligions(city) {
    const religion = city?.Religion;
    if (!religion) return null;
    const list = [];
    if (religion.majorityReligion != -1) {
        const info = getReligionInfo(religion.majorityReligion);
        list.push(Locale.compose("LOC_BZ_RELIGION_MAJORITY", info.icon, info.name));
    }
    if (religion.urbanReligion != religion.majorityReligion) {
        const info = getReligionInfo(religion.urbanReligion);
        list.push(Locale.compose("LOC_BZ_RELIGION_URBAN", info.icon, info.name));
    }
    if (religion.ruralReligion != religion.majorityReligion) {
        const info = getReligionInfo(religion.ruralReligion);
        list.push(Locale.compose("LOC_BZ_RELIGION_RURAL", info.icon, info.name));
    }
    return list.length ? list : null;
}
function getSpecialists(loc, city) {
    if (city.isTown) return null;  // no specialists in towns
    const maximum = city.Workers?.getCityWorkerCap();
    if (!maximum) return null;
    const plotIndex = GameplayMap.getIndexFromLocation(loc);
    const plot = city.Workers.GetAllPlacementInfo().find(p => p.PlotIndex == plotIndex);
    if (!plot) return null;
    const workers = plot?.NumWorkers;
    if (!workers) return null;  // hide 0/X specialists
    return { workers, maximum };
}
function getTopUnit(loc) {
    let plotUnits = MapUnits.getUnits(loc.x, loc.y);
    if (plotUnits && plotUnits.length > 0) {
        const topUnit = Units.get(plotUnits[0]);
        return topUnit;
    }
    return null;
}
function getVillageIcon(loc) {
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
function setStyle(element, style) {
    if (!element || !style) return;
    for (const [property, value] of Object.entries(style)) {
        element.style.setProperty(property, value);
    }
}
function setBannerStyle(element, style=BZ_ALERT.red, ...classes) {
    element.classList.add("bz-banner", ...classes);
    setStyle(element, style);
}
function setCapsuleStyle(element, style, ...classes) {
    if (!style) return;
    element.classList.add("px-2", "rounded-full");
    if (classes.length) element.classList.add(...classes);
    setStyle(element, style);
}
class PlotTooltipType {
    constructor() {
        this.plotCoord = null;
        this.isShowingDebug = false;
        this.tooltip = document.createElement('fxs-tooltip');
        this.tooltip.classList.value = "bz-tooltip plot-tooltip max-w-96";
        this.container = document.createElement('div');
        this.tooltip.appendChild(this.container);
        this.yieldsFlexbox = document.createElement('div');
        this.totalYields = 0;
        this.isEnemy = false;  // is the plot held by an enemy?
        this.agelessBuildings = gatherBuildingsTagged("AGELESS");
        this.extraBuildings = gatherBuildingsTagged("IGNORE_DISTRICT_PLACEMENT_CAP");
        this.largeBuildings = gatherBuildingsTagged("FULL_TILE");
        this.obstacles = gatherMovementObstacles("UNIT_MOVEMENT_CLASS_FOOT");
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
    reset() {
        this.container.innerHTML = '';
        this.yieldsFlexbox.innerHTML = '';
        this.totalYields = 0;
        this.isEnemy = false;
    }
    update() {
        if (this.plotCoord == null) {
            console.error("plot-tooltip: cannot read plot values (coordinate error)");
            return;
        }
        this.isShowingDebug = UI.isDebugPlotInfoVisible();  // Ensure debug status hasn't changed
        // Obtain names and IDs
        const loc = this.plotCoord;
        const plotIndex = GameplayMap.getIndexFromLocation(loc);
        const playerID = GameplayMap.getOwner(loc.x, loc.y);
        const cityID = GameplayMap.getOwningCityFromXY(loc.x, loc.y);
        const districtID = MapCities.getDistrict(loc.x, loc.y);
        // player, city, district objects
        const player = Players.get(playerID);
        const city = cityID ? Cities.get(cityID) : null;
        const district = districtID ? Districts.get(districtID) : null;
        // update unit movement data
        this.obstacles = gatherMovementObstacles("UNIT_MOVEMENT_CLASS_FOOT");
        // collect yields first, to inform panel layouts
        this.collectYields(loc, district);
        // geography section
        this.appendGeographySection(loc, plotIndex);
        // civ & settlement section
        if (player) this.appendSettlementSection(loc, player, city);
        // hex tile section
        this.appendHexSection(loc, city, district);
        // yields section
        this.container.appendChild(this.yieldsFlexbox);
        // unit info section
        this.appendUnitSection(loc, player);
        // update UI & cursor
        UI.setPlotLocation(loc.x, loc.y, plotIndex);
        this.setWarningCursor(loc);
        if (this.isShowingDebug) this.appendDebugInfo(loc);
    }
    appendDivider() {
        const divider = document.createElement("div");
        divider.classList.add("plot-tooltip__Divider", "my-2");
        this.container.appendChild(divider);
    }
    appendFlexDivider(center, style=null) {
        const layout = document.createElement("div");
        layout.classList.value = "flex-auto flex justify-between items-center -mx-6";
        if (style) layout.classList.add(style);
        this.container.appendChild(layout);
        // left frame
        const lineLeft = document.createElement("div");
        lineLeft.classList.value = "flex-auto h-0\\.5 min-w-6 ml-1\\.5";
        lineLeft.style.setProperty("background-image", "linear-gradient(to left, #8D97A6, rgba(141, 151, 166, 0))");
        layout.appendChild(lineLeft);
        // content
        layout.appendChild(center);
        // right frame
        const lineRight = document.createElement("div");
        lineRight.classList.value = "flex-auto h-0\\.5 min-w-6 mr-1\\.5";
        lineRight.style.setProperty("background-image", "linear-gradient(to right, #8D97A6, rgba(141, 151, 166, 0))");
        layout.appendChild(lineRight);
    }
    appendTitleDivider(text=BZ_DOT_DIVIDER) {
        const layout = document.createElement("div");
        layout.classList.value = "font-title uppercase text-sm mx-3 max-w-80";
        layout.setAttribute("data-l10n-id", text);
        this.appendFlexDivider(layout);
    }
    appendGeographySection(loc, plotIndex) {
        // show geographical features
        const effects = this.getPlotEffects(plotIndex);
        const terrainLabel = this.getTerrainLabel(loc);
        const biomeLabel = this.getBiomeLabel(loc);
        const featureLabel = this.getFeatureLabel(loc);
        const river = this.getRiverInfo(loc);
        const continentName = this.getContinentName(loc);
        const distantLandsLabel = this.getDistantLandsLabel(loc);
        const routes = this.getRouteList();
        const hasRoad = routes.length != 0;
        // alert banners: settler warnings, damaging & defense effects
        const banners = [];
        banners.push(...this.getSettlerBanner(loc));
        banners.push(...effects.banners);
        for (const banner of banners) {
            this.container.appendChild(banner);
        }
        // tooltip title: terrain & biome
        const ttTitle = document.createElement("div");
        ttTitle.classList.value = "text-secondary font-title uppercase text-sm leading-snug text-center";
        if (!banners.length) {
            ttTitle.style.setProperty("padding-top", "var(--padding-top-bottom)");
        }
        const ttTerrain = document.createElement("div");
        setCapsuleStyle(ttTerrain, terrainLabel.style, "my-0\\.5");
        const title = biomeLabel ?
            Locale.compose("{1_TerrainName} {2_BiomeName}", terrainLabel.text, biomeLabel) :
            terrainLabel.text;
        ttTerrain.setAttribute('data-l10n-id', title);
        ttTitle.appendChild(ttTerrain);
        this.container.appendChild(ttTitle);
        // other geographical info
        const layout = document.createElement("div");
        layout.classList.value = "text-xs leading-snug text-center mb-2";
        if (featureLabel) {
            const tt = document.createElement("div");
            setCapsuleStyle(tt, featureLabel.style, "my-0\\.5");
            tt.setAttribute('data-l10n-id', featureLabel.text);
            layout.appendChild(tt);
        }
        if (river) routes.push(river.name);
        if (routes.length) {
            // road, ferry, river info
            const tt = document.createElement("div");
            // highlight priority: navigable rivers, roads, other rivers
            const routeStyle =
                river?.type == RiverTypes.RIVER_NAVIGABLE ? river.style :
                hasRoad ? BZ_STYLE.road :
                river.style;
            setCapsuleStyle(tt, routeStyle, "my-0\\.5");
            tt.innerHTML = dotJoinLocale(routes);
            layout.appendChild(tt);
        }
        if (effects.text.length) {
            const ttEffects = document.createElement("div");
            for (const effect of effects.text) {
                const tt = document.createElement("div");
                tt.setAttribute('data-l10n-id', effect);
                ttEffects.appendChild(tt);
            }
            layout.appendChild(ttEffects);
        }
        // continent + distant lands tag
        if (continentName) {
            const tt = document.createElement("div");
            tt.innerHTML = dotJoinLocale([continentName, distantLandsLabel]);
            layout.appendChild(tt);
        }
        this.container.appendChild(layout);
    }
    getSettlerBanner(loc) {
        const banners = [];
        if (LensManager.getActiveLens() != "fxs-settler-lens") return banners;
        //Add more details to the tooltip if we are in the settler lens
        const localPlayer = Players.get(GameContext.localPlayerID);
        if (!localPlayer) {
            console.error("plot-tooltip: Attempting to update settler tooltip, but no valid local player!");
            return banners;
        }
        const localPlayerDiplomacy = localPlayer?.Diplomacy;
        if (localPlayerDiplomacy === undefined) {
            console.error("plot-tooltip: Attempting to update settler tooltip, but no valid local player Diplomacy object!");
            return banners;
        }
        if (GameplayMap.isWater(loc.x, loc.y) || GameplayMap.isImpassable(loc.x, loc.y) || GameplayMap.isNavigableRiver(loc.x, loc.y)) {
            // Dont't add any extra tooltip to mountains, oceans, or navigable rivers, should be obvious enough w/o them
            return banners;
        }
        const localPlayerAdvancedStart = localPlayer?.AdvancedStart;
        if (localPlayerAdvancedStart === undefined) {
            console.error("plot-tooltip: Attempting to update settler tooltip, but no valid local player advanced start object!");
            return banners;
        }
        // Show why we can't settle here
        let warning;
        let warningStyle = BZ_ALERT.red;
        if (!GameplayMap.isPlotInAdvancedStartRegion(GameContext.localPlayerID, loc.x, loc.y) && !localPlayerAdvancedStart?.getPlacementComplete()) {
            warning = "LOC_PLOT_TOOLTIP_CANT_SETTLE_TOO_FAR";
        } else if (!localPlayerDiplomacy.isValidLandClaimLocation(loc, true /*bIgnoreFriendlyUnitRequirement*/)) {
            if (GameplayMap.getResourceType(loc.x, loc.y) != ResourceTypes.NO_RESOURCE) {
                warning = "LOC_PLOT_TOOLTIP_CANT_SETTLE_RESOURCES";
            } else {  // if (GameplayMap.isCityWithinMinimumDistance(loc.x, loc.y)) {
                warning = "LOC_PLOT_TOOLTIP_CANT_SETTLE_TOO_CLOSE";
            }
        } else if (!GameplayMap.isFreshWater(loc.x, loc.y)) {
            warningStyle = BZ_ALERT.amber;
            warning = "LOC_PLOT_TOOLTIP_NO_FRESH_WATER";
        }
        if (warning) {
            const tt = document.createElement("div");
            tt.classList.value = "text-xs leading-normal mb-1";
            setBannerStyle(tt, warningStyle);
            tt.setAttribute('data-l10n-id', warning);
            banners.push(tt);
        }
        return banners;
    }
    getPlotEffects(plotIndex) {
        const text = [];
        const banners = [];
        const plotEffects = MapPlotEffects.getPlotEffects(plotIndex);
        if (!plotEffects) return { text, banners };
        const localPlayerID = GameContext.localPlayerID;
        for (const item of plotEffects) {
            if (item.onlyVisibleToOwner && item.owner != localPlayerID) continue;
            const effectInfo = GameInfo.PlotEffects.lookup(item.effectType);
            if (!effectInfo) return;
            if (effectInfo.Damage || effectInfo.Defense) {
                const tt = document.createElement("div");
                tt.classList.value = "text-xs leading-normal mb-1";
                tt.setAttribute('data-l10n-id', effectInfo.Name);
                const style = effectInfo.Damage ? BZ_ALERT.red : BZ_ALERT.brown;
                setBannerStyle(tt, style);
                banners.push(tt);
            } else {
                text.push(effectInfo.Name);
            }
        }
        return { text, banners };
    }
    obstacleStyle(obstacleType, ...fallbackStyles) {
        if (!this.obstacles.has(obstacleType)) return null;
        const style = [obstacleType, ...fallbackStyles].find(s => s in BZ_STYLE);
        if (style) return BZ_STYLE[style];
        return BZ_ALERT.amber;
    }
    getTerrainLabel(loc) {
        const terrainType = GameplayMap.getTerrainType(loc.x, loc.y);
        const terrain = GameInfo.Terrains.lookup(terrainType);
        if (!terrain) return { text: "", style: null };
        let text = terrain.Name;
        const style = this.obstacleStyle(terrain.TerrainType);
        if (terrain.TerrainType == "TERRAIN_COAST" && GameplayMap.isLake(loc.x, loc.y)) {
            text = "LOC_TERRAIN_LAKE_NAME";
        }
        if (this.isShowingDebug) {
            text = Locale.compose('{1_Name} ({2_Value})', text, terrainType.toString());
        }
        return { text, style };
    }
    getBiomeLabel(loc) {
        const biomeType = GameplayMap.getBiomeType(loc.x, loc.y);
        const biome = GameInfo.Biomes.lookup(biomeType);
        // Do not show a label if marine biome.
        if (!biome || biome.BiomeType == "BIOME_MARINE") return "";
        return this.isShowingDebug ?
            Locale.compose('{1_Name} ({2_Value})', biome.Name, biomeType.toString()) :
            biome.Name;
    }
    getFeatureLabel(loc) {
        const featureType = GameplayMap.getFeatureType(loc.x, loc.y);
        const feature = GameInfo.Features.lookup(featureType);
        if (!feature) return null;
        let text = feature.Name;
        let style = this.obstacleStyle(feature.FeatureType, feature.FeatureClassType);
        if (GameplayMap.isVolcano(loc.x, loc.y)) {
            const active = GameplayMap.isVolcanoActive(loc.x, loc.y);
            const volcanoStatus = (active) ? 'LOC_VOLCANO_ACTIVE' : 'LOC_VOLCANO_NOT_ACTIVE';
            const volcanoName = GameplayMap.getVolcanoName(loc.x, loc.y);
            const volcanoDetailsKey = (volcanoName) ? 'LOC_UI_NAMED_VOLCANO_DETAILS' : 'LOC_UI_VOLCANO_DETAILS';
            text = Locale.compose(volcanoDetailsKey, text, volcanoStatus, volcanoName);
            // highlight active volcanoes
            if (active) style = BZ_STYLE.volcano;
        }
        return { text, style };
    }
    getRiverInfo(loc) {
        const riverType = GameplayMap.getRiverType(loc.x, loc.y);
        if (riverType == RiverTypes.NO_RIVER) return null;
        let name = GameplayMap.getRiverName(loc.x, loc.y);
        let style;
        switch (riverType) {
            case RiverTypes.RIVER_MINOR:
                if (!name) name = "LOC_MINOR_RIVER_NAME";
                style = this.obstacleStyle("RIVER_MINOR");
                break;
            case RiverTypes.RIVER_NAVIGABLE:
                if (!name) name = "LOC_NAVIGABLE_RIVER_NAME";
                style = this.obstacleStyle("RIVER_NAVIGABLE");
                break;
        }
        if (!name) return null;
        return { name, style, type: riverType };
    }
    getContinentName(loc) {
        const continentType = GameplayMap.getContinentType(loc.x, loc.y);
        const continent = GameInfo.Continents.lookup(continentType);
        if (!continent?.Description) return null;
        return continent.Description;
    }
    getDistantLandsLabel(loc) {
        const localPlayer = Players.get(GameContext.localPlayerID);
        return localPlayer?.isDistantLands(loc) ?
            "LOC_RESOURCE_GENERAL_TYPE_DISTANT_LANDS" :
            "LOC_BZ_HEMISPHERE_HOMELANDS";
    }
    getRouteList() {
        const routeType = GameplayMap.getRouteType(this.plotCoord.x, this.plotCoord.y);
        const route = GameInfo.Routes.lookup(routeType);
        if (!route) return [];
        return GameplayMap.isFerry(this.plotCoord.x, this.plotCoord.y) ?
            [route.Name, "LOC_NAVIGABLE_RIVER_FERRY"] :
            [route.Name];
    }
    appendSettlementSection(loc, player, city) {
        const name = city ?  city.name :  // city or town
            player.isAlive ?  this.getCivName(player) :  // village
            null;  // discoveries are owned by a placeholder "World" player
        if (!name) return;
        this.appendTitleDivider(name);
        // owner info
        this.appendOwnerInfo(loc, player);
        // settlement stats (only show at the city center)
        if (!city || city.location.x != loc.x || city.location.y != loc.y) return;
        const stats = [];
        // settlement connections
        const connections = getConnections(city);
        if (connections) {
            const connectionsNote = Locale.compose("LOC_BZ_CITY_CONNECTIONS",
                connections.cities.length, connections.towns.length);
            stats.push(connectionsNote);
        }
        // religion
        const religions = getReligions(city);
        if (religions) {
            stats.push(...religions);
        }
        // fresh water
        if (!GameplayMap.isFreshWater(city.location.x, city.location.y)) {
            stats.push(["LOC_BZ_PLOTKEY_NO_FRESHWATER"]);
        }
        if (stats.length) {
            this.appendRules(stats, "-mt-1 mb-2");  // tighten space above icon
        }
    }
    appendOwnerInfo(loc, player) {
        if (!player || !Players.isAlive(player.id)) return;
        const filteredConstructibles = MapConstructibles.getHiddenFilteredConstructibles(loc.x, loc.y);
        const constructibles = MapConstructibles.getConstructibles(loc.x, loc.y);
        if (filteredConstructibles.length == 0 && filteredConstructibles.length != constructibles.length) {
            return;
        }
        const layout = document.createElement("div");
        layout.classList.value = "text-xs leading-snug text-center mb-2";
        const playerName = this.getPlayerName(player);
        const relationship = this.getCivRelationship(player);
        const relType = Locale.compose(relationship?.type);
        const civName = this.getCivName(player, true);
        // highlight enemy players
        if (relationship) {
            this.isEnemy = relationship.isEnemy;
            if (relationship.isEnemy) {
                layout.classList.add("py-1");
                setBannerStyle(layout);
            }
        }
        // show name & relationship
        const ttPlayer = document.createElement("div");
        ttPlayer.innerHTML = dotJoin([playerName, relType]);
        layout.appendChild(ttPlayer);
        // show full civ name
        const ttCiv = document.createElement("div");
        ttCiv.setAttribute('data-l10n-id', civName);
        layout.appendChild(ttCiv);
        this.container.appendChild(layout);
    }
    getPlayerName(player) {
        if (player == null) return "";
        const name = player.isMinor || player.isIndependent ?
            Locale.compose("LOC_LEADER_BZ_PEOPLE_NAME", player.name) :
            Locale.compose(player.name);
        return name;
    }
    getCivName(player, fullName=false) {
        if (player == null) return "";
        const civName = fullName || player.isMinor || player.isIndependent ?
            player.civilizationFullName :  // "Venice"
            player.civilizationName;  // "Spain"
        const name = player.isIndependent && fullName ?
            // add "Village" to the full name of independents
            Locale.compose("LOC_CIVILIZATION_INDEPENDENT_SINGULAR", civName) :
            Locale.compose(civName);
        return name;
    }
    getCivRelationship(player) {
        const localPlayerID = GameContext.localPlayerID;
        if (player.id == localPlayerID) {
            return { type: "LOC_PLOT_TOOLTIP_YOU", isEnemy: false };
        }
        if (!player.Diplomacy) return null;
        // is the other player a city-state or village?
        if (player.isMinor || player.isIndependent) {
            const isVassal = player.Influence?.hasSuzerain &&
                player.Influence.getSuzerain() == localPlayerID;
            const isEnemy = player.Diplomacy?.isAtWarWith(localPlayerID);
            const name = isVassal ?  "LOC_INDEPENDENT_BZ_RELATIONSHIP_TRIBUTARY" :
                 isEnemy ?  "LOC_INDEPENDENT_RELATIONSHIP_HOSTILE" :
                "LOC_INDEPENDENT_RELATIONSHIP_FRIENDLY";
            return { type: name, isEnemy: isEnemy };
        }
        // is the other player at war?
        if (player.Diplomacy.isAtWarWith(localPlayerID)) {
            return { type: "LOC_PLAYER_RELATIONSHIP_AT_WAR", isEnemy: true };
        }
        // not an enemy
        if (player.Diplomacy.hasAllied(localPlayerID)) {
            return { type: "LOC_PLAYER_RELATIONSHIP_ALLIANCE", isEnemy: false };
        }
        const name = player.Diplomacy.getRelationshipLevelName(localPlayerID);
        return { type: name, isEnemy: false };
    }
    appendHexSection(loc, city, district) {
        switch (district?.type) {
            case DistrictTypes.CITY_CENTER:
            case DistrictTypes.URBAN:
                this.appendUrbanSection(loc, city, district);
                break;
            case DistrictTypes.RURAL:
            case DistrictTypes.WILDERNESS:
            default:
                this.appendRuralSection(loc, city, district);
                break;
            case DistrictTypes.WONDER:
                this.appendWonderSection(loc);
                break;
        }
    }
    appendUrbanSection(loc, city, district) {
        const constructibles = this.getConstructibleInfo(loc);
        const buildings = constructibles.filter(e => !e.isExtra);
        const quarterOK = buildings.reduce((a, b) =>
            a + (b.isCurrent ? b.isLarge ? 2 : 1 : 0), 0);
        let hexName = GameInfo.Districts.lookup(district?.type).Name;
        let hexSubtitle;
        let hexRules;
        // set name & description
        if (district.type == DistrictTypes.CITY_CENTER) {
            const player = Players.get(city.owner);
            if (player.isMinor) {
                hexName = "LOC_DISTRICT_BZ_CITY_STATE";
                const bonusType = Game.CityStates.getBonusType(player.id);
                const bonus = GameInfo.CityStateBonuses.find(b => b.$hash == bonusType);
                if (bonus) {
                    hexSubtitle = bonus.Name;
                    hexRules = bonus.Description;  // .Tooltip doesn't exist
                }
            } else if (city.isTown) {
                // rename "City Center" to "Town Center" in towns
                hexName = "LOC_DISTRICT_BZ_TOWN_CENTER";
            }
        } else if (buildings.length == 0) {
            // urban tile with canceled production
            hexName = "LOC_DISTRICT_BZ_URBAN_VACANT";
        } else if (quarterOK >= 2) {
            const unique = buildings[0].uniqueTrait;
            if (buildings.every(b => b.uniqueTrait = unique)) {
                const uq = GameInfo.UniqueQuarters.find(e => e.TraitType == unique);
                hexName = uq.Name;
                // UQs don't have .Tooltip but they all have parallel
                // LOC_QUARTER_XXX_DESCRIPTION and
                // LOC_QUARTER_XXX_TOOLTIP localization strings
                const tooltip = uq.Description.replace("_DESCRIPTION", "_TOOLTIP");
                hexRules = Locale.compose(tooltip) ?? uq.Description;
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
        // show rules for city-states and unique quarters
        if (hexRules) {
            const title = "font-title uppercase text-xs leading-snug";
            if (hexSubtitle) this.appendRules([hexSubtitle], '', title);
            this.appendRules([hexRules]);
        }
        // religion
        // constructibles
        this.appendConstructibles(constructibles);
        // report specialists
        const specialists = getSpecialists(loc, city);
        if (specialists) {
            const text = Locale.compose("LOC_DISTRICT_BZ_SPECIALISTS",
                specialists.workers, specialists.maximum);
            this.appendRules([text], "-mt-1 mb-2");  // tighten space above icon
        }
        // bottom bar
        this.appendUrbanDivider(buildings.filter(e => !e.isExtra));
    }
    appendRuralSection(loc, city, district) {
        const constructibles = this.getConstructibleInfo(loc);
        const improvement = constructibles[0]?.info;
        const improvementType = improvement?.ConstructibleType;
        let hexName;
        let hexRules;
        let hexIcon;
        let resourceIcon;
        // special tile types: natural wonder, resource
        const featureType = GameplayMap.getFeatureType(loc.x, loc.y);
        const feature = GameInfo.Features.lookup(featureType);
        const hexResource = this.getResource();
        // set name & description
        if (feature && feature.Tooltip) {
            hexName = feature.Name;
            hexRules = feature.Tooltip;
        } else if (hexResource) {
            hexName = hexResource.Name;
            hexRules = hexResource.Tooltip;
            resourceIcon = hexResource.ResourceType;
        } else if (district?.type) {
            hexName = GameInfo.Districts.lookup(district?.type).Name;
        } else if (!improvement && this.totalYields == 0) {
            return;  // nothing to show and nothing to follow
        } else if (city) {
            hexName = "LOC_DISTRICT_BZ_UNDEVELOPED";
        } else {
            hexName = GameInfo.Districts.lookup(DistrictTypes.WILDERNESS).Name;
        }
        // get the panel icon and adjust the title if necessary
        if (!improvement) {
            // no improvements, no icon
            hexIcon = null;
        } else if (BZ_VILLAGE_TYPES.includes(improvementType)) {
            // encampments and villages get icons based on their unique improvements,
            // appropriate for the age and minor civ type
            hexName = "LOC_DISTRICT_BZ_INDEPENDENT";
            hexIcon = getVillageIcon(loc);
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
        // optional description
        if (hexRules) {
            this.appendRules([hexRules]);
        }
        // religion
        // constructibles
        this.appendConstructibles(constructibles);
        // bottom bar
        if (hexIcon) {
            this.appendIconDivider(hexIcon, resourceIcon);
        } else if (resourceIcon) {
            this.appendIconDivider(resourceIcon);
        } else if (hexRules) {
            this.appendDivider(resourceIcon);
        }
    }
    appendWonderSection(loc) {
        const constructibles = this.getConstructibleInfo(loc);
        if (constructibles.length != 1) {
            console.warn(`bz-plot-tooltip: expected exactly one wonder, not ${constructibles.length}`);
            if (!constructibles.length) return;
        }
        const wonder = constructibles[0]?.info;
        const notes = constructibles[0]?.notes;
        this.appendTitleDivider(Locale.compose(wonder.Name));
        if (notes) {
            const ttState = document.createElement("div");
            ttState.classList.value = "leading-none";
            ttState.style.setProperty("font-size", "85%");
            ttState.innerHTML = dotJoinLocale(notes);
            this.container.appendChild(ttState);
        }
        this.appendRules([wonder.Tooltip]);
        this.appendIconDivider(wonder.ConstructibleType);
    }
    getResource() {
        if (this.plotCoord) {
            const resourceType = GameplayMap.getResourceType(this.plotCoord.x, this.plotCoord.y);
            return GameInfo.Resources.lookup(resourceType);
        }
        return null;
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
                info, age, isCurrent, isExtra, isLarge, isDamaged, notes, uniqueTrait
            });
        };
        constructibleInfo.sort((a, b) =>
            (b.isExtra ? -1 : b.age) - (a.isExtra ? -1 : a.age));
        return constructibleInfo;
    }
    // lay out a column of constructibles and their construction notes
    appendConstructibles(constructibles) {
        if (!constructibles?.length) return;
        const ttList = document.createElement("div");
        ttList.classList.value = "text-xs leading-snug text-center mb-2";
        for (const c of constructibles) {
            const ttConstructible = document.createElement("div");
            const ttName = document.createElement("div");
            ttName.classList.value = "text-accent-2 font-title uppercase";
            ttName.setAttribute("data-l10n-id", c.info.Name);
            ttConstructible.appendChild(ttName);
            const notes = dotJoinLocale(c.notes);
            if (notes) {
                const ttState = document.createElement("div");
                ttState.style.setProperty("font-size", "85%");
                if (c.isDamaged) {
                    setCapsuleStyle(ttState, BZ_ALERT.amber, "mb-0\\.5");
                } else {
                    ttState.classList.value = "-mt-1";
                }
                ttState.innerHTML = notes;
                ttConstructible.appendChild(ttState);
            }
            ttList.appendChild(ttConstructible);
        }
        this.container.appendChild(ttList);
    }
    // lay out paragraphs of rules text
    appendRules(text, listStyle=null, rowStyle=null) {
        // text with icons is squirrelly, only format it at top level!
        const ttText = document.createElement("div");
        ttText.classList.value = listStyle ?? "mb-2";
        ttText.classList.add("bz-rules-center");
        for (const row of text) {
            const ttRow = document.createElement("div");
            ttRow.classList.value = rowStyle ?? "text-xs leading-snug";
            ttRow.classList.add("bz-rules-max-width");
            ttRow.setAttribute("data-l10n-id", row);
            ttText.appendChild(ttRow);
        }
        this.container.appendChild(ttText);
    }
    appendDistrictDefense(loc) {
        const districtID = MapCities.getDistrict(loc.x, loc.y);
        if (!districtID) return;
        // occupation status
        const district = Districts.get(districtID);
        const info = [];
        if (district.owner != district.controllingPlayer) {
            const conqueror = Players.get(district.controllingPlayer);
            const conquerorName = this.getCivName(conqueror, true);
            const conquerorText = Locale.compose("{1_Term} {2_Subject}", "LOC_PLOT_TOOLTIP_CONQUEROR", conquerorName);
            const ttConqueror = document.createElement("div");
            setBannerStyle(ttConqueror, { color: BZ_COLOR.amber });
            ttConqueror.innerHTML = conquerorText;
            info.push(ttConqueror);
        }
        // district health
        const playerID = GameplayMap.getOwner(loc.x, loc.y);
        const playerDistricts = Players.Districts.get(playerID);
        if (!playerDistricts) return;
        // This type is unresolved, is it meant to be number instead?
        const currentHealth = playerDistricts.getDistrictHealth(loc);
        const maxHealth = playerDistricts.getDistrictMaxHealth(loc);
        const isUnderSiege = playerDistricts.getDistrictIsBesieged(loc);
        if (DistrictHealthManager.canShowDistrictHealth(currentHealth, maxHealth)) {
            // under siege or healing
            const ttStatus = document.createElement("div");
            ttStatus.setAttribute("data-l10n-id", isUnderSiege ?
                "LOC_PLOT_TOOLTIP_UNDER_SIEGE" : "LOC_PLOT_TOOLTIP_HEALING_DISTRICT");
            info.push(ttStatus);
            // current health
            const ttHealth = document.createElement("div");
            setStyle(ttHealth, { color: BZ_COLOR.amber });
            ttHealth.innerHTML = currentHealth + '/' + maxHealth;
            info.push(ttHealth);
        }
        if (info.length) {
            const ttDefense = document.createElement("div");
            ttDefense.classList.value = "text-xs leading-snug mb-1 py-1";
            setBannerStyle(ttDefense);
            for (const row of info) ttDefense.appendChild(row);
            this.container.appendChild(ttDefense);
        }
    }
    appendIconDivider(icon, overlay=null) {
        // icon divider with optional overlay
        if (!icon.startsWith("url(")) icon = UI.getIconCSS(icon);
        if (overlay && !overlay.startsWith("url(")) overlay = UI.getIconCSS(overlay);
        const layout = document.createElement("div");
        layout.classList.add("flex-grow", "relative");
        const base = document.createElement("div");
        const iconStyle = "bg-contain bg-center -my-1 mx-3";  // tight vertical
        base.classList.value = `${iconStyle} size-12`;
        base.style.backgroundImage = icon;
        layout.appendChild(base);
        if (overlay) {
            const over = document.createElement("div");
            over.classList.value = `${iconStyle} size-9 absolute top-1\\.5 left-1\\.5`;
            over.style.backgroundImage = overlay;
            layout.appendChild(over);
        }
        this.appendFlexDivider(layout, "mb-2");
    }
    appendUrbanDivider(buildings) {
        // there are at least two building slots (unless one is large)
        const slots = [...buildings];
        if (slots.length < 2 && !buildings[0]?.isLarge)
            slots.push(...[null, null].slice(buildings.length));
        // render the icons
        const layout = document.createElement("div");
        layout.classList.value = "flex flex-grow relative mx-2";
        for (let slot of slots) {
            if (!slot) {
                // show an empty slot with a transparent yield ring
                const ttFrame = document.createElement("div");
                ttFrame.classList.value = "border-2 rounded-full mx-1\\.5";
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
            ttFrame.classList.value = "border-2 rounded-full mx-1\\.5";
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
        this.appendFlexDivider(layout, "mb-2");
    }
    collectYields(loc, district) {
        this.yieldsFlexbox.classList.value = "plot-tooltip__resourcesFlex";
        this.yieldsFlexbox.innerHTML = '';
        this.totalYields = 0;
        const localPlayerID = GameContext.localPlayerID;
        const fragment = document.createDocumentFragment();
        // one column per yield type
        const amounts = [];
        GameInfo.Yields.forEach(info => {
            const amount = GameplayMap.getYield(loc.x, loc.y, info.YieldType, localPlayerID);
            if (amount) {
                amounts.push(amount);
                this.totalYields += amount;
                const col = this.yieldColumn(info.YieldType, amount, info.Name);
                fragment.appendChild(col);
            }
        });
        if (!this.totalYields) return;  // no yields to show
        // total yield column
        const icon = district ? BZ_YIELD_TOTAL_URBAN : BZ_YIELD_TOTAL_RURAL;
        amounts.push(this.totalYields);
        const col = this.yieldColumn(icon, this.totalYields, "LOC_YIELD_BZ_TOTAL");
        fragment.appendChild(col);
        // set column width based on number of digits (at least two)
        const numWidth = (n) => {
            const frac = n % 1 != 0;
            // decimal points need a little less room
            return n.toString().length - (frac ? 0.4 : 0);
        };
        const maxWidth = Math.max(2, ...amounts.map(n => numWidth(n)));
        const yieldWidth = 1 + maxWidth / 3;  // width in rem
        this.yieldsFlexbox.style.setProperty("--yield-width", `${yieldWidth}rem`);
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
    appendUnitSection(loc) {
        const localPlayerID = GameContext.localObserverID;
        if (GameplayMap.getRevealedState(localPlayerID, loc.x, loc.y) != RevealedStates.VISIBLE) return;
        // get topmost unit and owner
        let topUnit = getTopUnit(loc);
        if (!topUnit || !Visibility.isVisible(localPlayerID, topUnit.id)) return;
        const owner = Players.get(topUnit.owner);
        if (!owner) return;
        // friendly unit? clear the enemy flag
        if (owner.id == localPlayerID) {
            this.isEnemy = false;
            return;
        }
        // show unit section
        this.appendDivider();
        const layout = document.createElement("div");
        layout.classList.value = "text-xs leading-snug text-center";
        const unitName = topUnit.name;
        const civName = this.getCivName(owner);
        const relationship = this.getCivRelationship(owner);
        const unitInfo = [unitName, civName, relationship?.type];
        layout.innerHTML = dotJoinLocale(unitInfo);
        if (relationship) {
            this.isEnemy = relationship.isEnemy;
            if (relationship.isEnemy) {
                layout.classList.add("py-1");
                setBannerStyle(layout);
            }
        }
        this.container.appendChild(layout);
    }
    setWarningCursor(loc) {
        // Adjust cursor between normal and red based on the plot owner's hostility
        if (UI.isCursorLocked()) return;
        // don't block cursor changes from interface-mode-acquire-tile
        if (InterfaceMode.getCurrent() == "INTERFACEMODE_ACQUIRE_TILE") return;
        // determine who controls the hex under the cursor
        const localPlayerID = GameContext.localPlayerID;
        const topUnit = getTopUnit(loc);
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
                        this.isEnemy = true;
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
                            this.isEnemy = true;
                        }
                    }
                }
            }
        }
        if (this.isEnemy) {
            UI.setCursorByURL("fs://game/core/ui/cursors/enemy.ani");
        }
        else {
            UI.setCursorByType(UIHTMLCursorTypes.Default);
        }
    }
    appendDebugInfo(loc) {
        //debug info
        const plotIndex = GameplayMap.getIndexFromLocation(loc);
        const layout = document.createElement("div");
        // layout.classList.add("plot-tooltip__debug-flexbox");
        layout.classList.value = "flex flex-col";
        setBannerStyle(layout);
        this.container.appendChild(layout);
        const playerID = GameplayMap.getOwner(this.plotCoord.x, this.plotCoord.y);
        const currHp = Players.Districts.get(playerID)?.getDistrictHealth(this.plotCoord);
        const maxHp = Players.Districts.get(playerID)?.getDistrictMaxHealth(this.plotCoord);
        const ttDebugTitle = document.createElement("div");
        ttDebugTitle.classList.value = "text-secondary font-title uppercase text-xs text-center";
        if ((currHp != undefined && currHp != 0) && (maxHp != undefined && maxHp != 0)) {
            ttDebugTitle.innerHTML = Locale.compose("LOC_PLOT_TOOLTIP_DEBUG_TITLE") + ": " + currHp + " / " + maxHp;
            layout.appendChild(ttDebugTitle);
        }
        else {
            ttDebugTitle.innerHTML = Locale.compose("LOC_PLOT_TOOLTIP_DEBUG_TITLE") + ":";
            layout.appendChild(ttDebugTitle);
        }
        const ttDebugPlotCoord = document.createElement("div");
        ttDebugPlotCoord.classList.add("plot-tooltip__coordinate-text");
        ttDebugPlotCoord.innerHTML = Locale.compose("LOC_PLOT_TOOLTIP_PLOT") + `: (${this.plotCoord.x},${this.plotCoord.y})`;
        layout.appendChild(ttDebugPlotCoord);
        const ttDebugPlotIndex = document.createElement("div");
        ttDebugPlotIndex.classList.add("plot-tooltip__coordinate-text");
        ttDebugPlotIndex.innerHTML = Locale.compose("LOC_PLOT_TOOLTIP_INDEX") + `: ${plotIndex}`;
        layout.appendChild(ttDebugPlotIndex);
        const localPlayer = Players.get(GameContext.localPlayerID);
        if (localPlayer != null) {
            if (localPlayer.isDistantLands(this.plotCoord)) {
                const ttDebugPlotTag = document.createElement("div");
                ttDebugPlotTag.classList.add("plot-tooltip__coordinate-text");
                ttDebugPlotTag.innerHTML = Locale.compose("LOC_PLOT_TOOLTIP_HEMISPHERE_WEST");
                layout.appendChild(ttDebugPlotTag);
            }
            else {
                const ttDebugPlotTag = document.createElement("div");
                ttDebugPlotTag.classList.add("plot-tooltip__coordinate-text");
                ttDebugPlotTag.innerHTML = Locale.compose("LOC_PLOT_TOOLTIP_HEMISPHERE_EAST");
                layout.appendChild(ttDebugPlotTag);
            }
        }
    }
}
TooltipManager.registerPlotType('plot', PlotTooltipPriority.LOW, new PlotTooltipType());

//# sourceMappingURL=file:///base-standard/ui/tooltips/plot-tooltip.js.map

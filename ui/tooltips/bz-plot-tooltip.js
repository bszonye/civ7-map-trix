/**
 * Plot Tooltips
 * @copyright 2022, Firaxis Gmaes
 * @description The tooltips that appear based on the cursor hovering over world plots.
 */
import bzMapTrixOptions from '/bz-map-trix/ui/options/bz-map-trix-options.js';
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
`.bz-tooltip.bz-debug > div > div > div {
    background-color: #80808040;  /* DEBUG */
}`,
`.bz-tooltip.bz-debug > div > div > div > div {
    background-color: #00c0c080;  /* DEBUG */
}`,
`.bz-tooltip.bz-debug > div > div > div > div p {
    background-color: #808080c0;  /* DEBUG */
}`,
`.bz-banner {
    text-align: center;
    margin-left: calc(${BZ_BORDER_WIDTH} - var(--padding-left-right));
    margin-right: calc(${BZ_BORDER_WIDTH} - var(--padding-left-right));
    padding-left: calc(var(--padding-left-right) - ${BZ_BORDER_WIDTH});
    padding-right: calc(var(--padding-left-right) - ${BZ_BORDER_WIDTH});
}`,
`.bz-text-xxs {
    font-size: 0.7777777778rem;
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
// fix relationship tooltips
`.bz-relationship-fix .tooltip.relationship-tooltip {
    max-width: 17.7777777778rem;
}
.bz-relationship-fix .relationship-tooltip__agenda-description {
    width: 100%;
    text-align: center;
}
.bz-relationship-fix .relationship-tooltip__agenda-description > p {
    width: 100%;
}`,
].join('\n');
document.head.appendChild(BZ_HEAD_STYLE);
// sync optional styling
if (bzMapTrixOptions.relationshipFix) {
    document.body.classList.add("bz-relationship-fix");
} else {
    document.body.classList.remove("bz-relationship-fix");
}
if (bzMapTrixOptions.yieldBanner) {
    document.body.classList.add("bz-yield-banner");
} else {
    document.body.classList.remove("bz-yield-banner");
}

// horizontal list separator
const BZ_DOT_DIVIDER = Locale.compose("LOC_PLOT_DIVIDER_DOT");

// all urban DistrictTypes
const BZ_URBAN_TYPES = [DistrictTypes.CITY_CENTER, DistrictTypes.URBAN];
// constructible type for independent settlements
const BZ_VILLAGE_TYPES = ["IMPROVEMENT_VILLAGE", "IMPROVEMENT_ENCAMPMENT"];

// total yield icons
const BZ_YIELD_TOTAL_RURAL = "CITY_RURAL";
const BZ_YIELD_TOTAL_URBAN = "CITY_URBAN";
// empty building slot
const BZ_SLOT_EMPTY = "BUILDING_OPEN";

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
// get the set of unique traits for a civilization
const BZ_CIV_TRAITS = {};  // cache
function gatherCivTraits(civType) {
    if (civType in BZ_CIV_TRAITS) return BZ_CIV_TRAITS[civType];
    const traits = (GameInfo.CivilizationTraits
        .filter(trait => trait.CivilizationType == civType)
        .map(trait => trait.TraitType));
    // set the cache and return it
    return BZ_CIV_TRAITS[civType] = new Set(traits);
}
// get the geographic rules for rural expansions (new improvements)
const BZ_EXPANSION_RULES = {};  // cache
function gatherExpansionRules(civType) {
    if (civType in BZ_EXPANSION_RULES) return BZ_EXPANSION_RULES[civType];
    const traits = gatherCivTraits(civType);
    const support = {};
    for (const row of GameInfo.District_FreeConstructibles) {
        const imp = GameInfo.Improvements.lookup(row.ConstructibleType);
        // unique improvement: check against player traits
        if (imp.TraitType && !traits?.has(imp.TraitType)) continue;
        // get the geographic selector (TERRAIN_HILL, RIVER_MINOR, etc)
        const key = (row.ResourceType || row.RiverType ||
            row.FeatureType || row.TerrainType || row.BiomeType);
        if (!key) continue;
        // collect the matching improvement type and priority
        support[key] = {
            constructible: row.ConstructibleType,
            priority: row.Priority,
        };
    }
    // set the cache and return it
    return BZ_EXPANSION_RULES[civType] = support;
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
    if (!ids) return null;
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
    for (const founder of Players.getEverAlive()) {
        if (founder.Religion?.getReligionType() != id) continue;
        name = founder.Religion.getReligionName();
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
function getVillageIcon(owner, age) {
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
    let ctype = "MILITARISTIC";  // default
    GameInfo.Independents.forEach(i => {
        if (owner.civilizationAdjective == i.CityStateName) ctype = i.CityStateType;
    });
    // select an icon
    const icons = villages[ctype ?? "MILITARISTIC"];
    const index = age?.ChronologyIndex ?? 0;
    const icon = icons.at(index) ?? icons.at(-1);
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
        this.plotIndex = null;
        this.isShowingDebug = false;
        this.modCtrl = false;
        this.modShift = false;
        this.isVerbose = this.modCtrl || this.modShift || bzMapTrixOptions.verbose;
        // document root
        this.tooltip = document.createElement('fxs-tooltip');
        this.tooltip.classList.value = "bz-tooltip plot-tooltip max-w-96";
        this.container = document.createElement('div');
        this.tooltip.appendChild(this.container);
        // player-dependent info (may change with hotseat mode)
        this.player = Players.get(GameContext.localPlayerID);
        this.playerCiv = GameInfo.Civilizations.lookup(this.player.civilizationType);
        this.expansionRules = gatherExpansionRules(this.playerCiv.CivilizationType);
        // selection-dependent info
        this.obstacles = gatherMovementObstacles("UNIT_MOVEMENT_CLASS_FOOT");
        // world
        this.age = null;
        this.terrain = null;
        this.biome = null;
        this.feature = null;
        this.river = null;
        this.resource = null;
        // ownership
        this.owner = null;
        this.city = null;
        this.district = null;
        // settlement stats
        this.isCityCenter = false;
        this.connections = null;
        this.religions = null;
        this.isFreshWater = null;
        // constructibles
        this.constructibles = [];
        this.buildings = [];  // omits walls
        this.improvement = null;
        this.wonder = null;
        this.expansion = null;  // improvement type for rural expansion
        this.warehouse = null;  // improvement type for warehouses
        // yields
        this.yields = [];
        this.totalYields = 0;
        // cursor modifier
        this.isEnemy = false;  // is the plot held by an enemy?
        // lookup tables
        this.agelessBuildings = gatherBuildingsTagged("AGELESS");
        this.extraBuildings = gatherBuildingsTagged("IGNORE_DISTRICT_PLACEMENT_CAP");
        this.largeBuildings = gatherBuildingsTagged("FULL_TILE");
        Loading.runWhenFinished(() => {
            for (const y of GameInfo.Yields) {
                const url = UI.getIcon(`${y.YieldType}`, "YIELD");
                Controls.preloadImage(url, 'plot-tooltip');
            }
            for (const y of [BZ_YIELD_TOTAL_RURAL, BZ_YIELD_TOTAL_URBAN]) {
                const url = UI.getIcon(y, "YIELD");
                Controls.preloadImage(url, 'plot-tooltip');
            }
            for (const icon of [BZ_SLOT_EMPTY]) {
                const url = UI.getIcon(icon);
                Controls.preloadImage(url, 'plot-tooltip');
            }
        });
    }
    getHTML() {
        return this.tooltip;
    }
    isUpdateNeeded(plotCoord) {
        // allow Ctrl and Shift modifiers to change tooltip
        const modCtrl = Input.isCtrlDown();
        const modShift = Input.isShiftDown();
        const isVerbose = modCtrl || modShift || bzMapTrixOptions.verbose;
        if (modCtrl != this.modCtrl || modShift != this.modShift || isVerbose != this.isVerbose) {
            this.modCtrl = modCtrl;
            this.modShift = modShift;
            this.isVerbose = isVerbose;
            return true;
        }

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
        const revealedState = GameplayMap.getRevealedState(this.player.id, this.plotCoord.x, this.plotCoord.y);
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
        this.plotIndex = null;
        // document root
        this.container.innerHTML = '';
        // player-dependent info (may change with hotseat mode)
        this.player = Players.get(GameContext.localPlayerID);
        this.playerCiv = GameInfo.Civilizations.lookup(this.player.civilizationType);
        this.expansionRules = gatherExpansionRules(this.playerCiv.CivilizationType);
        // selection-dependent info
        this.obstacles = gatherMovementObstacles("UNIT_MOVEMENT_CLASS_FOOT");
        // world
        this.age = null;
        this.terrain = null;
        this.biome = null;
        this.feature = null;
        this.river = null;
        this.resource = null;
        // ownership
        this.owner = null;
        this.city = null;
        this.district = null;
        // settlement stats
        this.isCityCenter = false;
        this.connections = null;
        this.religions = null;
        this.isFreshWater = null;
        // constructibles
        this.constructibles = [];
        this.buildings = [];
        this.improvement = null;
        this.wonder = null;
        this.expansion = null;  // improvement type for rural expansion
        this.warehouse = null;  // improvement type for warehouses
        // yields
        this.yields = [];
        this.totalYields = 0;
        // cursor modifier
        this.isEnemy = false;
    }
    update() {
        if (this.plotCoord == null) {
            console.error("plot-tooltip: cannot read plot values (coordinate error)");
            return;
        }
        this.plotIndex = GameplayMap.getIndexFromLocation(this.plotCoord);
        // show debug info if enabled + extra info when Ctrl is held
        this.isShowingDebug = UI.isDebugPlotInfoVisible();
        if (this.isShowingDebug && this.modCtrl) {
            this.tooltip.classList.add("bz-debug");
        } else {
            this.tooltip.classList.remove("bz-debug");
        }
        this.model();
        this.render();
        UI.setPlotLocation(this.plotCoord.x, this.plotCoord.y, this.plotIndex);
        this.setWarningCursor(this.plotCoord);
    }
    model() {
        // update player and civilization info
        this.player = Players.get(GameContext.localPlayerID);
        this.playerCiv = GameInfo.Civilizations.lookup(this.player.civilizationType);
        this.expansionRules = gatherExpansionRules(this.playerCiv.CivilizationType);
        // update selection-dependent info
        // (note: currently using "foot" instead of the selected unit)
        this.obstacles = gatherMovementObstacles("UNIT_MOVEMENT_CLASS_FOOT");
        this.modelWorld();
        this.modelCivilization();
        this.modelConstructibles();
        this.modelYields();
    }
    render() {
        this.renderGeographySection();
        this.renderSettlementSection();
        this.renderHexSection();
        this.renderYields();
        this.renderUnitSection();
        if (this.isShowingDebug) this.renderDebugInfo();
    }
    // data modeling methods
    modelWorld() {
        const loc = this.plotCoord;
        this.age = GameInfo.Ages.lookup(Game.age);
        const terrainType = GameplayMap.getTerrainType(loc.x, loc.y);
        this.terrain = GameInfo.Terrains.lookup(terrainType);
        const biomeType = GameplayMap.getBiomeType(loc.x, loc.y);
        this.biome = GameInfo.Biomes.lookup(biomeType);
        const featureType = GameplayMap.getFeatureType(loc.x, loc.y);
        this.feature = GameInfo.Features.lookup(featureType);
        const riverType = GameplayMap.getRiverType(loc.x, loc.y);
        const riverName = GameplayMap.getRiverName(loc.x, loc.y);
        switch (riverType) {
            case RiverTypes.RIVER_NAVIGABLE:
                this.river = {
                    Name: riverName || "LOC_NAVIGABLE_RIVER_NAME",
                    RiverType: "RIVER_NAVIGABLE",  // type string
                    type: riverType,  // type ID
                };
                break;
            case RiverTypes.RIVER_MINOR:
                this.river = {
                    Name: riverName || "LOC_MINOR_RIVER_NAME",
                    RiverType: "RIVER_MINOR",  // type string
                    type: riverType,  // type ID
                };
                break;
            default:
                this.river = null;
                break;
        }
        const resourceType = GameplayMap.getResourceType(loc.x, loc.y);
        this.resource = GameInfo.Resources.lookup(resourceType);
    }
    modelCivilization() {
        // owner, civ, city, district
        const loc = this.plotCoord;
        const ownerID = GameplayMap.getOwner(loc.x, loc.y);
        this.owner = Players.get(ownerID);
        const cityID = GameplayMap.getOwningCityFromXY(loc.x, loc.y);
        this.city = cityID ? Cities.get(cityID) : null;
        const districtID = MapCities.getDistrict(loc.x, loc.y);
        this.district = districtID ? Districts.get(districtID) : null;
        // settlement stats (only on the city center)
        if (!this.city) return;
        const center = this.city.location;
        this.isCityCenter = center.x == loc.x && center.y == loc.y
        if (!this.isCityCenter) return;
        // get connected settlements
        this.connections = getConnections(this.city);
        // get religions (majority, urban, rural)
        if (this.age.AgeType == "AGE_EXPLORATION") {
            // but only during Exploration, when conversion is possible
            // (plus custom names stop working in the Modern Age)
            this.religions = getReligions(this.city);
        }
        // report fresh water supply
        this.isFreshWater = GameplayMap.isFreshWater(center.x, center.y);
    }
    modelConstructibles() {
        const loc = this.plotCoord;
        this.constructibles = [];
        const constructibles = MapConstructibles.getHiddenFilteredConstructibles(loc.x, loc.y);
        for (const constructible of constructibles) {
            const item = Constructibles.getByComponentID(constructible);
            if (!item) continue;
            if (item.location.x != loc.x || item.location.y != loc.y) {
                console.warn(`bz-plot-tooltip: constructible location mismatch`);
                console.warn(`bz-plot-tooltip: ${JSON.stringify(item)}`);
                continue;
            }
            const info = GameInfo.Constructibles.lookup(item.type);
            if (!info) continue;
            const isBuilding = info.ConstructibleClass == "BUILDING";
            const isWonder = info.ConstructibleClass == "WONDER";
            const isImprovement = info.ConstructibleClass == "IMPROVEMENT";
            if (!(isWonder || isBuilding || isImprovement)) {
                continue;
            }
            const notes = [];

            const isComplete = item.complete;
            const isDamaged = item.damaged;
            const isExtra = this.extraBuildings.has(info.ConstructibleType);
            const isLarge = this.largeBuildings.has(info.ConstructibleType);
            const isAgeless = this.agelessBuildings.has(info.ConstructibleType);
            const currentAge = this.age.ChronologyIndex;
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
            const row = {
                info, age, isCurrent, isExtra, isLarge, isDamaged, notes, uniqueTrait
            };
            this.constructibles.push(row);
            if (isBuilding && !isExtra) this.buildings.push(row);
            if (isImprovement) this.improvement = row;
            if (isWonder) this.wonder = row;
        };
        const n = this.constructibles.length;
        if (n > 1) {
            // sort buildings by age, walls last
            const ageSort = (a, b) =>
                (b.isExtra ? -1 : b.age) - (a.isExtra ? -1 : a.age);
            this.constructibles.sort(ageSort);
            this.buildings.sort(ageSort);
            if (this.wonder || this.improvement) {  // should only be one
                console.warn(`bz-plot-tooltip: expected 1 constructible, not ${n}`);
            }
        }
        if (this.improvement) {
            // set up icons and special district names for improvements
            const info = this.improvement.info;
            if (BZ_VILLAGE_TYPES.includes(info.ConstructibleType)) {
                // villages and encampments get icons based on their unique
                // improvements, appropriate for the age and minor civ type
                this.improvement.icon = getVillageIcon(this.owner, this.age);
                this.improvement.districtName = "LOC_DISTRICT_BZ_INDEPENDENT";
            } else if (this.improvement?.info.Discovery) {
                // discoveries don't have an icon, but here's a nice map
                this.improvement.icon = "url('blp:tech_cartography')";
                this.improvement.districtName = "LOC_DISTRICT_BZ_DISCOVERY";
            } else {
                this.improvement.icon = info.ConstructibleType;
            }
        }
        // get the improvement type for rural and undeveloped tiles
        if (this.improvement || !this.district) {
            const geography = [
                this.terrain?.TerrainType,
                this.biome?.BiomeType,
                this.feature?.FeatureType,
                this.river?.RiverType,
                this.resource?.ResourceType,
            ].filter(e => e);
            let best;  // best matching improvement
            for (const trait of geography) {
                const match = this.expansionRules[trait];
                if (!match) continue;
                if (!best || match.priority < best.priority) best = match;
            }
            if (best) {
                const info = GameInfo.Constructibles.lookup(best.constructible);
                const format =
                    this.improvement ? "LOC_BZ_IMPROVEMENT_FOR_WAREHOUSE" :
                    this.resource ?  "LOC_BZ_IMPROVEMENT_FOR_RESOURCE" :
                    "LOC_BZ_IMPROVEMENT_FOR_TILE";
                const icon = `[icon:${best.constructible}]`;
                const name = info.Name;
                const text = Locale.compose(format, icon, name);
                this.warehouse = { info, format, icon, name, text };
            }
        }
        if (this.warehouse && this.warehouse.name != this.improvement?.info?.Name) {
            // tile is undeveloped or upgraded to a unique improvement
            if (this.city?.owner == this.player.id || this.resource || this.isVerbose) {
                // show the standard improvement type if
                // - owned by player
                // - undeveloped resource
                // - verbose mode
                this.expansion = this.warehouse;
            }
        }
    }
    modelYields() {
        this.yields = [];
        this.totalYields = 0;
        // one column per yield type
        GameInfo.Yields.forEach(info => {
            const value = GameplayMap.getYield(this.plotCoord.x, this.plotCoord.y, info.YieldType, this.player.id);
            if (value) {
                const column = { name: info.Name, type: info.YieldType, value };
                this.yields.push(column);
                this.totalYields += value;
            }
        });
        if (!this.totalYields) return;
        // total yield column
        const type = BZ_URBAN_TYPES.includes(this.district?.type) ?
            BZ_YIELD_TOTAL_URBAN : BZ_YIELD_TOTAL_RURAL;
        const column = { name: "LOC_YIELD_BZ_TOTAL", type, value: this.totalYields };
        this.yields.push(column);
    }
    renderDivider() {
        const divider = document.createElement("div");
        divider.classList.add("plot-tooltip__Divider", "my-2");
        this.container.appendChild(divider);
    }
    renderFlexDivider(center, style=null) {
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
    renderTitleDivider(text=BZ_DOT_DIVIDER) {
        const layout = document.createElement("div");
        layout.classList.value = "font-title uppercase text-sm mx-3 max-w-80";
        layout.setAttribute("data-l10n-id", text);
        this.renderFlexDivider(layout);
    }
    renderGeographySection() {
        const loc = this.plotCoord;
        // show geographical features
        const effects = this.getPlotEffects(this.plotIndex);
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
        if (!this.player) {
            console.error("plot-tooltip: Attempting to update settler tooltip, but no valid local player!");
            return banners;
        }
        const localPlayerDiplomacy = this.player.Diplomacy;
        if (localPlayerDiplomacy === undefined) {
            console.error("plot-tooltip: Attempting to update settler tooltip, but no valid local player Diplomacy object!");
            return banners;
        }
        if (GameplayMap.isWater(loc.x, loc.y) || GameplayMap.isImpassable(loc.x, loc.y) || GameplayMap.isNavigableRiver(loc.x, loc.y)) {
            // Dont't add any extra tooltip to mountains, oceans, or navigable rivers, should be obvious enough w/o them
            return banners;
        }
        const localPlayerAdvancedStart = this.player.AdvancedStart;
        if (localPlayerAdvancedStart === undefined) {
            console.error("plot-tooltip: Attempting to update settler tooltip, but no valid local player advanced start object!");
            return banners;
        }
        // Show why we can't settle here
        let warning;
        let warningStyle = BZ_ALERT.red;
        if (!GameplayMap.isPlotInAdvancedStartRegion(this.player.id, loc.x, loc.y) && !localPlayerAdvancedStart?.getPlacementComplete()) {
            warning = "LOC_PLOT_TOOLTIP_CANT_SETTLE_TOO_FAR";
        } else if (!localPlayerDiplomacy.isValidLandClaimLocation(loc, true /*bIgnoreFriendlyUnitRequirement*/)) {
            if (this.resource) {
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
    getPlotEffects() {
        const text = [];
        const banners = [];
        const plotEffects = MapPlotEffects.getPlotEffects(this.plotIndex);
        if (!plotEffects) return { text, banners };
        for (const item of plotEffects) {
            if (item.onlyVisibleToOwner && item.owner != this.player.id) continue;
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
        if (!this.terrain) return { text: "", style: null };
        let text = this.terrain.Name;
        const style = this.obstacleStyle(this.terrain.TerrainType);
        if (this.terrain.TerrainType == "TERRAIN_COAST" && GameplayMap.isLake(loc.x, loc.y)) {
            text = "LOC_TERRAIN_LAKE_NAME";
        }
        if (this.isShowingDebug) {
            text = Locale.compose('{1_Name} ({2_Value})',
                text, this.terrain["$index"].toString());
        }
        return { text, style };
    }
    getBiomeLabel() {
        // Do not show a label for marine biome.
        if (!this.biome || this.biome.BiomeType == "BIOME_MARINE") return "";
        let text = this.biome.Name;
        if (this.isShowingDebug) {
            text = Locale.compose('{1_Name} ({2_Value})',
                text, this.biome["$index"].toString());
        }
        return text;
    }
    getFeatureLabel(loc) {
        if (!this.feature) return null;
        let text = this.feature.Name;
        let style = this.obstacleStyle(this.feature.FeatureType, this.feature.FeatureClassType);
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
        return this.player.isDistantLands(loc) ?
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
    renderSettlementSection() {
        if (!this.owner) return;
        const name = this.city ?  this.city.name :  // city or town
            this.owner.isAlive ?  this.getCivName(this.owner) :  // village
            null;  // discoveries are owned by a placeholder "World" player
        if (!name) return;
        this.renderTitleDivider(name);
        // owner info
        this.renderOwnerInfo();
        // settlement stats (only at city center or in verbose mode)
        if (!this.isCityCenter) return;
        const stats = [];
        // settlement connections
        if (this.connections) {
            const connectionsNote = Locale.compose("LOC_BZ_CITY_CONNECTIONS",
                this.connections.cities.length, this.connections.towns.length);
            stats.push(connectionsNote);
        }
        // religion
        if (this.religions) stats.push(...this.religions);
        // fresh water
        if (!this.isFreshWater) stats.push(["LOC_BZ_PLOTKEY_NO_FRESHWATER"]);
        // render
        if (stats.length) {
            this.renderRules(stats, "-mt-1 mb-2");  // tighten space above icon
        }
    }
    renderOwnerInfo() {
        if (!this.owner || !Players.isAlive(this.owner.id)) return;
        const loc = this.plotCoord;
        // TODO: simplify this check? why is it here?
        const filteredConstructibles = MapConstructibles.getHiddenFilteredConstructibles(loc.x, loc.y);
        const constructibles = MapConstructibles.getConstructibles(loc.x, loc.y);
        if (constructibles.length && !filteredConstructibles.length) {
            console.warn(`bz-plot-tooltip: skipping filtered constructibles`);
            console.warn(`bz-plot-tooltip: ${JSON.stringify(constructibles)}`);
            return;
        }
        const layout = document.createElement("div");
        layout.classList.value = "text-xs leading-snug text-center mb-2";
        const ownerName = this.getOwnerName(this.owner);
        const relationship = this.getCivRelationship(this.owner);
        const relType = Locale.compose(relationship?.type);
        const civName = this.getCivName(this.owner, true);
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
        ttPlayer.innerHTML = dotJoin([ownerName, relType]);
        layout.appendChild(ttPlayer);
        // show full civ name
        const ttCiv = document.createElement("div");
        ttCiv.setAttribute('data-l10n-id', civName);
        layout.appendChild(ttCiv);
        this.container.appendChild(layout);
    }
    getOwnerName(owner) {
        if (owner == null) return "";
        const name = owner.isMinor || owner.isIndependent ?
            Locale.compose("LOC_LEADER_BZ_PEOPLE_NAME", owner.name) :
            Locale.compose(owner.name);
        return name;
    }
    getCivName(owner, fullName=false) {
        if (owner == null) return "";
        const civName = fullName || owner.isMinor || owner.isIndependent ?
            owner.civilizationFullName :  // "Venice"
            owner.civilizationName;  // "Spain"
        const name = owner.isIndependent && fullName ?
            // add "Village" to the full name of independents
            Locale.compose("LOC_CIVILIZATION_INDEPENDENT_SINGULAR", civName) :
            Locale.compose(civName);
        return name;
    }
    getCivRelationship(owner) {
        if (owner.id == this.player.id) {
            return { type: "LOC_PLOT_TOOLTIP_YOU", isEnemy: false };
        }
        if (!owner.Diplomacy) return null;
        // is the other player a city-state or village?
        if (owner.isMinor || owner.isIndependent) {
            const isVassal = owner.Influence?.hasSuzerain &&
                owner.Influence.getSuzerain() == this.player.id;
            const isEnemy = owner.Diplomacy?.isAtWarWith(this.player.id);
            const name = isVassal ?  "LOC_INDEPENDENT_BZ_RELATIONSHIP_TRIBUTARY" :
                 isEnemy ?  "LOC_INDEPENDENT_RELATIONSHIP_HOSTILE" :
                "LOC_INDEPENDENT_RELATIONSHIP_FRIENDLY";
            return { type: name, isEnemy: isEnemy };
        }
        // is the other player at war?
        if (owner.Diplomacy.isAtWarWith(this.player.id)) {
            return { type: "LOC_PLAYER_RELATIONSHIP_AT_WAR", isEnemy: true };
        }
        // not an enemy
        if (owner.Diplomacy.hasAllied(this.player.id)) {
            return { type: "LOC_PLAYER_RELATIONSHIP_ALLIANCE", isEnemy: false };
        }
        const name = owner.Diplomacy.getRelationshipLevelName(this.player.id);
        return { type: name, isEnemy: false };
    }
    renderHexSection() {
        switch (this.district?.type) {
            case DistrictTypes.CITY_CENTER:
            case DistrictTypes.URBAN:
                this.renderUrbanSection();
                break;
            case DistrictTypes.RURAL:
            case DistrictTypes.WILDERNESS:
            default:
                this.renderRuralSection();
                break;
            case DistrictTypes.WONDER:
                this.renderWonderSection();
                break;
        }
    }
    renderUrbanSection() {
        const quarterOK = this.buildings.reduce((a, b) =>
            a + (b.isCurrent ? b.isLarge ? 2 : 1 : 0), 0);
        let hexName = GameInfo.Districts.lookup(this.district?.type).Name;
        let hexSubhead;
        let hexRules;
        // set name & description
        if (this.district.type == DistrictTypes.CITY_CENTER) {
            const owner = Players.get(this.city.owner);
            if (owner.isMinor) {
                hexName = "LOC_DISTRICT_BZ_CITY_STATE";
                const bonusType = Game.CityStates.getBonusType(owner.id);
                const bonus = GameInfo.CityStateBonuses.find(b => b.$hash == bonusType);
                if (bonus) {
                    hexSubhead = bonus.Name;
                    hexRules = bonus.Description;  // .Tooltip doesn't exist
                }
            } else if (this.city.isTown) {
                // rename "City Center" to "Town Center" in towns
                hexName = "LOC_DISTRICT_BZ_TOWN_CENTER";
            }
        } else if (this.buildings.length == 0) {
            // urban tile with canceled production
            hexName = "LOC_DISTRICT_BZ_URBAN_VACANT";
        } else if (quarterOK >= 2) {
            const unique = this.buildings[0].uniqueTrait;
            if (this.buildings.every(b => b.uniqueTrait = unique)) {
                const uq = GameInfo.UniqueQuarters.find(e => e.TraitType == unique);
                hexName = uq.Name;
                // UQs don't have .Tooltip but most have parallel
                // LOC_QUARTER_XXX_DESCRIPTION and
                // LOC_QUARTER_XXX_TOOLTIP localization strings
                const tooltip = uq.Description.replace("_DESCRIPTION", "_TOOLTIP");
                hexRules = Locale.keyExists(tooltip) ? tooltip : uq.Description;
            } else {
                hexName = "LOC_DISTRICT_BZ_URBAN_QUARTER";
            }
        } else {
            hexName = "LOC_DISTRICT_BZ_URBAN_DISTRICT";
        }
        // title bar
        this.renderTitleDivider(Locale.compose(hexName));
        this.renderDistrictDefense(this.plotCoord);
        // panel interior
        // show rules for city-states and unique quarters
        if (hexRules && this.isVerbose) {
            const title = "font-title uppercase text-xs leading-snug";
            if (hexSubhead) this.renderRules([hexSubhead], '', title);
            this.renderRules([hexRules]);
        }
        // constructibles
        this.renderConstructibles();
        // report specialists
        const specialists = getSpecialists(this.plotCoord, this.city);
        if (specialists) {
            const text = Locale.compose("LOC_DISTRICT_BZ_SPECIALISTS",
                specialists.workers, specialists.maximum);
            this.renderRules([text], "-mt-1 mb-2");  // tighten space above icon
        }
        // bottom bar
        this.renderUrbanDivider();
    }
    renderRuralSection() {
        let hexName = this.improvement?.districtName;
        let hexSubtitle;
        let hexRules = [];
        let hexIcon = this.improvement?.icon;
        let resourceIcon;
        // set name & description
        if (hexName) {
            // set by Village or Discovery special improvements
        } else if (this.feature?.Tooltip) {
            // natural wonder
            hexName = this.feature.Name;
            if (!this.improvement || this.isVerbose) {
                hexRules.push(this.feature.Tooltip);
            }
        } else if (this.resource) {
            // resource
            hexName = this.resource.Name;
            if (this.expansion || this.isVerbose) {
                const rctype = this.resource.ResourceClassType;
                const rc = rctype && GameInfo.ResourceClasses.lookup(rctype);
                if (rc?.Name) {
                    let rcname = rc.Name + "_BZ";
                    hexSubtitle = Locale.keyExists(rcname) ? rcname : rc.Name;
                }
                let rules = this.resource.Tooltip;
                if (rctype == "RESOURCECLASS_FACTORY") {
                    // remove redundant "Factory Resource." from tooltip
                    rules = Locale.compose(rules);
                    const prefix = Locale.compose(hexSubtitle).toUpperCase();
                    if (prefix && rules.toUpperCase().startsWith(prefix)) {
                        rules = rules.slice(prefix.length);
                        rules = rules.replace(/^[,.:。]\s*|[.。]$/g, '');
                    } else {
                        console.warn(`bz-plot-tooltip: [${rules}] doesn't start with expected prefix [${prefix}]`);
                    }
                }
                hexRules.push(rules);
            }
            resourceIcon = this.resource.ResourceType;
        } else if (this.district?.type) {
            // rural
            hexName = GameInfo.Districts.lookup(this.district?.type).Name;
        } else if (!this.improvement && !this.totalYields) {
            // nothing more to see here
            return;
        } else if (this.city) {
            // claimed but undeveloped
            hexName = "LOC_DISTRICT_BZ_UNDEVELOPED";
        } else {
            // unclaimed wilderness
            hexName = GameInfo.Districts.lookup(DistrictTypes.WILDERNESS).Name;
        }
        // title bar
        if (hexName) this.renderTitleDivider(Locale.compose(hexName));
        // optional description
        if (hexRules.length) {
            const title = "bz-text-xxs leading-none mb-2";
            if (hexSubtitle) this.renderRules([hexSubtitle], '', title);
            this.renderRules(hexRules);
        }
        // constructibles
        this.renderConstructibles();
        // bottom bar
        if (hexIcon) {
            this.renderIconDivider(hexIcon, resourceIcon);
        } else if (resourceIcon) {
            this.renderIconDivider(resourceIcon);
        }
    }
    renderWonderSection() {
        if (!this.wonder) return;
        this.renderTitleDivider(Locale.compose(this.wonder.info.Name));
        if (this.wonder.notes) {
            const ttState = document.createElement("div");
            ttState.classList.value = "bz-text-xxs leading-none text-center";
            ttState.innerHTML = dotJoinLocale(this.wonder.notes);
            this.container.appendChild(ttState);
        }
        this.renderRules([this.wonder.info.Tooltip]);
        this.renderIconDivider(this.wonder.info.ConstructibleType);
    }
    // lay out a column of constructibles and their construction notes
    renderConstructibles() {
        if (!this.constructibles.length && !this.expansion) return;
        const ttList = document.createElement("div");
        ttList.classList.value = "text-xs leading-snug text-center mb-2";
        for (const c of this.constructibles) {
            const ttConstructible = document.createElement("div");
            const ttName = document.createElement("div");
            ttName.classList.value = "text-accent-2 font-title uppercase";
            ttName.setAttribute("data-l10n-id", c.info.Name);
            ttConstructible.appendChild(ttName);
            const notes = dotJoinLocale(c.notes);
            if (notes) {
                const ttState = document.createElement("div");
                ttState.classList.value = "bz-text-xxs";
                if (c.isDamaged) {
                    setCapsuleStyle(ttState, BZ_ALERT.amber, "mb-0\\.5");
                } else {
                    ttState.classList.add("-mt-1");
                }
                ttState.innerHTML = notes;
                ttConstructible.appendChild(ttState);
            }
            ttList.appendChild(ttConstructible);
        }
        // expansion type for undeveloped & upgraded tiles
        if (this.expansion) {
            const tt = document.createElement("div");
            if (this.constructibles.length) tt.classList.value = "bz-text-xxs";
            tt.setAttribute("data-l10n-id", this.expansion.text);
            ttList.appendChild(tt);
        }
        this.container.appendChild(ttList);
    }
    // lay out paragraphs of rules text
    renderRules(text, listStyle=null, rowStyle=null) {
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
    renderDistrictDefense() {
        if (!this.district) return;
        // occupation status
        const loc = this.plotCoord;
        const info = [];
        if (this.district.owner != this.district.controllingPlayer) {
            const conqueror = Players.get(this.district.controllingPlayer);
            const conquerorName = this.getCivName(conqueror, true);
            const conquerorText = Locale.compose("{1_Term} {2_Subject}", "LOC_PLOT_TOOLTIP_CONQUEROR", conquerorName);
            const ttConqueror = document.createElement("div");
            setBannerStyle(ttConqueror, { color: BZ_COLOR.amber });
            ttConqueror.innerHTML = conquerorText;
            info.push(ttConqueror);
        }
        // district health
        const ownerID = GameplayMap.getOwner(loc.x, loc.y);
        const ownerDistricts = Players.Districts.get(ownerID);
        if (!ownerDistricts) return;
        // This type is unresolved, is it meant to be number instead?
        const currentHealth = ownerDistricts.getDistrictHealth(loc);
        const maxHealth = ownerDistricts.getDistrictMaxHealth(loc);
        const isUnderSiege = ownerDistricts.getDistrictIsBesieged(loc);
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
    renderIconDivider(icon, overlay=null) {
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
        this.renderFlexDivider(layout, "mb-2");
    }
    renderUrbanDivider() {
        // there are at least two building slots (unless one is large)
        const slots = [...this.buildings];
        if (slots.length < 2 && !this.buildings[0]?.isLarge)
            slots.push(...[null, null].slice(this.buildings.length));
        // render the icons
        const layout = document.createElement("div");
        layout.classList.value = "flex flex-grow relative mx-2";
        for (const slot of slots) {
            // if the building has more than one yield type, like the
            // Palace, use one type for the ring and one for the glow
            const icon = slot?.info.ConstructibleType ?? BZ_SLOT_EMPTY;
            const yields = adjacencyYield(slot?.info);
            const blank = "#0000";
            const slotColor = slot ? BZ_YIELD_COLOR[yields.at(0) ?? null] : blank;
            const glowColor = slot ? BZ_YIELD_COLOR[yields.at(-1) ?? null] : blank;
            const isCurrent = slot?.isCurrent;
            // ring the slot with an appropriate color for the yield
            const ttFrame = document.createElement("div");
            ttFrame.classList.value = "border-2 rounded-full mx-1\\.5";
            ttFrame.style.setProperty("border-color", slotColor);
            // also glow if the building is fully operational
            if (isCurrent) ttFrame.style.setProperty(
                "box-shadow", `0rem 0rem 0.33333rem 0.16667rem ${glowColor}`);
            // display the icon
            const ttIcon = document.createElement("div");
            ttIcon.classList.value = "bg-contain bg-center size-12";
            ttIcon.style.backgroundImage = UI.getIconCSS(icon);
            ttFrame.appendChild(ttIcon);
            layout.appendChild(ttFrame);
        }
        this.renderFlexDivider(layout, "mb-2");
    }
    renderYields() {
        if (!this.totalYields) return;  // no yields to show
        const tt = document.createElement('div');
        tt.classList.value = "plot-tooltip__resourcesFlex";
        // one column per yield type
        for (const column of this.yields) {
            tt.appendChild(this.yieldColumn(column));
        }
        // set column width based on number of digits (at least two)
        const numWidth = (n) => {
            const frac = n % 1 != 0;
            // decimal points need a little less room
            return n.toString().length - (frac ? 0.4 : 0);
        };
        const maxWidth = Math.max(2, ...this.yields.map(y => numWidth(y.value)));
        const yieldWidth = 1 + maxWidth / 3;  // width in rem
        tt.style.setProperty("--yield-width", `${yieldWidth}rem`);
        this.container.appendChild(tt);
    }
    yieldColumn(col) {
        const isTotal = col.name == "LOC_YIELD_BZ_TOTAL";
        const ttIndividualYieldFlex = document.createElement("div");
        ttIndividualYieldFlex.classList.add("plot-tooltip__IndividualYieldFlex");
        if (isTotal) ttIndividualYieldFlex.classList.add("ml-0\\.5");  // extra room
        const ariaLabel = `${Locale.toNumber(col.value)} ${Locale.compose(col.name)}`;
        ttIndividualYieldFlex.ariaLabel = ariaLabel;
        const yieldIconCSS = UI.getIconCSS(col.type, "YIELD");
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
        ttIndividualYieldValues.textContent = col.value.toString();
        ttIndividualYieldFlex.appendChild(ttIndividualYieldValues);
        return ttIndividualYieldFlex;
    }
    renderUnitSection() {
        const loc = this.plotCoord;
        if (GameplayMap.getRevealedState(this.player.id, loc.x, loc.y) != RevealedStates.VISIBLE) return;
        // get topmost unit and owner
        let topUnit = getTopUnit(loc);
        if (!topUnit || !Visibility.isVisible(this.player.id, topUnit.id)) return;
        const owner = Players.get(topUnit.owner);
        if (!owner) return;
        // friendly unit? clear the enemy flag
        if (owner.id == this.player.id) {
            this.isEnemy = false;
            return;
        }
        // show unit section
        this.renderDivider();
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
    setWarningCursor() {
        // highlight enemy territory & units with a red cursor
        if (UI.isCursorLocked()) return;
        // don't block cursor changes from interface-mode-acquire-tile
        if (InterfaceMode.getCurrent() == "INTERFACEMODE_ACQUIRE_TILE") return;
        if (this.isEnemy) {
            UI.setCursorByURL("fs://game/core/ui/cursors/enemy.ani");
        } else {
            UI.setCursorByType(UIHTMLCursorTypes.Default);
        }
    }
    renderDebugInfo() {
        //debug info
        const loc = this.plotCoord;
        const layout = document.createElement("div");
        setBannerStyle(layout);
        const ownerID = GameplayMap.getOwner(loc.x, loc.y);
        const currHp = Players.Districts.get(ownerID)?.getDistrictHealth(loc);
        const maxHp = Players.Districts.get(ownerID)?.getDistrictMaxHealth(loc);
        const ttTitle = document.createElement("div");
        ttTitle.classList.value =
            "text-secondary font-title uppercase text-xs text-center";
        let title = Locale.compose("LOC_PLOT_TOOLTIP_DEBUG_TITLE");
        if (currHp && maxHp) title += ": " + currHp + " / " + maxHp;
        ttTitle.innerHTML = title;
        layout.appendChild(ttTitle);
        const ttPlotCoord = document.createElement("div");
        ttPlotCoord.classList.add("plot-tooltip__coordinate-text");
        ttPlotCoord.innerHTML =
            `${Locale.compose("LOC_PLOT_TOOLTIP_PLOT")}: (${loc.x},${loc.y})`;
        layout.appendChild(ttPlotCoord);
        const ttPlotIndex = document.createElement("div");
        ttPlotIndex.classList.add("plot-tooltip__coordinate-text");
        ttPlotIndex.innerHTML =
            `${Locale.compose("LOC_PLOT_TOOLTIP_INDEX")}: ${this.plotIndex}`;
        layout.appendChild(ttPlotIndex);
        const hemi = this.player?.isDistantLands(loc) ?
            "LOC_PLOT_TOOLTIP_HEMISPHERE_WEST" :
            "LOC_PLOT_TOOLTIP_HEMISPHERE_EAST";
        const ttPlotTag = document.createElement("div");
        ttPlotTag.classList.add("plot-tooltip__coordinate-text");
        ttPlotTag.innerHTML = Locale.compose(hemi);
        layout.appendChild(ttPlotTag);
        this.container.appendChild(layout);
    }
}
TooltipManager.registerPlotType('plot', PlotTooltipPriority.LOW, new PlotTooltipType());

//# sourceMappingURL=file:///base-standard/ui/tooltips/plot-tooltip.js.map

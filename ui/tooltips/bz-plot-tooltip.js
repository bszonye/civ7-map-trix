// TODO: separate road & obstacle info
// TODO: fix margins:
// TODO: - settlement
// TODO: - district
// TODO: - yield
// TODO: test margins:
// TODO: - geography
// TODO: fix yield layout
// TODO: update localization
// TODO: switch Row data to Replace
import bzMapTrixOptions, { bzVerbosity } from '/bz-map-trix/ui/options/bz-map-trix-options.js';
import "/base-standard/ui/tooltips/plot-tooltip.js";

import TooltipManager, { PlotTooltipPriority } from '/core/ui/tooltips/tooltip-manager.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import LensManager from '/core/ui/lenses/lens-manager.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';

// horizontal list separator
const BZ_DOT_DIVIDER = Locale.compose("LOC_PLOT_DIVIDER_DOT");

// all urban DistrictTypes
const BZ_URBAN_TYPES = [DistrictTypes.CITY_CENTER, DistrictTypes.URBAN];

// custom & adapted icons
const BZ_ICON_SIZE = 12;
const BZ_ICON_DISCOVERY = "url('blp:tech_cartography')";
const BZ_ICON_EMPTY_SLOT = "BUILDING_OPEN";
const BZ_ICON_FRAME = "url('hud_sub_circle_bk')";
const BZ_ICON_TOTAL_RURAL = "CITY_RURAL";  // total yield (rural)
const BZ_ICON_TOTAL_URBAN = "CITY_URBAN";  // total yield (urban)
const BZ_ICON_VILLAGE_TYPES = {  // by city-state type and age
    CULTURAL: [
        "IMPROVEMENT_MEGALITH",
        "IMPROVEMENT_STONE_HEAD",
        "IMPROVEMENT_OPEN_AIR_MUSEUM",
    ],
    ECONOMIC: [
        "IMPROVEMENT_SOUQ",
        "IMPROVEMENT_TRADING_FACTORY",
        "IMPROVEMENT_ENTREPOT",
    ],
    MILITARISTIC: [
        "IMPROVEMENT_HILLFORT",
        "IMPROVEMENT_KASBAH",
        "IMPROVEMENT_SHORE_BATTERY",
    ],
    SCIENTIFIC: [
        "IMPROVEMENT_ZIGGURAT",
        "IMPROVEMENT_MONASTERY",
        "IMPROVEMENT_INSTITUTE",
    ],
};
const BZ_ICON_TYPES = {
    IMPROVEMENT_MEGALITH: ["CULTURAL"],
    IMPROVEMENT_STONE_HEAD: ["CULTURAL"],
    IMPROVEMENT_OPEN_AIR_MUSEUM: ["CULTURAL"],
    IMPROVEMENT_SOUQ: ["ECONOMIC"],
    IMPROVEMENT_TRADING_FACTORY: ["ECONOMIC"],
    IMPROVEMENT_ENTREPOT: ["ECONOMIC"],
    IMPROVEMENT_HILLFORT: ["MILITARISTIC"],
    IMPROVEMENT_KASBAH: ["MILITARISTIC"],
    IMPROVEMENT_SHORE_BATTERY: ["MILITARISTIC"],
    IMPROVEMENT_ZIGGURAT: ["SCIENTIFIC"],
    IMPROVEMENT_MONASTERY: ["SCIENTIFIC"],
    IMPROVEMENT_INSTITUTE: ["SCIENTIFIC"],
};

// color palette
const BZ_COLOR = {
    // game colors
    silver: "#4c5366",  // = primary
    bronze: "#e5d2ac",  // = secondary
    primary: "#4c5366",
    primary1: "#8d97a6",
    primary2: "#4c5366",
    primary3: "#333640",
    primary4: "#23252b",
    primary5: "#12151f",
    secondary: "#e5d2ac",
    secondary1: "#e5d2ac",
    secondary2: "#8c7e62",
    secondary3: "#4c473d",
    accent: "#616266",
    accent1: "#e5e5e5",
    accent2: "#c2c4cc",
    accent3: "#9da0a6",
    accent4: "#85878c",
    accent5: "#616266",
    accent6: "#05070d",
    // bronze shades
    bronze1: "#f9ecd2",
    bronze2: "#e5d2ac",  // = secondary1
    bronze3: "#c7b28a",
    bronze4: "#a99670",
    bronze5: "#8c7e62",  // = secondary 2
    bronze6: "#4c473d",  // = secondary 3
    // alert colors
    black: "#000000",
    danger: "#af1b1c99",  // danger = militaristic 60% opacity
    caution: "#cea92f",  // caution = healthbar-medium
    note: "#ff800033",  // note = orange 20% opacity
    // geographic colors
    hill: "#a9967066",  // Rough terrain = dark bronze 40% opacity
    vegetated: "#aaff0033",  // Vegetated features = green 20% opacity
    wet: "#55ffff33",  // Wet features = teal 20% opacity
    river: "#55aaff66",  // Rivers = azure 40% opacity
    road: "#e5d2accc",  // Roads = bronze 80% opacity
    rail: "#c2c4cccc",  // Railroads = silver 80% opacity
    // yield types
    food: "#80b34d",        //  90° 40 50 green
    production: "#a33d29",  //  10° 60 40 red
    gold: "#f6ce55",        //  45° 90 65 yellow
    science: "#6ca6e0",     // 210° 65 65 cyan
    culture: "#5c5cd6",     // 240° 60 60 violet
    happiness: "#f5993d",   //  30° 90 60 orange
    diplomacy: "#afb7cf",   // 225° 25 75 gray
    // independent power types
    militaristic: "#af1b1c",
    scientific: "#4d7c96",
    economic: "#ffd553",
    cultural: "#892bb3",
};
const BZ_ALERT = {
    primary: { "background-color": BZ_COLOR.primary },
    secondary: { "background-color": BZ_COLOR.secondary, color: BZ_COLOR.black },
    black: { "background-color": BZ_COLOR.black },
    danger: { "background-color": BZ_COLOR.danger },
    enemy: { "background-color": BZ_COLOR.danger },
    conqueror: { "background-color": BZ_COLOR.danger, color: BZ_COLOR.caution },
    caution: { "background-color": BZ_COLOR.caution, color: BZ_COLOR.black },
    note: { "background-color": BZ_COLOR.note },
    DEBUG: { "background-color": "#80808080" },
}
const BZ_STYLE = {
    debug: { "background-color": `${BZ_COLOR.bronze6}99` },
    volcano: BZ_ALERT.caution,
    // movement & obstacle types
    road: { "background-color": BZ_COLOR.road, color: BZ_COLOR.black },
    rail: { "background-color": BZ_COLOR.rail, color: BZ_COLOR.black },
    TERRAIN_HILL: { "background-color": BZ_COLOR.hill },
    TERRAIN_OCEAN: {},  // don't need to highlight this
    FEATURE_CLASS_VEGETATED: { "background-color": BZ_COLOR.vegetated },
    FEATURE_CLASS_WET: { "background-color": BZ_COLOR.wet },
    RIVER_MINOR: { "background-color": BZ_COLOR.river },
    RIVER_NAVIGABLE: { "background-color": BZ_COLOR.river },
    river: { "background-color": BZ_COLOR.river },
}
// accent colors for icon types
const BZ_TYPE_COLOR = {
    undefined: BZ_COLOR.bronze,  // default
    CULTURAL: BZ_COLOR.cultural,  // purple
    ECONOMIC: BZ_COLOR.economic,  // yellow
    MILITARISTIC: BZ_COLOR.militaristic,  // red
    SCIENTIFIC: BZ_COLOR.scientific,  // blue
    YIELD_CULTURE: BZ_COLOR.culture,  // violet
    YIELD_DIPLOMACY: BZ_COLOR.diplomacy,  // teal
    YIELD_FOOD: BZ_COLOR.food,  // green
    YIELD_GOLD: BZ_COLOR.gold,  // yellow
    YIELD_HAPPINESS: BZ_COLOR.happiness,  // orange
    YIELD_PRODUCTION: BZ_COLOR.production,  // brown
    YIELD_SCIENCE: BZ_COLOR.science,  // blue
}
const BZ_TYPE_SORT = {
    [BZ_COLOR.bronze]: 0,  // neutral
    [BZ_COLOR.food]: 1,  // green
    [BZ_COLOR.production]: 2,  // brown
    [BZ_COLOR.militaristic]: 3,  // red (city-state)
    [BZ_COLOR.gold]: 4,  // yellow
    [BZ_COLOR.economic]: 5,  // yellow (city-state)
    [BZ_COLOR.science]: 6,  // blue
    [BZ_COLOR.scientific]: 7,  // blue (city-state)
    [BZ_COLOR.culture]: 8,  // violet
    [BZ_COLOR.cultural]: 9,  // purple (city-state)
    [BZ_COLOR.happiness]: 10,  // orange
    [BZ_COLOR.diplomacy]: 11,  // teal
    undefined: 12,
}
const bzTypeSort = (a, b) => {
    const asort = BZ_TYPE_SORT[a?.substring(0, 7)] ?? BZ_TYPE_SORT[undefined];
    const bsort = BZ_TYPE_SORT[b?.substring(0, 7)] ?? BZ_TYPE_SORT[undefined];
    return asort - bsort;
}

// box metrics (for initialization, tooltip can update)
const BASE_FONT_SIZE = 18;
const BZ_FONT_SPACING = 1.5;
const BZ_PADDING = 0.6666666667;
const BZ_MARGIN = BZ_PADDING / 2;
const BZ_BORDER = 0.1111111111;
const BZ_RULES_WIDTH = 13.3333333333;
let metrics = getFontMetrics();

// additional CSS definitions
const BZ_HEAD_STYLE = [
// 1. #TOOLTIP-ROOT.NEW-TOOLTIP--ROOT absolute max-w-96 p-3
//    img-tooltip-border img-tooltip-bg pointer-events-none break-words
//    [z-index: 99]
//    2. #TOOLTIP-ROOT-CONTENT relative font-body text-xs
`
.bz-tooltip.tooltip.plot-tooltip .tooltip__content {
    padding: ${metrics.padding.y.css} ${metrics.padding.x.css};
}
.bz-tooltip.plot-tooltip .img-tooltip-border {
    border-radius: ${metrics.radius.tooltip.css};
    border-image-source: none;
    border-width: ${metrics.border.css};
    border-style: solid;
    border-color: ${BZ_COLOR.bronze3} ${BZ_COLOR.bronze4};
    filter: drop-shadow(0 1rem 1rem #000c);
}
.bz-tooltip.plot-tooltip .img-tooltip-bg {
    background-image: linear-gradient(to bottom, ${BZ_COLOR.primary4}cc 0%, ${BZ_COLOR.primary5}cc 100%);
}
.bz-tooltip.plot-tooltip .shadow {
    filter: drop-shadow(0 0.0555555556rem 0.0555555556rem black);
}
.bz-tooltip.plot-tooltip .text-secondary {
    fxs-font-gradient-color: ${BZ_COLOR.bronze1};
    color: ${BZ_COLOR.bronze2};
}
`,  // debug highlighting for content boxes
    // TODO: don't tie this to debug mode
`
.bz-debug .bz-tooltip > div > div > div {
    background-color: #80808040;  /* DEBUG */
}
.bz-debug .bz-tooltip > div > div > div > div {
    background-color: #00c0c080;  /* DEBUG */
}
.bz-debug .bz-tooltip > div > div > div > div p {
    background-color: #808080c0;  /* DEBUG */
}
`,  // full-width banners: general, unit info, debug info
`
.plot-tooltip .bz-banner {
    text-align: center;
    margin-left: -${metrics.padding.x.css};
    margin-right: -${metrics.padding.x.css};
    padding-left: ${metrics.padding.x.css};
    padding-right: ${metrics.padding.x.css};
}
`,  // centers blocks of rules text
    // IMPORTANT:
    // Locale.stylize wraps text in an extra <p> element when it
    // contains styling, which interferes with text-align and max-width.
    // the result also changes with single- vs multi-line text.  these
    // rules apply the properties in the correct order and scope to work
    // with all combinations (with/without icons, single/multiple
    // lines).
`
.bz-tooltip .bz-rules-list {
    text-align: center;
}
.bz-tooltip .bz-rules-item,
.bz-tooltip .bz-rules-item p {
    width: 100%;
}
`,
];
BZ_HEAD_STYLE.map(style => {
    const e = document.createElement('style');
    e.textContent = style;
    document.head.appendChild(e);
});
// sync optional styling
document.body.classList.toggle("bz-yield-banner", bzMapTrixOptions.yieldBanner);

// debug style (manually enable)
document.body.classList.toggle("bz-debug", false);

function baseYields(info) {
    if (!info) return null;
    const yieldTypes = GameInfo.Constructible_YieldChanges
        .filter(yc => yc.ConstructibleType == info.ConstructibleType)
        .map(yc => yc.YieldType);
    const yieldSet = new Set(yieldTypes);
    return [...yieldSet];
}
function bonusYields(info) {
    if (!info) return null;
    const findYieldChange = (at) => GameInfo.Adjacency_YieldChanges
        .find(yc => yc.ID == at.YieldChangeId);
    const yieldTypes = GameInfo.Constructible_Adjacencies
        .filter(at => at.ConstructibleType == info.ConstructibleType)
        .filter(at => !at.RequiresActivation)
        .map(at => findYieldChange(at).YieldType);
    const yieldSet = new Set(yieldTypes);
    return [...yieldSet];
}
function constructibleColors(info) {
    if (!info) return null;
    const colorize = (list) => list.map(type => BZ_TYPE_COLOR[type]);
    if (info.ConstructibleClass == "IMPROVEMENT") {
        const types = BZ_ICON_TYPES[info.ConstructibleType];
        return types && colorize(types).sort(bzTypeSort);
    }
    const base = colorize(baseYields(info)).sort(bzTypeSort);
    const bonus = colorize(bonusYields(info)).sort(bzTypeSort);
    const ageless = BZ_TYPE_COLOR[undefined];
    if (info.ConstructibleClass == "WONDER") return [base.at(0) ?? ageless];
    if (!base.length && !bonus.length) return null;  // walls
    if (!base.length) return bonus;  // no current examples of this
    // warehouse & infrastructure buildings: darken the base yield
    if (!bonus.length) return [base.at(-1) + "c0", ageless];
    // when possible, select different colors
    const cbase = base.at(-1);  // favor influence & happiness yields
    const cbonus = bonus.at(-1);
    if (cbase == cbonus) {
        if (bonus.length != 1) {
            return [cbase, bonus.at(-2)];  // Mosque, Manigramam
        } else if (base.length != 1) {
            return [base.at(-2), cbonus];  // no examples of this
        }
    }
    return [cbase, cbonus];
}
function docBanner(text, style, padding) {
    // create a banner
    const banner = document.createElement("div");
    setStyle(banner, style, padding);
    // extend banner to full width
    banner.style.paddingLeft = banner.style.paddingRight = metrics.padding.x.css;
    banner.style.marginLeft = banner.style.marginRight = `-${metrics.padding.x.css}`;
    // center content vertically and horizontally
    banner.style.display = 'flex';
    banner.style.flexDirection = 'column';
    banner.style.justifyContent = 'center';
    banner.style.alignItems = 'center';
    banner.style.textAlign = 'center';
    // make sure the banner is tall enough for end bumpers
    banner.style.minHeight = metrics.bumper.css;
    // set the text
    for (const item of text) {
        const row = document.createElement("div");
        row.setAttribute("data-l10n-id", item);
        banner.appendChild(row);
    }
    return banner;
}
function docCapsule(text, style) {
    const capsule = document.createElement("div");
    setCapsuleStyle(capsule, style);
    capsule.setAttribute('data-l10n-id', text);
    return capsule;
}
function docIcon(image, size, resize, ...style) {
    // create an icon to fit size (with optional image resizing)
    const icon = document.createElement("div");
    icon.classList.value = "relative bg-contain bg-no-repeat shadow";
    if (style.length) icon.classList.add(...style);
    icon.style.height = size;
    icon.style.width = size;
    // note: this sets image width and auto height
    if (resize && resize != size) icon.style.backgroundSize = resize;
    icon.style.backgroundPosition = "center";
    icon.style.backgroundImage =
        image.startsWith("url(") ? image : UI.getIconCSS(image);
    return icon;
}
function docRules(text, style=null) {
    // create a paragraph of rules text
    // font icons are squirrely!  only center them at top level
    const tt = document.createElement("div");
    tt.style.alignSelf = 'center';
    tt.style.textAlign = 'center';
    tt.style.width = metrics.rules.width.css;
    for (const item of text) {
        const row = document.createElement("div");
        if (style) row.classList.value = style;
        row.classList.add("bz-rules-item");
        row.setAttribute("data-l10n-id", item);
        tt.appendChild(row);
    }
    return tt;
}
function docText(text, style) {
    const e = document.createElement("div");
    if (style) e.classList.value = style;
    e.setAttribute('data-l10n-id', text);
    return e;
}
function dotJoin(list, dot=BZ_DOT_DIVIDER) {
    // join text with dots after removing empty elements
    return list.filter(e => e).join("&nbsp;" + dot + " ");
}
function dotJoinLocale(list, dot=BZ_DOT_DIVIDER) {
    return dotJoin(list.map(s => s && Locale.compose(s)), dot);
}
function joinLocale(list, joiner=" ") {
    return list.map(s => s && Locale.compose(s)).join(joiner);
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
function getDigits(list, min=0) {
    const digits = list.map(n => {
        const s = n.toString();
        let d = s.length;
        if (s.includes('.')) d-= 4/9;  // trim decimals
        return d;
    });
    return Math.max(min, ...digits);
}
function getFontMetrics() {
    const sizes = (rem, round=Math.round) => {
        const css = `${rem.toFixed(10)}rem`;
        const base = round(rem * BASE_FONT_SIZE);
        const scale = round(rem * GlobalScaling.currentScalePx);
        const px = `${scale}px`;
        return { rem, css, base, scale, px, };
    }
    // global metrics
    const padding = sizes(BZ_PADDING);
    const margin = sizes(BZ_MARGIN);  // top & bottom of each block
    padding.x = sizes(padding.rem);
    padding.y = sizes(padding.rem - margin.rem);  // room for end block margins
    padding.banner = sizes(padding.rem / 3);  // extra padding for banners
    const border = sizes(BZ_BORDER);
    // font metrics
    const font = (name, ratio=BZ_FONT_SPACING, cratio=3/4) => {
        const rem = typeof name === "string" ?
            getFontSizeBasePx(name) / BASE_FONT_SIZE : name;
        const size = sizes(rem);  // font size
        const cap = sizes(size.rem * cratio);  // cap height
        const spacing = sizes(size.rem * ratio);  // line height
        const leading = sizes(spacing.rem - size.rem);  // interline spacing
        leading.half = sizes(leading.rem / 2);
        const margin = sizes(BZ_MARGIN - (spacing.rem - cap.rem) / 2);
        const figure = sizes(0.6 * size.rem, Math.ceil);  // figure width
        const digits = (n) => sizes(n * figure.rem, Math.ceil);
        return { size, ratio, cap, spacing, leading, margin, figure, digits, };
    }
    const head = font('sm', 1.25);
    const body = font('xs', 1.25);
    const note = font('2xs', 1);
    const rules = font('xs');  // is this needed?
    rules.width = sizes(BZ_RULES_WIDTH);
    const table = font('xs');
    const yields = font(8/9);
    const radius = sizes(2/3 * padding.rem);  // TODO: fine-tuning
    radius.content = sizes(radius.rem);
    radius.tooltip = sizes(radius.rem + border.rem);
    // minimum end banner height to avoid radius glitches
    const bumper = sizes(Math.max(table.spacing.rem, 2*radius.rem));
    return {
        sizes, font,
        padding, margin, border,
        head, body, note, rules, table, yields,
        radius, bumper,
    };
}
function _getFigureWidth(size, digits=1) {
    const nwidth = 0.6 * getFontSizeScalePx(size);
    return Math.round(nwidth * digits);
}
function _getFontHeight(size, leading) {
    return Math.round(leading * getFontSizeScalePx(size));
}
function getFontSizeBasePx(size) {
    return GlobalScaling.getFontSizePx(size);
}
function getFontSizeRem(size) {
    const fpx = getFontSizeBasePx(size);
    return GlobalScaling.pixelsToRem(fpx);
}
function getFontSizeScalePx(size) {
    if (typeof size === "string") size = getFontSizeRem(size);
    return size * GlobalScaling.currentScalePx;
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
function _getReligions(city) {
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
    if (!city || city.isTown) return null;  // no specialists in towns
    const maximum = city.Workers?.getCityWorkerCap();
    if (!maximum) return null;
    const plotIndex = GameplayMap.getIndexFromLocation(loc);
    const plot = city.Workers.GetAllPlacementInfo().find(p => p.PlotIndex == plotIndex);
    const workers = plot?.NumWorkers ?? -1;
    if (workers < 0) return null;
    return { workers, maximum };
}
function getTownFocus(city) {
    const ptype = city.Growth?.projectType ?? null;
    const info = ptype && GameInfo.Projects.lookup(ptype);
    const isGrowing = !info || city.Growth?.growthType == GrowthTypes.EXPAND;
    const growth = "LOC_UI_FOOD_CHOOSER_FOCUS_GROWTH";
    const name = info?.Name ?? growth;
    const note = isGrowing && name != growth ? growth : null;
    const icon = isGrowing ? "PROJECT_GROWTH" : info.ProjectType;
    return { isGrowing, name, note, icon, info, };
}
function getVillageIcon(owner, age) {
    // get the minor civ type
    let ctype = "MILITARISTIC";  // default
    GameInfo.Independents.forEach(i => {
        if (owner.civilizationAdjective == i.CityStateName) ctype = i.CityStateType;
    });
    // select an icon
    const icons = BZ_ICON_VILLAGE_TYPES[ctype ?? "MILITARISTIC"];
    const index = age?.ChronologyIndex ?? 0;
    const icon = icons.at(index) ?? icons.at(-1);
    return icon;
}
const BZ_PRELOADED_ICONS = {};
function preloadIcon(icon, context) {
    if (!icon) return;
    const url = icon.startsWith("url(") ? icon : UI.getIcon(icon, context);
    const name = url.replace(/url|[(\042\047)]/g, '');  // \042\047 = quotation marks
    if (!name || name in BZ_PRELOADED_ICONS) return;
    BZ_PRELOADED_ICONS[name] = true;
    Controls.preloadImage(name, 'plot-tooltip');
}
function setStyle(element, style, padding) {
    if (!element || !style) return;
    for (const [property, value] of Object.entries(style)) {
        if (property == "classList") {
            element.classList.add(...value.split(/\s+/));
        } else {
            element.style.setProperty(property, value);
        }
    }
    if (padding) element.style.paddingTop = element.style.paddingBottom = padding;
}
function setBannerStyle(element, style=BZ_ALERT.danger, ...classes) {
    element.classList.add("bz-banner", ...classes);
    setStyle(element, style);
}
function setCapsuleStyle(element, style, ...classes) {
    if (!style) return;
    if (classes.length) element.classList.add(...classes);
    element.classList.add("px-2", "rounded-full");
    setStyle(element, style);
}
class bzPlotTooltip {
    constructor() {
        this.plotCoord = null;
        this.plotIndex = null;
        this.isDebug = false;
        this.modCtrl = false;
        this.modShift = false;
        this.verbosity = bzMapTrixOptions.verbose;
        // document root
        this.tooltip = document.createElement('fxs-tooltip');
        this.tooltip.classList.value = "bz-tooltip plot-tooltip max-w-96";
        this.tooltip.style.lineHeight = metrics.table.ratio;
        this.container = document.createElement('div');
        this.container.classList.value = "relative font-body text-xs";
        this.tooltip.appendChild(this.container);
        // point-of-view info
        this.observerID = GameContext.localObserverID;
        this.observer = Players.get(this.observerID);
        // core properties
        this.age = null;
        this.city = null;
        this.district = null;
        this.resource = null;
        // title
        this.banners = null;
        this.title = null;
        // world
        this.obstacles = gatherMovementObstacles("UNIT_MOVEMENT_CLASS_FOOT");
        this.terrain = null;
        this.biome = null;
        this.feature = null;
        this.river = null;
        this.routes = null;
        this.plotEffects = null;
        this.isDistantLands = null;
        // settlement stats
        this.owner = null;
        this.relationship = null;
        this.originalOwner = null;
        this.settlementType = null;
        this.townFocus = null;
        this.religions = null;  // TODO: redesign
        // constructibles
        this.constructibles = [];
        this.buildings = [];  // omits walls
        this.improvement = null;
        this.wonder = null;
        // workers
        this.specialists = null;  // { workers, maximum }
        this.freeConstructible = null;  // standard improvement type
        // yields
        this.yields = [];
        this.totalYields = 0;
        // units
        this.units = [];
        // lookup tables
        this.agelessBuildings = gatherBuildingsTagged("AGELESS");
        this.extraBuildings = gatherBuildingsTagged("IGNORE_DISTRICT_PLACEMENT_CAP");
        this.largeBuildings = gatherBuildingsTagged("FULL_TILE");
        Loading.runWhenFinished(() => {
            for (const y of GameInfo.Yields) {
                // Controls.preloadImage(url, 'plot-tooltip');
                preloadIcon(`${y.YieldType}`, "YIELD");
            }
            for (const y of [BZ_ICON_TOTAL_RURAL, BZ_ICON_TOTAL_URBAN]) {
                preloadIcon(y, "YIELD");
            }
            // stop flicker in Sukritact's city banner tooltip
            Controls.preloadImage("hud_sub_circle_bk", "city-banner");
        });
    }
    static get instance() { return bzPlotTooltip._instance; }
    get isHidden() { return this.verbosity == bzVerbosity.HIDDEN; }
    get isCompact() { return this.verbosity <= bzVerbosity.COMPACT; }
    get isVerbose() { return this.verbosity >= bzVerbosity.VERBOSE; }
    getHTML() {
        return this.tooltip;
    }
    isUpdateNeeded(plotCoord) {
        // has the cursor moved?
        const hasMoved =
            plotCoord.x != this.plotCoord?.x ||
            plotCoord.y != this.plotCoord?.y;
        // have the key modifiers changed?
        const modCtrl = Input.isCtrlDown();
        const modShift = Input.isShiftDown();
        const hasShifted = modCtrl != this.modCtrl || modShift != this.modShift;
        // update properties
        this.plotCoord = plotCoord;
        this.modCtrl = modCtrl;
        this.modShift = modShift;
        this.verbosity =
            this.modCtrl && this.modShift ? bzVerbosity.HIDDEN :
            this.modCtrl ? bzVerbosity.COMPACT :
            this.modShift ? bzVerbosity.VERBOSE :
            bzMapTrixOptions.verbose;
        return hasShifted || hasMoved;
    }
    isBlank() {
        if (!this.plotCoord) return true;  // outside the map
        if (this.isHidden) return true;  // Hidden verbosity level
        // is the tile revealed yet?
        const revealedState = GameplayMap.getRevealedState(this.observerID, this.plotCoord.x, this.plotCoord.y);
        if (revealedState == RevealedStates.HIDDEN) return true;
        // with a unit selected: ignore the same tile and enemy tiles
        // UNLESS compact or verbose mode is manually engaged
        if (this.modCtrl || this.modShift) return false;
        const selectedUnitID = UI.Player.getHeadSelectedUnit();
        if (selectedUnitID && ComponentID.isValid(selectedUnitID)) {
            const plotUnits = MapUnits.getUnits(this.plotCoord.x, this.plotCoord.y);
            if (plotUnits.length > 0) {
                // hovering over your selected unit: hide the tooltip
                if (plotUnits.find(e => ComponentID.isMatch(e, selectedUnitID))) {
                    return true;
                }
                let args = {};
                args.X = this.plotCoord.x;
                args.Y = this.plotCoord.y;
                let combatType = Game.Combat.testAttackInto(selectedUnitID, args);
                // hovering over an enemy: hide the tooltip
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
        // point-of-view info
        this.observerID = GameContext.localObserverID;
        this.observer = Players.get(this.observerID);
        // core
        this.age = null;
        this.city = null;
        this.district = null;
        this.resource = null;
        // title
        this.banners = null;
        this.title = null;
        // world
        this.obstacles = gatherMovementObstacles("UNIT_MOVEMENT_CLASS_FOOT");
        this.terrain = null;
        this.biome = null;
        this.feature = null;
        this.river = null;
        this.routes = null;
        this.plotEffects = null;
        this.isDistantLands = null;
        // settlement
        this.owner = null;
        this.relationship = null;
        this.originalOwner = null;
        this.settlementType = null;
        this.townFocus = null;
        this.religions = null;  // TODO: redesign
        // constructibles
        this.constructibles = [];
        this.buildings = [];  // omits walls
        this.improvement = null;
        this.wonder = null;
        // workers
        this.specialists = null;  // { workers, maximum }
        this.freeConstructible = null;  // standard improvement type
        // yields
        this.yields = [];
        this.totalYields = 0;
        // units
        this.units = [];
    }
    update() {
        if (!this.plotCoord) {
            console.error("plot-tooltip: cannot read plot values (coordinate error)");
            return;
        }
        this.plotIndex = GameplayMap.getIndexFromLocation(this.plotCoord);
        // show debug info if enabled
        this.isDebug = UI.isDebugPlotInfoVisible();
        this.model();
        this.render();
        UI.setPlotLocation(this.plotCoord.x, this.plotCoord.y, this.plotIndex);
        this.setWarningCursor(this.plotCoord);
    }
    model() {
        // update point-of-view info
        this.observerID = GameContext.localObserverID;
        this.observer = Players.get(this.observerID);
        // core properties
        this.age = GameInfo.Ages.lookup(Game.age);
        const loc = this.plotCoord;
        const cityID = GameplayMap.getOwningCityFromXY(loc.x, loc.y);
        this.city = cityID ? Cities.get(cityID) : null;
        const districtID = MapCities.getDistrict(loc.x, loc.y);
        this.district = districtID ? Districts.get(districtID) : null;
        const resourceType = GameplayMap.getResourceType(loc.x, loc.y);
        this.resource = GameInfo.Resources.lookup(resourceType);
        // general properties
        this.modelBanners();
        this.modelGeography();
        this.modelConstructibles();
        this.modelSettlement();
        this.modelWorkers();
        this.modelYields();
        this.modelUnits();
    }
    render() {
        if (BZ_DUMP_ICONS) return this.dumpIcons();
        this.renderTitle();
        this.renderGeography();
        this.renderSettlement();
        this.renderHex();
        this.renderYields();
        this.renderUnits();
        if (this.isDebug) this.renderDebugInfo();
    }
    // data modeling methods
    modelBanners() {
        // requires: this.city, this.resource
        const loc = this.plotCoord;
        this.banners = { danger: [], caution: [], note: [], };
        this.plotEffects = { info: [], text: [], };
        const plotEffects = MapPlotEffects.getPlotEffects(this.plotIndex) ?? [];
        for (const item of plotEffects) {
            if (item.onlyVisibleToOwner && item.owner != this.observerID) continue;
            const info = GameInfo.PlotEffects.lookup(item.effectType);
            if (!info) continue;
            this.plotEffects.info.push(item);
            if (info.Damage) {
                this.banners.danger.push(info.Name);
            } else if (info.Defense) {
                this.banners.note.push(info.Name);
            } else {
                this.plotEffects.text.push(info.name);
            }
        }
        // no further effects needed for impassible or offshore tiles
        if (GameplayMap.isImpassable(loc.x, loc.y) ||
            GameplayMap.isNavigableRiver(loc.x, loc.y) ||
            GameplayMap.isWater(loc.x, loc.y)) {
            // no need here for settlement advice, including
            // Dont't add any extra tooltip to mountains, oceans, or navigable rivers, should be obvious enough w/o them
            return;
        }

        // check fresh water
        const lens = LensManager.getActiveLens();
        const wloc = this.city ? this.city.location : loc;
        if (wloc.x != loc.x || wloc.y != loc.y) {
            // ignore city water out side of the city center
        } else if (GameplayMap.isFreshWater(wloc.x, wloc.y)) {
            this.plotEffects.text.push("LOC_PLOTKEY_FRESHWATER");
        } else if (!this.city && lens == "fxs-settler-lens") {
            this.banners.caution.push("LOC_PLOT_TOOLTIP_NO_FRESH_WATER");
        }
        // remainder is for settler lens only
        if (lens != "fxs-settler-lens") return;
        // show limits of the advanced start area
        if (this.observer?.AdvancedStart &&
            !this.observer.AdvancedStart.getPlacementComplete() &&
            !GameplayMap.isPlotInAdvancedStartRegion(this.observerID, loc.x, loc.y)) {
            this.banners.danger.push("LOC_PLOT_TOOLTIP_CANT_SETTLE_TOO_FAR");
        }
        // show blocked tiles
        if (this.observer?.Diplomacy &&
            !this.observer.Diplomacy.isValidLandClaimLocation(loc, true)) {
            if (GameplayMap.isCityWithinMinimumDistance(loc.x, loc.y)) {
                // settlement too close
                this.banners.danger.push("LOC_PLOT_TOOLTIP_CANT_SETTLE_TOO_CLOSE");
            } else if (!this.resource) {
                // village too close (implied)
                this.banners.danger.push("LOC_PLOT_TOOLTIP_CANT_SETTLE_TOO_CLOSE");
            }
            if (this.resource) {
                // resource too close
                this.banners.danger.push("LOC_PLOT_TOOLTIP_CANT_SETTLE_RESOURCES");
            }
        }
    }
    modelGeography() {
        const loc = this.plotCoord;
        // (note: currently using "foot" instead of the selected unit)
        this.obstacles = gatherMovementObstacles("UNIT_MOVEMENT_CLASS_FOOT");
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
        this.routes = this.getRoutes();
        this.isDistantLands = this.observer?.isDistantLands(loc) ?? null;
    }
    modelSettlement() {
        // owner, civ, city, district
        const loc = this.plotCoord;
        const ownerID = GameplayMap.getOwner(loc.x, loc.y);
        this.owner = Players.get(ownerID);
        this.relationship = this.getCivRelationship(this.owner);
        // original owner
        if (this.city && this.city.originalOwner != this.city.owner) {
            this.originalOwner = Players.get(this.city.originalOwner);
        }
        // settlement type
        if (this.owner?.isIndependent) {
            // village or encampment
            this.settlementType = this.improvement?.info.Name ?? "FOO";
        } else if (!this.city) {
            // not a settlement
        } else if (this.owner.isMinor) {
            this.settlementType = "LOC_BZ_SETTLEMENT_CITY_STATE";
        } else if (this.city.isTown) {
            const focus = getTownFocus(this.city);
            this.townFocus = focus;
            this.settlementType = this.townFocus.name;
        } else if (this.city.isCapital) {
            this.settlementType = "LOC_CAPITAL_SELECT_PROMOTION_CAPITAL";
        } else {
            this.settlementType = "LOC_CAPITAL_SELECT_PROMOTION_CITY";
        }
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
            const isOverbuildable = isBuilding && Math.ceil(age) != currentAge;
            const uniqueTrait =
                isBuilding ?
                GameInfo.Buildings.lookup(info.ConstructibleType).TraitType :
                isImprovement ?
                GameInfo.Improvements.lookup(info.ConstructibleType).TraitType :
                null;
            const isCurrent = isComplete && !isDamaged && !isOverbuildable && !isExtra;

            if (isDamaged) notes.push("LOC_PLOT_TOOLTIP_DAMAGED");
            if (!isComplete) notes.push("LOC_PLOT_TOOLTIP_IN_PROGRESS");
            if (this.isCompact) {
                // skip remaining notes in Compact mode
            } else if (uniqueTrait) {
                notes.push("LOC_STATE_BZ_UNIQUE");
            } else if (isAgeless && !isWonder) {
                notes.push("LOC_UI_PRODUCTION_AGELESS");
            } else if (isOverbuildable) {
                notes.push("LOC_PLOT_TOOLTIP_OVERBUILDABLE");
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
            // move walls to the end of the list
            const wallSort = (a, b) => (a.isExtra ? 1 : 0) - (b.isExtra ? 1 : 0);
            this.constructibles.sort(wallSort);
            this.buildings.sort(wallSort);
            if (this.wonder || this.improvement) {  // should only be one
                const types = this.constructibles.map(c => c.info?.ConstructibleType);
                console.warn(`bz-plot-tooltip: expected 1 constructible, not ${n} (${types})`);
            }
        }
    }
    modelWorkers() {
        const loc = this.plotCoord;
        this.specialists = getSpecialists(this.plotCoord, this.city);
        if (this.improvement) {
            // set up icons and special district names for improvements
            const info = this.improvement.info;
            if (this.improvement?.info.Discovery) {
                // discoveries don't have an icon, but here's a nice map
                this.improvement.icon = BZ_ICON_DISCOVERY;
                this.improvement.districtName = "LOC_DISTRICT_BZ_DISCOVERY";
            } else if (info.Age == null && info.Population == 0) {
                // villages and encampments get icons based on their unique
                // improvements, appropriate for the age and minor civ type
                this.improvement.icon = getVillageIcon(this.owner, this.age);
                this.improvement.districtName = "LOC_DISTRICT_BZ_INDEPENDENT";
            } else {
                this.improvement.icon = info.ConstructibleType;
            }
        }
        // get the free constructible (standard tile improvement)
        if (this.isCompact) return;  // not in compact mode
        if (this.improvement?.districtName) return;  // skip discoveries and villages
        if (this.district && !this.improvement) return;  // rural tiles only
        // outside player territory, only show resources (unless verbose)
        if (this.city?.owner != this.observerID && !this.resource &&
            !this.isVerbose) return;
        const fcID = Districts.getFreeConstructible(loc, this.observerID);
        const info = GameInfo.Constructibles.lookup(fcID);
        if (!info) return;  // mountains, open ocean
        const name = info.Name;
        if (name == this.improvement?.info?.Name) return;  // redundant
        if (this.improvement) {
            // add warehouse type to unique improvement
            this.improvement.notes.push(name);
            return;
        }
        const format =
            this.resource ? "LOC_BZ_IMPROVEMENT_FOR_RESOURCE" :
            "LOC_BZ_IMPROVEMENT_FOR_TILE";
        const icon = `[icon:${info.ConstructibleType}]`;
        const text = Locale.compose(format, icon, name);
        this.freeConstructible = { info, name, format, icon, text };
    }
    modelYields() {
        const loc = this.plotCoord;
        this.yields = [];
        this.totalYields = 0;
        // one column per yield type
        GameInfo.Yields.forEach(info => {
            const name = info.Name;
            const type = info.YieldType;
            const yvalue = GameplayMap.getYield(loc.x, loc.y, type, this.observerID);
            if (yvalue) {
                const value = (Math.round(10 * yvalue) / 10).toString();
                const column = { name, type, value, };
                this.yields.push(column);
                this.totalYields += yvalue;
            }
        });
        if (this.yields.length < 2) return;
        // total
        const name = "LOC_YIELD_BZ_TOTAL";
        const type = BZ_URBAN_TYPES.includes(this.district?.type) ?
            BZ_ICON_TOTAL_URBAN : BZ_ICON_TOTAL_RURAL;
        // avoid fractions in total to avoid extra-wide columns
        // round down to avoid inflating totals (for science legacy)
        const value = Math.floor(this.totalYields).toString();
        const column = { name, type, value, };
        this.yields.push(column);
    }
    modelUnits() {
        const loc = this.plotCoord;
        if (GameplayMap.getRevealedState(this.observerID, loc.x, loc.y) != RevealedStates.VISIBLE) return;
        const units = [];
        for (const id of MapUnits.getUnits(loc.x, loc.y)) {
            if (this.observer && !Visibility.isVisible(this.observerID, id)) continue;
            const unit = Units.get(id);
            if (!unit) continue;
            const name = unit.name;
            const owner = Players.get(unit.owner);
            const civ = this.getCivName(owner);
            const relationship = this.getCivRelationship(owner);
            units.push({ id, name, owner, civ, relationship, });
        }
        this.units = units;
    }
    renderDivider() {
        const divider = document.createElement("div");
        divider.style.height = metrics.border.css;
        divider.style.marginTop = metrics.padding.y.css;
        divider.style.marginLeft = divider.style.marginRight =
            `-${metrics.padding.x.css}`;
        divider.style.backgroundImage = `linear-gradient(90deg, ${BZ_COLOR.bronze}55 0%, ${BZ_COLOR.bronze} 50%, ${BZ_COLOR.bronze}55 100%)`;
        this.container.appendChild(divider);
    }
    renderFlexDivider(center, lines, ...style) {
        const layout = document.createElement("div");
        layout.classList.value = "flex-auto flex justify-between items-center -mx-6";
        if (style.length) layout.classList.add(...style);
        this.container.appendChild(layout);
        // left frame
        const lineLeft = document.createElement("div");
        lineLeft.classList.value = "flex-auto h-0\\.5 min-w-6 ml-1\\.5";
        if (lines) lineLeft.style.setProperty("background-image", "linear-gradient(to left, #8D97A6, rgba(141, 151, 166, 0))");
        layout.appendChild(lineLeft);
        // content
        layout.appendChild(center);
        // right frame
        const lineRight = document.createElement("div");
        lineRight.classList.value = "flex-auto h-0\\.5 min-w-6 mr-1\\.5";
        if (lines) lineRight.style.setProperty("background-image", "linear-gradient(to right, #8D97A6, rgba(141, 151, 166, 0))");
        layout.appendChild(lineRight);
    }
    renderTitleHeading(text) {
        if (!text) return;
        const layout = document.createElement("div");
        layout.classList.value = "text-secondary font-title-sm uppercase text-center";
        layout.style.lineHeight = metrics.head.ratio;
        layout.style.marginTop = metrics.head.margin.css;
        const ttText = document.createElement("div");
        ttText.setAttribute('data-l10n-id', text);
        layout.appendChild(ttText);
        this.container.appendChild(layout);
    }
    renderTitle() {
        // alert banners: damaging & defense effects, settler warnings
        const banner = (text, style) => {
            const banner = docBanner([text], style);
            // leave a small gap between & after banners
            banner.style.marginBottom = metrics.padding.banner.css;
            // better wrapping for longer banners
            banner.children[0].classList.value = "max-w-64";
            return banner;
        }
        // prepare each banner
        const banners = [
            ...this.banners.danger.map(text => banner(text, BZ_ALERT.danger)),
            ...this.banners.caution.map(text => banner(text, BZ_ALERT.caution)),
            ...this.banners.note.map(text => banner(text, BZ_ALERT.note)),
        ];
        if (banners.length) {
            // round off topmost banner
            const head = banners.at(0);
            head.style.marginTop = `-${metrics.padding.y.css}`;
            head.style.lineHeight = metrics.bumper.css;
            const radius = metrics.radius.css;
            head.style.borderRadius = `${radius} ${radius} 0 0`;
            for (const banner of banners) {
                this.container.appendChild(banner);
            }
        }
        this.renderTitleHeading(this.title ?? "TODO");
    }
    renderGeography() {
        if (this.isCompact) return;
        const loc = this.plotCoord;
        const terrainLabel = this.getTerrainLabel(loc);
        const continentName = this.getContinentName(loc);
        const biomeLabel = this.getBiomeLabel(loc);
        const featureLabel = this.getFeatureLabel(loc);
        const river = this.getRiverInfo(loc);
        const effects = this.plotEffects;
        const routes = this.routes;
        // TODO: collect all of the labels & obstacles in model
        // show geographical features
        const layout = document.createElement("div");
        layout.classList.value = "text-center";
        layout.style.lineHeight = metrics.body.ratio;
        // continent & hemisphere
        if (this.terrain && this.terrain.TerrainType != "TERRAIN_OCEAN") {
            const hemisphereName =
                this.isDistantLands ? "LOC_PLOT_TOOLTIP_HEMISPHERE_WEST" :
                this.isDistantLands === false ? "LOC_PLOT_TOOLTIP_HEMISPHERE_EAST" :
                null;  // autoplaying
            const text = dotJoinLocale([continentName, hemisphereName]);
            if (text) layout.appendChild(docText(text));
        }
        // terrain & biome
        if (terrainLabel) {
            const text = joinLocale([terrainLabel.text, biomeLabel]);
            layout.appendChild(docText(text));
        }
        // feature type
        if (featureLabel) layout.appendChild(docText(featureLabel.text));
        // routes and rivers
        if (river) {
            const names = [river.name, routes?.ferry];
            layout.appendChild(docText(dotJoinLocale(names)));
        }
        // plot effects and fresh water
        if (effects.text.length) {
            const text = docText(dotJoinLocale(effects.text));
            layout.appendChild(text);
        }
        // roads and obstacles
        const obstacles = this.layoutObstacles();
        layout.appendChild(obstacles);
        // TODO: account for subtitle too
        layout.style.marginBottom =
            obstacles.children.length ? metrics.margin.css :  // flat bottom
            layout.children.length ?  metrics.body.margin.css :  // body text
            metrics.head.margin.css;
        this.container.appendChild(layout);
    }
    layoutObstacles() {
        // TODO: move logic to modelGeography
        const loc = this.plotCoord;
        const layout = document.createElement("div");
        layout.classList.value = "flex flex-wrap justify-center";
        // offset outer capsule margins
        layout.style.marginLeft = layout.style.marginRight =
            `-${metrics.body.leading.half.css}`;
        // capsule formatting
        const capsule = (text, style) => {
            const cap = docCapsule(text, style);
            cap.style.lineHeight = metrics.rules.ratio;
            cap.style.marginTop = metrics.padding.banner.css;
            cap.style.marginLeft = cap.style.marginRight =
                metrics.body.leading.half.css;
            return cap;
        }
        // roads & rail
        if (this.routes?.route) {
            const r = this.routes;
            const style = r.isRoad ? BZ_STYLE.road : r.isRail ? BZ_STYLE.rail : null;
            layout.appendChild(capsule(r.route, style));
        }
        if (this.terrain && this.obstacles.has(this.terrain.TerrainType)) {
            const info = this.terrain;
            const style = BZ_STYLE[info.TerrainType];
            layout.appendChild(capsule(info.Name, style));
        }
        if (this.feature && this.obstacles.has(this.feature.FeatureType)) {
            const fc = this.feature.FeatureClassType;
            const info = GameInfo.FeatureClasses.lookup(fc);
            const style = BZ_STYLE[fc];
            layout.appendChild(capsule(info.Name, style));
        }
        if (GameplayMap.getRiverType(loc.x, loc.y) != RiverTypes.NO_RIVER) {
            layout.appendChild(capsule("LOC_RIVER_NAME", BZ_STYLE.river));
        }
        return layout;
    }
    obstacleStyle(obstacleType, ...fallbackStyles) {
        if (!this.obstacles.has(obstacleType)) return null;
        const style = [obstacleType, ...fallbackStyles].find(s => s in BZ_STYLE);
        if (style) return BZ_STYLE[style];
        return BZ_ALERT.caution;
    }
    getTerrainLabel(loc) {
        if (!this.terrain) return { text: "", style: null };
        let text = this.terrain.Name;
        const style = this.obstacleStyle(this.terrain.TerrainType);
        if (this.terrain.TerrainType == "TERRAIN_COAST" && GameplayMap.isLake(loc.x, loc.y)) {
            text = "LOC_TERRAIN_LAKE_NAME";
        }
        if (this.isDebug) {
            text = Locale.compose('{1_Name} ({2_Value})',
                text, this.terrain["$index"].toString());
        }
        return { text, style };
    }
    getBiomeLabel() {
        // Do not show a label for marine biome.
        if (!this.biome || this.biome.BiomeType == "BIOME_MARINE") return "";
        let text = this.biome.Name;
        if (this.isDebug) {
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
    getRoutes() {
        const routeType = GameplayMap.getRouteType(this.plotCoord.x, this.plotCoord.y);
        const routeInfo = GameInfo.Routes.lookup(routeType);
        const isRail = !!routeInfo?.PlacementRequiresRoutePresent;
        const isRoad = routeInfo && !isRail;
        const isFerry = GameplayMap.isFerry(this.plotCoord.x, this.plotCoord.y);
        const route = routeInfo?.Name ?? null;
        const ferry = isFerry ? "LOC_NAVIGABLE_RIVER_FERRY" : null;
        return { route, ferry, isRoad, isRail, isFerry, };
    }
    renderSettlement() {
        if (this.isCompact) return;
        // note: discoveries are owned by non-living "World" player
        if (!this.owner || !Players.isAlive(this.owner.id)) return;
        const name = this.city ? this.city.name : this.getCivName(this.owner);
        // render headings: settlement and type
        this.renderTitleHeading(name);
        const type = docRules([this.settlementType]);
        type.classList.value = "text-2xs uppercase";
        type.style.lineHeight = metrics.note.ratio;
        type.style.marginBottom = metrics.padding.banner.css;
        this.container.appendChild(type);
        // owner info
        const rows = [];
        // show name, relationship, and civ
        const ownerName = this.getOwnerName(this.owner);
        const relType = Locale.compose(this.relationship.type ?? "");
        rows.push(dotJoin([ownerName, relType]));
        rows.push(this.getCivName(this.owner, true));  // full name
        // show original owner
        if (this.originalOwner) {
            const was = this.originalOwner.civilizationName;
            const text = Locale.compose("LOC_BZ_WAS_PREVIOUSLY", was);
            rows.push(text);
        }
        const style = this.relationship?.isEnemy ?  BZ_ALERT.danger : null;
        const banner = docBanner(rows, style, metrics.padding.banner.css);
        banner.style.lineHeight = metrics.body.ratio;
        banner.style.marginBottom = metrics.body.margin.css;
        this.container.appendChild(banner);
    }
    getOwnerName(owner) {
        if (!owner) return "";
        const name = owner.isMinor || owner.isIndependent ?
            Locale.compose("LOC_BZ_PEOPLE_NAME", owner.name) :
            Locale.compose(owner.name);
        return name;
    }
    getCivName(owner, fullName=false) {
        if (!owner) return "";
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
        if (!owner || !Players.isAlive(owner.id)) return null;
        if (owner.id == this.observerID) {
            return { type: "LOC_PLOT_TOOLTIP_YOU", isEnemy: false };
        }
        if (!owner.Diplomacy) return null;
        // is the other player a city-state or village?
        if (owner.isMinor || owner.isIndependent) {
            const isVassal = owner.Influence?.hasSuzerain &&
                owner.Influence.getSuzerain() == this.observerID;
            const isEnemy = owner.Diplomacy?.isAtWarWith(this.observerID);
            const type =
                isVassal ? "LOC_BZ_RELATIONSHIP_TRIBUTARY" :
                 isEnemy ? "LOC_INDEPENDENT_RELATIONSHIP_HOSTILE" :
                "LOC_INDEPENDENT_RELATIONSHIP_FRIENDLY";
            return { type, isEnemy };
        }
        // is the other player at war?
        if (owner.Diplomacy.isAtWarWith(this.observerID)) {
            return { type: "LOC_PLAYER_RELATIONSHIP_AT_WAR", isEnemy: true };
        }
        // not an enemy
        if (owner.Diplomacy.hasAllied(this.observerID)) {
            return { type: "LOC_PLAYER_RELATIONSHIP_ALLIANCE", isEnemy: false };
        }
        const type = owner.Diplomacy.getRelationshipLevelName(this.observerID);
        return { type, isEnemy: false };
    }
    renderHex() {
        switch (this.district?.type) {
            case DistrictTypes.CITY_CENTER:
            case DistrictTypes.URBAN:
                this.renderUrban();
                break;
            case DistrictTypes.RURAL:
            case DistrictTypes.WILDERNESS:
            default:
                this.renderRural();
                break;
            case DistrictTypes.WONDER:
                this.renderWonder();
                break;
        }
    }
    renderUrban() {
        const quarterOK = this.buildings.reduce((a, b) =>
            a + (b.isCurrent ? b.isLarge ? 2 : 1 : 0), 0);
        let hexName = this.city.name;
        let hexRules;
        // set name & description
        if (this.isCompact) {
            // keep the city name
        } else if (this.district.type == DistrictTypes.CITY_CENTER) {
            if (this.city.isTown && !this.owner.isMinor) {
                // rename "City Center" to "Town Center" in towns
                hexName = "LOC_DISTRICT_BZ_TOWN_CENTER";
            } else {
                hexName = GameInfo.Districts.lookup(this.district.type).Name;
            }
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
            } else if (!this.isCompact) {
                hexName = "LOC_DISTRICT_BZ_URBAN_QUARTER";
            }
        } else if (this.buildings.length == 0) {
            // urban tile with canceled production
            hexName = "LOC_DISTRICT_BZ_URBAN_VACANT";
        } else {
            hexName = "LOC_DISTRICT_BZ_URBAN_DISTRICT";
        }
        // title bar
        this.renderTitleHeading(Locale.compose(hexName));
        this.renderDistrictDefense(this.plotCoord);
        // panel interior
        // show rules for unique quarters
        if (hexRules && this.isVerbose) this.renderRules([hexRules], "w-60 mb-1");
        // constructibles
        this.renderConstructibles();
        // report specialists
        if (this.specialists && (this.specialists.workers || this.isVerbose)) {
            const text = Locale.compose("LOC_DISTRICT_BZ_SPECIALISTS",
                this.specialists.workers, this.specialists.maximum);
            this.renderRules([text], "w-full mt-1");
        }
        // bottom bar
        this.renderUrbanDivider();
    }
    renderRural() {
        let hexName;
        let hexSubtitle;
        let hexRules = [];
        let hexIcon = this.improvement?.icon;
        let resourceIcon;
        // set name & description
        if (this.improvement?.districtName) {
            // village or discovery
            hexName = this.isCompact && this.owner?.isAlive ?
                this.getCivName(this.owner) :
                this.improvement?.districtName;
        } else if (this.feature?.Tooltip) {
            // natural wonder
            hexName = this.feature.Name;
            if (!this.improvement || this.isVerbose) {
                hexRules.push(this.feature.Tooltip);
            }
        } else if (this.resource) {
            // resource
            hexName = this.resource.Name;
            if (this.freeConstructible || this.isVerbose) {
                const rctype = this.resource.ResourceClassType;
                const rc = rctype && GameInfo.ResourceClasses.lookup(rctype);
                if (rc?.Name) {
                    let rcname = rc.Name + "_BZ";
                    hexSubtitle = Locale.keyExists(rcname) ? rcname : rc.Name;
                }
                hexRules.push(this.resource.Tooltip);
                if (this.isDistantLands &&
                    this.resource.ResourceClassType == "RESOURCECLASS_TREASURE") {
                    // also show treasure fleet rules
                    hexRules.push("LOC_CAN_CREATE_TREASURE_FLEET");
                }
            }
            resourceIcon = this.resource.ResourceType;
        } else if (this.isCompact && this.city) {
            hexName = this.city.name;
        } else if (this.district?.type) {
            // rural
            hexName = GameInfo.Districts.lookup(this.district?.type).Name;
        } else if (this.city && this.freeConstructible) {
            // claimed but undeveloped
            hexName = "LOC_PLOT_TOOLTIP_UNIMPROVED";
        } else if (this.isCompact) {
            // unclaimed wilderness only needs a title in compact mode
            hexName = this.biome?.BiomeType == "BIOME_MARINE" ?
                this.terrain.Name :
                GameInfo.Districts.lookup(DistrictTypes.WILDERNESS).Name;
        }
        // avoid useless section headings
        if (!this.improvement && !this.totalYields) {
            if (this.isCompact && hexName) {
                this.renderTitleHeading(Locale.compose(hexName));
                this.container.lastChild.style.marginBottom = metrics.head.margin.css;
            }
            return;
        }
        // title bar
        if (hexName) this.renderTitleHeading(Locale.compose(hexName));
        // optional description
        if (hexRules.length && !this.isCompact) {
            const title = "text-2xs uppercase leading-none mb-1";
            if (hexSubtitle) this.renderRules([hexSubtitle], null, title);
            this.renderRules(hexRules, "w-60", "leading-normal mb-1");
        }
        // constructibles
        this.renderConstructibles();
        // bottom bar
        if (hexIcon || resourceIcon) {
            const style = [hexIcon == BZ_ICON_DISCOVERY ? "-my-2" : "-my-1"];
            const icon = { isSquare: true, style };
            if (hexIcon) {
                icon.icon = hexIcon;
                icon.overlay = resourceIcon;
                icon.oversize = 8;
                icon.isTurned = true;
                icon.colors = BZ_ICON_TYPES[hexIcon]?.map(type => BZ_TYPE_COLOR[type]);
            } else {
                icon.icon = resourceIcon;
            }
            this.renderIconDivider(icon, "mt-2");
        }
    }
    renderWonder() {
        if (!this.wonder) return;
        const info = this.wonder.info;
        this.renderTitleHeading(Locale.compose(info.Name));
        let rulesStyle = null;
        const notes = this.wonder.notes;
        if (notes.length) {
            const ttState = document.createElement("div");
            ttState.classList.value = "text-2xs leading-none text-center";
            ttState.innerHTML = dotJoinLocale(notes);
            this.container.appendChild(ttState);
            rulesStyle = "mt-1";
        }
        const rules = this.isVerbose ? info.Description : info.Tooltip;
        if (rules && !this.isCompact) {
            const tt = docRules([rules], rulesStyle);
            this.container.appendChild(tt);
        }
        const colors = constructibleColors(this.wonder.info);
        const icon = {
            icon: info.ConstructibleType,
            isSquare: true,
            ringsize: 11.5,
            colors,
            glow: this.wonder.isCurrent,
            collapse: false,
            style: ["-my-0\\.5"],
        };
        this.renderIconDivider(icon, "mt-1");
    }
    // lay out a column of constructibles and their construction notes
    renderConstructibles() {
        // TODO: new leading system
        if (!this.constructibles.length && !this.freeConstructible) return;
        const ttList = document.createElement("div");
        ttList.classList.value = "text-center";
        ttList.style.lineHeight = metrics.body.ratio;
        for (const c of this.constructibles) {
            const ttConstructible = document.createElement("div");
            const ttName = document.createElement("div");
            ttName.setAttribute("data-l10n-id", c.info.Name);
            ttConstructible.appendChild(ttName);
            const notes = dotJoinLocale(c.notes);
            if (notes) {
                const ttState = document.createElement("div");
                ttState.classList.value = "text-accent-3 text-2xs mb-0\\.5";
                if (c.isDamaged) {
                    setCapsuleStyle(ttState, BZ_ALERT.caution);
                } else {
                    ttState.style.lineHeight = metrics.note.ratio;
                    ttState.style.marginBottom = metrics.body.leading.half.css;
                }
                ttState.innerHTML = notes;
                ttConstructible.appendChild(ttState);
            }
            ttList.appendChild(ttConstructible);
        }
        // expansion type for undeveloped & upgraded tiles
        if (this.freeConstructible) {
            const tt = document.createElement("div");
            tt.setAttribute("data-l10n-id", this.freeConstructible.text);
            ttList.appendChild(tt);
        }
        this.container.appendChild(ttList);
    }
    // lay out paragraphs of rules text
    renderRules(text, listStyle=null, itemStyle=null) {
        // text with icons is squirrelly, only format it at top level!
        const ttText = document.createElement("div");
        ttText.classList.value = listStyle ?? "w-full";
        ttText.classList.add("bz-rules-list");
        for (const item of text) {
            const ttItem = document.createElement("div");
            ttItem.classList.value = itemStyle ?? "leading-normal";
            ttItem.classList.add("bz-rules-item");
            ttItem.setAttribute("data-l10n-id", item);
            ttText.appendChild(ttItem);
        }
        this.container.appendChild(ttText);
    }
    renderDistrictDefense() {
        if (!this.district) return;
        // occupation status
        if (this.district.owner != this.district.controllingPlayer) {
            const conqueror = Players.get(this.district.controllingPlayer);
            const conquerorName = this.getCivName(conqueror, true);
            const conquerorText = Locale.compose("{1_Term} {2_Subject}", "LOC_PLOT_TOOLTIP_CONQUEROR", conquerorName);
            const tt = document.createElement("div");
            tt.classList.value = "leading-tight mb-1 py-1";
            // TODO: switch to docBanner
            setBannerStyle(tt, BZ_ALERT.conqueror);
            tt.innerHTML = conquerorText;
            this.container.appendChild(tt);
        }
        // district health
        const loc = this.plotCoord;
        const info = [];
        const ownerID = GameplayMap.getOwner(loc.x, loc.y);
        const ownerDistricts = Players.Districts.get(ownerID);
        if (!ownerDistricts) return;
        // This type is unresolved, is it meant to be number instead?
        const currentHealth = ownerDistricts.getDistrictHealth(loc);
        const maxHealth = ownerDistricts.getDistrictMaxHealth(loc);
        const isUnderSiege = ownerDistricts.getDistrictIsBesieged(loc);
        if (currentHealth != maxHealth) {
            // under siege or healing
            const ttStatus = document.createElement("div");
            ttStatus.setAttribute("data-l10n-id", isUnderSiege ?
                "LOC_PLOT_TOOLTIP_UNDER_SIEGE" : "LOC_PLOT_TOOLTIP_HEALING_DISTRICT");
            info.push(ttStatus);
            // current health
            const ttHealth = document.createElement("div");
            setStyle(ttHealth, { color: BZ_COLOR.caution });
            ttHealth.innerHTML = currentHealth + '/' + maxHealth;
            info.push(ttHealth);
        } else if (currentHealth && this.isVerbose) {
            const ttHealth = document.createElement("div");
            ttHealth.innerHTML = currentHealth + '/' + maxHealth;
            info.push(ttHealth);
        }
        if (info.length) {
            const ttDefense = document.createElement("div");
            ttDefense.classList.value = "leading-tight text-center mb-1";
            const style = currentHealth != maxHealth ? BZ_ALERT.danger : BZ_ALERT.note;
            // TODO: switch to docBanner
            setBannerStyle(ttDefense, style, "py-1");
            for (const row of info) ttDefense.appendChild(row);
            this.container.appendChild(ttDefense);
        }
    }
    renderIconDivider(info, ...style) {
        // icon divider with optional overlay
        if (info.icon.search(/blp:tech_/) != -1) {
            // tech icons need a frame
            info.size = 10;
            info.underlay = BZ_ICON_FRAME;
            info.undersize = 14;
            info.undershift = { x: -0.25, y: 0.25 };
            info.ringsize = 12;
        }
        const layout = document.createElement("div");
        layout.classList.value = "flex relative mx-2";
        this.renderIcon(layout, info);
        this.renderFlexDivider(layout, false, ...style);
    }
    renderUrbanDivider() {
        // there are at least two building slots (unless one is large)
        const slots = [...this.buildings];
        if (slots.length < 2 && !this.buildings[0]?.isLarge)
            slots.push(...[null, null].slice(this.buildings.length));
        // render the icons
        const layout = document.createElement("div");
        layout.classList.value = "flex relative mx-2";
        for (const slot of slots) {
            // if the building has more than one yield type, like the
            // Palace, use one type for the ring and one for the glow
            const icon = slot?.info.ConstructibleType ?? BZ_ICON_EMPTY_SLOT;
            const colors = constructibleColors(slot?.info);
            const info = {
                icon, colors, glow: slot?.isCurrent, collapse: false, style: ["-my-1"],
            };
            this.renderIcon(layout, info);
        }
        this.renderFlexDivider(layout, false, "mt-1");
    }
    renderYields() {
        if (!this.totalYields) return;  // no yields to show
        // set column width based on number of digits (at least three)
        const digits = getDigits(this.yields.map(y => y.value), 2);
        const width = metrics.yields.digits(digits).css;
        const tt = document.createElement('div');
        tt.classList.value = "self-center flex flex-wrap justify-center w-full";
        // one column per yield type
        for (const [i, column] of this.yields.entries()) {
            const y = this.yieldColumn(column, width);
            if (i) y.style.marginLeft = '0.3333333333rem';  // all but first column
            tt.appendChild(y);
        }
        if (2 <= this.yields.length) {
            // adjust total column
            tt.lastChild.classList.add("text-secondary");
            tt.lastChild.style.marginLeft = '0.4444444444rem';
        }
        tt.style.marginTop = metrics.yields.margin.css;
        tt.style.marginBottom = metrics.yields.margin.css;
        this.container.appendChild(tt);
    }
    yieldColumn(col, width) {
        const tt = document.createElement("div");
        tt.classList.value = "flex-col justify-start font-body";
        const ariaLabel = `${col.value} ${Locale.compose(col.name)}`;
        tt.ariaLabel = ariaLabel;
        const size = metrics.yields.spacing.css;
        const iconCSS = UI.getIconCSS(col.type, "YIELD");
        const icon = docIcon(iconCSS, size, size, "self-center", "shadow");
        tt.appendChild(icon);
        const value = docText(col.value, "self-center text-center");
        value.style.fontSize = metrics.yields.size.css;
        value.style.lineHeight = metrics.yields.ratio;
        value.style.width = width;
        tt.appendChild(value);
        return tt;
    }
    renderUnits() {
        // show unit section
        if (this.isCompact || !this.units.length) return;
        this.renderDivider();
        const rows = [];
        for (const unit of this.units) {
            const info = [unit.name, unit.civ, unit.relationship.type];
            rows.push(dotJoinLocale(info));
        }
        const style = this.units[0].relationship.isEnemy ? BZ_ALERT.enemy : null;
        const banner = docBanner(rows, style);
        banner.style.paddingTop = banner.style.paddingBottom =
            metrics.padding.banner.css;
        banner.style.lineHeight = metrics.body.ratio;
        banner.style.marginBottom = `-${metrics.padding.y.css}`;
        if (!this.isDebug) {
            // bottom bumper rounding
            const radius = metrics.radius.css;
            banner.style.borderRadius = `0 0 ${radius} ${radius}`;
        }
        this.container.appendChild(banner);
    }
    setWarningCursor() {
        // highlight enemy territory & units with a red cursor
        if (UI.isCursorLocked()) return;
        // don't block cursor changes from interface-mode-acquire-tile
        if (InterfaceMode.getCurrent() == "INTERFACEMODE_ACQUIRE_TILE") return;
        const isEnemy =
            this.units.at(0)?.relationship.isEnemy ??  // first check occupying unit
            this.relationship?.isEnemy ??  // then hex ownership
            false;
        if (isEnemy) {
            UI.setCursorByType(UIHTMLCursorTypes.Enemy);
        } else {
            UI.setCursorByType(UIHTMLCursorTypes.Default);
        }
    }
    renderDebugInfo() {
        // debug info
        this.renderDivider();
        const loc = this.plotCoord;
        const ownerID = GameplayMap.getOwner(loc.x, loc.y);
        const currHp = Players.Districts.get(ownerID)?.getDistrictHealth(loc);
        const maxHp = Players.Districts.get(ownerID)?.getDistrictMaxHealth(loc);
        const rows = [
            "LOC_PLOT_TOOLTIP_DEBUG_TITLE",
            `${Locale.compose("LOC_PLOT_TOOLTIP_PLOT")}: (${loc.x},${loc.y})`,
            `${Locale.compose("LOC_PLOT_TOOLTIP_INDEX")}: ${this.plotIndex}`,
        ];
        if (maxHp) rows.push(`${currHp} / ${maxHp}`);
        const banner = docBanner(rows, BZ_STYLE.debug, metrics.padding.banner.css);
        banner.style.lineHeight = metrics.body.ratio;
        const radius = metrics.radius.css;
        banner.style.borderRadius = `0 0 ${radius} ${radius}`;
        banner.style.marginBottom = `-${metrics.padding.y.css}`;
        banner.children[0].classList.value = "text-secondary font-title uppercase";
        this.container.appendChild(banner);
    }
    renderIcon(layout, info) {
        if (!info) return
        // calculate icon sizes
        const size = info.size ?? BZ_ICON_SIZE;
        const undersize = info.undersize ?? size;
        const oversize = info.oversize ?? size;
        const baseSize = Math.max(size, undersize, oversize);
        const minsize = info.minsize ?? 0;
        // get ring colors and thickness
        // (ring & glow collapse by default)
        const colors = info.colors;
        const collapse = (test, d) => (test || info.collapse === false ? d : 0);
        const borderWidth = collapse(colors?.length, size/16);
        const blurRadius = collapse(info.glow, 10/3*borderWidth);
        const spreadRadius = collapse(info.glow, 4/3*borderWidth);
        // calculate overall sizes
        const ringsize = info.ringsize ?? baseSize;
        const frameSize = ringsize + 2*borderWidth;
        const glowSize = frameSize + blurRadius + 2*spreadRadius;
        const groundSize = Math.max(baseSize, glowSize, minsize);
        const rem = (d) => `${2/9*d}rem`;
        const setDimensions = (e, inside, shift) => {
            const offset = (groundSize - inside) / 2;
            const dx = shift?.x ?? 0;
            const dy = shift?.y ?? 0;
            e.style.setProperty("width", rem(inside));
            e.style.setProperty("height", rem(inside));
            e.style.setProperty("left", rem(offset + dx));
            e.style.setProperty("top", rem(offset + dy));
        };
        const setIcon = (icon, size, shift, z) => {
            if (!icon) return;
            const e = document.createElement("div");
            e.classList.value = "absolute bg-contain bg-center";
            e.style.setProperty("z-index", z);
            setDimensions(e, size, shift);
            if (!icon.startsWith("url(")) icon = UI.getIconCSS(icon);
            preloadIcon(icon);
            e.style.backgroundImage = icon;
            ttIcon.appendChild(e);
        };
        // background
        const ttIcon = document.createElement("div");
        ttIcon.classList.value = "relative bg-contain bg-center";
        if (info.style) ttIcon.classList.add(...info.style);
        setDimensions(ttIcon, groundSize);
        // display the icons
        setIcon(info.icon, size, info.shift, 3);
        setIcon(info.underlay, undersize, info.undershift, 2);
        setIcon(info.overlay, oversize, info.overshit, 4);
        // ring the icon with one or two colors
        if (colors) {
            // split multiple colors between ring and glow
            const slotColor = colors && (colors.at(0) ?? BZ_TYPE_COLOR[undefined]);
            const glowColor = colors && (colors.at(-1) ?? BZ_TYPE_COLOR[undefined]);
            // get ring shape
            const isSquare = info.isSquare;
            const isTurned = info.isTurned;
            const borderRadius = isSquare ? rem(borderWidth) : "100%";
            const turnSize = (isTurned ? ringsize / Math.sqrt(2) : ringsize);
            // create ring
            const e = document.createElement("div");
            e.classList.value = "absolute border-0";
            e.style.setProperty("border-radius", borderRadius);
            e.style.setProperty("z-index", "1");
            if (isTurned) e.style.setProperty("transform", "rotate(-45deg)");
            setDimensions(e, turnSize + 2*borderWidth);
            e.style.setProperty("border-width", rem(borderWidth));
            e.style.setProperty("border-color", slotColor);
            // optionally also glow
            if (info.glow) e.style.setProperty("box-shadow",
                `0rem 0rem ${rem(blurRadius)} ${rem(spreadRadius)} ${glowColor}`);
            ttIcon.appendChild(e);
        }
        layout.appendChild(ttIcon);
    }
    dumpIcons() {
        const constructibles = dump_constructibles();
        const buildings = constructibles.filter(c => c.cclass == "BUILDING");
        const improvements = constructibles.filter(c => c.cclass == "IMPROVEMENT");
        const wonders = constructibles.filter(c => c.cclass == "WONDER");
        const yields = dump_yields();
        const dumps = [
            buildings,
            buildings.map(b => ({ ...b, glow: true })),
            improvements,
            wonders,
            yields,
        ];
        for (const list of dumps) {
            const dump = document.createElement("div");
            dump.classList.value =
                "self-center flex flex-wrap justify-center items-center";
            dump.style.setProperty("width", "106rem");
            for (const item of list) {
                const info = { ...item };
                info.collapse = false;
                info.style = ["m-0\\.5", "bg-black"];
                this.renderIcon(dump, info);
            }
            this.container.appendChild(dump);
        }
    }
}
function dump_constructibles() {
    const dump = [];
    for (const item of GameInfo.Constructibles) {
        if (item.Discovery ||  // discoveries
            item.Age == null && item.Population == 0 ||  // villages
            item.ConstructibleType.endsWith("_RESOURCE"))  // duplicate
            continue;
        const icon = item.ConstructibleType;
        const cclass = item.ConstructibleClass;
        const isImprovement = cclass == "IMPROVEMENT";
        const isWonder = cclass == "WONDER";
        const isSquare = isImprovement || isWonder;
        const isTurned = isImprovement;
        const size = BZ_DUMP_SIZE;
        const ringsize = isWonder ? 11.5/12 * size : size;
        const minsize = size * 3/2;
        const colors = constructibleColors(item);
        const glow = isWonder;
        const info = {
            icon, cclass, isSquare, isTurned, size, ringsize, minsize, colors, glow,
        };
        dump.push(info);
    }
    dump.sort((a, b) => {
        const sort =
            bzTypeSort(a.colors?.at(0), b.colors?.at(0)) ||
            bzTypeSort(a.colors?.at(-1), b.colors?.at(-1)) ||
            a.icon.localeCompare(b.icon);
        return sort;
    });
    return dump;
}
function dump_yields() {
    const size = BZ_DUMP_SIZE;
    const underlay = "BUILDING_OPEN";
    const glow = true;
    const yields = [
        "YIELD_FOOD", "YIELD_PRODUCTION", "YIELD_GOLD", "YIELD_SCIENCE",
        "YIELD_CULTURE", "YIELD_HAPPINESS", "YIELD_DIPLOMACY",
        "BUILDING_OPEN",
        "url(city_buildingslist)", "url(city_citizenslist)",
        "url(city_foodlist)", "url(city_improvementslist)",
        "url(city_resourceslistlist)", "url(city_wonderslist)",
    ];
    return yields.map(icon =>
        ({ icon, size, underlay, glow, colors: [BZ_TYPE_COLOR[icon]] }));
}
const BZ_DUMP_ICONS = false;
const BZ_DUMP_SIZE = 12;

bzPlotTooltip._instance = new bzPlotTooltip();
TooltipManager.registerPlotType('plot', PlotTooltipPriority.LOW, bzPlotTooltip.instance);
export { bzPlotTooltip as default };

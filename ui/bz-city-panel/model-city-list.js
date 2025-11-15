import { C as ComponentID } from '/core/ui/utilities/utilities-component-id.chunk.js';
import { U as UpdateGate } from '/core/ui/utilities/utilities-update-gate.chunk.js';

class bzCityListModel {
    onCityUpdateListener = this.onCityUpdate.bind(this);
    onUpdate;
    updateGate = new UpdateGate(() => this.update());
    _cities = new Map();
    _settlementList = [];
    _cityList = [];
    _townList = [];
    constructor() {
        this.updateGate.call("constructor");
        // from city-banner-manager
        engine.on("AffinityLevelChanged", this.onCityUpdateListener);
        engine.on("CityAddedToMap", this.onCityUpdateListener);
        engine.on("CityInitialized", this.onCityUpdateListener);
        engine.on("CityNameChanged", this.onCityUpdateListener);
        engine.on("CapitalCityChanged", this.onCityUpdateListener);
        engine.on("CityPopulationChanged", this.onCityUpdateListener);
        engine.on("CityProductionChanged", this.onCityUpdateListener);
        engine.on("CityYieldChanged", this.onCityUpdateListener);
        engine.on("CityProductionUpdated", this.onCityUpdateListener);
        engine.on("CityProductionQueueChanged", this.onCityUpdateListener);
        engine.on("CityReligionChanged", this.onCityUpdateListener);
        engine.on("DiplomacyEventStarted", this.onCityUpdateListener);
        engine.on("DiplomacyEventEnded", this.onCityUpdateListener);
        engine.on("DiplomacyRelationshipChanged", this.onCityUpdateListener);
        engine.on("UrbanReligionChanged", this.onCityUpdateListener);
        engine.on("RuralReligionChanged", this.onCityUpdateListener);
        engine.on("CityRemovedFromMap", this.onCityUpdateListener);
        engine.on("CitySelectionChanged", this.onCityUpdateListener);
        engine.on("CityStateBonusChosen", this.onCityUpdateListener);
        engine.on("CityGovernmentLevelChanged", this.onCityUpdateListener);
        engine.on("FoodQueueChanged", this.onCityUpdateListener);
        engine.on("CityGrowthModeChanged", this.onCityUpdateListener);
        engine.on("CityYieldGranted", this.onCityUpdateListener);
        engine.on("PlotVisibilityChanged", this.onCityUpdateListener);
        engine.on("ConqueredSettlementIntegrated", this.onCityUpdateListener);
        engine.on("DistrictAddedToMap", this.onCityUpdateListener);
        engine.on("DistrictRemovedFromMap", this.onCityUpdateListener);
        engine.on("NotificationAdded", this.onCityUpdateListener);
        // from bz-flag-corps
        engine.on('CityRazingStarted', this.onCityUpdateListener);
        engine.on('DiplomacyEventEnded', this.onCityUpdateListener);
        engine.on('DistrictDamageChanged', this.onCityUpdateListener);
        engine.on('PlayerResourceChanged', this.onCityUpdateListener);
        engine.on('PlayerTurnActivated', this.onCityUpdateListener);
    }
    set updateCallback(callback) {
        this.onUpdate = callback;
    }
    get cities() {
        return this._cities;
    }
    get settlementList() {
        return this._settlementList;
    }
    get cityList() {
        return this._cityList;
    }
    get townList() {
        return this._townList;
    }
    update() {
        this._cities = new Map();
        const player = Players.get(GameContext.localObserverID);
        if (player?.Cities == null) return;
        for (const id of player.Cities.getCityIds()) {
            this.updateCity(id);
        }
        this.updateDisplay();
    }
    updateDisplay() {
        this._settlementList = [...this._cities.values()];
        const citySort = (a, b) => {
            // sort capital first
            if (a.isCapital && !b.isCapital) return -1;
            if (b.isCapital && !a.isCapital) return +1;
            // sort cities before towns
            if (a.isTown && !b.isTown) return +1;
            if (b.isTown && !a.isTown) return -1;
            // group by localized name
            const aName = Locale.compose(a.name).toUpperCase();
            const bName = Locale.compose(b.name).toUpperCase();
            return Locale.compare(aName, bName);
        };
        this._settlementList.sort(citySort);
        this._cityList = this._settlementList.filter(c => !c.isTown);
        this._townList = this._settlementList.filter(c => c.isTown);
        if (this.onUpdate) this.onUpdate(this);
        window.dispatchEvent(new CustomEvent("bz-model-city-list-update"));
    }
    updateCity(id) {
        const city = Cities.get(id);
        if (!city) return;
        // city details
        const owner = city.owner;
        const localId = city.localId;
        const isCapital = city.isCapital;
        const isTown = city.isTown;
        const name = city.name;
        const location = city.location;
        const population = city.population;
        const hasUnrest = Boolean(city.Happiness?.hasUnrest);
        const isRazing = city.isBeingRazed;
        const isGrowing = city.Growth.growthType == GrowthTypes.EXPAND;
        const growthTurns = isGrowing ? city.Growth.turnsUntilGrowth : -1;
        const religion = GameInfo.Religions.lookup(city.Religion?.majorityReligion ?? -1);
        const religionIcon = religion && UI.getIconURL(religion.ReligionType);
        // icon
        const icon =
            isCapital ? "res_capital" :
            isTown ? "Yield_Towns" :
            "Yield_Cities";
        // compile entry
        const entry = {
            city, id, owner, localId, icon, name, isCapital, isTown,
            hasUnrest, isRazing, isGrowing,
            location, population, growthTurns, religion, religionIcon,
        };
        if (isTown) {
            // town focus
            entry.queueTurns = -1;  // no queue
            const focusId = isTown && city.Growth ? city.Growth.projectType : -1;
            const focus = entry.focus = GameInfo.Projects.lookup(focusId);
            if (isGrowing) {
                entry.focusIcon = UI.getIcon("PROJECT_GROWTH");
                const name = "LOC_UI_FOOD_CHOOSER_FOCUS_GROWTH";
                const desc = "LOC_PROJECT_TOWN_FOOD_INCREASE_DESCRIPTION";
                entry.focusTooltip =
                    `[b]${Locale.compose(name)}[/b][n]${Locale.compose(desc)}`;
            }
            if (focus) {
                if (isGrowing) {
                    entry.focusName = Locale.compose(
                        "LOC_BZ_PARENTHESIS",
                        focus.Name,
                        "LOC_UI_PAUSE_SUBTITLE",
                    );
                } else {
                    entry.focusIcon = UI.getIcon(focus.ProjectType);
                    entry.focusName = Locale.compose(focus.Name);
                }
                entry.focusDescription = Locale.compose(focus.Description);
                const tooltip = `[b]${entry.focusName}[/b][n]${entry.focusDescription}`;
                entry.focusTooltip =
                    isGrowing ? `${entry.focusTooltip}[n] [n]${tooltip}` : tooltip;
            }
        } else {
            // city build queue
            entry.queueTurns = city.BuildQueue.currentTurnsLeft;
            const kind = city.BuildQueue.currentProductionKind;
            const type = city.BuildQueue.currentProductionTypeHash;
            if (kind == ProductionKind.CONSTRUCTIBLE) {
                const info = GameInfo.Constructibles.lookup(type);
                entry.queueIcon = UI.getIcon(info.ConstructibleType);
                entry.queueTooltip = info.Name;
            } else if (kind == ProductionKind.UNIT) {
                const info = GameInfo.Units.lookup(type);
                entry.queueIcon = UI.getIcon(info.UnitType);
                entry.queueTooltip = info.Name;
            } else if (kind == ProductionKind.PROJECT) {
                const info = GameInfo.Projects.lookup(type);
                entry.queueIcon = UI.getIcon(info.ProjectType);
                entry.queueTooltip = info.Name;
            }
        }
        this._cities.set(localId, entry);
    }
    onCityUpdate(event) {
        const id = event?.cityID;
        if (id) {
            // ignore events for cities we don't own
            if (ComponentID.isInvalid(id)) return;
            if (id.owner != GameContext.localObserverID) return;
        }
        this.updateGate.call("onCityUpdate");
    }
}

const bzCityList = new bzCityListModel();
engine.whenReady.then(() => {
  const updateModel = () => {
    engine.updateWholeModel(bzCityList);
  };
  engine.createJSModel("g_bzCityListModel", bzCityList);
  bzCityList.updateCallback = updateModel;
});

export { bzCityList };

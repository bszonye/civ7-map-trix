import { C as ComponentID } from '/core/ui/utilities/utilities-component-id.chunk.js';
import { U as UpdateGate } from '/core/ui/utilities/utilities-update-gate.chunk.js';

class bzCityListModel {
    onCityUpdateListener = this.onCityUpdate.bind(this);
    onUpdate;
    updateGate = new UpdateGate(() => this.update());
    _cities = new Map();
    _cityList = [];
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
    get cityList() {
        return this._cityList;
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
        this._cityList = [...this._cities.values()];
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
        this._cityList.sort(citySort);
        if (this.onUpdate) this.onUpdate(this);
        window.dispatchEvent(new CustomEvent("bz-model-city-list-update"));
    }
    updateCity(id) {
        const city = Cities.get(id);
        if (!city) return;
        // city details
        const localId = city.localId;
        const isCapital = city.isCapital;
        const isTown = city.isTown;
        const name = city.name;
        const location = city.location;
        const population = city.population;
        const isGrowing = city.Growth.growthType == GrowthTypes.EXPAND;
        const growthTurns = isGrowing ? city.Growth.turnsUntilGrowth : -1;
        // icon
        const icon =
            isCapital ? "res_capital" :
            isTown ? "Yield_Towns" :
            "Yield_Cities";
        // compile entry
        const entry = {
            city, id, localId, icon, name, isCapital, isTown, isGrowing,
            location, population, growthTurns,
        };
        // project (city build queue or town focus)
        if (isTown) {
            entry.queueTurns = -1;  // no queue
            const focusId = isTown && city.Growth ? city.Growth.projectType : -1;
            const focus = GameInfo.Projects.lookup(focusId);
            const ftype = focus?.ProjectType ?? "PROJECT_GROWTH";
            const fname = focus?.Name ?? "LOC_UI_FOOD_CHOOSER_FOCUS_GROWTH";
            const fdesc = focus?.Description ??
                "LOC_PROJECT_TOWN_FOOD_INCREASE_DESCRIPTION";
            entry.projectIcon = UI.getIcon(ftype);
            entry.projectTooltip =
                `[b]${Locale.compose(fname)}[/b][n]${Locale.compose(fdesc)}`;
            entry.focusGrowing = focus && isGrowing;
        } else {
            entry.queueTurns = city.BuildQueue.currentTurnsLeft;
            const kind = city.BuildQueue.currentProductionKind;
            const type = city.BuildQueue.currentProductionTypeHash;
            if (kind == ProductionKind.CONSTRUCTIBLE) {
                const info = GameInfo.Constructibles.lookup(type);
                entry.projectIcon = UI.getIcon(info.ConstructibleType);
                entry.projectTooltip = info.Name;
            } else if (kind == ProductionKind.UNIT) {
                const info = GameInfo.Units.lookup(type);
                entry.projectIcon = UI.getIcon(info.UnitType);
                entry.projectTooltip = info.Name;
            } else if (kind == ProductionKind.PROJECT) {
                const info = GameInfo.Projects.lookup(type);
                entry.projectIcon = UI.getIcon(info.ProjectType);
                entry.projectTooltip = info.Name;
            }
        }
        if (entry.population != -1) entry.population -= 5;  // TODO: remove debug
        if (entry.growthTurns != -1) entry.growthTurns += 3;  // TODO: remove debug
        if (entry.queueTurns != -1) entry.queueTurns += 5;  // TODO: remove debug
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

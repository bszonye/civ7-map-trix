// TODO: change unit info to settlement info
// TODO: remove all unit-specific stuff
import { C as ComponentID } from '/core/ui/utilities/utilities-component-id.chunk.js';
import { U as UpdateGate } from '/core/ui/utilities/utilities-update-gate.chunk.js';

class bzCityListModel {
    onUpdate;
    updateGate = new UpdateGate(() => this.update());
    _cities = new Map();
    _cityList = [];
    constructor() {
        this.updateGate.call("constructor");
        // from city-banner-manager
        engine.on("AffinityLevelChanged", this.onCityUpdate);
        engine.on("CityAddedToMap", this.onCityUpdate);
        engine.on("CityInitialized", this.onCityUpdate);
        engine.on("CityNameChanged", this.onCityUpdate);
        engine.on("CapitalCityChanged", this.onCityUpdate);
        engine.on("CityPopulationChanged", this.onCityUpdate);
        engine.on("CityProductionChanged", this.onCityUpdate);
        engine.on("CityYieldChanged", this.onCityUpdate);
        engine.on("CityProductionUpdated", this.onCityUpdate);
        engine.on("CityProductionQueueChanged", this.onCityUpdate);
        engine.on("CityReligionChanged", this.onCityUpdate);
        engine.on("DiplomacyEventStarted", this.onCityUpdate);
        engine.on("DiplomacyEventEnded", this.onCityUpdate);
        engine.on("DiplomacyRelationshipChanged", this.onCityUpdate);
        engine.on("UrbanReligionChanged", this.onCityUpdate);
        engine.on("RuralReligionChanged", this.onCityUpdate);
        engine.on("CityRemovedFromMap", this.onCityUpdate);
        engine.on("CitySelectionChanged", this.onCityUpdate);
        engine.on("CityStateBonusChosen", this.onCityUpdate);
        engine.on("CityGovernmentLevelChanged", this.onCityUpdate);
        engine.on("FoodQueueChanged", this.onCityUpdate);
        engine.on("CityGrowthModeChanged", this.onCityUpdate);
        engine.on("CityYieldGranted", this.onCityUpdate);
        engine.on("PlotVisibilityChanged", this.onCityUpdate);
        engine.on("ConqueredSettlementIntegrated", this.onCityUpdate);
        engine.on("DistrictAddedToMap", this.onCityUpdate);
        engine.on("DistrictRemovedFromMap", this.onCityUpdate);
        engine.on("NotificationAdded", this.onCityUpdate);
        // from bz-flag-corps
        engine.on('CityRazingStarted', this.onCityUpdate);
        engine.on('DiplomacyEventEnded', this.onCityUpdate);
        engine.on('DistrictDamageChanged', this.onCityUpdate);
        engine.on('PlayerResourceChanged', this.onCityUpdate);
        engine.on('PlayerTurnActivated', this.onCityUpdate);
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
        // icon
        const focusId = isTown && city.Growth ? city.Growth.projectType : -1;
        const focus = GameInfo.Projects.lookup(focusId);
        const focusType = focus?.ProjectType ?? "Yield_Towns";
        const icon =
            isCapital ? "res_capital" :
            isTown ? UI.getIcon(focusType) :
            "Yield_Cities"
        // compile entry
        const entry = {
            city, id, localId, isCapital, isTown, focusType, icon, name, location,
        };
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

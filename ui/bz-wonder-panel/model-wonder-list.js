import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';

class bzWonderListModel {
    onWonderUpdateListener = this.onWonderUpdate.bind(this);
    onUpdate;
    updateGate = new UpdateGate(() => this.update());
    _wonders = new Map();
    _wonderList = {
        available: [],  // head: LOC_POLICIES_AVAILABLE_POLICIES
        inProgress: [],  // head: LOC_PLOT_TOOLTIP_IN_PROGRESS
        complete: [],  // head: LOC_LEGACIES_COMPLETE, subhead: age name
        skipped: [],  // head: LOC_TRIUMPH_NOT_AVAILABLE
    };
    constructor() {
        this.updateGate.call("constructor");
        // events that can change build queues or production rate
        engine.on("CityPopulationChanged", this.onWonderUpdateListener);
        engine.on("CityProductionChanged", this.onWonderUpdateListener);
        engine.on("CityProductionQueueChanged", this.cityProductionWonderUpdateListener);
        engine.on("CityProductionUpdated", this.onWonderUpdateListener);
        engine.on("CityYieldChanged", this.onWonderUpdateListener);
        engine.on("CityYieldGranted", this.onWonderUpdateListener);
        engine.on("ConstructibleAddedToMap", this.onWonderUpdateListener);
        engine.on("ConstructibleRemovedFromMap", this.onWonderUpdateListener);
        engine.on("DiplomacyEventEnded", this.onWonderUpdateListener);
        engine.on("DiplomacyEventStarted", this.onWonderUpdateListener);
        engine.on("DiplomacyRelationshipChanged", this.onWonderUpdateListener);
        engine.on("LocalPlayerChanged", this.onWonderUpdateListener);
        engine.on("PlayerResourceChanged", this.onWonderUpdateListener);
        engine.on("PlayerTurnActivated", this.onWonderUpdateListener);
        engine.on("ResourceAssigned", this.onWonderUpdateListener);
        engine.on("ResourceUnassigned", this.onWonderUpdateListener);
        engine.on("WonderCompleted", this.onWonderUpdateListener);
    }
    set updateCallback(callback) {
        this.onUpdate = callback;
    }
    get wonders() {
        return this._wonders;
    }
    get wonderList() {
        return this._wonderList;
    }
    update() {
        // wonder lists
        const available = [];  // head: LOC_POLICIES_AVAILABLE_POLICIES
        const inProgress = [];  // head: LOC_PLOT_TOOLTIP_IN_PROGRESS
        const complete = [];  // head: LOC_LEGACIES_COMPLETE, subhead: age name
        const skipped = [];  // head: LOC_TRIUMPH_NOT_AVAILABLE
        // current age
        const currentAge = GameInfo.Ages.lookup(Game.age);
        const currentAgeIndex = currentAge.ChronologyIndex;
        console.warn(`TRIX AGE-INDEX ${currentAgeIndex}`);
        // all wonders
        const wonders = [...GameInfo.Wonders].map(rules => {
            const wonderIndex = rules.$index;
            const hash = rules.$hash;
            const type = rules.ConstructibleType;
            const icon = UI.getIconURL(type);
            // constructible info
            const info = GameInfo.Constructibles.lookup(hash);
            const constructibleIndex = info.$index;
            // age info
            const age = GameInfo.Ages.lookup(info.Age);
            const name = info.Name;
            const ageIndex = age.ChronologyIndex;
            const ageName = age.Name;
            const ageType = age.AgeType;
            return {
                wonderIndex, constructibleIndex,
                hash, type, icon,
                name,
                ageIndex, ageName, ageType,
                // info,
                // age,
            };
        });
        wonders.sort((a, b) => {
            const aname = Locale.compose(a.name);
            const bname = Locale.compose(b.name);
            return b.ageIndex - a.ageIndex || Locale.compare(aname, bname);
        });
        this._wonders = new Map(wonders.map(w => [w.hash, w]));
        // constructed wonders
        const setConstructionInfo = (instance) => {
            const wonder = this._wonders.get(instance?.type);
            if (!wonder) return;
            wonder.locations ??= [];
            wonder.locations.push(instance.location);
            const item = { ...wonder };
            // location
            item.city = Cities.get(instance.cityId);
            const list = instance.complete ? complete : inProgress;
            const revealedState = GameplayMap.getRevealedState(
                GameContext.localObserverID,
                instance.location.x,
                instance.location.y
            );
            item.revealedState = revealedState;
            item.isRevealed = revealedState != RevealedStates.HIDDEN;
            if (item.isRevealed) item.location = instance.location;
            // build turns
            if (!instance.complete) {
                const buildQueue = item.city.BuildQueue;
                item.buildTurns = buildQueue.getTurnsLeft(item.hash);
            }
            // ownership
            item.owner = instance.owner;
            const hasMet = (id) => {
                const localID = GameContext.localPlayerID;
                if (id == localID) return true;
                return Players.get(localID)?.Diplomacy?.hasMet(id);
            };
            if (hasMet(item.owner)) {
                const player = Players.get(item.owner);
                const civ = GameInfo.Civilizations.lookup(player.civilizationType);
                item.civIcon = UI.getIconURL(civ.CivilizationType);
                item.bgColor = UI.Player.getPrimaryColorValueAsString(item.owner);
                item.fgColor = UI.Player.getSecondaryColorValueAsString(item.owner);
                item.sortOwner = item.owner;
            } else {
                item.civIcon = "blp:civ_sym_unknown";
                item.bgColor = "black";
                item.fgColor = "white";
                item.sortOwner = 1000;
            }
            // finish
            list.push(item);
        };
        const width = GameplayMap.getGridWidth();
        const height = GameplayMap.getGridHeight();
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                for (const id of MapConstructibles.getConstructibles(x, y)) {
                    const instance = Constructibles.getByComponentID(id);
                    setConstructionInfo(instance);
                }
            }
        }
        // in-progress wonders
        inProgress.sort((a, b) => {
            const aname = Locale.compose(a.name);
            const bname = Locale.compose(b.name);
            return Locale.compare(aname, bname) ||
                a.buildTurns - b.buildTurns || a.sortOwner - b.sortOwner;
        });
        let lastType = null;
        for (const item of inProgress) {
            item.isRacing = item.type == lastType;
            lastType = item.type;
        }
        // complete wonders
        complete.sort((a, b) => {
            // sort by age, then owner, then name
            const aname = Locale.compose(a.name);
            const bname = Locale.compose(b.name);
            return b.ageIndex - a.ageIndex || a.sortOwner - b.sortOwner ||
                Locale.compare(aname, bname);
        });
        for (let i = 0; i < currentAgeIndex; ++i) {
            const sub = complete.find(w => w.ageIndex == i);
            if (sub) sub.subhead = sub.ageName;
        }
        // available and skipped wonders
        for (const wonder of wonders.values()) {
            if (wonder.locations) continue;
            const list = wonder.ageIndex == currentAgeIndex ? available : skipped;
            list.push(wonder);
        }
        this._wonderList = { available, inProgress, complete, skipped };
        window.dispatchEvent(new CustomEvent("bz-model-wonder-list-update"));
    }
    onWonderUpdate(_event) {
        this.updateGate.call("onWonderUpdate");
    }
}

const bzWonderList = new bzWonderListModel();
engine.whenReady.then(() => {
    const updateModel = () => {
        engine.updateWholeModel(bzWonderList);
    };
    engine.createJSModel("g_bzWonderListModel", bzWonderList);
    bzWonderList.updateCallback = updateModel;
});

export { bzWonderList };
